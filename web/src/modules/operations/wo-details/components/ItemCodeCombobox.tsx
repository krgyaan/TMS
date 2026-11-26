import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useInventoryItems } from "@/hooks/api/useInventoryItems";
import { cn } from "@/lib/utils";
import type { InventoryItem } from "@/types/inventory-item.types";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ItemCodeComboboxProps {
    value?: string | null;
    onSelect: (item: InventoryItem | null) => void;
    disabled?: boolean;
}

export function ItemCodeCombobox({ value, onSelect, disabled }: ItemCodeComboboxProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [search, setSearch] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const timer = window.setTimeout(() => setSearch(query.trim()), 300);
        return () => window.clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        if (open) {
            const id = window.setTimeout(() => inputRef.current?.focus(), 0);
            return () => window.clearTimeout(id);
        }
    }, [open]);

    const { data, isLoading, isError } = useInventoryItems("operations", {
        search,
        isActive: "true",
        limit: 50,
    });
    const items = data?.data ?? [];

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild disabled={disabled}>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="h-8 w-full justify-between px-2 text-xs font-normal"
                    disabled={disabled}
                >
                    <span className={cn("truncate text-left", !value && "text-muted-foreground")}>
                        {value || "Select item code"}
                    </span>
                    <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-(--radix-popper-anchor-width) p-0" align="start">
                <div className="border-b p-2">
                    <Input
                        ref={inputRef}
                        autoFocus
                        placeholder="Search by item code or name..."
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={(event) => event.stopPropagation()}
                        className="h-8 text-xs"
                    />
                </div>
                <div className="max-h-64 overflow-y-auto py-1">
                    {value && (
                        <DropdownMenuItem
                            className="text-xs text-muted-foreground"
                            onClick={() => {
                                onSelect(null);
                                setOpen(false);
                                setQuery("");
                            }}
                        >
                            Clear selection
                        </DropdownMenuItem>
                    )}
                    {isLoading && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">Loading items...</div>
                    )}
                    {isError && (
                        <div className="px-3 py-2 text-xs text-destructive">
                            Unable to load item master. Check item master access permissions.
                        </div>
                    )}
                    {!isLoading && !isError && items.length === 0 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">No results</div>
                    )}
                    {items.map((item) => (
                        <DropdownMenuItem
                            key={item.id}
                            className="items-start whitespace-normal px-3 py-2"
                            onClick={() => {
                                onSelect(item);
                                setOpen(false);
                                setQuery("");
                            }}
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-xs">{item.itemCode}</span>
                                    <span className="truncate text-sm">{item.itemName}</span>
                                </div>
                                <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                    {item.hsnCode && <span>HSN/SAC: {item.hsnCode}</span>}
                                    <span>{item.unit}</span>
                                </div>
                            </div>
                        </DropdownMenuItem>
                    ))}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default ItemCodeCombobox;
