import { useParams, useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useReverseAuctionByTender } from '@/hooks/api/useReverseAuctions';
import { useTender } from '@/hooks/api/useTenders';
import { useTenderApproval } from '@/hooks/api/useTenderApprovals';
import { useInfoSheet } from '@/hooks/api/useInfoSheets';
import { usePhysicalDocByTenderId } from '@/hooks/api/usePhysicalDocs';
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
import { EmdTenderFeeShow } from '@/modules/tendering/emds-tenderfees/components/EmdTenderFeeShow';
import { DocumentChecklistView } from '@/modules/tendering/checklists/components/DocumentChecklistView';
import { CostingSheetView } from '@/modules/tendering/costing-sheets/components/CostingSheetView';
import { BidSubmissionView } from '@/modules/tendering/bid-submissions/components/BidSubmissionView';
import { RaShow } from './components/RaShow';

export default function RaShowPage() {
    const { tenderId } = useParams<{ tenderId: string }>();
    const navigate = useNavigate();

    if (!tenderId) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid Tender ID.</AlertDescription>
            </Alert>
        );
    }

    const tenderIdNum = Number(tenderId);
    const { data: ra, isLoading: raLoading, error: raError } = useReverseAuctionByTender(tenderIdNum);

    // Fetch all related tender data
    const { data: tender, isLoading: tenderLoading } = useTender(tenderIdNum);
    const { data: approval, isLoading: approvalLoading } = useTenderApproval(tenderIdNum);
    const { data: infoSheet, isLoading: infoSheetLoading } = useInfoSheet(tenderIdNum);
    const { data: physicalDoc, isLoading: physicalDocLoading } = usePhysicalDocByTenderId(tenderIdNum);
    const { data: paymentRequests, isLoading: requestsLoading } = usePaymentRequestsByTender(tenderIdNum);
    const { data: documentChecklist, isLoading: documentChecklistLoading } = useDocumentChecklistByTender(tenderIdNum);
    const { data: costingSheet, isLoading: costingSheetLoading } = useCostingSheetByTender(tenderIdNum);
    const { data: bidSubmission, isLoading: bidSubmissionLoading } = useBidSubmissionByTender(tenderIdNum);

    const isLoading = raLoading || tenderLoading || approvalLoading || infoSheetLoading || physicalDocLoading || requestsLoading || documentChecklistLoading || costingSheetLoading || bidSubmissionLoading;

    if (raError) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Failed to load reverse auction details. Please try again later.
                </AlertDescription>
            </Alert>
        );
    }

    if (raLoading) {
        return <Skeleton className="h-[800px]" />;
    }

    // Combine tender and approval into TenderWithRelations
    const tenderWithRelations: TenderWithRelations | null = tender
        ? {
            ...tender,
            approval: approval || null,
        }
        : null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => navigate(paths.tendering.ras)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
            </div>
            <Tabs defaultValue="tender-details" className="space-y-4">
                <TabsList className="grid w-fit grid-cols-7 gap-2">
                    <TabsTrigger value="tender-details">Tender Details</TabsTrigger>
                    <TabsTrigger value="physical-docs">Physical Docs</TabsTrigger>
                    <TabsTrigger value="emds-tenderfees">EMD</TabsTrigger>
                    <TabsTrigger value="document-checklist">Checklist</TabsTrigger>
                    <TabsTrigger value="costing-details">Costing</TabsTrigger>
                    <TabsTrigger value="bid-submission">Bid Submission</TabsTrigger>
                    <TabsTrigger value="ra-management">Reverse Auction</TabsTrigger>
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
                    {infoSheetLoading ? (
                        <InfoSheetView isLoading />
                    ) : infoSheet ? (
                        <InfoSheetView infoSheet={infoSheet} />
                    ) : (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>No info sheet exists for this tender yet.</AlertDescription>
                        </Alert>
                    )}
                    {tenderWithRelations && (
                        <TenderApprovalView
                            tender={tenderWithRelations}
                            isLoading={isLoading}
                        />
                    )}
                </TabsContent>

                {/* Physical Docs */}
                <TabsContent value="physical-docs">
                    {physicalDocLoading ? (
                        <PhysicalDocsView isLoading={true} physicalDoc={null} />
                    ) : physicalDoc ? (
                        <PhysicalDocsView physicalDoc={physicalDoc} />
                    ) : (
                        <PhysicalDocsView isLoading={false} physicalDoc={null} />
                    )}
                </TabsContent>

                {/* EMD & Tender Fees */}
                <TabsContent value="emds-tenderfees">
                    <EmdTenderFeeShow
                        paymentRequests={paymentRequests || null}
                        tender={tender || null}
                        isLoading={isLoading}
                    />
                </TabsContent>

                {/* Document Checklist */}
                <TabsContent value="document-checklist">
                    <DocumentChecklistView
                        checklist={documentChecklist}
                        isLoading={documentChecklistLoading}
                    />
                </TabsContent>

                {/* Costing Details */}
                <TabsContent value="costing-details">
                    <CostingSheetView
                        costingSheet={costingSheet}
                        isLoading={isLoading}
                    />
                </TabsContent>

                {/* Bid Submission */}
                <TabsContent value="bid-submission">
                    {bidSubmissionLoading ? (
                        <BidSubmissionView bidSubmission={null} isLoading />
                    ) : bidSubmission ? (
                        <BidSubmissionView bidSubmission={bidSubmission} />
                    ) : (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>No bid submission exists for this tender yet.</AlertDescription>
                        </Alert>
                    )}
                </TabsContent>

                {/* RA Management */}
                <TabsContent value="ra-management">
                    <RaShow
                        ra={ra as any}
                        isLoading={raLoading}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
