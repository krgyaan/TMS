import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ColDef } from "ag-grid-community";
import DataTable from "@/components/ui/data-table";
import { formatINR } from "@/hooks/useINRFormatter";
import { formatDateTime } from "@/hooks/useFormatedDate";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import { EyeIcon, Pencil, Plus, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsTrigger, TabsList } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { usePaymentDashboard, usePaymentDashboardCounts } from "@/hooks/api/useEmds";
import { useNavigate } from "react-router-dom";
import { paths } from "@/app/routes/paths";
import { Button } from "@/components/ui/button";
import type { ActionItem } from "@/components/ui/ActionMenu";
import type { PendingTenderRowWithTimer, PaymentRequestRowWithTimer } from "./helpers/emdTenderFee.types";
import { tenderNameCol } from "@/components/data-grid";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TenderTimerDisplay } from "@/components/TenderTimerDisplay";

const TABS = [
    { value: 'pending', label: 'EMD Request Pending' },
    { value: 'sent', label: 'EMD Request Sent' },
    { value: 'approved', label: 'EMD Paid' },
    { value: 'rejected', label: 'EMD Rejected' },
    { value: 'returned', label: 'EMD Returned' },
    { value: 'tender-dnb', label: 'Tender DNB' },
] as const;

type TabValue = typeof TABS[number]['value'];

const STATUS_COLORS: Record<string, string> = {
    'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Sent': 'bg-blue-100 text-blue-800 border-blue-200',
    'Approved': 'bg-green-100 text-green-800 border-green-200',
    'Rejected': 'bg-red-100 text-red-800 border-red-200',
    'Returned': 'bg-purple-100 text-purple-800 border-purple-200',
};

const PURPOSE_COLORS: Record<string, string> = {
    'EMD': 'bg-blue-50 text-blue-700 border-blue-200',
    'Tender Fee': 'bg-green-50 text-green-700 border-green-200',
    'Processing Fee': 'bg-purple-50 text-purple-700 border-purple-200',
};

const INSTRUMENT_LABELS: Record<string, string> = {
    'DD': 'Demand Draft',
    'FDR': 'Fixed Deposit',
    'BG': 'Bank Guarantee',
    'Cheque': 'Cheque',
    'Bank Transfer': 'Bank Transfer',
    'Portal Payment': 'Portal Payment',
};

