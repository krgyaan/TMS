import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DataTable from '@/components/ui/data-table';
import type { ColDef } from 'ag-grid-community';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, FileX2, Search, Eye, Clock, CheckCircle, XCircle, Shield, Link, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useChequeDashboard, useChequeDashboardCounts } from '@/hooks/api/useCheques';
import type { ChequeDashboardRow, ChequeDashboardTab } from './helpers/cheque.types';
import { dateCol, currencyCol } from '@/components/data-grid/columns';

const TABS_CONFIG: Array<{ key: ChequeDashboardTab; name: string; icon: React.ReactNode; description: string; }> = [
    {
        key: 'cheque-pending',
        name: 'Cheque Pending',
        icon: <Clock className="h-4 w-4" />,
        description: 'Pending cheques',
    },
    {
        key: 'cheque-payable',
        name: 'Cheque Payable',
        icon: <CheckCircle className="h-4 w-4" />,
        description: 'Payable cheques',
    },
    {
        key: 'cheque-paid-stop',
        name: 'Cheque Paid/stop',
        icon: <CheckCircle className="h-4 w-4" />,
        description: 'Paid or stopped cheques',
    },
    {
        key: 'cheque-for-security',
        name: 'Cheque for Security',
        icon: <Shield className="h-4 w-4" />,
        description: 'Cheques for security deposits',
    },
    {
        key: 'cheque-for-dd-fdr',
        name: 'Cheque for DD/FDR',
        icon: <Link className="h-4 w-4" />,
        description: 'Cheques for DD/FDR',
    },
    {
        key: 'rejected',
        name: 'Rejected',
        icon: <XCircle className="h-4 w-4" />,
        description: 'Rejected cheques',
    },
    {
        key: 'cancelled',
        name: 'Cancelled',
        icon: <XCircle className="h-4 w-4" />,
        description: 'Cancelled cheques',
    },
    {
        key: 'expired',
        name: 'Expired',
        icon: <Calendar className="h-4 w-4" />,
        description: 'Expired cheques',
    }
];

const getStatusVariant = (status: string | null): string => {
    if (!status) return 'secondary';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('payable') || statusLower.includes('paid')) {
        return 'default';
    }
    if (statusLower.includes('cancelled') || statusLower.includes('rejected') || statusLower.includes('expired')) {
        return 'destructive';
    }
    return 'secondary';
};

