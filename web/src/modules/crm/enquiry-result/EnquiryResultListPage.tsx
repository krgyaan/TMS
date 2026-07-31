import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { ColDef } from "ag-grid-community";
import { useEnquiryResults } from "@/hooks/api/useEnquiryResult";
import DataTable from "@/components/ui/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { EnquiryResultWithDetails } from "./helpers/enquiry-result.type";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";

function formatDateTime(dateStr?: string | null) {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatPrice(price?: string | null) {
    if (!price) return "—";
    return `₹${price}`;
}

function getStatusVariant(status?: string | null): "default" | "secondary" | "outline" | "destructive" {
    switch (status) {
        case "Quotation Submitted": return "default";
        case "Won": return "default";
        case "Lost": return "destructive";
        default: return "outline";
    }
}

export default function EnquiryResultListPage() {
    const navigate = useNavigate();
    const { search, debouncedSearch, pagination, setPagination, handlePageSizeChange, setSearch } = usePersistentTableState({
        storageKey: 'enquiry-result-list',
        defaultTab: 'all',
    });

    const { data, isLoading } = useEnquiryResults({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: debouncedSearch || undefined,
    });

    const actions = useMemo<ActionItem<EnquiryResultWithDetails>[]>(() => [
        {
            label: "View",
            onClick: (row) => navigate(`/crm/enquiry-results/${row.id}`),
        },
        {
            label: "Initiate Followup",
            onClick: (row) => navigate(`/crm/enquiry-results/followup/${row.id}`),
        },
        {
            label: "Upload Result",
            onClick: () => { /* Placeholder */ },
        },
    ], [navigate]);

    const columnDefs = useMemo<ColDef<EnquiryResultWithDetails>[]>(() => [
        {
            field: 'enquiryNumber',
            headerName: 'Enquiry No.',
            width: 140,
        },
        {
            field: 'enqName',
            headerName: 'Enquiry Name',
            width: 220,
        },
        {
            field: 'createdByName',
            headerName: 'BD Lead',
            width: 160,
        },
        {
            field: 'quoteSubmissionDatetime',
            headerName: 'Quote Submission Date',
            width: 170,
            cellRenderer: (params: { value?: string | null }) => formatDateTime(params.value),
        },
        {
            field: 'finalPrice',
            headerName: 'Final Price',
            width: 130,
            cellRenderer: (params: { value?: string | null }) => formatPrice(params.value),
        },
        {
            field: 'itemName',
            headerName: 'Item',
            width: 180,
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 170,
            cellRenderer: (params: { value?: string | null }) => (
                <Badge variant={getStatusVariant(params.value)}>{params.value || "—"}</Badge>
            ),
        },
        {
            field: 'id',
            headerName: 'Actions',
            width: 100,
            pinned: 'right' as const,
            cellRenderer: createActionColumnRenderer(actions),
            sortable: false,
        },
    ], [actions]);

    return (
        <Card className="min-h-[calc(100vh-2rem)] flex flex-col border-0 shadow-none">
            <CardHeader className="flex-none pb-4">
                <CardTitle>Enquiry Results</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 px-0">
                <div className="flex items-center px-6 pb-4">
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search enquiry results..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8 w-64"
                        />
                    </div>
                </div>
                <DataTable
                    data={data?.data ?? []}
                    columnDefs={columnDefs}
                    loading={isLoading}
                    manualPagination
                    rowCount={data?.meta?.total ?? 0}
                    paginationState={pagination}
                    onPaginationChange={setPagination}
                    onPageSizeChange={handlePageSizeChange}
                    showTotalCount
                    showLengthChange
                />
            </CardContent>
        </Card>
    );
}
