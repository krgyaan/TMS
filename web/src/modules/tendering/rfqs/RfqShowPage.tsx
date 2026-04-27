import { useNavigate, useParams } from 'react-router-dom';
import { useState, useCallback, useMemo } from 'react';
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, List, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    ShowPageLayout,
    type StepConfig,
    type StepStatus,
} from "@/modules/tendering/components/ShowPageLayout";

// Local component for RFQ item with its responses
function RfqItemWithResponses({ rfq, tender, index }: { rfq: Rfq; tender?: TenderInfoWithNames; index: number }) {
    const navigate = useNavigate();
    const { data: rfqResponses = [], isLoading: rfqResponsesLoading } = useRfqResponses(rfq.id);

    const groupedResponses = useMemo(() => {
        const groups: Record<string, typeof rfqResponses> = {};
        rfqResponses.forEach(res => {
            const org = res.organizationName || 'Other';
            if (!groups[org]) groups[org] = [];
            groups[org].push(res);
        });
        return groups;
    }, [rfqResponses]);

    return (
        <Accordion type="single" collapsible defaultValue="request" className="w-full border rounded-lg bg-card overflow-hidden shadow-sm">
            <AccordionItem value="request" className="border-b-0">
                <AccordionTrigger className="px-4 py-2 hover:no-underline hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="rounded-sm font-bold text-[10px]">
                            RFQ REQUEST #{index}
                        </Badge>
                        <span className="text-xs font-semibold">
                           {rfq.itemName || 'RFQ Details'}
                        </span>
                        <span className="text-[10px] text-muted-foreground italic">
                            (ID: #{rfq.id})
                        </span>
                        {rfqResponses.length > 0 && (
                             <Badge variant="secondary" className="text-[10px] ml-2 px-1.5 h-4">
                                {rfqResponses.length} {rfqResponses.length === 1 ? 'Response' : 'Responses'}
                             </Badge>
                        )}
                    </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-2 border-t">
                    <div className="space-y-4 mt-2">
                        <RfqView
                            rfq={rfq}
                            tender={tender}
                            isLoading={false}
                        />
                        <div className="flex items-center justify-between mt-4">
                            <h3 className="text-[11px] font-bold uppercase tracking-tight text-muted-foreground">Responses</h3>
                            {/* {rfq.id != null && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(paths.tendering.rfqsResponseList(rfq.id));
                                    }}
                                >
                                    <List className="h-3 w-3 mr-1" />
                                    View all
                                </Button>
                            )} */}
                        </div>

                        <div className="space-y-2">
                            {rfqResponsesLoading ? (
                                <div className="flex items-center justify-center py-4 text-muted-foreground text-xs">
                                    Loading responses…
                                </div>
                            ) : rfqResponses.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-2 bg-muted/10 border border-dashed rounded-lg text-muted-foreground w-full">
                                    <p className="text-xs">No responses yet</p>
                                </div>
                            ) : (
                                Object.entries(groupedResponses).map(([orgName, responses]) => (
                                    <div key={orgName} className="space-y-1">
                                        <div className="flex items-center gap-2 px-1">
                                            <Badge variant="secondary" className="px-2 py-0.5 text-[10px] font-semibold">
                                                {orgName}
                                            </Badge>
                                            <div className="h-[1px] flex-1 bg-border/60" />
                                        </div>
                                        <div className="space-y-2">
                                            {responses.map((res) => (
                                                <RfqResponseDetailAccordion
                                                    key={res.id}
                                                    responseSummary={res}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}


export default function RfqShowPage() {
    const navigate = useNavigate();
    const { tenderId: tenderIdParam } = useParams<{ tenderId: string }>();
    const tenderId = tenderIdParam ? Number(tenderIdParam) : null;

    // ── Data fetching ──
    const { data: tender, isLoading: tenderLoading } = useTender(tenderId);
    const { data: approval, isLoading: approvalLoading } = useTenderApproval(tenderId);
    const { data: infoSheet, isLoading: infoSheetLoading } = useInfoSheet(tenderId);
    const { data: physicalDoc, isLoading: physicalDocLoading } = usePhysicalDocByTenderId(tenderId);
    const { data: rfqData, isLoading: rfqLoading } = useRfqByTenderId(tenderId);
    const { data: paymentRequests, isLoading: requestsLoading } = usePaymentRequestsByTender(tenderId);
    const { data: documentChecklist, isLoading: documentChecklistLoading } = useDocumentChecklistByTender(tenderId ?? 0);
    const { data: costingSheet, isLoading: costingSheetLoading } = useCostingSheetByTender(tenderId ?? 0);
    const { data: bidSubmission, isLoading: bidSubmissionLoading } = useBidSubmissionByTender(tenderId ?? 0);

    const tenderWithRelations: TenderWithRelations | null = tender
        ? { ...tender, approval: approval || null }
        : null;

    const isLoading = tenderLoading || approvalLoading || rfqLoading;

    // ── Derive step statuses ──
    const steps: StepConfig[] = useMemo(() => {
        function getStatus(hasData: boolean, loading: boolean): StepStatus {
            if (loading) return "loading";
            if (hasData) return "completed";
            return "pending";
        }

        return [
            {
                id: "tender-details",
                label: "Tender Details",
                shortLabel: "Tender Details",
                stepNumber: 1,
                hasData: !!tender,
                isLoading: tenderLoading || approvalLoading || infoSheetLoading,
                status: getStatus(!!tender, tenderLoading),
            },
            {
                id: "physical-docs",
                label: "Physical Documents",
                shortLabel: "Physical Docs",
                stepNumber: 2,
                hasData: !!physicalDoc,
                isLoading: physicalDocLoading,
                status: getStatus(!!physicalDoc, physicalDocLoading),
            },
            {
                id: "rfq",
                label: "RFQ & Responses",
                shortLabel: "RFQ",
                stepNumber: 3,
                hasData: Array.isArray(rfqData) && rfqData.length > 0,
                isLoading: rfqLoading,
                status: getStatus(Array.isArray(rfqData) && rfqData.length > 0, rfqLoading),
            },
            {
                id: "emd-fees",
                label: "EMD & Tender Fees",
                shortLabel: "EMD / Fees",
                stepNumber: 4,
                hasData: !!paymentRequests && paymentRequests.length > 0,
                isLoading: requestsLoading,
                status: getStatus(!!paymentRequests && paymentRequests.length > 0, requestsLoading),
            },
            {
                id: "checklist",
                label: "Document Checklist",
                shortLabel: "Checklist",
                stepNumber: 5,
                hasData: !!documentChecklist,
                isLoading: documentChecklistLoading,
                status: getStatus(!!documentChecklist, documentChecklistLoading),
            },
            {
                id: "costing",
                label: "Costing Sheet",
                shortLabel: "Costing",
                stepNumber: 6,
                hasData: !!costingSheet,
                isLoading: costingSheetLoading,
                status: getStatus(!!costingSheet, costingSheetLoading),
            },
            {
                id: "bid-submission",
                label: "Bid Submission",
                shortLabel: "Bid",
                stepNumber: 7,
                hasData: !!bidSubmission,
                isLoading: bidSubmissionLoading,
                status: getStatus(!!bidSubmission, bidSubmissionLoading),
            },
        ];
    }, [
        tender, tenderLoading, approvalLoading, infoSheetLoading,
        physicalDoc, physicalDocLoading,
        rfqData, rfqLoading,
        paymentRequests, requestsLoading,
        documentChecklist, documentChecklistLoading,
        costingSheet, costingSheetLoading,
        bidSubmission, bidSubmissionLoading,
    ]);

    // ── View state ──
    const [expandedSections, setExpandedSections] = useState<Set<string>>(
        new Set(["rfq"])
    );
    const [activeSection, setActiveSection] = useState("rfq");

    // ── Handlers ──
    const toggleSection = useCallback((id: string) => {
        setExpandedSections((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const expandAll = useCallback(
        () => setExpandedSections(new Set(steps.map((s) => s.id))),
        [steps]
    );
    const collapseAll = useCallback(() => setExpandedSections(new Set()), []);

    const jumpToSection = useCallback((id: string) => {
        setActiveSection(id);
        const el = document.getElementById(`section-${id}`);
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, []);

    // ── Section content renderers ──
    const renderSectionContent = (stepId: string) => {
        switch (stepId) {
            case "tender-details":
                return (
                    <div className="space-y-6">
                        {tenderWithRelations ? (
                            <TenderView
                                tender={tenderWithRelations}
                                isLoading={tenderLoading || approvalLoading}
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
                                isLoading={tenderLoading || approvalLoading}
                            />
                        )}
                    </div>
                );

            case "physical-docs":
                return (
                    <PhysicalDocsView
                        physicalDoc={physicalDoc || null}
                        isLoading={physicalDocLoading}
                    />
                );

            case "rfq":
                return rfqLoading ? (
                    <RfqView rfq={null} tender={tender || undefined} isLoading={true} />
                ) : !rfqData || rfqData.length === 0 ? (
                    <RfqView rfq={null} tender={tender || undefined} isLoading={false} />
                ) : (
                    <div className="space-y-4">
                        {rfqData.map((rfq, index) => (
                            <RfqItemWithResponses
                                key={rfq.id}
                                rfq={rfq}
                                tender={tender || undefined}
                                index={index + 1}
                            />
                        ))}
                    </div>
                );

            case "emd-fees":
                return (
                    <EmdTenderFeeShow
                        paymentRequests={paymentRequests || null}
                        tender={tender || null}
                        isLoading={requestsLoading}
                    />
                );

            case "checklist":
                return (
                    <DocumentChecklistView
                        checklist={documentChecklist || null}
                        isLoading={documentChecklistLoading}
                    />
                );

            case "costing":
                return (
                    <CostingSheetView
                        costingSheet={costingSheet || null}
                        isLoading={costingSheetLoading}
                    />
                );

            case "bid-submission":
                return (
                    <BidSubmissionView
                        bidSubmission={bidSubmission || null}
                        isLoading={bidSubmissionLoading}
                    />
                );

            default:
                return null;
        }
    };

    if (!tenderIdParam) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid Tender ID.</AlertDescription>
            </Alert>
        );
    }

    return (
        <ShowPageLayout
            steps={steps}
            activeSection={activeSection}
            onJump={jumpToSection}
            onSectionVisible={setActiveSection}
            expandedSections={expandedSections}
            onToggleSection={toggleSection}
            onExpandAll={expandAll}
            onCollapseAll={collapseAll}
            onBack={() => navigate(paths.tendering.rfqs)}
            backLabel="Back to RFQs"
            renderSectionContent={renderSectionContent}
        />
    );
}
