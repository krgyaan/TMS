import { useParams, useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTqById, useTqItems } from '@/hooks/api/useTqManagement';
import { useTender } from '@/hooks/api/useTenders';
import { useTenderApproval } from '@/hooks/api/useTenderApprovals';
import { useInfoSheet } from '@/hooks/api/useInfoSheets';
import { usePhysicalDocByTenderId } from '@/hooks/api/usePhysicalDocs';
import { usePaymentRequestsByTender } from '@/hooks/api/useEmds';
import { useDocumentChecklistByTender } from '@/hooks/api/useDocumentChecklists';
import { useCostingSheetByTender } from '@/hooks/api/useCostingSheets';
import { useBidSubmissionByTender } from '@/hooks/api/useBidSubmissions';
import { useTqTypes } from '@/hooks/api/useTqTypes';
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
import { TqView } from './components/TqView';

export default function TqViewPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    if (!id) {
        return <div>Invalid TQ ID</div>;
    }

    const tqId = Number(id);
    const { data: tqData, isLoading: tqLoading, error: tqError } = useTqById(tqId);
    const tenderId = tqData?.tenderId;

    // Fetch all related tender data
    const { data: tender, isLoading: tenderLoading } = useTender(tenderId!);
    const { data: approval, isLoading: approvalLoading } = useTenderApproval(tenderId!);
    const { data: infoSheet, isLoading: infoSheetLoading } = useInfoSheet(tenderId!);
    const { data: physicalDoc, isLoading: physicalDocLoading } = usePhysicalDocByTenderId(tenderId!);
    const { data: paymentRequests, isLoading: requestsLoading } = usePaymentRequestsByTender(tenderId!);
    const { data: documentChecklist, isLoading: documentChecklistLoading } = useDocumentChecklistByTender(tenderId!);
    const { data: costingSheet, isLoading: costingSheetLoading } = useCostingSheetByTender(tenderId!);
    const { data: bidSubmission, isLoading: bidSubmissionLoading } = useBidSubmissionByTender(tenderId!);
    const { data: tqItems, isLoading: itemsLoading } = useTqItems(tqId);
    const { data: tqTypes } = useTqTypes();

    const isLoading = tqLoading || tenderLoading || approvalLoading || infoSheetLoading || physicalDocLoading || requestsLoading || documentChecklistLoading || costingSheetLoading || bidSubmissionLoading || itemsLoading;

    if (tqError) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Failed to load TQ details. Please try again later.
                </AlertDescription>
            </Alert>
        );
    }

    if (tqLoading) {
        return <Skeleton className="h-[800px]" />;
    }

    if (!tqData) {
        return <div>TQ not found</div>;
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
                <Button variant="outline" onClick={() => navigate(paths.tendering.tqManagement)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
            </div>
            <Tabs defaultValue="tender-details" className="space-y-4">
                <TabsList className="grid w-fit grid-cols-7 gap-2">
                    <TabsTrigger value="tender-details">Tender Details</TabsTrigger>
                    <TabsTrigger value="physical-docs">Physical Docs</TabsTrigger>
                    <TabsTrigger value="emds-tenderfees">EMD & Tender Fees</TabsTrigger>
                    <TabsTrigger value="document-checklist">Document Checklist</TabsTrigger>
                    <TabsTrigger value="costing-details">Costing Details</TabsTrigger>
                    <TabsTrigger value="bid-submission">Bid Submission</TabsTrigger>
                    <TabsTrigger value="tq-management">TQ Management</TabsTrigger>
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

                {/* TQ Management */}
                <TabsContent value="tq-management">
                    <TqView
                        tqData={tqData}
                        tqItems={tqItems || null}
                        tqTypes={tqTypes || null}
                        isLoading={tqLoading || itemsLoading}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
