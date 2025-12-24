import { useParams, useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTenderResult } from '@/hooks/api/useTenderResults';
import { useReverseAuction } from '@/hooks/api/useReverseAuctions';
import { useTender } from '@/hooks/api/useTenders';
import { useTenderApproval } from '@/hooks/api/useTenderApprovals';
import { useInfoSheet } from '@/hooks/api/useInfoSheets';
import { usePhysicalDocByTenderId } from '@/hooks/api/usePhysicalDocs';
import { usePaymentRequestsByTender } from '@/hooks/api/useEmds';
import { useDocumentChecklistByTender } from '@/hooks/api/useDocumentChecklists';
import { useCostingSheetByTender } from '@/hooks/api/useCostingSheets';
import { useBidSubmissionByTender } from '@/hooks/api/useBidSubmissions';
import { paths } from '@/app/routes/paths';
import type { TenderWithRelations } from '@/types/api.types';
import { TenderView } from '@/modules/tendering/tenders/components/TenderView';
import { InfoSheetView } from '@/modules/tendering/info-sheet/components/InfoSheetView';
import { TenderApprovalView } from '@/modules/tendering/tender-approval/components/TenderApprovalView';
import { PhysicalDocsView } from '@/modules/tendering/physical-docs/components/PhysicalDocsView';
import { EmdTenderFeeShow } from '@/modules/tendering/emds-tenderfees/components/EmdTenderFeeShow';
import { DocumentChecklistView } from '@/modules/tendering/checklists/components/DocumentChecklistView';
import { CostingSheetView } from '@/modules/tendering/costing-sheets/components/CostingSheetView';
import { BidSubmissionView } from '@/modules/tendering/bid-submissions/components/BidSubmissionView';
import { RaShow } from '@/modules/tendering/ras/components/RaShow';
import { TenderResultShow } from './components/TenderResultShow';

export default function TenderResultShowPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    if (!id) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid Result ID.</AlertDescription>
            </Alert>
        );
    }

    const resultId = Number(id);
    const { data: result, isLoading: resultLoading, error: resultError } = useTenderResult(resultId);
    const tenderId = result?.tenderId;
    const reverseAuctionId = result?.reverseAuctionId;
    const raApplicable = result?.raApplicable;

    // Fetch all related tender data
    const { data: tender, isLoading: tenderLoading } = useTender(tenderId!);
    const { data: approval, isLoading: approvalLoading } = useTenderApproval(tenderId!);
    const { data: infoSheet, isLoading: infoSheetLoading } = useInfoSheet(tenderId!);
    const { data: physicalDoc, isLoading: physicalDocLoading } = usePhysicalDocByTenderId(tenderId!);
    const { data: paymentRequests, isLoading: requestsLoading } = usePaymentRequestsByTender(tenderId!);
    const { data: documentChecklist, isLoading: documentChecklistLoading } = useDocumentChecklistByTender(tenderId!);
    const { data: costingSheet, isLoading: costingSheetLoading } = useCostingSheetByTender(tenderId!);
    const { data: bidSubmission, isLoading: bidSubmissionLoading } = useBidSubmissionByTender(tenderId!);

    // Conditionally fetch RA data only if applicable
    const { data: ra, isLoading: raLoading } = useReverseAuction(
        raApplicable && reverseAuctionId ? reverseAuctionId : 0
    );

    const isLoading = resultLoading || tenderLoading || approvalLoading || infoSheetLoading || physicalDocLoading || requestsLoading || documentChecklistLoading || costingSheetLoading || bidSubmissionLoading || (raApplicable && raLoading);

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

    if (!result) {
        return <div>Result not found</div>;
    }

    // Combine tender and approval into TenderWithRelations
    const tenderWithRelations: TenderWithRelations | null = tender
        ? {
              ...tender,
              approval: approval || null,
          }
        : null;

    // Determine number of tabs (9 if no RA, 10 if RA exists)
    const hasRa = raApplicable && reverseAuctionId && ra;

    return (
        <div className="space-y-6">
            <Tabs defaultValue="result" className="space-y-4">
                <TabsList className={`grid w-fit ${hasRa ? 'grid-cols-10' : 'grid-cols-9'} gap-2`}>
                    <TabsTrigger value="tender">Tender</TabsTrigger>
                    <TabsTrigger value="info-sheet">Info Sheet</TabsTrigger>
                    <TabsTrigger value="approval">Tender Approval</TabsTrigger>
                    <TabsTrigger value="physical-docs">Physical Docs</TabsTrigger>
                    <TabsTrigger value="emds-tenderfees">EMD & Tender Fees</TabsTrigger>
                    <TabsTrigger value="document-checklist">Document Checklist</TabsTrigger>
                    <TabsTrigger value="costing-details">Costing Details</TabsTrigger>
                    <TabsTrigger value="bid-submission">Bid Submission</TabsTrigger>
                    {hasRa && <TabsTrigger value="ra-management">RA Management</TabsTrigger>}
                    <TabsTrigger value="result">Result</TabsTrigger>
                </TabsList>

                {/* Tender */}
                <TabsContent value="tender">
                    {tenderWithRelations ? (
                        <TenderView
                            tender={tenderWithRelations}
                            isLoading={isLoading}
                            showEditButton={false}
                            showBackButton={false}
                        />
                    ) : (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>Tender information not available.</AlertDescription>
                        </Alert>
                    )}
                </TabsContent>

                {/* Info Sheet */}
                <TabsContent value="info-sheet">
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
                </TabsContent>

                {/* Tender Approval */}
                <TabsContent value="approval">
                    {tenderWithRelations ? (
                        <TenderApprovalView
                            tender={tenderWithRelations}
                            isLoading={isLoading}
                            showEditButton={false}
                            showBackButton={false}
                        />
                    ) : (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>Tender approval information not available.</AlertDescription>
                        </Alert>
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
                        showEditButton={false}
                        showBackButton={false}
                    />
                </TabsContent>

                {/* Costing Details */}
                <TabsContent value="costing-details">
                    <CostingSheetView
                        costingSheet={costingSheet}
                        isLoading={isLoading}
                        showEditButton={false}
                        showBackButton={false}
                    />
                </TabsContent>

                {/* Bid Submission */}
                <TabsContent value="bid-submission">
                    {bidSubmissionLoading ? (
                        <BidSubmissionView bidSubmission={null} isLoading />
                    ) : bidSubmission ? (
                        <BidSubmissionView
                            bidSubmission={bidSubmission}
                            showEditButton={false}
                            showBackButton={false}
                        />
                    ) : (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>No bid submission exists for this tender yet.</AlertDescription>
                        </Alert>
                    )}
                </TabsContent>

                {/* RA Management - Conditional */}
                {hasRa && (
                    <TabsContent value="ra-management">
                        <RaShow
                            ra={ra as any}
                            isLoading={raLoading}
                            showEditButton={false}
                            showBackButton={false}
                        />
                    </TabsContent>
                )}

                {/* Result */}
                <TabsContent value="result">
                    <TenderResultShow
                        result={result as any}
                        isLoading={resultLoading}
                        showEditButton={true}
                        showBackButton={true}
                        onEdit={() => navigate(paths.tendering.resultsEdit(resultId))}
                        onBack={() => navigate(paths.tendering.results)}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
