import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ColDef } from "ag-grid-community";
import DataTable from "@/components/ui/data-table";
import { Search, Eye, ExternalLink } from "lucide-react";
import { paths } from "@/app/routes/paths";
import { useEnquiryCostings, useSubmitCostingSheet } from "@/hooks/api/useEnquiryCosting";
import { SubmitCostingSheetModal } from "./components/SubmitCostingSheetModal";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import type { EnquiryCosting } from "./helpers/enquirycosting.type";
import { toast } from "sonner";

const EnquiryCostingListPage = () => {
    const navigate = useNavigate();
    const submitCostingSheet = useSubmitCostingSheet();

    const {
        search, setSearch, debouncedSearch,
        pagination, setPagination,
        sortModel, handleSortChanged, handlePageSizeChange,
    } = usePersistentTableState({
        storageKey: 'enquiry-costings',
        defaultTab: 'all',
    });

    const { data: apiResponse, isLoading } = useEnquiryCostings(
        { page: pagination.pageIndex + 1, limit: pagination.pageSize, search: debouncedSearch || undefined },
        { sortBy: sortModel[0]?.colId, sortOrder: sortModel[0]?.sort }
    );

    const costings = apiResponse?.data || [];
    const totalRows = apiResponse?.meta?.total || 0;

    const [submitCostingModal, setSubmitCostingModal] = useState<{
        open: boolean;
        enquiryId: number | null;
        enquiryName?: string;
    }>({ open: false, enquiryId: null });

    const handleSubmitCostingConfirm = async (data: {
        enquiryId: number;
        finalPrice?: string | null;
        receiptPreGst?: string | null;
        budgetPreGst?: string | null;
        grossMargin?: string | null;
        remarks?: string | null;
    }) => {
        await submitCostingSheet.mutateAsync(data);
    };

    const costingActions: ActionItem<EnquiryCosting>[] = [
        {
            label: "View",
            onClick: (row) => navigate(paths.crm.enquiryView(row.enquiryId)),
            icon: <Eye className="h-4 w-4" />,
        },
        {
            label: "Open Costing Sheet",
            icon: <ExternalLink className="h-4 w-4" />,
            visible: (row) => !!row.sheetUrl,
            onClick: (row) => window.open(row.sheetUrl!, '_blank'),
        },
        {
            label: "Submit Costing Sheet",
            icon: <ExternalLink className="h-4 w-4" />,
            visible: (row) => row.status !== 'Costing Sheet Submitted',
            onClick: (row) => setSubmitCostingModal({ open: true, enquiryId: row.enquiryId, enquiryName: row.enqName }),
        },
    ];

    const colDefs = useMemo<ColDef<EnquiryCosting>[]>(() => [
        { field: "enquiryNumber", headerName: "Enquiry No.", width: 140 },
        { field: "enqName", headerName: "Enquiry Name", width: 200 },
        { field: "createdByName", headerName: "BD Lead", width: 150 },
        { field: "organizationName", headerName: "Company Name", width: 180 },
        { field: "orgAbbName", headerName: "Organisation Name", width: 150 },
        { field: "approxValue", headerName: "Approx. Value (GST Inclusive)", width: 180 },
        {
            field: "finalPrice",
            headerName: "Final Price (GST Inclusive)",
            width: 170,
            cellRenderer: (params: any) => params.value ? `₹${params.value}` : "-",
        },
        {
            field: "budgetPreGst",
            headerName: "Budget",
            width: 140,
            cellRenderer: (params: any) => params.value ? `₹${params.value}` : "-",
        },
        {
            field: "grossMargin",
            headerName: "Gross Margin %",
            width: 130,
            cellRenderer: (params: any) => params.value ? `${params.value}%` : "-",
        },
        { field: "preparedByName", headerName: "Private TE Name", width: 150 },
        {
            field: "status",
            headerName: "Status",
            width: 170,
            cellRenderer: (params: any) => params.value || "-",
        },
        {
            headerName: "Action",
            cellRenderer: createActionColumnRenderer(costingActions),
            pinned: "right",
            width: 80,
        },
    ], [costingActions]);

    return (
        <Card className="min-h-[calc(100vh-2rem)] flex flex-col border-0 shadow-none">
            <CardHeader className="flex-none pb-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <CardTitle>Costing Approval Dashboard</CardTitle>
                        <CardDescription>Manage all enquiry costings</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 px-0">
                <div className="flex items-center justify-end px-6 pb-4">
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search costings..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8 w-64"
                        />
                    </div>
                </div>
                <DataTable
                    data={costings}
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

            <SubmitCostingSheetModal
                open={submitCostingModal.open}
                onOpenChange={(open) => setSubmitCostingModal({ ...submitCostingModal, open })}
                enquiryId={submitCostingModal.enquiryId}
                enquiryName={submitCostingModal.enquiryName}
                onConfirm={handleSubmitCostingConfirm}
            />
        </Card>
    );
};

export default EnquiryCostingListPage;
