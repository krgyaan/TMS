import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { AlertCircle, ChevronDown, KeyRound, Plus, Save, Search, Trash2, X, Shield, Info } from "lucide-react";

import type { Permission } from "@/types/api.types";
import { usePermissions, useCreatePermission, useDeletePermission } from "@/hooks/api/usePermissions";
import { useRoles, useRole, useAssignRolePermissions } from "@/hooks/api/useRoles";
import { cn } from "@/lib/utils";

const PermissionFormSchema = z.object({
    module: z.string().min(1, "Module is required").max(100),
    action: z.string().min(1, "Action is required").max(50),
    description: z.string().max(500).optional(),
});

type PermissionFormValues = z.infer<typeof PermissionFormSchema>;

function includesText(haystack: string | null | undefined, needle: string) {
    if (!needle) return true;
    return (haystack ?? "").toLowerCase().includes(needle);
}

const PermissionsPage = () => {
    const { data: permissions, isLoading, error, refetch } = usePermissions();
    const { data: roles = [] } = useRoles();

    const deletePermission = useDeletePermission();
    const createPermission = useCreatePermission();
    const assignPermissions = useAssignRolePermissions();

    const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
    const { data: selectedRolePermissions = [] } = useRole(selectedRoleId);

    const [selectedPermissionMap, setSelectedPermissionMap] = useState<Map<number, true>>(new Map());
    const [isDirty, setIsDirty] = useState(false);
    const [query, setQuery] = useState("");
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [createModulePreset, setCreateModulePreset] = useState<string>("");
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

    const permissionForm = useForm<PermissionFormValues>({
        resolver: zodResolver(PermissionFormSchema),
        defaultValues: { module: "", action: "", description: "" },
    });

    useEffect(() => {
        if (!selectedRoleId) {
            setSelectedPermissionMap(prev => (prev.size === 0 ? prev : new Map()));
            setIsDirty(false);
            return;
        }

        const next = new Map<number, true>();
        selectedRolePermissions.forEach(p => next.set(p.id, true));

        setSelectedPermissionMap(prev => {
            if (prev.size === next.size) {
                let same = true;
                for (const key of prev.keys()) {
                    if (!next.has(key)) {
                        same = false;
                        break;
                    }
                }
                if (same) return prev;
            }
            return next;
        });

        setIsDirty(false);
    }, [selectedRoleId, selectedRolePermissions]);

    // Auto-expand all modules on initial load
    // useEffect(() => {
    //     if (permissions && expandedModules.size === 0) {
    //         const modules = new Set(permissions.map(p => p.module || "unknown"));
    //         setExpandedModules(modules);
    //     }
    // }, [permissions]);

    const filteredAndGrouped = useMemo(() => {
        const list = permissions ?? [];
        const q = query.trim().toLowerCase();

        const filtered = q
            ? list.filter(p => {
                  const key = `${p.module}.${p.action}`;
                  return includesText(p.module, q) || includesText(p.action, q) || includesText(p.description ?? "", q) || includesText(key, q);
              })
            : list;

        const groups = new Map<string, Permission[]>();
        for (const p of filtered) {
            const module = p.module || "unknown";
            const arr = groups.get(module) ?? [];
            arr.push(p);
            groups.set(module, arr);
        }

        for (const [m, arr] of groups.entries()) {
            arr.sort((a, b) => a.action.localeCompare(b.action));
            groups.set(m, arr);
        }

        return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
    }, [permissions, query]);

    const totals = useMemo(() => {
        const totalPermissions = permissions?.length ?? 0;
        const totalModules = new Set((permissions ?? []).map(p => p.module)).size;
        return { totalPermissions, totalModules };
    }, [permissions]);

    const toggleModule = (module: string) => {
        setExpandedModules(prev => {
            const next = new Set(prev);
            if (next.has(module)) next.delete(module);
            else next.add(module);
            return next;
        });
    };

    const openCreateForModule = (module: string) => {
        setCreateModulePreset(module);
        permissionForm.reset({ module, action: "", description: "" });
        setCreateModalOpen(true);
    };

    const openCreateGlobal = () => {
        setCreateModulePreset("");
        permissionForm.reset({ module: "", action: "", description: "" });
        setCreateModalOpen(true);
    };

    const handleCreatePermission = async (values: PermissionFormValues) => {
        try {
            await createPermission.mutateAsync(values);
            setCreateModalOpen(false);
            permissionForm.reset();
            refetch();
        } catch {
            // handled in hook
        }
    };

    const handleDeletePermission = async (p: Permission) => {
        if (!confirm(`Delete permission "${p.module}.${p.action}"?`)) return;
        try {
            await deletePermission.mutateAsync(p.id);
            setSelectedPermissionMap(prev => {
                const next = new Map(prev);
                next.delete(p.id);
                return next;
            });
            refetch();
        } catch {
            // handled in hook
        }
    };

    const setPermissionGranted = (permissionId: number, granted: boolean) => {
        if (!selectedRoleId) return;
        setSelectedPermissionMap(prev => {
            const next = new Map(prev);
            if (granted) next.set(permissionId, true);
            else next.delete(permissionId);
            return next;
        });
        setIsDirty(true);
    };

    const setModuleAll = (modulePermissions: Permission[], grantAll: boolean) => {
        if (!selectedRoleId) return;
        setSelectedPermissionMap(prev => {
            const next = new Map(prev);
            for (const p of modulePermissions) {
                if (grantAll) next.set(p.id, true);
                else next.delete(p.id);
            }
            return next;
        });
        setIsDirty(true);
    };

    const handleSaveRolePermissions = async () => {
        if (!selectedRoleId) return;
        try {
            await assignPermissions.mutateAsync({
                roleId: selectedRoleId,
                permissionIds: Array.from(selectedPermissionMap.keys()),
            });
            setIsDirty(false);
        } catch {
            // handled in hook
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-4 p-4">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-9 w-32" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-32 rounded-lg" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="flex items-center gap-2">
                        Error loading permissions: {error.message}
                        <Button variant="outline" size="sm" onClick={() => refetch()}>
                            Retry
                        </Button>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <TooltipProvider delayDuration={200}>
            <div className="flex flex-col h-full">
                {/* Sticky Header */}
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
                    <div className="p-4 space-y-3">
                        {/* Title Row */}
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <Shield className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h1 className="text-lg font-semibold tracking-tight">Permissions</h1>
                                    <p className="text-xs text-muted-foreground">
                                        {totals.totalModules} modules • {totals.totalPermissions} permissions
                                    </p>
                                </div>
                            </div>
                            <Button size="sm" onClick={openCreateGlobal} className="gap-1.5">
                                <Plus className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">New</span>
                            </Button>
                        </div>

                        {/* Controls Row */}
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            {/* Search */}
                            <div className="relative flex-1 max-w-md">
                                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search permissions..." className="h-8 pl-8 pr-8 text-sm" />
                                {query && (
                                    <Button variant="ghost" size="icon" className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setQuery("")}>
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>

                            {/* Role Selection & Save */}
                            {/* <div className="flex items-center gap-2">
                                <Select value={selectedRoleId?.toString() ?? ""} onValueChange={v => setSelectedRoleId(v ? Number(v) : null)}>
                                    <SelectTrigger className="h-8 w-[180px] text-sm">
                                        <SelectValue placeholder="Select role..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles.map(r => (
                                            <SelectItem key={r.id} value={r.id.toString()}>
                                                {r.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Button
                                    size="sm"
                                    variant={isDirty ? "default" : "outline"}
                                    onClick={handleSaveRolePermissions}
                                    disabled={!selectedRoleId || !isDirty || assignPermissions.isPending}
                                    className={cn("gap-1.5 h-8 transition-all", isDirty && "animate-pulse")}
                                >
                                    <Save className="h-3.5 w-3.5" />
                                    {assignPermissions.isPending ? "..." : "Save"}
                                </Button>
                            </div> */}
                        </div>

                        {!selectedRoleId && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Info className="h-3 w-3" />
                                Select a role to manage permission assignments
                            </p>
                        )}
                    </div>
                </div>

                {/* Content */}
                <ScrollArea className="flex-1">
                    <div className="p-4">
                        {filteredAndGrouped.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <KeyRound className="h-10 w-10 text-muted-foreground/50 mb-3" />
                                <p className="text-sm text-muted-foreground">{query ? "No permissions match your search" : "No permissions found"}</p>
                            </div>
                        ) : (
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {filteredAndGrouped.map(([module, modulePermissions]) => {
                                    const grantedCount = modulePermissions.reduce((acc, p) => acc + (selectedPermissionMap.has(p.id) ? 1 : 0), 0);
                                    const allSelected = selectedRoleId ? grantedCount === modulePermissions.length : false;
                                    const someSelected = selectedRoleId ? grantedCount > 0 && grantedCount < modulePermissions.length : false;
                                    const isExpanded = expandedModules.has(module);

                                    return (
                                        <Collapsible key={module} open={isExpanded} onOpenChange={() => toggleModule(module)}>
                                            <div
                                                className={cn(
                                                    "rounded-lg border bg-card transition-all duration-200",
                                                    "hover:shadow-md hover:border-primary/20",
                                                    isExpanded && "ring-1 ring-primary/10"
                                                )}
                                            >
                                                {/* Module Header */}
                                                <CollapsibleTrigger asChild>
                                                    <div
                                                        className={cn(
                                                            "flex items-center justify-between gap-2 p-2.5 cursor-pointer",
                                                            "hover:bg-muted/50 transition-colors rounded-t-lg",
                                                            !isExpanded && "rounded-b-lg"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <ChevronDown
                                                                className={cn(
                                                                    "h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200",
                                                                    !isExpanded && "-rotate-90"
                                                                )}
                                                            />
                                                            <span className="font-medium text-sm truncate">{module}</span>
                                                            <Badge variant="secondary" className="h-5 text-[10px] px-1.5 shrink-0">
                                                                {modulePermissions.length}
                                                            </Badge>
                                                        </div>

                                                        <div className="flex items-center gap-1 shrink-0">
                                                            {selectedRoleId && (
                                                                <Badge variant={grantedCount > 0 ? "default" : "outline"} className="h-5 text-[10px] px-1.5">
                                                                    {grantedCount}/{modulePermissions.length}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </CollapsibleTrigger>

                                                <CollapsibleContent>
                                                    <div className="border-t">
                                                        {/* Module Actions */}
                                                        <div className="flex items-center justify-between px-2.5 py-1.5 bg-muted/30">
                                                            {selectedRoleId ? (
                                                                <label className="flex items-center gap-1.5 cursor-pointer">
                                                                    <Checkbox
                                                                        checked={allSelected ? true : someSelected ? "indeterminate" : false}
                                                                        onCheckedChange={v => setModuleAll(modulePermissions, v === true)}
                                                                        className="h-3.5 w-3.5"
                                                                    />
                                                                    <span className="text-[11px] text-muted-foreground">Select all</span>
                                                                </label>
                                                            ) : (
                                                                <span />
                                                            )}

                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6"
                                                                        onClick={e => {
                                                                            e.stopPropagation();
                                                                            openCreateForModule(module);
                                                                        }}
                                                                    >
                                                                        <Plus className="h-3 w-3" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="left">Add permission to {module}</TooltipContent>
                                                            </Tooltip>
                                                        </div>

                                                        {/* Permissions List */}
                                                        <div className="max-h-[200px] overflow-auto">
                                                            {modulePermissions.map((p, idx) => {
                                                                const checked = selectedPermissionMap.has(p.id);

                                                                return (
                                                                    <div
                                                                        key={p.id}
                                                                        className={cn(
                                                                            "group flex items-center gap-2 px-2.5 py-1.5",
                                                                            "hover:bg-muted/40 transition-colors",
                                                                            idx !== modulePermissions.length - 1 && "border-b border-dashed"
                                                                        )}
                                                                    >
                                                                        <Checkbox
                                                                            checked={selectedRoleId ? checked : false}
                                                                            disabled={!selectedRoleId}
                                                                            onCheckedChange={v => setPermissionGranted(p.id, v === true)}
                                                                            className="h-3.5 w-3.5 shrink-0"
                                                                        />

                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <code className="text-xs font-medium truncate">{p.action}</code>
                                                                                {p.description && (
                                                                                    <Tooltip>
                                                                                        <TooltipTrigger>
                                                                                            <Info className="h-3 w-3 text-muted-foreground" />
                                                                                        </TooltipTrigger>
                                                                                        <TooltipContent side="top" className="max-w-[200px]">
                                                                                            {p.description}
                                                                                        </TooltipContent>
                                                                                    </Tooltip>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className={cn(
                                                                                "h-6 w-6 shrink-0",
                                                                                "opacity-0 group-hover:opacity-100 transition-opacity",
                                                                                "text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                            )}
                                                                            onClick={() => handleDeletePermission(p)}
                                                                            disabled={deletePermission.isPending}
                                                                        >
                                                                            <Trash2 className="h-3 w-3" />
                                                                        </Button>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </CollapsibleContent>
                                            </div>
                                        </Collapsible>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Create Permission Modal */}
                <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                    <DialogContent className="sm:max-w-[400px]">
                        <DialogHeader className="pb-2">
                            <DialogTitle className="text-base">Create Permission</DialogTitle>
                            <DialogDescription className="text-xs">
                                {createModulePreset ? `Add permission to "${createModulePreset}"` : "Add a new system permission"}
                            </DialogDescription>
                        </DialogHeader>

                        <Form {...permissionForm}>
                            <form onSubmit={permissionForm.handleSubmit(handleCreatePermission)} className="space-y-3">
                                <FormField
                                    control={permissionForm.control}
                                    name="module"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">Module *</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g., users, tenders" className="h-8 text-sm" {...field} />
                                            </FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={permissionForm.control}
                                    name="action"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">Action *</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g., create, read, update" className="h-8 text-sm" {...field} />
                                            </FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={permissionForm.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">Description</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="Optional description" rows={2} className="text-sm resize-none" {...field} />
                                            </FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )}
                                />

                                <DialogFooter className="pt-2">
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setCreateModalOpen(false)} disabled={createPermission.isPending}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" size="sm" disabled={createPermission.isPending}>
                                        {createPermission.isPending ? "Creating..." : "Create"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    );
};

export default PermissionsPage;
