import { ElMessage } from 'element-plus';
import type { CalculationResult } from '../types';

export function downloadJson(output: CalculationResult | null, t: (key: string) => string): void {
    if (!output || output.results?.length === 0) {
        ElMessage.warning(t('modelNotLoaded'));
        return;
    }
    
    const dataStr = JSON.stringify(output, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `llm-surprisal-results-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    ElMessage.success(t('resultsSaved'));
}

export function handleFileUpload(
    file: File, 
    t: (key: string) => string, 
    onSuccess: (data: CalculationResult) => void
): void {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const result = e.target?.result;
            if (typeof result !== 'string') {
                ElMessage.error(t('fileUploadError'));
                return;
            }
            
            const data = JSON.parse(result) as CalculationResult;
            
            // Validate the JSON structure
            if (!data.results || !Array.isArray(data.results)) {
                ElMessage.error(t('invalidJsonFormat'));
                return;
            }
            
            onSuccess(data);
            ElMessage.success(t('fileUploaded'));
        } catch (error) {
            console.error('Error parsing JSON:', error);
            ElMessage.error(t('fileUploadError'));
        }
    };
    reader.readAsText(file);
}
