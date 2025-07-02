import torch
import time
import os
import math
from transformers import AutoModelForCausalLM, AutoTokenizer
from torch.nn.functional import log_softmax

# 加载模型和分词器
print("正在加载模型和分词器...")
start_time = time.time()
# model_path = "./Qwen2.5-0.5B"
model_path = "./Qwen3-0.6B-Base"
# model_path = "./tiny_llm_sft_92m"

tokenizer = AutoTokenizer.from_pretrained(model_path, trust_remote_code=True)
ChatGLMTokenizer = tokenizer.__class__
def custom_pad(self, *args, **kwargs):
    if "padding_side" in kwargs:
        del kwargs["padding_side"]
    return self.old_pad(*args, **kwargs)
setattr(ChatGLMTokenizer, "old_pad", getattr(ChatGLMTokenizer, "_pad"))
setattr(ChatGLMTokenizer, "_pad", custom_pad)

model = AutoModelForCausalLM.from_pretrained(model_path, torch_dtype=torch.float16, trust_remote_code=True)
model = model.to('cuda')
model.eval()  # 设置为评估模式
print(f"模型加载完成，耗时：{time.time() - start_time:.2f}秒\n")


def calculate_log_prob(texts):
    """计算一个批次文本的对数概率、信息熵（bit）、平均每字符信息熵，并返回每个token的top5候选
    
    Args:
        texts: 字符串或字符串列表，表示要计算概率的一个或多个文本
        
    Returns:
        如果输入是单个字符串，返回单个结果字典；如果输入是列表，返回结果字典的列表
    """
    # 确保输入是列表形式，即使只有一个文本
    single_input = False
    if isinstance(texts, str):
        texts = [texts]
        single_input = True
    
    t0 = time.time()
    # 对输入文本进行编码
    inputs = tokenizer(texts, padding=True, return_tensors="pt")
    input_ids = inputs["input_ids"]
    attention_mask = inputs["attention_mask"]
    # FP16推理
    input_ids = input_ids.to(dtype=torch.long)
    attention_mask = attention_mask.to(dtype=torch.long)
    model_device = next(model.parameters()).device
    input_ids = input_ids.to(model_device)
    attention_mask = attention_mask.to(model_device)
    t1 = time.time()
    print(f"编码耗时：{t1 - t0:.2f}秒")
    
    # 获取模型输出的logits（FP16）
    with torch.no_grad():
        outputs = model(input_ids=input_ids, attention_mask=attention_mask)
        logits = outputs.logits
    print(f"模型推理耗时：{time.time() - t1:.2f}秒")
    
    # 计算每个token的log概率
    log_probs = log_softmax(logits, dim=-1)
    
    batch_results = []
    batch_size = input_ids.shape[0]
    
    for batch_idx in range(batch_size):
        # 获取当前序列的有效长度（去除padding）
        seq_len = attention_mask[batch_idx].sum().item()
        # 获取每个位置实际token的log概率
        token_log_probs = []
        token_probs = []
        token_ids = []
        token_strs = []
        token_top5 = []  # 新增：每个token的top5候选
        for i in range(seq_len - 1):  # -1是因为我们要预测下一个token
            next_token_id = input_ids[batch_idx, i + 1].item()
            log_prob = log_probs[batch_idx, i, next_token_id].item()
            prob = torch.exp(log_probs[batch_idx, i, next_token_id]).item()
            token_log_probs.append(log_prob)
            token_probs.append(prob)
            token_ids.append(next_token_id)
            token_strs.append(tokenizer.decode([next_token_id]))
            # 新增：获取top5候选
            topk_log_probs, topk_ids = torch.topk(log_probs[batch_idx, i], 5)
            topk_log_probs = topk_log_probs.tolist()
            topk_ids = topk_ids.tolist()
            topk_strs = [tokenizer.decode([tid]) for tid in topk_ids]
            token_top5.append([
                {"token_id": tid, "token_str": tstr, "log_prob": lprob}
                for tid, tstr, lprob in zip(topk_ids, topk_strs, topk_log_probs)
            ])
        sequence_log_prob = sum(token_log_probs)
        avg_log_prob = sequence_log_prob / len(token_log_probs) if token_log_probs else 0
        entropy = -sequence_log_prob / math.log(2.0) if token_log_probs else float('inf')
        text_len = len(texts[batch_idx])
        avg_entropy_per_char = entropy / text_len if text_len > 0 else float('inf')
        batch_results.append({
            "token_log_probs": [0] + token_log_probs,
            "token_strs": [tokenizer.decode([input_ids[batch_idx, 0]])] + token_strs,
            "token_top5": [[{"token_id": 0, "token_str": "", "log_prob": -10000}] * 5] + token_top5,  # 首token没有top5
            "sequence_log_prob": sequence_log_prob,
            "avg_log_prob": avg_log_prob,
            "perplexity": torch.exp(-torch.tensor(avg_log_prob)).item() if token_log_probs else float('inf'),
            "entropy": entropy,
            "avg_entropy_per_char": avg_entropy_per_char,
        })
    
    # 如果输入是单个字符串，返回单个结果
    return batch_results[0] if single_input else batch_results


