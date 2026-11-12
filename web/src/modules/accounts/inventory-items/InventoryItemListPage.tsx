import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { useDeleteInventoryItem, useInventoryItems, useUpdateInventoryItem, type ItemMasterTeam } from "@/hooks/api/useInventoryItems";
import type { InventoryItem } from "@/types/inventory-item.types";
import { ITEM_GROUPS, UNIT_OPTIONS, categoryOptions } from "./item-config";
import { toast } from "sonner";
import { paths } from "@/app/routes/paths";

const formatFactor = (value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === "") return "";
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString("en-IN", { maximumFractionDigits: 6 }) : String(value);
};

const conversionDisplay = (item?: InventoryItem) => {
    if (!item?.conversionUnit || !item.conversionFactor) return "—";
    const from = item.conversion?.value?.split(" -> ")[0] || item.unit;
    return `1 ${from} = ${formatFactor(item.conversionFactor)} ${item.conversionUnit}`;
};

export default function InventoryItemListPage({ team }: { team: ItemMasterTeam }) {
    const isSettings = team === "master";
    const permissionModule = isSettings ? "master.item-master" : `${team}.item-master`;
    const navigate = useNavigate();
    const { canCreate, canUpdate, canDelete } = useAuth();
    const { data: allTeams = [] } = useTeams();
    const teamOptions = useMemo(() => allTeams.filter(option => option.name === "AC" || option.name === "DC"), [allTeams]);
    const teamNames = useMemo(() => new Map(teamOptions.map(option => [option.id, option.name])), [teamOptions]);
    const [filters, setFilters] = useState({ search: "", teamId: "", itemGroup: "", itemName: "", unit: "", isActive: "" });
    const [search, setSearch] = useState("");
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });
    const [selectedRows, setSelectedRows] = useState<InventoryItem[]>([]);
    useEffect(() => {
        const timer = window.setTimeout(() => setSearch(filters.search.trim()), 300);
        return () => window.clearTimeout(timer);
    }, [filters.search]);
    const queryFilters = useMemo(() => ({
        search, teamId: filters.teamId ? Number(filters.teamId) : undefined, itemGroup: filters.itemGroup || undefined,
        itemName: filters.itemName || undefined, unit: filters.unit || undefined,
        isActive: filters.isActive || undefined, page: pagination.pageIndex + 1, limit: pagination.pageSize,
    }), [search, filters, pagination]);
    const { data, isLoading, isFetching, error, refetch } = useInventoryItems(team, queryFilters);
    const deleteItem = useDeleteInventoryItem();
    const updateItem = useUpdateInventoryItem();

    const actions = useMemo<ActionItem<InventoryItem>[]>(() => isSettings ? [
        { label: "Edit", visible: () => canUpdate(permissionModule), onClick: row => navigate(paths.master.itemMasterEdit(row.id)) },
        { label: "Delete", className: "text-red-600", visible: () => canDelete(permissionModule), onClick: async row => {
            if (window.confirm(`Delete item "${row.itemName}"?`)) await deleteItem.mutateAsync(row.id);
        } },
    ] : [
        { label: "View", onClick: row => navigate(team === "accounts" ? paths.accounts.itemMasterView(row.id) : paths.operations.itemMasterView(row.id)) },
    ], [isSettings, canUpdate, permissionModule, canDelete, deleteItem, navigate, team]);

    const columns = useMemo<ColDef<InventoryItem>[]>(() => [
        { field: "itemCode", headerName: "Item Code", width: 120, tooltipField: "itemCode" },
        { field: "teamId", headerName: "Team", width: 80, valueGetter: p => teamNames.get(Number(p.data?.teamId)) || "—" },
        { field: "itemName", headerName: "Item Name", flex: 1, minWidth: 200, tooltipField: "itemName" },
        { field: "itemType", headerName: "Type", width: 140, valueGetter: p => p.data?.itemType || "—", tooltipValueGetter: p => p.value },
        { headerName: "Key Specification", flex: 1, minWidth: 240, valueGetter: p => Object.entries(p.data?.specifications || {}).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join(" · ") || "—", tooltipValueGetter: p => p.value },
        { field: "unit", headerName: "Unit", width: 90, tooltipField: "unit" },
        { headerName: "Conversion", width: 180, valueGetter: p => conversionDisplay(p.data), tooltipValueGetter: p => p.value },
        { field: "hsnCode", headerName: "HSN", width: 110, valueGetter: p => p.data?.hsnCode || "—", tooltipValueGetter: p => p.value },
        { field: "isActive", headerName: "Status", width: 100, cellRenderer: (p: { value: boolean }) => <Badge variant={p.value ? "default" : "secondary"}>{p.value ? "Active" : "Inactive"}</Badge> },
        { headerName: "Created on", field: "createdAt", width: 130, valueGetter: p => p.data?.createdAt ? new Date(p.data.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—", tooltipValueGetter: p => p.value },
        { headerName: "Actions", filter: false, sortable: false, pinned: "right", width: 80, cellRenderer: createActionColumnRenderer(actions) },
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
        } catch (mutationError) { toast.error(mutationError instanceof Error ? mutationError.message : "Unable to update selected items"); }
    };
    const deleteSelected = async () => {
        if (!window.confirm(`Delete ${selectedRows.length} selected items?`)) return;
        try {
            await Promise.all(selectedRows.map(row => deleteItem.mutateAsync(row.id)));
            setSelectedRows([]);
        } catch (mutationError) { toast.error(mutationError instanceof Error ? mutationError.message : "Unable to delete selected items"); }
    };

    if (isLoading) return <Card><CardHeader><Skeleton className="h-8 w-48" /><Skeleton className="mt-2 h-4 w-80" /></CardHeader><CardContent><Skeleton className="h-96 w-full" /></CardContent></Card>;
    if (error && !data) return <Card><CardHeader><CardTitle>Item Master</CardTitle></CardHeader><CardContent><Alert variant="destructive"><AlertDescription>Unable to load items: {error.message} <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button></AlertDescription></Alert></CardContent></Card>;

    return <Card>
        <CardHeader>
            <CardTitle>{isSettings ? "Item Master" : `${team === "accounts" ? "Accounts" : "Operations"} Item Master`}</CardTitle>
            <CardDescription>{isSettings ? "Manage shared AC and DC items." : "View items shared across AC and DC. Items are added and edited in Settings by authorized users."}</CardDescription>
            {isSettings && <CardAction>{canCreate(permissionModule) && <Button onClick={() => navigate(paths.master.itemMasterNew)} className="min-h-11"><Plus className="mr-2 h-4 w-4" />Add New Item</Button>}</CardAction>}
        </CardHeader>
        <CardContent>
            {error && <Alert variant="destructive" className="mb-3"><AlertDescription>Unable to refresh items: {error.message}</AlertDescription></Alert>}
            <div className="mb-4 grid gap-3 md:grid-cols-2 lg:grid-cols-6">
                <div className="relative lg:col-span-2"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="h-11 pl-9 md:h-10" placeholder="Search code, name, type, HSN..." value={filters.search} onChange={event => setFilter("search", event.target.value)} /></div>
                <select aria-label="Team filter" className="h-11 rounded-md border border-slate-400 bg-background px-3 text-sm dark:border-slate-600 md:h-10" value={filters.teamId} onChange={event => setFilter("teamId", event.target.value)}><option value="">All teams</option>{teamOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select>
                <select aria-label="Item group filter" className="h-11 rounded-md border border-slate-400 bg-background px-3 text-sm dark:border-slate-600 md:h-10" value={filters.itemGroup} onChange={event => setFilter("itemGroup", event.target.value)}><option value="">All groups</option>{ITEM_GROUPS.map(group => <option key={group} value={group}>{group}</option>)}</select>
                <select aria-label="Item name filter" className="h-11 rounded-md border border-slate-400 bg-background px-3 text-sm dark:border-slate-600 md:h-10" value={filters.itemName} onChange={event => setFilter("itemName", event.target.value)}><option value="">All item names</option>{categoryOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select>
                <select aria-label="Unit filter" className="h-11 rounded-md border border-slate-400 bg-background px-3 text-sm dark:border-slate-600 md:h-10" value={filters.unit} onChange={event => setFilter("unit", event.target.value)}><option value="">All units</option>{UNIT_OPTIONS.map(unit => <option key={unit} value={unit}>{unit}</option>)}</select>
                <select aria-label="Status filter" className="h-11 rounded-md border border-slate-400 bg-background px-3 text-sm dark:border-slate-600 md:h-10" value={filters.isActive} onChange={event => setFilter("isActive", event.target.value)}><option value="">All statuses</option><option value="true">Active</option><option value="false">Inactive</option></select>
            </div>
            {isSettings && selectedRows.length > 0 && <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2 text-sm">
                <span>{selectedRows.length} selected</span>
                {canUpdate(permissionModule) && <><Button variant="outline" size="sm" className="min-h-11" onClick={() => void setBulkStatus(true)}>Activate</Button><Button variant="outline" size="sm" className="min-h-11" onClick={() => void setBulkStatus(false)}>Deactivate</Button></>}
                {canDelete(permissionModule) && <Button variant="outline" size="sm" className="min-h-11 text-red-600" onClick={() => void deleteSelected()}>Delete</Button>}
            </div>}
            <div className="w-full overflow-x-auto">
                <DataTable data={data?.data || []} columnDefs={columns} gridOptions={{ defaultColDef: { filter: false, sortable: true, resizable: true }, tooltipShowDelay: 350 }} loading={isFetching} manualPagination rowCount={data?.meta.total || 0} paginationState={pagination} onPaginationChange={updatePagination} onPageSizeChange={pageSize => setPagination({ pageIndex: 0, pageSize })} enableRowSelection={isSettings && (canUpdate(permissionModule) || canDelete(permissionModule))} selectionType="multiple" onSelectionChanged={isSettings ? setSelectedRows : undefined} />
            </div>
        </CardContent>
    </Card>;
}
