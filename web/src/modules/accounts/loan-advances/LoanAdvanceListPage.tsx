import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DataTable from '@/components/ui/data-table';
import type { ColDef } from 'ag-grid-community';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Eye, Edit, FileX2, Search, Plus, CalendarClock, FileCheck, Receipt } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { useLoanAdvances } from '@/hooks/api/useLoanAdvance';
import { Badge } from '@/components/ui/badge';
import type { LoanAdvanceListRow } from './helpers/loanAdvance.types';
import { currencyCol, dateCol } from '@/components/data-grid';

const LoanAdvanceListPage = () => {
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [sortModel, setSortModel] = useState<{ colId: string; sort: 'asc' | 'desc' }[]>([]);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedSearch(search, 300);
    const navigate = useNavigate();

    useEffect(() => {
        setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, [debouncedSearch]);

    const handleSortChanged = useCallback((event: any) => {
        const next = event.api
            .getColumnState()
            .filter((col: any) => col.sort)
            .map((col: any) => ({ colId: col.colId, sort: col.sort as 'asc' | 'desc' }));
        setSortModel(next);
        setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, []);

    const handlePageSizeChange = useCallback((newPageSize: number) => {
        setPagination({ pageIndex: 0, pageSize: newPageSize });
    }, []);

    const { data: apiResponse, isLoading: loading, error } = useLoanAdvances({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: debouncedSearch || undefined,
    });

    const rows = apiResponse?.data ?? [];
    const totalRows = apiResponse?.meta?.total ?? 0;
    const loanAdvanceActions: ActionItem<LoanAdvanceListRow>[] = useMemo(
        () => [
            {
                label: 'EMI Payment',
                onClick: (row) => navigate(paths.accounts.loanEmiPayment(row.id)),
                icon: <CalendarClock className='h-4 w-4' />,
                // Only show if EMI is due and loan is active
                hidden: (row: LoanAdvanceListRow) => !row.isDue || row.loanCloseStatus !== 'Active',
            },
            {
                label: 'TDS Recovery',
                onClick: (row) => navigate(paths.accounts.loanTdsRecovery(row.id)),
                icon: <Receipt className='h-4 w-4' />,
                // Only show if there's TDS to recover
                hidden: (row: LoanAdvanceListRow) => parseFloat(row.totalTdsToRecover ?? '0') <= 0,
            },
            {
                label: 'Close Loan',
                onClick: (row) => navigate(paths.accounts.loanClosure(row.id)),
                icon: <FileCheck className='h-4 w-4' />,
                // Only show if loan can be closed (showNocUpload is true)
                hidden: (row: LoanAdvanceListRow) => !row.showNocUpload || row.loanCloseStatus !== 'Active',
            },
            {
                label: 'View Details',
                onClick: (row) => navigate(paths.accounts.loanAdvancesView(row.id)),
                icon: <Eye className="h-4 w-4" />,
            },
            {
                label: 'Edit',
                onClick: (row) => navigate(paths.accounts.loanAdvancesEdit(row.id)),
                icon: <Edit className="h-4 w-4" />,
            }
        ],
        [navigate]
    );

    const colDefs = useMemo<ColDef<LoanAdvanceListRow>[]>(
        () => [
            {
                field: 'bankName',
                colId: 'bankName',
                headerName: 'Bank Name',
                flex: 1.5,
                minWidth: 150,
                valueGetter: (params) => params.data?.bankName ?? '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'loanAccNo',
                colId: 'loanAccNo',
                headerName: 'Loan Account No.',
                flex: 1,
                minWidth: 130,
                valueGetter: (params) => params.data?.loanAccNo ?? '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'typeOfLoan',
                colId: 'typeOfLoan',
                headerName: 'Loan Type',
                flex: 1,
                minWidth: 100,
                cellRenderer: (params: { data?: LoanAdvanceListRow }) => (
                    params.data?.typeOfLoan ? (
                        <Badge variant="secondary" className="h-5 px-2">
                            {params.data.typeOfLoan}
                        </Badge>
                    ) : '—'
                ),
                sortable: true,
                filter: true,
            },
            currencyCol<LoanAdvanceListRow>('loanAmount', {
                field: 'loanAmount',
                colId: 'loanAmount',
                headerName: 'Loan Amount',
                flex: 1,
                minWidth: 130,
                sortable: true,
                filter: true,
            }),
            currencyCol<LoanAdvanceListRow>('principleOutstanding', {
                field: 'principleOutstanding',
                colId: 'principleOutstanding',
                headerName: 'Outstanding',
                flex: 1,
                minWidth: 120,
                sortable: true,
                filter: true,
            }),
            dateCol<LoanAdvanceListRow>('emiPaymentDate', { includeTime: false }, {
                field: 'emiPaymentDate',
                colId: 'emiPaymentDate',
                headerName: 'EMI Date',
                flex: 1,
                minWidth: 100,
                sortable: true,
                filter: true,
            }),
            {
                field: 'noOfEmisPaid',
                colId: 'noOfEmisPaid',
                headerName: 'EMIs Paid',
                flex: 0.7,
                minWidth: 90,
                valueGetter: (params) => params.data?.noOfEmisPaid ?? 0,
                sortable: true,
                filter: true,
            },
            {
                field: 'isDue',
                colId: 'isDue',
                headerName: 'Due',
                flex: 0.6,
                minWidth: 70,
                cellRenderer: (params: { data?: LoanAdvanceListRow }) => {
                    if (params.data?.isDue === undefined) return '—';
                    return (
                        <Badge
                            variant={params.data.isDue ? 'destructive' : 'outline'}
                            className="h-5 px-2"
                        >
                            {params.data.isDue ? 'Yes' : 'No'}
                        </Badge>
                    );
                },
                sortable: true,
                filter: true,
            },
            {
                headerName: 'Actions',
                filter: false,
                cellRenderer: createActionColumnRenderer(loanAdvanceActions),
                sortable: false,
                pinned: 'right',
                width: 80,
            },
        ],
        [loanAdvanceActions]
    );

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48 mt-2" />
                </CardHeader>
                <CardContent className="p-6">
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-10 w-32" />
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
                    <CardTitle>Loan & Advance</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load Loan & Advance list. Please try again later.
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
                        <CardTitle>Loan & Advance</CardTitle>
                        <CardDescription className="mt-2">
                            Manage all loan and advance entries
                        </CardDescription>
                    </div>
                    <Button onClick={() => navigate(paths.accounts.loanAdvancesCreate)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Loan
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <div className="flex justify-between items-center gap-4 px-6 pb-4">
                    <div></div>
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search by bank name, account no..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </div>
                {rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground px-6">
                        <FileX2 className="h-12 w-12 mb-4" />
                        <p className="text-lg font-medium">No Loan & Advance entries found</p>
                        <p className="text-sm mt-2">
                            Create a new loan entry using the "Add New Loan" button above.
                        </p>
                    </div>
                ) : (
                    <DataTable
                        data={rows}
                        columnDefs={colDefs as ColDef<any>[]}
                        loading={loading}
                        manualPagination
                        rowCount={totalRows}
                        paginationState={pagination}
                        onPaginationChange={setPagination}
                        onPageSizeChange={handlePageSizeChange}
                        showTotalCount
                        showLengthChange
                        gridOptions={{
                            defaultColDef: {
                                editable: false,
                                filter: true,
                                sortable: true,
                                resizable: true,
                            },
                            onSortChanged: handleSortChanged,
                            overlayNoRowsTemplate:
                                '<span style="padding: 10px; text-align: center;">No Loan & Advance entries found</span>',
                        }}
                    />
                )}
            </CardContent>
        </Card>
    );
};

export default LoanAdvanceListPage;
