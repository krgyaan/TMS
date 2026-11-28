import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ProofItem } from "../helpers/imprest.types";

/** Ask the browser PDF viewer to fit the page to the available width. */
const withPdfView = (url: string): string => (url.includes("#") ? url : `${url}#view=FitH`);

export const ProofViewerDialog: React.FC<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    proofs: ProofItem[];
    index: number;
    setIndex: React.Dispatch<React.SetStateAction<number>>;
}> = ({ open, onOpenChange, proofs, index, setIndex }) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
            className="max-w-none w-screen h-screen p-0 overflow-hidden flex flex-col [&>[data-radix-dialog-close]]:hidden [&>div]:m-0 [&>div]:h-full [&>div]:w-full [&>div]:max-h-none [&>div]:overflow-hidden [&>div]:p-0 [&>div]:flex [&>div]:flex-col"
            aria-describedby={undefined}
        >
            {/* Accessibility (required by Radix) */}
            <DialogTitle className="sr-only">Proof Viewer</DialogTitle>
            <DialogDescription className="sr-only">View uploaded proof documents</DialogDescription>

            {/* Top Bar */}
            <div className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{proofs[index]?.name ?? "Document"}</p>
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
            <div className="relative min-h-0 w-full flex-1 bg-muted/30">
                {proofs[index] ? (
                    proofs[index].type === "image" ? (
                        <div className="absolute inset-0 flex items-center justify-center overflow-auto">
                            <img src={proofs[index].url} alt={proofs[index].name} className="max-h-full max-w-full object-contain bg-white" />
                        </div>
                    ) : (
                        <iframe src={withPdfView(proofs[index].url)} title={proofs[index].name} className="absolute inset-0 h-full w-full border-0 bg-white" />
                    )
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">No preview available</div>
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
