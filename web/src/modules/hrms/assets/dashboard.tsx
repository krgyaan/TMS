import React, { useMemo } from 'react';
import { useHrmsAssetsAll } from '@/hooks/api/useHrmsAssets';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DataTable from '@/components/ui/data-table';
import type { ColDef } from 'ag-grid-community';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { Eye, Edit, Plus, PcCase, MonitorSmartphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { dateCol } from '@/components/data-grid';
import { paths } from '@/app/routes/paths';
import { ASSET_STATUS } from './constants';

const AssetAdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { data: assets, isLoading } = useHrmsAssetsAll();

    const tableData = assets || [];

    const rowActions: ActionItem<any>[] = [
        {
            label: 'View Details',
            onClick: (row) => navigate(paths.hrms.assetView(row.id)),
            icon: <Eye className="h-4 w-4" />,
        },
        {
            label: 'Edit',
            onClick: (row) => navigate(paths.hrms.assetEdit(row.id)),
            icon: <Edit className="h-4 w-4" />,
        },
        {
            label: 'Status',
            onClick: (row) => navigate(paths.hrms.assetStatus(row.id)),
            icon: <Edit className="h-4 w-4" />,
        },
    ];

    const getStatusBadge = (status: string | null | undefined) => {
        if (!status || status.toLowerCase() === 'assigned') {
             return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100 border-none">Assigned</Badge>;
        }
        return <Badge variant="secondary">{status}</Badge>;
    };

    const colDefs = useMemo<ColDef<any>[]>(
        () => [
            {
                field: 'assetCode',
                headerName: 'Asset Code',
                width: 150,
                sortable: true,
                filter: true,
                cellRenderer: (params: any) => <span className="font-mono text-sm font-medium text-primary">{params.value || '—'}</span>,
            },
            {
                field: 'brand',
                headerName: 'Asset Details',
                width: 250,
                sortable: true,
                filter: true,
                valueGetter: (params: any) => {
                    return `${params.data.assetType || ''} ${params.data.brand || ''} ${params.data.model || ''}`.trim() || '—';
                },
                cellRenderer: (params: any) => (
                    <div className="flex flex-col justify-center h-full py-1">
                        <div className="font-semibold leading-tight text-gray-900 dark:text-gray-100">
                            {params.data.assetType} • {params.data.brand} {params.data.model}
                        </div>
                        <div className="text-xs text-muted-foreground leading-tight mt-0.5">
                            {params.data.serialNumber ? `SN: ${params.data.serialNumber}` : 'No Serial'}
                        </div>
                    </div>
                )
            },
            {
                field: 'userId',
                headerName: 'Assigned To',
                width: 150,
                sortable: true,
                filter: true,
                cellRenderer: (params: any) => <span className="font-medium">EMP-{params.value}</span>,
            },
            dateCol<any>('assignedDate', { includeTime: false }, {
                headerName: 'Assigned Date',
                width: 150,
            }),
            {
                field: 'assetStatus',
                headerName: 'Status',
                width: 130,
                sortable: true,
                filter: true,
                cellRenderer: (params: any) => getStatusBadge(ASSET_STATUS[params.value]),
            },
            {
                headerName: '',
                filter: false,
                cellRenderer: createActionColumnRenderer(rowActions),
                sortable: false,
                pinned: 'right',
                width: 57,
            },
        ],
        []
    );

    if (isLoading && !tableData.length) {
        return (
            <div className="container mx-auto py-6 space-y-6 max-w-7xl">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-48 mt-2" />
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-[500px] w-full" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 space-y-6 max-w-7xl">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-2xl flex items-center gap-2">
                                <MonitorSmartphone className="h-6 w-6 text-primary" />
                                Assets Administration
                            </CardTitle>
                            <CardDescription className="mt-2 text-base">
                                View and manage all company assets and user assignments.
                            </CardDescription>
                        </div>
                        <Button onClick={() => navigate(paths.hrms.assignAsset)} size="lg">
                            <Plus className="h-5 w-5 mr-2" />
                            Assign New Asset
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="px-0 sm:px-6">
                    {tableData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 border border-dashed rounded-lg bg-muted/30">
                            <PcCase className="h-12 w-12 mb-4 text-muted-foreground/50" />
                            <p className="text-lg font-medium">No assets deployed</p>
                            <p className="text-sm text-muted-foreground mt-1">Assign your first asset to an employee to get started.</p>
                            <Button variant="outline" className="mt-4" onClick={() => navigate(paths.hrms.assignAsset)}>
                                Assign Asset
                            </Button>
                        </div>
                    ) : (
                        <DataTable
                            data={tableData}
                            columnDefs={colDefs}
                            loading={isLoading}
                            manualPagination={false}
                            gridOptions={{
                                defaultColDef: {
                                    editable: false,
                                    filter: true,
                                    sortable: true,
                                    resizable: true,
                                },
                            }}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default AssetAdminDashboard;
