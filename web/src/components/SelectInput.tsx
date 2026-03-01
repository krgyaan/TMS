import * as React from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type SelectOption = { id: string; name: string };

type SelectInputProps = {
    label?: React.ReactNode;
    value?: string;
    options: SelectOption[];
    placeholder: string;
    disabled?: boolean;
    onChange: (value: string) => void;
};

const SelectInput: React.FC<SelectInputProps> = ({ label, value, options, placeholder, disabled, onChange }) => {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");

    const selected = options.find(o => o.id === value);
    const filtered = React.useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return options;
        return options.filter(o => o.name.toLowerCase().includes(q));
    }, [options, query]);

    return (
        <div className="space-y-2">
            {label && <Label>{label}</Label>}

            <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger asChild disabled={disabled}>
                    <Button type="button" variant="outline" className="w-full justify-between" disabled={disabled}>
                        {selected ? selected.name : placeholder}
                        <span className="ml-2 opacity-50">▾</span>
                    </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="w-[--radix-popper-anchor-width] p-0">
                    <div className="p-2 border-b">
                        <Input placeholder="Search..." value={query} onChange={e => setQuery(e.target.value)} className="h-8" />
                    </div>

                    <div className="max-h-64 overflow-auto py-1">
                        {filtered.length === 0 && <div className="px-2 py-2 text-sm text-muted-foreground">No results</div>}

                        {filtered.map(o => {
                            const isSelected = o.id === value;
                            return (
                                <DropdownMenuItem
                                    key={o.id}
                                    onClick={() => {
                                        onChange(o.id);
                                        setOpen(false);
                                        setQuery("");
                                    }}
                                    className={cn(isSelected && "font-semibold")}
                                >
                                    {o.name}
                                </DropdownMenuItem>
                            );
                        })}
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};

export default SelectInput;
