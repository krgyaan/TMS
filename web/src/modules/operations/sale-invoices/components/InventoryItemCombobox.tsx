import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { ProjectInventoryItem } from "@/modules/operations/sale-invoices/helpers/saleInvoice.types";
import { ChevronDown } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";

interface Props {
    items: ProjectInventoryItem[];
    onSelect: (item: ProjectInventoryItem) => void;
    disabled?: boolean;
    placeholder?: string;
}

export function InventoryItemCombobox({ items, onSelect, disabled, placeholder = "Choose an item to add..." }: Props) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return items;
        return items.filter((i) => i.description.toLowerCase().includes(q) || (i.poNumber || "").toLowerCase().includes(q));
    }, [items, query]);

    useEffect(() => {
        if (open) {
            const id = setTimeout(() => inputRef.current?.focus(), 0);
            return () => clearTimeout(id);
        }
    }, [open]);

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild disabled={disabled}>
                <Button type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between" disabled={disabled}>
                    <span className="truncate text-left">{items.length > 0 ? placeholder : "No items available"}</span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-(--radix-popper-anchor-width) p-0" align="start">
                <div className="border-b p-2">
                    <Input
                        ref={inputRef}
                        autoFocus
                        placeholder="Search by item or PO number..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="h-8"
                    />
                </div>
                <div className="max-h-64 overflow-y-auto py-1">
                    {filtered.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No results</div>}
                    {filtered.map((item) => (
                        <DropdownMenuItem
                            key={item.id}
                            className="items-start whitespace-normal px-3 py-2.5"
                            onClick={() => {
                                onSelect(item);
                                setOpen(false);
                                setQuery("");
                            }}
                        >
                            <div className="min-w-0 flex-1">
                                <span className="block text-sm leading-snug break-words [overflow-wrap:anywhere]">
                                    {item.description}
                                </span>
                                <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <Badge variant="outline" className="font-mono text-[10px]">
                                        {item.poNumber}
                                    </Badge>
                                    <span>
                                        Remaining: {item.remainingQty} {item.unit || "NOS"}
                                    </span>
                                </span>
                            </div>
                        </DropdownMenuItem>
                    ))}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default InventoryItemCombobox;