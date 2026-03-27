import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useTender } from "@/hooks/api/useTenders";
import { useTenderApproval } from "@/hooks/api/useTenderApprovals";
import { useInfoSheet } from "@/hooks/api/useInfoSheets";
import { useRfqByTenderId } from "@/hooks/api/useRfqs";
import { useRfqResponses } from "@/hooks/api/useRfqResponses";
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
import { RfqResponsesTable } from "@/modules/tendering/rfq-response/components/RfqResponsesTable";
import { PhysicalDocsView } from "@/modules/tendering/physical-docs/components/PhysicalDocsView";
import { EmdTenderFeeShow } from "@/modules/tendering/emds-tenderfees/components/EmdTenderFeeShow";
import { DocumentChecklistView } from "@/modules/tendering/checklists/components/DocumentChecklistView";
import { CostingSheetView } from "@/modules/tendering/costing-sheets/components/CostingSheetView";
import { BidSubmissionView } from "@/modules/tendering/bid-submissions/components/BidSubmissionView";
import { TenderResultShow } from "@/modules/tendering/results/components/TenderResultShow";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { paths } from "@/app/routes/paths";
import { cn } from "@/lib/utils";
import type { TenderWithRelations } from "@/modules/tendering/tenders/helpers/tenderInfo.types";
import { AlertCircle, ArrowLeft, Check, ChevronDown, ChevronsDownUp, ChevronsUpDown, Circle, List, Loader2, LayoutGrid, Menu } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────────

type StepStatus = "completed" | "in-progress" | "pending" | "loading";

interface StepConfig {
    id: string;
    label: string;
    shortLabel: string;
    stepNumber: number;
    status: StepStatus;
    hasData: boolean;
    isLoading: boolean;
}

// ─── Step Status Dot ────────────────────────────────────────────────────────────

