import { useParams, useNavigate } from 'react-router-dom';
import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, FileText } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRfqResponse } from '@/hooks/api/useRfqResponses';
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
import { formatDateTime } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import { TenderView } from '@/modules/tendering/tenders/components/TenderView';
import { InfoSheetView } from '@/modules/tendering/info-sheet/components/InfoSheetView';
import { TenderApprovalView } from '@/modules/tendering/tender-approval/components/TenderApprovalView';
import { PhysicalDocsView } from '@/modules/tendering/physical-docs/components/PhysicalDocsView';
import { RfqView } from '@/modules/tendering/rfqs/components/RfqView';
import { EmdTenderFeeShow } from '@/modules/tendering/emds-tenderfees/components/EmdTenderFeeShow';
import { DocumentChecklistView } from '@/modules/tendering/checklists/components/DocumentChecklistView';
import { CostingSheetView } from '@/modules/tendering/costing-sheets/components/CostingSheetView';
import { BidSubmissionView } from '@/modules/tendering/bid-submissions/components/BidSubmissionView';
import type { TenderWithRelations } from '@/modules/tendering/tenders/helpers/tenderInfo.types';
import { ShowPageLayout, type StepConfig, type StepStatus } from "@/modules/tendering/components/ShowPageLayout";

export default function RfqResponseShowPage() {
    const { responseId } = useParams<{ responseId: string }>();
    const navigate = useNavigate();
    const responseIdNum = responseId ? Number(responseId) : null;

    // ── Primary data fetching ──
    const { data: response, isLoading: responseLoading } = useRfqResponse(responseIdNum);
    const tenderId = response?.rfq?.tenderId || null;

    // ── Related tender data fetching ──
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

    const isLoading = responseLoading || (tenderId ? (tenderLoading || approvalLoading) : false);

    // ── Derive step statuses ──
    const steps: StepConfig[] = useMemo(() => {
        function getStatus(hasData: boolean, loading: boolean): StepStatus {
            if (loading) return "loading";
            if (hasData) return "completed";
            return "pending";
        }

        const baseSteps: StepConfig[] = [
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
                id: "response-detail",
                label: "Response Detail",
                shortLabel: "Response",
                stepNumber: 4,
                hasData: !!response,
                isLoading: responseLoading,
                status: getStatus(!!response, responseLoading),
            },
            {
                id: "emd-fees",
                label: "EMD & Tender Fees",
                shortLabel: "EMD / Fees",
                stepNumber: 5,
                hasData: !!paymentRequests && paymentRequests.length > 0,
                isLoading: requestsLoading,
                status: getStatus(!!paymentRequests && paymentRequests.length > 0, requestsLoading),
            },
            {
                id: "checklist",
                label: "Document Checklist",
                shortLabel: "Checklist",
                stepNumber: 6,
                hasData: !!documentChecklist,
                isLoading: documentChecklistLoading,
                status: getStatus(!!documentChecklist, documentChecklistLoading),
            },
            {
                id: "costing",
                label: "Costing Sheet",
                shortLabel: "Costing",
                stepNumber: 7,
                hasData: !!costingSheet,
                isLoading: costingSheetLoading,
                status: getStatus(!!costingSheet, costingSheetLoading),
            },
            {
                id: "bid-submission",
                label: "Bid Submission",
                shortLabel: "Bid",
                stepNumber: 8,
                hasData: !!bidSubmission,
                isLoading: bidSubmissionLoading,
                status: getStatus(!!bidSubmission, bidSubmissionLoading),
            },
        ];

        return baseSteps;
    }, [
        tender, tenderLoading, approvalLoading, infoSheetLoading,
        physicalDoc, physicalDocLoading,
        rfqData, rfqLoading,
        response, responseLoading,
        paymentRequests, requestsLoading,
        documentChecklist, documentChecklistLoading,
        costingSheet, costingSheetLoading,
        bidSubmission, bidSubmissionLoading,
    ]);

    // ── View state ──
    const [expandedSections, setExpandedSections] = useState<Set<string>>(
        new Set(["response-detail"])
    );
    const [activeSection, setActiveSection] = useState("response-detail");

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
                        ) : tenderLoading ? (
                            <Skeleton className="h-48 w-full" />
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
                return (
                    <RfqView
                        rfq={Array.isArray(rfqData) && rfqData.length > 0 ? rfqData[0] : null}
                        tender={tender ?? undefined}
                        isLoading={rfqLoading}
                    />
                );

            case "response-detail":
                if (responseLoading) return <Skeleton className="h-64 w-full" />;
                if (!response) {
                    return (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>Failed to load response details.</AlertDescription>
                        </Alert>
                    );
                }
                return (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>RFQ Response Details</CardTitle>
                                <div className="text-sm text-muted-foreground mt-1 space-x-2">
                                    <span className="font-semibold text-foreground">{response.organizationName ?? '—'}</span>
                                    <span>·</span>
                                    <span>{response.vendorName ?? '—'}</span>
                                    <span>·</span>
                                    <span>Receipt: {response.receiptDatetime ? formatDateTime(response.receiptDatetime) : '—'}</span>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Organization</p>
                                        <p className="text-sm font-semibold">{response.organizationName ?? '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Vendor contact</p>
                                        <p className="text-sm">{response.vendorName ?? '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Receipt date</p>
                                        <p className="text-sm">
                                            {response.receiptDatetime
                                                ? formatDateTime(response.receiptDatetime)
                                                : '—'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">GST %</p>
                                        <p className="text-sm">{response.gstPercentage ?? '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">GST type</p>
                                        <p className="text-sm">{response.gstType ?? '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Delivery time</p>
                                        <p className="text-sm">{response.deliveryTime ?? '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Freight type</p>
                                        <p className="text-sm">{response.freightType ?? '—'}</p>
                                    </div>
                                </div>
                                {response.notes && (
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Notes</p>
                                        <p className="text-sm whitespace-pre-wrap">{response.notes}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Response items</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {response.items.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No items recorded.</p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Requirement</TableHead>
                                                <TableHead>Unit</TableHead>
                                                <TableHead>Qty</TableHead>
                                                <TableHead className="text-right">Unit price</TableHead>
                                                <TableHead className="text-right">Total price</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {response.items.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell>{item.requirement}</TableCell>
                                                    <TableCell>{item.unit ?? '—'}</TableCell>
                                                    <TableCell>{item.qty ?? '—'}</TableCell>
                                                    <TableCell className="text-right">
                                                        {item.unitPrice != null
                                                            ? formatINR(parseFloat(item.unitPrice))
                                                            : '—'}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {item.totalPrice != null
                                                            ? formatINR(parseFloat(item.totalPrice))
                                                            : '—'}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>

                        {response.documents.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="h-5 w-5" />
                                        Documents
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="list-disc list-inside space-y-1 text-sm">
                                        {response.documents.map((doc) => (
                                            <li key={doc.id}>
                                                <span className="font-medium">{doc.docType}</span>
                                                {doc.path && (
                                                    <span className="text-muted-foreground"> — {doc.path}</span>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        )}
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

    if (!responseId) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid Response ID.</AlertDescription>
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
            onBack={() => navigate(paths.tendering.rfqsResponses)}
            backLabel="Back to RFQ Responses"
            renderSectionContent={renderSectionContent}
        />
    );
}
