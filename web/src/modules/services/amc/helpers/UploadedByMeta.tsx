import type { ReactNode } from "react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatUploadedAt, parseFileMeta } from "./amcFileMeta";

interface UploadedByTooltipProps {
    path: string;
    users?: Array<{ id: number; name: string }>;
    children: ReactNode;
}

export function UploadedByTooltip({ path, users, children }: UploadedByTooltipProps) {
    const meta = parseFileMeta(path);
    if (meta.userId == null || meta.timestamp == null) return <>{children}</>;
    const user = users?.find(u => u.id === meta.userId);
    const by = user?.name ?? `User ${meta.userId}`;
    const text = `Uploaded by ${by} • ${formatUploadedAt(meta.timestamp)}`;
    return (
        <Tooltip>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent>{text}</TooltipContent>
        </Tooltip>
    );
}
