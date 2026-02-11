import { useParams, useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTender } from "@/hooks/api/useTenders";
import { useTenderApproval } from "@/hooks/api/useTenderApprovals";
import { useInfoSheet } from "@/hooks/api/useInfoSheets";
import { usePhysicalDocByTenderId } from "@/hooks/api/usePhysicalDocs";
import { useRfqByTenderId } from "@/hooks/api/useRfqs";
import { usePaymentRequestsByTender } from "@/hooks/api/useEmds";
import { useDocumentChecklistByTender } from "@/hooks/api/useDocumentChecklists";
import { useCostingSheetByTender } from "@/hooks/api/useCostingSheets";
import { useBidSubmissionByTender } from "@/hooks/api/useBidSubmissions";
import { paths } from "@/app/routes/paths";
import type { TenderWithRelations } from "@/modules/tendering/tenders/helpers/tenderInfo.types";
import { TenderView } from "@/modules/tendering/tenders/components/TenderView";
import { InfoSheetView } from "@/modules/tendering/info-sheet/components/InfoSheetView";
import { TenderApprovalView } from "@/modules/tendering/tender-approval/components/TenderApprovalView";
import { PhysicalDocsView } from "@/modules/tendering/physical-docs/components/PhysicalDocsView";
import { RfqView } from "@/modules/tendering/rfqs/components/RfqView";
import { EmdTenderFeeShow } from "@/modules/tendering/emds-tenderfees/components/EmdTenderFeeShow";
import { DocumentChecklistView } from "@/modules/tendering/checklists/components/DocumentChecklistView";
import { CostingSheetView } from "./components/CostingSheetView";
import { BidSubmissionView } from "@/modules/tendering/bid-submissions/components/BidSubmissionView";

export default function CostingSheetShowPage() {
    const { tenderId: tenderIdParam } = useParams<{ tenderId: string }>();
    const navigate = useNavigate();

    if (!tenderIdParam) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid Tender ID.</AlertDescription>
            </Alert>
        );
    }

    const tenderId = Number(tenderIdParam);
    const { data: tender, isLoading: tenderLoading, error: tenderError } = useTender(tenderId);
    const { data: approval, isLoading: approvalLoading } = useTenderApproval(tenderId);
    const { data: infoSheet, isLoading: infoSheetLoading } = useInfoSheet(tenderId);
    const { data: physicalDoc, isLoading: physicalDocLoading } = usePhysicalDocByTenderId(tenderId);
    const { data: rfq, isLoading: rfqLoading } = useRfqByTenderId(tenderId);
    const { data: paymentRequests, isLoading: requestsLoading } = usePaymentRequestsByTender(tenderId);
    const { data: documentChecklist, isLoading: documentChecklistLoading } = useDocumentChecklistByTender(tenderId);
    const { data: costingSheet, isLoading: costingSheetLoading } = useCostingSheetByTender(tenderId);
    const { data: bidSubmission, isLoading: bidSubmissionLoading } = useBidSubmissionByTender(tenderId);

    const isLoading = tenderLoading || approvalLoading || costingSheetLoading;

    if (tenderError || (!tenderLoading && !tender)) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Tender not found or failed to load.
                    <Button
                        variant="outline"
                        size="sm"
                        className="ml-4"
                        onClick={() => navigate(paths.tendering.costingSheets)}
                    >
                        Back to List
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    if (isLoading) {
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
                <Button variant="outline" onClick={() => navigate(paths.tendering.costingSheets)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
            </div>
            <Tabs defaultValue="tender-details" className="space-y-4">
                <TabsList className="grid w-fit grid-cols-7 gap-2">
                    <TabsTrigger value="tender-details">Tender Details</TabsTrigger>
                    <TabsTrigger value="physical-docs">Physical Docs</TabsTrigger>
                    <TabsTrigger value="rfq">RFQ</TabsTrigger>
                    <TabsTrigger value="emds-tenderfees">EMD & Tender Fees</TabsTrigger>
                    <TabsTrigger value="document-checklist">Document Checklist</TabsTrigger>
                    <TabsTrigger value="costing-details">Costing Details</TabsTrigger>
                    <TabsTrigger value="bid-submission">Bid Submission</TabsTrigger>
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
            </Tabs>
        </div>
    );
}