def main():
    print("欢迎使用文本概率计算工具！")
    print("请输入文本，程序将计算该文本的概率。")
    print("您可以输入多个文本（用 ～ 分隔）进行批量处理。")
    print("输入'exit'或'quit'退出。\n")
    
    while True:
        user_input = input("请输入文本（多个文本用 ～ 分隔）: ")
        if user_input.lower() in ["exit", "quit"]:
            print("程序已退出。")
            break
        
        if not user_input.strip():
            print("输入为空，请重新输入。")
            continue
        
        # 分割输入文本（如果有多个）
        texts = [text.strip() for text in user_input.split("～")]
        
        # 过滤掉空文本
        texts = [text for text in texts if text]

        # 如果文本以 / 开头，读取路径中的文本
        for i in range(len(texts)):
            if texts[i].startswith("/"):
                file_path = texts[i][1:]
                if os.path.exists(file_path):
                    with open(file_path, "r", encoding="utf-8") as f:
                        texts[i] = f.read()
                else:
                    print(f"文件 {file_path} 不存在，跳过该文本。")
                    texts[i] = ""
        
        if not texts:
            print("输入为空，请重新输入。")
            continue
        
        # 显示处理信息
        if len(texts) == 1:
            print(f"\n正在处理文本: {texts[0]}")
        else:
            print(f"\n正在批量处理 {len(texts)} 个文本:")
            for i, text in enumerate(texts):
                print(f"  {i+1}. {text}")
        
        start_time = time.time()
        
        # 批量处理文本
        results = calculate_log_prob(texts)
        
        processing_time = time.time() - start_time
        
        # 显示结果
        if len(texts) == 1:
            result = results[0] if isinstance(results, list) else results
            print(f"\n结果:")
            print(f"序列对数概率: {result['sequence_log_prob']:.4f}")
            print(f"平均对数概率: {result['avg_log_prob']:.4f}")
            print(f"困惑度 (Perplexity): {result['perplexity']:.4f}")
            print(f"信息熵 (bit): {result['entropy']:.4f}")
            print(f"平均每字符信息熵 (bit): {result['avg_entropy_per_char']:.4f}")
        else:
            print(f"\n批量处理结果:")
            for i, (text, result) in enumerate(zip(texts, results)):
                print(f"\n文本 {i+1}: {text}")
                print(f"  Token 数量: {len(result['token_log_probs'])}")
                print(f"  序列对数概率: {result['sequence_log_prob']:.4f}")
                print(f"  平均对数概率: {result['avg_log_prob']:.4f}")
                print(f"  困惑度 (Perplexity): {result['perplexity']:.4f}")
                print(f"  信息熵 (bit): {result['entropy']:.4f}")
                print(f"  平均每字符信息熵 (bit): {result['avg_entropy_per_char']:.4f}")
        print(f"\n处理时间: {processing_time:.4f}秒\n")
        # 保存 token 及 log prob 到 json 文件
        import json
        output_json = []
        if len(texts) == 1:
            result = results[0] if isinstance(results, list) else results
            output_json.append({
                "text": texts[0],
                "tokens": result["token_strs"],
                "token_log_probs": result["token_log_probs"],
                "token_top5": result["token_top5"],
            })
        else:
            for text, result in zip(texts, results):
                output_json.append({
                    "text": text,
                    "tokens": result["token_strs"],
                    "token_log_probs": result["token_log_probs"],
                    "token_top5": result["token_top5"],
                })
        with open("token_logprob_output.json", "w", encoding="utf-8") as f:
            json.dump(output_json, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()