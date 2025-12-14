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
import { useLoanParties } from '@/hooks/api/useLoanParties';
import type { LoanParty } from '@/types/api.types';
import { LoanPartyDrawer } from './components/LoanPartyDrawer';
import { LoanPartyViewModal } from './components/LoanPartyViewModal';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const rowSelection: RowSelectionOptions = {
    mode: 'multiRow',
    headerCheckbox: false,
};

const LoanPartyPage = () => {
    const { data: loanParties, isLoading, error, refetch } = useLoanParties();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedLoanParty, setSelectedLoanParty] = useState<LoanParty | null>(null);

    // Loan Party actions
    const loanPartyActions: ActionItem<LoanParty>[] = [
        {
            label: 'View',
            onClick: (row) => {
                setSelectedLoanParty(row);
                setViewModalOpen(true);
            },
        },
        {
            label: 'Edit',
            onClick: (row) => {
                setSelectedLoanParty(row);
                setDrawerOpen(true);
            },
        },
        {
            label: 'Delete',
            className: 'text-red-600',
            onClick: async (row) => {
                if (confirm(`Are you sure you want to delete "${row.name}"?`)) {
                    try {
                        // await deleteLoanParty.mutateAsync(row.id);
                        console.log('Delete functionality to be implemented');
                    } catch (error) {
                        console.error('Delete failed:', error);
                    }
                }
            },
        },
    ];

    const [colDefs] = useState<ColDef<LoanParty>[]>([
        {
            headerName: 'S.No.',
            valueGetter: 'node.rowIndex + 1',
            width: 80,
            filter: false,
            sortable: false,
        },
        {
            field: 'name',
            headerName: 'Loan Party Name',
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
            cellRenderer: createActionColumnRenderer(loanPartyActions),
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
                    <CardTitle>Loan Parties</CardTitle>
                    <CardDescription>Manage loan parties</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Error loading loan parties: {error.message}
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
        <>
        <Card>
            <CardHeader>
                <CardTitle>Loan Parties</CardTitle>
                <CardDescription>Manage loan parties</CardDescription>
                <CardAction>
                    <Button
                        variant="default"
                        onClick={() => {
                            setSelectedLoanParty(null);
                            setDrawerOpen(true);
                        }}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Loan Party
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent className="h-screen px-0">
                <DataTable
                    data={loanParties || []}
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
            <LoanPartyDrawer
                open={drawerOpen}
                onOpenChange={(open) => {
                    setDrawerOpen(open);
                    if (!open) {
                        setSelectedLoanParty(null);
                    }
                }}
                loanParty={selectedLoanParty}
                onSuccess={() => {
                    refetch();
                }}
            />
            <LoanPartyViewModal
                open={viewModalOpen}
                onOpenChange={(open) => {
                    setViewModalOpen(open);
                    if (!open) {
                        setSelectedLoanParty(null);
                    }
                }}
                loanParty={selectedLoanParty}
            />
        </>
    );
};

export default LoanPartyPage;
