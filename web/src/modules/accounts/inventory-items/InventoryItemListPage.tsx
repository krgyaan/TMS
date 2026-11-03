import { useMemo, useState } from "react";
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
import { useDeleteInventoryItem, useInventoryItems, useUpdateInventoryItem } from "@/hooks/api/useInventoryItems";
import type { InventoryItem } from "@/types/inventory-item.types";
import { ITEM_GROUPS, getFamiliesForGroup } from "./item-config";
import { paths } from "@/app/routes/paths";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { InventoryItemFormDialog } from "./InventoryItemFormDialog";
import { InventoryItemViewDialog } from "./InventoryItemViewDialog";

export default function InventoryItemListPage() {
    const navigate = useNavigate();
    const { canCreate, canUpdate, canDelete } = useAuth();
    const [filters, setFilters] = useState({ search: "", itemGroup: "", itemName: "", unit: "", isActive: "" });
    const { data, isLoading, error, refetch } = useInventoryItems(filters);
    const deleteItem = useDeleteInventoryItem();
    const updateItem = useUpdateInventoryItem();
    const [selectedRows, setSelectedRows] = useState<InventoryItem[]>([]);
    const [editing, setEditing] = useState<InventoryItem | null | undefined>(undefined);
    const [viewing, setViewing] = useState<InventoryItem | null>(null);
    const actions: ActionItem<InventoryItem>[] = [
        { label: "View", onClick: row => setViewing(row) },
        { label: "Permissions", visible: () => canUpdate("accounts.inventory-items"), onClick: () => navigate(paths.master.permissions) },
        { label: "Edit", visible: () => canUpdate("accounts.inventory-items"), onClick: row => setEditing(row) },
        { label: "Delete", className: "text-red-600", visible: () => canDelete("accounts.inventory-items"), onClick: async row => { if (confirm(`Delete item "${row.itemName}"?`)) await deleteItem.mutateAsync(row.id); } },
    ];
    const columns: ColDef<InventoryItem>[] = [
        { field: "itemCode", headerName: "Item Code", flex: 0.9 },
        { field: "itemName", headerName: "Item Name", flex: 1.2 },
        { field: "itemType", headerName: "Type", flex: 0.9, valueGetter: p => p.data?.itemType || "—" },
        { headerName: "Key Specification", flex: 1.5, valueGetter: p => Object.values(p.data?.specifications || {}).filter(Boolean).join(" · ") || "—" },
        { field: "unit", headerName: "Unit", flex: 0.8 },
        { headerName: "Conversion", flex: 1, valueGetter: p => p.data?.conversion?.value || Object.values(p.data?.conversion || {})[0] || "—" },
        { field: "hsnCode", headerName: "HSN Code", flex: 0.8, valueGetter: p => p.data?.hsnCode || "—" },
        { field: "isActive", headerName: "Status", width: 110, cellRenderer: (p: { value: boolean }) => <Badge variant={p.value ? "default" : "secondary"}>{p.value ? "Active" : "Inactive"}</Badge> },
        { headerName: "Created on", field: "createdAt", width: 125, valueGetter: p => p.data?.createdAt ? new Date(p.data.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—" },
        { headerName: "Actions", filter: false, sortable: false, pinned: "right", width: 120, cellRenderer: createActionColumnRenderer(actions) },
    ];
    const units = useMemo(() => [...new Set((data?.data || []).map(item => item.unit))].sort(), [data?.data]);
    const itemNames = filters.itemGroup ? getFamiliesForGroup(filters.itemGroup as typeof ITEM_GROUPS[number]) : [];
    const setFilter = (key: keyof typeof filters, value: string) => setFilters(current => ({ ...current, [key]: value, ...(key === "itemGroup" ? { itemName: "" } : {}) }));
    if (isLoading) return <Card><CardHeader><Skeleton className="h-8 w-48" /><Skeleton className="mt-2 h-4 w-80" /></CardHeader><CardContent><Skeleton className="h-96 w-full" /></CardContent></Card>;
    if (error) return <Card><CardHeader><CardTitle>Item Master</CardTitle></CardHeader><CardContent><Alert variant="destructive"><AlertDescription>Unable to load items: {error.message} <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button></AlertDescription></Alert></CardContent></Card>;
    return <>
        <Card>
            <CardHeader><CardTitle>Item Master</CardTitle><CardDescription>Manage inventory items, specifications, units, conversions and HSN codes.</CardDescription><CardAction>{canCreate("accounts.inventory-items") && <Button onClick={() => setEditing(null)}><Plus className="mr-2 h-4 w-4" />Add New Item</Button>}</CardAction></CardHeader>
            <CardContent>
                <div className="mb-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                    <div className="relative lg:col-span-2"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search items by code, name, type, HSN..." value={filters.search} onChange={event => setFilter("search", event.target.value)} /></div>
                    <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={filters.itemGroup} onChange={event => setFilter("itemGroup", event.target.value)}><option value="">All item groups</option>{ITEM_GROUPS.map(group => <option key={group} value={group}>{group}</option>)}</select>
                    <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={filters.itemName} onChange={event => setFilter("itemName", event.target.value)}><option value="">All item names</option>{itemNames.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select>
                    <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={filters.unit} onChange={event => setFilter("unit", event.target.value)}><option value="">All units</option>{units.map(unit => <option key={unit} value={unit}>{unit}</option>)}</select>
                    <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={filters.isActive} onChange={event => setFilter("isActive", event.target.value)}><option value="">All statuses</option><option value="true">Active</option><option value="false">Inactive</option></select>
                </div>
                {selectedRows.length > 0 && <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2 text-sm"><span>{selectedRows.length} selected</span><Button variant="outline" size="sm" disabled={!canUpdate("accounts.inventory-items")} onClick={async () => { await Promise.all(selectedRows.map(row => updateItem.mutateAsync({ id: row.id, data: { isActive: true } }))); toast.success("Selected items activated"); }}>Activate</Button><Button variant="outline" size="sm" disabled={!canUpdate("accounts.inventory-items")} onClick={async () => { await Promise.all(selectedRows.map(row => updateItem.mutateAsync({ id: row.id, data: { isActive: false } }))); toast.success("Selected items deactivated"); }}>Deactivate</Button><Button variant="outline" size="sm" className="text-red-600" disabled={!canDelete("accounts.inventory-items")} onClick={async () => { if (confirm(`Delete ${selectedRows.length} selected items?`)) { await Promise.all(selectedRows.map(row => deleteItem.mutateAsync(row.id))); setSelectedRows([]); } }}>Delete</Button></div>}
                <DataTable data={data?.data || []} columnDefs={columns} gridOptions={{ defaultColDef: { filter: true, sortable: true }, pagination: true }} enablePagination enableRowSelection selectionType="multiple" onSelectionChanged={setSelectedRows} />
            </CardContent>
        </Card>
        {editing !== undefined && <InventoryItemFormDialog open onOpenChange={open => { if (!open) setEditing(undefined); }} item={editing} />}
        <InventoryItemViewDialog item={viewing} onOpenChange={open => { if (!open) setViewing(null); }} />
    </>;
}
