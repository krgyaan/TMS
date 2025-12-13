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
import { useItems, useDeleteItem } from '@/hooks/api/useItems'
import type { Item } from '@/types/api.types'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ItemDrawer } from './components/ItemDrawer'
import { ItemViewModal } from './components/ItemViewModal'

const rowSelection: RowSelectionOptions = {
    mode: 'multiRow',
    headerCheckbox: false,
}

const ItemPage = () => {
    const { data: items, isLoading, error, refetch } = useItems()
    const deleteItem = useDeleteItem()
    const [drawerState, setDrawerState] = useState<{ open: boolean; item: Item | null }>({
        open: false,
        item: null,
    })
    const [viewState, setViewState] = useState<{ open: boolean; item: Item | null }>({
        open: false,
        item: null,
    })

    const itemActions: ActionItem<Item>[] = [
        {
            label: 'View',
            onClick: (row) => setViewState({ open: true, item: row }),
        },
        {
            label: 'Edit',
            onClick: (row) => setDrawerState({ open: true, item: row }),
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
                        <Button
                            variant="default"
                            onClick={() => setDrawerState({ open: true, item: null })}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add New Item
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

            <ItemDrawer
                open={drawerState.open}
                onOpenChange={(open) => setDrawerState({ ...drawerState, open })}
                item={drawerState.item}
                onSuccess={() => {
                    refetch()
                    setDrawerState({ open: false, item: null })
                }}
            />
            <ItemViewModal
                open={viewState.open}
                onOpenChange={(open) => setViewState({ ...viewState, open })}
                item={viewState.item}
            />
        </>
    )
}

export default ItemPage
