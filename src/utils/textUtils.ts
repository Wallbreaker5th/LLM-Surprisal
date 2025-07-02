import type { WordCount, CalculationResult, Stats } from '../types';

export class CustomTextDecoder {
    constructor() {
        // TextDecoder is initialized but we implement our own decode logic
    }
    
    decode(byteArray: Uint8Array | number[]): string {
        let result = '';
        const bytes = byteArray instanceof Uint8Array ? byteArray : Uint8Array.from(byteArray);
        for (let i = 0; i < bytes.length;) {
            const b1 = bytes[i];
            if (b1 < 0x80) {
                result += String.fromCharCode(b1);
                i++;
            } else if (b1 >= 0xC0 && b1 < 0xE0) {
                if (i + 1 < bytes.length && (bytes[i + 1] & 0xC0) === 0x80) {
                    const code = ((b1 & 0x1F) << 6) | (bytes[i + 1] & 0x3F);
                    result += String.fromCharCode(code);
                    i += 2;
                } else {
                    result += '\\x' + b1.toString(16).padStart(2, '0');
                    i++;
                }
            } else if (b1 >= 0xE0 && b1 < 0xF0) {
                if (i + 2 < bytes.length && (bytes[i + 1] & 0xC0) === 0x80 && (bytes[i + 2] & 0xC0) === 0x80) {
                    const code = ((b1 & 0x0F) << 12) | ((bytes[i + 1] & 0x3F) << 6) | (bytes[i + 2] & 0x3F);
                    result += String.fromCharCode(code);
                    i += 3;
                } else {
                    result += '\\x' + b1.toString(16).padStart(2, '0');
                    i++;
                }
            } else if (b1 >= 0xF0 && b1 < 0xF8) {
                if (i + 3 < bytes.length && (bytes[i + 1] & 0xC0) === 0x80 && (bytes[i + 2] & 0xC0) === 0x80 && (bytes[i + 3] & 0xC0) === 0x80) {
                    let cp = ((b1 & 0x07) << 18) | ((bytes[i + 1] & 0x3F) << 12) | ((bytes[i + 2] & 0x3F) << 6) | (bytes[i + 3] & 0x3F);
                    if (cp > 0xFFFF) {
                        cp -= 0x10000;
                        const hi = 0xD800 + (cp >> 10);
                        const lo = 0xDC00 + (cp & 0x3FF);
                        result += String.fromCharCode(hi, lo);
                    } else {
                        result += String.fromCharCode(cp);
                    }
                    i += 4;
                } else {
                    result += '\\x' + b1.toString(16).padStart(2, '0');
                    i++;
                }
            } else {
                result += '\\x' + b1.toString(16).padStart(2, '0');
                i++;
            }
        }
        return result;
    }
}

export function getBackgroundColor(surprisal: number): string {
    const opacity = Math.min(surprisal / 16, 1);
    return `rgba(0, 116, 217, ${opacity})`;
}

// 使用 Intl.Segmenter 进行更准确的单词分割，fallback 到正则表达式
export function countWords(text: string, locale: string): WordCount {
    if (!text) return { totalWords: 0, chineseWords: 0, otherWords: 0 };
    
    // 检查是否支持 Intl.Segmenter
    if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
        try {
            // 使用 Intl.Segmenter 进行单词分割
            const segmenter = new (Intl as any).Segmenter(locale, { granularity: 'word' });
            const segments = segmenter.segment(text);
            
            let chineseWords = 0;
            let otherWords = 0;
            
            for (const segment of segments) {
                // 只计算实际的单词，跳过空格和标点符号
                if (segment.isWordLike) {
                    // 检查是否包含中文字符
                    if (/[\u4e00-\u9fff]/.test(segment.segment)) {
                        chineseWords++;
                    } else {
                        otherWords++;
                    }
                }
            }
            
            return {
                totalWords: chineseWords + otherWords,
                chineseWords: chineseWords,
                otherWords: otherWords
            };
        } catch (error) {
            console.warn('Intl.Segmenter failed, falling back to regex:', error);
        }
    }
    
    // Fallback: 使用正则表达式的传统方法
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const chineseWords = chineseChars; // 汉字每个算一个词
    
    // 移除汉字后，按空格分割其他语言的单词
    const otherText = text.replace(/[\u4e00-\u9fff]/g, '');
    const otherWords = otherText.split(/\s+/).filter((word: string) => word.length > 0).length;
    
    return {
        totalWords: chineseWords + otherWords,
        chineseWords: chineseWords,
        otherWords: otherWords
    };
}

// 计算平均信息量统计
export function getAverageStats(output: CalculationResult | null, locale: string): Stats | null {
    if (!output || !output.results || output.results.length === 0) {
        return null;
    }
    
    const results = output.results;
    const originalText = output.originalText || '';
    
    // 计算平均surprisal (bits)
    const totalSurprisal = results.reduce((sum, item) => sum + (item.surprisal || 0), 0);
    const avgPerToken = totalSurprisal / results.length;
    
    // 计算字符数（汉字和其他字符分别计算）
    const chineseChars = (originalText.match(/[\u4e00-\u9fff]/g) || []).length;
    const otherChars = originalText.length - chineseChars;
    const totalChars = originalText.length;
    
    // 使用新的单词计数函数
    const wordCounts = countWords(originalText, locale);
    
    return {
        avgPerToken: avgPerToken,
        avgPerChar: totalChars > 0 ? totalSurprisal / totalChars : 0,
        avgPerWord: wordCounts.totalWords > 0 ? totalSurprisal / wordCounts.totalWords : 0,
        totalTokens: results.length,
        totalChars: totalChars,
        totalWords: wordCounts.totalWords,
        chineseChars: chineseChars,
        otherChars: otherChars,
        chineseWords: wordCounts.chineseWords,
        otherWords: wordCounts.otherWords,
        totalInformation: totalSurprisal
    };
}
