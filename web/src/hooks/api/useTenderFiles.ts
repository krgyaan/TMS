import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { tenderFilesService } from '@/services/api/tender-files.service';
import type { TenderFileContext, UploadResult } from '@/components/tender-file-upload/types';

export const fileConfigKeys = {
    all: ['file-configs'] as const,
    config: (ctx: TenderFileContext) => [...fileConfigKeys.all, ctx] as const,
};

export function useFileConfig(context: TenderFileContext) {
    return useQuery({
        queryKey: fileConfigKeys.config(context),
        queryFn: () => tenderFilesService.getConfig(context),
        staleTime: 1000 * 60 * 60, // 1 hour
        retry: false, // Don't retry on failure - use fallback instead
    });
}

export function useFileUpload(context: TenderFileContext) {
    const [progress, setProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);

    const upload = useCallback(
        async (files: File[]): Promise<UploadResult | null> => {
            setIsUploading(true);
            setProgress(0);

            try {
                const result = await tenderFilesService.upload(files, context, setProgress);

                if (result.files.length > 0) {
                    toast.success(`${result.files.length} file(s) uploaded`);
                }
                if (result.errors.length > 0) {
                    result.errors.forEach((e) => toast.error(`${e.fileName}: ${e.error}`));
                }

                return result;
            } catch (err) {
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
            await tenderFilesService.delete(filePath);
            toast.success('File deleted');
        } catch {
            toast.error('Delete failed');
        }
    }, []);

    return { upload, deleteFile, progress, isUploading };
}
