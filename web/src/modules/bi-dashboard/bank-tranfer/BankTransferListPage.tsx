import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DataTable from '@/components/ui/data-table';
import type { ColDef } from 'ag-grid-community';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, FileX2, Search, Eye, Clock, CheckCircle, XCircle, RotateCcw, Wallet, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useBankTransferDashboard, useBankTransferDashboardCounts } from '@/hooks/api/useBankTransfers';
import type { BankTransferDashboardRow, BankTransferDashboardTab } from './helpers/bankTransfer.types';
import { tenderNameCol } from '@/components/data-grid/columns';
import { formatDate } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import { paths } from '@/app/routes/paths';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { QuickFilter } from '@/components/ui/quick-filter';
import { TableSortFilter } from '@/components/ui/table-sort-filter';

const TABS_CONFIG: Array<{ key: BankTransferDashboardTab; name: string; icon: React.ReactNode; description: string; }> = [
    {
        key: 'pending',
        name: 'Pending',
        icon: <Clock className="h-4 w-4" />,
        description: 'Pending bank transfers',
    },
    {
        key: 'accepted',
        name: 'Accepted',
        icon: <CheckCircle className="h-4 w-4" />,
        description: 'Accepted bank transfers',
    },
    {
        key: 'rejected',
        name: 'Rejected',
        icon: <XCircle className="h-4 w-4" />,
        description: 'Rejected bank transfers',
    },
    {
        key: 'returned',
        name: 'Returned',
        icon: <RotateCcw className="h-4 w-4" />,
        description: 'Returned bank transfers',
    },
    {
        key: 'settled',
        name: 'Settled',
        icon: <Wallet className="h-4 w-4" />,
        description: 'Settled bank transfers',
    }
];

const getStatusVariant = (status: string | null): string => {
    if (!status) return 'secondary';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('accepted') || statusLower.includes('settled')) {
        return 'default';
    }
    if (statusLower.includes('rejected')) {
        return 'destructive';
    }
    if (statusLower.includes('returned')) {
        return 'secondary';
    }
    return 'secondary';
};

