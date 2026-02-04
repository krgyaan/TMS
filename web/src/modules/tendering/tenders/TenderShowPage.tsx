import { useParams, useNavigate } from "react-router-dom";
import { useTender } from "@/hooks/api/useTenders";
import { useTenderApproval } from "@/hooks/api/useTenderApprovals";
import { useInfoSheet } from "@/hooks/api/useInfoSheets";
import { useRfqByTenderId } from "@/hooks/api/useRfqs";
import { usePhysicalDocByTenderId } from "@/hooks/api/usePhysicalDocs";
import { usePaymentRequestsByTender } from "@/hooks/api/useEmds";
import { useDocumentChecklistByTender } from "@/hooks/api/useDocumentChecklists";
import { useCostingSheetByTender } from "@/hooks/api/useCostingSheets";
import { useBidSubmissionByTender } from "@/hooks/api/useBidSubmissions";
import { useTenderResultByTenderId, type ResultDashboardRow } from "@/hooks/api/useTenderResults";
import { TenderView } from "@/modules/tendering/tenders/components/TenderView";
import { InfoSheetView } from "@/modules/tendering/info-sheet/components/InfoSheetView";
import { TenderApprovalView } from "@/modules/tendering/tender-approval/components/TenderApprovalView";
import { RfqView } from "@/modules/tendering/rfqs/components/RfqView";
import { PhysicalDocsView } from "@/modules/tendering/physical-docs/components/PhysicalDocsView";
import { EmdTenderFeeShow } from "@/modules/tendering/emds-tenderfees/components/EmdTenderFeeShow";
import { DocumentChecklistView } from "@/modules/tendering/checklists/components/DocumentChecklistView";
import { CostingSheetView } from "@/modules/tendering/costing-sheets/components/CostingSheetView";
import { BidSubmissionView } from "@/modules/tendering/bid-submissions/components/BidSubmissionView";
import { TenderResultShow } from "@/modules/tendering/results/components/TenderResultShow";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { paths } from "@/app/routes/paths";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TenderWithRelations } from "@/modules/tendering/tenders/helpers/tenderInfo.types";

