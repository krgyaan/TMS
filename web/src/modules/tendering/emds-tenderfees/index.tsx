import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import DataTable from "@/components/ui/data-table";
import { formatINR } from "@/hooks/useINRFormatter";
import { formatDateTime } from "@/hooks/useFormatedDate";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import { EyeIcon, Pencil, Plus, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsTrigger, TabsList } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { usePaymentDashboard } from "@/hooks/api/useEmds";
import { useNavigate } from "react-router-dom";
import { paths } from "@/app/routes/paths";
import { Button } from "@/components/ui/button";
import type { ActionItem } from "@/components/ui/ActionMenu";
import type { DashboardRow } from "@/services/api/emds.service";

// Tab configuration with status mappings
const TABS = [
    { value: 'pending', label: 'Pending' },
    { value: 'sent', label: 'Sent' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'returned', label: 'Returned' },
] as const;

// Status badge colors
const STATUS_COLORS: Record<string, string> = {
    'Not Created': 'bg-gray-100 text-gray-800 border-gray-200',
    'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Sent': 'bg-blue-100 text-blue-800 border-blue-200',
    'Requested': 'bg-blue-100 text-blue-800 border-blue-200',
    'Approved': 'bg-green-100 text-green-800 border-green-200',
    'Rejected': 'bg-red-100 text-red-800 border-red-200',
    'Returned': 'bg-purple-100 text-purple-800 border-purple-200',
};

// Purpose badge colors
const PURPOSE_COLORS: Record<string, string> = {
    'EMD': 'bg-blue-50 text-blue-700 border-blue-200',
    'Tender Fee': 'bg-green-50 text-green-700 border-green-200',
    'Processing Fee': 'bg-purple-50 text-purple-700 border-purple-200',
};

