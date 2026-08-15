import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fileUploadService } from '@/services/api/file-upload.service';
import type { FileContext, UploadResult } from '@/components/file-upload/types';

export const fileConfigKeys = {
    all: ['file-configs'] as const,
    config: (ctx: FileContext) => [...fileConfigKeys.all, ctx] as const,
};

export function useFileConfig(context: FileContext) {
    return useQuery({
        queryKey: fileConfigKeys.config(context),
        queryFn: () => fileUploadService.getConfig(context),
        staleTime: 1000 * 60 * 60, // 1 hour
        retry: false, // Don't retry on failure - use fallback instead
    });
}

export function useFileUpload(context: FileContext) {
    const [progress, setProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);

    const upload = useCallback(
        async (files: File[]): Promise<UploadResult | null> => {
            setIsUploading(true);
            setProgress(0);

            try {
                const result = await fileUploadService.upload(files, context, setProgress);

                if (result.files.length > 0) {
                    toast.success(`${result.files.length} file(s) uploaded`);
                }
                if (result.errors.length > 0) {
                    result.errors.forEach((e) => toast.error(`${e.fileName}: ${e.error}`));
                }

                return result;
            } catch {
                toast.error('Upload failed');
                return null;
            } finally {
                setIsUploading(false);
                setProgress(0);
            }
        },
        [context],
    );

    const deleteFile = useCallback(async (filePath: string) => {
        try {
            await fileUploadService.delete(filePath);
            toast.success('File deleted');
        } catch {
            toast.error('Delete failed');
        }
    }, []);

    return { upload, deleteFile, progress, isUploading };
}