import * as React from "react"
import { type Control, type FieldPath, type FieldValues } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { FieldWrapper } from "./FieldWrapper"
import { cn } from "@/lib/utils"

export type SelectOption = { id: string; name: string }

type SelectFieldProps<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>> = {
    control: Control<TFieldValues>
    name: TName
    label: React.ReactNode
    options: SelectOption[]
    placeholder: string
}

export function SelectField<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>({
    control,
    name,
    label,
    options,
    placeholder,
}: SelectFieldProps<TFieldValues, TName>) {
    return (
        <FieldWrapper control={control} name={name} label={label}>
            {(field) => <Combobox value={String(field.value ?? "")} onChange={field.onChange} options={options} placeholder={placeholder} />}
        </FieldWrapper>
    )
}

function Combobox({
    value,
    onChange,
    options,
    placeholder,
}: {
    value: string
    onChange: (v: string) => void
    options: SelectOption[]
    placeholder: string
}) {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")
    const inputRef = React.useRef<HTMLInputElement>(null)
    const selected = options.find((o) => o.id === value)
    const filtered = React.useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return options
        return options.filter((o) => o.name.toLowerCase().includes(q))
    }, [options, query])

    React.useEffect(() => {
        if (open) {
            // Delay to ensure content has mounted in the portal before focusing
            const id = setTimeout(() => inputRef.current?.focus(), 0)
            return () => clearTimeout(id)
        }
    }, [open])

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {selected ? selected.name : placeholder}
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
            <DropdownMenuContent className="w-[--radix-popper-anchor-width] p-0" align="start">
                <div className="p-2 border-b">
                    <Input
                        ref={inputRef}
                        autoFocus
                        placeholder="Search..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="h-8"
                    />
                </div>
                <div className="max-h-64 overflow-auto py-1">
                    {filtered.length === 0 && (
                        <div className="text-muted-foreground px-2 py-2 text-sm">No results</div>
                    )}
                    {filtered.map((o) => {
                        const isSelected = value === o.id
                        return (
                            <DropdownMenuItem
                                key={`${o.id}-${o.name}`}
                                onClick={() => {
                                    const next = isSelected ? "" : o.id
                                    onChange(next)
                                    setOpen(false)
                                    setQuery("")
                                }}
                                className="flex items-center gap-2"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    className={cn("mr-1 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")}
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-7.778 7.778a1 1 0 01-1.414 0L3.293 10.95a1 1 0 011.414-1.414l3.394 3.394 7.071-7.071a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                {o.name}
                            </DropdownMenuItem>
                        )
                    })}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export default SelectField
