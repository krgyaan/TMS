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
import { useItems, useDeleteItem } from '@/hooks/api/useItems'
import type { Item } from '@/types/api.types'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Package } from 'lucide-react'
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

const DetailItem = ({ label, value }: { label: string; value?: ReactNode }) => (
    <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground/90">{value ?? '—'}</p>
    </div>
)

const formatDate = (value?: string) => {
    if (!value) return '—'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

const ItemPage = () => {
    const navigate = useNavigate()
    const { data: items, isLoading, error, refetch } = useItems()
    const deleteItem = useDeleteItem()
    const [viewState, setViewState] = useState<{ open: boolean; data: Item | null }>({ open: false, data: null })

    const itemActions: ActionItem<Item>[] = [
        {
            label: 'View',
            onClick: (row) => setViewState({ open: true, data: row }),
        },
        {
            label: 'Edit',
            onClick: (row) => navigate(paths.master.items_edit(row.id)),
        },
        {
            label: 'Delete',
            className: 'text-red-600',
            onClick: async (row) => {
                if (!confirm(`Delete item "${row.name}"?`)) {
                    return
                }
                try {
                    await deleteItem.mutateAsync(row.id)
                } catch (err) {
                    console.error('Delete failed:', err)
                }
            },
        },
    ]

    const colDefs: ColDef<Item>[] = [
        { field: 'id', headerName: 'ID', width: 80 },
        { field: 'name', headerName: 'Item Name', flex: 1.2 },
        {
            field: 'team',
            headerName: 'Team',
            flex: 1,
            valueGetter: (params) => params.data?.team?.name || '—',
        },
        {
            field: 'heading',
            headerName: 'Heading',
            flex: 1,
            valueGetter: (params) => params.data?.heading?.name || '—',
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 120,
            cellRenderer: (params: any) => (
                <Badge variant={params.value ? 'default' : 'secondary'}>
                    {params.value ? 'Active' : 'Inactive'}
                </Badge>
            ),
        },
        {
            headerName: 'Actions',
            filter: false,
            cellRenderer: createActionColumnRenderer(itemActions),
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
                    <CardTitle>Items</CardTitle>
                    <CardDescription>Manage all items</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Error loading items: {error.message}
                            <Button variant="outline" size="sm" className="ml-2" onClick={() => refetch()}>
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
                    <CardTitle>Items</CardTitle>
                    <CardDescription>List of all Item</CardDescription>
                    <CardAction>
                        <Button variant="default" asChild>
                            <NavLink to={paths.master.items_create}>Add New Item</NavLink>
                        </Button>
                    </CardAction>
                </CardHeader>
                <CardContent className="h-screen px-0">
                    <DataTable
                        data={items || []}
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
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            {viewState.data?.name}
                        </DialogTitle>
                        <DialogDescription>Item details</DialogDescription>
                    </DialogHeader>
                    {viewState.data ? (
                        <div className="grid gap-6 md:grid-cols-2">
                            <DetailItem label="Team" value={viewState.data.team?.name || '—'} />
                            <DetailItem label="Heading" value={viewState.data.heading?.name || '—'} />
                            <DetailItem
                                label="Status"
                                value={
                                    <Badge variant={viewState.data.status ? 'default' : 'secondary'}>
                                        {viewState.data.status ? 'Active' : 'Inactive'}
                                    </Badge>
                                }
                            />
                            <DetailItem label="Team ID" value={viewState.data.teamId ?? '—'} />
                            <DetailItem label="Heading ID" value={viewState.data.headingId ?? '—'} />
                            <DetailItem label="Created" value={formatDate(viewState.data.createdAt)} />
                            <DetailItem label="Updated" value={formatDate(viewState.data.updatedAt)} />
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </>
    )
}

export default ItemPage
