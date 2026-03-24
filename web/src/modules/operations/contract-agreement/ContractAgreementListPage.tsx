import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DataTable from '@/components/ui/data-table';
import type { ColDef } from 'ag-grid-community';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Eye, FileX2, Search, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { ContractAgreementListDto } from '@/modules/operations/types/wo.types';
import { currencyCol, dateCol } from '@/components/data-grid';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { useContractAgreementDashboardCounts, useContractAgreements } from '@/hooks/api/useContractAgreement';
import { UploadContractAgreementDialog } from './components/UploadContractAgreement';

type TabKey = 'uploaded' | 'not_uploaded';

const ContractAgreementListPage = () => {
    const [activeTab, setActiveTab] = useState<TabKey>('not_uploaded');
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [sortModel, setSortModel] = useState<{ colId: string; sort: 'asc' | 'desc' }[]>([]);
    const [search, setSearch] = useState<string>('');
    const debouncedSearch = useDebouncedSearch(search, 300);
    const navigate = useNavigate();

    const [isUploadContractOpen, setIsUploadContractOpen] = useState(false);
    const [selectedWo, setSelectedWo] = useState<ContractAgreementListDto | null>(null);

    // Reset pagination on tab/search change
    useEffect(() => {
        setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, [activeTab, debouncedSearch]);

    const handleSortChanged = useCallback((event: any) => {
        const sortModel = event.api
            .getColumnState()
            .filter((col: any) => col.sort)
            .map((col: any) => ({
                colId: col.colId,
                sort: col.sort as 'asc' | 'desc',
            }));
        setSortModel(sortModel);
        setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, []);

    const handlePageSizeChange = useCallback((newPageSize: number) => {
        setPagination({ pageIndex: 0, pageSize: newPageSize });
    }, []);

    // Fetch data
    const { data: apiResponse, isLoading: loading, error } = useContractAgreements(
        activeTab,
        { page: pagination.pageIndex + 1, limit: pagination.pageSize, search: debouncedSearch || undefined },
        { sortBy: sortModel[0]?.colId, sortOrder: sortModel[0]?.sort }
    );

    const { data: counts } = useContractAgreementDashboardCounts();

    const allRows = apiResponse?.data || [];
    const tableData = useMemo(() => {
        return allRows.filter((row) => {
            if (activeTab === 'not_uploaded') {
                return !row.veSigned && !row.clientAndVeSigned;
            }
            return row.veSigned && row.clientAndVeSigned;
        });
    }, [allRows, activeTab]);

    const totalRows = apiResponse?.meta?.total || tableData.length;

    // Tab configuration with counts
    const tabsConfig = useMemo(() => {
        return [
            { key: 'not_uploaded' as const, name: 'Not Uploaded', count: counts?.not_uploaded ?? 0 },
            { key: 'uploaded' as const, name: 'Uploaded', count: counts?.uploaded ?? 0 },
        ];
    }, [counts]);

    // Action items for "Not Scheduled" tab
    const rowActions: ActionItem<ContractAgreementListDto>[] = useMemo(() => [
        {
            label: 'Upload Contract Agreement',
            onClick: (row) => {
                setSelectedWo(row);
                setIsUploadContractOpen(true);
            },
            icon: <CheckCircle className="h-4 w-4" />,
        },
        {
            label: 'View Details',
            onClick: (row) => navigate(paths.operations.woBasicDetailShowPage(row.woDetailId)),
            icon: <Eye className="h-4 w-4" />,
        },
    ], [navigate]);

    // Column definitions
    const colDefs = useMemo<ColDef<ContractAgreementListDto>[]>(
        () => [
            {
                field: 'projectName',
                colId: 'projectName',
                headerName: 'Project Name',
                width: 200,
                sortable: true,
                filter: true,
            },
            {
                field: 'woNumber',
                colId: 'woNumber',
                headerName: 'WO Number',
                width: 200,
                sortable: true,
                filter: true,
            },
            dateCol<ContractAgreementListDto>('woDate', { includeTime: false }, {
                headerName: 'WO Date',
                width: 120,
                colId: 'woDate',
            }),
            currencyCol<ContractAgreementListDto>('woValuePreGst', {
                headerName: 'WO Value',
                width: 120,
                colId: 'woValuePreGst',
            }),
            currencyCol<ContractAgreementListDto>('woValueGstAmt', {
                headerName: 'GST Amount',
                width: 120,
                colId: 'woValueGstAmt',
            }),
            {
                field: 'woStatus',
                colId: 'woStatus',
                headerName: 'WO Status',
                width: 120,
                cellRenderer: (params: any) => (
                    <Badge variant="outline" className="capitalize">
                        {params.value?.replaceAll('_', ' ') || '—'}
                    </Badge>
                ),
            },
            dateCol<ContractAgreementListDto>('veSignedDate', { includeTime: false }, {
                colId: 'veSignedDate',
                headerName: 'VE Date',
                width: 150,
            }),
            dateCol<ContractAgreementListDto>('clientAndVeSignedDate', { includeTime: false }, {
                colId: 'clientAndVeSignedDate',
                headerName: 'Client & VE Date',
                width: 150,
            }),
            {
                headerName: '',
                filter: false,
                cellRenderer: createActionColumnRenderer(rowActions),
                sortable: false,
                pinned: 'right',
                width: 57,
            },
        ],
        [rowActions]
    );

    // Loading state
    if (loading && !allRows.length) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48 mt-2" />
                </CardHeader>
                <CardContent className="p-6">
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            {Array.from({ length: 2 }).map((_, i) => (
                                <Skeleton key={i} className="h-10 w-32" />
                            ))}
                        </div>
                        <Skeleton className="h-[500px] w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Error state
    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Contract Agreement</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load contract agreements. Please try again later.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Contract Agreements</CardTitle>
                        <CardDescription className="mt-2">
                            Manage and schedule Contract Agreements for Accepted Work Orders.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <Tabs
                    value={activeTab}
                    onValueChange={(value) => setActiveTab(value as TabKey)}
                >
                    <TabsList className="m-auto mb-4 flex-wrap">
                        {tabsConfig.map((tab) => (
                            <TabsTrigger
                                key={tab.key}
                                value={tab.key}
                                className="data-[state=active]:shadow-md flex items-center gap-1"
                            >
                                <span className="font-semibold text-sm">{tab.name}</span>
                                <Badge variant="secondary" className="text-xs">
                                    {tab.count}
                                </Badge>
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {/* Search Row */}
                    <div className="flex items-center gap-4 px-6 pb-4">
                        <div className="flex-1 flex justify-end">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Search by project name, WO number..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-8 w-80"
                                />
                            </div>
                        </div>
                    </div>

                    {tabsConfig.map((tab) => (
                        <TabsContent
                            key={tab.key}
                            value={tab.key}
                            className="px-0 m-0 data-[state=inactive]:hidden"
                        >
                            {activeTab === tab.key && (
                                <>
                                    {tableData.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                            <FileX2 className="h-12 w-12 mb-4" />
                                            <p className="text-lg font-medium">
                                                No contract agreements found
                                            </p>
                                            <p className="text-sm mt-2">
                                                {tab.key === 'not_uploaded'
                                                    ? 'All contract agreements have been uploaded.'
                                                    : 'No contract agreements have been uploaded yet.'}
                                            </p>
                                        </div>
                                    ) : (
                                        <DataTable
                                            data={tableData}
                                            columnDefs={colDefs as ColDef<any>[]}
                                            loading={loading}
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
                                                overlayNoRowsTemplate:
                                                    '<span style="padding: 10px; text-align: center;">No contract agreements found</span>',
                                            }}
                                        />
                                    )}
                                </>
                            )}
                        </TabsContent>
                    ))}
                </Tabs>
            </CardContent>

            {/* Upload Contract Agreement Modal */}
            {selectedWo && (
                <UploadContractAgreementDialog
                    isOpen={isUploadContractOpen}
                    onOpenChange={setIsUploadContractOpen}
                    woDetail={selectedWo}
                />
            )}
        </Card>
    );
};

export default ContractAgreementListPage;
