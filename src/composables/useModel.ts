import { ref } from 'vue';
import { ElMessage, ElLoading } from 'element-plus';
import {
    AutoTokenizer,
    AutoModelForCausalLM,
    env,
    type PreTrainedTokenizer,
    type PreTrainedModel,
} from '@huggingface/transformers';
import type { QuantizationType } from '../types';
import { CustomTextDecoder } from '../utils/textUtils';

export function useModel() {
    const model = ref<PreTrainedModel | null>(null);
    const tokenizer = ref<PreTrainedTokenizer | null>(null);
    const loading = ref(false);
    const loadingText = ref('');
    const progress = ref(0);

    async function loadModel(
        modelName: string,
        quantization: QuantizationType,
        useWebGPU: boolean,
        hfEndpoint: string,
        t: (key: string, params?: any) => string
    ) {
        if (!modelName) {
            ElMessage.error(t('enterModelName'));
            return;
        }

        loading.value = true;
        loadingText.value = t('loadingModel');
        progress.value = 0;

        try {
            if (hfEndpoint) {
                env.remoteHost = hfEndpoint;
            } else {
                env.remoteHost = 'https://huggingface.co';
            }

            const loadingInstance = ElLoading.service({
                lock: true,
                text: t('loadingModel'),
                background: 'rgba(0, 0, 0, 0.7)',
            });

            tokenizer.value = await AutoTokenizer.from_pretrained(modelName, {
                progress_callback: (e: any) => {
                    if ('progress' in e) progress.value = e.progress;
                    if ('file' in e) {
                        loadingText.value = t('loadingTokenizer', { file: e.file });
                        loadingInstance.setText(loadingText.value);
                    }
                },
            });
            
            if (tokenizer.value?.decoder) {
                (tokenizer.value.decoder as any).text_decoder = new CustomTextDecoder();
            }

            const dtype = quantization || 'fp32';

            model.value = await AutoModelForCausalLM.from_pretrained(modelName, {
                device: useWebGPU ? 'webgpu' : 'wasm',
                progress_callback: (e: any) => {
                    if ('progress' in e) progress.value = e.progress;
                    if ('file' in e) {
                        loadingText.value = t('loadingModelFile', { file: e.file });
                        loadingInstance.setText(loadingText.value);
                    }
                },
                dtype: dtype as QuantizationType,
            });

            loadingInstance.close();
            ElMessage.success(t('modelLoadedSuccess'));
        } catch (error) {
            console.error(error);
            ElMessage.error(t('modelLoadedError'));
        } finally {
            loading.value = false;
        }
    }

    return {
        model,
        tokenizer,
        loading,
        loadingText,
        progress,
        loadModel,
    };
}
