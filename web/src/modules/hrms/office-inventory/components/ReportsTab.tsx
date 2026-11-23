import { useState } from "react";
import { Download } from "lucide-react";
import { ITEM_CATEGORIES, type PeriodReport } from "../types";
import { useMonthlyReport, useWeeklyReport, useWeeklyTasks } from "../useOfficeInventory";
import {
    currentMonthStartIso,
    currentWeekStartIso,
    downloadCsv,
    formatCurrency,
    formatDateDisplay,
    formatQty,
} from "../utils";

function PeriodReportTable({
    report,
    loading,
    title,
}: {
    report: PeriodReport | undefined;
    loading: boolean;
    title: string;
}) {
    if (loading) {
        return <div className="py-10 text-center text-sm text-[#6B7280]">Loading {title}...</div>;
    }
    if (!report) return null;

    return (
        <div className="overflow-x-auto rounded-[10px] border border-[#E5E7EB] bg-white">
            <table className="w-full min-w-[860px] border-collapse text-left">
                <thead>
                    <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA] text-[13px] font-semibold text-[#111827]">
                        <th className="px-4 py-3">Item Code</th>
                        <th className="px-4 py-3">Item Name</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Unit</th>
                        <th className="px-4 py-3 text-right">Qty Purchased</th>
                        <th className="px-4 py-3 text-right">Purchase Amount (₹)</th>
                        <th className="px-4 py-3 text-right">Qty Consumed</th>
                        <th className="px-4 py-3 text-right">Current Stock</th>
                        <th className="px-4 py-3 text-right">Min Level</th>
                        <th className="px-4 py-3">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] text-[13.5px]">
                    {report.rows.length === 0 ? (
                        <tr>
                            <td colSpan={10} className="px-4 py-10 text-center text-[#6B7280]">
                                No items found for this filter.
                            </td>
                        </tr>
                    ) : (
                        <>
                            {report.rows.map(r => (
                                <tr key={r.id} className="hover:bg-[#FAFAFA]">
                                    <td className="px-4 py-3 font-mono text-[13px] font-medium">
                                        {r.itemCode}
                                    </td>
                                    <td className="px-4 py-3 font-medium">{r.itemName}</td>
                                    <td className="px-4 py-3 text-[#6B7280]">{r.category}</td>
                                    <td className="px-4 py-3">{r.unit}</td>
                                    <td className="px-4 py-3 text-right">
                                        {formatQty(r.qtyPurchased)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {formatCurrency(r.purchaseAmount)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {formatQty(r.qtyConsumed)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold">
                                        {formatQty(r.currentStock)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {formatQty(r.minStockLevel)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                                r.status === "LOW STOCK"
                                                    ? "bg-red-100 text-red-700"
                                                    : "bg-emerald-50 text-emerald-700"
                                            }`}
                                        >
                                            {r.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-[#FAFAFA] font-semibold">
                                <td colSpan={4} className="px-4 py-3">
                                    TOTAL (Filtered)
                                </td>
                                <td className="px-4 py-3 text-right">
                                    {formatQty(report.totals.qtyPurchased)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    {formatCurrency(report.totals.purchaseAmount)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    {formatQty(report.totals.qtyConsumed)}
                                </td>
                                <td colSpan={3} />
                            </tr>
                        </>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export function ReportsTab() {
    const [subTab, setSubTab] = useState<"tasks" | "weekly" | "monthly">("tasks");
    const [weekStart, setWeekStart] = useState(currentWeekStartIso);
    const [weekCategory, setWeekCategory] = useState("All");
    const [monthStart, setMonthStart] = useState(currentMonthStartIso);
    const [monthCategory, setMonthCategory] = useState("All");

    const { data: tasks, isLoading: tasksLoading } = useWeeklyTasks();
    const { data: weekly, isLoading: weeklyLoading } = useWeeklyReport(weekStart, weekCategory);
    const { data: monthly, isLoading: monthlyLoading } = useMonthlyReport(
        monthStart,
        monthCategory
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

    return (
        <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={() => setSubTab("tasks")}
                    className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
                        subTab === "tasks"
                            ? "bg-[#111827] text-white"
                            : "bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
                    }`}
                >
                    Weekly Tasks Dashboard
                </button>
                <button
                    type="button"
                    onClick={() => setSubTab("weekly")}
                    className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
                        subTab === "weekly"
                            ? "bg-[#111827] text-white"
                            : "bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
                    }`}
                >
                    Weekly Consumption Report
                </button>
                <button
                    type="button"
                    onClick={() => setSubTab("monthly")}
                    className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
                        subTab === "monthly"
                            ? "bg-[#111827] text-white"
                            : "bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
                    }`}
                >
                    Monthly Consumption Report
                </button>
            </div>

            {subTab === "tasks" && (
                <div className="space-y-6">
                    {tasksLoading || !tasks ? (
                        <div className="py-10 text-center text-sm text-[#6B7280]">
                            Loading weekly tasks dashboard...
                        </div>
                    ) : (
                        <>
                            <div className="rounded-[10px] border border-[#E5E7EB] bg-[#FAFAFA] px-4 py-3 text-[13px] text-[#374151]">
                                Current Week (Mon–Sun):{" "}
                                <span className="font-semibold text-[#111827]">
                                    {formatDateDisplay(tasks.weekStart)} to{" "}
                                    {formatDateDisplay(tasks.weekEnd)}
                                </span>
                            </div>

                            {/* Due This Week Summary Cards */}
                            <div>
                                <h3 className="mb-2.5 text-[14px] font-semibold text-[#111827]">
                                    Due This Week (including overdue)
                                </h3>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <div className="rounded-[10px] border border-[#E5E7EB] bg-white p-4">
                                        <div className="text-[12.5px] text-[#6B7280]">
                                            Items on LOW STOCK (Reorder)
                                        </div>
                                        <div
                                            className={`mt-1 text-2xl font-bold ${
                                                tasks.dueThisWeek.lowStockCount > 0
                                                    ? "text-red-600"
                                                    : "text-[#111827]"
                                            }`}
                                        >
                                            {tasks.dueThisWeek.lowStockCount}
                                        </div>
                                    </div>
                                    <div className="rounded-[10px] border border-[#E5E7EB] bg-white p-4">
                                        <div className="text-[12.5px] text-[#6B7280]">
                                            Appliance Cleanings Due / Overdue
                                        </div>
                                        <div
                                            className={`mt-1 text-2xl font-bold ${
                                                tasks.dueThisWeek.cleaningsDueCount > 0
                                                    ? "text-amber-600"
                                                    : "text-[#111827]"
                                            }`}
                                        >
                                            {tasks.dueThisWeek.cleaningsDueCount}
                                        </div>
                                    </div>
                                    <div className="rounded-[10px] border border-[#E5E7EB] bg-white p-4">
                                        <div className="text-[12.5px] text-[#6B7280]">
                                            Appliance Service Visits Due
                                        </div>
                                        <div
                                            className={`mt-1 text-2xl font-bold ${
                                                tasks.dueThisWeek.servicesDueCount > 0
                                                    ? "text-amber-600"
                                                    : "text-[#111827]"
                                            }`}
                                        >
                                            {tasks.dueThisWeek.servicesDueCount}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Completed This Week Summary Cards */}
                            <div>
                                <h3 className="mb-2.5 text-[14px] font-semibold text-[#111827]">
                                    Completed This Week (so far)
                                </h3>
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                                    <div className="rounded-[10px] border border-[#E5E7EB] bg-white p-3.5">
                                        <div className="text-[12px] text-[#6B7280]">Purchases</div>
                                        <div className="mt-1 text-xl font-bold text-[#111827]">
                                            {tasks.completedThisWeek.purchasesCount}
                                        </div>
                                        <div className="text-xs text-[#6B7280]">
                                            {formatCurrency(tasks.completedThisWeek.purchasesValue)}
                                        </div>
                                    </div>
                                    <div className="rounded-[10px] border border-[#E5E7EB] bg-white p-3.5">
                                        <div className="text-[12px] text-[#6B7280]">
                                            Consumption Entries
                                        </div>
                                        <div className="mt-1 text-xl font-bold text-[#111827]">
                                            {tasks.completedThisWeek.consumptionsCount}
                                        </div>
                                    </div>
                                    <div className="rounded-[10px] border border-[#E5E7EB] bg-white p-3.5">
                                        <div className="text-[12px] text-[#6B7280]">
                                            Cleanings Done
                                        </div>
                                        <div className="mt-1 text-xl font-bold text-[#111827]">
                                            {tasks.completedThisWeek.cleaningsCount}
                                        </div>
                                    </div>
                                    <div className="rounded-[10px] border border-[#E5E7EB] bg-white p-3.5">
                                        <div className="text-[12px] text-[#6B7280]">
                                            Service Visits
                                        </div>
                                        <div className="mt-1 text-xl font-bold text-[#111827]">
                                            {tasks.completedThisWeek.servicesCount}
                                        </div>
                                        <div className="text-xs text-[#6B7280]">
                                            {formatCurrency(
                                                tasks.completedThisWeek.servicesExpense
                                            )}
                                        </div>
                                    </div>
                                    <div className="rounded-[10px] border border-[#E5E7EB] bg-white p-3.5">
                                        <div className="text-[12px] text-[#6B7280]">
                                            Equipment Purchases
                                        </div>
                                        <div className="mt-1 text-xl font-bold text-[#111827]">
                                            {tasks.completedThisWeek.equipmentPurchasesCount}
                                        </div>
                                    </div>
                                    <div className="rounded-[10px] border border-[#E5E7EB] bg-white p-3.5">
                                        <div className="text-[12px] text-[#6B7280]">
                                            Equipment Discards
                                        </div>
                                        <div className="mt-1 text-xl font-bold text-[#111827]">
                                            {tasks.completedThisWeek.equipmentDiscardsCount}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actionable Due Lists */}
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                {/* Low Stock Reorder List */}
                                <div className="rounded-[10px] border border-[#E5E7EB] bg-white">
                                    <div className="border-b border-[#E5E7EB] bg-[#FAFAFA] px-4 py-3 text-[13px] font-semibold text-[#111827]">
                                        Items to Reorder (LOW STOCK)
                                    </div>
                                    {tasks.dueThisWeek.lowStockItems.length === 0 ? (
                                        <div className="px-4 py-8 text-center text-[13px] text-[#6B7280]">
                                            All items are above minimum stock level.
                                        </div>
                                    ) : (
                                        <table className="w-full text-left text-[13px]">
                                            <thead className="border-b border-[#E5E7EB] text-[#6B7280]">
                                                <tr>
                                                    <th className="px-4 py-2">Code</th>
                                                    <th className="px-4 py-2">Item</th>
                                                    <th className="px-4 py-2 text-right">Current</th>
                                                    <th className="px-4 py-2 text-right">Min</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#E5E7EB]">
                                                {tasks.dueThisWeek.lowStockItems.map(item => (
                                                    <tr key={item.id}>
                                                        <td className="px-4 py-2 font-mono">
                                                            {item.itemCode}
                                                        </td>
                                                        <td className="px-4 py-2 font-medium">
                                                            {item.itemName}
                                                        </td>
                                                        <td className="px-4 py-2 text-right font-semibold text-red-600">
                                                            {formatQty(item.currentStock)}{" "}
                                                            {item.unit}
                                                        </td>
                                                        <td className="px-4 py-2 text-right">
                                                            {formatQty(item.minStockLevel)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>

                                {/* Appliance Cleanings Due */}
                                <div className="rounded-[10px] border border-[#E5E7EB] bg-white">
                                    <div className="border-b border-[#E5E7EB] bg-[#FAFAFA] px-4 py-3 text-[13px] font-semibold text-[#111827]">
                                        Appliance Cleanings Due / Overdue
                                    </div>
                                    {tasks.dueThisWeek.cleaningsDue.length === 0 ? (
                                        <div className="px-4 py-8 text-center text-[13px] text-[#6B7280]">
                                            No appliance cleanings due this week.
                                        </div>
                                    ) : (
                                        <table className="w-full text-left text-[13px]">
                                            <thead className="border-b border-[#E5E7EB] text-[#6B7280]">
                                                <tr>
                                                    <th className="px-4 py-2">Code</th>
                                                    <th className="px-4 py-2">Appliance</th>
                                                    <th className="px-4 py-2">Freq</th>
                                                    <th className="px-4 py-2">Due Date</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#E5E7EB]">
                                                {tasks.dueThisWeek.cleaningsDue.map(c => (
                                                    <tr key={c.id}>
                                                        <td className="px-4 py-2 font-mono">
                                                            {c.applianceCode}
                                                        </td>
                                                        <td className="px-4 py-2 font-medium">
                                                            {c.applianceName}
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            {c.cleaningFrequency}
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <span
                                                                className={`inline-flex rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${
                                                                    c.isOverdue
                                                                        ? "bg-red-100 text-red-700"
                                                                        : "bg-amber-50 text-amber-700"
                                                                }`}
                                                            >
                                                                {formatDateDisplay(c.dueDate)}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>

                            {/* Appliance Service Visits Due */}
                            <div className="rounded-[10px] border border-[#E5E7EB] bg-white">
                                <div className="border-b border-[#E5E7EB] bg-[#FAFAFA] px-4 py-3 text-[13px] font-semibold text-[#111827]">
                                    Appliance Service Visits Due (per latest logged next-due date)
                                </div>
                                {tasks.dueThisWeek.servicesDue.length === 0 ? (
                                    <div className="px-4 py-8 text-center text-[13px] text-[#6B7280]">
                                        No appliance service visits due this week.
                                    </div>
                                ) : (
                                    <table className="w-full text-left text-[13px]">
                                        <thead className="border-b border-[#E5E7EB] text-[#6B7280]">
                                            <tr>
                                                <th className="px-4 py-2">Code</th>
                                                <th className="px-4 py-2">Appliance</th>
                                                <th className="px-4 py-2">Service Freq</th>
                                                <th className="px-4 py-2">Next Service Due</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#E5E7EB]">
                                            {tasks.dueThisWeek.servicesDue.map(s => (
                                                <tr key={s.id}>
                                                    <td className="px-4 py-2 font-mono">
                                                        {s.applianceCode}
                                                    </td>
                                                    <td className="px-4 py-2 font-medium">
                                                        {s.applianceName}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        {s.serviceFrequency}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <span
                                                            className={`inline-flex rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${
                                                                s.isOverdue
                                                                    ? "bg-red-100 text-red-700"
                                                                    : "bg-amber-50 text-amber-700"
                                                            }`}
                                                        >
                                                            {formatDateDisplay(s.nextServiceDue)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {subTab === "weekly" && (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-end justify-between gap-3 rounded-[10px] border border-[#E5E7EB] bg-[#FAFAFA] p-4">
                        <div className="flex flex-wrap items-end gap-4">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-[#374151]">
                                    Week Start Date
                                </label>
                                <input
                                    type="date"
                                    value={weekStart}
                                    onChange={e => setWeekStart(e.target.value)}
                                    className="rounded-md border border-[#D1D5DB] bg-white px-3 py-1.5 text-sm"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-[#374151]">
                                    Period End (Auto)
                                </label>
                                <div className="rounded-md border border-[#E5E7EB] bg-[#F3F4F6] px-3 py-1.5 text-sm text-[#374151]">
                                    {weekly ? formatDateDisplay(weekly.endDate) : "—"}
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-[#374151]">
                                    Category Filter
                                </label>
                                <select
                                    value={weekCategory}
                                    onChange={e => setWeekCategory(e.target.value)}
                                    className="rounded-md border border-[#D1D5DB] bg-white px-3 py-1.5 text-sm"
                                >
                                    <option value="All">All</option>
                                    {ITEM_CATEGORIES.map(c => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => exportReportCsv(weekly, "weekly-report")}
                            className="inline-flex items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-3 py-1.5 text-[13px] font-medium text-[#374151] hover:bg-[#F9FAFB]"
                        >
                            <Download className="h-3.5 w-3.5" />
                            Export Weekly CSV
                        </button>
                    </div>
                    <PeriodReportTable
                        report={weekly}
                        loading={weeklyLoading}
                        title="weekly report"
                    />
                </div>
            )}

            {subTab === "monthly" && (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-end justify-between gap-3 rounded-[10px] border border-[#E5E7EB] bg-[#FAFAFA] p-4">
                        <div className="flex flex-wrap items-end gap-4">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-[#374151]">
                                    Month
                                </label>
                                <input
                                    type="month"
                                    value={monthStart.slice(0, 7)}
                                    onChange={e =>
                                        setMonthStart(e.target.value ? `${e.target.value}-01` : currentMonthStartIso())
                                    }
                                    className="rounded-md border border-[#D1D5DB] bg-white px-3 py-1.5 text-sm"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-[#374151]">
                                    Period Range (Auto)
                                </label>
                                <div className="rounded-md border border-[#E5E7EB] bg-[#F3F4F6] px-3 py-1.5 text-sm text-[#374151]">
                                    {monthly
                                        ? `${formatDateDisplay(monthly.startDate)} – ${formatDateDisplay(monthly.endDate)}`
                                        : "—"}
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-[#374151]">
                                    Category Filter
                                </label>
                                <select
                                    value={monthCategory}
                                    onChange={e => setMonthCategory(e.target.value)}
                                    className="rounded-md border border-[#D1D5DB] bg-white px-3 py-1.5 text-sm"
                                >
                                    <option value="All">All</option>
                                    {ITEM_CATEGORIES.map(c => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => exportReportCsv(monthly, "monthly-report")}
                            className="inline-flex items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-3 py-1.5 text-[13px] font-medium text-[#374151] hover:bg-[#F9FAFB]"
                        >
                            <Download className="h-3.5 w-3.5" />
                            Export Monthly CSV
                        </button>
                    </div>
                    <PeriodReportTable
                        report={monthly}
                        loading={monthlyLoading}
                        title="monthly report"
                    />
                </div>
            )}
        </div>
    );
}
