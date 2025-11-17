import { useState, type ReactNode } from 'react'
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
import { NavLink, useNavigate } from 'react-router-dom'
import { paths } from '@/app/routes/paths'
import { useStatuses, useDeleteStatus } from '@/hooks/api/useStatuses'
import type { Status } from '@/types/api.types'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

const rowSelection: RowSelectionOptions = {
    mode: 'multiRow',
    headerCheckbox: false,
}

const formatDate = (value?: string | null) => {
    if (!value) {
        return '—'
    }
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

const DetailItem = ({ label, children }: { label: string; children: ReactNode }) => (
    <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground/90">{children}</p>
    </div>
)

const StatusPage = () => {
    const navigate = useNavigate()
    const { data: statuses, isLoading, error, refetch } = useStatuses()
    const deleteStatus = useDeleteStatus()

    const [viewState, setViewState] = useState<{ open: boolean; data: Status | null }>({
        open: false,
        data: null,
    })

    const statusActions: ActionItem<Status>[] = [
        {
            label: 'View',
            onClick: (row) => setViewState({ open: true, data: row }),
        },
        {
            label: 'Edit',
            onClick: (row) => navigate(paths.master.statuses_edit(row.id)),
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
            field: 'actions',
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
                        <Button variant="default" asChild>
                            <NavLink to={paths.master.statuses_create}>Add New Status</NavLink>
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

            <Dialog
                open={viewState.open}
                onOpenChange={(open) => setViewState((prev) => ({ open, data: open ? prev.data : null }))}
            >
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{viewState.data?.name}</DialogTitle>
                        <DialogDescription>
                            Tender status details and metadata
                        </DialogDescription>
                    </DialogHeader>
                    {viewState.data ? (
                        <div className="space-y-6">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <DetailItem label="Status">
                                    <Badge variant={viewState.data.status ? 'default' : 'secondary'}>
                                        {viewState.data.status ? 'Active' : 'Inactive'}
                                    </Badge>
                                </DetailItem>
                                <DetailItem label="Tender Category">
                                    {viewState.data.tenderCategory || '—'}
                                </DetailItem>
                                <DetailItem label="Created">
                                    {formatDate(viewState.data.createdAt)}
                                </DetailItem>
                                <DetailItem label="Updated">
                                    {formatDate(viewState.data.updatedAt)}
                                </DetailItem>
                            </div>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </>
    )
}

export default StatusPage
