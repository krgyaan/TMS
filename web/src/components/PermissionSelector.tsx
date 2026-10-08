import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Permission, UserPermission } from "@/types/api.types";

const ACTION_ORDER = ["create", "delete", "read", "update"];

/** Sidebar areas, in the same order as app-sidebar.tsx navMain (Dashboard has no permission module). */
const AREA_ORDER = [
    "Tendering",
    "Operations",
    "Services",
    "BI Dashboard",
    "Accounts",
    "Document Dashboard",
    "CRM",
    "Performance",
    "HRMS",
    "Settings",
    "Shared",
] as const;

const FALLBACK_AREA = "Other";

/** Prefix (text before the first dot) → sidebar area. */
const PREFIX_AREA: Record<string, string> = {
    accounts: "Accounts",
    bi: "BI Dashboard",
    crm: "CRM",
    "document-dashboard": "Document Dashboard",
    hrms: "HRMS",
    master: "Settings",
    ops: "Operations",
    performance: "Performance",
    services: "Services",
    shared: "Shared",
};

/** Prefix-less modules → sidebar area. */
const BARE_MODULE_AREA: Record<string, string> = {
    accounts: "Accounts",
    "bid-submissions": "Tendering",
    checklists: "Tendering",
    "costing-approvals": "Tendering",
    "costing-sheets": "Tendering",
    emds: "Tendering",
    "info-sheets": "Tendering",
    integrations: "Settings",
    master: "Settings",
    operations: "Operations",
    "physical-docs": "Tendering",
    "reverse-auction": "Tendering",
    rfqs: "Tendering",
    "tender-approval": "Tendering",
    "tender-result": "Tendering",
    tenders: "Tendering",
    "tq-management": "Tendering",
    users: "Settings",
};

function areaOf(module: string): string {
    const dot = module.indexOf(".");
    if (dot === -1) {
        return BARE_MODULE_AREA[module] ?? FALLBACK_AREA;
    }
    return PREFIX_AREA[module.slice(0, dot)] ?? FALLBACK_AREA;
}

/** Inside an area the prefix is usually redundant — show `purchase-orders`, not `accounts.purchase-orders`. */
function moduleLabel(module: string, bareNames: Set<string>): string {
    const dot = module.indexOf(".");
    if (dot === -1) {
        // A bare module that is also its area's own prefix (accounts, master) reads better as "General".
        return PREFIX_AREA[module] ? "General" : module;
    }
    const stripped = module.slice(dot + 1);
    // Bare `users` and `master.users` can coexist in one area — keep both readable.
    return bareNames.has(stripped) ? module : stripped;
}

type AreaModule = { module: string; label: string; permissions: Permission[] };
type AreaGroup = { area: string; modules: AreaModule[] };

