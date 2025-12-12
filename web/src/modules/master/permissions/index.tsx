import { useState, useMemo } from 'react'
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
import { usePermissions, useDeletePermission } from '@/hooks/api/usePermissions'
import { useRoles } from '@/hooks/api/useRoles'
import { useRole } from '@/hooks/api/useRoles'
import { useAssignRolePermissions } from '@/hooks/api/useRoles'
import type { Permission } from '@/types/api.types'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Plus, KeyRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCreatePermission } from '@/hooks/api/usePermissions'
import { PermissionSelector } from '@/components/PermissionSelector'

const rowSelection: RowSelectionOptions = {
    mode: 'multiRow',
    headerCheckbox: false,
}

const PermissionFormSchema = z.object({
    module: z.string().min(1, 'Module is required').max(100),
    action: z.string().min(1, 'Action is required').max(50),
    description: z.string().max(500).optional(),
})

type PermissionFormValues = z.infer<typeof PermissionFormSchema>

const PermissionsPage = () => {
    const { data: permissions, isLoading, error, refetch } = usePermissions()
    const { data: roles = [] } = useRoles()
    const deletePermission = useDeletePermission()
    const createPermission = useCreatePermission()
    const assignPermissions = useAssignRolePermissions()

    const [createModalOpen, setCreateModalOpen] = useState(false)
    const [assignModalOpen, setAssignModalOpen] = useState(false)
    const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
    const [selectedPermissionMap, setSelectedPermissionMap] = useState<Map<number, boolean>>(new Map())

    const { data: selectedRolePermissions = [] } = useRole(selectedRoleId)

    const permissionForm = useForm<PermissionFormValues>({
        resolver: zodResolver(PermissionFormSchema),
        defaultValues: {
            module: '',
            action: '',
            description: '',
        },
    })

    const permissionActions: ActionItem<Permission>[] = [
        {
            label: 'Delete',
            className: 'text-red-600',
            onClick: async (row) => {
                if (confirm(`Are you sure you want to delete permission "${row.module}.${row.action}"?`)) {
                    try {
                        await deletePermission.mutateAsync(row.id)
                    } catch (error) {
                        console.error('Delete failed:', error)
                    }
                }
            },
        },
    ]

    const colDefs: ColDef<Permission>[] = useMemo(
        () => [
            {
                headerName: 'S.No.',
                valueGetter: 'node.rowIndex + 1',
                width: 80,
                filter: false,
                sortable: false,
            },
            {
                field: 'module',
                headerName: 'Module',
                flex: 1.5,
                filter: 'agTextColumnFilter',
            },
            {
                field: 'action',
                headerName: 'Action',
                flex: 1,
                filter: 'agTextColumnFilter',
            },
            {
                field: 'description',
                headerName: 'Description',
                flex: 2,
                filter: 'agTextColumnFilter',
                cellRenderer: (params: any) => {
                    return params.value || <span className="text-gray-400">—</span>
                },
            },
            {
                headerName: 'Actions',
                filter: false,
                sortable: false,
                cellRenderer: createActionColumnRenderer(permissionActions),
                pinned: 'right',
                width: 100,
            },
        ],
        [permissionActions],
    )

    const handleCreatePermission = async (values: PermissionFormValues) => {
        try {
            await createPermission.mutateAsync(values)
            setCreateModalOpen(false)
            permissionForm.reset()
            refetch()
        } catch (error) {
            // Error handling is done in the hook
        }
    }

    const handlePermissionChange = (permissionId: number, granted: boolean) => {
        setSelectedPermissionMap((prev) => {
            const newMap = new Map(prev)
            if (granted) {
                newMap.set(permissionId, true)
            } else {
                newMap.delete(permissionId)
            }
            return newMap
        })
    }

    const handleAssignPermissions = async () => {
        if (!selectedRoleId) return
        try {
            const permissionIds = Array.from(selectedPermissionMap.keys())
            await assignPermissions.mutateAsync({
                roleId: selectedRoleId,
                permissionIds,
            })
            setAssignModalOpen(false)
            setSelectedRoleId(null)
            setSelectedPermissionMap(new Map())
        } catch (error) {
            // Error handling is done in the hook
        }
    }

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
                    <CardTitle>Permissions</CardTitle>
                    <CardDescription>Manage system permissions</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Error loading permissions: {error.message}
                            <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-4">
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
                    <CardTitle className="flex items-center gap-2">
                        <KeyRound className="h-5 w-5" />
                        Permissions Dashboard
                    </CardTitle>
                    <CardDescription>Manage permissions and assign them to roles</CardDescription>
                    <CardAction>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSelectedRoleId(null)
                                    setSelectedPermissions([])
                                    setAssignModalOpen(true)
                                }}
                            >
                                Assign to Role
                            </Button>
                            <Button
                                variant="default"
                                onClick={() => {
                                    permissionForm.reset()
                                    setCreateModalOpen(true)
                                }}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Create Permission
                            </Button>
                        </div>
                    </CardAction>
                </CardHeader>
                <CardContent className="h-screen px-0">
                    <DataTable
                        data={permissions || []}
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

            {/* Create Permission Modal */}
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Create Permission</DialogTitle>
                        <DialogDescription>Add a new permission to the system</DialogDescription>
                    </DialogHeader>
                    <Form {...permissionForm}>
                        <form
                            onSubmit={permissionForm.handleSubmit(handleCreatePermission)}
                            className="space-y-4"
                        >
                            <FormField
                                control={permissionForm.control}
                                name="module"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Module *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., users, tenders, emds" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={permissionForm.control}
                                name="action"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Action *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., create, read, update, delete" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={permissionForm.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Enter permission description"
                                                rows={3}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setCreateModalOpen(false)}
                                    disabled={createPermission.isPending}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={createPermission.isPending}>
                                    {createPermission.isPending ? 'Creating...' : 'Create'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Assign Permissions to Role Modal */}
            <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Assign Permissions to Role</DialogTitle>
                        <DialogDescription>
                            Select a role and assign permissions. Users with this role will have these permissions by default.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Select Role *</label>
                            <Select
                                value={selectedRoleId?.toString() || ''}
                                onValueChange={(value) => {
                                    const roleId = Number(value)
                                    setSelectedRoleId(roleId)
                                    // Initialize selected permissions from role permissions
                                    const initialMap = new Map<number, boolean>()
                                    selectedRolePermissions.forEach((p) => {
                                        initialMap.set(p.id, true)
                                    })
                                    setSelectedPermissionMap(initialMap)
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {roles.map((role) => (
                                        <SelectItem key={role.id} value={role.id.toString()}>
                                            {role.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedRoleId && permissions && (
                            <div>
                                <label className="text-sm font-medium mb-2 block">Select Permissions</label>
                                <div className="border rounded-md p-4 max-h-[400px] overflow-y-auto">
                                    <PermissionSelector
                                        permissions={permissions}
                                        selectedPermissions={Array.from(selectedPermissionMap.entries()).map(([permissionId, granted]) => ({
                                            permissionId,
                                            granted,
                                        }))}
                                        rolePermissions={selectedRolePermissions.map((p) => ({
                                            id: p.id,
                                            permissionId: p.id,
                                            granted: true,
                                            module: p.module,
                                            action: p.action,
                                            description: p.description,
                                        }))}
                                        onChange={handlePermissionChange}
                                    />
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setAssignModalOpen(false)
                                    setSelectedRoleId(null)
                                    setSelectedPermissionMap(new Map())
                                }}
                                disabled={assignPermissions.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleAssignPermissions}
                                disabled={assignPermissions.isPending || !selectedRoleId}
                            >
                                {assignPermissions.isPending ? 'Assigning...' : 'Assign Permissions'}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}

export default PermissionsPage
