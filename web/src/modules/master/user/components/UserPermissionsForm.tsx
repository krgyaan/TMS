import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PermissionSelector } from "@/components/PermissionSelector";
import { useAssignUserPermissions } from "@/hooks/api/useUserPermissions";
import type { Permission, UserPermission } from "@/types/api.types";

interface UserPermissionsFormProps {
    userId: number;
    allPermissions: Permission[];
    userPermissionsData?: UserPermission[];
}

export default function UserPermissionsForm({ userId, allPermissions, userPermissionsData }: UserPermissionsFormProps) {
    const assignPermissions = useAssignUserPermissions();

    const [selectedPermissions, setSelectedPermissions] = useState<Map<number, boolean>>(new Map());

    useEffect(() => {
        if (userPermissionsData && Array.isArray(userPermissionsData)) {
            const permMap = new Map<number, boolean>();
            userPermissionsData.forEach((up: UserPermission) => {
                permMap.set(up.permissionId, up.granted);
            });
            setSelectedPermissions(permMap);
        }
    }, [userPermissionsData]);

    const handlePermissionChange = (permissionId: number, granted: boolean) => {
        setSelectedPermissions(prev => {
            const next = new Map(prev);
            if (granted) {
                next.set(permissionId, true);
            } else {
                next.delete(permissionId);
            }
            return next;
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

    const saving = assignPermissions.isPending;

    return (
        <div className="space-y-4 rounded-md border p-4">
            <div>
                <p className="text-sm font-semibold">Permission Overrides</p>
                <p className="text-xs text-muted-foreground">
                    Grant or deny specific permissions for this user beyond what their role provides.
                </p>
            </div>
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
        </div>
    );
}