const BankTransferListPage = () => {
    const [activeTab, setActiveTab] = useState<BankTransferDashboardTab>('pending');
    const navigate = useNavigate();
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [sortModel, setSortModel] = useState<{ colId: string; sort: 'asc' | 'desc' }[]>([]);
    const [search, setSearch] = useState<string>('');
    const debouncedSearch = useDebouncedSearch(search, 300);

    useEffect(() => {
        setPagination(p => ({ ...p, pageIndex: 0 }));
    }, [activeTab, debouncedSearch]);

    const handlePageSizeChange = useCallback((newPageSize: number) => {
        setPagination({ pageIndex: 0, pageSize: newPageSize });
    }, []);

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

    const { data: apiResponse, isLoading, error } = useBankTransferDashboard({
        tab: activeTab,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        sortBy: sortModel[0]?.colId,
        sortOrder: sortModel[0]?.sort,
        search: debouncedSearch || undefined,
    });

    const { data: counts } = useBankTransferDashboardCounts();

    const btData = apiResponse?.data || [];
    const totalRows = apiResponse?.meta?.total || 0;

    const handleViewDetails = useCallback((row: BankTransferDashboardRow) => {
        // TODO: Implement navigation to detail page
        console.log('View details:', row);
    }, []);

    const handleOpenActionForm = useCallback((row: BankTransferDashboardRow) => {
        navigate(paths.bi.bankTransferAction(row.id), { state: row });
    }, [navigate]);

    const btActions: ActionItem<BankTransferDashboardRow>[] = useMemo(
        () => [
            {
                label: 'View Details',
                icon: <Eye className="h-4 w-4" />,
                onClick: handleViewDetails,
            },
            {
                label: 'Action Form',
                icon: <Edit className="h-4 w-4" />,
                onClick: handleOpenActionForm,
            },
        ],
        [handleViewDetails, handleOpenActionForm]
    );

    const colDefs = useMemo<ColDef<BankTransferDashboardRow>[]>(
        () => [
            {
                field: 'date',
                headerName: 'Date',
                width: 110,
                colId: 'date',
                sortable: true,
                valueFormatter: (params) => params.value ? formatDate(params.value) : '—',
            },
            tenderNameCol<BankTransferDashboardRow>('tenderNo', {
                headerName: 'Tender Name',
                width: 200,
                colId: 'tenderNo',
                sortable: true,
            }),
            {
                field: 'teamMember',
                headerName: 'Team Member',
                width: 140,
                colId: 'teamMember',
                valueGetter: (params) => params.data?.teamMember || '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'utrNo',
                headerName: 'UTR No',
                width: 150,
                colId: 'utrNo',
                valueGetter: (params) => params.data?.utrNo || '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'accountName',
                headerName: 'Account Name',
                width: 150,
                colId: 'accountName',
                valueGetter: (params) => params.data?.accountName || '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'bidValidity',
                headerName: 'Bid Validity',
                width: 100,
                colId: 'bidValidity',
                sortable: true,
                valueFormatter: (params) => params.value ? formatDate(params.value) : '—',
            },
            {
                field: 'tenderStatus',
                headerName: 'Tender Status',
                width: 140,
                colId: 'tenderStatus',
                valueGetter: (params) => params.data?.tenderStatus || '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'amount',
                headerName: 'Amount',
                width: 100,
                colId: 'amount',
                sortable: true,
                valueFormatter: (params) => params.value ? formatINR(params.value) : '—',
            },
            {
                field: 'btStatus',
                headerName: 'BT Status',
                width: 100,
                colId: 'btStatus',
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
                cellRenderer: createActionColumnRenderer(btActions),
                sortable: false,
                pinned: 'right',
                width: 57,
            },
        ],
        [btActions]
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
                    <CardTitle>Bank Transfers Dashboard</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load bank transfers. Please try again later.
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
                            <CardTitle>Bank Transfers Dashboard</CardTitle>
                            <CardDescription className="mt-2">
                                Track and manage bank transfers for tenders.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="px-0">
                    <Tabs
                        value={activeTab}
                        onValueChange={(value) => setActiveTab(value as BankTransferDashboardTab)}
                    >
                        <TabsList className="m-auto mb-4">
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

                        {/* Search Row: Quick Filters, Search Bar, Sort Filter */}
                        <div className="flex items-center gap-4 px-6 pb-4">
                            {/* Quick Filters (Left) - Optional, can be added per page */}
                            
                            {/* Search Bar (Center) - Flex grow */}
                            <div className="flex-1 flex justify-end">
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
                            
                            {/* Sort Filter Button (Right) */}
                            <TableSortFilter
                                columnDefs={colDefs}
                                currentSort={sortModel[0]}
                                onSortChange={(sort) => {
                                    setSortModel(sort ? [sort] : []);
                                    setPagination(p => ({ ...p, pageIndex: 0 }));
                                }}
                            />
                        </div>

                        {tabsWithData.map((tab) => (
                            <TabsContent key={tab.key} value={tab.key} className="px-0 m-0 data-[state=inactive]:hidden">
                                {activeTab === tab.key && (
                                    <>
                                        {(!btData || btData.length === 0) ? (
                                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                                <FileX2 className="h-12 w-12 mb-4" />
                                                <p className="text-lg font-medium">No {tab.name.toLowerCase()} bank transfers</p>
                                                <p className="text-sm mt-2">
                                                    {tab.description}
                                                </p>
                                            </div>
                                        ) : (
                                            <DataTable
                                                data={btData}
                                                columnDefs={colDefs as ColDef<any>[]}
                                                loading={isLoading}
                                                autoSizeColumns={true}
                                                manualPagination={true}
                                                rowCount={totalRows}
                                                paginationState={pagination}
                                                onPaginationChange={setPagination}
                                                onPageSizeChange={handlePageSizeChange}
                                                showTotalCount={true}
                                                showLengthChange={true}
                                                gridOptions={{
                                                    defaultColDef: {
                                                        editable: false,
                                                        filter: true,
                                                        sortable: true,
                                                        resizable: true,
                                                    },
                                                    onSortChanged: handleSortChanged,
                                                    overlayNoRowsTemplate: '<span style="padding: 10px; text-align: center;">No bank transfers found</span>',
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

export default BankTransferListPage;
