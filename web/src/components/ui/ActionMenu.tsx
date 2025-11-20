import { EllipsisVertical } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ActionItem<T = any> = {
    label: string;
    icon?: React.ReactNode;
    onClick: (rowData: T) => void;
    className?: string;
};

type Props<T> = {
    rowData: T;
    actions: ActionItem<T>[];
};

export const ActionMenu = <T extends object>({ rowData, actions }: Props<T>) => {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <EllipsisVertical className="h-4 w-4" />
                    <span className="sr-only">Open row actions</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={4} className="w-40 cursor-pointer">
                {actions.map((action, idx) => (
                    <DropdownMenuItem
                        key={`${action.label}-${idx}`}
                        className={cn("flex items-center gap-2 cursor-pointer", action.className)}
                        onClick={() => action.onClick(rowData)}
                    >
                        {action.icon ? <span className="text-muted-foreground">{action.icon}</span> : null}
                        {action.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
