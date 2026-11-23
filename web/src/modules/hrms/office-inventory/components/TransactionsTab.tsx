import { useMemo } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { OfficeInventoryConsumption, OfficeInventoryPurchase } from "../types";
import { formatCurrency, formatDateDisplay, formatQty } from "../utils";

interface TransactionsTabProps {
    subTab: "purchases" | "consumptions";
    onSubTabChange: (sub: "purchases" | "consumptions") => void;
    purchases: OfficeInventoryPurchase[];
    consumptions: OfficeInventoryConsumption[];
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

    return (
        <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => onSubTabChange("purchases")}
                        className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
                            subTab === "purchases"
                                ? "bg-[#111827] text-white"
                                : "bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
                        }`}
                    >
                        Purchase Log ({purchases.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => onSubTabChange("consumptions")}
                        className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
                            subTab === "consumptions"
                                ? "bg-[#111827] text-white"
                                : "bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
                        }`}
                    >
                        Consumption / Issue Log ({consumptions.length})
                    </button>
                </div>
                {subTab === "purchases" && (
                    <div className="text-[13px] text-[#6B7280]">
                        Total Value:{" "}
                        <span className="font-semibold text-[#111827]">
                            {formatCurrency(totalPurchaseValue)}
                        </span>
                    </div>
                )}
            </div>

            {subTab === "purchases" ? (
                <div className="overflow-x-auto rounded-[10px] border border-[#E5E7EB] bg-white">
                    <table className="w-full min-w-[860px] border-collapse text-left">
                        <thead>
                            <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA] text-[13px] font-semibold text-[#111827]">
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Item Code</th>
                                <th className="px-4 py-3">Item Name</th>
                                <th className="px-4 py-3">Category</th>
                                <th className="px-4 py-3 text-right">Qty</th>
                                <th className="px-4 py-3 text-right">Rate (₹)</th>
                                <th className="px-4 py-3 text-right">Amount (₹)</th>
                                <th className="px-4 py-3">Supplier</th>
                                <th className="px-4 py-3">Notes</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E7EB] text-[13.5px]">
                            {filteredPurchases.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-4 py-12 text-center text-[#6B7280]">
                                        No purchase entries recorded yet.
                                    </td>
                                </tr>
                            ) : (
                                filteredPurchases.map(p => (
                                    <tr key={p.id} className="hover:bg-[#FAFAFA]">
                                        <td className="whitespace-nowrap px-4 py-3">
                                            {formatDateDisplay(p.purchaseDate)}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-[13px] font-medium">
                                            {p.itemCode}
                                        </td>
                                        <td className="px-4 py-3 font-medium">{p.itemName}</td>
                                        <td className="px-4 py-3 text-[#6B7280]">{p.category}</td>
                                        <td className="px-4 py-3 text-right font-medium">
                                            {formatQty(p.qtyPurchased)} {p.unit}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {formatCurrency(p.rate)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold">
                                            {formatCurrency(p.amount)}
                                        </td>
                                        <td className="px-4 py-3">{p.supplier || "—"}</td>
                                        <td className="max-w-[200px] truncate px-4 py-3 text-[#6B7280]">
                                            {p.notes || "—"}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => onEditPurchase(p)}
                                                className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E7EB] hover:bg-[#F3F4F6]"
                                                title="Edit purchase"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onDeletePurchase(p)}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E7EB] text-red-600 hover:bg-red-50"
                                                title="Delete purchase"
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
                    <table className="w-full min-w-[780px] border-collapse text-left">
                        <thead>
                            <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA] text-[13px] font-semibold text-[#111827]">
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Item Code</th>
                                <th className="px-4 py-3">Item Name</th>
                                <th className="px-4 py-3">Category</th>
                                <th className="px-4 py-3 text-right">Qty Issued</th>
                                <th className="px-4 py-3">Issued To / Dept.</th>
                                <th className="px-4 py-3">Notes</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E7EB] text-[13.5px]">
                            {filteredConsumptions.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-[#6B7280]">
                                        No consumption entries recorded yet.
                                    </td>
                                </tr>
                            ) : (
                                filteredConsumptions.map(c => (
                                    <tr key={c.id} className="hover:bg-[#FAFAFA]">
                                        <td className="whitespace-nowrap px-4 py-3">
                                            {formatDateDisplay(c.consumptionDate)}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-[13px] font-medium">
                                            {c.itemCode}
                                        </td>
                                        <td className="px-4 py-3 font-medium">{c.itemName}</td>
                                        <td className="px-4 py-3 text-[#6B7280]">{c.category}</td>
                                        <td className="px-4 py-3 text-right font-semibold">
                                            {formatQty(c.qtyIssued)} {c.unit}
                                        </td>
                                        <td className="px-4 py-3">{c.issuedTo || "—"}</td>
                                        <td className="max-w-[220px] truncate px-4 py-3 text-[#6B7280]">
                                            {c.notes || "—"}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => onEditConsumption(c)}
                                                className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E7EB] hover:bg-[#F3F4F6]"
                                                title="Edit consumption"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onDeleteConsumption(c)}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E7EB] text-red-600 hover:bg-red-50"
                                                title="Delete consumption"
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
