import axiosInstance from '@/lib/axios';
import type {
    TenderFileContext,
    FileConfig,
    UploadResult,
} from '@/components/tender-file-upload/types';

const BASE_URL = '/tender-files';

export const tenderFilesService = {
    /**
     * Get all configs
     */
    getAllConfigs: async (): Promise<FileConfig[]> => {
        const { data } = await axiosInstance.get(`${BASE_URL}/configs`);
        return data;
    },

    /**
     * Get config for context
     */
    getConfig: async (context: TenderFileContext): Promise<FileConfig> => {
        const { data } = await axiosInstance.get(`${BASE_URL}/config/${context}`);
        return data;
    },

    /**
     * Upload files
     */
    upload: async (
        files: File[],
        context: TenderFileContext,
        onProgress?: (progress: number) => void,
    ): Promise<UploadResult> => {
        const formData = new FormData();
        files.forEach((file) => formData.append('files', file));
        formData.append('context', context);

        const { data } = await axiosInstance.post(`${BASE_URL}/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (e) => {
                if (e.total && onProgress) {
                    onProgress(Math.round((e.loaded * 100) / e.total));
                }
            },
        });
        return data;
    },

    /**
     * Get file URL
     */
    getFileUrl: (filePath: string): string => {
        const baseUrl = axiosInstance.defaults.baseURL || '';
        return `${baseUrl}${BASE_URL}/serve/${filePath}`;
    },

    /**
     * Delete file
     */
    delete: async (filePath: string): Promise<void> => {
        await axiosInstance.delete(`${BASE_URL}/${filePath}`);
    },
};
