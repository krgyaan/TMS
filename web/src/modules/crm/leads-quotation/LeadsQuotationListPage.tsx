import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { ColDef } from "ag-grid-community";
import DataTable from "@/components/ui/data-table";
import { Search, Eye, ExternalLink, Upload, XCircle } from "lucide-react";
import { paths } from "@/app/routes/paths";
import { useLeadsQuotations, useUpdateQuote } from "@/hooks/api/useLeadsQuotation";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import type { PrivateQuote } from "./helpers/leads-quotation.type";
import { cn } from "@/lib/utils";
import { TenderTimerDisplay } from "@/components/TenderTimerDisplay";
import { QuoteSubmissionModal } from "./components/QuoteSubmissionModal";
import { QuotationDroppedModal } from "./components/QuotationDroppedModal";

type TabKey = "pending" | "submitted" | "dropped";

const STATUS_TABS: { key: TabKey; label: string; status: string }[] = [
    { key: 'pending', label: 'Pending', status: 'Submission Pending' },
    { key: 'submitted', label: 'Submitted', status: 'Quotation Submitted' },
    { key: 'dropped', label: 'Dropped', status: 'Quotation Dropped' },
];

const TAB_TO_STATUS: Record<TabKey, string> = {
    pending: 'Submission Pending',
    submitted: 'Quotation Submitted',
    dropped: 'Quotation Dropped',
};

const HOURS_24_MS = 24 * 60 * 60 * 1000;

function getQuoteTimer(quote: PrivateQuote) {
    const status = quote.status;
    if (status === 'Quotation Submitted' || status === 'Quotation Dropped') {
        return { status: 'COMPLETED' as const, remainingSeconds: 0, deadline: null };
    }
    if (status === 'Submission Pending' && quote.createdAt) {
        const deadline = new Date(new Date(quote.createdAt).getTime() + HOURS_24_MS);
        return { status: 'RUNNING' as const, remainingSeconds: 0, deadline };
    }
    return { status: 'NOT_STARTED' as const, remainingSeconds: 0, deadline: null };
}

