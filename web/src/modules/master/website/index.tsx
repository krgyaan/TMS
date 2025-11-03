import { Button } from '@/components/ui/button';
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import DataTable from '@/components/ui/data-table';
import type { ColDef, RowSelectionOptions } from 'ag-grid-community';
import { useState } from 'react';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { NavLink } from 'react-router-dom';
import { paths } from '@/app/routes/paths';
import { useWebsites, useDeleteWebsite } from '@/hooks/api/useWebsites';
import type { Website } from '@/types/api.types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Plus, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const rowSelection: RowSelectionOptions = {
    mode: 'multiRow',
    headerCheckbox: false,
};

const Websites = () => {
    const { data: websites, isLoading, error, refetch } = useWebsites();
    const deleteWebsite = useDeleteWebsite();

    // Website actions
    const websiteActions: ActionItem<Website>[] = [
        {
            label: 'Edit',
            onClick: (row) => {
                console.log('Edit', row);
            },
        },
        {
            label: 'Delete',
            className: 'text-red-600',
            onClick: async (row) => {
                if (confirm(`Are you sure you want to delete "${row.name}"?`)) {
                    try {
                        await deleteWebsite.mutateAsync(row.id);
                    } catch (error) {
                        console.error('Delete failed:', error);
                    }
                }
            },
        },
    ];

    const [colDefs] = useState<ColDef<Website>[]>([
        {
            headerName: 'S.No.',
            valueGetter: 'node.rowIndex + 1',
            width: 80,
            filter: false,
            sortable: false,
        },
        {
            field: 'name',
            headerName: 'Website Name',
            flex: 2,
            filter: 'agTextColumnFilter',
        },
        {
            field: 'url',
            headerName: 'URL',
            flex: 2,
            filter: 'agTextColumnFilter',
            cellRenderer: (params: any) => {
                if (!params.value) {
                    return <span className="text-gray-400">—</span>;
                }
                return (
                    <a
                        href={params.value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {params.value}
                        <ExternalLink className="h-3 w-3" />
                    </a>
                );
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
            cellRenderer: createActionColumnRenderer(websiteActions),
            pinned: 'right',
            width: 100,
        },
    ]);

    // Loading state
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

    // Error state
    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Websites</CardTitle>
                    <CardDescription>Manage all websites</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Error loading websites: {error.message}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => refetch()}
                                className="ml-4"
                            >
                                Retry
                            </Button>
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Websites</CardTitle>
                <CardDescription>Manage all website links and URLs</CardDescription>
                <CardAction>
                    <Button variant="default" asChild>
                        <NavLink to={paths.master.websites_create}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add New Website
                        </NavLink>
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent className="h-screen px-0">
                <DataTable
                    data={websites || []}
                    columnDefs={colDefs}
                    loading={isLoading || deleteWebsite.isPending}
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
    );
};

export default Websites;
