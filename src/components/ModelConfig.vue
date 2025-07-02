<template>
    <div class="tab-section">
        <h3>{{ t('modelConfig') }}</h3>
        <el-text>
            <p>{{ t('modelConfigRecommendation') }}</p>
        </el-text>
        <el-form label-width="120px" class="model-config-form">
            <el-form-item :label="t('modelName')">
                <div class="form-item-content">
                    <el-select 
                        :model-value="modelName"
                        @update:model-value="(value: string) => emit('update:modelName', value)"
                        :placeholder="t('modelNamePlaceholder')" 
                        filterable 
                        allow-create 
                        default-first-option 
                        class="model-select"
                    >
                        <el-option label="eduardoworrel/SmolLM2-135M" value="eduardoworrel/SmolLM2-135M" />
                        <el-option label="eduardoworrel/SmolLM2-135M-Instruct" value="eduardoworrel/SmolLM2-135M-Instruct" />
                        <el-option label="eduardoworrel/SmolLM2-360M-Instruct" value="eduardoworrel/SmolLM2-360M-Instruct" />
                        <el-option label="onnx-community/Qwen3-0.6B-ONNX" value="onnx-community/Qwen3-0.6B-ONNX" />
                        <el-option label="onnx-community/Qwen2.5-0.5B" value="onnx-community/Qwen2.5-0.5B" />
                        <el-option label="onnx-community/Qwen2.5-0.5B-Instruct" value="onnx-community/Qwen2.5-0.5B-Instruct" />
                    </el-select>
                    <el-tooltip
                        class="box-item"
                        effect="dark"
                        :content="t('modelNameHelp')"
                        placement="top"
                    >
                        <el-icon class="help-icon"><QuestionFilled /></el-icon>
                    </el-tooltip>
                </div>
            </el-form-item>
            
            <el-form-item :label="t('quantization')">
                <div class="form-item-content">
                    <el-select 
                        :model-value="quantization"
                        @update:model-value="(value: QuantizationType) => emit('update:quantization', value)"
                        :placeholder="t('quantization')" 
                        class="quantization-select"
                    >
                        <el-option :label="t('default') + ' (fp32)'" value="fp32" />
                        <el-option label="Half Precision (fp16)" value="fp16" />
                        <el-option :label="t('8bit') + ' (q8)'" value="q8" />
                        <el-option :label="t('8bit') + ' (int8)'" value="int8" />
                        <el-option :label="t('8bit') + ' (uint8)'" value="uint8" />
                        <el-option :label="t('4bit') + ' (q4)'" value="q4" />
                        <el-option label="4-bit (bnb4)" value="bnb4" />
                        <el-option label="4-bit (q4f16)" value="q4f16" />
                    </el-select>
                    <el-tooltip
                        class="box-item"
                        effect="dark"
                        :content="t('quantizationHelp')"
                        placement="top"
                    >
                        <el-icon class="help-icon"><QuestionFilled /></el-icon>
                    </el-tooltip>
                </div>
            </el-form-item>
            
            <el-form-item :label="t('useWebGPU')">
                <div class="form-item-content">
                    <el-switch 
                        :model-value="useWebGPU" 
                        @update:model-value="onWebGPUChange"
                    ></el-switch>
                </div>
            </el-form-item>
            
            <el-form-item>
                <el-button 
                    type="primary" 
                    @click="handleLoadModel" 
                    :loading="loading"
                    class="load-button"
                >
                    {{ t('loadModel') }}
                </el-button>
            </el-form-item>
        </el-form>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { QuestionFilled } from '@element-plus/icons-vue';
import type { QuantizationType } from '../types';

interface Props {
    modelName: string;
    quantization: QuantizationType;
    useWebGPU: boolean;
    loading: boolean;
    t: (key: string) => string;
}

interface Emits {
    (e: 'update:modelName', value: string): void;
    (e: 'update:quantization', value: QuantizationType): void;
    (e: 'update:useWebGPU', value: boolean): void;
    (e: 'loadModel'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 检测移动端
const isMobile = ref(window.innerWidth <= 768);

// 监听窗口大小变化
function handleResize() {
    isMobile.value = window.innerWidth <= 768;
}

onMounted(() => {
    window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
});

function onWebGPUChange(val: boolean): void {
    if (val && props.quantization !== 'fp32') {
        ElMessage.warning(props.t('webgpuQuantWarning'));
    } else if (val) {
        ElMessage.info(props.t('webgpuSupportInfo'));
    }
    emit('update:useWebGPU', val);
}

function handleLoadModel() {
    emit('loadModel');
}
</script>

<style scoped>
.model-config-form {
    margin: 0 auto;
    text-align: left;
    max-width: 600px;
}

.form-item-content {
    display: flex;
    align-items: center;
    gap: 8px;
}

.model-select {
    width: 350px;
    min-width: 250px;
}

.quantization-select {
    width: 200px;
    min-width: 150px;
}

.load-button {
    width: 120px;
}

/* 移动端适配 */
@media (max-width: 768px) {
    .model-config-form {
        max-width: 100%;
    }
    
    .model-config-form :deep(.el-form-item) {
        margin-bottom: 24px;
    }
    
    .model-config-form :deep(.el-form-item__label) {
        text-align: left;
        font-size: 14px;
    }
    
    .model-config-form :deep(.el-form-item__content) {
        margin-left: 0 !important;
        width: 100%;
    }
    
    .form-item-content {
        width: 100%;
    }
    
    .model-select,
    .quantization-select {
        width: 100%;
        min-width: unset;
        flex: 1;
    }
    
    .load-button {
        width: 100%;
    }
    
    .help-icon {
        flex-shrink: 0;
        margin-left: 4px;
    }
}

/* 超小屏幕适配 */
@media (max-width: 480px) {
    .model-config-form :deep(.el-form-item__label) {
        font-size: 13px;
    }
    
    .load-button {
        height: 48px;
    }
}
</style>
