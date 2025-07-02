import { 
    AutoTokenizer,
    AutoModelForCausalLM,
    log_softmax,
    env,
    type PreTrainedTokenizer, 
    type PreTrainedModel 
} from '@huggingface/transformers';
import type { TokenResult, TopPrediction, WorkerMessage, WorkerResponse } from '../types';
import { CustomTextDecoder } from '../utils/textUtils';

// Worker全局状态
let model: PreTrainedModel | null = null;
let tokenizer: PreTrainedTokenizer | null = null;
let currentModelName: string | null = null;

// 监听主线程消息
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
    const { type, data, id } = event.data;

    try {
        switch (type) {
            case 'LOAD_MODEL':
                await loadModel(data, id);
                break;

            case 'CALCULATE':
                if (!model || !tokenizer) {
                    postMessage({
                        type: 'CALCULATE_ERROR',
                        id,
                        data: { error: 'Model or tokenizer not loaded' }
                    } as WorkerResponse);
                    return;
                }

                const result = await performCalculation(
                    data.inputText,
                    model,
                    tokenizer,
                    data.modelName,
                    data.quantization
                );

                postMessage({
                    type: 'CALCULATE_SUCCESS',
                    id,
                    data: result
                } as WorkerResponse);
                break;

            default:
                postMessage({
                    type: 'ERROR',
                    id,
                    data: { error: `Unknown message type: ${type}` }
                } as WorkerResponse);
        }
    } catch (error) {
        postMessage({
            type: 'ERROR',
            id,
            data: { error: error instanceof Error ? error.message : 'Unknown error' }
        } as WorkerResponse);
    }
});

async function loadModel(
    data: {
        modelName: string;
        quantization: string;
        useWebGPU: boolean;
        hfEndpoint: string;
    },
    id: string
) {
    const { modelName, quantization, useWebGPU, hfEndpoint } = data;

    // 如果是同一个模型，不需要重新加载
    if (currentModelName === modelName && model && tokenizer) {
        postMessage({
            type: 'LOAD_MODEL_SUCCESS',
            id,
            data: { success: true, cached: true }
        } as WorkerResponse);
        return;
    }

    try {
        if (hfEndpoint) {
            env.remoteHost = hfEndpoint;
        } else {
            env.remoteHost = 'https://huggingface.co';
        }

        // 发送进度更新
        postMessage({
            type: 'LOAD_MODEL_PROGRESS',
            id,
            data: { progress: 0, message: 'Loading tokenizer...' }
        } as WorkerResponse);

        tokenizer = await AutoTokenizer.from_pretrained(modelName, {
            progress_callback: (e: any) => {
                if ('progress' in e) {
                    postMessage({
                        type: 'LOAD_MODEL_PROGRESS',
                        id,
                        data: { progress: e.progress * 0.3, message: `Loading tokenizer: ${e.file || ''}` }
                    } as WorkerResponse);
                }
            },
        });
        
        if (tokenizer?.decoder) {
            (tokenizer.decoder as any).text_decoder = new CustomTextDecoder();
        }

        postMessage({
            type: 'LOAD_MODEL_PROGRESS',
            id,
            data: { progress: 30, message: 'Loading model...' }
        } as WorkerResponse);

        const dtype = quantization || 'fp32';

        model = await AutoModelForCausalLM.from_pretrained(modelName, {
            device: useWebGPU ? 'webgpu' : 'wasm',
            progress_callback: (e: any) => {
                if ('progress' in e) {
                    postMessage({
                        type: 'LOAD_MODEL_PROGRESS',
                        id,
                        data: { 
                            progress: 30 + e.progress * 0.7, 
                            message: `Loading model: ${e.file || ''}`
                        }
                    } as WorkerResponse);
                }
            },
            dtype: dtype as any,
        });

        currentModelName = modelName;

        postMessage({
            type: 'LOAD_MODEL_SUCCESS',
            id,
            data: { success: true, cached: false }
        } as WorkerResponse);

    } catch (error) {
        postMessage({
            type: 'LOAD_MODEL_ERROR',
            id,
            data: { error: error instanceof Error ? error.message : 'Unknown error' }
        } as WorkerResponse);
    }
}

async function performCalculation(
    inputText: string,
    model: PreTrainedModel,
    tokenizer: PreTrainedTokenizer,
    modelName: string,
    quantization: string
) {
    const inputs = tokenizer(inputText);
    const { input_ids } = inputs;
    const { logits: quantized_logits } = await model(inputs);
    const logits = quantized_logits.to('float32');
    const seq_len = input_ids.dims[1];

    const results: TokenResult[] = [{
        token: tokenizer!.decode([input_ids.data[0]]),
        surprisal: 0,
        top10: [],
    }];

    for (let i = 0; i < seq_len - 1; i++) {
        const sliced_logits = Array.from(logits[0][i].data) as number[];
        const logProbs = log_softmax(sliced_logits);
        const next_token_id = input_ids.data[i + 1];
        const logProb = logProbs[next_token_id];
        const surprisal = -logProb / Math.log(2);

        const top10: TopPrediction[] = [];
        const sorted = Array.from(logProbs)
            .map((value, index) => [index, value])
            .sort((a, b) => b[1] - a[1]);

        for (let j = 0; j < 10; j++) {
            const [id, log_prob] = sorted[j];
            top10.push({
                token: tokenizer!.decode([id]),
                prob: Math.exp(log_prob),
            });
        }

        results.push({
            token: tokenizer!.decode([input_ids.data[i + 1]]),
            surprisal,
            top10,
        });
    }

    return {
        originalText: inputText,
        modelName: modelName,
        quantization: quantization,
        timestamp: new Date().toISOString(),
        results: results
    };
}
