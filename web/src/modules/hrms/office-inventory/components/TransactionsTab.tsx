import { useMemo, type CSSProperties } from "react";
import type { ColDef } from "ag-grid-community";
import DataTable from "@/components/ui/data-table";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { OfficeInventoryConsumption, OfficeInventoryPurchase } from "../types";
import { formatCurrency, formatDateDisplay, formatQty } from "../utils";

interface TransactionsTabProps {
    subTab: "purchases" | "consumptions";
    onSubTabChange: (sub: "purchases" | "consumptions") => void;
    purchases: OfficeInventoryPurchase[];
    consumptions: OfficeInventoryConsumption[];
    loading?: boolean;
    search: string;
    onEditPurchase: (row: OfficeInventoryPurchase) => void;
    onDeletePurchase: (row: OfficeInventoryPurchase) => void;
    onEditConsumption: (row: OfficeInventoryConsumption) => void;
    onDeleteConsumption: (row: OfficeInventoryConsumption) => void;
}

export function TransactionsTab({
    subTab,
    onSubTabChange,
    purchases,
    consumptions,
    loading = false,
    search,
    onEditPurchase,
    onDeletePurchase,
    onEditConsumption,
    onDeleteConsumption,
}: TransactionsTabProps) {
    const q = search.trim().toLowerCase();

    const filteredPurchases = useMemo(
        () =>
            purchases.filter(p => {
                if (!q) return true;
                return (
                    p.itemCode.toLowerCase().includes(q) ||
                    p.itemName.toLowerCase().includes(q) ||
                    p.category.toLowerCase().includes(q) ||
                    (p.supplier || "").toLowerCase().includes(q) ||
                    (p.notes || "").toLowerCase().includes(q)
                );
            }),
        [purchases, q]
    );

    const filteredConsumptions = useMemo(
        () =>
            consumptions.filter(c => {
                if (!q) return true;
                return (
                    c.itemCode.toLowerCase().includes(q) ||
                    c.itemName.toLowerCase().includes(q) ||
                    c.category.toLowerCase().includes(q) ||
                    (c.issuedTo || "").toLowerCase().includes(q) ||
                    (c.notes || "").toLowerCase().includes(q)
                );
            }),
        [consumptions, q]
    );

    const totalPurchaseValue = useMemo(
        () => filteredPurchases.reduce((sum, p) => sum + p.amount, 0),
        [filteredPurchases]
    );

    const purchaseActions = useMemo<ActionItem<OfficeInventoryPurchase>[]>(
        () => [
            { label: "Edit", onClick: onEditPurchase },
            { label: "Delete", className: "text-destructive", onClick: onDeletePurchase },
        ],
        [onEditPurchase, onDeletePurchase]
    );

    const consumptionActions = useMemo<ActionItem<OfficeInventoryConsumption>[]>(
        () => [
            { label: "Edit", onClick: onEditConsumption },
            { label: "Delete", className: "text-destructive", onClick: onDeleteConsumption },
        ],
        [onEditConsumption, onDeleteConsumption]
    );

    const purchaseColumns = useMemo<ColDef<OfficeInventoryPurchase>[]>(
        () => [
            {
                field: "purchaseDate",
                headerName: "Date",
                width: 125,
                valueFormatter: p => formatDateDisplay(p.value),
            },
            { field: "itemCode", headerName: "Item Code", width: 115, cellClass: "font-mono text-xs" },
            { field: "itemName", headerName: "Item Name", flex: 1.3, minWidth: 160 },
            {
                field: "category",
                headerName: "Category",
                width: 130,
                cellRenderer: (p: { value?: string }) =>
                    p.value ? <Badge variant="outline">{p.value}</Badge> : "—",
            },
            {
                field: "qtyPurchased",
                headerName: "Qty",
                width: 110,
                valueGetter: p => (p.data ? `${formatQty(p.data.qtyPurchased)} ${p.data.unit}` : ""),
            },
            {
                field: "rate",
                headerName: "Rate (₹)",
                width: 115,
                valueFormatter: p => formatCurrency(p.value),
            },
            {
                field: "amount",
                headerName: "Amount (₹)",
                width: 130,
                cellStyle: { fontWeight: 600 } as ColDef<OfficeInventoryPurchase>["cellStyle"],
                valueFormatter: p => formatCurrency(p.value),
            },
            {
                field: "supplier",
                headerName: "Supplier",
                flex: 1,
                minWidth: 140,
                valueFormatter: p => p.value || "—",
            },
            {
                field: "notes",
                headerName: "Notes",
                flex: 1,
                minWidth: 140,
                valueFormatter: p => p.value || "—",
            },
            {
                headerName: "Actions",
                filter: false,
                sortable: false,
                width: 85,
                headerComponent: () => <div className="w-full text-center">Actions</div>,
                cellRenderer: createActionColumnRenderer(purchaseActions),
                cellStyle: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                } as ColDef<OfficeInventoryPurchase>["cellStyle"],
            },
        ],
        [purchaseActions]
    );

    const consumptionColumns = useMemo<ColDef<OfficeInventoryConsumption>[]>(
        () => [
            {
                field: "consumptionDate",
                headerName: "Date",
                width: 125,
                valueFormatter: p => formatDateDisplay(p.value),
            },
            { field: "itemCode", headerName: "Item Code", width: 115, cellClass: "font-mono text-xs" },
            { field: "itemName", headerName: "Item Name", flex: 1.3, minWidth: 160 },
            {
                field: "category",
                headerName: "Category",
                width: 130,
                cellRenderer: (p: { value?: string }) =>
                    p.value ? <Badge variant="outline">{p.value}</Badge> : "—",
            },
            {
                field: "qtyIssued",
                headerName: "Qty Issued",
                width: 130,
                cellStyle: { fontWeight: 600 } as ColDef<OfficeInventoryConsumption>["cellStyle"],
                valueGetter: p => (p.data ? `${formatQty(p.data.qtyIssued)} ${p.data.unit}` : ""),
            },
            {
                field: "issuedTo",
                headerName: "Issued To / Dept.",
                flex: 1,
                minWidth: 150,
                valueFormatter: p => p.value || "—",
            },
            {
                field: "notes",
                headerName: "Notes",
                flex: 1.2,
                minWidth: 160,
                valueFormatter: p => p.value || "—",
            },
            {
                headerName: "Actions",
                filter: false,
                sortable: false,
                width: 85,
                headerComponent: () => <div className="w-full text-center">Actions</div>,
                cellRenderer: createActionColumnRenderer(consumptionActions),
                cellStyle: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                } as ColDef<OfficeInventoryConsumption>["cellStyle"],
            },
        ],
        [consumptionActions]
    );

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        size="sm"
                        variant={subTab === "purchases" ? "default" : "outline"}
                        onClick={() => onSubTabChange("purchases")}
                    >
                        Purchase Log ({purchases.length})
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant={subTab === "consumptions" ? "default" : "outline"}
                        onClick={() => onSubTabChange("consumptions")}
                    >
                        Consumption / Issue Log ({consumptions.length})
                    </Button>
                </div>
                {subTab === "purchases" && (
                    <span className="text-sm text-muted-foreground">
                        Total Value:{" "}
                        <strong className="text-foreground">
                            {formatCurrency(totalPurchaseValue)}
                        </strong>
                    </span>
                )}
            </div>

            <div style={{ "--ag-cell-horizontal-padding": "10px" } as CSSProperties}>
                {subTab === "purchases" ? (
                    <DataTable
                        data={filteredPurchases}
                        columnDefs={purchaseColumns}
                        loading={loading}
                        pageSize={25}
                        gridOptions={{
                            rowHeight: 48,
                            headerHeight: 44,
                            defaultColDef: {
                                filter: false,
                                sortable: true,
                                resizable: true,
                                cellStyle: { display: "flex", alignItems: "center" },
                            },
                        }}
                    />
                ) : (
                    <DataTable
                        data={filteredConsumptions}
                        columnDefs={consumptionColumns}
                        loading={loading}
                        pageSize={25}
                        gridOptions={{
                            rowHeight: 48,
                            headerHeight: 44,
                            defaultColDef: {
                                filter: false,
                                sortable: true,
                                resizable: true,
                                cellStyle: { display: "flex", alignItems: "center" },
                            },
                        }}
                    />
                )}
            </div>
        </div>
    );
}
