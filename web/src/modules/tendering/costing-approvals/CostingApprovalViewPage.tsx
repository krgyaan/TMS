import { useParams, useNavigate } from 'react-router-dom';
import { useState, useCallback, useMemo } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTender } from '@/hooks/api/useTenders';
import { useTenderApproval } from '@/hooks/api/useTenderApprovals';
import { useInfoSheet } from '@/hooks/api/useInfoSheets';
import { usePhysicalDocByTenderId } from '@/hooks/api/usePhysicalDocs';
import { useRfqByTenderId } from '@/hooks/api/useRfqs';
import { usePaymentRequestsByTender } from '@/hooks/api/useEmds';
import { useDocumentChecklistByTender } from '@/hooks/api/useDocumentChecklists';
import { useCostingSheetByTender } from '@/hooks/api/useCostingSheets';
import { useBidSubmissionByTender } from '@/hooks/api/useBidSubmissions';
import { useVendorOrganizations } from '@/hooks/api/useVendorOrganizations';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import { paths } from '@/app/routes/paths';
import { TenderView } from '@/modules/tendering/tenders/components/TenderView';
import { InfoSheetView } from '@/modules/tendering/info-sheet/components/InfoSheetView';
import { TenderApprovalView } from '@/modules/tendering/tender-approval/components/TenderApprovalView';
import { PhysicalDocsView } from '@/modules/tendering/physical-docs/components/PhysicalDocsView';
import { RfqView } from '@/modules/tendering/rfqs/components/RfqView';
import { EmdTenderFeeShow } from '@/modules/tendering/emds-tenderfees/components/EmdTenderFeeShow';
import { DocumentChecklistView } from '@/modules/tendering/checklists/components/DocumentChecklistView';
import { BidSubmissionView } from '@/modules/tendering/bid-submissions/components/BidSubmissionView';
import type { TenderWithRelations } from '@/modules/tendering/tenders/helpers/tenderInfo.types';
import {
    ShowPageLayout,
    type StepConfig,
    type StepStatus,
} from "@/modules/tendering/components/ShowPageLayout";

