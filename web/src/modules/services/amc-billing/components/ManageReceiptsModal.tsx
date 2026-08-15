import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Banknote, Trash2 } from "lucide-react";
import { useAmcBilling, useAddReceipts, useRemoveReceipt } from "@/hooks/api/useAmcBilling";
import { billFileUrl } from "@/modules/services/amc/helpers/amc.types";
import { FileUploader } from "@/components/file-upload/FileUploader";

interface ManageReceiptsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    billingId: number | null;
}

export function ManageReceiptsModal({ open, onOpenChange, billingId }: ManageReceiptsModalProps) {
    const { data: billing } = useAmcBilling(billingId ?? 0);
    const addReceipts = useAddReceipts();
    const removeReceipt = useRemoveReceipt();
    const [paths, setPaths] = useState<string[]>([]);

    const existingReceipts = billing?.paymentReceipts ?? [];
    const pending = addReceipts.isPending || removeReceipt.isPending;

    useEffect(() => {
        if (!open) setPaths([]);
    }, [open]);

    const handleClose = () => {
        setPaths([]);
        onOpenChange(false);
    };

    const handleUpload = async () => {
        if (!billingId || paths.length === 0) return;
        try {
            await addReceipts.mutateAsync({ id: billingId, paths });
            handleClose();
        } catch {
            // handled by hook
        }
    };

    const handleRemove = async (index: number) => {
        if (!billingId) return;
        try {
            await removeReceipt.mutateAsync({ id: billingId, index });
        } catch {
            // handled by hook
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Banknote className="h-5 w-5" /> Manage Payment Receipts
                    </DialogTitle>
                    <DialogDescription>
                        Upload and manage payment receipt files for this bill.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Existing receipts */}
                    {existingReceipts.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Existing Receipts ({existingReceipts.length})
                            </p>
                            {existingReceipts.map((receipt, idx) => (
                                <div
                                    key={idx}
                                    className="rounded-lg border bg-muted/30 p-3 flex items-center justify-between gap-2"
                                >
                                    <a
                                        href={billFileUrl(receipt)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sm font-medium truncate flex-1 min-w-0 hover:underline"
                                    >
                                        {receipt.split("/").pop() || receipt}
                                    </a>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive h-8"
                                        onClick={() => handleRemove(idx)}
                                        disabled={pending}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="border-t pt-4" />

                    {/* File upload */}
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Receipt Files
                        </p>
                        <FileUploader
                            context="amc-receipts"
                            value={paths}
                            onChange={setPaths}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleClose} disabled={pending}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleUpload}
                        disabled={pending || paths.length === 0}
                    >
                        {pending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
                            </>
                        ) : (
                            "Upload Receipts"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
