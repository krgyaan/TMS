import { useParams, useNavigate } from "react-router-dom";
import { useTender } from "@/hooks/api/useTenders";
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
import { RfqView } from "@/modules/tendering/rfqs/components/RfqView";
import { PhysicalDocsView } from "@/modules/tendering/physical-docs/components/PhysicalDocsView";
import { EmdTenderFeeShow } from "@/modules/tendering/emds-tenderfees/components/EmdTenderFeeShow";
import { DocumentChecklistView } from "@/modules/tendering/checklists/components/DocumentChecklistView";
import { CostingSheetView } from "@/modules/tendering/costing-sheets/components/CostingSheetView";
import { BidSubmissionView } from "@/modules/tendering/bid-submissions/components/BidSubmissionView";
import { TenderResultShow } from "@/modules/tendering/results/components/TenderResultShow";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { paths } from "@/app/routes/paths";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TenderShowPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const parsedId = id ? Number(id) : NaN;
    const tenderId = Number.isNaN(parsedId) ? null : parsedId;

    // Fetch all data
    const { data: tender, isLoading } = useTender(tenderId);
    const { data: infoSheet, isLoading: infoSheetLoading, error: infoSheetError } = useInfoSheet(tenderId);
    const { data: rfq, isLoading: rfqLoading } = useRfqByTenderId(tenderId);
    const { data: physicalDoc, isLoading: physicalDocLoading } = usePhysicalDocByTenderId(tenderId);
    const { data: paymentRequests, isLoading: paymentRequestsLoading } = usePaymentRequestsByTender(tenderId);
    const { data: checklist, isLoading: checklistLoading } = useDocumentChecklistByTender(tenderId ?? 0);
    const { data: costingSheet, isLoading: costingSheetLoading } = useCostingSheetByTender(tenderId ?? 0);
    const { data: bidSubmission, isLoading: bidSubmissionLoading } = useBidSubmissionByTender(tenderId ?? 0);
    const { data: tenderResult, isLoading: resultLoading } = useTenderResultByTenderId(tenderId);

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
            <Tabs defaultValue="tender" className="space-y-4">
                <TabsList className="grid w-full md:grid-cols-5 lg:grid-cols-8 gap-2">
                    <TabsTrigger value="tender">Tender Details</TabsTrigger>
                    <TabsTrigger value="physical-docs" disabled={!hasPhysicalDoc && !physicalDocLoading}>
                        Physical Docs
                    </TabsTrigger>
                    <TabsTrigger value="rfq" disabled={!hasRfq && !rfqLoading}>
                        RFQ & Response
                    </TabsTrigger>
                    <TabsTrigger value="emd-fees" disabled={!hasPaymentRequests && !paymentRequestsLoading}>
                        EMD/Tender Fees
                    </TabsTrigger>
                    <TabsTrigger value="checklist" disabled={!hasChecklist && !checklistLoading}>
                        Checklist
                    </TabsTrigger>
                    <TabsTrigger value="costing" disabled={!hasCostingSheet && !costingSheetLoading}>
                        Costing Sheet/Approval
                    </TabsTrigger>
                    <TabsTrigger value="bid" disabled={!hasBidSubmission && !bidSubmissionLoading}>
                        Bid Submission
                    </TabsTrigger>
                    <TabsTrigger value="result" disabled={!hasTenderResult && !resultLoading}>
                        Tender Result
                    </TabsTrigger>
                </TabsList>

                {/* Tender Details */}
                <TabsContent value="tender">
                    <TenderView
                        tender={tender!}
                        isLoading={isLoading}
                        showEditButton
                        showBackButton={false}
                        onEdit={() => navigate(paths.tendering.tenderEdit(tenderId!))}
                        onBack={() => navigate(paths.tendering.tenders)}
                    />
                    {infoSheetLoading ? (
                        <InfoSheetView isLoading />
                    ) : infoSheet ? (
                        <InfoSheetView
                            infoSheet={infoSheet}
                            onEdit={() => navigate(paths.tendering.infoSheetEdit(tenderId!))}
                        />
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
                </TabsContent>

                {/* RFQ */}
                <TabsContent value="rfq">
                    {rfqLoading ? (
                        <RfqView rfq={{} as any} isLoading />
                    ) : rfq ? (
                        <RfqView
                            rfq={rfq}
                            tender={tender ?? undefined}
                            onEdit={() => navigate(paths.tendering.rfqsEdit(tenderId!))}
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
                        <PhysicalDocsView
                            physicalDoc={physicalDoc}
                            onEdit={() => navigate(paths.tendering.physicalDocsEdit(tenderId!))}
                        />
                    ) : (
                        <PhysicalDocsView
                            physicalDoc={null}
                            onEdit={() => navigate(paths.tendering.physicalDocsCreate(tenderId!))}
                        />
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
                            onEdit={() => navigate(paths.tendering.emdsTenderFeesEdit(tenderId!))}
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
                        <DocumentChecklistView
                            checklist={checklist}
                            onEdit={() => navigate(paths.tendering.documentChecklistEdit(tenderId!))}
                        />
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
                        <CostingSheetView
                            costingSheet={costingSheet}
                            onEdit={() => navigate(paths.tendering.costingSheetEdit(tenderId!))}
                        />
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
                        <BidSubmissionView
                            bidSubmission={bidSubmission}
                            onEdit={() => {
                                if (bidSubmission.status === 'Tender Missed') {
                                    navigate(paths.tendering.bidEditMissed(bidSubmission.id));
                                } else {
                                    navigate(paths.tendering.bidEdit(bidSubmission.id));
                                }
                            }}
                        />
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
                        <TenderResultShow
                            result={tenderResult as any}
                            onEdit={() => {
                                // Result edit uses tender ID
                                if (tenderId) {
                                    navigate(paths.tendering.resultsEdit(tenderId));
                                }
                            }}
                        />
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
