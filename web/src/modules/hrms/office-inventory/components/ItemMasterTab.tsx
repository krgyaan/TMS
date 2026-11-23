import { useMemo, useState } from "react";
import { MoreVertical, Eye, Pencil, ShoppingCart, ArrowDownCircle, Trash2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { OfficeInventoryItem } from "../types";
import { formatQty } from "../utils";

interface ItemMasterTabProps {
    items: OfficeInventoryItem[];
    search: string;
    onView: (item: OfficeInventoryItem) => void;
    onEdit: (item: OfficeInventoryItem) => void;
    onQuickPurchase: (item: OfficeInventoryItem) => void;
    onQuickConsume: (item: OfficeInventoryItem) => void;
    onDelete: (item: OfficeInventoryItem) => void;
}

type CategoryFilter = "All" | "Housekeeping" | "Pantry" | "Stationery" | "LOW";

export function ItemMasterTab({
    items,
    search,
    onView,
    onEdit,
    onQuickPurchase,
    onQuickConsume,
    onDelete,
}: ItemMasterTabProps) {
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All");
    const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

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

    const toggleExpand = (id: number) =>
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));

    const filters: Array<{ key: CategoryFilter; label: string }> = [
        { key: "All", label: `All (${counts.All})` },
        { key: "Housekeeping", label: `Housekeeping (${counts.Housekeeping})` },
        { key: "Pantry", label: `Pantry (${counts.Pantry})` },
        { key: "Stationery", label: `Stationery (${counts.Stationery})` },
        { key: "LOW", label: `Low Stock (${counts.LOW})` },
    ];

    return (
        <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                    {filters.map(f => {
                        const active = categoryFilter === f.key;
                        return (
                            <button
                                key={f.key}
                                type="button"
                                onClick={() => setCategoryFilter(f.key)}
                                className={`rounded-full px-3 py-1 text-[13px] font-medium transition ${
                                    active
                                        ? "bg-[#111827] text-white"
                                        : f.key === "LOW" && counts.LOW > 0
                                          ? "bg-red-50 text-red-700 hover:bg-red-100"
                                          : "bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
                                }`}
                            >
                                {f.label}
                            </button>
                        );
                    })}
                </div>
                <div className="text-[13px] text-[#6B7280]">
                    Showing {filtered.length} of {items.length} items
                </div>
            </div>

            <div className="rounded-[10px] border border-[#E5E7EB] bg-white">
                <div className="overflow-x-auto rounded-[10px]">
                    <table className="w-full min-w-[840px] border-collapse text-left">
                        <thead>
                            <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA] text-[13px] font-semibold text-[#111827]">
                                <th className="w-[14%] px-5 py-3.5">Item Code</th>
                                <th className="w-[22%] px-5 py-3.5">Item Name</th>
                                <th className="w-[40%] px-5 py-3.5">Key Specification</th>
                                <th className="w-[14%] px-5 py-3.5">Current Stock</th>
                                <th className="w-[10%] px-5 py-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E7EB] text-[13.5px] text-[#111827]">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-5 py-12 text-center text-[13.5px] text-[#6B7280]"
                                    >
                                        {items.length === 0
                                            ? 'No inventory items yet. Click "Add Item" to register your first Housekeeping, Pantry, or Stationery item.'
                                            : "No items match the current search or filter."}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(item => {
                                    const expanded = !!expandedRows[item.id];
                                    const isLow = item.status === "LOW STOCK";
                                    const specs = [
                                        { label: "Category", value: item.category },
                                        { label: "Unit", value: item.unit },
                                        { label: "Min Stock", value: formatQty(item.minStockLevel) },
                                        { label: "Opening", value: formatQty(item.openingStock) },
                                        { label: "Purchased", value: formatQty(item.totalPurchased) },
                                        { label: "Consumed", value: formatQty(item.totalConsumed) },
                                    ];
                                    const visibleSpecs = expanded ? specs : specs.slice(0, 3);
                                    const hiddenCount = specs.length - visibleSpecs.length;

                                    return (
                                        <tr
                                            key={item.id}
                                            className="transition-colors hover:bg-[#FAFAFA]"
                                        >
                                            <td className="px-5 py-3.5 font-mono text-[13px] font-medium text-[#111827]">
                                                {item.itemCode}
                                            </td>
                                            <td className="px-5 py-3.5 font-medium text-[#111827]">
                                                {item.itemName}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    {visibleSpecs.map(s => (
                                                        <span
                                                            key={s.label}
                                                            className="inline-flex items-center gap-1 rounded-full border border-[#E5E7EB] bg-[#FAFAFA] px-2.5 py-0.5 text-[12.5px] leading-5"
                                                        >
                                                            <span className="text-[#6B7280]">
                                                                {s.label}:
                                                            </span>
                                                            <span className="font-medium text-[#111827]">
                                                                {s.value}
                                                            </span>
                                                        </span>
                                                    ))}
                                                    {hiddenCount > 0 ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleExpand(item.id)}
                                                            className="inline-flex items-center rounded-full border border-[#E5E7EB] bg-[#F3F4F6] px-2.5 py-0.5 text-[12.5px] font-medium text-[#111827] hover:bg-[#E5E7EB]"
                                                        >
                                                            +{hiddenCount} more
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleExpand(item.id)}
                                                            className="inline-flex items-center rounded-full border border-[#E5E7EB] bg-[#F3F4F6] px-2.5 py-0.5 text-[12.5px] font-medium text-[#6B7280] hover:bg-[#E5E7EB]"
                                                        >
                                                            Show less
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-[#111827]">
                                                        {formatQty(item.currentStock)} {item.unit}
                                                    </span>
                                                    <span
                                                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                                            isLow
                                                                ? "bg-red-100 text-red-700"
                                                                : "bg-emerald-50 text-emerald-700"
                                                        }`}
                                                    >
                                                        {item.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button
                                                            type="button"
                                                            aria-label="Item actions"
                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#111827] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB]"
                                                        >
                                                            <MoreVertical className="h-4 w-4" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-44">
                                                        <DropdownMenuItem onClick={() => onView(item)}>
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => onEdit(item)}>
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            Edit Item
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => onQuickPurchase(item)}
                                                        >
                                                            <ShoppingCart className="mr-2 h-4 w-4" />
                                                            Log Purchase
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => onQuickConsume(item)}
                                                        >
                                                            <ArrowDownCircle className="mr-2 h-4 w-4" />
                                                            Log Consumption
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-red-600 focus:text-red-600"
                                                            onClick={() => onDelete(item)}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
