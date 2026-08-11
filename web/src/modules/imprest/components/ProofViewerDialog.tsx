import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ProofItem } from "../helpers/imprest.types";

export const ProofViewerDialog: React.FC<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    proofs: ProofItem[];
    index: number;
    setIndex: (index: number) => void;
}> = ({ open, onOpenChange, proofs, index, setIndex }) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
            className="max-w-none w-screen h-screen p-0 overflow-hidden flex flex-col [&>[data-radix-dialog-close]]:hidden"
            aria-describedby={undefined}
        >
        {/* Accessibility (required by Radix) */}
        <DialogTitle className="sr-only">Proof Viewer</DialogTitle>
        <DialogDescription className="sr-only">View uploaded proof documents</DialogDescription>

        {/* Top Bar */}
        <div className="flex items-center justify-between h-14 px-4 border-b bg-background">
            <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{proofs[index]?.name ?? "Document"}</p>
                <p className="text-xs text-muted-foreground">{proofs.length ? `${index + 1} of ${proofs.length}` : ""}</p>
            </div>

            <div className="flex items-center gap-2">
                {proofs[index]?.url && (
                    <Button variant="outline" size="sm" onClick={() => window.open(proofs[index].url, "_blank", "noopener,noreferrer")}>
                        Open in new tab
                    </Button>
                )}

                <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Close">
                    ✕
                </Button>
            </div>
        </div>

        {/* Viewer */}
        <div className="flex-1 w-full bg-muted/30">
            {proofs[index] ? (
                proofs[index].type === "image" ? (
                    <div className="w-full h-full flex items-center justify-center overflow-auto">
                        <img src={proofs[index].url} alt={proofs[index].name} className="max-w-full max-h-full object-contain bg-white" />
                    </div>
                ) : (
                    <iframe src={proofs[index].url} title={proofs[index].name} className="w-full h-full border-0 bg-white" />
                )
            ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No preview available</div>
            )}
        </div>

        {/* Navigation */}
        {proofs.length > 1 && (
            <div className="pointer-events-none absolute inset-y-14 left-0 right-0 flex items-center justify-between px-4">
                <Button
                    size="icon"
                    variant="secondary"
                    className="pointer-events-auto shadow"
                    disabled={index === 0}
                    onClick={() => setIndex(i => i - 1)}
                >
                    ‹
                </Button>

                <Button
                    size="icon"
                    variant="secondary"
                    className="pointer-events-auto shadow"
                    disabled={index === proofs.length - 1}
                    onClick={() => setIndex(i => i + 1)}
                >
                    ›
                </Button>
            </div>
        )}
        </DialogContent>
    </Dialog>
);