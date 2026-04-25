import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TenderFileUploader } from '@/components/tender-file-upload/TenderFileUploader';
import { useWoDetailWithRelations, useUpdateWoDetail } from '@/hooks/api/useWoDetails';
import { useUpdateWoBasicDetail } from '@/hooks/api/useWoBasicDetails';
import { useWoDocumentsByType, useUploadWoDocument, useDeleteWoDocument } from '@/hooks/api/useWoDocuments';
import type { DocumentType } from '@/modules/operations/types/wo.types';
import { ArrowLeft, Calendar, Hash } from 'lucide-react';
import { paths } from '@/app/routes/paths';
import { Skeleton } from '@/components/ui/skeleton';
import type { TenderFileContext } from '@/components/tender-file-upload/types';
import { formatDate } from '@/hooks/useFormatedDate';
import { tenderFilesService } from '@/services/api/tender-files.service';
import { toast } from 'sonner';

interface WoDocumentUploaderProps {
    woDetailId: number;
    type: DocumentType;
    context: TenderFileContext;
    label: string;
}

const WoDocumentUploader = ({ woDetailId, type, context, label }: WoDocumentUploaderProps) => {
    const { data: documents = [], isLoading } = useWoDocumentsByType(woDetailId, type);
    const { mutateAsync: uploadDoc } = useUploadWoDocument();
    const { mutateAsync: deleteDoc } = useDeleteWoDocument();

    const filePaths = useMemo(() => documents.map(d => d.filePath).filter(Boolean) as string[], [documents]);

    const handleChange = async (newPaths: string[]) => {
        // Added paths
        const added = newPaths.filter(p => !filePaths.includes(p));
        // Removed paths
        const removed = filePaths.filter(p => !newPaths.includes(p));

        try {
            for (const path of added) {
                await uploadDoc({ woDetailId, type, filePath: path });
            }

            for (const path of removed) {
                const doc = documents.find(d => d.filePath === path);
                if (doc) await deleteDoc(doc.id);
            }
        } catch (error) {
            console.error('Error synchronizing documents', error);
        }
    };

    if (isLoading) return <Skeleton className="h-32 w-full" />;

    return (
        <TenderFileUploader
            context={context}
            label={label}
            value={filePaths}
            onChange={handleChange}
        />
    );
};

const WoUploadPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const woDetailId = Number(id);

    const { data, isLoading } = useWoDetailWithRelations(woDetailId);
    
    const { mutateAsync: updateBasicDetail, isPending: isCompletingBasic } = useUpdateWoBasicDetail();
    const { mutateAsync: updateWoDetail, isPending: isCompletingDetail } = useUpdateWoDetail();

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (!data) {
        return <div className="p-8 text-center text-muted-foreground">WO Detail not found</div>;
    }

    const handleSubmit = async () => {
        try {
            // Move workflow stage to completed
            await updateBasicDetail({
                id: data.woBasicDetailId,
                data: { currentStage: 'completed' }
            });

            // Update WO Detail status to completed
            await updateWoDetail({
                id: data.id,
                data: { status: 'completed' }
            });

            toast.success("WO Upload completed successfully");
            navigate(paths.operations.woDetailAcceptanceListPage);
        } catch (error) {
            console.error(error);
            // Error toast handled implicitly by generalized hooks error boundary usually, but we can do extra here:
            toast.error("An error occurred during completion. Please check logs.");
        }
    };

    // PO Amendment logic
    const isAmendmentNeeded = data?.oeWoAmendmentNeeded === true || data?.amendments;
    const basicDraftPath = data?.woBasicDetail?.woDraft;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    WO Uploads
                </CardTitle>
                <CardDescription>
                    Upload final Work Order and related contractual documents
                </CardDescription>
                <CardAction>
                    <Button variant="outline" onClick={() => navigate(paths.operations.woDetailAcceptanceListPage)}>
                        <ArrowLeft className="h-5 w-5" /> Back
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent className='space-y-8'>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 border p-3 rounded-lg">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            <Hash className="h-3 w-3" /> WO Number
                        </p>
                        <p className="font-semibold">{data?.woBasicDetail?.woNumber || '—'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> WO Date
                        </p>
                        <p className="font-semibold">{data?.woBasicDetail?.woDate ? formatDate(data.woBasicDetail.woDate) : '—'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            <Hash className="h-3 w-3" /> Project Code
                        </p>
                        <p className="font-mono font-bold text-primary">{data?.woBasicDetail?.projectCode || '—'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Project Name</p>
                        <p className="font-semibold truncate" title={data?.woBasicDetail?.projectName || ''}>
                            {data?.woBasicDetail?.projectName || '—'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        {isAmendmentNeeded ? (
                            <WoDocumentUploader
                                woDetailId={woDetailId}
                                type="finalWo"
                                context="final-wo"
                                label="Upload Final WO Document"
                            />
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm font-medium">LOA/GEM/LOI/Draft WO</p>
                                <p className="text-sm text-muted-foreground">
                                    Amendment was not needed. Using pre-uploaded file from Basic Details.
                                </p>
                                {basicDraftPath ? (
                                    <a
                                        href={tenderFilesService.getFileUrl(basicDraftPath)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary underline text-sm"
                                    >
                                        View Draft WO
                                    </a>
                                ) : (
                                    <p className="text-sm text-destructive">No draft WO found in Basic Details.</p>
                                )}
                            </div>
                        )}
                    </div>
                    <WoDocumentUploader
                        woDetailId={woDetailId}
                        type="detailedWo"
                        context="detailed-wo"
                        label="Upload FOA/SAP PO/Detailed WO Documents"
                    />
                </div>
                
                <div className="flex justify-end pt-4 gap-4">
                    <Button variant="outline" onClick={() => navigate(paths.operations.woDetailAcceptanceListPage)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isCompletingBasic || isCompletingDetail}>
                        {isCompletingBasic || isCompletingDetail ? "Submitting..." : "Submit WO Upload"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default WoUploadPage;
