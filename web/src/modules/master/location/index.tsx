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
import { useLocations, useDeleteLocation } from '@/hooks/api/useLocations'
import type { Location } from '@/types/api.types'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, MapPin, Compass, Globe } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

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
    if (!value) {
        return '—'
    }
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

const LocationPage = () => {
    const { data: locations, isLoading, error, refetch } = useLocations()
    const deleteLocation = useDeleteLocation()
    const navigate = useNavigate()
    const [viewState, setViewState] = useState<{ open: boolean; data: Location | null }>({
        open: false,
        data: null,
    })

    const locationActions: ActionItem<Location>[] = [
        {
            label: 'View',
            onClick: (row) => setViewState({ open: true, data: row }),
        },
        {
            label: 'Edit',
            onClick: (row) => navigate(paths.master.locations_edit(row.id)),
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
                        <Button variant="default" asChild>
                            <NavLink to={paths.master.locations_create}>Add New Location</NavLink>
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

            <Dialog
                open={viewState.open}
                onOpenChange={(open) => setViewState((prev) => ({ open, data: open ? prev.data : null }))}
            >
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MapPin className="h-5 w-5" />
                            {viewState.data?.name}
                        </DialogTitle>
                        <DialogDescription>Location details</DialogDescription>
                    </DialogHeader>
                    {viewState.data ? (
                        <div className="grid gap-6 md:grid-cols-2">
                            <DetailItem label="Acronym" value={viewState.data.acronym || '—'} />
                            <DetailItem
                                label="State"
                                value={
                                    viewState.data.state ? (
                                        <span className="inline-flex items-center gap-2">
                                            <Globe className="h-4 w-4" />
                                            {viewState.data.state}
                                        </span>
                                    ) : (
                                        '—'
                                    )
                                }
                            />
                            <DetailItem
                                label="Region"
                                value={
                                    viewState.data.region ? (
                                        <span className="inline-flex items-center gap-2">
                                            <Compass className="h-4 w-4" />
                                            {viewState.data.region}
                                        </span>
                                    ) : (
                                        '—'
                                    )
                                }
                            />
                            <DetailItem
                                label="Status"
                                value={
                                    <Badge variant={viewState.data.status ? 'default' : 'secondary'}>
                                        {viewState.data.status ? 'Active' : 'Inactive'}
                                    </Badge>
                                }
                            />
                            <DetailItem label="Created" value={formatDate(viewState.data.createdAt)} />
                            <DetailItem label="Updated" value={formatDate(viewState.data.updatedAt)} />
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </>
    )
}

export default LocationPage
