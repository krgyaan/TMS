import { Checkbox } from "@/components/ui/checkbox";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { UserPermission } from "@/types/api.types";
import type { Permission } from "@/types/api.types";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

const ACTION_ORDER = ["create", "delete", "read", "update"];

export function PermissionSelector({
    permissions = [],
    selectedPermissions = [],
    rolePermissions = [],
    onChange,
}: {
    permissions: Permission[];
    selectedPermissions: UserPermission[];
    rolePermissions: UserPermission[];
    onChange: (permissionId: number, granted: boolean) => void;
}) {
    // 1. Group by subject only (one row per subject)
    const grouped = permissions.reduce((acc, perm) => {
        if (!acc[perm.module]) acc[perm.module] = [] as Permission[];
        acc[perm.module].push(perm);
        return acc;
    }, {} as Record<string, Permission[]>);

    // 2. Quick lookup for overrides
    const selectedMap = new Map(
        selectedPermissions.map((p) => [p.permissionId, p.granted])
    );

    const inheritedSet = new Set(rolePermissions.map((p) => p.id));

    const getState = (id: number) => {
        if (selectedMap.has(id)) return selectedMap.get(id) ? "granted" : "denied";
        if (inheritedSet.has(id)) return "inherited";
        return "none";
    };

    const toggle = (permId: number) => {
        const state = getState(permId);
        onChange(permId, state !== "granted");
    };

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-40 capitalize font-bold">Subject</TableHead>
                    {ACTION_ORDER.map((a) => (
                        <TableHead key={a} className="text-center capitalize font-bold">
                            {a}
                        </TableHead>
                    ))}
                </TableRow>
            </TableHeader>

            <TableBody>
                {Object.entries(grouped).map(([subject, actions]) => (
                    <TableRow key={subject}>
                        {/* Subject name */}
                        <TableCell className="capitalize font-semibold">
                            {subject}
                        </TableCell>

                        {/* Actions */}
                        {ACTION_ORDER.map((action) => {
                            const perm = (actions as Permission[]).find((p: Permission) => p.action === action);

                            if (!perm) {
                                return (
                                    <TableCell
                                        key={action}
                                        className="text-center text-muted-foreground"
                                    >
                                        —
                                    </TableCell>
                                );
                            }

                            const state = getState(perm.id);
                            const checked =
                                state === "granted" || state === "inherited";

                            return (
                                <TableCell key={action} className="text-center">
                                    <div className="flex flex-col items-center">
                                        <Tooltip>
                                            <TooltipTrigger asChild className="cursor-pointer">
                                                <Checkbox
                                                    checked={checked}
                                                    onCheckedChange={() => toggle(perm.id)}
                                                />
                                            </TooltipTrigger>
                                            <TooltipContent
                                                side="top"
                                                align="center"
                                                className="text-xs"
                                            >
                                                {perm.description ?? "No description"}
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                </TableCell>
                            );
                        })}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
