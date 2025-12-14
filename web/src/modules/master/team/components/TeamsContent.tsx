import { Button } from '@/components/ui/button';
import DataTable from '@/components/ui/data-table';
import type { ColDef, RowSelectionOptions } from 'ag-grid-community';
import { useState, useImperativeHandle, forwardRef } from 'react';
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer';
import type { ActionItem } from '@/components/ui/ActionMenu';
import { useTeams, useDeleteTeam } from '@/hooks/api/useTeams';
import type { Team } from '@/types/api.types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TeamModal } from './TeamModal';

const rowSelection: RowSelectionOptions = {
    mode: 'multiRow',
    headerCheckbox: false,
};

type TeamsContentProps = {
    showHeader?: boolean;
    onAddClick?: () => void;
};

export type TeamsContentHandle = {
    openAddModal: () => void;
};

export const TeamsContent = forwardRef<TeamsContentHandle, TeamsContentProps>(
    ({ showHeader = true, onAddClick }, ref) => {
    const { data: teams, isLoading, error, refetch } = useTeams();
    const deleteTeam = useDeleteTeam();
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

    const teamActions: ActionItem<Team>[] = [
        {
            label: 'Edit',
            onClick: (row) => {
                setSelectedTeam(row);
                setModalOpen(true);
            },
        },
        {
            label: 'Delete',
            className: 'text-red-600',
            onClick: async (row) => {
                if (confirm(`Are you sure you want to delete "${row.name}"?`)) {
                    try {
                        await deleteTeam.mutateAsync(row.id);
                    } catch (error) {
                        console.error('Delete failed:', error);
                    }
                }
            },
        },
    ];

    const [colDefs] = useState<ColDef<Team>[]>([
        {
            headerName: 'S.No.',
            valueGetter: 'node.rowIndex + 1',
            width: 80,
            filter: false,
            sortable: false,
        },
        {
            field: 'name',
            headerName: 'Team Name',
            flex: 2,
            filter: 'agTextColumnFilter',
        },
        {
            field: 'description',
            headerName: 'Description',
            flex: 2,
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
            cellRenderer: createActionColumnRenderer(teamActions),
            pinned: 'right',
            width: 100,
        },
    ]);

    const handleAddClick = () => {
        if (onAddClick) {
            onAddClick();
        } else {
            setSelectedTeam(null);
            setModalOpen(true);
        }
    };

    useImperativeHandle(ref, () => ({
        openAddModal: () => {
            setSelectedTeam(null);
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
                        <h2 className="text-2xl font-semibold">Teams</h2>
                        <p className="text-muted-foreground">Manage all teams</p>
                    </div>
                )}
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Error loading teams: {error.message}
                        <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-4">
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
                        <h2 className="text-2xl font-semibold">Teams</h2>
                        <p className="text-muted-foreground">Manage organizational teams</p>
                    </div>
                    <Button variant="default" onClick={handleAddClick}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Team
                    </Button>
                </div>
            )}
            <div className="flex-1 min-h-0">
                <DataTable
                    data={teams || []}
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
            <TeamModal
                open={modalOpen}
                onOpenChange={(open) => {
                    setModalOpen(open);
                    if (!open) {
                        setSelectedTeam(null);
                    }
                }}
                team={selectedTeam}
                onSuccess={() => {
                    refetch();
                }}
            />
        </div>
    );
});