export default function TenderShowPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const parsedId = id ? Number(id) : NaN;
    const tenderId = Number.isNaN(parsedId) ? null : parsedId;

    // Fetch all data
    const { data: tender, isLoading } = useTender(tenderId);
    const { data: approval, isLoading: approvalLoading } = useTenderApproval(tenderId);
    const { data: infoSheet, isLoading: infoSheetLoading, error: infoSheetError } = useInfoSheet(tenderId);
    const { data: rfq, isLoading: rfqLoading } = useRfqByTenderId(tenderId);
    const { data: physicalDoc, isLoading: physicalDocLoading } = usePhysicalDocByTenderId(tenderId);
    const { data: paymentRequests, isLoading: paymentRequestsLoading } = usePaymentRequestsByTender(tenderId);
    const { data: checklist, isLoading: checklistLoading } = useDocumentChecklistByTender(tenderId ?? 0);
    const { data: costingSheet, isLoading: costingSheetLoading } = useCostingSheetByTender(tenderId ?? 0);
    const { data: bidSubmission, isLoading: bidSubmissionLoading } = useBidSubmissionByTender(tenderId ?? 0);
    const { data: tenderResult, isLoading: resultLoading } = useTenderResultByTenderId(tenderId);

    // Combine tender and approval into TenderWithRelations
    const tenderWithRelations: TenderWithRelations | null = tender
        ? {
            ...tender,
            approval: approval || null,
        }
        : null;

    // Determine which tabs have data
    const hasRfq = !rfqLoading && !!rfq;
    const hasPhysicalDoc = !physicalDocLoading && !!physicalDoc;
    const hasPaymentRequests = !paymentRequestsLoading && paymentRequests && paymentRequests.length > 0;
    const hasChecklist = !checklistLoading && !!checklist;
    const hasCostingSheet = !costingSheetLoading && !!costingSheet;
    const hasBidSubmission = !bidSubmissionLoading && !!bidSubmission;
    const hasTenderResult = !resultLoading && !!tenderResult;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => navigate(paths.tendering.tenders)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
            </div>
            <Tabs defaultValue="tender-details" className="space-y-4">
                <TabsList className="grid w-fit grid-cols-8">
                    <TabsTrigger value="tender-details">Tender Details</TabsTrigger>
                    <TabsTrigger value="physical-docs" disabled={!hasPhysicalDoc && !physicalDocLoading}>
                        Physical Docs
                    </TabsTrigger>
                    <TabsTrigger value="rfq" disabled={!hasRfq && !rfqLoading}>
                        RFQ
                    </TabsTrigger>
                    <TabsTrigger value="emd-fees" disabled={!hasPaymentRequests && !paymentRequestsLoading}>
                        EMD
                    </TabsTrigger>
                    <TabsTrigger value="checklist" disabled={!hasChecklist && !checklistLoading}>
                        Checklist
                    </TabsTrigger>
                    <TabsTrigger value="costing" disabled={!hasCostingSheet && !costingSheetLoading}>
                        Costing
                    </TabsTrigger>
                    <TabsTrigger value="bid" disabled={!hasBidSubmission && !bidSubmissionLoading}>
                        Bid Submission
                    </TabsTrigger>
                    <TabsTrigger value="result" disabled={!hasTenderResult && !resultLoading}>
                        Result
                    </TabsTrigger>
                </TabsList>

                {/* Tender Details - Merged Tender, Info Sheet, and Approval */}
                <TabsContent value="tender-details" className="space-y-6">
                    {tenderWithRelations ? (
                        <TenderView
                            tender={tenderWithRelations}
                            isLoading={isLoading || approvalLoading}
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
                    ) : infoSheetError ? (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Failed to load info sheet details. Please try again later.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                No info sheet exists for this tender yet.
                            </AlertDescription>
                        </Alert>
                    )}
                    {tenderWithRelations && (
                        <TenderApprovalView
                            tender={tenderWithRelations}
                            isLoading={isLoading || approvalLoading}
                        />
                    )}
                </TabsContent>

                {/* RFQ */}
                <TabsContent value="rfq">
                    {rfqLoading ? (
                        <RfqView rfq={{} as any} isLoading />
                    ) : rfq ? (
                        <RfqView
                            rfq={rfq}
                            tender={tender ?? undefined}
                        />
                    ) : (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                No RFQ exists for this tender yet.
                                <Button className="mt-4" onClick={() => navigate(paths.tendering.rfqsCreate(tenderId!))}>
                                    Create RFQ
                                </Button>
                            </AlertDescription>
                        </Alert>
                    )}
                </TabsContent>

                {/* Physical Docs */}
                <TabsContent value="physical-docs">
                    {physicalDocLoading ? (
                        <PhysicalDocsView physicalDoc={null} isLoading />
                    ) : physicalDoc ? (
                        <PhysicalDocsView physicalDoc={physicalDoc} />
                    ) : (
                        <PhysicalDocsView physicalDoc={null} />
                    )}
                </TabsContent>

                {/* EMD/Tender Fees */}
                <TabsContent value="emd-fees">
                    {paymentRequestsLoading ? (
                        <EmdTenderFeeShow paymentRequests={null} isLoading />
                    ) : paymentRequests && paymentRequests.length > 0 ? (
                        <EmdTenderFeeShow
                            paymentRequests={paymentRequests}
                            tender={tender ?? null}
                        />
                    ) : (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                No payment requests available for this tender yet.
                                <Button className="mt-4" onClick={() => navigate(paths.tendering.emdsTenderFeesCreate(tenderId!))}>
                                    Create Payment Request
                                </Button>
                            </AlertDescription>
                        </Alert>
                    )}
                </TabsContent>

                {/* Document Checklist */}
                <TabsContent value="checklist">
                    {checklistLoading ? (
                        <DocumentChecklistView checklist={null} isLoading />
                    ) : checklist ? (
                        <DocumentChecklistView checklist={checklist} />
                    ) : (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                No document checklist exists for this tender yet.
                                <Button className="mt-4" onClick={() => navigate(paths.tendering.documentChecklistCreate(tenderId!))}>
                                    Create Checklist
                                </Button>
                            </AlertDescription>
                        </Alert>
                    )}
                </TabsContent>

                {/* Costing Sheet */}
                <TabsContent value="costing">
                    {costingSheetLoading ? (
                        <CostingSheetView costingSheet={null} isLoading />
                    ) : costingSheet ? (
                        <CostingSheetView costingSheet={costingSheet} />
                    ) : (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                No costing sheet exists for this tender yet.
                                <Button className="mt-4" onClick={() => navigate(paths.tendering.costingSheetSubmit(tenderId!))}>
                                    Submit Costing Sheet
                                </Button>
                            </AlertDescription>
                        </Alert>
                    )}
                </TabsContent>

                {/* Bid Submission */}
                <TabsContent value="bid">
                    {bidSubmissionLoading ? (
                        <BidSubmissionView bidSubmission={null} isLoading />
                    ) : bidSubmission ? (
                        <BidSubmissionView bidSubmission={bidSubmission} />
                    ) : (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                No bid submission exists for this tender yet.
                                <Button className="mt-4" onClick={() => navigate(paths.tendering.bidSubmit(tenderId!))}>
                                    Submit Bid
                                </Button>
                            </AlertDescription>
                        </Alert>
                    )}
                </TabsContent>

                {/* Result */}
                <TabsContent value="result">
                    {resultLoading ? (
                        <TenderResultShow result={{} as ResultDashboardRow} isLoading />
                    ) : tenderResult ? (
                        <TenderResultShow result={tenderResult as any} />
                    ) : (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                No result available for this tender yet.
                                <Button className="mt-4" onClick={() => navigate(paths.tendering.resultsUpload(tenderId!))}>
                                    Upload Result
                                </Button>
                            </AlertDescription>
                        </Alert>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
