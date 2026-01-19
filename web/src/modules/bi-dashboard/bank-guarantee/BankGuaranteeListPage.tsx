import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DataTable from '@/components/ui/data-table';
import type { ColDef } from 'ag-grid-community';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, FileX2, Search, Eye, FileText, Shield, XCircle, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useBankGuaranteeDashboard, useBankGuaranteeDashboardCounts, useBankGuaranteeCardStats } from '@/hooks/api/useBankGuarantees';
import type { BankGuaranteeDashboardRow, BankGuaranteeDashboardTab } from './helpers/bankGuarantee.types';
import { dateCol, currencyCol } from '@/components/data-grid/columns';
import { BankGuaranteeActionForm } from './components/BankGuaranteeActionForm';

const TABS_CONFIG: Array<{ key: BankGuaranteeDashboardTab; name: string; icon: React.ReactNode; description: string; }> = [
    {
        key: 'new-requests',
        name: 'New Requests',
        icon: <FileText className="h-4 w-4" />,
        description: 'New bank guarantee requests',
    },
    {
        key: 'live-yes',
        name: 'Live YES',
        icon: <Shield className="h-4 w-4" />,
        description: 'Live bank guarantees from YES Bank',
    },
    {
        key: 'live-pnb',
        name: 'Live PNB',
        icon: <Shield className="h-4 w-4" />,
        description: 'Live bank guarantees from PNB',
    },
    {
        key: 'live-bg-limit',
        name: 'Live BG Limit',
        icon: <Shield className="h-4 w-4" />,
        description: 'Live bank guarantees within limit',
    },
    {
        key: 'cancelled',
        name: 'Cancelled',
        icon: <XCircle className="h-4 w-4" />,
        description: 'Cancelled bank guarantees',
    },
    {
        key: 'rejected',
        name: 'Rejected',
        icon: <XCircle className="h-4 w-4" />,
        description: 'Rejected bank guarantees',
    }
];

const getStatusVariant = (status: string | null): string => {
    if (!status) return 'secondary';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('live') || statusLower.includes('active')) {
        return 'default';
    }
    if (statusLower.includes('cancelled') || statusLower.includes('rejected')) {
        return 'destructive';
    }
    return 'secondary';
};

