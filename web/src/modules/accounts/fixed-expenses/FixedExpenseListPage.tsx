import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DataTable from '@/components/ui/data-table';
import type { ColDef } from 'ag-grid-community';
import { useMemo } from 'react';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Eye, Pencil, Archive, FileX2, Search, Plus, Receipt } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QuickFilter } from '@/components/ui/quick-filter';
import { usePersistentTableState } from '@/hooks/usePersistentTableState';
import { useArchiveFixedExpense, useFixedExpenses } from '@/hooks/api/useFixedExpense';
import { useAuth } from '@/contexts/AuthContext';
import { currencyCol, dateCol } from '@/components/data-grid';
import type { FixedExpenseListParams, FixedExpenseListRow } from './helpers/fixedExpense.types';
import {
    FIXED_EXPENSE_TYPE_LABELS,
    FIXED_EXPENSE_FREQUENCY_LABELS,
    FIXED_EXPENSE_PAYMENT_MODE_LABELS,
    FIXED_EXPENSE_AMOUNT_TYPE_LABELS,
} from './helpers/fixedExpense.types';

const SORTABLE_FIELDS: FixedExpenseListParams['sortBy'][] = [
    'partyName',
    'amount',
    'type',
    'dueDate',
    'createdAt',
];

const AMOUNT_TYPE_OPTIONS = [
    { label: 'Fixed', value: 'fixed' },
    { label: 'Variable', value: 'variable' },
];

