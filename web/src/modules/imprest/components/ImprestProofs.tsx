import React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Eye } from "lucide-react";
import { mapProofFiles } from "../helpers/imprest.mapper";
import type { ImprestProof } from "../helpers/imprest.types";
import { ProofViewerDialog } from "./ProofViewerDialog";

type ImprestProofsProps = {
    proofs: (string | ImprestProof)[];
    /** "count" for grid cells, "link" for inline/mobile usage. */
    variant?: "count" | "link";
    emptyText?: string;
    className?: string;
};

/**
 * Shared proof viewer: renders an Eye + count trigger and opens the
 * full-screen carousel viewer directly (one click, prev/next between proofs).
 */
export const ImprestProofs: React.FC<ImprestProofsProps> = ({ proofs, variant = "count", emptyText = "—", className }) => {
    const items = React.useMemo(() => mapProofFiles(proofs), [proofs]);
    const [viewerOpen, setViewerOpen] = React.useState(false);
    const [viewerIndex, setViewerIndex] = React.useState(0);

    if (items.length === 0) {
        return <span className="text-muted-foreground">{emptyText}</span>;
    }

    const openViewer = () => {
        setViewerIndex(0);
        setViewerOpen(true);
    };

    const baseClass = "inline-flex items-center gap-1.5 text-sm text-primary hover:underline";
    const trigger =
        variant === "link" ? (
            <button type="button" onClick={openViewer} className={`${baseClass} ${className ?? ""}`}>
                <Eye className="h-3.5 w-3.5" />
                {items.length} proof{items.length > 1 ? "s" : ""}
            </button>
        ) : (
            <TooltipProvider delayDuration={100}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button type="button" onClick={openViewer} className={`${baseClass} ${className ?? ""}`}>
                            <Eye className="h-3.5 w-3.5" />
                            {items.length}
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs font-medium">
                        View proofs
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );

    return (
        <>
            {trigger}
            <ProofViewerDialog open={viewerOpen} onOpenChange={setViewerOpen} proofs={items} index={viewerIndex} setIndex={setViewerIndex} />
        </>
    );
};

export default ImprestProofs;
