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
import { Loader2, FileText, ReceiptText } from "lucide-react";
import { useAmcBilling, useAmcBillingFileUpload } from "@/hooks/api/useAmcBilling";
import { billingFileUrl } from "../helpers/amc-billing.types";

interface SubmitInvoiceModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    billingId: number | null;
}

export function SubmitInvoiceModal({ open, onOpenChange, billingId }: SubmitInvoiceModalProps) {
    const { data: billing } = useAmcBilling(billingId ?? 0);
    const uploadFile = useAmcBillingFileUpload();
    const [file, setFile] = useState<File | null>(null);

    const existing = billing?.invoice;
    const pending = uploadFile.isPending;

    useEffect(() => {
        if (!open) setFile(null);
    }, [open]);

    const handleClose = () => {
        setFile(null);
        onOpenChange(false);
    };

    const handleUpload = async () => {
        if (!billingId || !file) return;
        try {
            await uploadFile.mutateAsync({ id: billingId, field: "invoice", file });
            handleClose();
        } catch {
            // handled by hook
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ReceiptText className="h-5 w-5" /> Submit Invoice
                    </DialogTitle>
                    <DialogDescription>
                        Upload the invoice for this completed service. It marks the bill as submitted.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {existing && (
                        <div className="rounded-lg border bg-muted/30 p-3 flex items-center justify-between gap-2">
                            <span className="text-sm text-muted-foreground">Current invoice:</span>
                            <a
                                href={billingFileUrl(existing)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                                <FileText className="h-3.5 w-3.5" /> Open
                            </a>
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="invoice-file">Select invoice file</Label>
                        <input
                            id="invoice-file"
                            type="file"
                            className="border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm outline-none file:mr-2 file:border-0 file:bg-transparent file:text-sm file:font-medium"
                            onChange={e => setFile(e.target.files?.[0] ?? null)}
                        />
                        {file && <p className="text-xs text-muted-foreground">{file.name}</p>}
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleClose} disabled={pending}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleUpload} disabled={pending || !file}>
                        {pending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
                            </>
                        ) : (
                            "Submit Invoice"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
