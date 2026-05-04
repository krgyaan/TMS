import { useParams, useNavigate } from 'react-router-dom';
import CostingSheetSubmitForm from './components/CostingSheetSubmitForm';
import { useTender } from '@/hooks/api/useTenders';
import { useCostingSheetByTender } from '@/hooks/api/useCostingSheets';
import { useInfoSheet } from '@/hooks/api/useInfoSheets';
import { useTenderApproval } from '@/hooks/api/useTenderApprovals';
import { useRfqByTenderId } from '@/hooks/api/useRfqs';
import { usePaymentRequestsByTender } from '@/hooks/api/usePaymentRequests';
import { usePhysicalDocByTenderId } from '@/hooks/api/usePhysicalDocs';
import { useDocumentChecklistByTender } from '@/hooks/api/useDocumentChecklists';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { SubmissionChecklist, type Checkpoint } from '@/components/tendering/SubmissionChecklist';

export default function CostingSheetSubmitPage() {
    const navigate = useNavigate();
    const { tenderId } = useParams<{ tenderId: string }>();
    const id = Number(tenderId);

    const { data: tenderDetails, isLoading: tenderLoading } = useTender(id);
    const { data: costingSheet, isLoading: costingLoading } = useCostingSheetByTender(id);
    const { data: infoSheet, isLoading: infoLoading } = useInfoSheet(id);
    const { data: approval, isLoading: approvalLoading } = useTenderApproval(id);
    const { data: rfqs, isLoading: rfqsLoading } = useRfqByTenderId(id);
    const { data: paymentRequests, isLoading: emdLoading } = usePaymentRequestsByTender(id);
    const { data: physicalDocs, isLoading: physicalLoading } = usePhysicalDocByTenderId(id);
    const { data: checklist, isLoading: checklistLoading } = useDocumentChecklistByTender(id);

    const isLoading = tenderLoading || costingLoading || infoLoading || approvalLoading ||
        rfqsLoading || emdLoading || physicalLoading || checklistLoading;

    if (isLoading) return <Skeleton className="h-[600px]" />;
    if (!tenderDetails) return (
        <Alert variant="destructive">
            <AlertTitle>Tender not found</AlertTitle>
            <AlertDescription>The tender with the ID {tenderId} was not found.</AlertDescription>
            <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft /> Back to Tenders</Button>
        </Alert>
    );

    // Checkpoint Logic
    const rfqNA = approval?.rfqRequired === 'no' || tenderDetails.rfqTo === '0' || tenderDetails.rfqTo === '1';
    const emdNA = infoSheet?.emdRequired === 'NO' || infoSheet?.emdRequired === 'EXEMPT';
    const physicalNA = infoSheet?.physicalDocsRequired === 'NO';

    const checkpoints: Checkpoint[] = [
        {
            id: 'rfq',
            label: 'RFQ Status',
            status: rfqNA ? 'na' : (rfqs && rfqs.length > 0 ? 'fulfilled' : 'pending'),
            description: rfqNA ? 'RFQ not required' : 'Send RFQ to vendors'
        },
        {
            id: 'emd',
            label: 'EMD Status',
            status: emdNA ? 'na' : (paymentRequests?.some(r => r.tenderId === id) ? 'fulfilled' : 'pending'),
            description: emdNA ? 'EMD not required' : 'Process EMD payment'
        },
        {
            id: 'physical',
            label: 'Physical Docs',
            status: physicalNA ? 'na' : (physicalDocs ? 'fulfilled' : 'pending'),
            description: physicalNA ? 'Physical documents not required' : 'Prepare and send physical documents'
        },
        {
            id: 'checklist',
            label: 'Doc Checklist',
            status: checklist ? 'fulfilled' : 'pending',
            description: 'Submit mandatory document checklist'
        }
    ];

    const isChecklistFulfilled = checkpoints.every(cp => cp.status === 'fulfilled' || cp.status === 'na');

    return (
        <div className="space-y-6">
            <SubmissionChecklist checkpoints={checkpoints} />

            <CostingSheetSubmitForm
                tenderId={id}
                tenderDetails={{
                    tenderNo: tenderDetails.tenderNo,
                    tenderName: tenderDetails.tenderName,
                    dueDate: tenderDetails.dueDate as Date,
                    teamMemberName: tenderDetails.teamMemberName as string,
                }}
                mode="submit"
                existingData={costingSheet || undefined}
                isChecklistFulfilled={isChecklistFulfilled}
            />
        </div>
    );
}
