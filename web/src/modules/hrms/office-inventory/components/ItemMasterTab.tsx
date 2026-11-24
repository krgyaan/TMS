import { useMemo, useState, type CSSProperties } from "react";
import type { ColDef } from "ag-grid-community";
import DataTable from "@/components/ui/data-table";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OfficeInventoryItem } from "../types";
import { formatQty } from "../utils";

interface ItemMasterTabProps {
    items: OfficeInventoryItem[];
    loading?: boolean;
    search: string;
    onEdit: (item: OfficeInventoryItem) => void;
    onDelete: (item: OfficeInventoryItem) => void;
}

type CategoryFilter = "All" | "Housekeeping" | "Pantry" | "Stationery" | "LOW";

export function ItemMasterTab({
    items,
    loading = false,
    search,
    onEdit,
    onDelete,
}: ItemMasterTabProps) {
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All");

    const counts = useMemo(
        () => ({
            All: items.length,
            Housekeeping: items.filter(i => i.category === "Housekeeping").length,
            Pantry: items.filter(i => i.category === "Pantry").length,
            Stationery: items.filter(i => i.category === "Stationery").length,
            LOW: items.filter(i => i.status === "LOW STOCK").length,
        }),
        [items]
    );

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return items.filter(item => {
            if (categoryFilter === "LOW" && item.status !== "LOW STOCK") return false;
            if (
                categoryFilter !== "All" &&
                categoryFilter !== "LOW" &&
                item.category !== categoryFilter
            ) {
                return false;
            }
            if (!q) return true;
            return (
                item.itemCode.toLowerCase().includes(q) ||
                item.itemName.toLowerCase().includes(q) ||
                item.category.toLowerCase().includes(q) ||
                item.unit.toLowerCase().includes(q) ||
                item.status.toLowerCase().includes(q)
            );
        });
    }, [items, categoryFilter, search]);

    const actions = useMemo<ActionItem<OfficeInventoryItem>[]>(
        () => [
            { label: "Edit Item", onClick: onEdit },
            { label: "Delete", className: "text-destructive", onClick: onDelete },
        ],
        [onEdit, onDelete]
    );

    const columns = useMemo<ColDef<OfficeInventoryItem>[]>(
        () => [
            {
                field: "itemCode",
                headerName: "Code",
                width: 95,
                minWidth: 85,
                cellClass: "font-mono text-xs",
            },
            {
                field: "itemName",
                headerName: "Item Name",
                flex: 1.5,
                minWidth: 150,
                cellStyle: { fontWeight: 500 } as ColDef<OfficeInventoryItem>["cellStyle"],
            },
            {
                field: "minStockLevel",
                headerName: "Min Stock",
                width: 90,
                minWidth: 80,
                valueFormatter: p => formatQty(p.value),
            },
            {
                field: "openingStock",
                headerName: "Opening",
                width: 85,
                minWidth: 75,
                valueFormatter: p => formatQty(p.value),
            },
            {
                field: "totalPurchased",
                headerName: "Purchased",
                width: 92,
                minWidth: 82,
                valueFormatter: p => formatQty(p.value),
            },
            {
                field: "totalConsumed",
                headerName: "Consumed",
                width: 92,
                minWidth: 82,
                valueFormatter: p => formatQty(p.value),
            },
            {
                field: "currentStock",
                headerName: "Current Stock",
                width: 105,
                minWidth: 95,
                cellStyle: { fontWeight: 600 } as ColDef<OfficeInventoryItem>["cellStyle"],
                valueGetter: p =>
                    p.data ? `${formatQty(p.data.currentStock)} ${p.data.unit}` : "",
            },
            {
                field: "status",
                headerName: "Status",
                width: 95,
                minWidth: 85,
                cellRenderer: (p: { value?: string }) =>
                    p.value ? (
                        <Badge
                            variant={p.value === "LOW STOCK" ? "destructive" : "secondary"}
                        >
                            {p.value}
                        </Badge>
                    ) : (
                        "—"
                    ),
            },
            {
                headerName: "Actions",
                filter: false,
                sortable: false,
                width: 72,
                minWidth: 68,
                maxWidth: 76,
                headerComponent: () => <div className="w-full text-center">Actions</div>,
                cellRenderer: createActionColumnRenderer(actions),
                cellStyle: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                } as ColDef<OfficeInventoryItem>["cellStyle"],
            },
        ],
        [actions]
    );

    const filters: Array<{ key: CategoryFilter; label: string }> = [
        { key: "All", label: `All (${counts.All})` },
        { key: "Housekeeping", label: `Housekeeping (${counts.Housekeeping})` },
        { key: "Pantry", label: `Pantry (${counts.Pantry})` },
        { key: "Stationery", label: `Stationery (${counts.Stationery})` },
        { key: "LOW", label: `Low Stock (${counts.LOW})` },
    ];

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                    {filters.map(f => (
                        <Button
                            key={f.key}
                            type="button"
                            size="sm"
                            variant={
                                categoryFilter === f.key
                                    ? f.key === "LOW"
                                        ? "destructive"
                                        : "default"
                                    : "outline"
                            }
                            onClick={() => setCategoryFilter(f.key)}
                        >
                            {f.label}
                        </Button>
                    ))}
                </div>
                <span className="text-xs text-muted-foreground">
                    Showing {filtered.length} of {items.length} items
                </span>
            </div>

            <div style={{ "--ag-cell-horizontal-padding": "10px" } as CSSProperties}>
                <DataTable
                    data={filtered}
                    columnDefs={columns}
                    loading={loading}
                    pageSize={25}
                    gridOptions={{
                        rowHeight: 44,
                        headerHeight: 40,
                        defaultColDef: {
                            filter: false,
                            sortable: true,
                            resizable: true,
                            cellStyle: { display: "flex", alignItems: "center" },
                        },
                        overlayNoRowsTemplate:
                            items.length === 0
                                ? '<span class="text-sm text-muted-foreground">No inventory items yet. Click "Add Item" to get started.</span>'
                                : '<span class="text-sm text-muted-foreground">No items match the current search or filter.</span>',
                    }}
                />
            </div>
        </div>
    );
}
