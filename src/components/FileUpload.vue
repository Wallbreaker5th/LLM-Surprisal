<template>
    <div class="tab-section">
        <h3>{{ t('uploadJsonTitle') }}</h3>
        <el-alert
            :title="t('uploadJsonHelp')"
            type="info"
            :closable="false"
            style="margin-bottom: 20px;">
        </el-alert>
        
        <!-- 预设文件选择 -->
        <div class="preset-files-section">
            <h4>{{ t('presetFiles') }}</h4>
            <div class="preset-buttons" :class="{ 'mobile-preset-buttons': isMobile }">
                <el-button 
                    v-for="preset in presetFiles" 
                    :key="preset.key"
                    type="primary" 
                    plain
                    :size="isMobile ? 'small' : 'default'"
                    @click="loadPresetFile(preset.key)"
                    :loading="loadingPreset === preset.key"
                    class="preset-button"
                    :class="{ 'mobile-preset-button': isMobile }"
                >
                    {{ preset.label }}
                </el-button>
            </div>
        </div>

        <el-divider />

        <!-- 自定义文件上传 -->
        <div class="custom-upload-section">
            <h4>{{ t('customUpload') }}</h4>
            <el-button 
                type="success" 
                :size="isMobile ? 'default' : 'large'" 
                @click="triggerFileUpload"
                :style="{ width: isMobile ? '100%' : 'auto' }"
            >
                <el-icon style="margin-right: 8px;"><Upload /></el-icon>
                {{ t('selectFile') }}
            </el-button>
            <input 
                ref="fileInput" 
                type="file" 
                accept=".json,application/json" 
                @change="handleFileChange" 
                style="display: none;"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Upload } from '@element-plus/icons-vue';
import type { CalculationResult } from '../types';
import { handleFileUpload } from '../utils/fileUtils';
import { ElMessage } from 'element-plus';

interface Props {
    t: (key: string) => string;
}

interface Emits {
    (e: 'fileUploaded', data: CalculationResult): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const fileInput = ref<HTMLInputElement | null>(null);
const loadingPreset = ref<string | null>(null);

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

// 预设文件配置
const presetFiles = [
    { key: 'luxun', label: '鲁迅《狗·猫·鼠》节选', path: '/precomputed/luxun.json' },
    { key: 'multiplication', label: '随机数乘法', path: '/precomputed/multiplication.json' },
    { key: 'nonsense', label: '狗屁不通文章生成器', path: '/precomputed/nonsense.json' },
    { key: 'qthcx', label: '钱塘湖春行', path: '/precomputed/qthcx.json' },
    { key: 'random', label: '随机字符串', path: '/precomputed/random.json' },
    { key: 'shangshu', label: '《尚书》节选', path: '/precomputed/shangshu.json' }
];

function triggerFileUpload(): void {
    fileInput.value?.click();
}

function handleFileChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;
    
    handleFileUpload(file, props.t, (data) => {
        emit('fileUploaded', data);
    });
    
    // Clear the input so the same file can be uploaded again
    target.value = '';
}

async function loadPresetFile(key: string): Promise<void> {
    const preset = presetFiles.find(p => p.key === key);
    if (!preset) return;

    loadingPreset.value = key;
    
    try {
        const response = await fetch(preset.path);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 验证数据格式
        if (!data.originalText || !data.results || !Array.isArray(data.results)) {
            throw new Error('Invalid JSON format');
        }
        
        emit('fileUploaded', data);
        ElMessage.success(props.t('fileUploaded'));
    } catch (error) {
        console.error('Error loading preset file:', error);
        ElMessage.error(props.t('fileUploadError'));
    } finally {
        loadingPreset.value = null;
    }
}
</script>

<style scoped>
.tab-section {
    margin-bottom: 30px;
}

.tab-section h3 {
    margin: 0 0 15px 0;
    color: #409eff;
    border-bottom: 2px solid #409eff;
    padding-bottom: 8px;
}

.preset-files-section {
    margin-bottom: 20px;
}

.preset-files-section h4,
.custom-upload-section h4 {
    margin: 0 0 12px 0;
    color: #606266;
    font-size: 14px;
    font-weight: 600;
}

.preset-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.preset-button {
    margin: 0;
    font-size: 13px;
}

.custom-upload-section {
    margin-top: 20px;
}

.el-divider {
    margin: 16px 0;
}

/* 移动端适配 */
@media (max-width: 768px) {
    .mobile-preset-buttons {
        flex-direction: column;
        gap: 8px;
    }
    
    .mobile-preset-button {
        width: 100%;
        font-size: 12px;
        padding: 8px 12px;
    }
}

@media (max-width: 480px) {
    .preset-files-section h4,
    .custom-upload-section h4 {
        font-size: 13px;
    }
    
    .mobile-preset-button {
        font-size: 11px;
        padding: 6px 10px;
    }
}
</style>
