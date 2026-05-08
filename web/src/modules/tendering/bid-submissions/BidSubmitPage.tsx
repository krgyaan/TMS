import { useParams } from 'react-router-dom';
import SubmitBidForm from './components/SubmitBidForm';
import { useTender } from '@/hooks/api/useTenders';
import { useCostingSheetByTender } from '@/hooks/api/useCostingSheets';
import { useInfoSheet } from '@/hooks/api/useInfoSheets';
import { useTenderApproval } from '@/hooks/api/useTenderApprovals';
import { useRfqByTenderId } from '@/hooks/api/useRfqs';
import { usePaymentRequestsByTender } from '@/hooks/api/useEmds';
import { useDocumentChecklistByTender } from '@/hooks/api/useDocumentChecklists';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { SubmissionChecklist, type Checkpoint } from '@/components/tendering/SubmissionChecklist';

export default function BidSubmitPage() {
    const { tenderId } = useParams<{ tenderId: string }>();
    const id = Number(tenderId);

    const { data: tenderDetails, isLoading: tenderLoading } = useTender(id);
    const { data: costingSheet, isLoading: costingLoading } = useCostingSheetByTender(id);
    const { data: infoSheet, isLoading: infoLoading } = useInfoSheet(id);
    const { data: approval, isLoading: approvalLoading } = useTenderApproval(id);
    const { data: rfqs, isLoading: rfqsLoading } = useRfqByTenderId(id);
    const { data: paymentRequests, isLoading: emdLoading } = usePaymentRequestsByTender(id);
    const { data: checklist, isLoading: checklistLoading } = useDocumentChecklistByTender(id);

    const isLoading = tenderLoading || costingLoading || infoLoading || approvalLoading ||
        rfqsLoading || emdLoading || checklistLoading;

    if (isLoading) return <Skeleton className="h-[800px]" />;

    if (!tenderDetails) return <div>Tender not found</div>;

    if (!costingSheet || costingSheet.status !== 'Approved') {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    This tender does not have an approved costing sheet. Please get the costing approved first.
                </AlertDescription>
            </Alert>
        );
    }

    // Checkpoint Logic
    const rfqRequired = approval?.rfqRequired !== 'no' && tenderDetails.rfqTo !== '0' && tenderDetails.rfqTo !== '1';
    const emdNA = infoSheet?.emdRequired === 'NO' || infoSheet?.emdRequired === 'EXEMPT';

    const checkpoints: Checkpoint[] = [
        {
            id: 'rfq-quotation',
            label: 'RFQ Quotation',
            status: !rfqRequired ? (rfqs && rfqs.length > 0 ? 'fulfilled' : 'pending') : 'na',
            description: !rfqRequired ? 'Upload quotation in approval' : 'Ensure RFQs are sent and quotations updated'
        },
        {
            id: 'emd',
            label: 'EMD Status',
            status: emdNA ? 'na' : (paymentRequests?.some(r => r.tenderId === id) ? 'fulfilled' : 'pending'),
            description: emdNA ? 'EMD not required' : 'Process EMD payment'
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
            <SubmissionChecklist checkpoints={checkpoints} title="Bid Submission Checklist" />

            <SubmitBidForm
                tenderId={id}
                tenderDetails={{
                    tenderNo: tenderDetails.tenderNo,
                    tenderName: tenderDetails.tenderName,
                    dueDate: tenderDetails.dueDate as Date,
                    teamMemberName: tenderDetails.teamMemberName as string,
                    emdAmount: tenderDetails.emd,
                    gstValues: Number(tenderDetails.gstValues) || 0,
                    finalCosting: costingSheet.finalPrice,
                }}
                mode="submit"
                isChecklistFulfilled={isChecklistFulfilled}
            />
        </div>
    );
}
