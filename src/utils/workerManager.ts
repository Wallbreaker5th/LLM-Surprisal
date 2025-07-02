import type { WorkerMessage, WorkerResponse } from '../types';

export class CalculationWorkerManager {
    private worker: Worker | null = null;
    private messageId = 0;
    private pendingMessages = new Map<string, {
        resolve: (value: any) => void;
        reject: (error: any) => void;
    }>();

    constructor() {
        this.initWorker();
    }

    private initWorker() {
        // 创建Worker
        this.worker = new Worker(
            new URL('../workers/calculationWorker.ts', import.meta.url),
            { type: 'module' }
        );

        // 监听Worker消息
        this.worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
            const { type, id, data } = event.data;
            const pending = this.pendingMessages.get(id);

            if (pending) {
                if (type === 'LOAD_MODEL_PROGRESS') {
                    // 进度消息不需要删除pending，继续等待最终结果
                    return;
                }

                this.pendingMessages.delete(id);
                
                if (type.endsWith('_SUCCESS')) {
                    pending.resolve(data);
                } else if (type.endsWith('_ERROR') || type === 'ERROR') {
                    pending.reject(new Error(data.error || 'Worker error'));
                }
            }
        });

        this.worker.addEventListener('error', (error) => {
            console.error('Worker error:', error);
            // 清理所有等待中的消息
            this.pendingMessages.forEach(({ reject }) => {
                reject(new Error('Worker error'));
            });
            this.pendingMessages.clear();
        });
    }

    private sendMessage(type: WorkerMessage['type'], data: any): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.worker) {
                reject(new Error('Worker not initialized'));
                return;
            }

            const id = (++this.messageId).toString();
            this.pendingMessages.set(id, { resolve, reject });

            const message: WorkerMessage = { type, id, data };
            this.worker.postMessage(message);
        });
    }

    async loadModel(
        modelName: string,
        quantization: string,
        useWebGPU: boolean,
        hfEndpoint: string
    ): Promise<void> {
        await this.sendMessage('LOAD_MODEL', {
            modelName,
            quantization,
            useWebGPU,
            hfEndpoint
        });
    }

    async calculate(
        inputText: string,
        modelName: string,
        quantization: string
    ): Promise<any> {
        return await this.sendMessage('CALCULATE', {
            inputText,
            modelName,
            quantization
        });
    }

    // 监听进度更新的方法
    onProgress(callback: (progress: number, message: string) => void) {
        if (this.worker) {
            this.worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
                const { type, data } = event.data;
                if (type === 'LOAD_MODEL_PROGRESS') {
                    callback(data.progress, data.message);
                }
            });
        }
    }

    destroy() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.pendingMessages.clear();
    }
}
