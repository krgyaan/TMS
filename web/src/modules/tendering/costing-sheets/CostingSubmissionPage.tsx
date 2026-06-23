import { SubmissionChecklist, type Checkpoint } from '@/components/tendering/SubmissionChecklist';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCostingSheetByTender } from '@/hooks/api/useCostingSheets';
import { useDocumentChecklistByTender } from '@/hooks/api/useDocumentChecklists';
import { useInfoSheet } from '@/hooks/api/useInfoSheets';
import { usePaymentRequestsByTender } from '@/hooks/api/usePaymentRequests';
import { usePhysicalDocByTenderId } from '@/hooks/api/usePhysicalDocs';
import { useRfqByTenderId } from '@/hooks/api/useRfqs';
import { useTenderApproval } from '@/hooks/api/useTenderApprovals';
import { useTender } from '@/hooks/api/useTenders';
import { AlertCircle, ArrowLeft, Layers } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import CostingSheetSubmitForm from './components/CostingSheetSubmitForm';

const ITEM_WISE_TYPES = ['ITEM_WISE_PRE_GST', 'ITEM_WISE_GST_INCLUSIVE'];

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

    const isItemWise = infoSheet && ITEM_WISE_TYPES.includes(infoSheet.commercialEvaluation ?? '');

    if (isLoading) return <Skeleton className="h-[600px]" />;
    if (!tenderDetails) return (
        <Alert variant="destructive">
            <AlertTitle>Tender not found</AlertTitle>
            <AlertDescription>The tender with the ID {tenderId} was not found.</AlertDescription>
            <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft /> Back to Tenders</Button>
        </Alert>
    );

    const rfqNA = approval?.rfqRequired === 'no' || tenderDetails.rfqTo === '0' || tenderDetails.rfqTo === '1';
    const emdNA = infoSheet?.emdRequired === 'NO' || infoSheet?.emdRequired === 'EXEMPT';
    const emdIsSB = infoSheet?.emdMode?.includes('SB');
    const physicalNA = infoSheet?.physicalDocsRequired === 'NO' || infoSheet?.physicalDocType === 'ONLY_EMD';

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
            status: emdNA ? 'na' : (emdIsSB || (Array.isArray(paymentRequests) && paymentRequests.some(r => r.tenderId === id)) ? 'fulfilled' : 'pending'),
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
    const emdConsented = !emdNA && (emdIsSB || (Array.isArray(paymentRequests) &&
        paymentRequests.some(r => r.instruments?.some((i: any) => i.consentForPay))));

    return (
        <div className="space-y-6">
            <SubmissionChecklist checkpoints={checkpoints} />

            {!emdNA && !emdConsented && (
                <Alert variant="warning">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        EMD Consent for Payment is pending. Please ensure consent has been given in the EMD Dashboard before proceeding.
                    </AlertDescription>
                </Alert>
            )}

            {isItemWise && (
                <Alert variant="default" className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                    <Layers className="h-4 w-4" />
                    <AlertDescription className="flex items-center gap-2">
                        Item-wise costing mode enabled.
                        <Badge variant="secondary">{infoSheet?.commercialEvaluation}</Badge>
                    </AlertDescription>
                </Alert>
            )}

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
                isItemWise={isItemWise}
            />
        </div>
    );
}
