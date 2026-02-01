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
import { AlertCircle, FileX2, Search, Eye, Clock, Shield, Link, XCircle, RotateCcw, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useFdrDashboard, useFdrDashboardCounts } from '@/hooks/api/useFdrs';
import type { FdrDashboardRow, FdrDashboardTab } from './helpers/fdr.types';
import { tenderNameCol } from '@/components/data-grid/columns';
import { formatDate } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import { paths } from '@/app/routes/paths';

const TABS_CONFIG: Array<{ key: FdrDashboardTab; name: string; icon: React.ReactNode; description: string; }> = [
    {
        key: 'pending',
        name: 'Pending',
        icon: <Clock className="h-4 w-4" />,
        description: 'Pending FDRs',
    },
    {
        key: 'pnb-bg-linked',
        name: 'PNB BG linked',
        icon: <Link className="h-4 w-4" />,
        description: 'FDRs linked to PNB bank guarantees',
    },
    {
        key: 'ybl-bg-linked',
        name: 'YBL BG linked',
        icon: <Link className="h-4 w-4" />,
        description: 'FDRs linked to YBL bank guarantees',
    },
    {
        key: 'security-deposit',
        name: 'Security Deposit (SD)',
        icon: <Shield className="h-4 w-4" />,
        description: 'FDRs for security deposits',
    },
    {
        key: 'bond-linked',
        name: 'Bond linked',
        icon: <Link className="h-4 w-4" />,
        description: 'FDRs linked to bonds',
    },
    {
        key: 'rejected',
        name: 'Rejected',
        icon: <XCircle className="h-4 w-4" />,
        description: 'Rejected FDRs',
    },
    {
        key: 'returned',
        name: 'Returned',
        icon: <RotateCcw className="h-4 w-4" />,
        description: 'Returned FDRs',
    },
    {
        key: 'cancelled',
        name: 'Cancelled',
        icon: <XCircle className="h-4 w-4" />,
        description: 'Cancelled FDRs',
    }
];

const getStatusVariant = (status: string | null): string => {
    if (!status) return 'secondary';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('linked') || statusLower.includes('active')) {
        return 'default';
    }
    if (statusLower.includes('cancelled') || statusLower.includes('rejected')) {
        return 'destructive';
    }
    if (statusLower.includes('returned')) {
        return 'secondary';
    }
    return 'secondary';
};

const FdrListPage = () => {
    const [activeTab, setActiveTab] = useState<FdrDashboardTab>('pending');
    const navigate = useNavigate();
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

    const { data: apiResponse, isLoading, error } = useFdrDashboard({
        tab: activeTab,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        sortBy: sortModel[0]?.colId,
        sortOrder: sortModel[0]?.sort,
        search: search || undefined,
    });

    const { data: counts } = useFdrDashboardCounts();

    const fdrData = apiResponse?.data || [];
    const totalRows = apiResponse?.meta?.total || 0;

    const handleViewDetails = useCallback((row: FdrDashboardRow) => {
        // TODO: Implement navigation to detail page
        console.log('View details:', row);
    }, []);

    const handleOpenActionForm = useCallback((row: FdrDashboardRow) => {
        navigate(paths.bi.fdrAction(row.id), { state: row });
    }, [navigate]);

    const fdrActions: ActionItem<FdrDashboardRow>[] = useMemo(
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

    const colDefs = useMemo<ColDef<FdrDashboardRow>[]>(
        () => [
            {
                field: 'fdrCreationDate',
                headerName: 'FDR Date',
                width: 110,
                colId: 'fdrCreationDate',
                sortable: true,
                valueFormatter: (params) => params.value ? formatDate(params.value) : '—',
            },
            {
                field: 'fdrNo',
                headerName: 'FDR No',
                width: 130,
                colId: 'fdrNo',
                valueGetter: (params) => params.data?.fdrNo || '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'beneficiaryName',
                headerName: 'Beneficiary name',
                maxWidth: 200,
                colId: 'beneficiaryName',
                valueGetter: (params) => params.data?.beneficiaryName || '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'fdrAmount',
                headerName: 'FDR Amount',
                width: 130,
                colId: 'fdrAmount',
                sortable: true,
                valueFormatter: (params) => params.value ? formatINR(params.value) : '—',
            },
            tenderNameCol<FdrDashboardRow>('tenderNo', {
                field: 'tenderNo',
                headerName: 'Tender Name',
                width: 200,
                colId: 'tenderNo',
                sortable: true,
            }),
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
                field: 'member',
                headerName: 'Member',
                width: 120,
                colId: 'member',
                valueGetter: (params) => params.data?.member || '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'expiry',
                headerName: 'Expiry',
                width: 120,
                colId: 'expiry',
                sortable: true,
                valueFormatter: (params) => params.value ? formatDate(params.value) : '—',
            },
            {
                field: 'fdrStatus',
                headerName: 'FDR Status',
                width: 130,
                colId: 'fdrStatus',
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
                cellRenderer: createActionColumnRenderer(fdrActions),
                sortable: false,
                pinned: 'right',
                width: 57,
            },
        ],
        [fdrActions]
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
                    <CardTitle>FDR Dashboard</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load FDRs. Please try again later.
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
                            <CardTitle>FDR Dashboard</CardTitle>
                            <CardDescription className="mt-2">
                                Track and manage Fixed Deposit Receipts for tenders.
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
                        onValueChange={(value) => setActiveTab(value as FdrDashboardTab)}
                    >
                        <TabsList className="m-auto">
                            {tabsWithData.map((tab) => (
                                <TabsTrigger
                                    key={tab.key}
                                    value={tab.key}
                                    className="data-[state=active]:shadow-md flex items-center gap-2"
                                >
                                    {tab.icon}
                                    <span className="font-semibold text-xs">{tab.name}</span>
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
                                        {(!fdrData || fdrData.length === 0) ? (
                                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                                <FileX2 className="h-12 w-12 mb-4" />
                                                <p className="text-lg font-medium">No {tab.name.toLowerCase()} FDRs</p>
                                                <p className="text-sm mt-2">
                                                    {tab.description}
                                                </p>
                                            </div>
                                        ) : (
                                            <DataTable
                                                data={fdrData}
                                                columnDefs={colDefs as ColDef<any>[]}
                                                loading={isLoading}
                                                autoSizeColumns={true}
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
                                                    overlayNoRowsTemplate: '<span style="padding: 10px; text-align: center;">No FDRs found</span>',
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

export default FdrListPage;
