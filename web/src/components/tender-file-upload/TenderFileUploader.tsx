import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useFileConfig, useFileUpload } from '@/hooks/api/useTenderFiles';
import { tenderFilesService } from '@/services/api/tender-files.service';
import type { TenderFileContext, FileConfig } from './types';

// Fallback default config when API fails
const DEFAULT_CONFIG: FileConfig = {
    context: 'tender-documents',
    maxFiles: 10,
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    maxSizeFormatted: '10 MB',
    allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx', '.xls', '.xlsx'],
};

interface TenderFileUploaderProps {
    context: TenderFileContext;
    value?: string[];
    onChange?: (paths: string[]) => void;
    disabled?: boolean;
    className?: string;
    label?: string;
}

export function TenderFileUploader({
    context,
    value = [],
    onChange,
    disabled = false,
    className,
    label,
}: TenderFileUploaderProps) {
    const { data: config, isLoading, error } = useFileConfig(context);
    const { upload, deleteFile, progress, isUploading } = useFileUpload(context);

    // Use fallback config if API fails
    const effectiveConfig = config || DEFAULT_CONFIG;
    const isUsingFallback = !config && !isLoading;

    const onDrop = useCallback(
        async (acceptedFiles: File[]) => {
            if (!effectiveConfig || disabled) return;

            const remaining = effectiveConfig.maxFiles - value.length;
            const filesToUpload = acceptedFiles.slice(0, remaining);

            const result = await upload(filesToUpload);
            if (result && result.files.length > 0) {
                const newPaths = result.files.map((f) => f.path);
                onChange?.([...value, ...newPaths]);
            }
        },
        [effectiveConfig, disabled, value, upload, onChange],
    );

    const handleRemove = useCallback(
        async (filePath: string) => {
            await deleteFile(filePath);
            onChange?.(value.filter((p) => p !== filePath));
        },
        [deleteFile, value, onChange],
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        disabled: disabled || isUploading || !effectiveConfig || value.length >= effectiveConfig.maxFiles,
        maxSize: effectiveConfig.maxSizeBytes,
        accept: effectiveConfig.allowedExtensions.reduce(
            (acc, ext) => ({ ...acc, [`${ext}`]: [] }),
            {},
        ),
    });

    if (isLoading) {
        return <div className={cn('h-32 bg-muted animate-pulse rounded-lg', className)} />;
    }

    const canUploadMore = value.length < effectiveConfig.maxFiles;

    return (
        <div className={cn('space-y-3', className)}>
            {label && <p className="text-sm font-medium">{label}</p>}

            {/* Error/Warning Banner */}
            {isUsingFallback && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                    <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    <div className="flex-1">
                        <p className="text-xs text-yellow-800 dark:text-yellow-200">
                            Using default upload settings. Config API unavailable.
                        </p>
                        {error && (
                            <p className="text-xs mt-1 text-yellow-700 dark:text-yellow-300">
                                Error: {error instanceof Error ? error.message : String(error)}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Dropzone */}
            {canUploadMore && (
                <div
                    {...getRootProps()}
                    className={cn(
                        'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
                        !disabled && 'cursor-pointer hover:border-primary/50 hover:bg-primary/5',
                        isDragActive && 'border-primary bg-primary/10',
                        disabled && 'opacity-50 cursor-not-allowed',
                    )}
                >
                    <input {...getInputProps()} />
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm">
                        {isDragActive ? 'Drop here' : 'Drag & drop or click to upload'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {effectiveConfig.allowedExtensions.join(', ')} • Max {effectiveConfig.maxSizeFormatted}
                    </p>
                    {effectiveConfig.maxFiles > 1 && (
                        <p className="text-xs text-muted-foreground">
                            {effectiveConfig.maxFiles - value.length} of {effectiveConfig.maxFiles} remaining
                        </p>
                    )}
                </div>
            )}

            {/* Progress */}
            {isUploading && (
                <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                        <span>Uploading...</span>
                        <span>{progress}%</span>
                    </div>
                    <Progress value={progress} />
                </div>
            )}

            {/* File List */}
            {value.length > 0 && (
                <div className="space-y-2">
                    {value.map((filePath) => {
                        const fileName = filePath.split('/').pop() || filePath;
                        return (
                            <div
                                key={filePath}
                                className="flex items-center gap-2 p-2 rounded border bg-card"
                            >
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <a
                                    href={tenderFilesService.getFileUrl(filePath)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 text-sm truncate hover:underline"
                                >
                                    {fileName}
                                </a>
                                {!disabled && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => handleRemove(filePath)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
