import { cn } from "@/lib/utils";

export interface QuickFilterOption {
    value: string;
    label: string;
}

export interface QuickFilterProps {
    options: QuickFilterOption[];
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

export function QuickFilter({ options, value, onChange, className }: QuickFilterProps) {
    return (
        <div
            className={cn(
                "bg-muted text-muted-foreground inline-flex h-9 items-center justify-center rounded-lg p-[3px]",
                className
            )}
        >
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange(option.value)}
                    className={cn(
                        "inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center rounded-md border border-transparent px-3 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50",
                        value === option.value
                            ? "bg-background text-foreground shadow-sm dark:border-input dark:bg-input/30"
                            : "text-foreground hover:bg-background/50 dark:text-muted-foreground"
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
