import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import DataTable from '@/components/ui/data-table'
import type { ColDef, RowSelectionOptions } from 'ag-grid-community'
import { createActionColumnRenderer } from '@/components/data-grid/renderers/ActionColumnRenderer'
import type { ActionItem } from '@/components/ui/ActionMenu'
import { useStatuses, useDeleteStatus } from '@/hooks/api/useStatuses'
import type { Status } from '@/types/api.types'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { StatusDrawer } from './components/StatusDrawer'
import { StatusViewModal } from './components/StatusViewModal'

const rowSelection: RowSelectionOptions = {
    mode: 'multiRow',
    headerCheckbox: false,
}

const StatusPage = () => {
    const { data: statuses, isLoading, error, refetch } = useStatuses()
    const deleteStatus = useDeleteStatus()
    const [drawerState, setDrawerState] = useState<{ open: boolean; status: Status | null }>({
        open: false,
        status: null,
    })
    const [viewState, setViewState] = useState<{ open: boolean; status: Status | null }>({
        open: false,
        status: null,
    })

    const statusActions: ActionItem<Status>[] = [
        {
            label: 'View',
            onClick: (row) => setViewState({ open: true, status: row }),
        },
        {
            label: 'Edit',
            onClick: (row) => setDrawerState({ open: true, status: row }),
        },
        {
            label: 'Delete',
            className: 'text-red-600',
            onClick: async (row) => {
                if (!confirm(`Delete status "${row.name}"?`)) {
                    return
                }
                try {
                    await deleteStatus.mutateAsync(row.id)
                } catch (err) {
                    console.error('Delete failed', err)
                }
            },
        },
    ]

    const colDefs: ColDef<Status>[] = [
        { field: 'id', headerName: 'ID', width: 80 },
        { field: 'name', headerName: 'Status', flex: 1 },
        {
            field: 'tenderCategory',
            headerName: 'Tender Category',
            flex: 1,
            valueGetter: (params) => params.data?.tenderCategory || '—',
        },
        {
            field: 'status',
            headerName: 'State',
            flex: 0.6,
            cellRenderer: (params: any) => (
                <Badge variant={params.value ? 'default' : 'secondary'}>
                    {params.value ? 'Active' : 'Inactive'}
                </Badge>
            ),
        },
        {
            headerName: 'Actions',
            filter: false,
            cellRenderer: createActionColumnRenderer(statusActions),
            sortable: false,
            pinned: 'right',
            width: 120,
        },
    ]

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
        )
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Status</CardTitle>
                    <CardDescription>List of all status records</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Error loading statuses: {error.message}
                            <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-2">
                                Retry
                            </Button>
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        )
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Status</CardTitle>
                    <CardDescription>Manage tender statuses and their categories</CardDescription>
                    <CardAction>
                        <Button
                            variant="default"
                            onClick={() => setDrawerState({ open: true, status: null })}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add New Status
                        </Button>
                    </CardAction>
                </CardHeader>
                <CardContent className="h-screen px-0">
                    <DataTable
                        data={statuses || []}
                        columnDefs={colDefs}
                        gridOptions={{
                            defaultColDef: { editable: false, filter: true },
                            rowSelection,
                            pagination: true,
                        }}
                        enablePagination
                        enableRowSelection
                        selectionType="multiple"
                        onSelectionChanged={(rows) => console.log('Row Selected!', rows)}
                        height="100%"
                    />
                </CardContent>
            </Card>

            <StatusDrawer
                open={drawerState.open}
                onOpenChange={(open) => setDrawerState({ ...drawerState, open })}
                status={drawerState.status}
                onSuccess={() => {
                    refetch()
                    setDrawerState({ open: false, status: null })
                }}
            />
            <StatusViewModal
                open={viewState.open}
                onOpenChange={(open) => setViewState({ ...viewState, open })}
                status={viewState.status}
            />
        </>
    )
}

export default StatusPage
