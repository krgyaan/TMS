import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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
import { useDeleteInventoryItem, useInventoryItems, useUpdateInventoryItem, type ItemMasterTeam } from "@/hooks/api/useInventoryItems";
import type { InventoryItem } from "@/types/inventory-item.types";
import { formatKeySpecification, itemMasterColumnsForViewport, keySpecificationAttributes } from "./item-master-display";
import { toast } from "sonner";
import { paths } from "@/app/routes/paths";

function KeySpecificationChips({ item, compact = false }: { item: InventoryItem; compact?: boolean }) {
    const attributes = keySpecificationAttributes(item.category, item.itemName, item.specifications || {}, item.itemType);
    const tooltip = attributes.map(attribute => `${attribute.label}: ${attribute.value}`).join("\n");
    if (!attributes.length) return <span>—</span>;
    const displayed = compact ? attributes : attributes.slice(0, 3);
    const hiddenCount = attributes.length - displayed.length;
    return <div className={`${compact ? "" : "line-clamp-3"} max-w-full whitespace-normal break-words text-xs leading-5`} title={tooltip}>
        {displayed.map(attribute => <span key={attribute.key} className="mb-1 mr-1 inline-flex max-w-full items-baseline gap-1 rounded-md border bg-muted/40 px-1.5 py-0.5 align-top">
            <span className="text-muted-foreground">{attribute.label}</span><span className="break-all text-foreground">{attribute.value}</span>
        </span>)}
        {hiddenCount > 0 && <span className="mb-1 mr-1 inline-flex rounded-md border bg-muted px-1.5 py-0.5 align-top">+{hiddenCount} more</span>}
    </div>;
}

