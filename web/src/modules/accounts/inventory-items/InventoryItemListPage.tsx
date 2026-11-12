import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import DataTable from "@/components/ui/data-table";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import type { ColDef } from "ag-grid-community";
import { useAuth } from "@/contexts/AuthContext";
import { useDeleteInventoryItem, useInventoryItems, useUpdateInventoryItem, type ItemMasterScope } from "@/hooks/api/useInventoryItems";
import type { InventoryItem } from "@/types/inventory-item.types";
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
    const [gridWidth, setGridWidth] = useState(0);
    const layoutContainerRef = useRef<HTMLDivElement>(null);
    const visibility = itemMasterColumnsForViewport(gridWidth, isSettings);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });
    const [selectedRows, setSelectedRows] = useState<InventoryItem[]>([]);
    useEffect(() => {
        const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
        return () => window.clearTimeout(timer);
    }, [searchInput]);
    const queryFilters = useMemo(() => ({
        search,
        page: pagination.pageIndex + 1, limit: pagination.pageSize,
    }), [search, pagination]);
    const { data, isLoading, isFetching, error, refetch } = useInventoryItems(scope, queryFilters);
    const deleteItem = useDeleteInventoryItem();
    const updateItem = useUpdateInventoryItem();

    useEffect(() => {
        const container = layoutContainerRef.current;
        if (!container || isLoading) return;
        const observer = new ResizeObserver(entries => {
            const width = Math.floor(entries[0]?.contentRect.width || 0);
            setGridWidth(current => current === width ? current : width);
        });
        observer.observe(container);
        return () => observer.disconnect();
    }, [isLoading]);

    const actions = useMemo<ActionItem<InventoryItem>[]>(() => isSettings ? [
        { label: "Edit", visible: () => canUpdate(permissionModule), onClick: row => navigate(paths.master.itemMasterEdit(row.id)) },
        { label: "Delete", className: "text-red-600", visible: () => canDelete(permissionModule), onClick: async row => {
            if (window.confirm(`Delete item "${row.itemName}"?`)) await deleteItem.mutateAsync(row.id);
        } },
    ] : [
        { label: "View", onClick: row => navigate(scope === "accounts" ? paths.accounts.itemMasterView(row.id) : paths.operations.itemMasterView(row.id)) },
    ], [isSettings, canUpdate, permissionModule, canDelete, deleteItem, navigate, scope]);

    const columns = useMemo<ColDef<InventoryItem>[]>(() => [
        { field: "itemCode", headerName: "Item Code", width: 110, minWidth: 110, maxWidth: 180, tooltipField: "itemCode", cellStyle: { display: "flex", alignItems: "center" } },
        { field: "itemName", headerName: "Item Name", flex: 2, minWidth: 180, maxWidth: 420, tooltipField: "itemName", cellStyle: { display: "flex", alignItems: "center", fontWeight: 500 } },
        ...(visibility.itemType ? [{ field: "itemType", headerName: "Type", flex: 1, minWidth: 120, maxWidth: 300, valueGetter: (p: { data?: InventoryItem }) => p.data?.itemType || "—", tooltipValueGetter: (p: { value: string }) => p.value, cellStyle: { display: "flex", alignItems: "center" } } as ColDef<InventoryItem>] : []),
        ...(visibility.specifications ? [{ headerName: "Key Specification", flex: 2, minWidth: 200, maxWidth: 500, valueGetter: (p: { data?: InventoryItem }) => formatKeySpecification(p.data?.itemName || "", p.data?.specifications || {}), tooltipValueGetter: (p: { value: string }) => p.value, cellRenderer: (p: { value?: string }) => <div className="line-clamp-2 whitespace-normal leading-tight" title={p.value}>{p.value}</div> } as ColDef<InventoryItem>] : []),
        { field: "unit", headerName: "Unit", width: 80, minWidth: 80, maxWidth: 100, cellStyle: { display: "flex", alignItems: "center" } },
        ...(visibility.conversion ? [{ headerName: "Conversion", width: 150, minWidth: 150, maxWidth: 190, valueGetter: (p: { data?: InventoryItem }) => conversionDisplay(p.data), tooltipValueGetter: (p: { value: string }) => p.value, cellStyle: { display: "flex", alignItems: "center" } } as ColDef<InventoryItem>] : []),
        { field: "hsnCode", headerName: "HSN Code", width: 110, minWidth: 110, maxWidth: 150, valueGetter: (p: { data?: InventoryItem }) => p.data?.hsnCode || "—", tooltipValueGetter: (p: { value: string }) => p.value, cellStyle: { display: "flex", alignItems: "center" } },
        { field: "isActive", headerName: "Status", width: 100, minWidth: 100, maxWidth: 130, valueGetter: (p: { data?: InventoryItem }) => p.data?.isActive ? "Active" : "Inactive", cellStyle: { display: "flex", alignItems: "center" } },
        ...(visibility.createdAt ? [{ headerName: "Created on", field: "createdAt", width: 130, minWidth: 130, maxWidth: 170, valueGetter: (p: { data?: InventoryItem }) => p.data?.createdAt ? new Date(p.data.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—", cellStyle: { display: "flex", alignItems: "center" } } as ColDef<InventoryItem>] : []),
        { headerName: "Actions", filter: false, sortable: false, pinned: "right", width: 80, minWidth: 80, maxWidth: 80, cellRenderer: createActionColumnRenderer(actions), cellStyle: { display: "flex", alignItems: "center" } },
    ], [visibility.itemType, visibility.specifications, visibility.conversion, visibility.createdAt, actions]);

    const setSearchValue = (value: string) => {
        setSearchInput(value);
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
            <div className="mb-4 w-full">
                <div className="relative w-full"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="h-11 w-full pl-9 md:h-10" placeholder="Search code, name, type, HSN..." value={searchInput} onChange={event => setSearchValue(event.target.value)} /></div>
            </div>
            {isSettings && selectedRows.length > 0 && <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2 text-sm">
                <span>{selectedRows.length} selected</span>
                {canUpdate(permissionModule) && <><Button variant="outline" size="sm" className="min-h-11" onClick={() => void setBulkStatus(true)}>Activate</Button><Button variant="outline" size="sm" className="min-h-11" onClick={() => void setBulkStatus(false)}>Deactivate</Button></>}
                {canDelete(permissionModule) && <Button variant="outline" size="sm" className="min-h-11 text-red-600" onClick={() => void deleteSelected()}>Delete</Button>}
            </div>}
            <div ref={layoutContainerRef} className="w-full min-w-0">
            {visibility.mobile ? <div className="space-y-3">
                {(data?.data || []).map(item => <article key={item.id} className="space-y-3 rounded-md border p-3">
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm"><div><span className="text-muted-foreground">Item Code</span><div className="break-words">{item.itemCode}</div></div><div><span className="text-muted-foreground">Item Name</span><div className="break-words font-medium">{item.itemName}</div></div><div><span className="text-muted-foreground">HSN Code</span><div>{item.hsnCode || "—"}</div></div><div><span className="text-muted-foreground">Unit</span><div>{item.unit || "—"}</div></div><div><span className="text-muted-foreground">Status</span><div>{item.isActive ? "Active" : "Inactive"}</div></div></div>
                    {isSettings && (canUpdate(permissionModule) || canDelete(permissionModule)) && <input type="checkbox" aria-label={`Select ${item.itemName}`} checked={selectedRows.some(row => row.id === item.id)} onChange={event => setSelectedRows(current => event.target.checked ? [...current.filter(row => row.id !== item.id), item] : current.filter(row => row.id !== item.id))} />}
                    <div className="flex justify-end">{actions.filter(action => action.visible?.(item) ?? true).map(action => <Button key={action.label} className={action.className} size="sm" variant="ghost" onClick={() => void action.onClick(item)}>{action.label}</Button>)}</div>
                </article>)}
            </div> : <div className="w-full min-w-0 overflow-hidden">
                <DataTable data={data?.data || []} columnDefs={columns} gridOptions={{ rowHeight: 52, headerHeight: 40, selectionColumnDef: { width: 48, minWidth: 48, maxWidth: 48, pinned: "left" }, defaultColDef: { filter: false, sortable: true, resizable: true, cellStyle: { paddingLeft: "4px", paddingRight: "4px", display: "flex", alignItems: "center" } }, tooltipShowDelay: 350 }} loading={isFetching} manualPagination rowCount={data?.meta.total || 0} paginationState={pagination} onPaginationChange={updatePagination} onPageSizeChange={pageSize => setPagination({ pageIndex: 0, pageSize })} enableRowSelection={isSettings && (canUpdate(permissionModule) || canDelete(permissionModule))} selectionType="multiple" onSelectionChanged={isSettings ? setSelectedRows : undefined} />
            </div>}
            </div>
            {visibility.mobile && <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>{data?.meta.total ? `${pagination.pageIndex * pagination.pageSize + 1}–${Math.min((pagination.pageIndex + 1) * pagination.pageSize, data.meta.total)} of ${data.meta.total}` : "0 items"}</span>
                <div className="flex items-center gap-2"><select aria-label="Items per page" className="h-9 rounded-md border bg-background px-2" value={pagination.pageSize} onChange={event => setPagination({ pageIndex: 0, pageSize: Number(event.target.value) })}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select><Button size="sm" variant="outline" disabled={pagination.pageIndex === 0} onClick={() => setPagination(current => ({ ...current, pageIndex: current.pageIndex - 1 }))}>Previous</Button><Button size="sm" variant="outline" disabled={pagination.pageIndex + 1 >= (data?.meta.totalPages || 0)} onClick={() => setPagination(current => ({ ...current, pageIndex: current.pageIndex + 1 }))}>Next</Button></div>
            </div>}
        </CardContent>
    </Card>;
}
