import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DataTable from '@/components/ui/data-table';
import type { ColDef } from 'ag-grid-community';
import { currencyCol, dateOnlyCol } from '@/components/data-grid';
import { usePersistentTableState } from '@/hooks/usePersistentTableState';
import { useYearMonthFilter } from '@/hooks/useYearMonthFilter';
import { useTdsChecklists } from '@/hooks/api/useTdsChecklist';
import type { TdsChecklistRow } from '@/services/api/tds-checklist.api';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, FileX2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatINR } from '@/hooks/useINRFormatter';

const TdsChecklistListPage = () => {
    const {
        search, setSearch,
        debouncedSearch,
        pagination, setPagination,
        sortModel,
        handleSortChanged,
        handlePageSizeChange,
    } = usePersistentTableState({
        storageKey: 'tds-checklists',
        defaultTab: 'all' as const,
        defaultSortBy: 'id',
        defaultSortOrder: 'desc',
    });

    const yearMonth = useYearMonthFilter();

    const handleYearChange = (value: string) => {
        yearMonth.setYear(value);
        setPagination((p) => ({ ...p, pageIndex: 0 }));
    };

    const handleMonthChange = (value: string) => {
        yearMonth.setMonth(value);
        setPagination((p) => ({ ...p, pageIndex: 0 }));
    };

    const { data: apiResponse, isLoading: loading, error } = useTdsChecklists(
        {
            page: pagination.pageIndex + 1,
            limit: pagination.pageSize,
            search: debouncedSearch || undefined,
            year: yearMonth.filterYear,
            month: yearMonth.filterMonth,
        },
        { sortBy: sortModel[0]?.colId, sortOrder: sortModel[0]?.sort }
    );

    const tableData = apiResponse?.data || [];
    const totalRows = apiResponse?.meta?.total || tableData.length;
    const summary = apiResponse?.summary;

    const colDefs = useMemo<ColDef<TdsChecklistRow>[]>(
        () => [
            {
                field: 'id',
                colId: 'id',
                headerName: 'ID',
                width: 80,
                sortable: true,
                filter: true,
            },
            {
                field: 'projectName',
                colId: 'projectName',
                headerName: 'Project',
                width: 220,
                sortable: true,
                filter: true,
            },
            {
                field: 'poNumber',
                colId: 'poNumber',
                headerName: 'PO Number',
                width: 250,
                sortable: true,
                filter: true,
            },
            {
                field: 'partyName',
                colId: 'partyName',
                headerName: 'Party Name',
                width: 180,
                sortable: true,
                filter: true,
            },
            {
                field: 'sellerName',
                colId: 'sellerName',
                headerName: 'Seller',
                width: 150,
                sortable: true,
                filter: true,
            },
            currencyCol<TdsChecklistRow>('amount', {
                headerName: 'PR Amount',
                colId: 'amount',
                width: 130,
            }),
            currencyCol<TdsChecklistRow>('tdsAmount', {
                headerName: 'TDS Amount',
                colId: 'tdsAmount',
                width: 130,
            }),
            dateOnlyCol<TdsChecklistRow>('tdsReturnDate', {
                headerName: 'TDS Return Date',
                colId: 'tdsReturnDate',
                width: 140,
            }),
            dateOnlyCol<TdsChecklistRow>('invoiceDate', {
                headerName: 'Invoice Date',
                colId: 'invoiceDate',
                width: 140,
            }),
        ],
        []
    );

    if (loading && !tableData.length) {
        return (
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <Skeleton className="h-8 w-64" />
                            <Skeleton className="h-4 w-48 mt-2" />
                        </div>
                        <Skeleton className="h-6 w-72" />
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <Skeleton className="h-[500px] w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>TDS Checklists</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load TDS checklists. Please try again later.
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
                        <CardTitle>TDS Checklists</CardTitle>
                        <CardDescription className="mt-2">
                            All TDS returns listed
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                            PR Amount: {formatINR(summary?.totalAmount ?? 0)}
                        </Badge>
                        <Badge variant="secondary">
                            TDS Amount: {formatINR(summary?.totalTdsAmount ?? 0)}
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <div className="flex items-start gap-4 px-6 pb-4">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <Select value={yearMonth.year} onValueChange={handleYearChange}>
                                <SelectTrigger className="w-[130px]">
                                    <SelectValue placeholder="Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {yearMonth.yearOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={yearMonth.month}
                                onValueChange={handleMonthChange}
                                disabled={yearMonth.year === 'all'}
                            >
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="Month" />
                                </SelectTrigger>
                                <SelectContent>
                                    {yearMonth.monthOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <p className="text-xs text-muted-foreground">{yearMonth.description}</p>
                    </div>
                    <div className="flex-1 flex justify-end">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search by project, PO number, party..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-8 w-80"
                            />
                        </div>
                    </div>
                </div>

                {tableData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <FileX2 className="h-12 w-12 mb-4" />
                        <p className="text-lg font-medium">No TDS checklists found</p>
                    </div>
                ) : (
                    <DataTable
                        data={tableData}
                        columnDefs={colDefs}
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
                                '<span style="padding: 10px; text-align: center;">No TDS checklists found</span>',
                        }}
                    />
                )}
            </CardContent>
        </Card>
    );
};

export default TdsChecklistListPage;