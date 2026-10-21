import * as React from "react";
import { useNavigate } from "react-router-dom";

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { useCurrentUser } from "@/hooks/api/useAuth";
import { useFieldMode } from "@/hooks/useFieldMode";
import { buildFieldMenu, filterMenu, navMain } from "@/lib/nav-config";

import type { LucideIcon } from "lucide-react";

type SearchEntry = {
    group: string;
    title: string;
    url: string;
    icon?: LucideIcon;
};

type CommandPaletteProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
    const navigate = useNavigate();
    const { data: currentUser } = useCurrentUser();
    const isFieldMode = useFieldMode();

    const groups = React.useMemo(
        () => (isFieldMode ? buildFieldMenu(currentUser ?? null) : filterMenu(currentUser ?? null, navMain)),
        [currentUser, isFieldMode]
    );

    const grouped = React.useMemo(() => {
        const byGroup = new Map<string, SearchEntry[]>();
        const push = (entry: SearchEntry) => {
            const bucket = byGroup.get(entry.group);
            if (bucket) {
                bucket.push(entry);
            } else {
                byGroup.set(entry.group, [entry]);
            }
        };

        for (const group of groups) {
            if (group.items && group.items.length > 0) {
                for (const item of group.items) {
                    push({ group: group.title, title: item.title, url: item.url, icon: group.icon });
                }
            } else if (group.url) {
                push({ group: group.title, title: group.title, url: group.url, icon: group.icon });
            }
        }

        return Array.from(byGroup.entries());
    }, [groups]);

    const handleSelect = React.useCallback(
        (entry: SearchEntry) => {
            onOpenChange(false);
            navigate(entry.url);
        },
        [navigate, onOpenChange]
    );

    return (
        <CommandDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Search"
            description="Search the menu and jump to a page"
            className="sm:max-w-lg"
        >
            <CommandInput placeholder="Search menu..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                {grouped.map(([group, items]) => (
                    <CommandGroup key={group} heading={group}>
                        {items.map((entry) => (
                            <CommandItem
                                key={`${group}::${entry.title}`}
                                value={`${group}::${entry.title}`}
                                keywords={[group, entry.title, entry.url]}
                                onSelect={() => handleSelect(entry)}
                            >
                                {entry.icon && <entry.icon />}
                                <span>{entry.title}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                ))}
            </CommandList>
        </CommandDialog>
    );
}
