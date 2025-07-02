import { ref, onUnmounted } from 'vue';
import { ElMessage, ElLoading } from 'element-plus';
import type { PreTrainedTokenizer, PreTrainedModel } from '@huggingface/transformers';
import type { CalculationResult, QuantizationType } from '../types';
import { CalculationWorkerManager } from '../utils/workerManager';

export function useCalculation() {
    const output = ref<CalculationResult | null>(null);
    const workerManager = new CalculationWorkerManager();

    async function calculate(
        inputText: string,
        model: PreTrainedModel,
        tokenizer: PreTrainedTokenizer,
        modelName: string,
        quantization: QuantizationType,
        t: (key: string) => string
    ) {
        if (!model || !tokenizer) {
            ElMessage.error(t('modelNotLoaded'));
            return;
        }

        const loadingInstance = ElLoading.service({
            lock: true,
            text: t('calculating'),
            background: 'rgba(0, 0, 0, 0.7)',
        });

        try {
            // 在worker中执行计算
            const result = await workerManager.calculate(
                inputText,
                modelName,
                quantization
            );

            output.value = result;
        } catch (error) {
            console.error(error);
            ElMessage.error(t('calculationError'));
        } finally {
            loadingInstance.close();
        }
    }

    // 组件卸载时清理worker
    onUnmounted(() => {
        workerManager.destroy();
    });

    return {
        output,
        calculate,
        workerManager, // 暴露workerManager供外部使用（比如在useModel中预加载模型）
    };
}
