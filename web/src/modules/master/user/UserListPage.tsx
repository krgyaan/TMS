import { paths } from "@/app/routes/paths";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/api/usePermissions";
import { useRoles } from "@/hooks/api/useRoles";
import { useTeams } from "@/hooks/api/useTeams";
import { useDeleteUser, useUsers } from "@/hooks/api/useUsers";
import { RolesDrawer } from "@/modules/master/role/components/RolesDrawer";
import { TeamsDrawer } from "@/modules/master/team/components/TeamsDrawer";
import type { User } from "@/types/api.types";
import type { ColDef, RowSelectionOptions } from "ag-grid-community";
import { AlertCircle, ArrowRight, KeyRound, Shield, UserRound, Users } from "lucide-react";
import { useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import UserView from "./components/UserView";

const rowSelection: RowSelectionOptions = {
    mode: "multiRow",
    headerCheckbox: false,
};

export default function UserListPage() {
    const navigate = useNavigate();
    const { data: users, isLoading, error, refetch } = useUsers();
    const { data: roles = [] } = useRoles();
    const { data: teams = [] } = useTeams();
    const { data: permissions = [] } = usePermissions();
    const deleteUser = useDeleteUser();
    const [viewState, setViewState] = useState<{ open: boolean; data: User | null }>({ open: false, data: null });
    const [rolesDrawerOpen, setRolesDrawerOpen] = useState(false);
    const [teamsDrawerOpen, setTeamsDrawerOpen] = useState(false);

    const employeeActions: ActionItem<User>[] = [
        {
            label: "View",
            onClick: row => setViewState({ open: true, data: row }),
        },
        {
            label: "Permissions",
            onClick: row => navigate(paths.master.users_permissions(row.id)),
        },
        {
            label: "Edit",
            onClick: row => navigate(paths.master.users_edit(row.id)),
        },
        {
            label: "Delete",
            className: "text-red-600",
            onClick: async row => {
                if (!confirm(`Are you sure you want to delete ${row.name}?`)) {
                    return;
                }
                try {
                    await deleteUser.mutateAsync(row.id);
                } catch (err) {
                    console.error("Delete failed:", err);
                }
            },
        },
    ];

    const colDefs: ColDef<User>[] = [
        {
            headerName: "Employee Code",
            field: "profile.employeeCode",
            flex: 1,
            valueGetter: params => params.data?.profile?.employeeCode || "—",
        },
        {
            field: "name",
            headerName: "Name",
            flex: 1.2,
            cellRenderer: ({ data }: { data: User }): ReactNode => (
                <div>
                    <div className="font-semibold">{data.name}</div>
                    <div className="text-xs text-muted-foreground">@{data.username ?? (data.email ? data.email.split("@")[0] : "")}</div>
                </div>
            ),
        },
        { field: "email", headerName: "Email", flex: 1 },
        {
            headerName: "Team",
            field: "team",
            flex: 1,
            cellRenderer: ({ data }: { data: User }): ReactNode => {
                const mainTeam = data.team?.name;
                const subTeam = data.subTeam?.name;
                if (!mainTeam) return "—";
                if (subTeam) return `${mainTeam} (${subTeam})`;
                return mainTeam;
            },
        },
        {
            headerName: "Role",
            field: "role",
            flex: 0.8,
            valueGetter: params => params.data?.role?.name || "—",
        },
        {
            field: "isActive",
            headerName: "Status",
            width: 100,
            cellRenderer: (params: any) => <Badge variant={params.value ? "default" : "secondary"}>{params.value ? "Active" : "Inactive"}</Badge>,
        },
        {
            headerName: "Created on",
            field: "createdAt",
            width: 120,
            valueGetter: params => {
                if (!params.data?.createdAt) return "—";
                return new Date(params.data.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                });
            },
        },
        {
            headerName: "Actions",
            filter: false,
            cellRenderer: createActionColumnRenderer(employeeActions),
            sortable: false,
            pinned: "right",
            width: 120,
        },
    ];

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
        );
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
        );
    }

    return (
        <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-lg font-medium">Users</CardTitle>
                        <UserRound className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{users?.length ?? 0}</div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">Total users (Active and Inactive)</p>
                    </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow group" onClick={() => setRolesDrawerOpen(true)}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-lg font-medium">Roles</CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{roles.length}</div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            Total roles
                            <ArrowRight className="h-3 w-3 group-hover:translate-x-1 group-hover:text-primary transition-transform duration-300" />
                        </p>
                    </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow group" onClick={() => setTeamsDrawerOpen(true)}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-lg font-medium">Teams</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{teams.length}</div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            Total teams
                            <ArrowRight className="h-3 w-3 group-hover:translate-x-1 group-hover:text-primary transition-transform duration-300" />
                        </p>
                    </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow group" onClick={() => navigate(paths.master.permissions)}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-lg font-medium">Permissions</CardTitle>
                        <KeyRound className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{permissions.length}</div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            Total permissions
                            <ArrowRight className="h-3 w-3 group-hover:translate-x-1 group-hover:text-primary transition-transform duration-300" />
                        </p>
                    </CardContent>
                </Card>
            </div>

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
                <CardContent className="px-3">
                    <DataTable
                        data={users || []}
                        columnDefs={colDefs}
                        gridOptions={{
                            defaultColDef: { editable: false, filter: true },
                            rowSelection,
                            pagination: true,
                        }}
                        enablePagination
                    />
                </CardContent>
            </Card>

            <UserView open={viewState.open} onOpenChange={open => setViewState(prev => ({ open, data: open ? prev.data : null }))} user={viewState.data} />

            <RolesDrawer open={rolesDrawerOpen} onOpenChange={setRolesDrawerOpen} />
            <TeamsDrawer open={teamsDrawerOpen} onOpenChange={setTeamsDrawerOpen} />
        </>
    );
}
