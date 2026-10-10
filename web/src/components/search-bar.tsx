import * as React from "react";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

type SearchBarProps = {
    onClick: () => void;
    className?: string;
};

function getShortcutLabel() {
    if (typeof navigator === "undefined") return "Ctrl K";
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
    return isMac ? "⌘K" : "Ctrl K";
}

export function SearchBar({ onClick, className }: SearchBarProps) {
    const shortcut = React.useMemo(getShortcutLabel, []);

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label="Search menu"
            className={cn(
                "group flex h-9 w-9 items-center justify-center gap-2 rounded-xl border border-input bg-background px-3 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground sm:w-56 sm:justify-start lg:w-72",
                className
            )}
        >
            <Search className="h-4 w-4 shrink-0" />
            <span className="hidden flex-1 text-left sm:inline">Search...</span>
            <kbd className="pointer-events-none hidden select-none items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
                {shortcut}
            </kbd>
        </button>
    );
}
