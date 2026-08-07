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
import { Label } from "@/components/ui/label";
import { Loader2, FileText, Banknote, Trash2 } from "lucide-react";
import { useAmcBilling, useAddReceipts, useRemoveReceipt } from "@/hooks/api/useAmcBilling";

interface ManageReceiptsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    billingId: number | null;
}

export function ManageReceiptsModal({ open, onOpenChange, billingId }: ManageReceiptsModalProps) {
    const { data: billing } = useAmcBilling(billingId ?? 0);
    const addReceipts = useAddReceipts();
    const removeReceipt = useRemoveReceipt();
    const [files, setFiles] = useState<File[]>([]);

    const existingReceipts = billing?.paymentReceipts ?? [];
    const pending = addReceipts.isPending || removeReceipt.isPending;

    useEffect(() => {
        if (!open) setFiles([]);
    }, [open]);

    const handleClose = () => {
        setFiles([]);
        onOpenChange(false);
    };

    const handleUpload = async () => {
        if (!billingId || files.length === 0) return;
        try {
            await addReceipts.mutateAsync({ id: billingId, files });
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
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <FileText className="h-5 w-5 text-muted-foreground" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate">{receipt}</p>
                                        </div>
                                    </div>
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
                        <Label htmlFor="receipt-files">Select receipt files</Label>
                        <input
                            id="receipt-files"
                            type="file"
                            multiple
                            className="border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm outline-none file:mr-2 file:border-0 file:bg-transparent file:text-sm file:font-medium"
                            onChange={e => setFiles(Array.from(e.target.files ?? []))}
                        />
                        {files.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                                {files.length} file{files.length > 1 ? "s" : ""} selected
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleClose} disabled={pending}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleUpload}
                        disabled={pending || files.length === 0}
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