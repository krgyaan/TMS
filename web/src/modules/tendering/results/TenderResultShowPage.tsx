import { useParams, useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTenderResultByTenderId } from '@/hooks/api/useTenderResults';
import { useReverseAuction } from '@/hooks/api/useReverseAuctions';
import { useTender } from '@/hooks/api/useTenders';
import { useTenderApproval } from '@/hooks/api/useTenderApprovals';
import { useInfoSheet } from '@/hooks/api/useInfoSheets';
import { usePhysicalDocByTenderId } from '@/hooks/api/usePhysicalDocs';
import { useRfqByTenderId } from '@/hooks/api/useRfqs';
import { usePaymentRequestsByTender } from '@/hooks/api/useEmds';
import { useDocumentChecklistByTender } from '@/hooks/api/useDocumentChecklists';
import { useCostingSheetByTender } from '@/hooks/api/useCostingSheets';
import { useBidSubmissionByTender } from '@/hooks/api/useBidSubmissions';
import { paths } from '@/app/routes/paths';
import type { TenderWithRelations } from '@/modules/tendering/tenders/helpers/tenderInfo.types';
import { TenderView } from '@/modules/tendering/tenders/components/TenderView';
import { InfoSheetView } from '@/modules/tendering/info-sheet/components/InfoSheetView';
import { TenderApprovalView } from '@/modules/tendering/tender-approval/components/TenderApprovalView';
import { PhysicalDocsView } from '@/modules/tendering/physical-docs/components/PhysicalDocsView';
import { RfqView } from '@/modules/tendering/rfqs/components/RfqView';
import { EmdTenderFeeShow } from '@/modules/tendering/emds-tenderfees/components/EmdTenderFeeShow';
import { DocumentChecklistView } from '@/modules/tendering/checklists/components/DocumentChecklistView';
import { CostingSheetView } from '@/modules/tendering/costing-sheets/components/CostingSheetView';
import { BidSubmissionView } from '@/modules/tendering/bid-submissions/components/BidSubmissionView';
import { RaShow } from '@/modules/tendering/ras/components/RaShow';
import { TenderResultShow } from './components/TenderResultShow';

