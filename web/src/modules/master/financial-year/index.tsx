import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DataTable from '@/components/ui/data-table';
import type { ColDef, RowSelectionOptions } from 'ag-grid-community';
import { useState } from 'react';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { useFinancialYears } from '@/hooks/api/useFinancialYear';
import type { FinancialYear } from '@/types/api.types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { FinancialYearDrawer } from './components/FinancialYearDrawer';
import { FinancialYearViewModal } from './components/FinancialYearViewModal';

const rowSelection: RowSelectionOptions = {
    mode: 'multiRow',
    headerCheckbox: false,
};

const FinancialYearPage = () => {
    const { data: financialYears, isLoading, error, refetch } = useFinancialYears();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedFinancialYear, setSelectedFinancialYear] = useState<FinancialYear | null>(null);

    const financialYearActions: ActionItem<FinancialYear>[] = [
        {
            label: 'View',
            onClick: (row) => {
                setSelectedFinancialYear(row);
                setViewModalOpen(true);
            },
        },
        {
            label: 'Edit',
            onClick: (row) => {
                setSelectedFinancialYear(row);
                setDrawerOpen(true);
            },
        },
        {
            label: 'Delete',
            className: 'text-red-600',
            onClick: async (row) => {
                if (confirm(`Are you sure you want to delete "${row.name}"?`)) {
                    try {
                        console.log('Delete functionality to be implemented');
                    } catch (error) {
                        console.error('Delete failed:', error);
                    }
                }
            },
        },
    ];

    const [colDefs] = useState<ColDef<FinancialYear>[]>([
        {
            headerName: 'S.No.',
            valueGetter: 'node.rowIndex + 1',
            width: 80,
            filter: false,
            sortable: false,
        },
        {
            field: 'name',
            headerName: 'Financial Year',
            flex: 2,
            filter: 'agTextColumnFilter',
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 120,
            filter: 'agSetColumnFilter',
            cellRenderer: (params: any) => (
                <Badge variant={params.value ? 'default' : 'secondary'}>
                    {params.value ? 'Active' : 'Inactive'}
                </Badge>
            ),
        },
        {
            headerName: 'Actions',
            filter: false,
            sortable: false,
            cellRenderer: createActionColumnRenderer(financialYearActions),
            pinned: 'right',
            width: 100,
        },
    ]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64 mt-2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-96 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Financial Years</CardTitle>
                    <CardDescription>Manage financial years</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Error loading financial years: {error.message}
                            <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-4">
                                Retry
                            </Button>
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    const handleDrawerClose = (open: boolean) => {
        setDrawerOpen(open);
        if (!open) {
            setSelectedFinancialYear(null);
        }
    };

    const handleViewModalClose = (open: boolean) => {
        setViewModalOpen(open);
        if (!open) {
            setSelectedFinancialYear(null);
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Financial Years</CardTitle>
                    <CardDescription>Manage financial year periods</CardDescription>
                    <CardAction>
                        <Button
                            variant="default"
                            onClick={() => {
                                setSelectedFinancialYear(null);
                                setDrawerOpen(true);
                            }}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Financial Year
                        </Button>
                    </CardAction>
                </CardHeader>
                <CardContent className="h-screen px-0">
                    <DataTable
                        data={financialYears || []}
                        columnDefs={colDefs}
                        gridOptions={{
                            defaultColDef: {
                                editable: false,
                                filter: true,
                                sortable: true,
                                resizable: true,
                            },
                            rowSelection,
                            pagination: true,
                            paginationPageSize: 20,
                            paginationPageSizeSelector: [10, 20, 50, 100],
                        }}
                        enablePagination={true}
                        enableRowSelection={true}
                        selectionType="multiple"
                        onSelectionChanged={(rows) => console.log('Selected rows:', rows)}
                        height="100%"
                    />
                </CardContent>
            </Card>
            <FinancialYearDrawer
                open={drawerOpen}
                onOpenChange={handleDrawerClose}
                financialYear={selectedFinancialYear}
                onSuccess={() => {
                    refetch();
                }}
            />
            <FinancialYearViewModal
                open={viewModalOpen}
                onOpenChange={handleViewModalClose}
                financialYear={selectedFinancialYear}
            />
        </>
    );
};

export default FinancialYearPage;
