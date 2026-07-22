import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ColDef } from "ag-grid-community";
import DataTable from "@/components/ui/data-table";
import { Plus, Search, Pencil, Eye, Trash2 } from "lucide-react";
import { paths } from "@/app/routes/paths";
import { useLeadEnquiries, useDeleteLeadEnquiry } from "@/hooks/api/useLeadEnquiry";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import type { LeadEnquiryWithNames } from "./helpers/lead-enquiry.type";

const EnquiryListPage = () => {
    const navigate = useNavigate();

    const {
        search, setSearch, debouncedSearch,
        pagination, setPagination,
        sortModel, handleSortChanged, handlePageSizeChange,
    } = usePersistentTableState({
        storageKey: 'lead-enquiries',
    });

    const { data: apiResponse, isLoading } = useLeadEnquiries(
        { page: pagination.pageIndex + 1, limit: pagination.pageSize, search: debouncedSearch || undefined },
        { sortBy: sortModel[0]?.colId, sortOrder: sortModel[0]?.sort }
    );

    const enquiries = apiResponse?.data || [];
    const totalRows = apiResponse?.meta?.total || 0;

    const enquiryActions: ActionItem<LeadEnquiryWithNames>[] = [
        {
            label: "View",
            onClick: (row) => navigate(paths.crm.enquiryView(row.id)),
            icon: <Eye className="h-4 w-4" />,
        },
        {
            label: "Edit",
            onClick: (row) => navigate(paths.crm.enquiryEdit(row.id)),
            icon: <Pencil className="h-4 w-4" />,
        },
        {
            label: "Delete",
            className: "text-red-600",
            onClick: (row) => {
                if (confirm(`Delete enquiry "${row.enqName}"?`)) {
                    deleteEnquiry.mutate(row.id);
                }
            },
            icon: <Trash2 className="h-4 w-4 text-red-600" />,
        },
    ];

    const colDefs = useMemo<ColDef<LeadEnquiryWithNames>[]>(() => [
        { field: "enquiryNumber", headerName: "Enquiry No", width: 140 },
        { field: "enqName", headerName: "Enquiry Name", width: 220 },
        { field: "organizationName", headerName: "Organization", width: 180 },
        { field: "itemName", headerName: "Item", width: 160 },
        { field: "locationCode", headerName: "Location", width: 120 },
        { field: "approxValue", headerName: "Approx Value", width: 130 },
        {
            field: "status",
            headerName: "Status",
            width: 120,
            cellRenderer: (params: any) => params.value || "-",
        },
        { field: "leadName", headerName: "Lead", width: 160 },
        {
            field: "createdAt",
            headerName: "Created At",
            width: 150,
            valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : "-",
        },
        {
            headerName: "Action",
            cellRenderer: createActionColumnRenderer(enquiryActions),
            pinned: "right",
            width: 80,
        },
    ], [enquiryActions]);

    return (
        <Card className="min-h-[calc(100vh-2rem)] flex flex-col border-0 shadow-none">
            <CardHeader className="flex-none pb-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <CardTitle>Enquiries</CardTitle>
                        <CardDescription>Manage all enquiries</CardDescription>
                    </div>
                    <Button onClick={() => navigate(paths.crm.enquiryCreate)} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" /> Add Enquiry
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 px-0">
                <div className="flex items-center justify-end px-6 pb-4">
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search enquiries..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8 w-64"
                        />
                    </div>
                </div>
                <DataTable
                    data={enquiries}
                    loading={isLoading}
                    columnDefs={colDefs}
                    manualPagination={true}
                    rowCount={totalRows}
                    paginationState={pagination}
                    onPaginationChange={setPagination}
                    onPageSizeChange={handlePageSizeChange}
                    showTotalCount={true}
                    showLengthChange={true}
                    gridOptions={{
                        defaultColDef: { filter: true, sortable: true },
                        onSortChanged: handleSortChanged,
                    }}
                    enableFiltering={true}
                    enableSorting={true}
                />
            </CardContent>
        </Card>
    );
};

export default EnquiryListPage;
