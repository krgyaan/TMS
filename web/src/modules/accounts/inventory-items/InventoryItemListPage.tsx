import { useState } from "react";
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
import { useDeleteInventoryItem, useInventoryItems } from "@/hooks/api/useInventoryItems";
import type { InventoryItem } from "@/types/inventory-item.types";
import { InventoryItemFormDialog } from "./InventoryItemFormDialog";
import { InventoryItemViewDialog } from "./InventoryItemViewDialog";

export default function InventoryItemListPage() {
    const { canCreate, canUpdate, canDelete } = useAuth();
    const [search, setSearch] = useState("");
    const { data, isLoading, error, refetch } = useInventoryItems(search);
    const deleteItem = useDeleteInventoryItem();
    const [editing, setEditing] = useState<InventoryItem | null | undefined>(undefined);
    const [viewing, setViewing] = useState<InventoryItem | null>(null);
    const actions: ActionItem<InventoryItem>[] = [
        { label: "View", onClick: row => setViewing(row) },
        { label: "Edit", visible: () => canUpdate("accounts.inventory-items"), onClick: row => setEditing(row) },
        { label: "Delete", className: "text-red-600", visible: () => canDelete("accounts.inventory-items"), onClick: async row => { if (confirm(`Deactivate item "${row.itemName}"?`)) await deleteItem.mutateAsync(row.id); } },
    ];
    const columns: ColDef<InventoryItem>[] = [
        { field: "itemName", headerName: "Item Name", flex: 1.2 },
        { field: "itemType", headerName: "Item Type", flex: 0.9, valueGetter: p => p.data?.itemType || "—" },
        { headerName: "Specifications", flex: 1.5, valueGetter: p => Object.values(p.data?.specifications || {}).filter(Boolean).join(", ") || "—" },
        { field: "unit", headerName: "Unit", flex: 0.8 },
        { headerName: "Conversion", flex: 1, valueGetter: p => p.data?.conversion?.value || Object.values(p.data?.conversion || {})[0] || "—" },
        { field: "hsnCode", headerName: "HSN Code", flex: 0.8, valueGetter: p => p.data?.hsnCode || "—" },
        { field: "isActive", headerName: "Status", width: 110, cellRenderer: (p: { value: boolean }) => <Badge variant={p.value ? "default" : "secondary"}>{p.value ? "Active" : "Inactive"}</Badge> },
        { headerName: "Actions", filter: false, sortable: false, pinned: "right", width: 110, cellRenderer: createActionColumnRenderer(actions) },
    ];
    if (isLoading) return <Card><CardHeader><Skeleton className="h-8 w-48" /><Skeleton className="mt-2 h-4 w-80" /></CardHeader><CardContent><Skeleton className="h-96 w-full" /></CardContent></Card>;
    if (error) return <Card><CardHeader><CardTitle>Item Master</CardTitle></CardHeader><CardContent><Alert variant="destructive"><AlertDescription>Unable to load items: {error.message} <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button></AlertDescription></Alert></CardContent></Card>;
    return <>
        <Card>
            <CardHeader><CardTitle>Item Master</CardTitle><CardDescription>Manage inventory items, specifications, units, conversions and HSN codes.</CardDescription><CardAction>{canCreate("accounts.inventory-items") && <Button onClick={() => setEditing(null)}><Plus className="mr-2 h-4 w-4" />Add New Item</Button>}</CardAction></CardHeader>
            <CardContent>
                <div className="relative mb-4 max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search items by name, type, HSN..." value={search} onChange={event => setSearch(event.target.value)} /></div>
                <DataTable data={data?.data || []} columnDefs={columns} gridOptions={{ defaultColDef: { filter: true, sortable: true }, pagination: true }} enablePagination />
            </CardContent>
        </Card>
        {editing !== undefined && <InventoryItemFormDialog open onOpenChange={open => { if (!open) setEditing(undefined); }} item={editing} />}
        <InventoryItemViewDialog item={viewing} onOpenChange={open => { if (!open) setViewing(null); }} />
    </>;
}
