import { Button } from '@/components/ui/button';
import DataTable from '@/components/ui/data-table';
import type { ColDef, RowSelectionOptions } from 'ag-grid-community';
import { useState, useImperativeHandle, forwardRef } from 'react';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import {
    useDesignations,
    useDeleteDesignation,
} from '@/hooks/api/useDesignations';
import type { Designation } from '@/types/api.types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DesignationModal } from './DesignationModal';

const rowSelection: RowSelectionOptions = {
    mode: 'multiRow',
    headerCheckbox: false,
};

type DesignationsContentProps = {
    showHeader?: boolean;
    onAddClick?: () => void;
};

export type DesignationsContentHandle = {
    openAddModal: () => void;
};

export const DesignationsContent = forwardRef<DesignationsContentHandle, DesignationsContentProps>(
    ({ showHeader = true, onAddClick }, ref) => {
    const {
        data: categories,
        isLoading,
        error,
        refetch,
    } = useDesignations();
    const deleteCategory = useDeleteDesignation();
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedDesignation, setSelectedDesignation] = useState<Designation | null>(null);

    const categoryActions: ActionItem<Designation>[] = [
        {
            label: 'Edit',
            onClick: (row) => {
                setSelectedDesignation(row);
                setModalOpen(true);
            },
        },
        {
            label: 'Delete',
            className: 'text-red-600',
            onClick: async (row) => {
                if (confirm(`Are you sure you want to delete "${row.name}"?`)) {
                    try {
                        await deleteCategory.mutateAsync(row.id);
                    } catch (error) {
                        console.error('Delete failed:', error);
                    }
                }
            },
        },
    ];

    const [colDefs] = useState<ColDef<Designation>[]>([
        {
            headerName: 'S.No.',
            valueGetter: 'node.rowIndex + 1',
            width: 80,
            filter: false,
            sortable: false,
        },
        {
            field: 'name',
            headerName: 'Designation',
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
            cellRenderer: createActionColumnRenderer(categoryActions),
            pinned: 'right',
            width: 100,
        },
    ]);

    const handleAddClick = () => {
        if (onAddClick) {
            onAddClick();
        } else {
            setSelectedDesignation(null);
            setModalOpen(true);
        }
    };

    useImperativeHandle(ref, () => ({
        openAddModal: () => {
            setSelectedDesignation(null);
            setModalOpen(true);
        },
    }));

    if (isLoading) {
        return (
            <div className="space-y-4">
                {showHeader && (
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                )}
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-4">
                {showHeader && (
                    <div className="space-y-2">
                        <h2 className="text-2xl font-semibold">Designations</h2>
                        <p className="text-muted-foreground">Manage all designations</p>
                    </div>
                )}
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Error loading designations: {error.message}
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
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {showHeader && (
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-2xl font-semibold">Designations</h2>
                        <p className="text-muted-foreground">
                            Manage designations for user management
                        </p>
                    </div>
                    <Button variant="default" onClick={handleAddClick}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Designation
                    </Button>
                </div>
            )}
            <div className="flex-1 min-h-0">
                <DataTable
                    data={categories || []}
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
            </div>
            <DesignationModal
                open={modalOpen}
                onOpenChange={(open) => {
                    setModalOpen(open);
                    if (!open) {
                        setSelectedDesignation(null);
                    }
                }}
                designation={selectedDesignation}
                onSuccess={() => {
                    refetch();
                }}
            />
        </div>
    );
});
