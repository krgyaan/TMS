import { useMemo, type CSSProperties } from "react";
import type { ColDef } from "ag-grid-community";
import DataTable from "@/components/ui/data-table";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OfficeEquipment, OfficeEquipmentLog } from "../types";
import { formatCurrency, formatDateDisplay, formatQty } from "../utils";

interface EquipmentTabProps {
    subTab: "register" | "logs";
    onSubTabChange: (sub: "register" | "logs") => void;
    equipment: OfficeEquipment[];
    logs: OfficeEquipmentLog[];
    loading?: boolean;
    search: string;
    onEditEquipment: (row: OfficeEquipment) => void;
    onDeleteEquipment: (row: OfficeEquipment) => void;
    onEditLog: (row: OfficeEquipmentLog) => void;
    onDeleteLog: (row: OfficeEquipmentLog) => void;
}

export function EquipmentTab({
    subTab,
    onSubTabChange,
    equipment,
    logs,
    loading = false,
    search,
    onEditEquipment,
    onDeleteEquipment,
    onEditLog,
    onDeleteLog,
}: EquipmentTabProps) {
    const q = search.trim().toLowerCase();

    const filteredEquipment = useMemo(
        () =>
            equipment.filter(e => {
                if (!q) return true;
                return (
                    e.equipmentCode.toLowerCase().includes(q) ||
                    e.itemName.toLowerCase().includes(q) ||
                    e.category.toLowerCase().includes(q) ||
                    (e.location || "").toLowerCase().includes(q) ||
                    e.condition.toLowerCase().includes(q)
                );
            }),
        [equipment, q]
    );

    const filteredLogs = useMemo(
        () =>
            logs.filter(l => {
                if (!q) return true;
                return (
                    l.equipmentCode.toLowerCase().includes(q) ||
                    l.itemName.toLowerCase().includes(q) ||
                    l.movementType.toLowerCase().includes(q) ||
                    (l.approvedBy || "").toLowerCase().includes(q) ||
                    (l.reasonNotes || "").toLowerCase().includes(q)
                );
            }),
        [logs, q]
    );

    const equipmentActions = useMemo<ActionItem<OfficeEquipment>[]>(
        () => [
            { label: "Edit", onClick: onEditEquipment },
            { label: "Delete", className: "text-destructive", onClick: onDeleteEquipment },
        ],
        [onEditEquipment, onDeleteEquipment]
    );

    const logActions = useMemo<ActionItem<OfficeEquipmentLog>[]>(
        () => [
            { label: "Edit", onClick: onEditLog },
            { label: "Delete", className: "text-destructive", onClick: onDeleteLog },
        ],
        [onEditLog, onDeleteLog]
    );

    const equipmentColumns = useMemo<ColDef<OfficeEquipment>[]>(
        () => [
            {
                field: "equipmentCode",
                headerName: "Code",
                width: 96,
                minWidth: 88,
                cellClass: "font-mono text-xs",
            },
            {
                field: "category",
                headerName: "Category",
                width: 105,
                minWidth: 95,
                cellRenderer: (p: { value?: string }) =>
                    p.value ? <Badge variant="outline">{p.value}</Badge> : "—",
            },
            {
                field: "itemName",
                headerName: "Equipment",
                flex: 1.4,
                minWidth: 140,
                cellRenderer: (p: { data?: OfficeEquipment }) =>
                    p.data ? (
                        <div className="truncate">
                            <span className="font-medium">{p.data.itemName}</span>{" "}
                            <span className="text-xs text-muted-foreground">({p.data.unit})</span>
                        </div>
                    ) : (
                        "—"
                    ),
            },
            {
                field: "location",
                headerName: "Location",
                flex: 0.9,
                minWidth: 95,
                valueFormatter: p => p.value || "—",
            },
            {
                field: "openingQty",
                headerName: "Open",
                width: 68,
                minWidth: 62,
                valueFormatter: p => formatQty(p.value),
            },
            {
                field: "qtyAdded",
                headerName: "Added",
                width: 72,
                minWidth: 64,
                valueFormatter: p => `+${formatQty(p.value)}`,
            },
            {
                field: "qtyDiscarded",
                headerName: "Disc.",
                width: 68,
                minWidth: 62,
                valueFormatter: p => `-${formatQty(p.value)}`,
            },
            {
                field: "currentQty",
                headerName: "Curr. Qty",
                width: 82,
                minWidth: 74,
                cellStyle: { fontWeight: 600 } as ColDef<OfficeEquipment>["cellStyle"],
                valueFormatter: p => formatQty(p.value),
            },
            {
                field: "unitCost",
                headerName: "Unit Cost",
                width: 95,
                minWidth: 85,
                valueFormatter: p => formatCurrency(p.value),
            },
            {
                field: "condition",
                headerName: "Condition",
                width: 105,
                minWidth: 92,
                cellRenderer: (p: { value?: string }) => {
                    if (!p.value) return "—";
                    const variant =
                        p.value === "Good"
                            ? "secondary"
                            : p.value === "Needs Repair"
                              ? "outline"
                              : "destructive";
                    return <Badge variant={variant}>{p.value}</Badge>;
                },
            },
            {
                headerName: "Actions",
                filter: false,
                sortable: false,
                width: 70,
                minWidth: 66,
                maxWidth: 74,
                headerComponent: () => <div className="w-full text-center">Actions</div>,
                cellRenderer: createActionColumnRenderer(equipmentActions),
                cellStyle: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                } as ColDef<OfficeEquipment>["cellStyle"],
            },
        ],
        [equipmentActions]
    );

    const logColumns = useMemo<ColDef<OfficeEquipmentLog>[]>(
        () => [
            {
                field: "logDate",
                headerName: "Date",
                width: 125,
                valueFormatter: p => formatDateDisplay(p.value),
            },
            {
                field: "equipmentCode",
                headerName: "Code",
                width: 130,
                cellClass: "font-mono text-xs",
            },
            { field: "itemName", headerName: "Equipment Name", flex: 1.3, minWidth: 160 },
            {
                field: "movementType",
                headerName: "Movement Type",
                width: 185,
                cellRenderer: (p: { value?: string }) => {
                    if (!p.value) return "—";
                    return (
                        <Badge
                            variant={p.value === "New Purchase" ? "secondary" : "destructive"}
                        >
                            {p.value}
                        </Badge>
                    );
                },
            },
            {
                field: "qty",
                headerName: "Qty",
                width: 90,
                cellStyle: { fontWeight: 600 } as ColDef<OfficeEquipmentLog>["cellStyle"],
                valueFormatter: p => formatQty(p.value),
            },
            {
                field: "cost",
                headerName: "Cost (₹)",
                width: 120,
                valueFormatter: p => (p.value !== null ? formatCurrency(p.value) : "—"),
            },
            {
                field: "reasonNotes",
                headerName: "Reason / Notes",
                flex: 1.2,
                minWidth: 160,
                valueFormatter: p => p.value || "—",
            },
            {
                field: "approvedBy",
                headerName: "Approved By",
                width: 140,
                valueFormatter: p => p.value || "—",
            },
            {
                headerName: "Actions",
                filter: false,
                sortable: false,
                width: 85,
                headerComponent: () => <div className="w-full text-center">Actions</div>,
                cellRenderer: createActionColumnRenderer(logActions),
                cellStyle: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                } as ColDef<OfficeEquipmentLog>["cellStyle"],
            },
        ],
        [logActions]
    );

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <Button
                    type="button"
                    size="sm"
                    variant={subTab === "register" ? "default" : "outline"}
                    onClick={() => onSubTabChange("register")}
                >
                    Equipment Register ({equipment.length})
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant={subTab === "logs" ? "default" : "outline"}
                    onClick={() => onSubTabChange("logs")}
                >
                    Equipment Movement Log ({logs.length})
                </Button>
            </div>

            <div style={{ "--ag-cell-horizontal-padding": "8px" } as CSSProperties}>
                {subTab === "register" ? (
                    <DataTable
                        data={filteredEquipment}
                        columnDefs={equipmentColumns}
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
                        }}
                    />
                ) : (
                    <DataTable
                        data={filteredLogs}
                        columnDefs={logColumns}
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
                        }}
                    />
                )}
            </div>
        </div>
    );
}