export default function InventoryItemListPage({ team }: { team: ItemMasterTeam }) {
    const isSettings = team === "master";
    const permissionModule = isSettings ? "master.item-master" : `${team}.item-master`;
    const navigate = useNavigate();
    const { canCreate, canUpdate, canDelete } = useAuth();
    const [gridWidth, setGridWidth] = useState(0);
    const layoutContainerRef = useRef<HTMLDivElement>(null);
    const visibility = itemMasterColumnsForViewport(gridWidth);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });
    const [selectedRows, setSelectedRows] = useState<InventoryItem[]>([]);
    useEffect(() => {
        const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
        return () => window.clearTimeout(timer);
    }, [searchInput]);
    const queryFilters = useMemo(() => ({
        search, page: pagination.pageIndex + 1, limit: pagination.pageSize,
    }), [search, pagination]);
    const { data, isLoading, isFetching, error, refetch } = useInventoryItems(team, queryFilters);
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
        { label: "View", onClick: row => navigate(team === "accounts" ? paths.accounts.itemMasterView(row.id) : paths.operations.itemMasterView(row.id)) },
    ], [isSettings, canUpdate, permissionModule, canDelete, deleteItem, navigate, team]);

    const columns = useMemo<ColDef<InventoryItem>[]>(() => [
        { field: "itemCode", headerName: "Item Code", width: 130, minWidth: 130, maxWidth: 175, tooltipField: "itemCode" },
        { field: "itemName", headerName: "Item Name", flex: 1.4, minWidth: 190, maxWidth: 350, tooltipField: "itemName", cellStyle: { fontWeight: 500 } },
        ...(visibility.category ? [{ headerName: "Category", field: "category", flex: 1.2, minWidth: 170, maxWidth: 300, valueGetter: (p: { data?: InventoryItem }) => p.data?.category || "Legacy", tooltipValueGetter: (p: { value?: string | null }) => p.value ?? "", wrapText: true, autoHeight: true, cellRenderer: (p: { value?: string }) => <div className="w-full whitespace-normal break-words py-1 leading-5">{p.value}</div> } as ColDef<InventoryItem>] : []),
        { headerName: "Key Specification", flex: 2.4, minWidth: 280, maxWidth: 500, valueGetter: (p: { data?: InventoryItem }) => formatKeySpecification(p.data?.category, p.data?.itemName || "", p.data?.specifications || {}, p.data?.itemType), tooltipValueGetter: (p: { value?: string | null }) => p.value ?? "", wrapText: true, autoHeight: true, cellRenderer: (p: { data?: InventoryItem }) => p.data ? <KeySpecificationChips item={p.data} /> : <span>—</span> },
        ...(visibility.unit ? [{ field: "unit", headerName: "Unit", width: 80, minWidth: 80, maxWidth: 90 } as ColDef<InventoryItem>] : []),
        { field: "hsnCode", headerName: "HSN Code", width: 110, minWidth: 110, maxWidth: 130, valueGetter: (p: { data?: InventoryItem }) => p.data?.hsnCode || "—", tooltipValueGetter: (p: { value?: string | null }) => p.value ?? "" },
        ...(visibility.createdBy ? [{ headerName: "Created By", field: "createdByName", width: 150, minWidth: 150, maxWidth: 180, valueGetter: (p: { data?: InventoryItem }) => p.data?.createdByName || "—", tooltipValueGetter: (p: { value?: string | null }) => p.value ?? "" } as ColDef<InventoryItem>] : []),
        { headerName: "Actions", filter: false, sortable: false, width: 80, minWidth: 80, maxWidth: 80, headerComponent: () => <div className="w-full text-center">Actions</div>, cellRenderer: createActionColumnRenderer(actions), cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" } },
    ], [visibility.category, visibility.unit, visibility.createdBy, actions]);

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
            <CardTitle>{isSettings ? "Item Master" : `${team === "accounts" ? "Accounts" : "Operations"} Item Master`}</CardTitle>
            <CardDescription>{isSettings ? "Manage shared AC and DC items." : "View items shared across AC and DC. Items are added and edited in Settings by authorized users."}</CardDescription>
            {isSettings && <CardAction>{canCreate(permissionModule) && <Button onClick={() => navigate(paths.master.itemMasterNew)} className="min-h-11"><Plus className="mr-2 h-4 w-4" />Add New Item</Button>}</CardAction>}
        </CardHeader>
        <CardContent>
            {error && <Alert variant="destructive" className="mb-3"><AlertDescription>Unable to refresh items: {error.message}</AlertDescription></Alert>}
            <div className="mb-4 w-full">
                <div className="relative w-full"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="h-11 w-full pl-9 md:h-10" placeholder="Search code, name, category, make/brand..." value={searchInput} onChange={event => setSearchValue(event.target.value)} /></div>
            </div>
            {isSettings && selectedRows.length > 0 && <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2 text-sm">
                <span>{selectedRows.length} selected</span>
                {canUpdate(permissionModule) && <><Button variant="outline" size="sm" className="min-h-11" onClick={() => void setBulkStatus(true)}>Activate</Button><Button variant="outline" size="sm" className="min-h-11" onClick={() => void setBulkStatus(false)}>Deactivate</Button></>}
                {canDelete(permissionModule) && <Button variant="outline" size="sm" className="min-h-11 text-red-600" onClick={() => void deleteSelected()}>Delete</Button>}
            </div>}
            <div ref={layoutContainerRef} className="w-full min-w-0">
                {visibility.mobile ? <div className="space-y-3">
                    {(data?.data || []).map(item => <article key={item.id} className={`space-y-3 rounded-md border p-3 ${item.isActive ? "" : "text-muted-foreground"}`}>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                            <div><span className="text-muted-foreground">Item Code</span><div className="break-words">{item.itemCode}</div></div>
                            <div><span className="text-muted-foreground">Item Name</span><div className="break-words font-medium">{item.itemName}</div></div>
                            <div><span className="text-muted-foreground">Category</span><div>{item.category || "Legacy"}</div></div>
                            <div className="col-span-2"><span className="text-muted-foreground">Key Specification</span><KeySpecificationChips item={item} compact /></div>
                            <div><span className="text-muted-foreground">HSN Code</span><div>{item.hsnCode || "—"}</div></div>
                            <div><span className="text-muted-foreground">Created By</span><div>{item.createdByName || "—"}</div></div>
                        </div>
                        {isSettings && (canUpdate(permissionModule) || canDelete(permissionModule)) && <input type="checkbox" className="h-5 w-5" aria-label={`Select ${item.itemName}`} checked={selectedRows.some(row => row.id === item.id)} onChange={event => setSelectedRows(current => event.target.checked ? [...current.filter(row => row.id !== item.id), item] : current.filter(row => row.id !== item.id))} />}
                        <div className="flex justify-end">{actions.filter(action => action.visible?.(item) ?? true).map(action => <Button key={action.label} className={`${action.className || ""} min-h-11 min-w-11`} size="sm" variant="ghost" onClick={() => void action.onClick(item)}>{action.label}</Button>)}</div>
                    </article>)}
                </div> : <div className="w-full min-w-0 overflow-hidden">
                    <div style={{ "--ag-cell-horizontal-padding": "16px" } as CSSProperties}>
                        <DataTable data={data?.data || []} columnDefs={columns} gridOptions={{ rowHeight: 52, headerHeight: 44, selectionColumnDef: { width: 56, minWidth: 56, maxWidth: 56, pinned: "left", cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" } }, defaultColDef: { filter: false, sortable: true, resizable: true, cellStyle: { display: "flex", alignItems: "center" } }, getRowStyle: params => params.data?.isActive ? undefined : ({ color: "var(--muted-foreground)" }), tooltipShowDelay: 350 }} loading={isFetching} manualPagination rowCount={data?.meta.total || 0} paginationState={pagination} onPaginationChange={updatePagination} onPageSizeChange={pageSize => setPagination({ pageIndex: 0, pageSize })} enableRowSelection={isSettings && (canUpdate(permissionModule) || canDelete(permissionModule))} selectionType="multiple" onSelectionChanged={isSettings ? setSelectedRows : undefined} />
                    </div>
                </div>}
            </div>
            {visibility.mobile && <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>{data?.meta.total ? `${pagination.pageIndex * pagination.pageSize + 1}–${Math.min((pagination.pageIndex + 1) * pagination.pageSize, data.meta.total)} of ${data.meta.total}` : "0 items"}</span>
                <div className="flex items-center gap-2"><select aria-label="Items per page" className="h-9 rounded-md border bg-background px-2" value={pagination.pageSize} onChange={event => setPagination({ pageIndex: 0, pageSize: Number(event.target.value) })}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select><Button size="sm" variant="outline" disabled={pagination.pageIndex === 0} onClick={() => setPagination(current => ({ ...current, pageIndex: current.pageIndex - 1 }))}>Previous</Button><Button size="sm" variant="outline" disabled={pagination.pageIndex + 1 >= (data?.meta.totalPages || 0)} onClick={() => setPagination(current => ({ ...current, pageIndex: current.pageIndex + 1 }))}>Next</Button></div>
            </div>}
        </CardContent>
    </Card>;
}
