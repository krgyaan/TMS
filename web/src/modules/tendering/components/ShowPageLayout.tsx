import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Loader2, LayoutGrid, List, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ──────────────────────────────────────────────────────────────────────

export type StepStatus = "completed" | "in-progress" | "pending" | "loading";

export interface StepConfig {
    id: string;
    label: string;
    shortLabel: string;
    stepNumber: number;
    status: StepStatus;
    hasData: boolean;
    isLoading: boolean;
}

// ─── Step Status Dot ────────────────────────────────────────────────────────────

export function StepDot({
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

export function StepStatusBadge({ status }: { status: StepStatus }) {
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
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
            Pending
        </span>
    );
}

// ─── Dropdown Navigator (Unified Stepper) ───────────────────────────────────────
export function DropdownNavigator({
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
        <div className="relative w-full max-w-md">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full flex items-center justify-between px-4 py-3",
                    "bg-card border border-border shadow-sm rounded-xl text-sm text-foreground",
                    "hover:bg-accent hover:border-border/80 transition-all"
                )}
            >
                <div className="flex items-center gap-3">
                    <List className="h-4 w-4 text-primary" />
                    <span className="font-semibold">
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


// ─── Accordion Section Wrapper ──────────────────────────────────────────────────

export function AccordionSection({
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
                "rounded-xl border transition-all duration-200 scroll-mt-32",
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

export function OverviewCard({
    step,
    onClick,
    totalSteps = 8,
}: {
    step: StepConfig;
    onClick: () => void;
    totalSteps?: number;
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
                Step {step.stepNumber} of {totalSteps}
            </p>
        </button>
    );
}

// ─── Main Layout Component ──────────────────────────────────────────────────────

interface ShowPageLayoutProps {
    steps: StepConfig[];
    activeSection: string;
    onJump: (id: string) => void;
    onSectionVisible?: (id: string) => void;
    expandedSections: Set<string>;
    onToggleSection: (id: string) => void;
    onExpandAll: () => void;
    onCollapseAll: () => void;
    onBack?: () => void;
    backLabel?: string;
    renderSectionContent: (stepId: string) => React.ReactNode;
}

export function ShowPageLayout({
    steps,
    activeSection,
    onJump,
    onSectionVisible,
    expandedSections,
    onToggleSection,
    onExpandAll,
    onCollapseAll,
    onBack,
    backLabel = "Back to List",
    renderSectionContent,
}: ShowPageLayoutProps) {
    const [viewMode, setViewMode] = useState<"scroll" | "cards">("scroll");
    const isJumping = useRef(false);
    const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

    // Manual jump wrapper with lock
    const handleManualJump = (id: string) => {
        isJumping.current = true;
        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

        onJump(id);

    // Release lock after smooth scroll is likely finished
    scrollTimeout.current = setTimeout(() => {
      isJumping.current = false;
    }, 1000);
  };

  // Auto-scroll to active section on mount
  useEffect(() => {
    // Only scroll if it's not the first step (to avoid redundant scroll on normal load)
    // or if the user specifically requested a section
    if (activeSection && activeSection !== steps[0].id) {
      // Delay slightly to ensure DOM is ready
      const timer = setTimeout(() => {
        handleManualJump(activeSection);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

    // Scroll spy
    useEffect(() => {
        if (viewMode !== "scroll") return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (isJumping.current) return;

                // Find the entry that has the highest intersection ratio
                // or just pick the first one that is intersecting and visible in the active zone
                const visible = entries.find((e) => e.isIntersecting);
                if (visible) {
                    const id = visible.target.id.replace("section-", "");
                    onSectionVisible?.(id);
                }
            },
            {
                // Root margin values tailored for better center-of-screen detection
                rootMargin: "-20% 0px -70% 0px",
                threshold: [0, 0.1],
            }
        );

        for (const step of steps) {
            const el = document.getElementById(`section-${step.id}`);
            if (el) observer.observe(el);
        }

        return () => {
            observer.disconnect();
            if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
        };
    }, [viewMode, steps, onSectionVisible]);

    return (
        <div className="max-w-7xl mx-auto space-y-8 relative">
            {/* Header Area - Sticky */}
            <div className="sticky top-[-1rem] z-30 bg-background py-4 -mt-4 border-b border-border shadow-md transition-all">
                <div className="flex flex-col gap-6">
                    {onBack && (
                        <div className="flex items-center justify-between">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onBack}
                                className="-ml-2 text-muted-foreground hover:text-foreground"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                {backLabel}
                            </Button>

                            <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg border border-border/50">
                                <Button
                                    variant={viewMode === "scroll" ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => setViewMode("scroll")}
                                    className="h-8 text-xs gap-2"
                                >
                                    <List className="h-3.5 w-3.5" />
                                    Timeline View
                                </Button>
                                <Button
                                    variant={viewMode === "cards" ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => setViewMode("cards")}
                                    className="h-8 text-xs gap-2"
                                >
                                    <LayoutGrid className="h-3.5 w-3.5" />
                                    Overview
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Dropdown Navigator */}
                    <div className="flex justify-center sm:justify-start">
                        <DropdownNavigator
                            steps={steps}
                            activeSection={activeSection}
                            onJump={handleManualJump}
                        />
                    </div>
                </div>
            </div>


                {/* Main Content Area */}
                <main className="flex-1 min-w-0">
                    {viewMode === "cards" ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {steps.map((step) => (
                                <OverviewCard
                                    key={step.id}
                                    step={step}
                                    totalSteps={steps.length}
                                    onClick={() => {
                                        onJump(step.id);
                                        setViewMode("scroll");
                                    }}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-end gap-3 mb-2">
                                <Button
                                    variant="link"
                                    size="sm"
                                    onClick={onExpandAll}
                                    className="text-xs h-auto p-0 text-muted-foreground hover:text-primary"
                                >
                                    Expand all
                                </Button>
                                <div className="w-px h-3 bg-border" />
                                <Button
                                    variant="link"
                                    size="sm"
                                    onClick={onCollapseAll}
                                    className="text-xs h-auto p-0 text-muted-foreground hover:text-primary"
                                >
                                    Collapse all
                                </Button>
                            </div>

                            <div className="space-y-6">
                                {steps.map((step) => (
                                    <AccordionSection
                                        key={step.id}
                                        step={step}
                                        isActive={activeSection === step.id}
                                        isExpanded={expandedSections.has(step.id)}
                                        onToggle={() => onToggleSection(step.id)}
                                    >
                                        {renderSectionContent(step.id)}
                                    </AccordionSection>
                                ))}
                            </div>
                        </div>
                    )}
                </main>
        </div>
    );
}
