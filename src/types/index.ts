export interface TokenResult {
    token: string;
    surprisal: number;
    top10: TopPrediction[];
}

export interface TopPrediction {
    token: string;
    prob: number;
}

export interface CalculationResult {
    originalText: string;
    modelName: string;
    quantization: string;
    timestamp: string;
    results: TokenResult[];
}

export interface WordCount {
    totalWords: number;
    chineseWords: number;
    otherWords: number;
}

export interface Stats {
    avgPerToken: number;
    avgPerChar: number;
    avgPerWord: number;
    totalTokens: number;
    totalChars: number;
    totalWords: number;
    chineseChars: number;
    otherChars: number;
    chineseWords: number;
    otherWords: number;
    totalInformation: number;
}

export type QuantizationType = 'fp16' | 'fp32' | 'auto' | 'q8' | 'int8' | 'uint8' | 'q4' | 'bnb4' | 'q4f16';

// Worker消息类型
export interface WorkerMessage {
    type: 'LOAD_MODEL' | 'CALCULATE';
    id: string;
    data: any;
}

export interface WorkerResponse {
    type: 'LOAD_MODEL_SUCCESS' | 'LOAD_MODEL_ERROR' | 'LOAD_MODEL_PROGRESS' | 'CALCULATE_SUCCESS' | 'CALCULATE_ERROR' | 'ERROR';
    id: string;
    data: any;
}
