<template>
    <div class="stats-section" v-if="stats">
        <h4>{{ t('statisticsTitle') || '统计信息' }}</h4>
        <el-row :gutter="isMobile ? 10 : 20">
            <el-col :span="isMobile ? 24 : 6" :class="{ 'mobile-col': isMobile }">
                <el-statistic 
                    :title="t('avgPerToken') || '平均每Token信息量'"
                    :value="stats.avgPerToken" 
                    :precision="3"
                    suffix="bits"
                />
            </el-col>
            <el-col :span="isMobile ? 24 : 6" :class="{ 'mobile-col': isMobile }">
                <el-statistic 
                    :title="t('avgPerChar') || '平均每字符信息量'"
                    :value="stats.avgPerChar" 
                    :precision="3"
                    suffix="bits"
                />
            </el-col>
            <el-col :span="isMobile ? 24 : 6" :class="{ 'mobile-col': isMobile }">
                <el-statistic 
                    :title="t('avgPerWord') || '平均每词信息量'"
                    :value="stats.avgPerWord" 
                    :precision="3"
                    suffix="bits"
                />
                <el-tooltip
                    class="box-item"
                    effect="dark"
                    :content="t('avgPerWordNote')"
                    placement="top"
                >
                    <el-icon style="vertical-align: middle; font-size: 12px;"><QuestionFilled /></el-icon>
                </el-tooltip>
            </el-col>
            <el-col :span="isMobile ? 24 : 6" :class="{ 'mobile-col': isMobile }">
                <el-statistic 
                    :title="t('totalInformation') || '总信息量'"
                    :value="stats.totalInformation" 
                    :precision="3"
                    suffix="bits"
                />
            </el-col>
        </el-row>
        <el-row :gutter="isMobile ? 10 : 20" style="margin-top: 20px;">
            <el-col :span="isMobile ? 24 : 6" :class="{ 'mobile-col': isMobile }">
                <el-statistic 
                    :title="t('totalTokens') || '总Token数'"
                    :value="stats.totalTokens"
                />
            </el-col>
            <el-col :span="isMobile ? 24 : 6" :class="{ 'mobile-col': isMobile }">
                <el-statistic 
                    :title="t('totalChars') || '总字符数'"
                    :value="stats.totalChars"
                />
            </el-col>
            <el-col :span="isMobile ? 24 : 6" :class="{ 'mobile-col': isMobile }">
                <el-statistic 
                    :title="t('totalWords') || '总词数'"
                    :value="stats.totalWords"
                />
                <el-tooltip
                    class="box-item"
                    effect="dark"
                    :content="t('avgPerWordNote')"
                    placement="top"
                >
                    <el-icon style="vertical-align: middle; font-size: 12px;"><QuestionFilled /></el-icon>
                </el-tooltip>
            </el-col>
            <el-col :span="isMobile ? 24 : 6" :class="{ 'mobile-col': isMobile }">
                <div class="qr-section">
                    <div class="qr-container">
                        <p class="website-url">surprisal.wallbreaker5th.top</p>
                        <img src="/qr.svg" alt="QR Code" class="qr-image" style="opacity: 0.5;"/>
                    </div>
                </div>
            </el-col>
        </el-row>
        <el-divider />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { QuestionFilled } from '@element-plus/icons-vue';
import type { Stats } from '../types';

interface Props {
    stats: Stats | null;
    t: (key: string) => string;
}

defineProps<Props>();

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
</script>

<style scoped>
.stats-section {
    margin-bottom: 20px;
}

.stats-section h4 {
    margin: 0 0 15px 0;
    color: #67c23a;
    border-bottom: 2px solid #67c23a;
    padding-bottom: 8px;
}

.el-divider {
    margin: 8px 0;
}

.qr-section {
    text-align: center;
}

.qr-section h5 {
    margin: 0 0 10px 0;
    color: #67c23a;
    font-size: 14px;
    font-weight: 600;
}

.qr-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
}

.qr-image {
    width: 80px;
    height: 80px;
    border: 1px solid #e4e7ed;
    border-radius: 4px;
}

.website-url {
    margin: 0;
    font-size: 12px;
    color: #606266;
    font-family: monospace;
    word-break: break-all;
}

/* 移动端适配 */
@media (max-width: 768px) {
    .mobile-col {
        margin-bottom: 15px;
    }
    
    .mobile-col:last-child {
        margin-bottom: 0;
    }
    
    .qr-image {
        width: 60px;
        height: 60px;
    }
    
    .website-url {
        font-size: 11px;
    }
}
</style>
