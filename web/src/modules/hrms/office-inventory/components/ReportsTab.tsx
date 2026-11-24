import { useMemo, useState, type CSSProperties } from "react";
import type { ColDef } from "ag-grid-community";
import { Download } from "lucide-react";
import DataTable from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ITEM_CATEGORIES, type PeriodReport, type PeriodReportRow } from "../types";
import { useMonthlyReport, useWeeklyReport, useWeeklyTasks } from "../useOfficeInventory";
import {
    currentMonthStartIso,
    currentWeekStartIso,
    downloadCsv,
    formatCurrency,
    formatDateDisplay,
    formatQty,
} from "../utils";

function PeriodReportGrid({
    report,
    loading,
}: {
    report: PeriodReport | undefined;
    loading: boolean;
}) {
    const columns = useMemo<ColDef<PeriodReportRow>[]>(
        () => [
            {
                field: "itemCode",
                headerName: "Item Code",
                width: 120,
                cellClass: "font-mono text-xs",
            },
            { field: "itemName", headerName: "Item Name", flex: 1.4, minWidth: 180 },
            {
                field: "category",
                headerName: "Category",
                width: 135,
                cellRenderer: (p: { value?: string }) =>
                    p.value ? <Badge variant="outline">{p.value}</Badge> : "—",
            },
            { field: "unit", headerName: "Unit", width: 95 },
            {
                field: "qtyPurchased",
                headerName: "Qty Purchased",
                width: 130,
                valueFormatter: p => formatQty(p.value),
            },
            {
                field: "purchaseAmount",
                headerName: "Purchase Amount (₹)",
                width: 165,
                valueFormatter: p => formatCurrency(p.value),
            },
            {
                field: "qtyConsumed",
                headerName: "Qty Consumed",
                width: 130,
                valueFormatter: p => formatQty(p.value),
            },
            {
                field: "currentStock",
                headerName: "Current Stock",
                width: 130,
                cellStyle: { fontWeight: 600 } as ColDef<PeriodReportRow>["cellStyle"],
                valueFormatter: p => formatQty(p.value),
            },
            {
                field: "minStockLevel",
                headerName: "Min Level",
                width: 105,
                valueFormatter: p => formatQty(p.value),
            },
            {
                field: "status",
                headerName: "Status",
                width: 130,
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
        ],
        []
    );

    return (
        <div className="space-y-3">
            {report && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-md border bg-muted/40 px-3 py-2">
                        <div className="text-xs text-muted-foreground">
                            Total Qty Purchased (Filtered)
                        </div>
                        <div className="mt-0.5 text-lg font-semibold tabular-nums">
                            {formatQty(report.totals.qtyPurchased)}
                        </div>
                    </div>
                    <div className="rounded-md border bg-muted/40 px-3 py-2">
                        <div className="text-xs text-muted-foreground">
                            Total Purchase Amount (Filtered)
                        </div>
                        <div className="mt-0.5 text-lg font-semibold tabular-nums">
                            {formatCurrency(report.totals.purchaseAmount)}
                        </div>
                    </div>
                    <div className="rounded-md border bg-muted/40 px-3 py-2">
                        <div className="text-xs text-muted-foreground">
                            Total Qty Consumed (Filtered)
                        </div>
                        <div className="mt-0.5 text-lg font-semibold tabular-nums">
                            {formatQty(report.totals.qtyConsumed)}
                        </div>
                    </div>
                </div>
            )}

            <div style={{ "--ag-cell-horizontal-padding": "16px" } as CSSProperties}>
                <DataTable
                    data={report?.rows || []}
                    columnDefs={columns}
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
            </div>
        </div>
    );
}

