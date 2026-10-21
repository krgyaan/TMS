import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

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
                    isActive && "ring-2 ring-emerald-400 ring-offset-2 ring-offset-background"
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
                    isActive && "ring-2 ring-amber-400 ring-offset-2 ring-offset-background"
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
                <ChevronDown
                    className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0 ml-3",
                        isExpanded && "rotate-180"
                    )}
                />
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

export interface ShowPageLayoutProps {
    steps: StepConfig[];
    /** Which step is currently scrolled into view (used for ring highlight). */
    activeSection?: string;
    onSectionVisible?: (id: string) => void;
    expandedSections: Set<string>;
    onToggleSection: (id: string) => void;
    onExpandAll: () => void;
    onCollapseAll: () => void;
    onBack?: () => void;
    backLabel?: string;
    renderSectionContent: (stepId: string) => React.ReactNode;
    /** Optional right-side panel (e.g. status history) rendered next to the steps on desktop. */
    rightPanel?: React.ReactNode;
    /** @deprecated No longer used — kept for backward-compat only */
    onJump?: (id: string) => void;
}

export function ShowPageLayout({
    steps,
    activeSection,
    onSectionVisible,
    expandedSections,
    onToggleSection,
    onExpandAll,
    onCollapseAll,
    onBack,
    backLabel = "Back to List",
    renderSectionContent,
    rightPanel,
}: ShowPageLayoutProps) {
    const [internalActive, setInternalActive] = useState(steps[0]?.id ?? "");
    const currentActive = activeSection ?? internalActive;

    const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
    const isJumping = useRef(false);

    const panelRef = useRef<HTMLElement>(null);
    const panelHeightRef = useRef(0);
    const viewportRef = useRef(0);
    const scrollRef = useRef(0);
    const gridRef = useRef<HTMLDivElement>(null);
    const spacerRef = useRef<HTMLDivElement>(null);
    const [spacerHeight, setSpacerHeight] = useState(0);
    const hasRightPanel = Boolean(rightPanel);

    // Slide-up pinned panel: stays fixed at the top when it fits the viewport,
    // otherwise moves up with the page scroll until its bottom becomes visible.
    const PANEL_TOP = 80; // 64px header + 16px gap
    const BOTTOM_GAP = 16;

    useLayoutEffect(() => {
        if (!hasRightPanel) return;
        const el = panelRef.current;
        if (!el) return;

        const apply = () => {
            const available = viewportRef.current - PANEL_TOP - BOTTOM_GAP;
            const height = panelHeightRef.current;
            const top =
                height > available && available > 0
                    ? Math.max(PANEL_TOP - scrollRef.current, PANEL_TOP + available - height)
                    : PANEL_TOP;
            el.style.top = `${top}px`;
        };

        // The slide-up only travels as far as the page can scroll. When every
        // section is collapsed the page is short, so extend it with an empty
        // spacer until the full panel becomes reachable.
        const updateSpacer = () => {
            const available = viewportRef.current - PANEL_TOP - BOTTOM_GAP;
            const overflow = Math.max(0, panelHeightRef.current - available);
            const current = spacerRef.current?.offsetHeight ?? 0;
            const naturalMaxScroll = Math.max(
                0,
                document.documentElement.scrollHeight - window.innerHeight - current
            );
            const desired = Math.max(0, overflow - naturalMaxScroll);
            if (Math.abs(desired - current) > 1) setSpacerHeight(desired);
        };

        const measure = () => {
            const content = el.firstElementChild as HTMLElement | null;
            panelHeightRef.current = content?.offsetHeight ?? el.scrollHeight;
            viewportRef.current = window.innerHeight;
            apply();
            updateSpacer();
        };

        measure();
        const ro = new ResizeObserver(measure);
        const observed = el.firstElementChild;
        if (observed) ro.observe(observed);
        const gridEl = gridRef.current;
        if (gridEl) ro.observe(gridEl);
        window.addEventListener("resize", measure);

        let raf = 0;
        const onScroll = () => {
            if (raf) return;
            raf = requestAnimationFrame(() => {
                raf = 0;
                scrollRef.current = window.scrollY;
                apply();
            });
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();

        return () => {
            ro.disconnect();
            window.removeEventListener("resize", measure);
            window.removeEventListener("scroll", onScroll);
            if (raf) cancelAnimationFrame(raf);
        };
    }, [hasRightPanel]);

    // Scroll spy — keeps ring highlight in sync with viewport position
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (isJumping.current) return;
                const visible = entries.find((e) => e.isIntersecting);
                if (visible) {
                    const id = visible.target.id.replace("section-", "");
                    setInternalActive(id);
                    onSectionVisible?.(id);
                }
            },
            { rootMargin: "-20% 0px -70% 0px", threshold: [0, 0.1] }
        );

        for (const step of steps) {
            const el = document.getElementById(`section-${step.id}`);
            if (el) observer.observe(el);
        }

        return () => {
            observer.disconnect();
            if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
        };
    }, [steps, onSectionVisible]);

    const content = (
        <>
            {/* Sticky Header */}
            <div className="sticky top-[-1rem] z-30 bg-background py-4 -mt-4 border rounded-2xl border-primary transition-all">
                <div className="flex items-center justify-between px-4">
                    {onBack && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onBack}
                            className="-ml-2 text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            {backLabel}
                        </Button>
                    )}

                    <div className="flex items-center gap-2 ml-auto">
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
                </div>
            </div>

            {/* Sections */}
            <main className="space-y-6">
                {steps.map((step) => (
                    <AccordionSection
                        key={step.id}
                        step={step}
                        isActive={currentActive === step.id}
                        isExpanded={expandedSections.has(step.id)}
                        onToggle={() => onToggleSection(step.id)}
                    >
                        {renderSectionContent(step.id)}
                    </AccordionSection>
                ))}
            </main>
        </>
    );

    if (rightPanel) {
        return (
            <>
                <div ref={gridRef} className="space-y-8 xl:grid xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start xl:gap-6">
                    <div className="min-w-0 space-y-8">{content}</div>
                    <aside
                        ref={panelRef}
                        className="xl:fixed xl:right-4 xl:z-0 xl:w-[280px]"
                        style={{ top: PANEL_TOP }}
                    >
                        {rightPanel}
                    </aside>
                </div>
                <div
                    ref={spacerRef}
                    className="hidden xl:block"
                    style={{ height: spacerHeight }}
                    aria-hidden
                />
            </>
        );
    }

    return <div className="space-y-8">{content}</div>;
}
