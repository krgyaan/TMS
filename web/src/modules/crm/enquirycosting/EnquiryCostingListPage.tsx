import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ColDef } from "ag-grid-community";
import DataTable from "@/components/ui/data-table";
import { Search, Eye, ExternalLink, CheckCircle, RefreshCw, XCircle } from "lucide-react";
import { paths } from "@/app/routes/paths";
import { useEnquiryCostings, useApproveCosting, useRedoCosting, useRejectEnquiryFromCosting } from "@/hooks/api/useEnquiryCosting";
import { ApproveCostingSheetModal } from "./components/ApproveCostingSheetModal";
import { RedoCostingDialog } from "./components/RedoCostingDialog";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import type { EnquiryCosting } from "./helpers/enquirycosting.type";
import { LeadEnquiryRejectModal } from "@/modules/crm/lead-enquiry/components/LeadEnquiryRejectModal";

const EnquiryCostingListPage = () => {
    const navigate = useNavigate();
    const approveCosting = useApproveCosting();
    const redoCosting = useRedoCosting();
    const rejectEnquiry = useRejectEnquiryFromCosting();

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

    const [approveModal, setApproveModal] = useState<{
        open: boolean;
        costing: EnquiryCosting | null;
    }>({ open: false, costing: null });

    const [redoDialog, setRedoDialog] = useState<{
        open: boolean;
        costingId: number | null;
    }>({ open: false, costingId: null });

    const [rejectModal, setRejectModal] = useState<{
        open: boolean;
        costingId: number | null;
        enquiryName?: string;
    }>({ open: false, costingId: null });

    const handleApproveConfirm = useCallback(async (data: {
        finalPrice?: string | null;
        receiptPreGst?: string | null;
        budgetPreGst?: string | null;
        grossMargin?: string | null;
        oemVendorId?: number | null;
        approvalRemarks?: string | null;
    }) => {
        if (!approveModal.costing) return;
        await approveCosting.mutateAsync({ id: approveModal.costing.id, data });
    }, [approveModal.costing, approveCosting]);

    const handleRedoConfirm = useCallback(async (reason: string) => {
        if (!redoDialog.costingId) return;
        await redoCosting.mutateAsync({ id: redoDialog.costingId, data: { reason } });
    }, [redoDialog.costingId, redoCosting]);

    const handleRejectConfirm = useCallback(async (enquiryId: number, reason?: string) => {
        if (!rejectModal.costingId) return;
        await rejectEnquiry.mutateAsync({ id: rejectModal.costingId, data: { reason: reason || null } });
    }, [rejectModal.costingId, rejectEnquiry]);

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
            label: "Approve",
            icon: <CheckCircle className="h-4 w-4 text-green-600" />,
            visible: (row) => row.status === 'Pending',
            onClick: (row) => setApproveModal({ open: true, costing: row }),
        },
        {
            label: "Redo Costing",
            icon: <RefreshCw className="h-4 w-4 text-amber-600" />,
            visible: (row) => row.status === 'Pending',
            onClick: (row) => setRedoDialog({ open: true, costingId: row.id }),
        },
        {
            label: "Reject Enquiry",
            icon: <XCircle className="h-4 w-4 text-red-600" />,
            onClick: (row) => setRejectModal({ open: true, costingId: row.id, enquiryName: row.enqName }),
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

            <ApproveCostingSheetModal
                open={approveModal.open}
                onOpenChange={(open) => setApproveModal({ ...approveModal, open })}
                costingId={approveModal.costing?.id ?? null}
                submittedValues={{
                    finalPrice: approveModal.costing?.finalPrice,
                    receiptPreGst: approveModal.costing?.receiptPreGst,
                    budgetPreGst: approveModal.costing?.budgetPreGst,
                    grossMargin: approveModal.costing?.grossMargin,
                }}
                onConfirm={handleApproveConfirm}
            />

            <RedoCostingDialog
                open={redoDialog.open}
                onOpenChange={(open) => setRedoDialog({ ...redoDialog, open })}
                costingId={redoDialog.costingId}
                onConfirm={handleRedoConfirm}
            />

            <LeadEnquiryRejectModal
                open={rejectModal.open}
                onOpenChange={(open) => setRejectModal({ ...rejectModal, open })}
                enquiryId={rejectModal.costingId}
                enquiryName={rejectModal.enquiryName}
                onConfirm={handleRejectConfirm}
            />
        </Card>
    );
};

export default EnquiryCostingListPage;