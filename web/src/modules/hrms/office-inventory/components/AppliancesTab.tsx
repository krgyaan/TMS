import { useMemo, type CSSProperties } from "react";
import type { ColDef } from "ag-grid-community";
import DataTable from "@/components/ui/data-table";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
    OfficeAppliance,
    OfficeApplianceCleaning,
    OfficeApplianceService,
} from "../types";
import { formatCurrency, formatDateDisplay } from "../utils";

interface AppliancesTabProps {
    subTab: "register" | "services" | "cleanings";
    onSubTabChange: (sub: "register" | "services" | "cleanings") => void;
    appliances: OfficeAppliance[];
    services: OfficeApplianceService[];
    cleanings: OfficeApplianceCleaning[];
    loading?: boolean;
    search: string;
    onEditAppliance: (row: OfficeAppliance) => void;
    onDeleteAppliance: (row: OfficeAppliance) => void;
    onEditService: (row: OfficeApplianceService) => void;
    onDeleteService: (row: OfficeApplianceService) => void;
    onEditCleaning: (row: OfficeApplianceCleaning) => void;
    onDeleteCleaning: (row: OfficeApplianceCleaning) => void;
}

export function AppliancesTab({
    subTab,
    onSubTabChange,
    appliances,
    services,
    cleanings,
    loading = false,
    search,
    onEditAppliance,
    onDeleteAppliance,
    onEditService,
    onDeleteService,
    onEditCleaning,
    onDeleteCleaning,
}: AppliancesTabProps) {
    const q = search.trim().toLowerCase();

    const filteredAppliances = useMemo(
        () =>
            appliances.filter(a => {
                if (!q) return true;
                return (
                    a.applianceCode.toLowerCase().includes(q) ||
                    a.applianceName.toLowerCase().includes(q) ||
                    (a.brandModel || "").toLowerCase().includes(q) ||
                    (a.location || "").toLowerCase().includes(q) ||
                    a.status.toLowerCase().includes(q)
                );
            }),
        [appliances, q]
    );

    const filteredServices = useMemo(
        () =>
            services.filter(s => {
                if (!q) return true;
                return (
                    s.applianceCode.toLowerCase().includes(q) ||
                    s.applianceName.toLowerCase().includes(q) ||
                    s.visitType.toLowerCase().includes(q) ||
                    (s.vendorTechnician || "").toLowerCase().includes(q) ||
                    (s.notes || "").toLowerCase().includes(q)
                );
            }),
        [services, q]
    );

    const filteredCleanings = useMemo(
        () =>
            cleanings.filter(c => {
                if (!q) return true;
                return (
                    c.applianceCode.toLowerCase().includes(q) ||
                    c.applianceName.toLowerCase().includes(q) ||
                    c.cleaningType.toLowerCase().includes(q) ||
                    (c.doneBy || "").toLowerCase().includes(q) ||
                    (c.notes || "").toLowerCase().includes(q)
                );
            }),
        [cleanings, q]
    );

    const applianceActions = useMemo<ActionItem<OfficeAppliance>[]>(
        () => [
            { label: "Edit", onClick: onEditAppliance },
            { label: "Delete", className: "text-destructive", onClick: onDeleteAppliance },
        ],
        [onEditAppliance, onDeleteAppliance]
    );

    const serviceActions = useMemo<ActionItem<OfficeApplianceService>[]>(
        () => [
            { label: "Edit", onClick: onEditService },
            { label: "Delete", className: "text-destructive", onClick: onDeleteService },
        ],
        [onEditService, onDeleteService]
    );

    const cleaningActions = useMemo<ActionItem<OfficeApplianceCleaning>[]>(
        () => [
            { label: "Edit", onClick: onEditCleaning },
            { label: "Delete", className: "text-destructive", onClick: onDeleteCleaning },
        ],
        [onEditCleaning, onDeleteCleaning]
    );

    const applianceColumns = useMemo<ColDef<OfficeAppliance>[]>(
        () => [
            {
                field: "applianceCode",
                headerName: "Code",
                width: 110,
                cellClass: "font-mono text-xs",
            },
            {
                field: "applianceName",
                headerName: "Appliance",
                flex: 1.5,
                minWidth: 200,
                cellRenderer: (p: { data?: OfficeAppliance }) =>
                    p.data ? (
                        <div className="leading-tight">
                            <div className="font-medium">{p.data.applianceName}</div>
                            <div className="text-xs text-muted-foreground">
                                {[p.data.brandModel, p.data.location].filter(Boolean).join(" · ") ||
                                    "—"}
                            </div>
                        </div>
                    ) : (
                        "—"
                    ),
            },
            {
                field: "status",
                headerName: "Status",
                width: 125,
                cellRenderer: (p: { value?: string }) => {
                    if (!p.value) return "—";
                    const variant =
                        p.value === "In Service"
                            ? "secondary"
                            : p.value === "Under Repair"
                              ? "outline"
                              : "destructive";
                    return <Badge variant={variant}>{p.value}</Badge>;
                },
            },
            { field: "serviceFrequency", headerName: "Service Freq", width: 120 },
            { field: "cleaningFrequency", headerName: "Cleaning Freq", width: 125 },
            {
                field: "serviceVisitsCount",
                headerName: "Services / Expense",
                width: 155,
                cellRenderer: (p: { data?: OfficeAppliance }) =>
                    p.data ? (
                        <div className="leading-tight">
                            <div className="font-medium">
                                {p.data.serviceVisitsCount} visit
                                {p.data.serviceVisitsCount === 1 ? "" : "s"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {formatCurrency(p.data.totalMaintenanceExpense)}
                            </div>
                        </div>
                    ) : (
                        "—"
                    ),
            },
            {
                field: "lastServiceDate",
                headerName: "Last Service",
                width: 125,
                valueFormatter: p => formatDateDisplay(p.value),
            },
            {
                field: "cleaningsCount",
                headerName: "Cleanings / Last",
                width: 145,
                cellRenderer: (p: { data?: OfficeAppliance }) =>
                    p.data ? (
                        <div className="leading-tight">
                            <div className="font-medium">{p.data.cleaningsCount} done</div>
                            <div className="text-xs text-muted-foreground">
                                {p.data.lastCleanedDate
                                    ? formatDateDisplay(p.data.lastCleanedDate)
                                    : "Never"}
                            </div>
                        </div>
                    ) : (
                        "—"
                    ),
            },
            {
                field: "nextCleaningDue",
                headerName: "Next Cleaning Due",
                width: 175,
                cellRenderer: (p: { data?: OfficeAppliance }) => {
                    if (!p.data?.nextCleaningDue) return "—";
                    return (
                        <Badge
                            variant={p.data.isCleaningOverdue ? "destructive" : "outline"}
                        >
                            {formatDateDisplay(p.data.nextCleaningDue)}
                            {p.data.isCleaningOverdue ? " (Overdue)" : ""}
                        </Badge>
                    );
                },
            },
            {
                headerName: "Actions",
                filter: false,
                sortable: false,
                width: 85,
                headerComponent: () => <div className="w-full text-center">Actions</div>,
                cellRenderer: createActionColumnRenderer(applianceActions),
                cellStyle: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                } as ColDef<OfficeAppliance>["cellStyle"],
            },
        ],
        [applianceActions]
    );

    const serviceColumns = useMemo<ColDef<OfficeApplianceService>[]>(
        () => [
            {
                field: "serviceDate",
                headerName: "Date",
                width: 125,
                valueFormatter: p => formatDateDisplay(p.value),
            },
            {
                field: "applianceCode",
                headerName: "Code",
                width: 110,
                cellClass: "font-mono text-xs",
            },
            { field: "applianceName", headerName: "Appliance", flex: 1.2, minWidth: 160 },
            {
                field: "visitType",
                headerName: "Visit Type",
                width: 145,
                cellRenderer: (p: { value?: string }) =>
                    p.value ? <Badge variant="outline">{p.value}</Badge> : "—",
            },
            {
                field: "vendorTechnician",
                headerName: "Vendor / Technician",
                flex: 1,
                minWidth: 150,
                valueFormatter: p => p.value || "—",
            },
            {
                field: "expense",
                headerName: "Expense (₹)",
                width: 130,
                cellStyle: { fontWeight: 600 } as ColDef<OfficeApplianceService>["cellStyle"],
                valueFormatter: p => formatCurrency(p.value),
            },
            {
                field: "nextServiceDue",
                headerName: "Next Service Due",
                width: 145,
                valueFormatter: p => formatDateDisplay(p.value),
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
                cellRenderer: createActionColumnRenderer(serviceActions),
                cellStyle: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                } as ColDef<OfficeApplianceService>["cellStyle"],
            },
        ],
        [serviceActions]
    );

    const cleaningColumns = useMemo<ColDef<OfficeApplianceCleaning>[]>(
        () => [
            {
                field: "cleaningDate",
                headerName: "Date",
                width: 125,
                valueFormatter: p => formatDateDisplay(p.value),
            },
            {
                field: "applianceCode",
                headerName: "Code",
                width: 110,
                cellClass: "font-mono text-xs",
            },
            { field: "applianceName", headerName: "Appliance", flex: 1.2, minWidth: 160 },
            {
                field: "cleaningType",
                headerName: "Cleaning Type",
                width: 155,
                cellRenderer: (p: { value?: string }) =>
                    p.value ? <Badge variant="outline">{p.value}</Badge> : "—",
            },
            {
                field: "doneBy",
                headerName: "Done By",
                width: 150,
                valueFormatter: p => p.value || "—",
            },
            {
                field: "cost",
                headerName: "Cost (₹)",
                width: 120,
                valueFormatter: p => formatCurrency(p.value),
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
                cellRenderer: createActionColumnRenderer(cleaningActions),
                cellStyle: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                } as ColDef<OfficeApplianceCleaning>["cellStyle"],
            },
        ],
        [cleaningActions]
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
                    Appliance Register ({appliances.length})
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant={subTab === "services" ? "default" : "outline"}
                    onClick={() => onSubTabChange("services")}
                >
                    Service / Maintenance Visits ({services.length})
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant={subTab === "cleanings" ? "default" : "outline"}
                    onClick={() => onSubTabChange("cleanings")}
                >
                    Cleaning Log ({cleanings.length})
                </Button>
            </div>

            <div style={{ "--ag-cell-horizontal-padding": "10px" } as CSSProperties}>
                {subTab === "register" && (
                    <DataTable
                        data={filteredAppliances}
                        columnDefs={applianceColumns}
                        loading={loading}
                        pageSize={25}
                        gridOptions={{
                            rowHeight: 54,
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
                {subTab === "services" && (
                    <DataTable
                        data={filteredServices}
                        columnDefs={serviceColumns}
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
                {subTab === "cleanings" && (
                    <DataTable
                        data={filteredCleanings}
                        columnDefs={cleaningColumns}
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
