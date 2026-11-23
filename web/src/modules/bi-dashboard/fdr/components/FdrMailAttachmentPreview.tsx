import { useFdrMailPreview } from '@/hooks/api/useFdrs';
import { fileUploadService } from '@/services/api/file-upload.service';

interface FdrMailAttachmentPreviewProps {
    instrumentId: number;
    stage: number;
    files: Record<string, string[]>;
}

const fileName = (path: string): string => {
    const name = path.split('/').pop() || path;
    try {
        return decodeURIComponent(name);
    } catch {
        return name;
    }
};

export function FdrMailAttachmentPreview({ instrumentId, stage, files }: FdrMailAttachmentPreviewProps) {
    const { data, isLoading } = useFdrMailPreview(instrumentId, stage, files);

    const attachments = data?.attachments ?? [];
    const missing = data?.missing ?? [];

    return (
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="mb-2 font-medium">Documents attached to this mail</div>
            {isLoading ? (
                <p className="text-muted-foreground">Checking documents...</p>
            ) : (
                <>
                    {attachments.length > 0 ? (
                        <ul className="list-disc space-y-1 pl-5">
                            {attachments.map((attachment, index) => (
                                <li key={`${attachment.path}-${index}`}>
                                    <span>{attachment.label}: </span>
                                    <a
                                        href={fileUploadService.getFileUrl(attachment.path)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-blue-600 underline"
                                    >
                                        {fileName(attachment.path)}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted-foreground">No documents will be attached to this mail.</p>
                    )}
                    {missing.length > 0 && (
                        <p className="mt-2 text-muted-foreground">
                            <span className="font-medium">Missing: </span>
                            {missing.join(', ')}
                        </p>
                    )}
                </>
            )}
        </div>
    );
}
