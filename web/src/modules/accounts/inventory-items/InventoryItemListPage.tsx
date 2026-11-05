import { useEffect, useMemo, useState } from "react";
import { Search, Plus } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import DataTable from "@/components/ui/data-table";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import type { ColDef } from "ag-grid-community";
import { useAuth } from "@/contexts/AuthContext";
import { useTeams } from "@/hooks/api/useTeams";
import { useDeleteInventoryItem, useInventoryItems, useUpdateInventoryItem } from "@/hooks/api/useInventoryItems";
import type { InventoryItem } from "@/types/inventory-item.types";
import { UNIT_OPTIONS, categoryOptions } from "./item-config";
import { toast } from "sonner";
import { InventoryItemFormDialog } from "./InventoryItemFormDialog";
import { InventoryItemViewDialog } from "./InventoryItemViewDialog";

export default function InventoryItemListPage({ team }: { team: "accounts" | "operations" }) {
    const permissionModule = `${team}.item-master`;
    const { canCreate, canUpdate, canDelete } = useAuth();
    const { data: allTeams = [] } = useTeams();
    const teamOptions = useMemo(() => allTeams.filter(option => option.name === "AC" || option.name === "DC"), [allTeams]);
    const teamNames = useMemo(() => new Map(teamOptions.map(option => [option.id, option.name])), [teamOptions]);
    const [filters, setFilters] = useState({ search: "", teamId: "", itemName: "", unit: "", isActive: "" });
    const [search, setSearch] = useState("");
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });
    useEffect(() => {
        const timer = window.setTimeout(() => setSearch(filters.search.trim()), 300);
        return () => window.clearTimeout(timer);
    }, [filters.search]);
    const queryFilters = useMemo(() => ({
        search, teamId: filters.teamId ? Number(filters.teamId) : undefined,
        itemName: filters.itemName || undefined, unit: filters.unit || undefined,
        isActive: filters.isActive || undefined, page: pagination.pageIndex + 1, limit: pagination.pageSize,
    }), [search, filters, pagination]);
    const { data, isLoading, isFetching, error, refetch } = useInventoryItems(team, queryFilters);
    const deleteItem = useDeleteInventoryItem(team);
    const updateItem = useUpdateInventoryItem(team);
    const [selectedRows, setSelectedRows] = useState<InventoryItem[]>([]);
    const [editing, setEditing] = useState<InventoryItem | null | undefined>(undefined);
    const [viewing, setViewing] = useState<InventoryItem | null>(null);

    const actions = useMemo<ActionItem<InventoryItem>[]>(() => [
        { label: "View", onClick: row => setViewing(row) },
        { label: "Edit", visible: () => canUpdate(permissionModule), onClick: row => setEditing(row) },
        { label: "Delete", className: "text-red-600", visible: () => canDelete(permissionModule), onClick: async row => { if (confirm(`Delete item "${row.itemName}"?`)) await deleteItem.mutateAsync(row.id); } },
    ], [canUpdate, permissionModule, canDelete, deleteItem]);
    const columns = useMemo<ColDef<InventoryItem>[]>(() => [
        { field: "itemCode", headerName: "Item Code", flex: 1, minWidth: 120 },
        { field: "teamId", headerName: "Team", valueGetter: p => teamNames.get(Number(p.data?.teamId)) || "—", flex: 0.7, minWidth: 90 },
        { field: "itemName", headerName: "Item Name", flex: 1.5, minWidth: 150 },
        { field: "itemType", headerName: "Type", flex: 0.9, valueGetter: p => p.data?.itemType || "—" },
        { headerName: "Key Specification", flex: 1.5, valueGetter: p => Object.values(p.data?.specifications || {}).filter(Boolean).join(" · ") || "—" },
        { field: "unit", headerName: "Unit", flex: 0.8 },
        { field: "hsnCode", headerName: "HSN Code", flex: 0.8, valueGetter: p => p.data?.hsnCode || "—" },
        { field: "isActive", headerName: "Status", width: 110, cellRenderer: (p: { value: boolean }) => <Badge variant={p.value ? "default" : "secondary"}>{p.value ? "Active" : "Inactive"}</Badge> },
        { headerName: "Created on", field: "createdAt", width: 125, valueGetter: p => p.data?.createdAt ? new Date(p.data.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—" },
        { headerName: "Actions", filter: false, sortable: false, pinned: "right", width: 120, cellRenderer: createActionColumnRenderer(actions) },
    ], [teamNames, actions]);

    const setFilter = (key: keyof typeof filters, value: string) => {
        setFilters(current => ({ ...current, [key]: value }));
        setPagination(current => ({ ...current, pageIndex: 0 }));
        setSelectedRows([]);
    };
    const updatePagination = (next: { pageIndex: number; pageSize: number }) => setPagination(next);
    const setBulkStatus = async (isActive: boolean) => {
        try {
            await Promise.all(selectedRows.map(row => updateItem.mutateAsync({ id: row.id, data: { isActive } })));
            setSelectedRows([]);
            toast.success(isActive ? "Selected items activated" : "Selected items deactivated");
        } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to update selected items"); }
    };

    if (isLoading) return <Card><CardHeader><Skeleton className="h-8 w-48" /><Skeleton className="mt-2 h-4 w-80" /></CardHeader><CardContent><Skeleton className="h-96 w-full" /></CardContent></Card>;
    if (error && !data) return <Card><CardHeader><CardTitle>Item Master</CardTitle></CardHeader><CardContent><Alert variant="destructive"><AlertDescription>Unable to load items: {error.message} <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button></AlertDescription></Alert></CardContent></Card>;

    return <>
        <Card>
            <CardHeader><CardTitle>{team === "accounts" ? "Accounts" : "Operations"} Item Master</CardTitle><CardDescription>Manage shared AC/DC items from the {team === "accounts" ? "Accounts" : "Operations"} workspace.</CardDescription><CardAction>{canCreate(permissionModule) && <Button onClick={() => setEditing(null)}><Plus className="mr-2 h-4 w-4" />Add New Item</Button>}</CardAction></CardHeader>
            <CardContent>
                {error && <Alert variant="destructive" className="mb-3"><AlertDescription>Unable to refresh items: {error.message}</AlertDescription></Alert>}
                <div className="mb-4 grid gap-3 md:grid-cols-2 lg:grid-cols-6">
                    <div className="relative lg:col-span-2"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="h-9 pl-9" placeholder="Search code, name, type, HSN..." value={filters.search} onChange={event => setFilter("search", event.target.value)} /></div>
                    <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={filters.teamId} onChange={event => setFilter("teamId", event.target.value)}><option value="">All teams</option>{teamOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select>
                    <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={filters.itemName} onChange={event => setFilter("itemName", event.target.value)}><option value="">All item names</option>{categoryOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select>
                    <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={filters.unit} onChange={event => setFilter("unit", event.target.value)}><option value="">All units</option>{UNIT_OPTIONS.map(unit => <option key={unit} value={unit}>{unit}</option>)}</select>
                    <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={filters.isActive} onChange={event => setFilter("isActive", event.target.value)}><option value="">All statuses</option><option value="true">Active</option><option value="false">Inactive</option></select>
                </div>
                {selectedRows.length > 0 && <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2 text-sm"><span>{selectedRows.length} selected</span><Button variant="outline" size="sm" disabled={!canUpdate(permissionModule)} onClick={() => void setBulkStatus(true)}>Activate</Button><Button variant="outline" size="sm" disabled={!canUpdate(permissionModule)} onClick={() => void setBulkStatus(false)}>Deactivate</Button><Button variant="outline" size="sm" className="text-red-600" disabled={!canDelete(permissionModule)} onClick={async () => { if (confirm(`Delete ${selectedRows.length} selected items?`)) { try { await Promise.all(selectedRows.map(row => deleteItem.mutateAsync(row.id))); setSelectedRows([]); } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to delete selected items"); } } }}>Delete</Button></div>}
                <DataTable data={data?.data || []} columnDefs={columns} gridOptions={{ defaultColDef: { filter: false, sortable: true } }} loading={isFetching} manualPagination rowCount={data?.meta.total || 0} paginationState={pagination} onPaginationChange={updatePagination} onPageSizeChange={pageSize => setPagination({ pageIndex: 0, pageSize })} enableRowSelection selectionType="multiple" onSelectionChanged={setSelectedRows} />
            </CardContent>
        </Card>
        {editing !== undefined && <InventoryItemFormDialog open onOpenChange={open => { if (!open) setEditing(undefined); }} item={editing} routeTeam={team} />}
        <InventoryItemViewDialog item={viewing} onOpenChange={open => { if (!open) setViewing(null); }} />
    </>;
}
