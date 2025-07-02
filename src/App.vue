<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { QuestionFilled } from '@element-plus/icons-vue';
import { env } from '@huggingface/transformers';
import { useI18n } from 'vue-i18n';

// 导入组件
import ModelConfig from './components/ModelConfig.vue';
import StatsDisplay from './components/StatsDisplay.vue';
import TokenDisplay from './components/TokenDisplay.vue';
import FileUpload from './components/FileUpload.vue';

// 导入类型和工具
import type { QuantizationType, CalculationResult } from './types';
import { useModel } from './composables/useModel';
import { useCalculation } from './composables/useCalculation';
import { getAverageStats } from './utils/textUtils';
import { downloadJson } from './utils/fileUtils';

const { t, locale } = useI18n();

env.allowLocalModels = false;
env.useBrowserCache = true;

// 使用 composables
const { model, tokenizer, loading, loadModel } = useModel();
const { output, calculate, workerManager } = useCalculation();

// 状态管理
const modelName = ref('eduardoworrel/SmolLM2-135M');
const quantization = ref<QuantizationType>('fp16');
const useWebGPU = ref(false);
const hfEndpoint = ref('');
const inputText = ref('The quick brown fox jumps over the lazy dog.');
const activeTab = ref('calculate');
const showInitialNotice = ref(false);

// 检测移动端
const isMobile = ref(window.innerWidth <= 768);

// 监听窗口大小变化
function handleResize() {
    isMobile.value = window.innerWidth <= 768;
}

onMounted(() => {
    window.addEventListener('resize', handleResize);
    
    // Load saved language preference
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'zh')) {
        locale.value = savedLanguage;
    }
    
    // Check if initial notice should be shown
    const hideNotice = localStorage.getItem('hideInitialNotice');
    if (!hideNotice) {
        showInitialNotice.value = true;
    }
});

onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
});

// 处理模型加载
async function handleLoadModel() {
    // 在主线程中加载模型（用于UI显示）
    await loadModel(
        modelName.value,
        quantization.value,
        useWebGPU.value,
        hfEndpoint.value,
        t
    );
    
    // 同时在Worker中加载模型（用于计算）
    try {
        await workerManager.loadModel(
            modelName.value,
            quantization.value,
            useWebGPU.value,
            hfEndpoint.value
        );
    } catch (error) {
        console.error('Failed to load model in worker:', error);
    }
}

// 处理计算
async function handleCalculate() {
    if (!model.value || !tokenizer.value) return;
    
    await calculate(
        inputText.value,
        model.value,
        tokenizer.value,
        modelName.value,
        quantization.value,
        t
    );
}

// 处理文件上传
function handleFileUploaded(data: CalculationResult) {
    if (data.originalText) {
        inputText.value = data.originalText;
    }
    if (data.modelName) {
        modelName.value = data.modelName;
    }
    if (data.quantization) {
        quantization.value = data.quantization as QuantizationType;
    }
    
    output.value = data;
}

// 处理下载
function handleDownloadJson() {
    downloadJson(output.value, t);
}

// 语言切换
function changeLanguage(lang: string): void {
    locale.value = lang;
    localStorage.setItem('language', lang);
}

// 处理初始提示
function handleInitialNotice(dontShowAgain: boolean = false) {
    showInitialNotice.value = false;
    if (dontShowAgain) {
        localStorage.setItem('hideInitialNotice', 'true');
    }
}

// 计算属性来安全地获取统计数据
const averageStats = computed(() => getAverageStats(output.value, locale.value));

onMounted(() => {
    // Load saved language preference
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'zh')) {
        locale.value = savedLanguage;
    }
    
    // Check if initial notice should be shown
    const hideNotice = localStorage.getItem('hideInitialNotice');
    if (!hideNotice) {
        showInitialNotice.value = true;
    }
});
</script>