const EmdsAndTenderFeesPage = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabValue>('pending');
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [sortModel, setSortModel] = useState<{ colId: string; sort: 'asc' | 'desc' }[]>([]);

    useEffect(() => {
        setPagination(p => ({ ...p, pageIndex: 0 }));
    }, [activeTab]);

    const handleSortChanged = useCallback((event: any) => {
        const sortModel = event.api.getColumnState()
            .filter((col: any) => col.sort)
            .map((col: any) => ({
                colId: col.colId,
                sort: col.sort as 'asc' | 'desc'
            }));
        setSortModel(sortModel);
        setPagination(p => ({ ...p, pageIndex: 0 }));
    }, []);

    // Fetch dashboard data
    const { data: dashboardData, isLoading, error, refetch } = usePaymentDashboard(
        activeTab,
        { page: pagination.pageIndex + 1, limit: pagination.pageSize },
        { sortBy: sortModel[0]?.colId, sortOrder: sortModel[0]?.sort }
    );

    const { data: countsFromHook } = usePaymentDashboardCounts();
    // Use counts from dashboard response if available, otherwise fall back to separate counts hook
    const counts = dashboardData?.counts || countsFromHook;
    const totalRows = dashboardData?.meta?.total || dashboardData?.data?.length || 0;

    const pendingColDefs = useMemo<ColDef<PendingTenderRowWithTimer>[]>(() => [
        tenderNameCol<PendingTenderRowWithTimer>('tenderNo', {
            headerName: 'Tender Details',
            filter: true,
            width: 200,
        }),
        {
            field: 'gstValues',
            headerName: 'Tender Value',
            width: 130,
            cellRenderer: (params: any) => {
                return <span className="font-medium">{formatINR(Number(params.value) || 0)}</span>;
            },
        },
        {
            field: 'emd',
            headerName: 'EMD',
            width: 100,
            cellRenderer: (params: any) => {
                const amount = Number(params.value) || 0;
                if (amount <= 0) return <span className="text-gray-400">—</span>;
                return (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="font-medium">{formatINR(amount)}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{params.data?.emdMode}</p>
                        </TooltipContent>
                    </Tooltip>
                );
            },
        },
        {
            field: 'tenderFee',
            headerName: 'Tender Fee',
            width: 120,
            cellRenderer: (params: any) => {
                const amount = Number(params.value) || 0;
                if (amount <= 0) return <span className="text-gray-400">—</span>;
                return (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="font-medium">{formatINR(amount)}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{params.data?.tenderFeeMode}</p>
                        </TooltipContent>
                    </Tooltip>
                );
            },
        },
        {
            field: 'processingFee',
            headerName: 'Processing Fee',
            width: 140,
            cellRenderer: (params: any) => {
                const amount = Number(params.value) || 0;
                if (amount <= 0) return <span className="text-gray-400">—</span>;
                return (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="font-medium">{formatINR(amount)}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{params.data?.processingFeeMode}</p>
                        </TooltipContent>
                    </Tooltip>
                );
            },
        },
        {
            field: 'teamMemberName',
            headerName: 'Assigned To',
            width: 150,
            cellRenderer: (params: any) =>
                params.value || <span className="text-gray-400">Unassigned</span>,
        },
        {
            field: 'dueDate',
            headerName: 'Due Date',
            width: 140,
            cellRenderer: (params: any) => {
                if (!params.value) return <span className="text-gray-400">—</span>;
                const dueDate = new Date(params.value);
                const isOverdue = dueDate < new Date();
                const isUpcoming = dueDate <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
                return (
                    <span className={`${isOverdue ? 'text-red-600 font-medium' : isUpcoming ? 'text-orange-600' : ''}`}>
                        {formatDateTime(params.value)}
                    </span>
                );
            },
        },
        {
            field: 'statusName',
            headerName: 'Status',
            width: 150,
            cellRenderer: (params: any) => {
                return <Badge variant="outline" className={STATUS_COLORS[params.value] || ''}>{params.value}</Badge>;
            },
        },
        {
            field: 'timer',
            headerName: 'Timer',
            width: 110,
            cellRenderer: (params: any) => {
                const { data } = params;
                const timer = data?.timer;

                if (!timer) {
                    return <TenderTimerDisplay
                        remainingSeconds={0}
                        status="NOT_STARTED"
                    />;
                }

                return (
                    <TenderTimerDisplay
                        remainingSeconds={timer.remainingSeconds}
                        status={timer.status}
                    />
                );
            },
        },
        {
            headerName: '',
            filter: false,
            sortable: false,
            width: 57,
            cellRenderer: (params: any) => {
                const actions: ActionItem<PendingTenderRowWithTimer>[] = [
                    {
                        label: 'View Tender',
                        icon: <EyeIcon className="w-4 h-4" />,
                        onClick: (r) => navigate(paths.tendering.tenderView(r.tenderId)),
                    },
                ];
                // Only show "Create Request" for pending tab, not tender-dnb
                if (activeTab === 'pending') {
                    actions.unshift({
                        label: 'Create Request',
                        icon: <Plus className="w-4 h-4" />,
                        onClick: (r) => navigate(paths.tendering.emdsTenderFeesCreate(r.tenderId)),
                    });
                }
                const ActionRenderer = createActionColumnRenderer(actions);
                return <ActionRenderer data={params.data!} />;
            },
            pinned: 'right',
        },
    ], [navigate, activeTab]);

    const requestColDefs = useMemo<ColDef<PaymentRequestRowWithTimer>[]>(() => [
        tenderNameCol<PaymentRequestRowWithTimer>('tenderNo', {
            headerName: 'Tender Details',
            filter: true,
            width: 200,
        }),
        {
            field: 'purpose',
            headerName: 'Type',
            width: 130,
            cellRenderer: (params: any) => {
                const purpose = params.value as string;
                return (
                    <Badge variant="outline" className={`${PURPOSE_COLORS[purpose] || ''} font-medium`}>
                        {purpose}
                    </Badge>
                );
            },
        },
        {
            field: 'amountRequired',
            headerName: 'Amount',
            width: 100,
            cellRenderer: (params: any) =>
                params.value ? (
                    <span className="font-medium">{formatINR(params.value)}</span>
                ) : (
                    <span className="text-gray-400">—</span>
                ),
        },
        {
            field: 'instrumentType',
            headerName: 'Mode',
            width: 120,
            cellRenderer: (params: any) => {
                if (!params.value) return <span className="text-gray-400 text-sm">—</span>;
                return <span>{INSTRUMENT_LABELS[params.value] || params.value}</span>;
            },
        },
        {
            field: 'displayStatus',
            headerName: 'Status',
            width: 90,
            cellRenderer: (params: any) => {
                const status = params.value as string;
                return (
                    <Badge variant="outline" className={STATUS_COLORS[status] || ''}>
                        {status}
                    </Badge>
                );
            },
        },
        {
            field: 'dueDate',
            headerName: 'Due Date',
            width: 140,
            cellRenderer: (params: any) => {
                if (!params.value) return <span className="text-gray-400">—</span>;
                const dueDate = new Date(params.value);
                const isOverdue = dueDate < new Date();
                const isUpcoming = dueDate <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
                return (
                    <span className={`${isOverdue ? 'text-red-600 font-medium' : isUpcoming ? 'text-orange-600' : ''}`}>
                        {formatDateTime(params.value)}
                    </span>
                );
            },
        },
        {
            field: 'teamMemberName',
            headerName: 'Assigned To',
            width: 140,
            cellRenderer: (params: any) =>
                params.value || <span className="text-gray-400">Unassigned</span>,
        },
        {
            field: 'createdAt',
            headerName: 'Requested On',
            width: 140,
            cellRenderer: (params: any) => {
                return <span>{formatDateTime(params.value)}</span>;
            },
        },
        {
            field: 'timer',
            headerName: 'Timer',
            width: 110,
            cellRenderer: (params: any) => {
                const { data } = params;
                const timer = data?.timer;

                if (!timer) {
                    return <TenderTimerDisplay
                        remainingSeconds={0}
                        status="NOT_STARTED"
                    />;
                }

                return (
                    <TenderTimerDisplay
                        remainingSeconds={timer.remainingSeconds}
                        status={timer.status}
                    />
                );
            },
        },
        {
            headerName: '',
            filter: false,
            sortable: false,
            width: 57,
            cellRenderer: (params: any) => {
                const row = params.data!;
                const actions: ActionItem<PaymentRequestRowWithTimer>[] = [
                    {
                        label: 'View Details',
                        icon: <EyeIcon className="w-4 h-4" />,
                        onClick: (r) => navigate(paths.tendering.emdsTenderFeesView(r.tenderId)),
                    },
                ];

                // Add edit for Sent/Rejected
                if (activeTab === 'sent' || activeTab === 'rejected') {
                    actions.unshift({
                        label: activeTab === 'rejected' ? 'Resubmit' : 'Edit Request',
                        icon: activeTab === 'rejected' ? <RefreshCw className="w-4 h-4" /> : <Pencil className="w-4 h-4" />,
                        onClick: (r) => navigate(paths.tendering.emdsTenderFeesEdit(r.tenderId)),
                    });
                }

                const ActionRenderer = createActionColumnRenderer(actions);
                return <ActionRenderer data={row} />;
            },
            pinned: 'right',
        },
    ], [navigate, activeTab]);

    const columnDefs = (activeTab === 'pending' || activeTab === 'tender-dnb') ? pendingColDefs : requestColDefs;
    const tableData = dashboardData?.data || [];

    const renderTabTrigger = (tab: typeof TABS[number]) => {
        let count = 0;
        if (counts) {
            switch (tab.value) {
                case 'pending':
                    count = counts.pending ?? 0;
                    break;
                case 'sent':
                    count = counts.sent ?? 0;
                    break;
                case 'approved':
                    count = counts.approved ?? 0;
                    break;
                case 'rejected':
                    count = counts.rejected ?? 0;
                    break;
                case 'returned':
                    count = counts.returned ?? 0;
                    break;
                case 'tender-dnb':
                    count = counts.tenderDnb ?? 0;
                    break;
            }
        }
        return (
            <TabsTrigger key={tab.value} value={tab.value} className="relative">
                {tab.label}
                <Badge variant="secondary" className="ml-2 h-5 min-w-[20px] px-1.5 text-xs">
                    {count}
                </Badge>
            </TabsTrigger>
        );
    };

    if (isLoading && !dashboardData) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>EMDs, Tender Fees & Processing Fees</CardTitle>
                    <CardDescription>Track all payment requests for your assigned tenders</CardDescription>
                    <div className="mt-4">
                        <Skeleton className="h-10 w-[500px]" />
                    </div>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-12 w-full mb-4" />
                    <Skeleton className="h-96 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>EMDs, Tender Fees & Processing Fees</CardTitle>
                    <CardDescription>Error loading payment requests</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center gap-4 py-8">
                        <p className="text-red-500">Failed to load payment requests. Please try again.</p>
                        <Button variant="outline" onClick={() => refetch()}>
                            Retry
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>EMDs, Tender Fees & Processing Fees</CardTitle>
                        <CardDescription>
                            Track all payment requests for your assigned tenders
                            {counts && (
                                <span className="ml-2 text-muted-foreground">
                                    • {counts.total} total items
                                </span>
                            )}
                        </CardDescription>
                    </div>
                    <CardAction className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => navigate(paths.tendering.oldEmdsTenderFeesCreate())}>
                            <Plus className="w-4 h-4" />
                            Add Old Entries
                        </Button>
                        <Button variant="outline" onClick={() => navigate(paths.tendering.biOtherThanEmdsCreate())}>
                            <Plus className="w-4 h-4" />
                            BI Other Than EMDs
                        </Button>
                    </CardAction>
                </div>

            </CardHeader>

            <CardContent className="flex-1 px-0">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="flex flex-col w-full">
                    <div className="flex-none m-auto">
                        <TabsList>
                            {TABS.map(renderTabTrigger)}
                        </TabsList>
                    </div>
                    <div className="flex-1 min-h-0">
                        <DataTable
                            data={tableData}
                            loading={isLoading}
                            columnDefs={columnDefs as ColDef[]}
                            manualPagination={true}
                            rowCount={totalRows}
                            paginationState={pagination}
                            onPaginationChange={setPagination}
                            gridOptions={{
                                defaultColDef: {
                                    filter: true,
                                    resizable: true,
                                    sortable: true,
                                },
                                onSortChanged: handleSortChanged,
                                suppressRowClickSelection: true,
                                overlayNoRowsTemplate: `<span style="padding: 10px; text-align: center;">No ${activeTab} items found</span>`,
                            }}
                        />
                    </div>
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default EmdsAndTenderFeesPage;
