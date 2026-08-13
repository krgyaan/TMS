import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
    value: number | null;
    onChange?: (value: number | null) => void;
    max?: number;
    size?: "sm" | "md" | "lg";
    readonly?: boolean;
    className?: string;
}

export function StarRatingInput({
    value,
    onChange,
    max = 5,
    size = "md",
    readonly = false,
    className,
}: StarRatingProps) {
    const sizeClass = {
        sm: "h-4 w-4",
        md: "h-5 w-5",
        lg: "h-6 w-6",
    }[size];

    const handleClick = (index: number) => {
        if (readonly || !onChange) return;
        onChange(index);
    };

    const display = (index: number) => (value ?? 0) >= index;

    return (
        <div className={cn("inline-flex items-center gap-1", className)}>
            {Array.from({ length: max }).map((_, i) => {
                const index = i + 1;
                return (
                    <Star
                        key={index}
                        className={cn(
                            sizeClass,
                            "transition-colors",
                            display(index)
                                ? "fill-yellow-400 text-yellow-400"
                                : "fill-transparent text-muted-foreground/40",
                            !readonly && "cursor-pointer hover:text-yellow-400",
                        )}
                        onClick={() => handleClick(index)}
                        aria-label={`${index} star`}
                    />
                );
            })}
        </div>
    );
}
