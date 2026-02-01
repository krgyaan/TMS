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
import { AlertCircle, FileX2, Search, Eye, Clock, CheckCircle, XCircle, RotateCcw, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useDemandDraftDashboard, useDemandDraftDashboardCounts } from '@/hooks/api/useDemandDrafts';
import type { DemandDraftDashboardRow, DemandDraftDashboardTab } from './helpers/demandDraft.types';
import { tenderNameCol } from '@/components/data-grid/columns';
import { formatDate } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import { paths } from '@/app/routes/paths';

const TABS_CONFIG: Array<{ key: DemandDraftDashboardTab; name: string; icon: React.ReactNode; description: string; }> = [
    {
        key: 'pending',
        name: 'Pending',
        icon: <Clock className="h-4 w-4" />,
        description: 'Pending demand drafts',
    },
    {
        key: 'created',
        name: 'Created',
        icon: <CheckCircle className="h-4 w-4" />,
        description: 'Created demand drafts',
    },
    {
        key: 'rejected',
        name: 'Rejected',
        icon: <XCircle className="h-4 w-4" />,
        description: 'Rejected demand drafts',
    },
    {
        key: 'returned',
        name: 'Returned',
        icon: <RotateCcw className="h-4 w-4" />,
        description: 'Returned demand drafts',
    },
    {
        key: 'cancelled',
        name: 'Cancelled',
        icon: <XCircle className="h-4 w-4" />,
        description: 'Cancelled demand drafts',
    }
];

const getStatusVariant = (status: string | null): string => {
    if (!status) return 'secondary';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('created') || statusLower.includes('active')) {
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

const DemandDraftListPage = () => {
    const [activeTab, setActiveTab] = useState<DemandDraftDashboardTab>('pending');
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

    const { data: apiResponse, isLoading, error } = useDemandDraftDashboard({
        tab: activeTab,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        sortBy: sortModel[0]?.colId,
        sortOrder: sortModel[0]?.sort,
        search: search || undefined,
    });

    const { data: counts } = useDemandDraftDashboardCounts();

    const ddData = apiResponse?.data || [];
    const totalRows = apiResponse?.meta?.total || 0;

    const handleViewDetails = useCallback((row: DemandDraftDashboardRow) => {
        // TODO: Implement navigation to detail page
        console.log('View details:', row);
    }, []);

    const handleOpenActionForm = useCallback((row: DemandDraftDashboardRow) => {
        navigate(paths.bi.demandDraftAction(row.id), { state: row });
    }, [navigate]);

    const ddActions: ActionItem<DemandDraftDashboardRow>[] = useMemo(
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

    const colDefs = useMemo<ColDef<DemandDraftDashboardRow>[]>(
        () => [
            {
                field: 'ddCreationDate',
                headerName: 'DD Date',
                width: 110,
                colId: 'ddCreationDate',
                valueFormatter: (params) => params.value ? formatDate(params.value) : '—',
                sortable: true,
            },
            {
                field: 'ddNo',
                headerName: 'DD No',
                width: 100,
                colId: 'ddNo',
                valueGetter: (params) => params.data?.ddNo || '—',
                sortable: true,
                filter: true,
            },
            tenderNameCol<DemandDraftDashboardRow>('tenderNo', {
                headerName: 'Tender Details',
                filter: true,
                width: 200,
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
                field: 'beneficiaryName',
                headerName: 'Beneficiary name',
                maxWidth: 200,
                colId: 'beneficiaryName',
                valueGetter: (params) => params.data?.beneficiaryName || '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'ddAmount',
                headerName: 'DD Amount',
                width: 120,
                colId: 'ddAmount',
                sortable: true,
                valueFormatter: (params) => params.value ? formatINR(params.value) : '—',
            },
            {
                field: 'bidValidity',
                headerName: 'Bid Validity',
                width: 110,
                colId: 'bidValidity',
                sortable: true,
                valueFormatter: (params) => params.value ? formatDate(params.value) : '—',
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
                width: 90,
                colId: 'expiry',
                sortable: true,
                valueGetter: (params) => params.data?.expiry || '—',
                cellRenderer: (params: any) => {
                    const status = params.value;
                    if (!status) return '—';
                    return <Badge variant={status === 'Expired' ? 'destructive' : 'default'}>{status}</Badge>;
                },
            },
            {
                field: 'ddStatus',
                headerName: 'DD Status',
                width: 130,
                colId: 'ddStatus',
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
                cellRenderer: createActionColumnRenderer(ddActions),
                sortable: false,
                pinned: 'right',
                width: 57,
            },
        ],
        [ddActions]
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
                    <CardTitle>Demand Drafts Dashboard</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load demand drafts. Please try again later.
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
                            <CardTitle>Demand Drafts Dashboard</CardTitle>
                            <CardDescription className="mt-2">
                                Track and manage demand drafts for tenders.
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
                        onValueChange={(value) => setActiveTab(value as DemandDraftDashboardTab)}
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
                                        {(!ddData || ddData.length === 0) ? (
                                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                                <FileX2 className="h-12 w-12 mb-4" />
                                                <p className="text-lg font-medium">No {tab.name.toLowerCase()} demand drafts</p>
                                                <p className="text-sm mt-2">
                                                    {tab.description}
                                                </p>
                                            </div>
                                        ) : (
                                            <DataTable
                                                data={ddData}
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
                                                    overlayNoRowsTemplate: '<span style="padding: 10px; text-align: center;">No demand drafts found</span>',
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

export default DemandDraftListPage;