const ChequeListPage = () => {
    const [activeTab, setActiveTab] = useState<ChequeDashboardTab>('cheque-pending');
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [sortModel, setSortModel] = useState<{ colId: string; sort: 'asc' | 'desc' }[]>([]);
    const [search, setSearch] = useState<string>('');

    useEffect(() => {
        setPagination(p => ({ ...p, pageIndex: 0 }));
    }, [activeTab, search]);

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

    const { data: apiResponse, isLoading, error } = useChequeDashboard({
        tab: activeTab,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        sortBy: sortModel[0]?.colId,
        sortOrder: sortModel[0]?.sort,
        search: search || undefined,
    });

    const { data: counts } = useChequeDashboardCounts();

    const chequeData = apiResponse?.data || [];
    const totalRows = apiResponse?.meta?.total || 0;

    const handleViewDetails = useCallback((row: ChequeDashboardRow) => {
        // TODO: Implement navigation to detail page
        console.log('View details:', row);
    }, []);

    const chequeActions: ActionItem<ChequeDashboardRow>[] = useMemo(
        () => [
            {
                label: 'View Details',
                icon: <Eye className="h-4 w-4" />,
                onClick: handleViewDetails,
            },
        ],
        [handleViewDetails]
    );

    const colDefs = useMemo<ColDef<ChequeDashboardRow>[]>(
        () => [
            dateCol<ChequeDashboardRow>('date', {
                headerName: 'Date',
                width: 120,
                colId: 'date',
                sortable: true,
            }),
            {
                field: 'chequeNo',
                headerName: 'Cheque No',
                width: 130,
                colId: 'chequeNo',
                valueGetter: (params) => params.data?.chequeNo || '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'payeeName',
                headerName: 'Payee name',
                width: 180,
                colId: 'payeeName',
                valueGetter: (params) => params.data?.payeeName || '—',
                sortable: true,
                filter: true,
            },
            dateCol<ChequeDashboardRow>('bidValidity', {
                headerName: 'Bid Validity',
                width: 130,
                colId: 'bidValidity',
                sortable: true,
            }),
            currencyCol<ChequeDashboardRow>('amount', {
                headerName: 'Amount',
                width: 130,
                colId: 'amount',
                sortable: true,
            }),
            {
                field: 'type',
                headerName: 'Type',
                width: 120,
                colId: 'type',
                valueGetter: (params) => params.data?.type || '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'cheque',
                headerName: 'Cheque',
                width: 120,
                colId: 'cheque',
                valueGetter: (params) => params.data?.cheque || '—',
                sortable: true,
                filter: true,
            },
            dateCol<ChequeDashboardRow>('dueDate', {
                headerName: 'Due Date',
                width: 130,
                colId: 'dueDate',
                sortable: true,
            }),
            dateCol<ChequeDashboardRow>('expiry', {
                headerName: 'Expiry',
                width: 120,
                colId: 'expiry',
                sortable: true,
            }),
            {
                field: 'chequeStatus',
                headerName: 'Cheque Status',
                width: 150,
                colId: 'chequeStatus',
                sortable: true,
                filter: true,
                cellRenderer: (params: any) => {
                    const status = params.value;
                    if (!status) return '—';
                    return <Badge variant={getStatusVariant(status) as any}>{status}</Badge>;
                },
            },
            {
                headerName: '',
                filter: false,
                cellRenderer: createActionColumnRenderer(chequeActions),
                sortable: false,
                pinned: 'right',
                width: 57,
            },
        ],
        [chequeActions]
    );

    const tabsWithData = useMemo(() => {
        return TABS_CONFIG.map((tab) => {
            let count = 0;
            if (counts) {
                count = counts[tab.key] ?? 0;
            }
            return {
                ...tab,
                count,
            };
        });
    }, [counts]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48 mt-2" />
                </CardHeader>
                <CardContent className="p-6">
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            {TABS_CONFIG.map((_, i) => (
                                <Skeleton key={i} className="h-10 w-36" />
                            ))}
                        </div>
                        <Skeleton className="h-[500px] w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Cheques Dashboard</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load cheques. Please try again later.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Cheques Dashboard</CardTitle>
                            <CardDescription className="mt-2">
                                Track and manage cheques for tenders.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Search..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-8 w-64"
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="px-0">
                    <Tabs
                        value={activeTab}
                        onValueChange={(value) => setActiveTab(value as ChequeDashboardTab)}
                    >
                        <TabsList className="m-auto">
                            {tabsWithData.map((tab) => (
                                <TabsTrigger
                                    key={tab.key}
                                    value={tab.key}
                                    className="data-[state=active]:shadow-md flex items-center gap-2"
                                >
                                    {tab.icon}
                                    <span className="font-semibold text-sm">{tab.name}</span>
                                    {tab.count > 0 && (
                                        <Badge variant="secondary" className="text-xs ml-1">
                                            {tab.count}
                                        </Badge>
                                    )}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {tabsWithData.map((tab) => (
                            <TabsContent key={tab.key} value={tab.key} className="px-0 m-0 data-[state=inactive]:hidden">
                                {activeTab === tab.key && (
                                    <>
                                        {(!chequeData || chequeData.length === 0) ? (
                                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                                <FileX2 className="h-12 w-12 mb-4" />
                                                <p className="text-lg font-medium">No {tab.name.toLowerCase()} cheques</p>
                                                <p className="text-sm mt-2">
                                                    {tab.description}
                                                </p>
                                            </div>
                                        ) : (
                                            <DataTable
                                                data={chequeData}
                                                columnDefs={colDefs as ColDef<any>[]}
                                                loading={isLoading}
                                                manualPagination={true}
                                                rowCount={totalRows}
                                                paginationState={pagination}
                                                onPaginationChange={setPagination}
                                                gridOptions={{
                                                    defaultColDef: {
                                                        editable: false,
                                                        filter: true,
                                                        sortable: true,
                                                        resizable: true,
                                                    },
                                                    onSortChanged: handleSortChanged,
                                                    overlayNoRowsTemplate: '<span style="padding: 10px; text-align: center;">No cheques found</span>',
                                                }}
                                            />
                                        )}
                                    </>
                                )}
                            </TabsContent>
                        ))}
                    </Tabs>
                </CardContent>
            </Card>
        </>
    );
};

export default ChequeListPage;