const LeadsQuotationListPage = () => {
    const navigate = useNavigate();
    const updateQuote = useUpdateQuote();

    const {
        activeTab, setActiveTab,
        search, setSearch, debouncedSearch,
        pagination, setPagination,
        sortModel, handleSortChanged, handlePageSizeChange,
    } = usePersistentTableState<TabKey>({
        storageKey: 'leads-quotations',
        defaultTab: 'pending',
    });

    const statusParam = TAB_TO_STATUS[activeTab];

    const { data: pendingResponse } = useLeadsQuotations(
        { page: 1, limit: 1, status: 'Submission Pending' },
    );
    const { data: submittedResponse } = useLeadsQuotations(
        { page: 1, limit: 1, status: 'Quotation Submitted' },
    );
    const { data: droppedResponse } = useLeadsQuotations(
        { page: 1, limit: 1, status: 'Quotation Dropped' },
    );

    const pendingCount = pendingResponse?.meta?.total ?? 0;
    const submittedCount = submittedResponse?.meta?.total ?? 0;
    const droppedCount = droppedResponse?.meta?.total ?? 0;

    const getCount = (key: TabKey) => {
        if (key === 'pending') return pendingCount;
        if (key === 'submitted') return submittedCount;
        return droppedCount;
    };

    const { data: apiResponse, isLoading } = useLeadsQuotations(
        {
            page: pagination.pageIndex + 1,
            limit: pagination.pageSize,
            search: debouncedSearch || undefined,
            status: statusParam,
        },
        { sortBy: sortModel[0]?.colId, sortOrder: sortModel[0]?.sort }
    );

    const quotes = apiResponse?.data || [];
    const totalRows = apiResponse?.meta?.total || 0;

    const [submissionModal, setSubmissionModal] = useState<{
        open: boolean;
        quote: PrivateQuote | null;
    }>({ open: false, quote: null });

    const [droppedModal, setDroppedModal] = useState<{
        open: boolean;
        quote: PrivateQuote | null;
    }>({ open: false, quote: null });

    const handleSubmissionConfirm = useCallback(async (data: {
        quoteSubmissionDatetime: string;
        submittedDocuments: string;
        contacts: import("@/modules/crm/leads-quotation/helpers/leads-quotation.type").ContactEntry[];
    }) => {
        if (!submissionModal.quote) return;
        await updateQuote.mutateAsync({
            id: submissionModal.quote.id,
            data: { ...data, status: 'Quotation Submitted' },
        });
    }, [submissionModal.quote, updateQuote]);

    const handleDroppedConfirm = useCallback(async (data: {
        missedReason: string;
        oemVendorId: number | null;
        preventRepeat: string;
        tmsImprovement: string;
    }) => {
        if (!droppedModal.quote) return;
        await updateQuote.mutateAsync({
            id: droppedModal.quote.id,
            data: { ...data, status: 'Quotation Dropped' },
        });
    }, [droppedModal.quote, updateQuote]);

    const quoteActions: ActionItem<PrivateQuote>[] = [
        {
            label: "View",
            onClick: (row) => navigate(paths.crm.leadsQuotationView(row.id)),
            icon: <Eye className="h-4 w-4" />,
        },
        {
            label: "Open Locked Costing Sheet",
            icon: <ExternalLink className="h-4 w-4" />,
            visible: (row) => !!row.sheetUrl,
            onClick: (row) => window.open(row.sheetUrl!, '_blank'),
        },
        {
            label: "Quote Submission",
            icon: <Upload className="h-4 w-4 text-blue-600" />,
            visible: (row) => row.status === 'Submission Pending',
            onClick: (row) => setSubmissionModal({ open: true, quote: row }),
        },
        {
            label: "Quotation Dropped",
            icon: <XCircle className="h-4 w-4 text-red-600" />,
            visible: (row) => row.status === 'Submission Pending',
            onClick: (row) => setDroppedModal({ open: true, quote: row }),
        },
    ];

    const colDefs = useMemo<ColDef<PrivateQuote>[]>(() => [
        { field: "enquiryNumber", headerName: "Enquiry No.", width: 140 },
        { field: "enqName", headerName: "Enquiry Name", width: 200 },
        { field: "approxValue", headerName: "Approx Value (GST Inclusive)", width: 180 },
        {
            headerName: "Final Price",
            width: 150,
            cellRenderer: (params: any) => {
                const row = params.data as PrivateQuote;
                const val = row.approvedFinalPrice || row.finalPrice;
                return val ? `₹${val}` : "-";
            },
        },
        {
            field: "status",
            headerName: "Status",
            width: 180,
            cellRenderer: (params: any) => {
                const val = params.value || "-";
                let variant: "default" | "secondary" | "outline" = "secondary";
                let colorClass = "";
                if (val === 'Submission Pending') { variant = "secondary"; }
                else if (val === 'Quotation Submitted') { variant = "default"; colorClass = "bg-blue-600 hover:bg-blue-600"; }
                else if (val === 'Quotation Dropped') { variant = "outline"; colorClass = "bg-red-100 text-red-700 hover:bg-red-100 border-red-300"; }
                return (
                    <Badge variant={variant} className={cn(colorClass)}>
                        {val}
                    </Badge>
                );
            },
        },
        {
            headerName: "Timer",
            width: 130,
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
            cellRenderer: (params: any) => {
                const quote = params.data as PrivateQuote;
                const timer = getQuoteTimer(quote);
                return (
                    <TenderTimerDisplay
                        remainingSeconds={timer.remainingSeconds}
                        status={timer.status}
                        deadline={timer.deadline}
                    />
                );
            },
        },
        {
            headerName: "Action",
            cellRenderer: createActionColumnRenderer(quoteActions),
            pinned: "right",
            width: 130,
        },
    ], [quoteActions]);

    return (
        <Card className="min-h-[calc(100vh-2rem)] flex flex-col border-0 shadow-none">
            <CardHeader className="flex-none pb-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <CardTitle>Quote Submission Dashboard</CardTitle>
                        <CardDescription>Manage all quotation submissions</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 px-0">
                <div className="flex items-center justify-between px-6 pb-4">
                    <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                        {STATUS_TABS.map(tab => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setActiveTab(tab.key)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                    activeTab === tab.key
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {tab.label}
                                <Badge
                                    variant="secondary"
                                    className={cn(
                                        "text-xs h-4 min-w-4 px-1",
                                        activeTab === tab.key && "bg-primary/10 text-primary"
                                    )}
                                >
                                    {getCount(tab.key)}
                                </Badge>
                            </button>
                        ))}
                    </div>
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search quotations..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8 w-64"
                        />
                    </div>
                </div>
                <DataTable
                    data={quotes}
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

            <QuoteSubmissionModal
                open={submissionModal.open}
                onOpenChange={(open) => setSubmissionModal({ ...submissionModal, open })}
                quote={submissionModal.quote}
                onConfirm={handleSubmissionConfirm}
            />

            <QuotationDroppedModal
                open={droppedModal.open}
                onOpenChange={(open) => setDroppedModal({ ...droppedModal, open })}
                quote={droppedModal.quote}
                onConfirm={handleDroppedConfirm}
            />
        </Card>
    );
};

export default LeadsQuotationListPage;