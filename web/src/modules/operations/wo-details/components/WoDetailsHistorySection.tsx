import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWoDetailsHistory } from "@/hooks/api/useWoDetails";
import type { WoDetailsHistoryEntry } from "@/modules/operations/types/wo.types";
import {
    CheckCircle2,
    Clock,
    FilePlus2,
    RotateCcw,
    Save,
    Send,
    SkipForward,
} from "lucide-react";
import type { ReactNode } from "react";

const PAGE_LABELS: Record<number, string> = {
    1: "Project Handover",
    2: "Compliance Obligations",
    3: "SWOT Analysis",
    4: "Billing",
    5: "Project Execution",
    6: "Profitability",
    7: "WO Acceptance",
};

const ACTION_LABELS: Record<string, string> = {
    created: "Started",
    draft_saved: "Draft saved",
    page_saved: "Saved",
    page_submitted: "Completed",
    page_skipped: "Skipped",
    all_pages_submitted: "Submitted all steps",
    submitted_for_review: "Submitted for TL review",
    completion_reverted: "Completion reverted",
};

const ACTION_ICONS: Record<string, ReactNode> = {
    created: <FilePlus2 className="h-3.5 w-3.5" />,
    draft_saved: <Save className="h-3.5 w-3.5" />,
    page_saved: <Save className="h-3.5 w-3.5" />,
    page_submitted: <CheckCircle2 className="h-3.5 w-3.5" />,
    page_skipped: <SkipForward className="h-3.5 w-3.5" />,
    all_pages_submitted: <Send className="h-3.5 w-3.5" />,
    submitted_for_review: <Send className="h-3.5 w-3.5" />,
    completion_reverted: <RotateCcw className="h-3.5 w-3.5" />,
};

function formatTimestamp(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function actionLabel(entry: WoDetailsHistoryEntry) {
    const label = ACTION_LABELS[entry.action] ?? entry.action;
    return entry.actorName ? `${label} by ${entry.actorName}` : label;
}

function pageLabel(entry: WoDetailsHistoryEntry) {
    if (!entry.pageNo) return null;
    return PAGE_LABELS[entry.pageNo] ?? `Step ${entry.pageNo}`;
}

export function WoDetailsHistorySection({
    woDetailId,
    enabled = true,
}: {
    woDetailId: number | null;
    enabled?: boolean;
}) {
    const { data, isLoading, isError } = useWoDetailsHistory(woDetailId, enabled);

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    WO Details History
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-3">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                ) : isError ? (
                    <p className="text-sm text-muted-foreground">
                        Failed to load history.
                    </p>
                ) : !data || data.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                        No history yet.
                    </p>
                ) : (
                    <ol className="space-y-4">
                        {data.map((entry, index) => (
                            <li key={entry.id} className="relative flex gap-3">
                                {index < data.length - 1 && (
                                    <span className="absolute left-[11px] top-6 h-[calc(100%-8px)] w-px bg-border" />
                                )}
                                <span className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground">
                                    {ACTION_ICONS[entry.action] ?? <Clock className="h-3.5 w-3.5" />}
                                </span>
                                <div className="min-w-0 flex-1 space-y-1">
                                    <p className="text-sm font-medium leading-tight">
                                        {actionLabel(entry)}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                        {pageLabel(entry) && (
                                            <>
                                                <span>{pageLabel(entry)}</span>
                                                <span>·</span>
                                            </>
                                        )}
                                        <span>{formatTimestamp(entry.createdAt)}</span>
                                    </div>
                                    {entry.remarks && (
                                        <p className="text-xs text-muted-foreground italic">
                                            {entry.remarks}
                                        </p>
                                    )}
                                    {entry.statusAfter && (
                                        <Badge variant="outline" className="text-[10px] font-normal">
                                            {entry.statusAfter}
                                        </Badge>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ol>
                )}
            </CardContent>
        </Card>
    );
}