export default function CostingApprovalViewPage() {
    const { tenderId: tenderIdParam } = useParams<{ tenderId: string }>();
    const navigate = useNavigate();
    const tenderId = tenderIdParam ? parseInt(tenderIdParam, 10) : 0;

    // ── Data fetching ──
    const { data: tender, isLoading: tenderLoading, error: tenderError } = useTender(tenderId);
    const { data: approval, isLoading: approvalLoading } = useTenderApproval(tenderId);
    const { data: infoSheet, isLoading: infoSheetLoading } = useInfoSheet(tenderId);
    const { data: physicalDoc, isLoading: physicalDocLoading } = usePhysicalDocByTenderId(tenderId);
    const { data: rfq, isLoading: rfqLoading } = useRfqByTenderId(tenderId);
    const { data: paymentRequests, isLoading: requestsLoading } = usePaymentRequestsByTender(tenderId);
    const { data: documentChecklist, isLoading: documentChecklistLoading } = useDocumentChecklistByTender(tenderId);
    const { data: costingSheet, isLoading: costingSheetLoading } = useCostingSheetByTender(tenderId);
    const { data: bidSubmission, isLoading: bidSubmissionLoading } = useBidSubmissionByTender(tenderId);
    const { data: vendorOrganizations } = useVendorOrganizations();

    const tenderWithRelations: TenderWithRelations | null = tender
        ? { ...tender, approval: approval || null }
        : null;

    const selectedVendorOrganizations = vendorOrganizations?.filter(vo =>
        costingSheet?.oemVendorIds?.includes(vo.id) || false
    ) || [];

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
                hasData: Array.isArray(rfq) && rfq.length > 0,
                isLoading: rfqLoading,
                status: getStatus(Array.isArray(rfq) && rfq.length > 0, rfqLoading),
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
                id: "bid-submission",
                label: "Bid Submission",
                shortLabel: "Bid",
                stepNumber: 6,
                hasData: !!bidSubmission,
                isLoading: bidSubmissionLoading,
                status: getStatus(!!bidSubmission, bidSubmissionLoading),
            },
            {
                id: "costing-details",
                label: "Costing Details",
                shortLabel: "Costing",
                stepNumber: 7,
                hasData: !!costingSheet,
                isLoading: costingSheetLoading,
                status: getStatus(!!costingSheet, costingSheetLoading),
            },
        ];
    }, [
        tender, tenderLoading, approvalLoading, infoSheetLoading,
        physicalDoc, physicalDocLoading,
        rfq, rfqLoading,
        paymentRequests, requestsLoading,
        documentChecklist, documentChecklistLoading,
        bidSubmission, bidSubmissionLoading,
        costingSheet, costingSheetLoading
    ]);

    // ── View state ──
    const [expandedSections, setExpandedSections] = useState<Set<string>>(
        new Set(["costing-details"])
    );
    const [activeSection, setActiveSection] = useState("costing-details");

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
                            <div className="animate-pulse h-48 bg-muted rounded-lg" />
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
                        rfq={Array.isArray(rfq) && rfq.length > 0 ? rfq[0] : null}
                        tender={tender || undefined}
                        isLoading={rfqLoading}
                    />
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

            case "bid-submission":
                return (
                    <BidSubmissionView
                        bidSubmission={bidSubmission || null}
                        isLoading={bidSubmissionLoading}
                    />
                );

            case "costing-details":
                return (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <CardTitle>Costing Sheet Details</CardTitle>
                                        <Badge variant={costingSheet?.status === 'Submitted' ? 'default' : costingSheet?.status === 'Approved' ? 'secondary' : 'destructive'}>
                                            {costingSheet?.status}
                                        </Badge>
                                    </div>
                                    <CardDescription className="mt-2">
                                        View detailed information about this costing sheet
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            {/* Tender Information Summary (Optional since we have Tender Details above, but keeping consistency with original view) */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-base text-primary border-b pb-2">
                                    Summary
                                </h4>
                                <div className="grid gap-4 md:grid-cols-2 bg-muted/30 p-4 rounded-lg">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Tender No</p>
                                        <p className="text-base font-semibold">{tender?.tenderNo}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Team Member</p>
                                        <p className="text-base font-semibold">{tender?.teamMemberName || '—'}</p>
                                    </div>
                                    {costingSheet?.googleSheetUrl && (
                                        <div className="md:col-span-2">
                                            <p className="text-sm font-medium text-muted-foreground">Google Sheet</p>
                                            <a
                                                href={costingSheet?.googleSheetUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-base font-semibold text-primary hover:underline inline-flex items-center gap-1"
                                            >
                                                View Sheet <ExternalLink className="h-4 w-4" />
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Side-by-Side Comparison */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-base text-primary border-b pb-2">
                                    Costing Details
                                </h4>

                                <div className="grid md:grid-cols-2 gap-6">
                                    {/* TE Submitted Values */}
                                    <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                                            <h5 className="font-semibold text-sm text-blue-700 dark:text-blue-300">
                                                TE Submitted Values
                                            </h5>
                                        </div>

                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground mb-1">Final Price (GST Inclusive)</p>
                                            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                                {costingSheet?.submittedFinalPrice
                                                    ? formatINR(parseFloat(costingSheet.submittedFinalPrice))
                                                    : '—'}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground mb-1">Receipt (Pre GST)</p>
                                            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                                {costingSheet?.submittedReceiptPrice
                                                    ? formatINR(parseFloat(costingSheet.submittedReceiptPrice))
                                                    : '—'}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground mb-1">Budget (Pre GST)</p>
                                            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                                {costingSheet?.submittedBudgetPrice
                                                    ? formatINR(parseFloat(costingSheet.submittedBudgetPrice))
                                                    : '—'}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground mb-1">Gross Margin</p>
                                            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                                {costingSheet?.submittedGrossMargin
                                                    ? `${costingSheet.submittedGrossMargin}%`
                                                    : '—'}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground mb-1">TE Remarks</p>
                                            <p className="text-sm text-muted-foreground break-words">
                                                {costingSheet?.teRemarks || '—'}
                                            </p>
                                        </div>

                                        {costingSheet?.submittedAt && (
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground mb-1">Submitted At</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {formatDateTime(costingSheet?.submittedAt)}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* TL Approved Values */}
                                    <div className="space-y-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                            <h5 className="font-semibold text-sm text-green-700 dark:text-green-300">
                                                TL Approved Values
                                            </h5>
                                        </div>

                                        {costingSheet?.status === 'Approved' ? (
                                            <>
                                                <div>
                                                    <p className="text-xs font-medium text-muted-foreground mb-1">Final Price (GST Inclusive)</p>
                                                    <p className="text-lg font-bold text-green-700 dark:text-green-300">
                                                        {costingSheet?.finalPrice
                                                            ? formatINR(parseFloat(costingSheet.finalPrice))
                                                            : '—'}
                                                    </p>
                                                </div>

                                                <div>
                                                    <p className="text-xs font-medium text-muted-foreground mb-1">Receipt (Pre GST)</p>
                                                    <p className="text-lg font-bold text-green-700 dark:text-green-300">
                                                        {costingSheet?.receiptPrice
                                                            ? formatINR(parseFloat(costingSheet.receiptPrice))
                                                            : '—'}
                                                    </p>
                                                </div>

                                                <div>
                                                    <p className="text-xs font-medium text-muted-foreground mb-1">Budget (Pre GST)</p>
                                                    <p className="text-lg font-bold text-green-700 dark:text-green-300">
                                                        {costingSheet?.budgetPrice
                                                            ? formatINR(parseFloat(costingSheet.budgetPrice))
                                                            : '—'}
                                                    </p>
                                                </div>

                                                <div>
                                                    <p className="text-xs font-medium text-muted-foreground mb-1">Gross Margin</p>
                                                    <p className="text-lg font-bold text-green-700 dark:text-green-300">
                                                        {costingSheet?.grossMargin
                                                            ? `${costingSheet.grossMargin}%`
                                                            : '—'}
                                                    </p>
                                                </div>

                                                <div>
                                                    <p className="text-xs font-medium text-muted-foreground mb-1">Selected Vendors</p>
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {selectedVendorOrganizations.length > 0 ? (
                                                            selectedVendorOrganizations.map(vendorOrg => (
                                                                <Badge key={vendorOrg.id} variant="outline">
                                                                    {vendorOrg.name}
                                                                </Badge>
                                                            ))
                                                        ) : (
                                                            <p className="text-sm text-muted-foreground">—</p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div>
                                                    <p className="text-xs font-medium text-muted-foreground mb-1">TL Remarks</p>
                                                    <p className="text-sm text-muted-foreground break-words">
                                                        {costingSheet?.tlRemarks || '—'}
                                                    </p>
                                                </div>

                                                {costingSheet?.approvedAt && (
                                                    <div>
                                                        <p className="text-xs font-medium text-muted-foreground mb-1">Approved At</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {formatDateTime(costingSheet?.approvedAt)}
                                                        </p>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="flex items-center justify-center h-full">
                                                <p className="text-sm text-muted-foreground">
                                                    {costingSheet?.status === 'Submitted'
                                                        ? 'Awaiting approval'
                                                        : 'Not approved yet'}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Rejection Reason (if rejected) */}
                            {costingSheet?.status === 'Rejected/Redo' && costingSheet?.rejectionReason && (
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-base text-destructive border-b pb-2">
                                        Rejection Reason
                                    </h4>
                                    <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
                                        <p className="text-sm text-destructive break-words">{costingSheet?.rejectionReason}</p>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-2 pt-6 border-t">
                                <Button variant="outline" onClick={() => navigate(paths.tendering.costingApprovals)}>
                                    Back to List
                                </Button>
                                {costingSheet?.status === 'Submitted' && (
                                    <>
                                        <Button variant="outline" onClick={() => navigate(paths.tendering.costingReject(costingSheet?.id))}>
                                            Reject
                                        </Button>
                                        <Button onClick={() => navigate(paths.tendering.costingApprove(costingSheet?.id ?? 0))}>
                                            Approve
                                        </Button>
                                    </>
                                )}
                                {costingSheet?.status === 'Approved' && (
                                    <Button onClick={() => navigate(paths.tendering.costingEditApproval(costingSheet?.id ?? 0))}>
                                        Edit Approval
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                );

            default:
                return null;
        }
    };

    if (!tenderId) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid Tender ID</AlertDescription>
            </Alert>
        );
    }

    if (tenderError) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error loading tender</AlertTitle>
                <AlertDescription>{tenderError.message}</AlertDescription>
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
            onBack={() => navigate(paths.tendering.costingApprovals)}
            backLabel="Back to Costing Approvals"
            renderSectionContent={renderSectionContent}
        />
    );
}
