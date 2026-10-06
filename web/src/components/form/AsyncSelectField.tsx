import * as React from "react";
import { type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { FieldWrapper } from "./FieldWrapper";
import { AiIndicatorsContext, type FieldIndicator } from "./AiIndicatorsContext";
import { cn } from "@/lib/utils";
import type { SelectOption } from "./SelectField";

/**
 * Server-backed sibling of `SelectField`.
 *
 * `SelectField` owns its search box privately and filters whatever array it is
 * given, which works for the small master-data lists (items, locations,
 * organisations) but cannot drive a network round trip. This variant keeps the
 * exact same trigger / panel / row markup so it renders identically next to
 * those, and adds the two things a remote list needs:
 *
 *  - `onSearch`  - the query is lifted to the caller, which debounces and
 *    refetches. Without it the server would ship the whole table on mount.
 *  - `isLoading` - distinguishes "nothing matched" from "not fetched yet",
 *    which `SelectField` cannot tell and reports as a bare "No results".
 *
 * Client-side filtering still runs over whatever came back, so the panel only
 * ever shows rows matching what the user typed even when the server also
 * matched on fields the row does not display.
 *
 * `SelectField.tsx` itself is intentionally left alone: it backs ~239 call
 * sites and its behaviour must not shift as a side effect of this work.
 */
export type AsyncSelectOption = SelectOption & {
    /** Text the server matched on but the row does not display (gst, pan, address...). */
    keywords?: string;
};

type AsyncSelectFieldProps<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>> = {
    control: Control<TFieldValues>;
    name: TName;
    label: React.ReactNode;
    options: AsyncSelectOption[];
    placeholder: string;
    disabled?: boolean;
    valueType?: "auto" | "string" | "number";
    /** Fires on every keystroke. The caller owns the debounce. */
    onSearch?: (query: string) => void;
    isLoading?: boolean;
};

export function AsyncSelectField<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>({
    control,
    name,
    label,
    options,
    placeholder,
    disabled,
    valueType = "auto",
    onSearch,
    isLoading,
}: AsyncSelectFieldProps<TFieldValues, TName>) {
    const indicators = React.useContext(AiIndicatorsContext);
    const indicator = indicators?.[name as string];

    return (
        <FieldWrapper control={control} name={name} label={label}>
            {field => (
                <AsyncCombobox
                    value={String(field.value ?? "")}
                    onChange={v => {
                        if (v === "") {
                            field.onChange(undefined);
                        } else if (valueType === "number") {
                            const numValue = Number(v);
                            field.onChange(isNaN(numValue) ? v : numValue);
                        } else if (valueType === "string") {
                            field.onChange(v);
                        } else if (v.length === 1 && /^[0-3]$/.test(v)) {
                            // Preserve string enums such as '0' | '1' | '2' | '3'.
                            field.onChange(v);
                        } else if (typeof field.value === "string") {
                            field.onChange(v);
                        } else {
                            const numValue = Number(v);
                            field.onChange(!isNaN(numValue) && v.trim() !== "" ? numValue : v);
                        }
                    }}
                    options={options}
                    placeholder={placeholder}
                    disabled={disabled}
                    aiIndicator={indicator}
                    onSearch={onSearch}
                    isLoading={isLoading}
                />
            )}
        </FieldWrapper>
    );
}

const matchesQuery = (option: AsyncSelectOption, query: string): boolean =>
    (option.name ?? "").toLowerCase().includes(query) ||
    (option.description ?? "").toLowerCase().includes(query) ||
    (option.keywords ?? "").toLowerCase().includes(query);

export function AsyncCombobox({
    value,
    onChange,
    options,
    placeholder,
    disabled,
    aiIndicator,
    onSearch,
    isLoading,
}: {
    value: string;
    onChange: (v: string) => void;
    options: AsyncSelectOption[];
    placeholder: string;
    disabled?: boolean;
    aiIndicator?: FieldIndicator | null;
    onSearch?: (query: string) => void;
    isLoading?: boolean;
}) {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Resolved from `options` rather than `filtered`: the row backing the
    // current value may legitimately not match what is typed, and the trigger
    // must keep showing it.
    const selected = options.find(o => o.id === value);
    const filtered = React.useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return options;
        return options.filter(o => matchesQuery(o, q));
    }, [options, query]);

    const handleQueryChange = (next: string) => {
        setQuery(next);
        onSearch?.(next);
    };

    React.useEffect(() => {
        if (!open) return;
        // Wait one tick so the portal content exists before focusing.
        const id = setTimeout(() => inputRef.current?.focus(), 0);
        return () => clearTimeout(id);
    }, [open]);

    const handleContentKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        // @radix-ui/react-menu fires typeahead on every printable key inside the
        // panel and has no <input> guard, so as soon as focus sits on the panel
        // (Radix's onItemLeave parks it there) the search box stops receiving
        // keystrokes and focus jumps to a row instead. Radix composes our
        // handler first via composeEventHandlers(..., { checkForDefaultPrevented
        // = true }), so preventDefault() skips its handler outright. Guarding on
        // currentTarget keeps Enter/Space/arrows on a focused row untouched.
        if (event.target !== event.currentTarget) return;
        if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
        event.preventDefault();
        inputRef.current?.focus();
        handleQueryChange(query + event.key);
    };

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild disabled={disabled}>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between min-w-0"
                    disabled={disabled}
                >
                    <span className="truncate">{selected ? selected.name : placeholder}</span>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="ml-2 h-4 w-4 shrink-0 opacity-50"
                    >
                        <polyline points="7 10 12 15 17 10" />
                    </svg>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-(--radix-popper-anchor-width) p-0"
                align="start"
                onKeyDown={handleContentKeyDown}
            >
                {/* Clicking the padding must not move focus off the search box. */}
                <div className="p-2 border-b" onMouseDown={e => e.preventDefault()}>
                    <Input
                        ref={inputRef}
                        autoFocus
                        placeholder="Search..."
                        value={query}
                        onChange={e => handleQueryChange(e.target.value)}
                        onKeyDown={e => e.stopPropagation()}
                        className="h-8"
                    />
                </div>
                <div className="max-h-64 overflow-auto py-1">
                    {isLoading && filtered.length === 0 && (
                        <div className="text-muted-foreground flex items-center gap-2 px-2 py-2 text-sm">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Loading...
                        </div>
                    )}
                    {!isLoading && filtered.length === 0 && (
                        <div className="text-muted-foreground px-2 py-2 text-sm">No results</div>
                    )}
                    {filtered.map(o => {
                        const isSelected = value === o.id;
                        const isAiSuggested = Boolean(
                            aiIndicator &&
                                aiIndicator.suggestedValue !== undefined &&
                                aiIndicator.suggestedValue !== null &&
                                (String(o.id).trim().toLowerCase() === String(aiIndicator.suggestedValue).trim().toLowerCase() ||
                                    String(o.name).trim().toLowerCase() === String(aiIndicator.suggestedValue).trim().toLowerCase())
                        );

                        return (
                            <DropdownMenuItem
                                key={`${o.id}-${o.name}`}
                                onClick={() => {
                                    onChange(isSelected ? "" : o.id);
                                    setOpen(false);
                                    handleQueryChange("");
                                }}
                                className="flex items-center justify-between gap-2"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                        className={cn("mr-1 h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")}
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M16.707 5.293a1 1 0 010 1.414l-7.778 7.778a1 1 0 01-1.414 0L3.293 10.95a1 1 0 011.414-1.414l3.394 3.394 7.071-7.071a1 1 0 011.414 0z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    <div className="flex flex-col truncate">
                                        <span className="truncate">{o.name}</span>
                                        {o.description && <span className="text-xs text-muted-foreground truncate">{o.description}</span>}
                                    </div>
                                </div>

                                {isAiSuggested && (
                                    <span
                                        className={cn(
                                            "shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium select-none shadow-2xs",
                                            aiIndicator?.type === "high"
                                                ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                                                : "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                                        )}
                                        title={aiIndicator?.message}
                                    >
                                        <Sparkles className="h-2.5 w-2.5" />
                                        <span>AI Suggested {aiIndicator?.confidenceValue ? `(${aiIndicator.confidenceValue})` : ""}</span>
                                    </span>
                                )}
                            </DropdownMenuItem>
                        );
                    })}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default AsyncSelectField;
