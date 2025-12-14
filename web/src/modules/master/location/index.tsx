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
import { useLocations, useDeleteLocation } from '@/hooks/api/useLocations'
import type { Location } from '@/types/api.types'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { LocationDrawer } from './components/LocationDrawer'
import { LocationViewModal } from './components/LocationViewModal'

const rowSelection: RowSelectionOptions = {
    mode: 'multiRow',
    headerCheckbox: false,
}

const LocationPage = () => {
    const { data: locations, isLoading, error, refetch } = useLocations()
    const deleteLocation = useDeleteLocation()
    const [drawerState, setDrawerState] = useState<{ open: boolean; location: Location | null }>({
        open: false,
        location: null,
    })
    const [viewState, setViewState] = useState<{ open: boolean; location: Location | null }>({
        open: false,
        location: null,
    })

    const locationActions: ActionItem<Location>[] = [
        {
            label: 'View',
            onClick: (row) => setViewState({ open: true, location: row }),
        },
        {
            label: 'Edit',
            onClick: (row) => setDrawerState({ open: true, location: row }),
        },
        {
            label: 'Delete',
            className: 'text-red-600',
            onClick: async (row) => {
                if (!confirm(`Delete location "${row.name}"?`)) {
                    return
                }
                try {
                    await deleteLocation.mutateAsync(row.id)
                } catch (err) {
                    console.error('Delete failed:', err)
                }
            },
        },
    ]

    const colDefs: ColDef<Location>[] = [
        { field: 'acronym', headerName: 'Code', width: 90 },
        { field: 'name', headerName: 'Location', flex: 1.2 },
        { field: 'state', headerName: 'State', flex: 1 },
        { field: 'region', headerName: 'Region', flex: 1 },
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
            cellRenderer: createActionColumnRenderer(locationActions),
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
                    <CardTitle>Locations</CardTitle>
                    <CardDescription>Manage all locations</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Error loading locations: {error.message}
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
                    <CardTitle>Locations</CardTitle>
                    <CardDescription>List of all Location</CardDescription>
                    <CardAction>
                        <Button
                            variant="default"
                            onClick={() => setDrawerState({ open: true, location: null })}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add New Location
                        </Button>
                    </CardAction>
                </CardHeader>
                <CardContent className="h-screen px-0">
                    <DataTable
                        data={locations || []}
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

            <LocationDrawer
                open={drawerState.open}
                onOpenChange={(open) => setDrawerState({ ...drawerState, open })}
                location={drawerState.location}
                onSuccess={() => {
                    refetch()
                    setDrawerState({ open: false, location: null })
                }}
            />
            <LocationViewModal
                open={viewState.open}
                onOpenChange={(open) => setViewState({ ...viewState, open })}
                location={viewState.location}
            />
        </>
    )
}

export default LocationPage
