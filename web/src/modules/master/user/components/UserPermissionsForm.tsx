import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PermissionSelector } from "@/components/PermissionSelector";
import { rolesService } from "@/services/api/role.service";
import { useAssignUserRole } from "@/hooks/api/useUserRoles";
import { useAssignUserPermissions } from "@/hooks/api/useUserPermissions";
import type { UserPermission } from "@/types/api.types";
import type { UserRole } from "@/types/auth.types";

interface UserPermissionsFormProps {
    userId: number;
    roles: { id: number; name: string }[];
    allPermissions: { id: number; module: string; action: string; description?: string | null }[];
    userRole?: UserRole | null;
    userPermissionsData?: UserPermission[];
}

export default function UserPermissionsForm({ userId, roles, allPermissions, userRole, userPermissionsData }: UserPermissionsFormProps) {
    const assignRole = useAssignUserRole();
    const assignPermissions = useAssignUserPermissions();

    const [selectedRoleId, setSelectedRoleId] = useState("");
    const [rolePermissions, setRolePermissions] = useState<UserPermission[]>([]);
    const [selectedPermissions, setSelectedPermissions] = useState<Map<number, boolean>>(new Map());

    useEffect(() => {
        if (userRole) setSelectedRoleId(String(userRole.id));
    }, [userRole]);

    useEffect(() => {
        if (userPermissionsData && Array.isArray(userPermissionsData)) {
            const permMap = new Map<number, boolean>();
            userPermissionsData.forEach((up: UserPermission) => {
                permMap.set(up.permissionId, up.granted);
            });
            setSelectedPermissions(permMap);
        }
    }, [userPermissionsData]);

    useEffect(() => {
        if (selectedRoleId) {
            rolesService
                .getRolePermissions(Number(selectedRoleId))
                .then(perms => setRolePermissions(
                    perms.map(p => ({
                        id: 0,
                        permissionId: p.id,
                        module: p.module,
                        action: p.action,
                        description: p.description ?? null,
                        granted: true,
                    }))
                ))
                .catch(() => setRolePermissions([]));
        } else {
            setRolePermissions([]);
        }
    }, [selectedRoleId]);

    const handlePermissionChange = (permissionId: number, granted: boolean) => {
        setSelectedPermissions(prev => {
            const next = new Map(prev);
            if (granted) {
                next.set(permissionId, true);
            } else {
                const isInherited = rolePermissions.some(p => p.id === permissionId);
                if (isInherited) {
                    next.set(permissionId, false);
                } else {
                    next.delete(permissionId);
                }
            }
            return next;
        });
    };

    const handleRoleSave = async () => {
        if (!selectedRoleId) return;
        await assignRole.mutateAsync({
            userId,
            data: { roleId: Number(selectedRoleId) },
        });
    };

    const handlePermissionsSave = async () => {
        if (selectedPermissions.size === 0) return;
        const permissionsArray = Array.from(selectedPermissions.entries()).map(([permissionId, granted]) => ({
            permissionId,
            granted,
        }));
        await assignPermissions.mutateAsync({
            userId,
            data: { permissions: permissionsArray },
        });
    };

    const saving = assignRole.isPending || assignPermissions.isPending;

    return (
        <div className="space-y-8">
            <div className="space-y-4 rounded-md border p-4">
                <div>
                    <p className="text-sm font-semibold">Role</p>
                    <p className="text-xs text-muted-foreground">Assign a role to determine base permissions.</p>
                </div>
                <div className="flex items-end gap-4">
                    <div className="flex-1 space-y-2">
                        <label className="text-sm font-medium">Select Role</label>
                        <select
                            value={selectedRoleId}
                            onChange={e => setSelectedRoleId(e.target.value)}
                            disabled={saving}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="">None</option>
                            {roles.map(role => (
                                <option key={role.id} value={role.id}>
                                    {role.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <Button
                        type="button"
                        onClick={handleRoleSave}
                        disabled={!selectedRoleId || saving || selectedRoleId === String(userRole?.id)}
                    >
                        {assignRole.isPending ? "Saving..." : "Save Role"}
                    </Button>
                </div>
            </div>

            <div className="space-y-4 rounded-md border p-4">
                <div>
                    <p className="text-sm font-semibold">Permission Overrides</p>
                    <p className="text-xs text-muted-foreground">
                        Customize permissions beyond what the role provides. Permissions inherited from the role are shown pre-checked.
                    </p>
                </div>
                {selectedRoleId ? (
                    <>
                        <PermissionSelector
                            permissions={allPermissions}
                            selectedPermissions={Array.from(selectedPermissions.entries())
                                .map(([permissionId, granted]) => {
                                    const perm = allPermissions.find(p => p.id === permissionId);
                                    if (!perm) return null;
                                    return {
                                        id: 0,
                                        permissionId,
                                        module: perm.module,
                                        action: perm.action,
                                        description: perm.description ?? null,
                                        granted,
                                    } as UserPermission;
                                })
                                .filter((p): p is UserPermission => p !== null)}
                            rolePermissions={rolePermissions}
                            onChange={handlePermissionChange}
                        />
                        <div className="flex justify-end">
                            <Button
                                type="button"
                                onClick={handlePermissionsSave}
                                disabled={selectedPermissions.size === 0 || saving}
                            >
                                {assignPermissions.isPending ? "Saving..." : "Save Permissions"}
                            </Button>
                        </div>
                    </>
                ) : (
                    <p className="text-sm text-muted-foreground">Select a role first to configure permission overrides.</p>
                )}
            </div>
        </div>
    );
}