<template>
    <div id="app">
        <!-- 初始提示弹窗 -->
        <el-dialog
            v-model="showInitialNotice"
            :title="t('initialNoticeTitle')"
            :width="isMobile ? '90%' : '500px'"
            :close-on-click-modal="false"
            :close-on-press-escape="false"
            :show-close="false"
        >
            <div style="white-space: pre-line; line-height: 1.6; color: #606266;">
                {{ t('initialNoticeContent') }}
            </div>
            <template #footer>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <el-button type="primary" @click="handleInitialNotice(false)">
                        {{ t('understood') }}
                    </el-button>
                    <el-button type="text" size="small" @click="handleInitialNotice(true)" style="margin: 0;">
                        {{ t('doNotShowAgain') }}
                    </el-button>
                </div>
            </template>
        </el-dialog>

        <div class="app-header">
            <h1>{{ t('title') }}</h1>
            <div class="language-selector">
                <el-select v-model="locale" @change="changeLanguage" style="width: 120px">
                    <el-option :label="t('english')" value="en" />
                    <el-option :label="t('chinese')" value="zh" />
                </el-select>
            </div>
        </div>

        <el-card class="box-card">
            <el-tabs v-model="activeTab" type="border-card">
                <el-tab-pane :label="t('calculateMode')" name="calculate">
                    <template #label>
                        <div style="text-align: center; padding: 5px 0px;">
                            <div style="font-weight: bold;">{{ t('calculateMode') }}</div>
                            <div style="font-size: 12px; color: #666; margin-top: 2px;">{{ t('calculateModeDesc') }}</div>
                        </div>
                    </template>
                    
                    <!-- 模型配置 -->
                    <ModelConfig
                        v-model:modelName="modelName"
                        v-model:quantization="quantization"
                        v-model:useWebGPU="useWebGPU"
                        :loading="loading"
                        :t="t"
                        @loadModel="handleLoadModel"
                    />

                    <!-- 输入文本 -->
                    <div class="tab-section">
                        <h3>{{ t('inputText') }}</h3>
                        <el-input
                            type="textarea"
                            :rows="4"
                            :placeholder="t('inputTextPlaceholder')"
                            v-model="inputText">
                        </el-input>
                        <el-button type="primary" @click="handleCalculate" :disabled="!model" style="margin-top: 10px;">{{ t('calculate') }}</el-button>
                    </div>
                </el-tab-pane>

                <el-tab-pane :label="t('uploadMode')" name="upload">
                    <template #label>
                        <div style="text-align: center; padding: 5px 0px;">
                            <div style="font-weight: bold;">{{ t('uploadMode') }}</div>
                            <div style="font-size: 12px; color: #666; margin-top: 2px;">{{ t('uploadModeDesc') }}</div>
                        </div>
                    </template>
                    
                    <FileUpload :t="t" @fileUploaded="handleFileUploaded" />
                </el-tab-pane>
            </el-tabs>
        </el-card>

        <el-card class="box-card" v-if="output && output.results && output.results.length > 0">
            <template #header>
                <div class="card-header">
                    <span>
                        {{ t('result') }}
                        <el-popover placement="top" trigger="hover" width="300">
                            <template #reference>
                                <el-icon style="margin-left: 6px; vertical-align: middle;"><QuestionFilled /></el-icon>
                            </template>
                            <div style="max-width: 300px; white-space: pre-line;">{{ t('resultHelp') }}</div>
                        </el-popover>
                    </span>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <el-button type="primary" size="small" @click="handleDownloadJson">{{ t('downloadJson') }}</el-button>
                    </div>
                </div>
            </template>
            
            <!-- 统计信息 -->
            <StatsDisplay :stats="averageStats" :t="t" />
            
            <!-- Token 显示 -->
            <TokenDisplay :results="output.results" :t="t" />
        </el-card>
    </div>
    <footer>
        <div style="text-align: center; padding: 20px 0;">
            <el-text>
                Made by
                <el-link href="https://wallbreaker5th.top/"> Wallbreaker5th </el-link>.
            </el-text>
        </div>
    </footer>
</template>

<style>
#app {
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    color: #2c3e50;
    margin: 20px;
}

.app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.app-header h1 {
    margin: 0;
    font-size: 2rem;
}

.language-selector {
    display: flex;
    align-items: center;
    gap: 10px;
}

.box-card {
    margin-bottom: 20px;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.tab-section {
    margin-bottom: 30px;
}

.tab-section h3 {
    margin: 0 0 15px 0;
    color: #409eff;
    border-bottom: 2px solid #409eff;
    padding-bottom: 8px;
}

.tab-section:last-child {
    margin-bottom: 0;
}

.el-tabs__item {
    height: fit-content;
}

/* 移动端适配 */
@media (max-width: 768px) {
    #app {
        margin: 10px;
    }
    
    .app-header {
        flex-direction: column;
        gap: 15px;
        text-align: center;
    }
    
    .app-header h1 {
        font-size: 1.5rem;
    }
    
    .box-card {
        margin-bottom: 15px;
    }
    
    .card-header {
        flex-direction: column;
        gap: 10px;
        align-items: stretch;
    }
    
    .card-header > div {
        display: flex;
        justify-content: center;
        gap: 10px;
    }
    
    .tab-section {
        margin-bottom: 20px;
    }
}

@media (max-width: 480px) {
    #app {
        margin: 5px;
    }
    
    .app-header h1 {
        font-size: 1.25rem;
    }
    
    .box-card {
        margin-bottom: 10px;
    }
    
    .card-header {
        gap: 8px;
    }
    
    .card-header > div {
        flex-direction: column;
        gap: 8px;
    }
}
</style>
