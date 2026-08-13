import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { CustomCellRendererProps } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { Eye, Search, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/ui/data-table";
import { paths } from "@/app/routes/paths";
import { useServiceFeedbackList } from "@/hooks/api/useServiceFeedback";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { cn } from "@/lib/utils";
import { StarRatingInput } from "@/components/StarRatingInput";
import type { ServiceFeedbackListItemWithFeedback } from "./helpers/service-feedback.types";

export default function ServiceFeedbackListPage() {
    const navigate = useNavigate();
    const { data: feedbacks = [], isLoading } = useServiceFeedbackList();

    const { search, setSearch, debouncedSearch } = usePersistentTableState({
        storageKey: "service-customer-feedback-list",
        defaultTab: "all",
    });

    const rows = useMemo(() => {
        const query = debouncedSearch.trim().toLowerCase();
        return feedbacks.filter(row => {
            if (!row.hasFeedback || !row.feedbackId) return false;
            if (!query) return true;
            return [row.ticketNo, row.suggestions]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(query);
        });
    }, [feedbacks, debouncedSearch]);

    const actions: ActionItem<ServiceFeedbackListItemWithFeedback>[] = [
        {
            label: "View",
            onClick: row => {
                if (row.feedbackId) {
                    navigate(paths.services.feedbackView(row.feedbackId));
                }
            },
            icon: <Eye className="h-4 w-4" />,
        },
    ];

    const colDefs = useMemo<ColDef<ServiceFeedbackListItemWithFeedback>[]>(() => {
        return [
            { field: "ticketNo", headerName: "Ticket No.", width: 150 },
            {
                colId: "problem",
                headerName: "Problem Resolved",
                width: 160,
                sortable: false,
                cellRenderer: (params: CustomCellRendererProps<ServiceFeedbackListItemWithFeedback>) => {
                    const value = params.data?.problemResolved;
                    if (!value) return <span className="text-muted-foreground">—</span>;
                    return (
                        <Badge
                            className={cn(
                                "capitalize",
                                value === "1"
                                    ? "bg-emerald-100 text-emerald-800 border-transparent"
                                    : "bg-rose-100 text-rose-800 border-transparent",
                            )}
                        >
                            {value === "1" ? "Yes" : "No"}
                        </Badge>
                    );
                },
            },
            {
                colId: "rating",
                headerName: "Satisfaction",
                width: 160,
                sortable: false,
                cellRenderer: (params: CustomCellRendererProps<ServiceFeedbackListItemWithFeedback>) => {
                    const value = params.data?.satisfaction;
                    if (!value) return <span className="text-muted-foreground">—</span>;
                    return (
                        <div className="flex items-center gap-1">
                            <StarRatingInput value={value} readonly size="sm" />
                            <span className="text-xs text-muted-foreground">{value}/5</span>
                        </div>
                    );
                },
            },
            {
                field: "suggestions",
                headerName: "Suggestions",
                minWidth: 220,
                cellRenderer: (params: CustomCellRendererProps<ServiceFeedbackListItemWithFeedback>) => {
                    const value = params.data?.suggestions;
                    if (!value) return <span className="text-muted-foreground">—</span>;
                    return (
                        <span className="truncate text-sm text-muted-foreground block max-w-[300px]" title={value}>
                            {value}
                        </span>
                    );
                },
            },
            {
                colId: "actions",
                headerName: "Actions",
                width: 100,
                pinned: "right",
                sortable: false,
                filter: false,
                cellRenderer: createActionColumnRenderer(actions),
            },
        ];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigate]);

    return (
        <Card className="min-h-[calc(100vh-2rem)] flex flex-col border-0 shadow-none">
            <CardHeader className="flex-none pb-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <CardTitle>Customer Feedback</CardTitle>
                        <CardDescription>Feedbacks collected from customers</CardDescription>
                    </div>
                    <Button onClick={() => navigate(paths.services.feedbackForm)}>
                        <Plus className="h-4 w-4 mr-1" /> Add Feedback
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="flex-1 px-0">
                <div className="flex items-center gap-4 px-6 pb-4">
                    <div className="flex-1 flex justify-end">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search customer feedback..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-8 w-64"
                            />
                        </div>
                    </div>
                </div>

                <DataTable
                    data={rows}
                    loading={isLoading}
                    columnDefs={colDefs}
                    gridOptions={{
                        defaultColDef: { filter: true, sortable: true },
                        pagination: true,
                    }}
                    enablePagination={true}
                />
            </CardContent>
        </Card>
    );
}