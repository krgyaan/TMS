import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useFileConfig, useFileUpload } from '@/hooks/api/useTenderFiles';
import { tenderFilesService } from '@/services/api/tender-files.service';
import type { TenderFileContext, FileConfig } from './types';

// Fallback default config when API fails
const DEFAULT_CONFIG: FileConfig = {
    context: 'checklists',
    maxFiles: 1,
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    maxSizeFormatted: '10 MB',
    allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx', '.xls', '.xlsx'],
};

interface CompactTenderFileUploaderProps {
    context: TenderFileContext;
    value?: string;
    onChange?: (path: string | undefined) => void;
    disabled?: boolean;
    className?: string;
}

export function CompactTenderFileUploader({
    context,
    value,
    onChange,
    disabled = false,
    className,
}: CompactTenderFileUploaderProps) {
    const { data: config, isLoading } = useFileConfig(context);
    const { upload, deleteFile, progress, isUploading } = useFileUpload(context);

    // Use fallback config if API fails
    const effectiveConfig = config || DEFAULT_CONFIG;

    const onDrop = useCallback(
        async (acceptedFiles: File[]) => {
            if (!effectiveConfig || disabled || isUploading || acceptedFiles.length === 0) return;

            // Single file upload only - take first file
            const fileToUpload = acceptedFiles[0];

            const result = await upload([fileToUpload]);
            if (result && result.files.length > 0) {
                onChange?.(result.files[0].path);
            }
        },
        [effectiveConfig, disabled, isUploading, upload, onChange],
    );

    const handleRemove = useCallback(
        async (e: React.MouseEvent) => {
            e.stopPropagation();
            if (value) {
                await deleteFile(value);
                onChange?.(undefined);
            }
        },
        [deleteFile, value, onChange],
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        disabled: disabled || isUploading || !effectiveConfig || !!value,
        maxSize: effectiveConfig.maxSizeBytes,
        accept: effectiveConfig.allowedExtensions.reduce(
            (acc, ext) => ({ ...acc, [`${ext}`]: [] }),
            {},
        ),
        multiple: false,
    });

    if (isLoading) {
        return (
            <div className={cn('h-10 bg-muted animate-pulse rounded flex items-center justify-center', className)}>
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // File is uploaded - show compact file display
    if (value) {
        const fileName = value.split('/').pop() || value;
        return (
            <div className={cn('flex items-center gap-2 min-h-[40px]', className)}>
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <a
                    href={tenderFilesService.getFileUrl(value)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-xs truncate hover:underline text-primary"
                    onClick={(e) => e.stopPropagation()}
                >
                    {fileName}
                </a>
                {!disabled && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0"
                        onClick={handleRemove}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                )}
            </div>
        );
    }

    // No file - show compact upload button/dropzone
    return (
        <div className={cn('space-y-1', className)}>
            {isUploading ? (
                <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Uploading...</span>
                        <span className="text-muted-foreground">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1" />
                </div>
            ) : (
                <div
                    {...getRootProps()}
                    className={cn(
                        'border border-dashed rounded-md p-2 text-center transition-colors min-h-[40px] flex items-center justify-center',
                        !disabled && 'cursor-pointer hover:border-primary/50 hover:bg-primary/5',
                        isDragActive && 'border-primary bg-primary/10',
                        disabled && 'opacity-50 cursor-not-allowed',
                    )}
                >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center gap-1">
                        <Upload className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                            {isDragActive ? 'Drop file' : 'Upload'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
