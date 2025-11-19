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
import { useOrganizations, useDeleteOrganization } from '@/hooks/api/useOrganizations'
import type { Organization } from '@/types/api.types'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Building2 } from 'lucide-react'
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

const OrganizationPage = () => {
    const { data: organizations, isLoading, error, refetch } = useOrganizations()
    const deleteOrganization = useDeleteOrganization()
    const navigate = useNavigate()
    const [viewState, setViewState] = useState<{ open: boolean; data: Organization | null }>({
        open: false,
        data: null,
    })

    const organizationActions: ActionItem<Organization>[] = [
        {
            label: 'View',
            onClick: (row) => setViewState({ open: true, data: row }),
        },
        {
            label: 'Edit',
            onClick: (row) => navigate(paths.master.organizations_edit(row.id)),
        },
        {
            label: 'Delete',
            className: 'text-red-600',
            onClick: async (row) => {
                if (!confirm(`Delete organization "${row.name}"?`)) {
                    return
                }
                try {
                    await deleteOrganization.mutateAsync(row.id)
                } catch (err) {
                    console.error('Delete failed:', err)
                }
            },
        },
    ]

    const colDefs: ColDef<Organization>[] = [
        { field: 'acronym', headerName: 'Acronym', width: 120 },
        { field: 'name', headerName: 'Organization Name', flex: 1.5 },
        {
            field: 'industry',
            headerName: 'Industry',
            flex: 1,
            valueGetter: (params) => params.data?.industry?.name || '—',
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
            cellRenderer: createActionColumnRenderer(organizationActions),
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
                    <CardTitle>Organizations</CardTitle>
                    <CardDescription>Manage all organizations</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Error loading organizations: {error.message}
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
                    <CardTitle>Organizations</CardTitle>
                    <CardDescription>Manage all organizations and their industries</CardDescription>
                    <CardAction>
                        <Button variant="default" asChild>
                            <NavLink to={paths.master.organizations_create}>Add New Organization</NavLink>
                        </Button>
                    </CardAction>
                </CardHeader>
                <CardContent className="h-screen px-0">
                    <DataTable
                        data={organizations || []}
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
                        enablePagination
                        enableRowSelection
                        selectionType="multiple"
                        onSelectionChanged={(rows) => console.log('Selected rows:', rows)}
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
                            <Building2 className="h-5 w-5" />
                            {viewState.data?.name}
                        </DialogTitle>
                        <DialogDescription>Organization details</DialogDescription>
                    </DialogHeader>
                    {viewState.data ? (
                        <div className="grid gap-6 md:grid-cols-2">
                            <DetailItem label="Acronym" value={viewState.data.acronym || '—'} />
                            <DetailItem label="Industry" value={viewState.data.industry?.name || '—'} />
                            <DetailItem
                                label="Status"
                                value={
                                    <Badge variant={viewState.data.status ? 'default' : 'secondary'}>
                                        {viewState.data.status ? 'Active' : 'Inactive'}
                                    </Badge>
                                }
                            />
                            <DetailItem label="Industry ID" value={viewState.data.industryId ?? '—'} />
                            <DetailItem label="Created" value={formatDate(viewState.data.createdAt)} />
                            <DetailItem label="Updated" value={formatDate(viewState.data.updatedAt)} />
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </>
    )
}

export default OrganizationPage
