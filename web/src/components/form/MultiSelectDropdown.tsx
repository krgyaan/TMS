import { useEffect, useMemo, useRef, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MultiSelectOption {
    value: number;
    label: string;
    sublabel?: React.ReactNode;
    searchText?: string;
    disabled?: boolean;
}

interface MultiSelectDropdownProps {
    options: MultiSelectOption[];
    value: number[];
    onChange: (next: number[]) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    selectedNoun?: string;
    disabled?: boolean;
    triggerClassName?: string;
}

export function MultiSelectDropdown({
    options,
    value,
    onChange,
    placeholder = 'Select options',
    searchPlaceholder = 'Search...',
    emptyText = 'No options found.',
    selectedNoun,
    disabled = false,
    triggerClassName,
}: MultiSelectDropdownProps) {
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [popoverWidth, setPopoverWidth] = useState<string>('auto');
    const [search, setSearch] = useState('');

    useEffect(() => {
        const updateWidth = () => {
            if (triggerRef.current) {
                setPopoverWidth(`${triggerRef.current.offsetWidth}px`);
            }
        };

        requestAnimationFrame(updateWidth);

        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    const filteredOptions = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return options;
        return options.filter((o) => `${o.label} ${o.searchText ?? ""}`.toLowerCase().includes(query));
    }, [options, search]);

    const toggleOption = (optionValue: number) => {
        onChange(
            value.includes(optionValue)
                ? value.filter((v) => v !== optionValue)
                : [...value, optionValue],
        );
    };

    const selectableValues = filteredOptions.filter((o) => !o.disabled).map((o) => o.value);
    const allVisibleSelected =
        selectableValues.length > 0 && selectableValues.every((v) => value.includes(v));

    const handleSelectAllVisible = () => {
        if (allVisibleSelected) {
            onChange(value.filter((v) => !selectableValues.includes(v)));
        } else {
            onChange([...new Set([...value, ...selectableValues])]);
        }
    };

    const selectedOptions = options.filter((o) => value.includes(o.value));
    const selectedSummary = selectedNoun
        ? `${selectedOptions.length} ${selectedNoun}${selectedOptions.length === 1 ? '' : 's'} selected`
        : `${selectedOptions.length} selected`;
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    ref={triggerRef}
                    type="button"
                    variant="outline"
                    role="combobox"
                    disabled={disabled}
                    className={cn(
                        'w-full justify-between min-h-[40px] h-auto flex items-center gap-2 rounded-xl px-3',
                        triggerClassName,
                    )}
                >
                    {selectedOptions.length > 0 ? (
                        <span className="text-xs font-semibold text-primary truncate">
                            {selectedSummary}
                        </span>
                    ) : (
                        <span className="text-muted-foreground text-xs truncate">
                            {disabled ? emptyText : placeholder}
                        </span>
                    )}

                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50 shrink-0" />
                </Button>
            </PopoverTrigger>

            <PopoverContent
                className="p-0"
                align="start"
                style={{ width: popoverWidth !== 'auto' ? popoverWidth : undefined }}
            >
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder={searchPlaceholder}
                        value={search}
                        onValueChange={setSearch}
                        className="h-9 text-xs"
                    />

                    <CommandList>
                        {filteredOptions.length === 0 ? (
                            <div className="py-6 text-center text-xs text-muted-foreground">{emptyText}</div>
                        ) : (
                            <CommandGroup>
                                {filteredOptions.map((option) => {
                                    const isSelected = value.includes(option.value);
                                    return (
                                        <CommandItem
                                            key={option.value}
                                            value={String(option.value)}
                                            disabled={option.disabled}
                                            onSelect={() => toggleOption(option.value)}
                                            className="cursor-pointer items-start py-2"
                                        >
                                            <Check
                                                className={cn(
                                                    'mr-2 h-4 w-4 shrink-0 mt-0.5',
                                                    isSelected ? 'opacity-100' : 'opacity-0',
                                                )}
                                            />
                                            <div className="flex flex-col min-w-0 gap-0.5">
                                                <span
                                                    className={cn(
                                                        'text-xs font-semibold truncate',
                                                        isSelected && 'text-primary',
                                                    )}
                                                >
                                                    {option.label}
                                                </span>
                                                {option.sublabel && (
                                                    <span className="text-[9px] text-muted-foreground">
                                                        {option.sublabel}
                                                    </span>
                                                )}
                                            </div>
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>

                {selectableValues.length > 0 && (
                    <div className="border-t px-2 py-2 flex items-center gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            className="flex-1 text-xs"
                            onClick={handleSelectAllVisible}
                        >
                            {allVisibleSelected ? 'Deselect all' : `Select all (${selectableValues.length})`}
                        </Button>
                        {value.length > 0 && (
                            <Button
                                type="button"
                                variant="ghost"
                                className="text-xs"
                                onClick={() => onChange([])}
                            >
                                Clear all
                            </Button>
                        )}
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}

export default MultiSelectDropdown;