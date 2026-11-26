import { useMemo, useState, type CSSProperties } from "react";
import { useSearchParams } from "react-router-dom";
import type { ColDef } from "ag-grid-community";
import { Download, Plus, Search } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { currencyCol, dateOnlyCol } from "@/components/data-grid/columns";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import {
    useOfficeApplianceCleanings,
    useOfficeAppliances,
    useOfficeApplianceServices,
    useOfficeConsumptions,
    useOfficeEquipment,
    useOfficeEquipmentLogs,
    useOfficeInventoryMutations,
    useOfficeItems,
    useOfficePurchases,
} from "./useOfficeInventory";
import { ReportsTab } from "./components/ReportsTab";
import { OfficeInventoryModals, type ModalState } from "./components/OfficeInventoryModals";
import type {
    OfficeAppliance,
    OfficeApplianceCleaning,
    OfficeApplianceService,
    OfficeEquipment,
    OfficeEquipmentLog,
    OfficeInventoryConsumption,
    OfficeInventoryItem,
    OfficeInventoryPurchase,
} from "./types";
import { downloadCsv, formatQty } from "./utils";

type InventoryTab =
    | "item-master"
    | "purchases"
    | "consumptions"
    | "equipment"
    | "equipment-logs"
    | "appliances"
    | "appliance-services"
    | "appliance-cleanings"
    | "reports";

type CategoryFilter = "All" | "Housekeeping" | "Pantry" | "Stationery" | "LOW";

const TABS_CONFIG: Array<{ key: InventoryTab; label: string }> = [
    { key: "item-master", label: "Item Master" },
    { key: "purchases", label: "Purchases" },
    { key: "consumptions", label: "Consumption" },
    { key: "equipment", label: "Equipment" },
    { key: "equipment-logs", label: "Equipment Log" },
    { key: "appliances", label: "Pantry Appliances" },
    { key: "appliance-services", label: "Service Visits" },
    { key: "appliance-cleanings", label: "Cleaning Log" },
    { key: "reports", label: "Tasks & Reports" },
];