export function ReportsTab({
    subTab,
    onSubTabChange,
}: {
    subTab: "tasks" | "weekly" | "monthly";
    onSubTabChange: (sub: "tasks" | "weekly" | "monthly") => void;
}) {
    const [weekStart, setWeekStart] = useState(currentWeekStartIso);
    const [weekCategory, setWeekCategory] = useState("All");
    const [monthStart, setMonthStart] = useState(currentMonthStartIso);
    const [monthCategory, setMonthCategory] = useState("All");

    const { data: tasks, isLoading: tasksLoading } = useWeeklyTasks(subTab === "tasks");
    const { data: weekly, isLoading: weeklyLoading } = useWeeklyReport(
        weekStart,
        weekCategory,
        subTab === "weekly"
    );
    const { data: monthly, isLoading: monthlyLoading } = useMonthlyReport(
        monthStart,
        monthCategory,
        subTab === "monthly"
    );

    const exportReportCsv = (report: PeriodReport | undefined, prefix: string) => {
        if (!report) return;
        downloadCsv(
            `${prefix}-${report.startDate}-to-${report.endDate}.csv`,
            [
                "Item Code",
                "Item Name",
                "Category",
                "Unit",
                "Qty Purchased",
                "Purchase Amount (INR)",
                "Qty Consumed",
                "Current Stock",
                "Min Level",
                "Status",
            ],
            report.rows.map(r => [
                r.itemCode,
                r.itemName,
                r.category,
                r.unit,
                r.qtyPurchased,
                r.purchaseAmount,
                r.qtyConsumed,
                r.currentStock,
                r.minStockLevel,
                r.status,
            ])
        );
    };

    const lowStockCols = useMemo<ColDef[]>(
        () => [
            { field: "itemCode", headerName: "Code", width: 110, cellClass: "font-mono text-xs" },
            { field: "itemName", headerName: "Item", flex: 1.4, minWidth: 150 },
            { field: "category", headerName: "Category", width: 130 },
            {
                field: "currentStock",
                headerName: "Current",
                width: 110,
                valueGetter: p =>
                    p.data ? `${formatQty(p.data.currentStock)} ${p.data.unit}` : "",
            },
            {
                field: "minStockLevel",
                headerName: "Min Level",
                width: 105,
                valueFormatter: p => formatQty(p.value),
            },
        ],
        []
    );

    const cleaningDueCols = useMemo<ColDef[]>(
        () => [
            {
                field: "applianceCode",
                headerName: "Code",
                width: 105,
                cellClass: "font-mono text-xs",
            },
            { field: "applianceName", headerName: "Appliance", flex: 1.3, minWidth: 150 },
            { field: "cleaningFrequency", headerName: "Freq", width: 115 },
            {
                field: "lastCleanedDate",
                headerName: "Last Cleaned",
                width: 125,
                valueFormatter: p => (p.value ? formatDateDisplay(p.value) : "Never"),
            },
            {
                field: "dueDate",
                headerName: "Due Date",
                width: 145,
                cellRenderer: (p: { data?: { dueDate: string; isOverdue: boolean } }) =>
                    p.data ? (
                        <Badge variant={p.data.isOverdue ? "destructive" : "outline"}>
                            {formatDateDisplay(p.data.dueDate)}
                        </Badge>
                    ) : (
                        "—"
                    ),
            },
        ],
        []
    );

    const serviceDueCols = useMemo<ColDef[]>(
        () => [
            {
                field: "applianceCode",
                headerName: "Code",
                width: 110,
                cellClass: "font-mono text-xs",
            },
            { field: "applianceName", headerName: "Appliance", flex: 1.4, minWidth: 160 },
            { field: "serviceFrequency", headerName: "Service Freq", width: 135 },
            {
                field: "nextServiceDue",
                headerName: "Next Service Due",
                width: 150,
                cellRenderer: (p: { data?: { nextServiceDue: string; isOverdue: boolean } }) =>
                    p.data ? (
                        <Badge variant={p.data.isOverdue ? "destructive" : "outline"}>
                            {formatDateDisplay(p.data.nextServiceDue)}
                        </Badge>
                    ) : (
                        "—"
                    ),
            },
        ],
        []
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <Button
                    type="button"
                    size="sm"
                    variant={subTab === "tasks" ? "default" : "outline"}
                    onClick={() => onSubTabChange("tasks")}
                >
                    Weekly Tasks Dashboard
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant={subTab === "weekly" ? "default" : "outline"}
                    onClick={() => onSubTabChange("weekly")}
                >
                    Weekly Consumption Report
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant={subTab === "monthly" ? "default" : "outline"}
                    onClick={() => onSubTabChange("monthly")}
                >
                    Monthly Consumption Report
                </Button>
            </div>

            {subTab === "tasks" && (
                <div className="space-y-4">
                    {tasksLoading || !tasks ? (
                        <Skeleton className="h-64 w-full" />
                    ) : (
                        <>
                            <div className="rounded-md border bg-muted/40 px-4 py-2.5 text-sm">
                                Current Week (Mon–Sun):{" "}
                                <strong className="text-foreground">
                                    {formatDateDisplay(tasks.weekStart)} –{" "}
                                    {formatDateDisplay(tasks.weekEnd)}
                                </strong>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div className="rounded-md border bg-muted/40 p-3">
                                    <div className="text-xs text-muted-foreground">
                                        Items on LOW STOCK (Reorder)
                                    </div>
                                    <div className="mt-1 text-2xl font-bold tabular-nums">
                                        {tasks.dueThisWeek.lowStockCount}
                                    </div>
                                </div>
                                <div className="rounded-md border bg-muted/40 p-3">
                                    <div className="text-xs text-muted-foreground">
                                        Appliance Cleanings Due / Overdue
                                    </div>
                                    <div className="mt-1 text-2xl font-bold tabular-nums">
                                        {tasks.dueThisWeek.cleaningsDueCount}
                                    </div>
                                </div>
                                <div className="rounded-md border bg-muted/40 p-3">
                                    <div className="text-xs text-muted-foreground">
                                        Appliance Service Visits Due
                                    </div>
                                    <div className="mt-1 text-2xl font-bold tabular-nums">
                                        {tasks.dueThisWeek.servicesDueCount}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                                <div className="rounded-md border bg-muted/30 p-3">
                                    <div className="text-xs text-muted-foreground">
                                        Purchases This Week
                                    </div>
                                    <div className="mt-1 text-xl font-bold tabular-nums">
                                        {tasks.completedThisWeek.purchasesCount}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {formatCurrency(tasks.completedThisWeek.purchasesValue)}
                                    </div>
                                </div>
                                <div className="rounded-md border bg-muted/30 p-3">
                                    <div className="text-xs text-muted-foreground">
                                        Consumption Entries
                                    </div>
                                    <div className="mt-1 text-xl font-bold tabular-nums">
                                        {tasks.completedThisWeek.consumptionsCount}
                                    </div>
                                </div>
                                <div className="rounded-md border bg-muted/30 p-3">
                                    <div className="text-xs text-muted-foreground">
                                        Cleanings Done
                                    </div>
                                    <div className="mt-1 text-xl font-bold tabular-nums">
                                        {tasks.completedThisWeek.cleaningsCount}
                                    </div>
                                </div>
                                <div className="rounded-md border bg-muted/30 p-3">
                                    <div className="text-xs text-muted-foreground">
                                        Service Visits
                                    </div>
                                    <div className="mt-1 text-xl font-bold tabular-nums">
                                        {tasks.completedThisWeek.servicesCount}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {formatCurrency(tasks.completedThisWeek.servicesExpense)}
                                    </div>
                                </div>
                                <div className="rounded-md border bg-muted/30 p-3">
                                    <div className="text-xs text-muted-foreground">
                                        Equipment Purchases
                                    </div>
                                    <div className="mt-1 text-xl font-bold tabular-nums">
                                        {tasks.completedThisWeek.equipmentPurchasesCount}
                                    </div>
                                </div>
                                <div className="rounded-md border bg-muted/30 p-3">
                                    <div className="text-xs text-muted-foreground">
                                        Equipment Discards
                                    </div>
                                    <div className="mt-1 text-xl font-bold tabular-nums">
                                        {tasks.completedThisWeek.equipmentDiscardsCount}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">
                                            Items to Reorder (LOW STOCK)
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <DataTable
                                            data={tasks.dueThisWeek.lowStockItems}
                                            columnDefs={lowStockCols}
                                            pageSize={10}
                                            gridOptions={{ rowHeight: 44, headerHeight: 40 }}
                                        />
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">
                                            Appliance Cleanings Due / Overdue
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <DataTable
                                            data={tasks.dueThisWeek.cleaningsDue}
                                            columnDefs={cleaningDueCols}
                                            pageSize={10}
                                            gridOptions={{ rowHeight: 44, headerHeight: 40 }}
                                        />
                                    </CardContent>
                                </Card>
                            </div>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm">
                                        Appliance Service Visits Due
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <DataTable
                                        data={tasks.dueThisWeek.servicesDue}
                                        columnDefs={serviceDueCols}
                                        pageSize={10}
                                        gridOptions={{ rowHeight: 44, headerHeight: 40 }}
                                    />
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            )}

            {subTab === "weekly" && (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-end justify-between gap-3 rounded-md border bg-muted/30 p-3">
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">Week Start Date</Label>
                                <Input
                                    type="date"
                                    value={weekStart}
                                    onChange={e => setWeekStart(e.target.value)}
                                    className="w-44"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Period End (Auto)</Label>
                                <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm">
                                    {weekly ? formatDateDisplay(weekly.endDate) : "—"}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Category Filter</Label>
                                <Select value={weekCategory} onValueChange={setWeekCategory}>
                                    <SelectTrigger className="w-44">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="All">All</SelectItem>
                                        {ITEM_CATEGORIES.map(c => (
                                            <SelectItem key={c} value={c}>
                                                {c}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => exportReportCsv(weekly, "weekly-report")}
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Export Weekly CSV
                        </Button>
                    </div>
                    <PeriodReportGrid report={weekly} loading={weeklyLoading} />
                </div>
            )}

            {subTab === "monthly" && (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-end justify-between gap-3 rounded-md border bg-muted/30 p-3">
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">Month</Label>
                                <Input
                                    type="month"
                                    value={monthStart.slice(0, 7)}
                                    onChange={e =>
                                        setMonthStart(
                                            e.target.value
                                                ? `${e.target.value}-01`
                                                : currentMonthStartIso()
                                        )
                                    }
                                    className="w-44"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Period Range (Auto)</Label>
                                <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm">
                                    {monthly
                                        ? `${formatDateDisplay(monthly.startDate)} – ${formatDateDisplay(monthly.endDate)}`
                                        : "—"}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Category Filter</Label>
                                <Select value={monthCategory} onValueChange={setMonthCategory}>
                                    <SelectTrigger className="w-44">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="All">All</SelectItem>
                                        {ITEM_CATEGORIES.map(c => (
                                            <SelectItem key={c} value={c}>
                                                {c}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => exportReportCsv(monthly, "monthly-report")}
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Export Monthly CSV
                        </Button>
                    </div>
                    <PeriodReportGrid report={monthly} loading={monthlyLoading} />
                </div>
            )}
        </div>
    );
}