function StepDot({
    status,
    stepNumber,
    isActive,
    size = "md",
}: {
    status: StepStatus;
    stepNumber: number;
    isActive?: boolean;
    size?: "sm" | "md";
}) {
    const sizeClass = size === "sm" ? "h-6 w-6 text-[10px]" : "h-7 w-7 text-xs";

    if (status === "loading") {
        return (
            <div
                className={cn(
                    sizeClass,
                    "rounded-full flex items-center justify-center bg-muted border-2 border-muted-foreground/20",
                    isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}
            >
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (status === "completed") {
        return (
            <div
                className={cn(
                    sizeClass,
                    "rounded-full flex items-center justify-center bg-emerald-500 text-white",
                    isActive &&
                    "ring-2 ring-emerald-400 ring-offset-2 ring-offset-background"
                )}
            >
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </div>
        );
    }

    if (status === "in-progress") {
        return (
            <div
                className={cn(
                    sizeClass,
                    "rounded-full flex items-center justify-center bg-amber-500/20 text-amber-500 border-2 border-amber-500",
                    isActive &&
                    "ring-2 ring-amber-400 ring-offset-2 ring-offset-background"
                )}
            >
                <span className="font-bold">{stepNumber}</span>
            </div>
        );
    }

    // pending
    return (
        <div
            className={cn(
                sizeClass,
                "rounded-full flex items-center justify-center bg-muted text-muted-foreground border-2 border-border",
                isActive && "ring-2 ring-ring ring-offset-2 ring-offset-background"
            )}
        >
            <span className="font-medium">{stepNumber}</span>
        </div>
    );
}

// ─── Status Badge ───────────────────────────────────────────────────────────────

function StepStatusBadge({ status }: { status: StepStatus }) {
    if (status === "loading") {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading
            </span>
        );
    }

    if (status === "completed") {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                <Check className="h-3 w-3" strokeWidth={3} />
                Done
            </span>
        );
    }

    if (status === "in-progress") {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-500 border border-amber-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                In Progress
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
            <Circle className="h-3 w-3" />
            Pending
        </span>
    );
}

// ─── Mobile Jump Navigation ─────────────────────────────────────────────────────

function MobileJumpNav({
    steps,
    activeSection,
    onJump,
}: {
    steps: StepConfig[];
    activeSection: string;
    onJump: (id: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const activeStep = steps.find((s) => s.id === activeSection);

    return (
        <div className="lg:hidden relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full flex items-center justify-between px-4 py-3",
                    "bg-card border border-border rounded-xl text-sm text-foreground",
                    "hover:bg-accent transition-colors"
                )}
            >
                <div className="flex items-center gap-3">
                    <Menu className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                        {activeStep?.label ?? "Jump to section"}
                    </span>
                </div>
                <ChevronDown
                    className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform duration-200",
                        isOpen && "rotate-180"
                    )}
                />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border border-border rounded-xl shadow-xl overflow-hidden max-h-80 overflow-y-auto">
                        {steps.map((step) => (
                            <button
                                key={step.id}
                                onClick={() => {
                                    onJump(step.id);
                                    setIsOpen(false);
                                }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 text-left",
                                    "hover:bg-accent transition-colors text-sm",
                                    activeSection === step.id && "bg-accent"
                                )}
                            >
                                <StepDot
                                    status={step.status}
                                    stepNumber={step.stepNumber}
                                    isActive={activeSection === step.id}
                                    size="sm"
                                />
                                <span className="text-foreground">{step.label}</span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Side Stepper (Desktop) ─────────────────────────────────────────────────────

function SideStepper({
    steps,
    activeSection,
    onJump,
}: {
    steps: StepConfig[];
    activeSection: string;
    onJump: (id: string) => void;
}) {
    return (
        <nav className="hidden lg:block w-46 xl:w-46 shrink-0">
            <div className="sticky top-24">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">
                    Process Steps
                </h3>
                <div className="space-y-0.5">
                    {steps.map((step, index) => {
                        const isActive = activeSection === step.id;
                        const isLast = index === steps.length - 1;

                        return (
                            <div key={step.id} className="relative">
                                {/* Connector line */}
                                {!isLast && (
                                    <div className="absolute left-[13px] top-[34px] w-px h-[calc(100%-6px)]">
                                        <div
                                            className={cn(
                                                "w-full h-full",
                                                step.status === "completed"
                                                    ? "bg-emerald-500/40"
                                                    : "bg-border"
                                            )}
                                        />
                                    </div>
                                )}

                                <button
                                    onClick={() => onJump(step.id)}
                                    className={cn(
                                        "relative w-full flex items-center gap-3 px-2 py-2.5 rounded-lg text-left transition-all group",
                                        isActive
                                            ? "bg-accent"
                                            : "hover:bg-accent/50"
                                    )}
                                >
                                    <StepDot
                                        status={step.status}
                                        stepNumber={step.stepNumber}
                                        isActive={isActive}
                                    />
                                    <span
                                        className={cn(
                                            "text-sm truncate transition-colors",
                                            isActive
                                                ? "text-foreground font-medium"
                                                : "text-muted-foreground group-hover:text-foreground"
                                        )}
                                    >
                                        {step.shortLabel}
                                    </span>
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}

// ─── Accordion Section Wrapper ──────────────────────────────────────────────────

function AccordionSection({
    step,
    isExpanded,
    onToggle,
    isActive,
    children,
}: {
    step: StepConfig;
    isExpanded: boolean;
    onToggle: () => void;
    isActive: boolean;
    children: React.ReactNode;
}) {
    return (
        <div
            id={`section-${step.id}`}
            className={cn(
                "rounded-xl border transition-all duration-200 scroll-mt-28",
                isExpanded
                    ? "border-border bg-card shadow-sm"
                    : "border-border/60 bg-card/50 hover:border-border hover:bg-card/80",
                isActive && isExpanded && "ring-1 ring-primary/20"
            )}
        >
            {/* Section Header */}
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-4 sm:px-5 py-4 text-left"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <StepDot
                        status={step.status}
                        stepNumber={step.stepNumber}
                        isActive={isActive}
                    />
                    <h3 className="text-sm font-medium text-foreground truncate">
                        {step.label}
                    </h3>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                    <div className="hidden sm:block">
                        <StepStatusBadge status={step.status} />
                    </div>
                    <ChevronDown
                        className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform duration-200",
                            isExpanded && "rotate-180"
                        )}
                    />
                </div>
            </button>

            {/* Section Content */}
            {isExpanded && (
                <div className="px-4 sm:px-5 pb-5 border-t border-border/50">
                    <div className="pt-4">{children}</div>
                </div>
            )}
        </div>
    );
}

// ─── Overview Card ──────────────────────────────────────────────────────────────

function OverviewCard({
    step,
    onClick,
}: {
    step: StepConfig;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "text-left p-4 rounded-xl border bg-card transition-all hover:shadow-md",
                step.status === "completed" &&
                "border-emerald-500/30 hover:border-emerald-500/50",
                step.status === "in-progress" &&
                "border-amber-500/30 hover:border-amber-500/50",
                step.status === "pending" && "border-border hover:border-border",
                step.status === "loading" && "border-border hover:border-border"
            )}
        >
            <div className="flex items-start justify-between mb-3">
                <StepDot
                    status={step.status}
                    stepNumber={step.stepNumber}
                    size="sm"
                />
                <StepStatusBadge status={step.status} />
            </div>
            <h3 className="text-sm font-medium text-foreground mb-1">
                {step.label}
            </h3>
            <p className="text-xs text-muted-foreground">
                Step {step.stepNumber} of 8
            </p>
        </button>
    );
}

// ─── Main Page Component ────────────────────────────────────────────────────────

export default function TenderShowPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const parsedId = id ? Number(id) : NaN;
    const tenderId = Number.isNaN(parsedId) ? null : parsedId;

    // ── Data fetching (unchanged) ──
    const { data: tender, isLoading } = useTender(tenderId);
    const { data: approval, isLoading: approvalLoading } =
        useTenderApproval(tenderId);
    const {
        data: infoSheet,
        isLoading: infoSheetLoading,
        error: infoSheetError,
    } = useInfoSheet(tenderId);
    const { data: rfq, isLoading: rfqLoading } = useRfqByTenderId(tenderId);
    const rfqId = Array.isArray(rfq) && rfq.length > 0 ? rfq[0].id : null;
    const { data: rfqResponses = [], isLoading: rfqResponsesLoading } =
        useRfqResponses(rfqId);
    const { data: physicalDoc, isLoading: physicalDocLoading } =
        usePhysicalDocByTenderId(tenderId);
    const { data: paymentRequests, isLoading: paymentRequestsLoading } =
        usePaymentRequestsByTender(tenderId);
    const { data: checklist, isLoading: checklistLoading } =
        useDocumentChecklistByTender(tenderId ?? 0);
    const { data: costingSheet, isLoading: costingSheetLoading } =
        useCostingSheetByTender(tenderId ?? 0);
    const { data: bidSubmission, isLoading: bidSubmissionLoading } =
        useBidSubmissionByTender(tenderId ?? 0);
    const { data: tenderResult, isLoading: resultLoading } =
        useTenderResultByTenderId(tenderId);

    const tenderWithRelations: TenderWithRelations | null = tender
        ? { ...tender, approval: approval || null }
        : null;

    // ── Derive step statuses ──
    const steps: StepConfig[] = useMemo(() => {
        const hasRfq = Array.isArray(rfq) && rfq.length > 0;
        const hasPhysicalDoc = !!physicalDoc;
        const hasPaymentRequests =
            !!paymentRequests && paymentRequests.length > 0;
        const hasChecklist = !!checklist;
        const hasCostingSheet = !!costingSheet;
        const hasBidSubmission = !!bidSubmission;
        const hasTenderResult = !!tenderResult;

        function getStatus(
            hasData: boolean,
            loading: boolean
        ): StepStatus {
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
                isLoading: isLoading || approvalLoading || infoSheetLoading,
                status: getStatus(!!tender, isLoading),
            },
            {
                id: "physical-docs",
                label: "Physical Documents",
                shortLabel: "Physical Docs",
                stepNumber: 2,
                hasData: hasPhysicalDoc,
                isLoading: physicalDocLoading,
                status: getStatus(hasPhysicalDoc, physicalDocLoading),
            },
            {
                id: "rfq",
                label: "RFQ & Responses",
                shortLabel: "RFQ",
                stepNumber: 3,
                hasData: hasRfq,
                isLoading: rfqLoading,
                status: getStatus(hasRfq, rfqLoading),
            },
            {
                id: "emd-fees",
                label: "EMD & Tender Fees",
                shortLabel: "EMD / Fees",
                stepNumber: 4,
                hasData: hasPaymentRequests,
                isLoading: paymentRequestsLoading,
                status: getStatus(hasPaymentRequests, paymentRequestsLoading),
            },
            {
                id: "checklist",
                label: "Document Checklist",
                shortLabel: "Checklist",
                stepNumber: 5,
                hasData: hasChecklist,
                isLoading: checklistLoading,
                status: getStatus(hasChecklist, checklistLoading),
            },
            {
                id: "costing",
                label: "Costing Sheet",
                shortLabel: "Costing",
                stepNumber: 6,
                hasData: hasCostingSheet,
                isLoading: costingSheetLoading,
                status: getStatus(hasCostingSheet, costingSheetLoading),
            },
            {
                id: "bid",
                label: "Bid Submission",
                shortLabel: "Bid",
                stepNumber: 7,
                hasData: hasBidSubmission,
                isLoading: bidSubmissionLoading,
                status: getStatus(hasBidSubmission, bidSubmissionLoading),
            },
            {
                id: "result",
                label: "Result",
                shortLabel: "Result",
                stepNumber: 8,
                hasData: hasTenderResult,
                isLoading: resultLoading,
                status: getStatus(hasTenderResult, resultLoading),
            },
        ];
    }, [
        tender,
        isLoading,
        approvalLoading,
        infoSheetLoading,
        rfq,
        rfqLoading,
        physicalDoc,
        physicalDocLoading,
        paymentRequests,
        paymentRequestsLoading,
        checklist,
        checklistLoading,
        costingSheet,
        costingSheetLoading,
        bidSubmission,
        bidSubmissionLoading,
        tenderResult,
        resultLoading,
    ]);

    // ── View state ──
    const [viewMode, setViewMode] = useState<"scroll" | "cards">("scroll");
    const [expandedSections, setExpandedSections] = useState<Set<string>>(
        () => new Set(steps.filter((s) => s.status !== "pending").map((s) => s.id))
    );
    const [activeSection, setActiveSection] = useState(steps[0].id);

    // Update expanded sections when data loads
    useEffect(() => {
        setExpandedSections((prev) => {
            const next = new Set(prev);
            for (const step of steps) {
                if (step.status === "completed" || step.status === "in-progress" || step.status === "loading") {
                    next.add(step.id);
                }
            }
            return next;
        });
    }, [steps]);

    // ── Toggle section ──
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

    // ── Jump to section ──
    const jumpToSection = useCallback((id: string) => {
        setActiveSection(id);
        setExpandedSections((prev) => new Set([...prev, id]));
        setTimeout(() => {
            const el = document.getElementById(`section-${id}`);
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        }, 100);
    }, []);

    // ── Scroll spy ──
    useEffect(() => {
        if (viewMode !== "scroll") return;

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        const id = entry.target.id.replace("section-", "");
                        setActiveSection(id);
                    }
                }
            },
            { rootMargin: "-25% 0px -65% 0px" }
        );

        for (const step of steps) {
            const el = document.getElementById(`section-${step.id}`);
            if (el) observer.observe(el);
        }

        return () => observer.disconnect();
    }, [viewMode, steps]);

    // ── Section content renderers ──
    const renderSectionContent = (stepId: string) => {
        switch (stepId) {
            case "tender-details":
                return (
                    <div className="space-y-6">
                        {tenderWithRelations ? (
                            <TenderView
                                tender={tenderWithRelations}
                                isLoading={isLoading || approvalLoading}
                            />
                        ) : isLoading ? (
                            <TenderView
                                tender={null as any}
                                isLoading
                            />
                        ) : (
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Tender information not available.
                                </AlertDescription>
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
                    </div>
                );

            case "physical-docs":
                return physicalDocLoading ? (
                    <PhysicalDocsView physicalDoc={null} isLoading />
                ) : physicalDoc ? (
                    <PhysicalDocsView physicalDoc={physicalDoc} />
                ) : (
                    <PhysicalDocsView physicalDoc={null} />
                );

            case "rfq":
                return rfqLoading ? (
                    <RfqView rfq={null} tender={tender ?? undefined} isLoading />
                ) : Array.isArray(rfq) && rfq.length > 0 ? (
                    <div className="space-y-6">
                        <RfqView rfq={rfq[0]} tender={tender ?? undefined} />
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">RFQ Responses</h3>
                                {rfqId != null && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            navigate(paths.tendering.rfqsResponseList(rfqId))
                                        }
                                    >
                                        <List className="h-4 w-4 mr-2" />
                                        View all
                                    </Button>
                                )}
                            </div>
                            <RfqResponsesTable
                                responses={rfqResponses}
                                isLoading={rfqResponsesLoading}
                                rfqId={rfqId}
                            />
                        </div>
                    </div>
                ) : (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            No RFQ exists for this tender yet.
                            <Button
                                className="mt-4"
                                onClick={() =>
                                    navigate(paths.tendering.rfqsCreate(tenderId!))
                                }
                            >
                                Create RFQ
                            </Button>
                        </AlertDescription>
                    </Alert>
                );

            case "emd-fees":
                return paymentRequestsLoading ? (
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
                            <Button
                                className="mt-4"
                                onClick={() =>
                                    navigate(
                                        paths.tendering.emdsTenderFeesCreate(tenderId!)
                                    )
                                }
                            >
                                Create Payment Request
                            </Button>
                        </AlertDescription>
                    </Alert>
                );

            case "checklist":
                return checklistLoading ? (
                    <DocumentChecklistView checklist={null} isLoading />
                ) : checklist ? (
                    <DocumentChecklistView checklist={checklist} />
                ) : (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            No document checklist exists for this tender yet.
                            <Button
                                className="mt-4"
                                onClick={() =>
                                    navigate(
                                        paths.tendering.documentChecklistCreate(tenderId!)
                                    )
                                }
                            >
                                Create Checklist
                            </Button>
                        </AlertDescription>
                    </Alert>
                );

            case "costing":
                return costingSheetLoading ? (
                    <CostingSheetView costingSheet={null} isLoading />
                ) : costingSheet ? (
                    <CostingSheetView costingSheet={costingSheet} />
                ) : (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            No costing sheet exists for this tender yet.
                            <Button
                                className="mt-4"
                                onClick={() =>
                                    navigate(
                                        paths.tendering.costingSheetSubmit(tenderId!)
                                    )
                                }
                            >
                                Submit Costing Sheet
                            </Button>
                        </AlertDescription>
                    </Alert>
                );

            case "bid":
                return bidSubmissionLoading ? (
                    <BidSubmissionView bidSubmission={null} isLoading />
                ) : bidSubmission ? (
                    <BidSubmissionView bidSubmission={bidSubmission} />
                ) : (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            No bid submission exists for this tender yet.
                            <Button
                                className="mt-4"
                                onClick={() =>
                                    navigate(paths.tendering.bidSubmit(tenderId!))
                                }
                            >
                                Submit Bid
                            </Button>
                        </AlertDescription>
                    </Alert>
                );

            case "result":
                return resultLoading ? (
                    <TenderResultShow
                        result={{} as ResultDashboardRow}
                        isLoading
                    />
                ) : tenderResult ? (
                    <TenderResultShow result={tenderResult as any} />
                ) : (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            No result available for this tender yet.
                            <Button
                                className="mt-4"
                                onClick={() =>
                                    navigate(paths.tendering.resultsUpload(tenderId!))
                                }
                            >
                                Upload Result
                            </Button>
                        </AlertDescription>
                    </Alert>
                );

            default:
                return null;
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-0">
            {/* ── Sticky Header ── */}
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border -mx-4 sm:-mx-6 px-4 sm:px-6 pb-4 pt-4 space-y-3">
                {/* Top row: Back + title + view toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={() => navigate(paths.tendering.tenders)}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div className="min-w-0">
                            <h1 className="text-lg font-semibold text-foreground truncate">
                                {tender?.tenderName ?? "Loading..."}
                            </h1>
                            <p className="text-sm text-muted-foreground truncate">
                                {tender?.tenderNo
                                    ? `#${tender.tenderNo}`
                                    : ""}
                                {tender?.organizationName
                                    ? ` · ${tender.organizationName}`
                                    : ""}
                            </p>
                        </div>
                    </div>

                    {/* View mode toggle */}
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center bg-muted rounded-lg p-0.5 border border-border">
                            <button
                                onClick={() => setViewMode("scroll")}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                    viewMode === "scroll"
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <List className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Detailed</span>
                            </button>
                            <button
                                onClick={() => setViewMode("cards")}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                    viewMode === "cards"
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <LayoutGrid className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Overview</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Main Content ── */}
            <div className="pt-6">
                {viewMode === "cards" ? (
                    /* ──── OVERVIEW CARD GRID ──── */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {steps.map((step) => (
                            <OverviewCard
                                key={step.id}
                                step={step}
                                onClick={() => {
                                    setViewMode("scroll");
                                    setTimeout(() => jumpToSection(step.id), 150);
                                }}
                            />
                        ))}
                    </div>
                ) : (
                    /* ──── DETAILED ACCORDION + SIDE STEPPER ──── */
                    <div className="flex gap-6">
                        {/* Side stepper - desktop only */}
                        <SideStepper
                            steps={steps}
                            activeSection={activeSection}
                            onJump={jumpToSection}
                        />

                        {/* Scrollable content area */}
                        <div className="flex-1 min-w-0 space-y-3">
                            {/* Mobile jump nav + expand/collapse controls */}
                            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                                <div className="flex-1">
                                    <MobileJumpNav
                                        steps={steps}
                                        activeSection={activeSection}
                                        onJump={jumpToSection}
                                    />
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={expandAll}
                                        className="text-xs"
                                    >
                                        <ChevronsUpDown className="h-3.5 w-3.5 mr-1.5" />
                                        Expand All
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={collapseAll}
                                        className="text-xs"
                                    >
                                        <ChevronsDownUp className="h-3.5 w-3.5 mr-1.5" />
                                        Collapse
                                    </Button>
                                </div>
                            </div>

                            {/* Accordion sections */}
                            {steps.map((step) => (
                                <AccordionSection
                                    key={step.id}
                                    step={step}
                                    isExpanded={expandedSections.has(step.id)}
                                    onToggle={() => toggleSection(step.id)}
                                    isActive={activeSection === step.id}
                                >
                                    {renderSectionContent(step.id)}
                                </AccordionSection>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