export default function OfficeInventoryPage() {
    const {
        activeTab: persistedTab,
        setActiveTab: setPersistedTab,
        search,
        setSearch,
        debouncedSearch,
    } = usePersistentTableState({
        storageKey: "hrms-office-inventory",
        defaultTab: "item-master" as InventoryTab,
    });

    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = (
        TABS_CONFIG.some(t => t.key === persistedTab) ? persistedTab : "item-master"
    ) as InventoryTab;

    const rawReportSub = searchParams.get("report");
    const reportSubTab: "tasks" | "weekly" | "monthly" =
        rawReportSub === "weekly" || rawReportSub === "monthly" ? rawReportSub : "tasks";

    const setReportSubTab = (next: "tasks" | "weekly" | "monthly") => {
        setSearchParams(
            prev => {
                const copy = new URLSearchParams(prev);
                copy.set("report", next);
                return copy;
            },
            { replace: true }
        );
    };

    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All");
    const [modal, setModal] = useState<ModalState>({ type: "closed" });

    // Only fetch queries needed for the active tab or open modal
    const needItems =
        activeTab === "item-master" ||
        modal.type === "purchase" ||
        modal.type === "consumption";
    const needPurchases = activeTab === "purchases";
    const needConsumptions = activeTab === "consumptions";
    const needEquipment = activeTab === "equipment" || modal.type === "equipment-log";
    const needEqLogs = activeTab === "equipment-logs";
    const needAppliances =
        activeTab === "appliances" ||
        modal.type === "appliance-service" ||
        modal.type === "appliance-cleaning";
    const needServices = activeTab === "appliance-services";
    const needCleanings = activeTab === "appliance-cleanings";

    const { data: items = [], isLoading: itemsLoading, error: itemsError } =
        useOfficeItems(needItems);
    const { data: purchases = [], isLoading: purchasesLoading, error: purchasesError } =
        useOfficePurchases(needPurchases);
    const { data: consumptions = [], isLoading: consumptionsLoading, error: consumptionsError } =
        useOfficeConsumptions(needConsumptions);
    const { data: equipment = [], isLoading: equipmentLoading, error: equipmentError } =
        useOfficeEquipment(needEquipment);
    const { data: equipmentLogs = [], isLoading: eqLogsLoading, error: eqLogsError } =
        useOfficeEquipmentLogs(needEqLogs);
    const { data: appliances = [], isLoading: appliancesLoading, error: appliancesError } =
        useOfficeAppliances(needAppliances);
    const { data: applianceServices = [], isLoading: servicesLoading, error: servicesError } =
        useOfficeApplianceServices(needServices);
    const { data: applianceCleanings = [], isLoading: cleaningsLoading, error: cleaningsError } =
        useOfficeApplianceCleanings(needCleanings);

    const mutations = useOfficeInventoryMutations();

    const q = debouncedSearch.trim().toLowerCase();

    // Filtered datasets per tab
    const itemCounts = useMemo(
        () => ({
            All: items.length,
            Housekeeping: items.filter(i => i.category === "Housekeeping").length,
            Pantry: items.filter(i => i.category === "Pantry").length,
            Stationery: items.filter(i => i.category === "Stationery").length,
            LOW: items.filter(i => i.status === "LOW STOCK").length,
        }),
        [items]
    );

    const filteredItems = useMemo(
        () =>
            items.filter(item => {
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
            }),
        [items, categoryFilter, q]
    );

    const filteredPurchases = useMemo(
        () =>
            purchases.filter(
                p =>
                    !q ||
                    p.itemCode.toLowerCase().includes(q) ||
                    p.itemName.toLowerCase().includes(q) ||
                    p.category.toLowerCase().includes(q) ||
                    (p.supplier || "").toLowerCase().includes(q) ||
                    (p.notes || "").toLowerCase().includes(q)
            ),
        [purchases, q]
    );

    const filteredConsumptions = useMemo(
        () =>
            consumptions.filter(
                c =>
                    !q ||
                    c.itemCode.toLowerCase().includes(q) ||
                    c.itemName.toLowerCase().includes(q) ||
                    c.category.toLowerCase().includes(q) ||
                    (c.issuedTo || "").toLowerCase().includes(q) ||
                    (c.notes || "").toLowerCase().includes(q)
            ),
        [consumptions, q]
    );

    const filteredEquipment = useMemo(
        () =>
            equipment.filter(
                e =>
                    !q ||
                    e.equipmentCode.toLowerCase().includes(q) ||
                    e.itemName.toLowerCase().includes(q) ||
                    e.category.toLowerCase().includes(q) ||
                    (e.location || "").toLowerCase().includes(q) ||
                    e.condition.toLowerCase().includes(q)
            ),
        [equipment, q]
    );

    const filteredEqLogs = useMemo(
        () =>
            equipmentLogs.filter(
                l =>
                    !q ||
                    l.equipmentCode.toLowerCase().includes(q) ||
                    l.itemName.toLowerCase().includes(q) ||
                    l.movementType.toLowerCase().includes(q) ||
                    (l.approvedBy || "").toLowerCase().includes(q) ||
                    (l.reasonNotes || "").toLowerCase().includes(q)
            ),
        [equipmentLogs, q]
    );

    const filteredAppliances = useMemo(
        () =>
            appliances.filter(
                a =>
                    !q ||
                    a.applianceCode.toLowerCase().includes(q) ||
                    a.applianceName.toLowerCase().includes(q) ||
                    (a.brandModel || "").toLowerCase().includes(q) ||
                    (a.location || "").toLowerCase().includes(q) ||
                    a.status.toLowerCase().includes(q)
            ),
        [appliances, q]
    );

    const filteredServices = useMemo(
        () =>
            applianceServices.filter(
                s =>
                    !q ||
                    s.applianceCode.toLowerCase().includes(q) ||
                    s.applianceName.toLowerCase().includes(q) ||
                    s.visitType.toLowerCase().includes(q) ||
                    (s.vendorTechnician || "").toLowerCase().includes(q) ||
                    (s.notes || "").toLowerCase().includes(q)
            ),
        [applianceServices, q]
    );

    const filteredCleanings = useMemo(
        () =>
            applianceCleanings.filter(
                c =>
                    !q ||
                    c.applianceCode.toLowerCase().includes(q) ||
                    c.applianceName.toLowerCase().includes(q) ||
                    c.cleaningType.toLowerCase().includes(q) ||
                    (c.doneBy || "").toLowerCase().includes(q) ||
                    (c.notes || "").toLowerCase().includes(q)
            ),
        [applianceCleanings, q]
    );

    // Column definitions using shared dateOnlyCol, currencyCol, formatDate, formatINR
    const itemActions = useMemo<ActionItem<OfficeInventoryItem>[]>(
        () => [
            { label: "Edit Item", onClick: item => setModal({ type: "item", editing: item }) },
            {
                label: "Delete",
                className: "text-destructive",
                onClick: item => {
                    if (window.confirm(`Delete item "${item.itemName}" (${item.itemCode})?`)) {
                        mutations.deleteItem.mutate(item.id);
                    }
                },
            },
        ],
        [mutations.deleteItem]
    );

    const purchaseActions = useMemo<ActionItem<OfficeInventoryPurchase>[]>(
        () => [
            { label: "Edit", onClick: row => setModal({ type: "purchase", editing: row }) },
            {
                label: "Delete",
                className: "text-destructive",
                onClick: row => {
                    if (
                        window.confirm(
                            `Delete purchase entry for ${row.itemCode} (${row.qtyPurchased} ${row.unit})?`
                        )
                    ) {
                        mutations.deletePurchase.mutate(row.id);
                    }
                },
            },
        ],
        [mutations.deletePurchase]
    );

    const consumptionActions = useMemo<ActionItem<OfficeInventoryConsumption>[]>(
        () => [
            { label: "Edit", onClick: row => setModal({ type: "consumption", editing: row }) },
            {
                label: "Delete",
                className: "text-destructive",
                onClick: row => {
                    if (
                        window.confirm(
                            `Delete consumption entry for ${row.itemCode} (${row.qtyIssued} ${row.unit})?`
                        )
                    ) {
                        mutations.deleteConsumption.mutate(row.id);
                    }
                },
            },
        ],
        [mutations.deleteConsumption]
    );

    const equipmentActions = useMemo<ActionItem<OfficeEquipment>[]>(
        () => [
            { label: "Edit", onClick: row => setModal({ type: "equipment", editing: row }) },
            {
                label: "Delete",
                className: "text-destructive",
                onClick: row => {
                    if (
                        window.confirm(
                            `Delete equipment "${row.itemName}" (${row.equipmentCode})?`
                        )
                    ) {
                        mutations.deleteEquipment.mutate(row.id);
                    }
                },
            },
        ],
        [mutations.deleteEquipment]
    );

    const eqLogActions = useMemo<ActionItem<OfficeEquipmentLog>[]>(
        () => [
            { label: "Edit", onClick: row => setModal({ type: "equipment-log", editing: row }) },
            {
                label: "Delete",
                className: "text-destructive",
                onClick: row => {
                    if (window.confirm(`Delete equipment movement for ${row.equipmentCode}?`)) {
                        mutations.deleteEquipmentLog.mutate(row.id);
                    }
                },
            },
        ],
        [mutations.deleteEquipmentLog]
    );

    const applianceActions = useMemo<ActionItem<OfficeAppliance>[]>(
        () => [
            { label: "Edit", onClick: row => setModal({ type: "appliance", editing: row }) },
            {
                label: "Delete",
                className: "text-destructive",
                onClick: row => {
                    if (
                        window.confirm(
                            `Delete appliance "${row.applianceName}" (${row.applianceCode})?`
                        )
                    ) {
                        mutations.deleteAppliance.mutate(row.id);
                    }
                },
            },
        ],
        [mutations.deleteAppliance]
    );

    const serviceActions = useMemo<ActionItem<OfficeApplianceService>[]>(
        () => [
            {
                label: "Edit",
                onClick: row => setModal({ type: "appliance-service", editing: row }),
            },
            {
                label: "Delete",
                className: "text-destructive",
                onClick: row => {
                    if (window.confirm(`Delete service visit for ${row.applianceCode}?`)) {
                        mutations.deleteApplianceService.mutate(row.id);
                    }
                },
            },
        ],
        [mutations.deleteApplianceService]
    );

    const cleaningActions = useMemo<ActionItem<OfficeApplianceCleaning>[]>(
        () => [
            {
                label: "Edit",
                onClick: row => setModal({ type: "appliance-cleaning", editing: row }),
            },
            {
                label: "Delete",
                className: "text-destructive",
                onClick: row => {
                    if (window.confirm(`Delete cleaning log for ${row.applianceCode}?`)) {
                        mutations.deleteApplianceCleaning.mutate(row.id);
                    }
                },
            },
        ],
        [mutations.deleteApplianceCleaning]
    );

    const actionCol = <T,>(actions: ActionItem<T>[]): ColDef<T> => ({
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
        } as ColDef<T>["cellStyle"],
    });

    const itemCols = useMemo<ColDef<OfficeInventoryItem>[]>(
        () => [
            { field: "itemCode", headerName: "Code", width: 95, minWidth: 85, cellClass: "font-mono text-xs" },
            {
                field: "itemName",
                headerName: "Item Name",
                flex: 1.5,
                minWidth: 150,
                cellStyle: { fontWeight: 500 } as ColDef<OfficeInventoryItem>["cellStyle"],
            },
            { field: "minStockLevel", headerName: "Min Stock", width: 90, minWidth: 80, valueFormatter: p => formatQty(p.value) },
            { field: "openingStock", headerName: "Opening", width: 85, minWidth: 75, valueFormatter: p => formatQty(p.value) },
            { field: "totalPurchased", headerName: "Purchased", width: 92, minWidth: 82, valueFormatter: p => formatQty(p.value) },
            { field: "totalConsumed", headerName: "Consumed", width: 92, minWidth: 82, valueFormatter: p => formatQty(p.value) },
            {
                field: "currentStock",
                headerName: "Current Stock",
                width: 105,
                minWidth: 95,
                cellStyle: { fontWeight: 600 } as ColDef<OfficeInventoryItem>["cellStyle"],
                valueGetter: p => (p.data ? `${formatQty(p.data.currentStock)} ${p.data.unit}` : ""),
            },
            {
                field: "status",
                headerName: "Status",
                width: 95,
                minWidth: 85,
                cellRenderer: (p: { value?: string }) =>
                    p.value ? (
                        <Badge variant={p.value === "LOW STOCK" ? "destructive" : "secondary"}>
                            {p.value}
                        </Badge>
                    ) : (
                        "—"
                    ),
            },
            actionCol(itemActions),
        ],
        [itemActions]
    );

    const purchaseCols = useMemo<ColDef<OfficeInventoryPurchase>[]>(
        () => [
            dateOnlyCol<OfficeInventoryPurchase>("purchaseDate", { headerName: "Date", width: 115 }),
            { field: "itemCode", headerName: "Code", width: 95, cellClass: "font-mono text-xs" },
            { field: "itemName", headerName: "Item Name", flex: 1.3, minWidth: 150 },
            {
                field: "category",
                headerName: "Category",
                width: 115,
                cellRenderer: (p: { value?: string }) =>
                    p.value ? <Badge variant="outline">{p.value}</Badge> : "—",
            },
            {
                field: "qtyPurchased",
                headerName: "Qty",
                width: 95,
                valueGetter: p => (p.data ? `${formatQty(p.data.qtyPurchased)} ${p.data.unit}` : ""),
            },
            currencyCol<OfficeInventoryPurchase>("rate", { headerName: "Rate", width: 105 }),
            currencyCol<OfficeInventoryPurchase>("amount", {
                headerName: "Amount",
                width: 115,
                cellStyle: { fontWeight: 600 } as ColDef<OfficeInventoryPurchase>["cellStyle"],
            }),
            { field: "supplier", headerName: "Supplier", flex: 1, minWidth: 120, valueFormatter: p => p.value || "—" },
            { field: "notes", headerName: "Notes", flex: 1, minWidth: 110, valueFormatter: p => p.value || "—" },
            actionCol(purchaseActions),
        ],
        [purchaseActions]
    );

    const consumptionCols = useMemo<ColDef<OfficeInventoryConsumption>[]>(
        () => [
            dateOnlyCol<OfficeInventoryConsumption>("consumptionDate", { headerName: "Date", width: 115 }),
            { field: "itemCode", headerName: "Code", width: 95, cellClass: "font-mono text-xs" },
            { field: "itemName", headerName: "Item Name", flex: 1.3, minWidth: 150 },
            {
                field: "category",
                headerName: "Category",
                width: 120,
                cellRenderer: (p: { value?: string }) =>
                    p.value ? <Badge variant="outline">{p.value}</Badge> : "—",
            },
            {
                field: "qtyIssued",
                headerName: "Qty Issued",
                width: 115,
                cellStyle: { fontWeight: 600 } as ColDef<OfficeInventoryConsumption>["cellStyle"],
                valueGetter: p => (p.data ? `${formatQty(p.data.qtyIssued)} ${p.data.unit}` : ""),
            },
            { field: "issuedTo", headerName: "Issued To / Dept.", flex: 1, minWidth: 130, valueFormatter: p => p.value || "—" },
            { field: "notes", headerName: "Notes", flex: 1.2, minWidth: 130, valueFormatter: p => p.value || "—" },
            actionCol(consumptionActions),
        ],
        [consumptionActions]
    );

    const equipmentCols = useMemo<ColDef<OfficeEquipment>[]>(
        () => [
            { field: "equipmentCode", headerName: "Code", width: 96, minWidth: 88, cellClass: "font-mono text-xs" },
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
            { field: "location", headerName: "Location", flex: 0.9, minWidth: 95, valueFormatter: p => p.value || "—" },
            { field: "openingQty", headerName: "Open", width: 68, minWidth: 62, valueFormatter: p => formatQty(p.value) },
            { field: "qtyAdded", headerName: "Added", width: 72, minWidth: 64, valueFormatter: p => `+${formatQty(p.value)}` },
            { field: "qtyDiscarded", headerName: "Disc.", width: 68, minWidth: 62, valueFormatter: p => `-${formatQty(p.value)}` },
            {
                field: "currentQty",
                headerName: "Curr. Qty",
                width: 82,
                minWidth: 74,
                cellStyle: { fontWeight: 600 } as ColDef<OfficeEquipment>["cellStyle"],
                valueFormatter: p => formatQty(p.value),
            },
            currencyCol<OfficeEquipment>("unitCost", { headerName: "Unit Cost", width: 95, minWidth: 85 }),
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
            actionCol(equipmentActions),
        ],
        [equipmentActions]
    );

    const eqLogCols = useMemo<ColDef<OfficeEquipmentLog>[]>(
        () => [
            dateOnlyCol<OfficeEquipmentLog>("logDate", { headerName: "Date", width: 115 }),
            { field: "equipmentCode", headerName: "Code", width: 105, cellClass: "font-mono text-xs" },
            { field: "itemName", headerName: "Equipment", flex: 1.3, minWidth: 140 },
            {
                field: "movementType",
                headerName: "Movement Type",
                width: 170,
                cellRenderer: (p: { value?: string }) =>
                    p.value ? (
                        <Badge variant={p.value === "New Purchase" ? "secondary" : "destructive"}>
                            {p.value}
                        </Badge>
                    ) : (
                        "—"
                    ),
            },
            {
                field: "qty",
                headerName: "Qty",
                width: 75,
                cellStyle: { fontWeight: 600 } as ColDef<OfficeEquipmentLog>["cellStyle"],
                valueFormatter: p => formatQty(p.value),
            },
            currencyCol<OfficeEquipmentLog>("cost", { headerName: "Cost", width: 105 }),
            { field: "reasonNotes", headerName: "Reason / Notes", flex: 1.2, minWidth: 140, valueFormatter: p => p.value || "—" },
            { field: "approvedBy", headerName: "Approved By", width: 120, valueFormatter: p => p.value || "—" },
            actionCol(eqLogActions),
        ],
        [eqLogActions]
    );

    const applianceCols = useMemo<ColDef<OfficeAppliance>[]>(
        () => [
            { field: "applianceCode", headerName: "Code", width: 92, cellClass: "font-mono text-xs" },
            {
                field: "applianceName",
                headerName: "Appliance",
                flex: 1.5,
                minWidth: 180,
                cellRenderer: (p: { data?: OfficeAppliance }) =>
                    p.data ? (
                        <div className="leading-tight">
                            <div className="font-medium">{p.data.applianceName}</div>
                            <div className="text-xs text-muted-foreground">
                                {[p.data.brandModel, p.data.location].filter(Boolean).join(" · ") || "—"}
                            </div>
                        </div>
                    ) : (
                        "—"
                    ),
            },
            {
                field: "status",
                headerName: "Status",
                width: 110,
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
            { field: "serviceFrequency", headerName: "Service Freq", width: 105 },
            { field: "cleaningFrequency", headerName: "Clean Freq", width: 105 },
            {
                field: "serviceVisitsCount",
                headerName: "Services / Expense",
                width: 140,
                cellRenderer: (p: { data?: OfficeAppliance }) =>
                    p.data ? (
                        <div className="leading-tight">
                            <div className="font-medium">
                                {p.data.serviceVisitsCount} visit{p.data.serviceVisitsCount === 1 ? "" : "s"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {formatINR(p.data.totalMaintenanceExpense)}
                            </div>
                        </div>
                    ) : (
                        "—"
                    ),
            },
            dateOnlyCol<OfficeAppliance>("lastServiceDate", { headerName: "Last Service", width: 115 }),
            {
                field: "cleaningsCount",
                headerName: "Cleanings / Last",
                width: 130,
                cellRenderer: (p: { data?: OfficeAppliance }) =>
                    p.data ? (
                        <div className="leading-tight">
                            <div className="font-medium">{p.data.cleaningsCount} done</div>
                            <div className="text-xs text-muted-foreground">
                                {p.data.lastCleanedDate ? formatDate(p.data.lastCleanedDate) : "Never"}
                            </div>
                        </div>
                    ) : (
                        "—"
                    ),
            },
            {
                field: "nextCleaningDue",
                headerName: "Next Cleaning Due",
                width: 165,
                cellRenderer: (p: { data?: OfficeAppliance }) => {
                    if (!p.data?.nextCleaningDue) return "—";
                    return (
                        <Badge variant={p.data.isCleaningOverdue ? "destructive" : "outline"}>
                            {formatDate(p.data.nextCleaningDue)}
                            {p.data.isCleaningOverdue ? " (Overdue)" : ""}
                        </Badge>
                    );
                },
            },
            actionCol(applianceActions),
        ],
        [applianceActions]
    );

    const serviceCols = useMemo<ColDef<OfficeApplianceService>[]>(
        () => [
            dateOnlyCol<OfficeApplianceService>("serviceDate", { headerName: "Date", width: 115 }),
            { field: "applianceCode", headerName: "Code", width: 95, cellClass: "font-mono text-xs" },
            { field: "applianceName", headerName: "Appliance", flex: 1.2, minWidth: 150 },
            {
                field: "visitType",
                headerName: "Visit Type",
                width: 135,
                cellRenderer: (p: { value?: string }) =>
                    p.value ? <Badge variant="outline">{p.value}</Badge> : "—",
            },
            { field: "vendorTechnician", headerName: "Vendor / Technician", flex: 1, minWidth: 140, valueFormatter: p => p.value || "—" },
            currencyCol<OfficeApplianceService>("expense", {
                headerName: "Expense",
                width: 115,
                cellStyle: { fontWeight: 600 } as ColDef<OfficeApplianceService>["cellStyle"],
            }),
            dateOnlyCol<OfficeApplianceService>("nextServiceDue", { headerName: "Next Service Due", width: 130 }),
            { field: "notes", headerName: "Notes", flex: 1, minWidth: 130, valueFormatter: p => p.value || "—" },
            actionCol(serviceActions),
        ],
        [serviceActions]
    );

    const cleaningCols = useMemo<ColDef<OfficeApplianceCleaning>[]>(
        () => [
            dateOnlyCol<OfficeApplianceCleaning>("cleaningDate", { headerName: "Date", width: 115 }),
            { field: "applianceCode", headerName: "Code", width: 95, cellClass: "font-mono text-xs" },
            { field: "applianceName", headerName: "Appliance", flex: 1.2, minWidth: 150 },
            {
                field: "cleaningType",
                headerName: "Cleaning Type",
                width: 145,
                cellRenderer: (p: { value?: string }) =>
                    p.value ? <Badge variant="outline">{p.value}</Badge> : "—",
            },
            { field: "doneBy", headerName: "Done By", width: 135, valueFormatter: p => p.value || "—" },
            currencyCol<OfficeApplianceCleaning>("cost", { headerName: "Cost", width: 105 }),
            { field: "notes", headerName: "Notes", flex: 1.2, minWidth: 140, valueFormatter: p => p.value || "—" },
            actionCol(cleaningActions),
        ],
        [cleaningActions]
    );

    const primaryAction = useMemo(() => {
        const map: Partial<Record<InventoryTab, { label: string; onClick: () => void }>> = {
            "item-master": { label: "Add New Item", onClick: () => setModal({ type: "item" }) },
            purchases: { label: "Log Purchase", onClick: () => setModal({ type: "purchase" }) },
            consumptions: {
                label: "Log Consumption",
                onClick: () => setModal({ type: "consumption" }),
            },
            equipment: { label: "Add Equipment", onClick: () => setModal({ type: "equipment" }) },
            "equipment-logs": {
                label: "Log Movement",
                onClick: () => setModal({ type: "equipment-log" }),
            },
            appliances: { label: "Add Appliance", onClick: () => setModal({ type: "appliance" }) },
            "appliance-services": {
                label: "Log Service Visit",
                onClick: () => setModal({ type: "appliance-service" }),
            },
            "appliance-cleanings": {
                label: "Log Cleaning",
                onClick: () => setModal({ type: "appliance-cleaning" }),
            },
        };
        return map[activeTab] ?? null;
    }, [activeTab]);

    const activeError =
        (activeTab === "item-master" && itemsError) ||
        (activeTab === "purchases" && purchasesError) ||
        (activeTab === "consumptions" && consumptionsError) ||
        (activeTab === "equipment" && equipmentError) ||
        (activeTab === "equipment-logs" && eqLogsError) ||
        (activeTab === "appliances" && appliancesError) ||
        (activeTab === "appliance-services" && servicesError) ||
        (activeTab === "appliance-cleanings" && cleaningsError) ||
        null;

    const handleExportCsv = () => {
        if (activeTab === "item-master") {
            downloadCsv(
                "office-inventory-item-master.csv",
                ["Category", "Item Code", "Item Name", "Unit", "Min Stock", "Opening", "Purchased", "Consumed", "Current Stock", "Status"],
                filteredItems.map(i => [i.category, i.itemCode, i.itemName, i.unit, i.minStockLevel, i.openingStock, i.totalPurchased, i.totalConsumed, i.currentStock, i.status])
            );
        } else if (activeTab === "purchases") {
            downloadCsv(
                "office-inventory-purchases.csv",
                ["Date", "Item Code", "Item Name", "Category", "Qty", "Rate", "Amount", "Supplier", "Notes"],
                filteredPurchases.map(p => [p.purchaseDate, p.itemCode, p.itemName, p.category, p.qtyPurchased, p.rate, p.amount, p.supplier, p.notes])
            );
        } else if (activeTab === "consumptions") {
            downloadCsv(
                "office-inventory-consumption.csv",
                ["Date", "Item Code", "Item Name", "Category", "Qty Issued", "Issued To", "Notes"],
                filteredConsumptions.map(c => [c.consumptionDate, c.itemCode, c.itemName, c.category, c.qtyIssued, c.issuedTo, c.notes])
            );
        } else if (activeTab === "equipment") {
            downloadCsv(
                "office-equipment-register.csv",
                ["Category", "Code", "Name", "Unit", "Location", "Opening", "Added", "Discarded", "Current Qty", "Unit Cost", "Condition", "Remarks"],
                filteredEquipment.map(e => [e.category, e.equipmentCode, e.itemName, e.unit, e.location, e.openingQty, e.qtyAdded, e.qtyDiscarded, e.currentQty, e.unitCost, e.condition, e.remarks])
            );
        } else if (activeTab === "equipment-logs") {
            downloadCsv(
                "office-equipment-log.csv",
                ["Date", "Code", "Name", "Movement Type", "Qty", "Cost", "Reason", "Approved By"],
                filteredEqLogs.map(l => [l.logDate, l.equipmentCode, l.itemName, l.movementType, l.qty, l.cost, l.reasonNotes, l.approvedBy])
            );
        } else if (activeTab === "appliances") {
            downloadCsv(
                "office-pantry-appliances.csv",
                ["Code", "Name", "Brand/Model", "Location", "Status", "Service Freq", "Clean Freq", "Service Visits", "Total Expense", "Last Service", "Cleanings", "Last Cleaned", "Next Cleaning Due"],
                filteredAppliances.map(a => [a.applianceCode, a.applianceName, a.brandModel, a.location, a.status, a.serviceFrequency, a.cleaningFrequency, a.serviceVisitsCount, a.totalMaintenanceExpense, a.lastServiceDate, a.cleaningsCount, a.lastCleanedDate, a.nextCleaningDue])
            );
        } else if (activeTab === "appliance-services") {
            downloadCsv(
                "office-appliance-services.csv",
                ["Date", "Code", "Appliance", "Visit Type", "Vendor", "Expense", "Next Service Due", "Notes"],
                filteredServices.map(s => [s.serviceDate, s.applianceCode, s.applianceName, s.visitType, s.vendorTechnician, s.expense, s.nextServiceDue, s.notes])
            );
        } else if (activeTab === "appliance-cleanings") {
            downloadCsv(
                "office-appliance-cleanings.csv",
                ["Date", "Code", "Appliance", "Cleaning Type", "Done By", "Cost", "Notes"],
                filteredCleanings.map(c => [c.cleaningDate, c.applianceCode, c.applianceName, c.cleaningType, c.doneBy, c.cost, c.notes])
            );
        }
    };

    const gridStyle = { "--ag-cell-horizontal-padding": "8px" } as CSSProperties;
    const baseGridOptions = {
        rowHeight: 44,
        headerHeight: 40,
        defaultColDef: {
            filter: false,
            sortable: true,
            resizable: true,
            cellStyle: { display: "flex", alignItems: "center" },
        },
    };

    const categoryFilters: Array<{ key: CategoryFilter; label: string }> = [
        { key: "All", label: `All (${itemCounts.All})` },
        { key: "Housekeeping", label: `Housekeeping (${itemCounts.Housekeeping})` },
        { key: "Pantry", label: `Pantry (${itemCounts.Pantry})` },
        { key: "Stationery", label: `Stationery (${itemCounts.Stationery})` },
        { key: "LOW", label: `Low Stock (${itemCounts.LOW})` },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Office Inventory Management</CardTitle>
                <CardDescription>
                    Manage Housekeeping, Pantry, and Stationery stock, equipment registers,
                    appliance maintenance, and weekly tasks.
                </CardDescription>
                <CardAction>
                    <div className="flex items-center gap-2">
                        {activeTab !== "reports" && (
                            <Button variant="outline" onClick={handleExportCsv}>
                                <Download className="mr-2 h-4 w-4" />
                                Export CSV
                            </Button>
                        )}
                        {primaryAction && (
                            <Button onClick={primaryAction.onClick}>
                                <Plus className="mr-2 h-4 w-4" />
                                {primaryAction.label}
                            </Button>
                        )}
                    </div>
                </CardAction>
            </CardHeader>

            <CardContent className="space-y-4">
                {activeError && (
                    <Alert variant="destructive">
                        <AlertDescription>
                            Unable to load office inventory data:{" "}
                            {activeError instanceof Error ? activeError.message : "Request failed"}
                        </AlertDescription>
                    </Alert>
                )}

                <Tabs
                    value={activeTab}
                    onValueChange={v => setPersistedTab(v)}
                    className="w-full"
                >
                    <TabsList className="w-full justify-start overflow-x-auto">
                        {TABS_CONFIG.map(tab => (
                            <TabsTrigger
                                key={tab.key}
                                value={tab.key}
                                className="data-[state=active]:shadow-sm"
                            >
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {activeTab !== "reports" && (
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                            {activeTab === "item-master" ? (
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {categoryFilters.map(f => (
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
                            ) : (
                                <div />
                            )}
                            <div className="relative w-full sm:w-72">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    className="pl-9"
                                    placeholder="Search..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <TabsContent value="item-master" className="mt-3 data-[state=inactive]:hidden">
                        {activeTab === "item-master" && (
                            <div style={gridStyle}>
                                <DataTable
                                    data={filteredItems}
                                    columnDefs={itemCols}
                                    loading={itemsLoading}
                                    pageSize={25}
                                    gridOptions={baseGridOptions}
                                />
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="purchases" className="mt-3 data-[state=inactive]:hidden">
                        {activeTab === "purchases" && (
                            <div style={gridStyle}>
                                <DataTable
                                    data={filteredPurchases}
                                    columnDefs={purchaseCols}
                                    loading={purchasesLoading}
                                    pageSize={25}
                                    gridOptions={baseGridOptions}
                                />
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="consumptions" className="mt-3 data-[state=inactive]:hidden">
                        {activeTab === "consumptions" && (
                            <div style={gridStyle}>
                                <DataTable
                                    data={filteredConsumptions}
                                    columnDefs={consumptionCols}
                                    loading={consumptionsLoading}
                                    pageSize={25}
                                    gridOptions={baseGridOptions}
                                />
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="equipment" className="mt-3 data-[state=inactive]:hidden">
                        {activeTab === "equipment" && (
                            <div style={gridStyle}>
                                <DataTable
                                    data={filteredEquipment}
                                    columnDefs={equipmentCols}
                                    loading={equipmentLoading}
                                    pageSize={25}
                                    gridOptions={baseGridOptions}
                                />
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="equipment-logs" className="mt-3 data-[state=inactive]:hidden">
                        {activeTab === "equipment-logs" && (
                            <div style={gridStyle}>
                                <DataTable
                                    data={filteredEqLogs}
                                    columnDefs={eqLogCols}
                                    loading={eqLogsLoading}
                                    pageSize={25}
                                    gridOptions={baseGridOptions}
                                />
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="appliances" className="mt-3 data-[state=inactive]:hidden">
                        {activeTab === "appliances" && (
                            <div style={gridStyle}>
                                <DataTable
                                    data={filteredAppliances}
                                    columnDefs={applianceCols}
                                    loading={appliancesLoading}
                                    pageSize={25}
                                    gridOptions={{ ...baseGridOptions, rowHeight: 52 }}
                                />
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="appliance-services" className="mt-3 data-[state=inactive]:hidden">
                        {activeTab === "appliance-services" && (
                            <div style={gridStyle}>
                                <DataTable
                                    data={filteredServices}
                                    columnDefs={serviceCols}
                                    loading={servicesLoading}
                                    pageSize={25}
                                    gridOptions={baseGridOptions}
                                />
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="appliance-cleanings" className="mt-3 data-[state=inactive]:hidden">
                        {activeTab === "appliance-cleanings" && (
                            <div style={gridStyle}>
                                <DataTable
                                    data={filteredCleanings}
                                    columnDefs={cleaningCols}
                                    loading={cleaningsLoading}
                                    pageSize={25}
                                    gridOptions={baseGridOptions}
                                />
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="reports" className="mt-3 data-[state=inactive]:hidden">
                        {activeTab === "reports" && (
                            <ReportsTab subTab={reportSubTab} onSubTabChange={setReportSubTab} />
                        )}
                    </TabsContent>
                </Tabs>

                <OfficeInventoryModals
                    modal={modal}
                    onClose={() => setModal({ type: "closed" })}
                    items={items}
                    equipment={equipment}
                    appliances={appliances}
                    mutations={mutations}
                />
            </CardContent>
        </Card>
    );
}
