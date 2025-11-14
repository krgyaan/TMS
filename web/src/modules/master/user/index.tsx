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
import { useUsers, useDeleteUser } from '@/hooks/api/useUsers'
import type { User } from '@/types/api.types'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Mail, Phone, UserRound } from 'lucide-react'
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

const UserPage = () => {
    const navigate = useNavigate()
    const { data: users, isLoading, error, refetch } = useUsers()
    const deleteUser = useDeleteUser()
    const [viewState, setViewState] = useState<{ open: boolean; data: User | null }>({ open: false, data: null })

    const employeeActions: ActionItem<User>[] = [
        {
            label: 'View',
            onClick: (row) => setViewState({ open: true, data: row }),
        },
        {
            label: 'Edit',
            onClick: (row) => navigate(paths.master.users_edit(row.id)),
        },
        {
            label: 'Delete',
            className: 'text-red-600',
            onClick: async (row) => {
                if (!confirm(`Are you sure you want to delete ${row.name}?`)) {
                    return
                }
                try {
                    await deleteUser.mutateAsync(row.id)
                } catch (err) {
                    console.error('Delete failed:', err)
                }
            },
        },
    ]

    const colDefs: ColDef<User>[] = [
        {
            field: 'name',
            headerName: 'Name',
            flex: 1.2,
            cellRenderer: ({ data }: { data: User }): ReactNode => (
                <div>
                    <div className="font-semibold">{data.name}</div>
                    <div className="text-xs text-muted-foreground">
                        @{data.username ?? (data.email ? data.email.split('@')[0] : '')}
                    </div>
                </div>
            ),
        },
        { field: 'email', headerName: 'Email', flex: 1 },
        { field: 'mobile', headerName: 'Mobile', flex: 0.8 },
        {
            headerName: 'Team',
            field: 'team',
            flex: 0.8,
            valueGetter: (params) => params.data?.team?.name || '—',
        },
        {
            headerName: 'Designation',
            field: 'designation',
            flex: 0.9,
            valueGetter: (params) => params.data?.designation?.name || '—',
        },
        {
            headerName: 'Employee Code',
            field: 'profile.employeeCode',
            flex: 0.8,
            valueGetter: (params) => params.data?.profile?.employeeCode || '—',
        },
        {
            field: 'isActive',
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
            cellRenderer: createActionColumnRenderer(employeeActions),
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
                    <CardTitle>Employees</CardTitle>
                    <CardDescription>List of all employees</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Error loading employees: {error.message}
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
                    <CardTitle>Employees</CardTitle>
                    <CardDescription>List of all Employees</CardDescription>
                    <CardAction>
                        <Button variant="default" asChild>
                            <NavLink to={paths.master.users_create}>Add New Employee</NavLink>
                        </Button>
                    </CardAction>
                </CardHeader>
                <CardContent className="h-screen px-0">
                    <DataTable
                        data={users || []}
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
                            <UserRound className="h-5 w-5" />
                            {viewState.data?.name}
                        </DialogTitle>
                        <DialogDescription>User account details</DialogDescription>
                    </DialogHeader>
                    {viewState.data ? (
                        <div className="grid gap-6 md:grid-cols-2">
                            <DetailItem label="Username" value={`@${viewState.data.username ?? '—'}`} />
                            <DetailItem label="Employee Code" value={viewState.data.profile?.employeeCode || '—'} />
                            <DetailItem label="Team" value={viewState.data.team?.name || '—'} />
                            <DetailItem label="Designation" value={viewState.data.designation?.name || '—'} />
                            <DetailItem
                                label="Email"
                                value={
                                    <span className="inline-flex items-center gap-2">
                                        <Mail className="h-4 w-4" />
                                        {viewState.data.email}
                                    </span>
                                }
                            />
                            <DetailItem
                                label="Alternate Email"
                                value={
                                    viewState.data.profile?.altEmail ? (
                                        <span className="inline-flex items-center gap-2">
                                            <Mail className="h-4 w-4" />
                                            {viewState.data.profile.altEmail}
                                        </span>
                                    ) : (
                                        '—'
                                    )
                                }
                            />
                            <DetailItem
                                label="Mobile"
                                value={
                                    viewState.data.mobile ? (
                                        <span className="inline-flex items-center gap-2">
                                            <Phone className="h-4 w-4" />
                                            {viewState.data.mobile}
                                        </span>
                                    ) : (
                                        '—'
                                    )
                                }
                            />
                            <DetailItem
                                label="Status"
                                value={
                                    <Badge variant={viewState.data.isActive ? 'default' : 'secondary'}>
                                        {viewState.data.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                }
                            />
                            <DetailItem label="Emergency Contact" value={viewState.data.profile?.emergencyContactName || '—'} />
                            <DetailItem label="Contact Phone" value={viewState.data.profile?.emergencyContactPhone || '—'} />
                            <DetailItem label="Timezone" value={viewState.data.profile?.timezone || '—'} />
                            <DetailItem label="Locale" value={viewState.data.profile?.locale || '—'} />
                            <DetailItem label="Created" value={viewState.data.createdAt ? new Date(viewState.data.createdAt).toLocaleString() : '—'} />
                            <DetailItem label="Updated" value={viewState.data.updatedAt ? new Date(viewState.data.updatedAt).toLocaleString() : '—'} />
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </>
    )
}

export default UserPage