const BankGuaranteeListPage = () => {
    const [activeTab, setActiveTab] = useState<BankGuaranteeDashboardTab>('new-requests');
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [sortModel, setSortModel] = useState<{ colId: string; sort: 'asc' | 'desc' }[]>([]);
    const [search, setSearch] = useState<string>('');
    const [actionFormOpen, setActionFormOpen] = useState(false);
    const [selectedInstrument, setSelectedInstrument] = useState<BankGuaranteeDashboardRow | null>(null);

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

    const { data: apiResponse, isLoading, error } = useBankGuaranteeDashboard({
        tab: activeTab,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        sortBy: sortModel[0]?.colId,
        sortOrder: sortModel[0]?.sort,
        search: search || undefined,
    });

    const { data: counts } = useBankGuaranteeDashboardCounts();
    const { data: cardStats } = useBankGuaranteeCardStats();

    const bgData = apiResponse?.data || [];
    const totalRows = apiResponse?.meta?.total || 0;

    // Bank name mappings
    const bankNameMap: Record<string, string> = {
        'YESBANK_2011': 'Yes Bank 2011',
        'YESBANK_0771': 'Yes Bank 0771',
        'PNB_6011': 'Punjab National Bank',
        'BGLIMIT_0771': 'BG Limit',
    };

    const formatCurrency = (amount: number | null | undefined): string => {
        if (!amount) return '₹ 0.00';
        return `₹ ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const handleViewDetails = useCallback((row: BankGuaranteeDashboardRow) => {
        // TODO: Implement navigation to detail page
        console.log('View details:', row);
    }, []);

    const handleOpenActionForm = useCallback((row: BankGuaranteeDashboardRow) => {
        setSelectedInstrument(row);
        setActionFormOpen(true);
    }, []);

    const bgActions: ActionItem<BankGuaranteeDashboardRow>[] = useMemo(
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

    const colDefs = useMemo<ColDef<BankGuaranteeDashboardRow>[]>(
        () => [
            dateCol<BankGuaranteeDashboardRow>('bgDate', {
                headerName: 'BG Date',
                width: 120,
                colId: 'bgDate',
                sortable: true,
            }),
            {
                field: 'bgNo',
                headerName: 'BG No.',
                width: 150,
                colId: 'bgNo',
                valueGetter: (params) => params.data?.bgNo || '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'beneficiaryName',
                headerName: 'Beneficiary name',
                width: 180,
                colId: 'beneficiaryName',
                valueGetter: (params) => params.data?.beneficiaryName || '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'tenderNo',
                headerName: 'Tender Name',
                width: 200,
                colId: 'tenderNo',
                sortable: true,
                valueGetter: (params) => {
                    const tenderNo = params.data?.tenderNo || '';
                    const tenderName = params.data?.tenderName || '';
                    return tenderNo && tenderName ? `${tenderNo} - ${tenderName}` : tenderNo || tenderName || '—';
                },
            },
            dateCol<BankGuaranteeDashboardRow>('bidValidity', {
                headerName: 'Bid Validity',
                width: 130,
                colId: 'bidValidity',
                sortable: true,
            }),
            currencyCol<BankGuaranteeDashboardRow>('amount', {}, {
                headerName: 'Amount',
                width: 130,
                colId: 'amount',
                sortable: true,
            }),
            dateCol<BankGuaranteeDashboardRow>('bgExpiryDate', {
                headerName: 'BG Expiry Date',
                width: 140,
                colId: 'bgExpiryDate',
                sortable: true,
            }),
            {
                field: 'bgClaimPeriod',
                headerName: 'BG Claim Period',
                width: 140,
                colId: 'bgClaimPeriod',
                valueGetter: (params) => {
                    const value = params.data?.bgClaimPeriod;
                    return value !== null && value !== undefined ? `${value} days` : '—';
                },
                sortable: true,
                filter: true,
            },
            dateCol<BankGuaranteeDashboardRow>('expiryDate', {
                headerName: 'Expiry Date',
                width: 130,
                colId: 'expiryDate',
                sortable: true,
            }),
            currencyCol<BankGuaranteeDashboardRow>('bgChargesPaid', {}, {
                headerName: 'BG Charges paid',
                width: 150,
                colId: 'bgChargesPaid',
                sortable: true,
            }),
            currencyCol<BankGuaranteeDashboardRow>('bgChargesCalculated', {}, {
                headerName: 'BG Charges Calculated',
                width: 180,
                colId: 'bgChargesCalculated',
                sortable: true,
            }),
            {
                field: 'fdrNo',
                headerName: 'FDR No',
                width: 120,
                colId: 'fdrNo',
                valueGetter: (params) => params.data?.fdrNo || '—',
                sortable: true,
                filter: true,
            },
            currencyCol<BankGuaranteeDashboardRow>('fdrValue', {}, {
                headerName: 'FDR Value',
                width: 130,
                colId: 'fdrValue',
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
                headerName: 'Expiry',
                width: 120,
                colId: 'expiryStatus',
                sortable: true,
                valueGetter: (params) => {
                    return params.data?.expiryStatus || '—';
                },
                cellRenderer: (params: any) => {
                    const status = params.value;
                    if (!status || status === '—') return '—';
                    const variant = status === 'Valid' ? 'default' : status === 'Claim Period' ? 'secondary' : 'destructive';
                    return <Badge variant={variant as any}>{status}</Badge>;
                },
            },
            {
                field: 'bgStatus',
                headerName: 'BG Status',
                width: 130,
                colId: 'bgStatus',
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
                cellRenderer: createActionColumnRenderer(bgActions),
                sortable: false,
                pinned: 'right',
                width: 57,
            },
        ],
        [bgActions]
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
                    <CardTitle>Bank Guarantees Dashboard</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load bank guarantees. Please try again later.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            {/* Bank Statistics Cards */}
            {cardStats && cardStats.bankStats && Object.keys(cardStats.bankStats).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
                    {Object.entries(cardStats.bankStats).map(([bankName, stats]) => (
                        <Card key={bankName} className="gap-2">
                            <CardHeader>
                                <CardTitle>{bankNameMap[bankName] || bankName}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm font-medium text-green-600">BG: {formatCurrency(stats.amount)}</p>
                                <p className="text-sm font-medium text-green-600">FDR (10%): {formatCurrency(stats.fdrAmount10)}</p>
                                <p className="text-sm font-medium text-green-600">FDR (15%): {formatCurrency(stats.fdrAmount15)}</p>
                                <p className="text-sm font-medium text-green-600">FDR (100%): {formatCurrency(stats.fdrAmount100)}</p>
                                <div>
                                    <Badge variant="outline" className="justify-center">
                                        {stats.count} BGs Created
                                    </Badge>
                                    <Badge variant="outline" className="justify-center">
                                        {stats.percentage.toFixed(2)}% of BGs
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Bank Guarantees Dashboard</CardTitle>
                            <CardDescription className="mt-2">
                                Track and manage bank guarantees for tenders.
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
                        onValueChange={(value) => setActiveTab(value as BankGuaranteeDashboardTab)}
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
                                        {(!bgData || bgData.length === 0) ? (
                                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                                <FileX2 className="h-12 w-12 mb-4" />
                                                <p className="text-lg font-medium">No {tab.name.toLowerCase()} bank guarantees</p>
                                                <p className="text-sm mt-2">
                                                    {tab.description}
                                                </p>
                                            </div>
                                        ) : (
                                            <DataTable
                                                data={bgData}
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
                                                    overlayNoRowsTemplate: '<span style="padding: 10px; text-align: center;">No bank guarantees found</span>',
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

            {/* Action Form Dialog */}
            {selectedInstrument && (
                <BankGuaranteeActionForm
                    open={actionFormOpen}
                    onOpenChange={setActionFormOpen}
                    instrumentId={selectedInstrument.id}
                    instrumentData={{
                        bgNo: selectedInstrument.bgNo || undefined,
                        bgDate: selectedInstrument.bgDate || undefined,
                        amount: selectedInstrument.amount || undefined,
                        tenderName: selectedInstrument.tenderName || undefined,
                        tenderNo: selectedInstrument.tenderNo || undefined,
                    }}
                />
            )}
        </>
    );
};

export default BankGuaranteeListPage;
