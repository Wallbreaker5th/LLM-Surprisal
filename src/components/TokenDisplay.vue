<template>
    <div class="token-container" :class="{ 'mobile': isMobile }">
        <template v-for="(item, index) in results" :key="index">
            <div v-if="item.token.startsWith('\n') && !item.token.match(/^\n+$/)" class="br" />
            <div class="token-block" :class="{ 'mobile-token-block': isMobile }">
                <el-popover placement="top" trigger="hover" :width="isMobile ? 250 : 300">
                    <template #reference>
                        <div class="token" :style="{ backgroundColor: getBackgroundColor(item.surprisal) }" :class="{ 'mobile-token': isMobile }">
                            {{ displayToken(item.token) }}
                        </div>
                    </template>
                    <div class="popover-content">
                        <strong>{{ t('surprisal') }}:</strong> {{ item.surprisal.toFixed(3) }} {{ t('bits') }}
                        <el-divider />
                        <strong>{{ t('top10preds') }}:</strong>
                        <ul>
                            <li v-for="p in item.top10" :key="p.token">
                                {{ displayToken(p.token) }}: {{ (p.prob * 100).toFixed(2) }}%
                            </li>
                        </ul>
                    </div>
                </el-popover>
                <div class="top5-container" :class="{ 'mobile-top5': isMobile }">
                    <div v-for="p in item.top10.slice(0, isMobile ? 3 : 5)" :key="p.token" class="top5-item">
                        <div class="top5-prob-bar" :style="{ width: p.prob * 100 + '%' }"></div>
                        <span class="top5-text">{{ displayToken(p.token) }}</span>
                    </div>
                </div>
            </div>
            <div v-if="item.token.endsWith('\n')" class="br" />
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import type { TokenResult } from '../types';
import { getBackgroundColor } from '../utils/textUtils';

interface Props {
    results: TokenResult[];
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

function displayToken(token: string): string {
    return token.replace(/\n/g, '↵').replace(/ /g, '␣');
}
</script>

<style scoped>
.token-container {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.token-container .br {
    width: 100%;
}

.token-block {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.token {
    padding: 5px 8px;
    border-radius: 4px;
    color: black;
    cursor: pointer;
    min-width: 10px;
    min-height: 20px;
    text-align: center;
}

.top5-container {
    margin-top: 5px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 50px;
}

.top5-item {
    position: relative;
    background-color: #f0f0f0;
    border-radius: 3px;
    overflow: hidden;
    font-size: 0.8em;
    line-height: 1.5;
}

.top5-prob-bar {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background-color: #a5d6a7;
    z-index: 1;
}

.top5-text {
    position: relative;
    z-index: 2;
    padding: 2px 5px;
    color: #333;
    white-space: pre;
}

.el-divider {
    margin: 8px 0;
}

ul {
    padding-left: 20px;
    margin: 5px 0;
}

/* 移动端适配 */
@media (max-width: 768px) {
    .token-container.mobile {
        gap: 8px;
    }
    
    .mobile-token-block {
        margin-bottom: 8px;
    }
    
    .mobile-token {
        padding: 4px 6px;
        font-size: 0.9em;
        min-width: 8px;
        min-height: 18px;
    }
    
    .mobile-top5 {
        min-width: 40px;
        gap: 1px;
    }
    
    .mobile-top5 .top5-item {
        font-size: 0.7em;
        line-height: 1.3;
    }
    
    .mobile-top5 .top5-text {
        padding: 1px 3px;
    }
}

@media (max-width: 480px) {
    .token-container.mobile {
        gap: 6px;
    }
    
    .mobile-token {
        padding: 3px 5px;
        font-size: 0.85em;
    }
    
    .mobile-top5 {
        min-width: 35px;
    }
    
    .mobile-top5 .top5-item {
        font-size: 0.65em;
    }
}
</style>
