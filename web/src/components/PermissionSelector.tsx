import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Permission, UserPermission } from "@/types/api.types";

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
    const grouped = permissions.reduce((acc, perm) => {
        if (!acc[perm.module]) acc[perm.module] = [] as Permission[];
        acc[perm.module].push(perm);
        return acc;
    }, {} as Record<string, Permission[]>);

    const selectedMap = new Map(selectedPermissions.map((p) => [p.permissionId, p.granted]));
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

    const moduleGrantCount = (module: string) => {
        const perms = grouped[module];
        let granted = 0;
        let inherited = 0;
        for (const p of perms) {
            const state = getState(p.id);
            if (state === "granted") granted++;
            if (state === "inherited") inherited++;
        }
        return { total: perms.length, granted, inherited };
    };

    const grantAll = (module: string, grant: boolean) => {
        for (const p of grouped[module]) {
            const state = getState(p.id);
            if (state !== (grant ? "granted" : "denied")) {
                onChange(p.id, grant);
            }
        }
    };

    return (
        <div className="space-y-3">
            {Object.entries(grouped).map(([module, actions]) => {
                const { total, granted, inherited } = moduleGrantCount(module);
                return (
                    <ModuleCard
                        key={module}
                        module={module}
                        total={total}
                        granted={granted}
                        inherited={inherited}
                        onGrantAll={() => grantAll(module, true)}
                        onDenyAll={() => grantAll(module, false)}
                    >
                        <div className="flex flex-wrap gap-3 pt-2">
                            {ACTION_ORDER.map((action) => {
                                const perm = actions.find((p) => p.action === action);
                                if (!perm) return null;
                                const state = getState(perm.id);
                                const checked = state === "granted" || state === "inherited";
                                const isInherited = state === "inherited";

                                return (
                                    <label
                                        key={perm.id}
                                        className={`
                                            flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer
                                            select-none transition-colors
                                            ${isInherited
                                                ? "border-muted bg-muted/40 text-muted-foreground"
                                                : checked
                                                    ? "border-primary/40 bg-primary/5"
                                                    : "border-input hover:bg-accent"
                                            }
                                        `}
                                    >
                                        <Checkbox
                                            checked={checked}
                                            disabled={isInherited}
                                            onCheckedChange={() => toggle(perm.id)}
                                        />
                                        <span className="capitalize">{action}</span>
                                        {isInherited && (
                                            <span className="text-[10px] text-muted-foreground ml-1">(inherited)</span>
                                        )}
                                    </label>
                                );
                            })}
                        </div>
                    </ModuleCard>
                );
            })}
        </div>
    );
}

function ModuleCard({
    module,
    total,
    granted,
    inherited,
    onGrantAll,
    onDenyAll,
    children,
}: {
    module: string;
    total: number;
    granted: number;
    inherited: number;
    onGrantAll: () => void;
    onDenyAll: () => void;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);

    return (
        <Collapsible open={open} onOpenChange={setOpen} asChild>
            <div className="rounded-md border">
                <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-2">
                            {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                            <span className="font-medium capitalize">{module}</span>
                            <span className="text-xs text-muted-foreground">
                                ({granted}/{total} granted
                                {inherited > 0 && `, ${inherited} from role`})
                            </span>
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={onGrantAll}
                            >
                                Grant all
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-muted-foreground"
                                onClick={onDenyAll}
                            >
                                Deny all
                            </Button>
                        </div>
                    </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="px-3 pb-3">
                        {children}
                    </div>
                </CollapsibleContent>
            </div>
        </Collapsible>
    );
}