export default function TenderResultShowPage() {
    const { tenderId } = useParams<{ tenderId: string }>();
    const navigate = useNavigate();

    if (!tenderId) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid Result ID.</AlertDescription>
            </Alert>
        );
    }

    const tenderIdNum = Number(tenderId);
    const { data: result, isLoading: resultLoading, error: resultError } = useTenderResultByTenderId(tenderIdNum);
    const reverseAuctionId = result?.reverseAuctionId;
    const raApplicable = result?.raApplicable;

    // Fetch all related tender data
    const { data: tender, isLoading: tenderLoading } = useTender(tenderIdNum);
    const { data: approval, isLoading: approvalLoading } = useTenderApproval(tenderIdNum);
    const { data: infoSheet, isLoading: infoSheetLoading } = useInfoSheet(tenderIdNum);
    const { data: physicalDoc, isLoading: physicalDocLoading } = usePhysicalDocByTenderId(tenderIdNum);
    const { data: rfq, isLoading: rfqLoading } = useRfqByTenderId(tenderIdNum);
    const { data: paymentRequests, isLoading: requestsLoading } = usePaymentRequestsByTender(tenderIdNum);
    const { data: documentChecklist, isLoading: documentChecklistLoading } = useDocumentChecklistByTender(tenderIdNum);
    const { data: costingSheet, isLoading: costingSheetLoading } = useCostingSheetByTender(tenderIdNum);
    const { data: bidSubmission, isLoading: bidSubmissionLoading } = useBidSubmissionByTender(tenderIdNum);

    // Conditionally fetch RA data only if applicable
    const { data: ra, isLoading: raLoading } = useReverseAuction(
        raApplicable && reverseAuctionId ? reverseAuctionId : 0
    );

    const isLoading = resultLoading || tenderLoading || approvalLoading || infoSheetLoading || physicalDocLoading || rfqLoading || requestsLoading || documentChecklistLoading || costingSheetLoading || bidSubmissionLoading || (raApplicable && raLoading);

    if (resultError) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Failed to load result details. Please try again later.
                </AlertDescription>
            </Alert>
        );
    }

    if (resultLoading) {
        return <Skeleton className="h-[800px]" />;
    }

    // Combine tender and approval into TenderWithRelations
    const tenderWithRelations: TenderWithRelations | null = tender
        ? {
            ...tender,
            approval: approval || null,
        }
        : null;

    // Format EMD details from payment requests
    const emdRequest = paymentRequests?.find(req => req.purpose === 'EMD');
    const emdInstrument = emdRequest?.instruments?.find((inst: any) => inst.isActive);
    const emdDetails = tender?.emd ? {
        amount: tender.emd,
        instrumentType: emdInstrument?.instrumentType || null,
        instrumentStatus: emdInstrument?.status || null,
        displayText: emdInstrument
            ? `${emdInstrument.instrumentType} (${emdInstrument.status})`
            : tender.emd ? 'Not Requested' : 'Not Applicable',
    } : null;

    // Combine result data with additional fields for TenderResultShow component
    const resultDataForShow = {
        ...result,
        bidSubmissionDate: bidSubmission?.submissionDatetime || null,
        finalPrice: result?.tenderValue || tender?.gstValues || null,
        resultStatus: result?.status || '',
        emdDetails,
    };

    // Determine number of tabs (8 if no RA, 9 if RA exists)
    const hasRa = raApplicable && reverseAuctionId && ra;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => navigate(paths.tendering.results)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
            </div>
            <Tabs defaultValue="tender-details" className="space-y-4">
                <TabsList className={`grid w-fit ${hasRa ? 'grid-cols-9' : 'grid-cols-8'} gap-2`}>
                    <TabsTrigger value="tender-details">Tender Details</TabsTrigger>
                    <TabsTrigger value="physical-docs">Physical Docs</TabsTrigger>
                    <TabsTrigger value="rfq">RFQ</TabsTrigger>
                    <TabsTrigger value="emds-tenderfees">EMD & Tender Fees</TabsTrigger>
                    <TabsTrigger value="document-checklist">Document Checklist</TabsTrigger>
                    <TabsTrigger value="costing-details">Costing Details</TabsTrigger>
                    <TabsTrigger value="bid-submission">Bid Submission</TabsTrigger>
                    {hasRa && <TabsTrigger value="ra-management">RA Management</TabsTrigger>}
                    <TabsTrigger value="result">Result</TabsTrigger>
                </TabsList>

                {/* Tender Details - Merged Tender, Info Sheet, and Approval */}
                <TabsContent value="tender-details" className="space-y-6">
                    {tenderWithRelations ? (
                        <TenderView
                            tender={tenderWithRelations}
                            isLoading={isLoading}
                        />
                    ) : (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>Tender information not available.</AlertDescription>
                        </Alert>
                    )}
                    <InfoSheetView
                        infoSheet={infoSheet || null}
                        isLoading={infoSheetLoading}
                    />
                    {tenderWithRelations && (
                        <TenderApprovalView
                            tender={tenderWithRelations}
                            isLoading={isLoading}
                        />
                    )}
                </TabsContent>

                {/* Physical Docs */}
                <TabsContent value="physical-docs">
                    <PhysicalDocsView
                        physicalDoc={physicalDoc || null}
                        isLoading={physicalDocLoading}
                    />
                </TabsContent>

                {/* RFQ */}
                <TabsContent value="rfq">
                    <RfqView
                        rfq={Array.isArray(rfq) && rfq.length > 0 ? rfq[0] : null}
                        tender={tender || undefined}
                        isLoading={rfqLoading}
                    />
                </TabsContent>

                {/* EMD & Tender Fees */}
                <TabsContent value="emds-tenderfees">
                    <EmdTenderFeeShow
                        paymentRequests={paymentRequests || null}
                        tender={tender || null}
                        isLoading={requestsLoading}
                    />
                </TabsContent>

                {/* Document Checklist */}
                <TabsContent value="document-checklist">
                    <DocumentChecklistView
                        checklist={documentChecklist || null}
                        isLoading={documentChecklistLoading}
                    />
                </TabsContent>

                {/* Costing Details */}
                <TabsContent value="costing-details">
                    <CostingSheetView
                        costingSheet={costingSheet || null}
                        isLoading={costingSheetLoading}
                    />
                </TabsContent>

                {/* Bid Submission */}
                <TabsContent value="bid-submission">
                    <BidSubmissionView
                        bidSubmission={bidSubmission || null}
                        isLoading={bidSubmissionLoading}
                    />
                </TabsContent>

                {/* RA Management - Conditional */}
                {hasRa && (
                    <TabsContent value="ra-management">
                        <RaShow
                            ra={ra as any}
                            isLoading={raLoading}
                        />
                    </TabsContent>
                )}

                {/* Result */}
                <TabsContent value="result">
                    <TenderResultShow
                        result={resultDataForShow as any}
                        isLoading={resultLoading}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