const FixedExpenseListPage = () => {
    const {
        activeTab,
        setActiveTab,
        search,
        setSearch,
        debouncedSearch,
        pagination,
        setPagination,
        sortModel,
        handleSortChanged,
        handlePageSizeChange,
    } = usePersistentTableState<'fixed' | 'variable'>({
        storageKey: 'fixed-expenses',
        defaultTab: 'fixed',
        defaultSortBy: 'createdAt',
        defaultSortOrder: 'desc',
    });

    const navigate = useNavigate();
    const { canCreate, canUpdate } = useAuth();
    const archiveMutation = useArchiveFixedExpense();

    const sort = sortModel[0];
    const sortBy = sort && SORTABLE_FIELDS.includes(sort.colId as FixedExpenseListParams['sortBy'])
        ? (sort.colId as FixedExpenseListParams['sortBy'])
        : undefined;

    const { data: apiResponse, isLoading: loading, error } = useFixedExpenses({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search: debouncedSearch || undefined,
        amountType: activeTab,
        ...(sortBy && sort ? { sortBy, sortOrder: sort.sort } : {}),
    });

    const rows = apiResponse?.data ?? [];
    const totalRows = apiResponse?.meta?.total ?? 0;

    const fixedExpenseActions: ActionItem<FixedExpenseListRow>[] = useMemo(
        () => [
            {
                label: 'View',
                onClick: (row) => navigate(paths.accounts.fixedExpenseView(row.id)),
                icon: <Eye className="h-4 w-4" />,
            },
            {
                label: 'Edit',
                onClick: (row) => navigate(paths.accounts.fixedExpenseEdit(row.id)),
                icon: <Pencil className="h-4 w-4" />,
                visible: () => canUpdate('accounts.fixed-expenses'),
            },
            {
                label: 'Archive',
                className: 'text-red-600',
                icon: <Archive className="h-4 w-4 text-red-600" />,
                visible: () => canUpdate('accounts.fixed-expenses'),
                onClick: (row) => {
                    if (
                        window.confirm(
                            `Archive "${row.partyName}"? It will be removed from the list.`
                        )
                    ) {
                        archiveMutation.mutate({ id: row.id, deleteStatus: true });
                    }
                },
            },
        ],
        [archiveMutation, canUpdate, navigate]
    );

    const colDefs = useMemo<ColDef<FixedExpenseListRow>[]>(
        () => [
            {
                field: 'partyName',
                colId: 'partyName',
                headerName: 'Party Name',
                flex: 1.5,
                minWidth: 160,
                valueGetter: (params) => params.data?.partyName ?? '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'type',
                colId: 'type',
                headerName: 'Type',
                flex: 1,
                minWidth: 130,
                cellRenderer: (params: { data?: FixedExpenseListRow }) => {
                    const type = params.data?.type;
                    if (!type) return '—';
                    return (
                        <Badge variant="secondary" className="h-5 px-2">
                            {FIXED_EXPENSE_TYPE_LABELS[type] ?? type}
                        </Badge>
                    );
                },
                sortable: true,
                filter: true,
            },
            {
                field: 'amountType',
                colId: 'amountType',
                headerName: 'Amount Type',
                flex: 0.8,
                minWidth: 110,
                cellRenderer: (params: { data?: FixedExpenseListRow }) => {
                    const amountType = params.data?.amountType;
                    if (!amountType) return '—';
                    return (
                        <Badge
                            variant={amountType === 'variable' ? 'outline' : 'secondary'}
                            className="h-5 px-2"
                        >
                            {FIXED_EXPENSE_AMOUNT_TYPE_LABELS[amountType] ?? amountType}
                        </Badge>
                    );
                },
                sortable: true,
                filter: true,
            },
            currencyCol<FixedExpenseListRow>('amount', {
                field: 'amount',
                colId: 'amount',
                headerName: 'Amount',
                flex: 1,
                minWidth: 130,
                sortable: true,
                filter: true,
            }),
            {
                field: 'paymentMode',
                colId: 'paymentMode',
                headerName: 'Payment Mode',
                flex: 1,
                minWidth: 130,
                cellRenderer: (params: { data?: FixedExpenseListRow }) => {
                    const paymentMode = params.data?.paymentMode;
                    if (!paymentMode) return '—';
                    return (
                        <Badge variant="outline" className="h-5 px-2">
                            {FIXED_EXPENSE_PAYMENT_MODE_LABELS[paymentMode] ?? paymentMode}
                        </Badge>
                    );
                },
                sortable: true,
                filter: true,
            },
            dateCol<FixedExpenseListRow>('dueDate', { includeTime: false }, {
                field: 'dueDate',
                colId: 'dueDate',
                headerName: 'Due Date',
                flex: 1,
                minWidth: 120,
                sortable: true,
                filter: true,
            }),
            {
                field: 'paymentFrequency',
                colId: 'paymentFrequency',
                headerName: 'Frequency',
                flex: 0.9,
                minWidth: 110,
                cellRenderer: (params: { data?: FixedExpenseListRow }) => {
                    const frequency = params.data?.paymentFrequency;
                    if (!frequency) return '—';
                    return (
                        <Badge variant="secondary" className="h-5 px-2">
                            {FIXED_EXPENSE_FREQUENCY_LABELS[frequency] ?? frequency}
                        </Badge>
                    );
                },
                sortable: true,
                filter: true,
            },
            {
                field: 'status',
                colId: 'status',
                headerName: 'Status',
                flex: 0.7,
                minWidth: 100,
                cellRenderer: (params: { data?: FixedExpenseListRow }) => {
                    if (!params.data) return '—';
                    return (
                        <Badge variant="outline" className="h-5 px-2">
                            {params.data.status ?? '—'}
                        </Badge>
                    );
                },
                sortable: false,
                filter: false,
            },
            {
                headerName: 'Actions',
                filter: false,
                cellRenderer: createActionColumnRenderer(fixedExpenseActions),
                sortable: false,
                pinned: 'right',
                width: 80,
            },
        ],
        [fixedExpenseActions]
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
                    <CardTitle>Fixed Expenses</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load Fixed Expenses list. Please try again later.
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
                        <CardTitle className="flex items-center gap-2">
                            <Receipt className="h-5 w-5" />
                            Fixed Expenses
                        </CardTitle>
                        <CardDescription className="mt-2">
                            Manage recurring fixed and variable expenses
                        </CardDescription>
                    </div>
                    {canCreate('accounts.fixed-expenses') && (
                        <Button onClick={() => navigate(paths.accounts.fixedExpenseCreate)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Fixed Expense
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <div className="flex items-center gap-4 px-6 pb-4">
                    <QuickFilter
                        options={AMOUNT_TYPE_OPTIONS}
                        value={activeTab}
                        onChange={(value) => setActiveTab(value as 'fixed' | 'variable')}
                    />
                    <div className="flex-1 flex justify-end">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search by party name, account no..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-8 w-64"
                            />
                        </div>
                    </div>
                </div>
                {rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground px-6">
                        <FileX2 className="h-12 w-12 mb-4" />
                        <p className="text-lg font-medium">No Fixed Expenses found</p>
                        <p className="text-sm mt-2">
                            {activeTab === 'variable'
                                ? 'No variable expenses found. Switch to the Fixed tab or create a new expense.'
                                : 'Create a new fixed expense using the "Add Fixed Expense" button above.'}
                        </p>
                    </div>
                ) : (
                    <DataTable
                        data={rows}
                        columnDefs={colDefs as ColDef<FixedExpenseListRow>[]}
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
                                '<span style="padding: 10px; text-align: center;">No Fixed Expenses found</span>',
                        }}
                    />
                )}
            </CardContent>
        </Card>
    );
};

export default FixedExpenseListPage;