export function PermissionSelector({
    permissions = [],
    selectedPermissions = [],
    rolePermissions,
    onChange,
}: {
    permissions: Permission[];
    selectedPermissions: UserPermission[];
    rolePermissions?: UserPermission[];
    onChange: (permissionId: number, granted: boolean) => void;
}) {
    const areas = useMemo<AreaGroup[]>(() => {
        const byArea = new Map<string, Map<string, Permission[]>>();

        for (const perm of permissions) {
            const area = areaOf(perm.module);
            const modules = byArea.get(area) ?? new Map<string, Permission[]>();
            const list = modules.get(perm.module) ?? [];
            list.push(perm);
            modules.set(perm.module, list);
            byArea.set(area, modules);
        }

        return Array.from(byArea.entries())
            .map(([area, modules]) => {
                const bareNames = new Set(
                    Array.from(modules.keys())
                        .filter(m => m.indexOf(".") === -1)
                        .filter(m => !PREFIX_AREA[m])
                );
                return {
                    area,
                    modules: Array.from(modules.entries())
                        .map(([module, list]) => ({
                            module,
                            label: moduleLabel(module, bareNames),
                            permissions: list,
                        }))
                        .sort((a, b) => a.module.localeCompare(b.module)),
                };
            })
            .sort((a, b) => {
                if (a.area === FALLBACK_AREA) return 1;
                if (b.area === FALLBACK_AREA) return -1;
                const ai = AREA_ORDER.indexOf(a.area as (typeof AREA_ORDER)[number]);
                const bi = AREA_ORDER.indexOf(b.area as (typeof AREA_ORDER)[number]);
                if (ai !== bi) return ai - bi;
                return a.area.localeCompare(b.area);
            });
    }, [permissions]);

    const byAreaModule = useMemo(() => {
        const map = new Map<string, Permission[]>();
        for (const group of areas) {
            for (const entry of group.modules) {
                map.set(entry.module, entry.permissions);
            }
        }
        return map;
    }, [areas]);

    const selectedMap = new Map(selectedPermissions.map((p) => [p.permissionId, p.granted]));
    const inheritedSet = new Set((rolePermissions ?? []).map((p) => p.id));

    const getState = (id: number) => {
        if (selectedMap.has(id)) return selectedMap.get(id) ? "granted" : "denied";
        if (inheritedSet.has(id)) return "inherited";
        return "none";
    };

    const toggle = (permId: number) => {
        const state = getState(permId);
        onChange(permId, state !== "granted");
    };

    const countFor = (perms: Permission[]) => {
        let granted = 0;
        let inherited = 0;
        for (const p of perms) {
            const state = getState(p.id);
            if (state === "granted") granted++;
            if (state === "inherited") inherited++;
        }
        return { total: perms.length, granted, inherited };
    };

    const moduleGrantCount = (module: string) => countFor(byAreaModule.get(module) ?? []);

    const areaGrantCount = (group: AreaGroup) =>
        countFor(group.modules.flatMap((entry) => entry.permissions));

    const grantAll = (module: string, grant: boolean) => {
        for (const p of byAreaModule.get(module) ?? []) {
            const state = getState(p.id);
            if (state !== (grant ? "granted" : "denied")) {
                onChange(p.id, grant);
            }
        }
    };

    return (
        <div className="space-y-3">
            {areas.map(group => {
                const { total, granted } = areaGrantCount(group);
                return (
                    <AreaCard
                        key={group.area}
                        area={group.area}
                        total={total}
                        granted={granted}
                        moduleCount={group.modules.length}
                    >
                        <div className="grid grid-cols-[minmax(8rem,1fr)_auto_auto] gap-x-6">
                            {group.modules.map(entry => {
                                const counts = moduleGrantCount(entry.module);
                                return (
                                    <div
                                        key={entry.module}
                                        className="col-span-full grid grid-cols-subgrid items-center border-b bg-background px-3 py-2 last:border-b-0 first:rounded-t-md last:rounded-b-md"
                                    >
                                        <div className="flex min-w-0 items-baseline gap-2">
                                            <span className="truncate font-medium capitalize">{entry.label}</span>
                                            <span className="shrink-0 text-xs text-muted-foreground">
                                                ({counts.granted}/{counts.total} granted
                                                {counts.inherited > 0 && `, ${counts.inherited} from role`})
                                            </span>
                                        </div>

                                        <div
                                            className="grid items-center justify-items-center gap-x-5"
                                            style={{
                                                gridTemplateColumns: `repeat(${ACTION_ORDER.length}, minmax(0, 1fr))`,
                                            }}
                                        >
                                            {ACTION_ORDER.map(action => {
                                                const perm = entry.permissions.find((p) => p.action === action);
                                                if (!perm) {
                                                    // Keep the slot so later actions stay in their column.
                                                    return <span key={`${entry.module}-${action}`} />;
                                                }
                                                const state = getState(perm.id);
                                                const checked = state === "granted" || state === "inherited";
                                                const isInherited = state === "inherited";

                                                return (
                                                    <label
                                                        key={perm.id}
                                                        className="flex items-center gap-2 text-sm cursor-pointer select-none"
                                                    >
                                                        <Checkbox
                                                            checked={checked}
                                                            disabled={isInherited}
                                                            onCheckedChange={() => toggle(perm.id)}
                                                        />
                                                        <span className={isInherited ? "text-muted-foreground" : ""}>
                                                            {action}
                                                        </span>
                                                        {isInherited && (
                                                            <span className="text-[10px] text-muted-foreground">(inherited)</span>
                                                        )}
                                                    </label>
                                                );
                                            })}
                                        </div>

                                        <div className="flex shrink-0 justify-end gap-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs"
                                                onClick={() => grantAll(entry.module, true)}
                                            >
                                                Grant all
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs text-muted-foreground"
                                                onClick={() => grantAll(entry.module, false)}
                                            >
                                                Deny all
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </AreaCard>
                );
            })}
        </div>
    );
}

function AreaCard({
    area,
    total,
    granted,
    moduleCount,
    children,
}: {
    area: string;
    total: number;
    granted: number;
    moduleCount: number;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);

    return (
        <Collapsible open={open} onOpenChange={setOpen} asChild>
            <div className="rounded-md border bg-card">
                <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between px-3 py-3 cursor-pointer hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-2">
                            {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                            <span className="font-semibold">{area}</span>
                            <span className="text-xs text-muted-foreground">({granted}/{total} granted)</span>
                            <Badge variant="secondary">
                                {moduleCount} {moduleCount === 1 ? "module" : "modules"}
                            </Badge>
                        </div>
                    </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="px-3 pb-3">{children}</div>
                </CollapsibleContent>
            </div>
        </Collapsible>
    );
}