import { Search } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SearchBarProps = {
    onClick: () => void;
    className?: string;
};

export function SearchBar({ onClick, className }: SearchBarProps) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={onClick}
                    aria-label="Search menu"
                    className={cn("h-9 w-9 rounded-xl transition-colors", className)}
                >
                    <Search className="h-5 w-5" />
                </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="end" className="text-xs font-medium">
                Search (⌘K / Ctrl K)
            </TooltipContent>
        </Tooltip>
    );
}
