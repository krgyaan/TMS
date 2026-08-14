import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DataTable from '@/components/ui/data-table';
import type { ColDef } from 'ag-grid-community';
import { useMemo, useState, useEffect } from 'react';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Eye, Edit, Plus, Search, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { useDeleteInsurancePolicy, useInsurancePolicies } from '@/hooks/api/useInsurancePolicies';
import { Badge } from '@/components/ui/badge';
import type { InsurancePolicyRow } from '../helpers/insurance.types';
import { currencyCol, dateCol } from '@/components/data-grid';
import { formatINR } from '@/hooks/useINRFormatter';

const STATUS_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    Active: 'default',
    'Expiring Soon': 'secondary',
    Expired: 'destructive',
};

const InsuranceDashboardPage = () => {
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedSearch(search, 300);
    const navigate = useNavigate();
    const deleteMutation = useDeleteInsurancePolicy();

    useEffect(() => {
        setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, [debouncedSearch]);

    const { data: apiResponse, isLoading: loading, error } = useInsurancePolicies(
        { page: pagination.pageIndex + 1, limit: pagination.pageSize, search: debouncedSearch || undefined },
    );

    const rows = apiResponse?.data ?? [];
    const totalRows = apiResponse?.meta?.total ?? 0;

    const insuranceActions: ActionItem<InsurancePolicyRow>[] = useMemo(
        () => [
            {
                label: 'View Details',
                onClick: (row) => navigate(paths.accounts.insuranceView(row.id)),
                icon: <Eye className="h-4 w-4" />,
            },
            {
                label: 'Edit',
                onClick: (row) => navigate(paths.accounts.insuranceEdit(row.id)),
                icon: <Edit className="h-4 w-4" />,
            },
            {
                label: 'Delete',
                onClick: (row) => {
                    if (window.confirm(`Delete insurance policy #${row.id}?`)) {
                        deleteMutation.mutate(row.id);
                    }
                },
                icon: <Trash2 className="h-4 w-4" />,
                danger: true,
            },
        ],
        [navigate, deleteMutation]
    );

    const colDefs = useMemo<ColDef<InsurancePolicyRow>[]>(
        () => [
            {
                field: 'insuranceType',
                colId: 'insuranceType',
                headerName: 'Insurance Type',
                maxWidth: 120,
                cellRenderer: (params: { data?: InsurancePolicyRow }) => (
                    <Badge variant="outline" className="h-5 px-2">
                        {params.data?.insuranceType ?? '—'}
                    </Badge>
                ),
                sortable: true,
                filter: true,
            },
            {
                field: 'policyNumber',
                colId: 'policyNumber',
                headerName: 'Policy Number',
                maxWidth: 140,
                valueGetter: (params) => params.data?.policyNumber ?? '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'insurerName',
                colId: 'insurerName',
                headerName: 'Insurer Name',
                maxWidth: 140,
                valueGetter: (params) => params.data?.insurerName ?? '—',
                sortable: true,
                filter: true,
            },
            {
                field: 'projectName',
                colId: 'projectName',
                headerName: 'Project Name',
                maxWidth: 200,
                valueGetter: (params) => params.data?.projectName ?? '—',
                sortable: true,
                filter: true,
            },
            dateCol<InsurancePolicyRow>('startDate', { includeTime: false,}, {
                field:'startDate',
                headerName: 'Start Date',
                sortable: true,
                filter: true
            }),
            dateCol<InsurancePolicyRow>('endDate', { includeTime: false,}, {
                field:'endDate',
                headerName: 'End Date',
                sortable: true,
                filter: true
            }),
            currencyCol<InsurancePolicyRow>('sumAssured', {
                field:'sumAssured',
                headerName: 'Sum Assured',
                sortable: true,
                filter: true,
                cellRenderer: (params: { data?: InsurancePolicyRow }) => (
                    <span>
                        {params.data?.sumAssured !== undefined ? formatINR(params.data.sumAssured) : '—'}
                    </span>
                ),
            }),
            {
                field: 'status',
                colId: 'status',
                headerName: 'Status',
                flex: 1,
                maxWidth: 120,
                cellRenderer: (params: { data?: InsurancePolicyRow }) => (
                    <Badge variant={STATUS_BADGE_VARIANT[params.data?.status ?? 'Expired'] ?? 'outline'} className="h-5 px-2">
                        {params.data?.status ?? '—'}
                    </Badge>
                ),
                sortable: true,
                filter: true,
            },
            {
                field: 'createdByName',
                colId: 'createdByName',
                headerName: 'Created By',
                maxWidth: 130,
                valueGetter: (params) => params.data?.createdByName ?? '—',
                sortable: true,
                filter: true,
            },
            {
                headerName: '',
                width: 60,
                cellRenderer: createActionColumnRenderer<InsurancePolicyRow>(insuranceActions),
                sortable: false,
                filter: false,
                pinned: 'right',
            }
        ],
        [insuranceActions]
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>Insurance Policies</CardTitle>
                <CardDescription>Manage insurance policies raised through imprests, maker requests, or directly.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="mb-4 flex flex-wrap items-center gap-3">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search by policy number, insurer, project..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <div className="ml-auto">
                        <Button onClick={() => navigate(paths.accounts.insuranceCreate)}>
                            <Plus className="h-4 w-4" /> Create Policy
                        </Button>
                    </div>
                </div>

                {error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>Failed to load insurance policies.</AlertDescription>
                    </Alert>
                )}

                {loading && !rows.length ? (
                    <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                        ))}
                    </div>
                ) : (
                    <DataTable
                        data={rows}
                        columnDefs={colDefs}
                        loading={loading}
                        manualPagination
                        rowCount={totalRows}
                        paginationState={pagination}
                        onPaginationChange={setPagination}
                        onPageSizeChange={(pageSize) => setPagination({ pageIndex: 0, pageSize })}
                        showTotalCount
                        showLengthChange
                        gridOptions={{
                            defaultColDef: {
                                editable: false,
                                filter: true,
                                sortable: true,
                                resizable: true,
                            },
                            overlayNoRowsTemplate:
                                '<span style="padding: 10px; text-align: center;">No insurance policies found</span>',
                        }}
                    />
                )}
            </CardContent>
        </Card>
    );
};

export default InsuranceDashboardPage;