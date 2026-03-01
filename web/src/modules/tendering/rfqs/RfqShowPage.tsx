import { useNavigate, useParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, List, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTender } from '@/hooks/api/useTenders';
import { useTenderApproval } from '@/hooks/api/useTenderApprovals';
import { useInfoSheet } from '@/hooks/api/useInfoSheets';
import { usePhysicalDocByTenderId } from '@/hooks/api/usePhysicalDocs';
import { useRfqByTenderId } from '@/hooks/api/useRfqs';
import { useRfqResponses } from '@/hooks/api/useRfqResponses';
import { usePaymentRequestsByTender } from '@/hooks/api/useEmds';
import { useDocumentChecklistByTender } from '@/hooks/api/useDocumentChecklists';
import { useCostingSheetByTender } from '@/hooks/api/useCostingSheets';
import { useBidSubmissionByTender } from '@/hooks/api/useBidSubmissions';
import { paths } from "@/app/routes/paths";
import { TenderView } from '@/modules/tendering/tenders/components/TenderView';
import { InfoSheetView } from '@/modules/tendering/info-sheet/components/InfoSheetView';
import { TenderApprovalView } from '@/modules/tendering/tender-approval/components/TenderApprovalView';
import { PhysicalDocsView } from '@/modules/tendering/physical-docs/components/PhysicalDocsView';
import { RfqView } from './components/RfqView';
import { RfqResponseDetailAccordion } from '@/modules/tendering/rfq-response/components/RfqResponseDetailAccordion';
import { EmdTenderFeeShow } from '@/modules/tendering/emds-tenderfees/components/EmdTenderFeeShow';
import { DocumentChecklistView } from '@/modules/tendering/checklists/components/DocumentChecklistView';
import { CostingSheetView } from '@/modules/tendering/costing-sheets/components/CostingSheetView';
import { BidSubmissionView } from '@/modules/tendering/bid-submissions/components/BidSubmissionView';
import type { TenderWithRelations, TenderInfoWithNames } from '@/modules/tendering/tenders/helpers/tenderInfo.types';
import type { Rfq } from '@/modules/tendering/rfqs/helpers/rfq.types';

// Local component to stack RfqView and RfqResponsesTable per RFQ
function RfqItemWithResponses({ rfq, tender }: { rfq: Rfq; tender?: TenderInfoWithNames }) {
    const navigate = useNavigate();
    const { data: rfqResponses = [], isLoading: rfqResponsesLoading } = useRfqResponses(rfq.id);

    return (
        <div className="space-y-3 mb-8 last:mb-0">
            <RfqView
                rfq={rfq}
                tender={tender}
                isLoading={false}
            />
            <div className="flex items-center justify-between mt-6">
                <h3 className="text-lg font-semibold">RFQ Responses</h3>
                {rfq.id != null && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(paths.tendering.rfqsResponseList(rfq.id))}
                    >
                        <List className="h-4 w-4 mr-2" />
                        View all
                    </Button>
                )}
            </div>

            <div className="space-y-4">
                {rfqResponsesLoading ? (
                    <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
                        Loading responses…
                    </div>
                ) : rfqResponses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 bg-muted/10 border border-dashed rounded-lg text-muted-foreground w-full">
                        <FileText className="h-10 w-10 mb-3 opacity-20" />
                        <p className="font-medium">No responses yet</p>
                    </div>
                ) : (
                    rfqResponses.map((res) => (
                        <RfqResponseDetailAccordion
                            key={res.id}
                            responseSummary={res}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

export default function RfqShowPage() {
    const navigate = useNavigate();
    const { tenderId: tenderIdParam } = useParams<{ tenderId: string }>();

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
    const { data: rfqData, isLoading: rfqLoading } = useRfqByTenderId(tenderId);
    const { data: paymentRequests, isLoading: paymentRequestsLoading } = usePaymentRequestsByTender(tenderId);
    const { data: documentChecklist, isLoading: documentChecklistLoading } = useDocumentChecklistByTender(tenderId);
    const { data: costingSheet, isLoading: costingSheetLoading } = useCostingSheetByTender(tenderId);
    const { data: bidSubmission, isLoading: bidSubmissionLoading } = useBidSubmissionByTender(tenderId);

    const isLoading = tenderLoading || approvalLoading || rfqLoading;

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
                        onClick={() => navigate(paths.tendering.rfqs)}
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
                <Button variant="outline" onClick={() => navigate(paths.tendering.rfqs)}>
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

                {/* RFQ - combined RfqView + RFQ Responses */}
                <TabsContent value="rfq" className="space-y-6">
                    {rfqLoading ? (
                        <RfqView rfq={null} tender={tender || undefined} isLoading={true} />
                    ) : !rfqData || rfqData.length === 0 ? (
                        <RfqView rfq={null} tender={tender || undefined} isLoading={false} />
                    ) : (
                        <div className="space-y-8">
                            {rfqData.map((rfq) => (
                                <RfqItemWithResponses
                                    key={rfq.id}
                                    rfq={rfq}
                                    tender={tender || undefined}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* EMD & Tender Fees */}
                <TabsContent value="emds-tenderfees">
                    <EmdTenderFeeShow
                        paymentRequests={paymentRequests || null}
                        tender={tender || null}
                        isLoading={paymentRequestsLoading}
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
