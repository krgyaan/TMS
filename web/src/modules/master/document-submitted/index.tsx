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
import {
    useDocumentsSubmitted,
    useDeleteDocumentSubmitted,
} from '@/hooks/api/useDocumentsSubmitted';
import type { DocumentSubmitted } from '@/types/api.types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const rowSelection: RowSelectionOptions = {
    mode: 'multiRow',
    headerCheckbox: false,
};

const DocumentsSubmitted = () => {
    const {
        data: documents,
        isLoading,
        error,
        refetch,
    } = useDocumentsSubmitted();
    const deleteDocument = useDeleteDocumentSubmitted();

    // Document actions
    const documentActions: ActionItem<DocumentSubmitted>[] = [
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
                        await deleteDocument.mutateAsync(row.id);
                    } catch (error) {
                        console.error('Delete failed:', error);
                    }
                }
            },
        },
    ];

    const [colDefs] = useState<ColDef<DocumentSubmitted>[]>([
        {
            headerName: 'S.No.',
            valueGetter: 'node.rowIndex + 1',
            width: 80,
            filter: false,
            sortable: false,
        },
        {
            field: 'name',
            headerName: 'Document Type',
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
            cellRenderer: createActionColumnRenderer(documentActions),
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
                    <CardTitle>Documents Submitted</CardTitle>
                    <CardDescription>Manage document types</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Error loading documents: {error.message}
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
                <CardTitle>Documents Submitted</CardTitle>
                <CardDescription>
                    Manage document types required for submissions
                </CardDescription>
                <CardAction>
                    <Button variant="default" asChild>
                        <NavLink to={paths.master.documents_submitted_create}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Document Type
                        </NavLink>
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent className="h-screen px-0">
                <DataTable
                    data={documents || []}
                    columnDefs={colDefs}
                    loading={isLoading || deleteDocument.isPending}
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

export default DocumentsSubmitted;
