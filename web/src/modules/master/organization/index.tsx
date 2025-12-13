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
import { useOrganizations, useDeleteOrganization } from '@/hooks/api/useOrganizations'
import type { Organization } from '@/types/api.types'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { OrganizationDrawer } from './components/OrganizationDrawer'
import { OrganizationViewModal } from './components/OrganizationViewModal'

const rowSelection: RowSelectionOptions = {
    mode: 'multiRow',
    headerCheckbox: false,
}

const OrganizationPage = () => {
    const { data: organizations, isLoading, error, refetch } = useOrganizations()
    const deleteOrganization = useDeleteOrganization()
    const [drawerState, setDrawerState] = useState<{ open: boolean; organization: Organization | null }>({
        open: false,
        organization: null,
    })
    const [viewState, setViewState] = useState<{ open: boolean; organization: Organization | null }>({
        open: false,
        organization: null,
    })

    const organizationActions: ActionItem<Organization>[] = [
        {
            label: 'View',
            onClick: (row) => setViewState({ open: true, organization: row }),
        },
        {
            label: 'Edit',
            onClick: (row) => setDrawerState({ open: true, organization: row }),
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
                        <Button
                            variant="default"
                            onClick={() => setDrawerState({ open: true, organization: null })}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add New Organization
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

            <OrganizationDrawer
                open={drawerState.open}
                onOpenChange={(open) => setDrawerState({ ...drawerState, open })}
                organization={drawerState.organization}
                onSuccess={() => {
                    refetch()
                    setDrawerState({ open: false, organization: null })
                }}
            />
            <OrganizationViewModal
                open={viewState.open}
                onOpenChange={(open) => setViewState({ ...viewState, open })}
                organization={viewState.organization}
            />
        </>
    )
}

export default OrganizationPage
