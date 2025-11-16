import { type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiSelectFieldProps<
    TFieldValues extends FieldValues,
    TName extends FieldPath<TFieldValues>
> {
    control: Control<TFieldValues>;
    name: TName;
    label: string;
    options: { value: string; label: string }[];
    placeholder?: string;
    className?: string;
    maxChips?: number;
}

export function MultiSelectField<
    TFieldValues extends FieldValues,
    TName extends FieldPath<TFieldValues>
>({
    control,
    name,
    label,
    options,
    placeholder,
    className,
    maxChips = 3,
}: MultiSelectFieldProps<TFieldValues, TName>) {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => {
                const selected: string[] = Array.isArray(field.value) ? field.value : [];

                const toggleOption = (value: string) => {
                    const newValue = selected.includes(value)
                        ? selected.filter((v) => v !== value)
                        : [...selected, value];
                    field.onChange(newValue);
                };

                const selectedOptions = options.filter((o) => selected.includes(o.value));
                const hiddenCount = selectedOptions.length - maxChips;

                return (
                    <FormItem className={className}>
                        <FormLabel>{label}</FormLabel>

                        <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        role="combobox"
                                        className="w-full justify-between min-h-[40px] flex items-center"
                                    >
                                        {selectedOptions.length > 0 ? (
                                            <div className="flex flex-wrap gap-1 max-w-[85%]">
                                                {selectedOptions.slice(0, maxChips).map((item) => (
                                                    <Badge
                                                        key={item.value}
                                                        variant="secondary"
                                                        className="flex items-center gap-1 px-2 py-0"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleOption(item.value);
                                                        }}
                                                    >
                                                        {item.label}
                                                        <X className="h-3 w-3 cursor-pointer" />
                                                    </Badge>
                                                ))}

                                                {hiddenCount > 0 && (
                                                    <span className="text-xs text-muted-foreground">
                                                        +{hiddenCount} more
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground">
                                                {placeholder || 'Select options'}
                                            </span>
                                        )}

                                        <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50 shrink-0" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>

                            <PopoverContent className="w-full p-0">
                                <Command>
                                    <CommandInput placeholder="Search..." />
                                    <CommandEmpty>No options found.</CommandEmpty>

                                    <CommandGroup>
                                        {options.map((option) => {
                                            const isSelected = selected.includes(option.value);

                                            return (
                                                <CommandItem
                                                    key={option.value}
                                                    onSelect={() => toggleOption(option.value)}
                                                >
                                                    <Check
                                                        className={cn(
                                                            'mr-2 h-4 w-4',
                                                            isSelected ? 'opacity-100' : 'opacity-0'
                                                        )}
                                                    />
                                                    {option.label}
                                                </CommandItem>
                                            );
                                        })}
                                    </CommandGroup>
                                </Command>

                                {selected.length > 0 && (
                                    <div className="border-t px-2 py-2">
                                        <Button
                                            variant="ghost"
                                            className="w-full text-sm"
                                            onClick={() => field.onChange([])}
                                        >
                                            Clear all
                                        </Button>
                                    </div>
                                )}
                            </PopoverContent>
                        </Popover>

                        <FormMessage />
                    </FormItem>
                );
            }}
        />
    );
}
