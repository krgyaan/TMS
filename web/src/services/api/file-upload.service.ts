import axiosInstance from '@/lib/axios';
import type {
    FileContext,
    FileConfig,
    UploadResult,
} from '@/components/file-upload/types';

const BASE_URL = '/files';

const LEGACY_CONTEXT_ALIASES: Record<string, string> = {
    draftWo: 'wo-draft',
};

const normalizeLegacyContext = (filePath: string): string => {
    const segments = filePath.replace(/\\/g, '/').replace(/^\/+/, '').split('/');
    const canonical = LEGACY_CONTEXT_ALIASES[segments[0]];
    if (canonical) segments[0] = canonical;
    return segments.join('/');
};

export const fileUploadService = {
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
    getConfig: async (context: FileContext): Promise<FileConfig> => {
        const { data } = await axiosInstance.get(`${BASE_URL}/config/${context}`);
        return data;
    },

    /**
     * Upload files
     */
    upload: async (
        files: File[],
        context: FileContext,
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
        return `${baseUrl}${BASE_URL}/serve/${normalizeLegacyContext(filePath)}`;
    },

    /**
     * Delete file
     */
    delete: async (filePath: string): Promise<void> => {
        await axiosInstance.delete(`${BASE_URL}/${filePath}`);
    },
};