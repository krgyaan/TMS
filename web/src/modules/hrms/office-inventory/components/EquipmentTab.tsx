import { useMemo } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { OfficeEquipment, OfficeEquipmentLog } from "../types";
import { formatCurrency, formatDateDisplay, formatQty } from "../utils";

interface EquipmentTabProps {
    subTab: "register" | "logs";
    onSubTabChange: (sub: "register" | "logs") => void;
    equipment: OfficeEquipment[];
    logs: OfficeEquipmentLog[];
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

    const conditionBadge = (condition: string) => {
        if (condition === "Good") return "bg-emerald-50 text-emerald-700";
        if (condition === "Needs Repair") return "bg-amber-50 text-amber-700";
        return "bg-red-100 text-red-700";
    };

    const movementBadge = (type: string) => {
        if (type === "New Purchase") return "bg-emerald-50 text-emerald-700";
        return "bg-red-100 text-red-700";
    };

    return (
        <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => onSubTabChange("register")}
                        className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
                            subTab === "register"
                                ? "bg-[#111827] text-white"
                                : "bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
                        }`}
                    >
                        Equipment Register ({equipment.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => onSubTabChange("logs")}
                        className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
                            subTab === "logs"
                                ? "bg-[#111827] text-white"
                                : "bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
                        }`}
                    >
                        Equipment Movement Log ({logs.length})
                    </button>
                </div>
            </div>

            {subTab === "register" ? (
                <div className="overflow-x-auto rounded-[10px] border border-[#E5E7EB] bg-white">
                    <table className="w-full min-w-[960px] border-collapse text-left">
                        <thead>
                            <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA] text-[13px] font-semibold text-[#111827]">
                                <th className="px-4 py-3">Code</th>
                                <th className="px-4 py-3">Category</th>
                                <th className="px-4 py-3">Equipment Name</th>
                                <th className="px-4 py-3">Location</th>
                                <th className="px-4 py-3 text-right">Opening</th>
                                <th className="px-4 py-3 text-right">Added</th>
                                <th className="px-4 py-3 text-right">Discarded</th>
                                <th className="px-4 py-3 text-right">Current Qty</th>
                                <th className="px-4 py-3 text-right">Unit Cost (₹)</th>
                                <th className="px-4 py-3">Condition</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E7EB] text-[13.5px]">
                            {filteredEquipment.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="px-4 py-12 text-center text-[#6B7280]">
                                        No equipment registered yet.
                                    </td>
                                </tr>
                            ) : (
                                filteredEquipment.map(eq => (
                                    <tr key={eq.id} className="hover:bg-[#FAFAFA]">
                                        <td className="px-4 py-3 font-mono text-[13px] font-medium">
                                            {eq.equipmentCode}
                                        </td>
                                        <td className="px-4 py-3 text-[#6B7280]">{eq.category}</td>
                                        <td className="px-4 py-3 font-medium">
                                            {eq.itemName}{" "}
                                            <span className="text-xs font-normal text-[#6B7280]">
                                                ({eq.unit})
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">{eq.location || "—"}</td>
                                        <td className="px-4 py-3 text-right">
                                            {formatQty(eq.openingQty)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-emerald-700">
                                            +{formatQty(eq.qtyAdded)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-red-600">
                                            -{formatQty(eq.qtyDiscarded)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold">
                                            {formatQty(eq.currentQty)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {formatCurrency(eq.unitCost)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${conditionBadge(
                                                    eq.condition
                                                )}`}
                                            >
                                                {eq.condition}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => onEditEquipment(eq)}
                                                className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E7EB] hover:bg-[#F3F4F6]"
                                                title="Edit equipment"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onDeleteEquipment(eq)}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E7EB] text-red-600 hover:bg-red-50"
                                                title="Delete equipment"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-[10px] border border-[#E5E7EB] bg-white">
                    <table className="w-full min-w-[840px] border-collapse text-left">
                        <thead>
                            <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA] text-[13px] font-semibold text-[#111827]">
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Code</th>
                                <th className="px-4 py-3">Equipment Name</th>
                                <th className="px-4 py-3">Movement Type</th>
                                <th className="px-4 py-3 text-right">Qty</th>
                                <th className="px-4 py-3 text-right">Cost (₹)</th>
                                <th className="px-4 py-3">Reason / Notes</th>
                                <th className="px-4 py-3">Approved By</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E7EB] text-[13.5px]">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-12 text-center text-[#6B7280]">
                                        No equipment movements recorded yet.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-[#FAFAFA]">
                                        <td className="whitespace-nowrap px-4 py-3">
                                            {formatDateDisplay(log.logDate)}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-[13px] font-medium">
                                            {log.equipmentCode}
                                        </td>
                                        <td className="px-4 py-3 font-medium">{log.itemName}</td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${movementBadge(
                                                    log.movementType
                                                )}`}
                                            >
                                                {log.movementType}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold">
                                            {formatQty(log.qty)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {log.cost !== null ? formatCurrency(log.cost) : "—"}
                                        </td>
                                        <td className="max-w-[200px] truncate px-4 py-3 text-[#6B7280]">
                                            {log.reasonNotes || "—"}
                                        </td>
                                        <td className="px-4 py-3">{log.approvedBy || "—"}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => onEditLog(log)}
                                                className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E7EB] hover:bg-[#F3F4F6]"
                                                title="Edit movement"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onDeleteLog(log)}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E7EB] text-red-600 hover:bg-red-50"
                                                title="Delete movement"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
