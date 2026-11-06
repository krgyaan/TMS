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
import { useDeleteInventoryItem, useInventoryItems, useUpdateInventoryItem, type ItemMasterScope } from "@/hooks/api/useInventoryItems";
import type { InventoryItem } from "@/types/inventory-item.types";
import { UNIT_OPTIONS, categoryOptions } from "./item-config";
import { toast } from "sonner";
import { paths } from "@/app/routes/paths";
import { formatKeySpecification, itemMasterColumnsForViewport } from "./item-master-display";

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

export default function InventoryItemListPage({ team: scope }: { team: ItemMasterScope }) {
    const isSettings = scope === "master";
    const permissionModule = isSettings ? "master.item-master" : `${scope}.item-master`;
    const navigate = useNavigate();
    const { canCreate, canUpdate, canDelete } = useAuth();
    const [viewportWidth, setViewportWidth] = useState(() => typeof window === "undefined" ? 1920 : window.innerWidth);
    const visibility = itemMasterColumnsForViewport(viewportWidth, isSettings);
    const [filters, setFilters] = useState({ search: "", itemName: "", unit: "", isActive: "" });
    const [search, setSearch] = useState("");
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });
    const [selectedRows, setSelectedRows] = useState<InventoryItem[]>([]);
    useEffect(() => { const resize = () => setViewportWidth(window.innerWidth); window.addEventListener("resize", resize); return () => window.removeEventListener("resize", resize); }, []);
    useEffect(() => {
        const timer = window.setTimeout(() => setSearch(filters.search.trim()), 300);
        return () => window.clearTimeout(timer);
    }, [filters.search]);
    const queryFilters = useMemo(() => ({
        search,
        itemName: filters.itemName || undefined, unit: filters.unit || undefined,
        isActive: filters.isActive || undefined, page: pagination.pageIndex + 1, limit: pagination.pageSize,
    }), [search, filters, pagination]);
    const { data, isLoading, isFetching, error, refetch } = useInventoryItems(scope, queryFilters);
    const deleteItem = useDeleteInventoryItem();
    const updateItem = useUpdateInventoryItem();

    const actions = useMemo<ActionItem<InventoryItem>[]>(() => isSettings ? [
        { label: "Edit", visible: () => canUpdate(permissionModule), onClick: row => navigate(paths.master.itemMasterEdit(row.id)) },
        { label: "Delete", className: "text-red-600", visible: () => canDelete(permissionModule), onClick: async row => {
            if (window.confirm(`Delete item "${row.itemName}"?`)) await deleteItem.mutateAsync(row.id);
        } },
    ] : [
        { label: "View", onClick: row => navigate(scope === "accounts" ? paths.accounts.itemMasterView(row.id) : paths.operations.itemMasterView(row.id)) },
    ], [isSettings, canUpdate, permissionModule, canDelete, deleteItem, navigate, scope]);

    const columns = useMemo<ColDef<InventoryItem>[]>(() => [
        { headerName: "Item", flex: 2, minWidth: 200, valueGetter: p => p.data?.itemName || "—", tooltipValueGetter: p => `${p.data?.itemName || "—"} · ${p.data?.itemCode || ""}`, cellRenderer: (p: { data?: InventoryItem }) => <div className="flex h-full min-w-0 flex-col justify-center leading-tight"><span className="truncate font-semibold">{p.data?.itemName || "—"}</span><span className="truncate text-xs text-muted-foreground">{p.data?.itemCode}</span></div> },
        ...(!visibility.compact ? [{ field: "itemType", headerName: "Type", width: 110, minWidth: 110, valueGetter: (p: { data?: InventoryItem }) => p.data?.itemType || "—", tooltipValueGetter: (p: { value: string }) => p.value } as ColDef<InventoryItem>] : []),
        { headerName: "Key Specification", flex: 3, minWidth: 220, valueGetter: p => formatKeySpecification(p.data?.itemName || "", p.data?.specifications || {}), tooltipValueGetter: p => p.value, cellRenderer: (p: { value?: string }) => <div className="line-clamp-2 whitespace-normal leading-tight" title={p.value}>{p.value}</div> },
        ...(!visibility.compact ? [{ field: "unit", headerName: "Unit", width: 70, minWidth: 70, tooltipField: "unit" } as ColDef<InventoryItem>] : []),
        ...(!visibility.compact ? [{ headerName: "Conversion", width: 150, minWidth: 150, valueGetter: (p: { data?: InventoryItem }) => conversionDisplay(p.data), tooltipValueGetter: (p: { value: string }) => p.value } as ColDef<InventoryItem>] : []),
        ...(visibility.hsn ? [{ field: "hsnCode", headerName: "HSN", width: 90, minWidth: 90, valueGetter: (p: { data?: InventoryItem }) => p.data?.hsnCode || "—", tooltipValueGetter: (p: { value: string }) => p.value } as ColDef<InventoryItem>] : []),
        { field: "isActive", headerName: "Status", width: 90, minWidth: 90, cellRenderer: (p: { value: boolean }) => <Badge variant={p.value ? "default" : "secondary"}>{p.value ? "Active" : "Inactive"}</Badge> },
        ...(visibility.createdAt ? [{ headerName: "Created on", field: "createdAt", width: 120, minWidth: 120, valueGetter: (p: { data?: InventoryItem }) => p.data?.createdAt ? new Date(p.data.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—" } as ColDef<InventoryItem>] : []),
        { headerName: "Actions", filter: false, sortable: false, pinned: "right", width: 60, minWidth: 60, cellRenderer: createActionColumnRenderer(actions) },
    ], [visibility.hsn, visibility.compact, visibility.createdAt, actions]);

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
            <CardTitle>{isSettings ? "Item Master" : `${scope === "accounts" ? "Accounts" : "Operations"} Item Master`}</CardTitle>
            <CardDescription>{isSettings ? "Manage shared items." : "View shared items. Items are added and edited in Settings by authorized users."}</CardDescription>
            {isSettings && <CardAction>{canCreate(permissionModule) && <Button onClick={() => navigate(paths.master.itemMasterNew)} className="min-h-11"><Plus className="mr-2 h-4 w-4" />Add New Item</Button>}</CardAction>}
        </CardHeader>
        <CardContent>
            {error && <Alert variant="destructive" className="mb-3"><AlertDescription>Unable to refresh items: {error.message}</AlertDescription></Alert>}
            <div className="mb-4 grid gap-3 md:grid-cols-2 lg:grid-cols-6">
                <div className="relative lg:col-span-2"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="h-11 pl-9 md:h-10" placeholder="Search code, name, type, HSN..." value={filters.search} onChange={event => setFilter("search", event.target.value)} /></div>
                <select aria-label="Item name filter" className="h-11 rounded-md border border-slate-400 bg-background px-3 text-sm dark:border-slate-600 md:h-10" value={filters.itemName} onChange={event => setFilter("itemName", event.target.value)}><option value="">All item names</option>{categoryOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select>
                <select aria-label="Unit filter" className="h-11 rounded-md border border-slate-400 bg-background px-3 text-sm dark:border-slate-600 md:h-10" value={filters.unit} onChange={event => setFilter("unit", event.target.value)}><option value="">All units</option>{UNIT_OPTIONS.map(unit => <option key={unit} value={unit}>{unit}</option>)}</select>
                <select aria-label="Status filter" className="h-11 rounded-md border border-slate-400 bg-background px-3 text-sm dark:border-slate-600 md:h-10" value={filters.isActive} onChange={event => setFilter("isActive", event.target.value)}><option value="">All statuses</option><option value="true">Active</option><option value="false">Inactive</option></select>
            </div>
            {isSettings && selectedRows.length > 0 && <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2 text-sm">
                <span>{selectedRows.length} selected</span>
                {canUpdate(permissionModule) && <><Button variant="outline" size="sm" className="min-h-11" onClick={() => void setBulkStatus(true)}>Activate</Button><Button variant="outline" size="sm" className="min-h-11" onClick={() => void setBulkStatus(false)}>Deactivate</Button></>}
                {canDelete(permissionModule) && <Button variant="outline" size="sm" className="min-h-11 text-red-600" onClick={() => void deleteSelected()}>Delete</Button>}
            </div>}
            {visibility.mobile ? <div className="space-y-3">
                {(data?.data || []).map(item => <article key={item.id} className="space-y-3 rounded-md border p-3">
                    <div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="break-words font-semibold">{item.itemName}</div><div className="text-xs text-muted-foreground">{item.itemCode}</div></div><Badge variant={item.isActive ? "default" : "secondary"}>{item.isActive ? "Active" : "Inactive"}</Badge></div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm"><div><span className="text-muted-foreground">Type</span><div>{item.itemType || "—"}</div></div><div><span className="text-muted-foreground">Unit</span><div>{item.unit}</div></div><div className="col-span-2"><span className="text-muted-foreground">Key Specification</span><div className="break-words">{formatKeySpecification(item.itemName, item.specifications)}</div></div><div className="col-span-2"><span className="text-muted-foreground">Conversion</span><div className="break-words">{conversionDisplay(item)}</div></div><div><span className="text-muted-foreground">HSN</span><div>{item.hsnCode || "—"}</div></div></div>
                    {isSettings && (canUpdate(permissionModule) || canDelete(permissionModule)) && <input type="checkbox" aria-label={`Select ${item.itemName}`} checked={selectedRows.some(row => row.id === item.id)} onChange={event => setSelectedRows(current => event.target.checked ? [...current.filter(row => row.id !== item.id), item] : current.filter(row => row.id !== item.id))} />}
                    <div className="flex justify-end">{actions.filter(action => action.visible?.(item) ?? true).map(action => <Button key={action.label} className={action.className} size="sm" variant="ghost" onClick={() => void action.onClick(item)}>{action.label}</Button>)}</div>
                </article>)}
            </div> : <div className="w-full min-w-0">
                <DataTable data={data?.data || []} columnDefs={columns} gridOptions={{ rowHeight: 52, headerHeight: 40, defaultColDef: { filter: false, sortable: true, resizable: true, cellStyle: { paddingLeft: "4px", paddingRight: "4px" } }, tooltipShowDelay: 350 }} loading={isFetching} manualPagination rowCount={data?.meta.total || 0} paginationState={pagination} onPaginationChange={updatePagination} onPageSizeChange={pageSize => setPagination({ pageIndex: 0, pageSize })} enableRowSelection={isSettings && (canUpdate(permissionModule) || canDelete(permissionModule))} selectionType="multiple" onSelectionChanged={isSettings ? setSelectedRows : undefined} />
            </div>}
            {visibility.mobile && <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>{data?.meta.total ? `${pagination.pageIndex * pagination.pageSize + 1}–${Math.min((pagination.pageIndex + 1) * pagination.pageSize, data.meta.total)} of ${data.meta.total}` : "0 items"}</span>
                <div className="flex items-center gap-2"><select aria-label="Items per page" className="h-9 rounded-md border bg-background px-2" value={pagination.pageSize} onChange={event => setPagination({ pageIndex: 0, pageSize: Number(event.target.value) })}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select><Button size="sm" variant="outline" disabled={pagination.pageIndex === 0} onClick={() => setPagination(current => ({ ...current, pageIndex: current.pageIndex - 1 }))}>Previous</Button><Button size="sm" variant="outline" disabled={pagination.pageIndex + 1 >= (data?.meta.totalPages || 0)} onClick={() => setPagination(current => ({ ...current, pageIndex: current.pageIndex + 1 }))}>Next</Button></div>
            </div>}
        </CardContent>
    </Card>;
}
