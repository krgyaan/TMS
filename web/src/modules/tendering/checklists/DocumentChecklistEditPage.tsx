import { useNavigate, useParams } from 'react-router-dom';
import DocumentChecklistForm from './components/DocumentChecklistForm';
import { useTender } from '@/hooks/api/useTenders';
import { useDocumentChecklistByTender } from '@/hooks/api/useDocumentChecklists';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import type { TenderDocumentChecklist } from './helpers/documentChecklist.types';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DocumentChecklistEditPage() {
    const navigate = useNavigate();
    const { tenderId } = useParams<{ tenderId: string }>();
    const { data: tenderDetails, isLoading } = useTender(Number(tenderId));
    const { data: checklist, isLoading: checklistLoading } = useDocumentChecklistByTender(Number(tenderId));

    if (isLoading || checklistLoading) return (<Skeleton className="h-[600px]" />);
    if (!tenderDetails) return (
        <Alert variant="destructive">
            <AlertTitle>Tender not found</AlertTitle>
            <AlertDescription>The tender you are looking for does not exist.</AlertDescription>
            <Button variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
        </Alert>
    );
    if (!checklist) return (
        <Alert variant="destructive">
            <AlertTitle>Checklist not found</AlertTitle>
            <AlertDescription>The checklist you are looking for does not exist.</AlertDescription>
            <Button variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
        </Alert>
    );
    return (
        <DocumentChecklistForm
            tenderId={Number(tenderId)}
            tenderDetails={{
                tenderNo: tenderDetails.tenderNo,
                tenderName: tenderDetails.tenderName,
                dueDate: tenderDetails.dueDate as Date,
                teamMemberName: tenderDetails.teamMemberName as string,
            }}
            mode="edit"
            existingData={checklist as TenderDocumentChecklist}
        />
    );
}
