import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DataTable from '@/components/ui/data-table';
import type { ColDef, RowSelectionOptions } from 'ag-grid-community';
import { useState } from 'react';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { useIndustries } from '@/hooks/api/useIndustries';
import type { Industry } from '@/types/api.types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { IndustryDrawer } from './components/IndustryDrawer';
import { IndustryViewModal } from './components/IndustryViewModal';

const rowSelection: RowSelectionOptions = {
    mode: 'multiRow',
    headerCheckbox: false,
};

const IndustriesPage = () => {
    const { data: industries, isLoading, error, refetch } = useIndustries();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(null);

    const industryActions: ActionItem<Industry>[] = [
        {
            label: 'View',
            onClick: (row) => {
                setSelectedIndustry(row);
                setViewModalOpen(true);
            },
        },
        {
            label: 'Edit',
            onClick: (row) => {
                setSelectedIndustry(row);
                setDrawerOpen(true);
            },
        },
        {
            label: 'Delete',
            className: 'text-red-600',
            onClick: async (row) => {
                if (confirm(`Are you sure you want to delete "${row.name}"?`)) {
                    try {
                        // await deleteIndustry.mutateAsync(row.id);
                        console.log('Delete functionality to be implemented');
                    } catch (error) {
                        console.error('Delete failed:', error);
                    }
                }
            },
        },
    ];

    const [colDefs] = useState<ColDef<Industry>[]>([
        {
            headerName: 'S.No.',
            valueGetter: 'node.rowIndex + 1',
            width: 80,
            filter: false,
            sortable: false,
        },
        {
            field: 'name',
            headerName: 'Industry Name',
            flex: 2,
            filter: 'agTextColumnFilter',
        },
        {
            field: 'description',
            headerName: 'Description',
            flex: 3,
            filter: 'agTextColumnFilter',
            cellRenderer: (params: any) => {
                return params.value || <span className="text-gray-400">—</span>;
            },
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
            cellRenderer: createActionColumnRenderer(industryActions),
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
                    <CardTitle>Industries</CardTitle>
                    <CardDescription>Manage all industries</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Error loading industries: {error.message}
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
            setSelectedIndustry(null);
        }
    };

    const handleViewModalClose = (open: boolean) => {
        setViewModalOpen(open);
        if (!open) {
            setSelectedIndustry(null);
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Industries</CardTitle>
                    <CardDescription>Manage industry classifications</CardDescription>
                    <CardAction>
                        <Button
                            variant="default"
                            onClick={() => {
                                setSelectedIndustry(null);
                                setDrawerOpen(true);
                            }}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Industry
                        </Button>
                    </CardAction>
                </CardHeader>
                <CardContent className="h-screen px-0">
                    <DataTable
                        data={industries || []}
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
            <IndustryDrawer
                open={drawerOpen}
                onOpenChange={handleDrawerClose}
                industry={selectedIndustry}
                onSuccess={() => {
                    refetch();
                }}
            />
            <IndustryViewModal
                open={viewModalOpen}
                onOpenChange={handleViewModalClose}
                industry={selectedIndustry}
            />
        </>
    );
};

export default IndustriesPage;