// Instrument type display
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
    const [activeTab, setActiveTab] = useState<string>('pending');

    // Fetch dashboard data with counts
    const {
        data: dashboardData,
        isLoading,
        error,
    } = usePaymentDashboard(activeTab);

    // Get actions based on row type and status
    const getActionsForRow = (row: DashboardRow): ActionItem<DashboardRow>[] => {
        if (row.type === 'missing') {
            // No request exists - show Create action
            return [
                {
                    label: 'Create Request',
                    icon: <Plus className="w-4 h-4" />,
                    onClick: (r) => navigate(
                        `${paths.tendering.emdsTenderFeesCreate(r.tenderId)}?purpose=${encodeURIComponent(r.purpose)}`
                    ),
                },
                {
                    label: 'View Tender',
                    icon: <EyeIcon className="w-4 h-4" />,
                    onClick: (r) => navigate(paths.tendering.tenderView(r.tenderId)),
                },
            ];
        }

        // Request exists - show Edit/View actions
        const actions: ActionItem<DashboardRow>[] = [
            {
                label: 'View Details',
                icon: <EyeIcon className="w-4 h-4" />,
                onClick: (r) => navigate(paths.tendering.emdsTenderFeesView(r.id!)),
            },
        ];

        // Only allow edit if status is Pending or Rejected
        if (row.status === 'Pending' || row.status === 'Rejected') {
            actions.unshift({
                label: 'Edit Request',
                icon: <Pencil className="w-4 h-4" />,
                onClick: (r) => navigate(paths.tendering.emdsTenderFeesEdit(r.id!)),
            });
        }

        return actions;
    };

    // Column definitions
    const colDefs = useMemo<ColDef<DashboardRow>[]>(() => [
        {
            field: 'tenderNo',
            headerName: 'Tender No',
            width: 150,
            cellRenderer: (params: ICellRendererParams<DashboardRow>) => (
                <span className="font-medium text-primary hover:underline cursor-pointer"
                    onClick={() => navigate(paths.tendering.tenderView(params.data!.tenderId))}>
                    {params.value}
                </span>
            ),
        },
        {
            field: 'tenderName',
            headerName: 'Tender Name',
            flex: 2,
            minWidth: 200,
            cellRenderer: (params: ICellRendererParams<DashboardRow>) => (
                <span className="truncate" title={params.value}>
                    {params.value || <span className="text-gray-400">—</span>}
                </span>
            ),
        },
        {
            field: 'purpose',
            headerName: 'Payment Type',
            width: 140,
            cellRenderer: (params: ICellRendererParams<DashboardRow>) => {
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
            width: 130,
            cellRenderer: (params: ICellRendererParams<DashboardRow>) =>
                params.value ? (
                    <span className="font-medium">{formatINR(params.value)}</span>
                ) : (
                    <span className="text-gray-400">—</span>
                ),
        },
        {
            field: 'instrumentType',
            headerName: 'Mode',
            width: 140,
            cellRenderer: (params: ICellRendererParams<DashboardRow>) => {
                if (!params.value) {
                    return <span className="text-gray-400 text-sm">Not Set</span>;
                }
                return (
                    <span className="text-sm">
                        {INSTRUMENT_LABELS[params.value] || params.value}
                    </span>
                );
            },
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 130,
            cellRenderer: (params: ICellRendererParams<DashboardRow>) => {
                const status = params.value as string;
                const isMissing = params.data?.type === 'missing';

                return (
                    <Badge
                        variant="outline"
                        className={`${STATUS_COLORS[status] || ''} ${isMissing ? 'border-dashed' : ''}`}
                    >
                        {isMissing && <AlertCircle className="w-3 h-3 mr-1" />}
                        {status}
                    </Badge>
                );
            },
        },
        {
            field: 'dueDate',
            headerName: 'Due Date',
            width: 140,
            cellRenderer: (params: ICellRendererParams<DashboardRow>) => {
                if (!params.value) return <span className="text-gray-400">—</span>;

                const dueDate = new Date(params.value);
                const isOverdue = dueDate < new Date();
                const isUpcoming = dueDate <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days

                return (
                    <span className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : isUpcoming ? 'text-orange-600' : ''}`}>
                        {formatDateTime(params.value)}
                    </span>
                );
            },
        },
        {
            field: 'teamMemberName',
            headerName: 'Assigned To',
            width: 140,
            cellRenderer: (params: ICellRendererParams<DashboardRow>) =>
                params.value || <span className="text-gray-400">Unassigned</span>,
        },
        {
            headerName: 'Actions',
            filter: false,
            sortable: false,
            cellRenderer: (params: ICellRendererParams<DashboardRow>) => {
                const actions = getActionsForRow(params.data!);
                const ActionRenderer = createActionColumnRenderer(actions);
                return <ActionRenderer data={params.data!} />;
            },
            pinned: 'right',
            width: 80,
        },
    ], [navigate]);

    // Render tab with count badge
    const renderTabTrigger = (tab: typeof TABS[number]) => {
        const count = dashboardData?.counts?.[tab.value as keyof typeof dashboardData.counts] ?? 0;

        return (
            <TabsTrigger key={tab.value} value={tab.value} className="relative">
                {tab.label}
                {count > 0 && (
                    <Badge
                        variant="secondary"
                        className="ml-2 h-5 min-w-[20px] px-1.5 text-xs"
                    >
                        {count}
                    </Badge>
                )}
            </TabsTrigger>
        );
    };

    // Loading state
    if (isLoading) {
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

    // Error state
    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>EMDs, Tender Fees & Processing Fees</CardTitle>
                    <CardDescription>Error loading payment requests</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 text-red-500">
                        <AlertCircle className="w-5 h-5" />
                        <p>Failed to load payment requests. Please try again.</p>
                    </div>
                    <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => window.location.reload()}
                    >
                        Retry
                    </Button>
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
                            {dashboardData?.counts && (
                                <span className="ml-2 text-muted-foreground">
                                    • {dashboardData.counts.total} total items
                                </span>
                            )}
                        </CardDescription>
                    </div>
                    <Button onClick={() => navigate(paths.tendering.tenders)}>
                        <Plus className="mr-2 h-4 w-4" />
                        View Tenders
                    </Button>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                    <TabsList>
                        {TABS.map(renderTabTrigger)}
                    </TabsList>
                </Tabs>
            </CardHeader>

            <CardContent className="px-0">
                {/* Summary for current tab */}
                {activeTab === 'pending' && dashboardData?.data && (
                    <div className="px-6 pb-4">
                        <div className="flex gap-4 text-sm text-muted-foreground">
                            <span>
                                <strong className="text-foreground">
                                    {dashboardData.data.filter(r => r.type === 'missing').length}
                                </strong> need to be created
                            </span>
                            <span>•</span>
                            <span>
                                <strong className="text-foreground">
                                    {dashboardData.data.filter(r => r.type === 'request' && r.status === 'Pending').length}
                                </strong> awaiting submission
                            </span>
                        </div>
                    </div>
                )}

                <DataTable
                    data={dashboardData?.data || []}
                    loading={isLoading}
                    columnDefs={colDefs}
                    gridOptions={{
                        defaultColDef: {
                            filter: true,
                            resizable: true,
                        },
                        pagination: true,
                        paginationPageSize: 20,
                        rowSelection: 'multiple',
                        suppressRowClickSelection: true,
                    }}
                    enablePagination={true}
                    height="calc(100vh - 350px)"
                />
            </CardContent>
        </Card>
    );
};

export default EmdsAndTenderFeesPage;
