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
import { AlertCircle, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import { useCostingSheets, type CostingSheetDashboardRow } from '@/hooks/api/useCostingSheets';

const CostingSheets = () => {
    const navigate = useNavigate();

    const { data: costingSheetsData, isLoading: loading, error } = useCostingSheets();

    const costingSheetActions: ActionItem<CostingSheetDashboardRow>[] = [
        {
            label: 'View',
            onClick: (row: CostingSheetDashboardRow) => {
                navigate(paths.tendering.tenderView(row.tenderId));
            },
            icon: <Eye className="h-4 w-4" />,
        },
    ];

    const colDefs = useMemo<ColDef<CostingSheetDashboardRow>[]>(() => [
        {
            field: 'tenderNo',
            headerName: 'Tender No',
            flex: 1,
            minWidth: 120,
            sortable: true,
            filter: true,
            valueGetter: (params: any) => params.data?.tenderNo || '—',
        },
        {
            field: 'tenderName',
            headerName: 'Tender Name',
            flex: 2,
            minWidth: 200,
            sortable: true,
            filter: true,
            valueGetter: (params: any) => params.data?.tenderName || '—',
        },
        {
            field: 'teamMemberName',
            headerName: 'Member',
            flex: 1.5,
            minWidth: 150,
            valueGetter: (params: any) => params.data?.teamMemberName || '—',
            sortable: true,
            filter: true,
        },
        {
            field: 'itemName',
            headerName: 'Item',
            flex: 1,
            minWidth: 120,
            valueGetter: (params: any) => params.data?.itemName || '—',
            sortable: true,
            filter: true,
        },
        {
            field: 'dueDate',
            headerName: 'Due Date',
            flex: 1.5,
            minWidth: 150,
            valueGetter: (params: any) => params.data?.dueDate ? formatDateTime(params.data.dueDate) : '—',
            sortable: true,
            filter: true,
        },
        {
            field: 'gstValues',
            headerName: 'Tender Value',
            flex: 1,
            minWidth: 130,
            valueGetter: (params: any) => {
                const value = params.data?.gstValues;
                if (value === null || value === undefined) return '—';
                return formatINR(value);
            },
            sortable: true,
            filter: true,
        },
        {
            field: 'statusName',
            headerName: 'Status',
            flex: 1,
            minWidth: 120,
            valueGetter: (params: any) => params.data?.statusName || '—',
            sortable: true,
            filter: true,
            cellRenderer: (params: any) => {
                const status = params.value;
                if (!status) return '—';
                return (
                    <Badge variant="default">
                        {status}
                    </Badge>
                );
            },
        },
        {
            headerName: 'Actions',
            filter: false,
            cellRenderer: createActionColumnRenderer(costingSheetActions),
            sortable: false,
            pinned: 'right',
            width: 120,
        },
    ], [costingSheetActions]);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48 mt-2" />
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
                    <CardTitle>Costing Sheets</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load costing sheets. Please try again later.
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
                        <CardTitle>Costing Sheets</CardTitle>
                        <CardDescription className="mt-2">
                            All costing sheets for approved tenders.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                {costingSheetsData && costingSheetsData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <p className="text-lg font-medium">No costing sheets found</p>
                        <p className="text-sm mt-2">
                            Approved tenders with filled infosheets will appear here
                        </p>
                    </div>
                ) : (
                    <DataTable
                        data={costingSheetsData || []}
                        columnDefs={colDefs as ColDef<any>[]}
                        loading={false}
                        gridOptions={{
                            defaultColDef: {
                                editable: false,
                                filter: true,
                                sortable: true,
                                resizable: true
                            },
                            pagination: true,
                            paginationPageSize: 50,
                            overlayNoRowsTemplate: '<span style="padding: 10px; text-align: center;">No costing sheets found</span>',
                        }}
                        enablePagination
                        height="auto"
                    />
                )}
            </CardContent>
        </Card>
    );
};

export default CostingSheets;
