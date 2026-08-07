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
import { Loader2, FileText, Trash2, ReceiptText, CheckSquare } from "lucide-react";
import { useAmcBilling, useAddInvoices, useRemoveInvoice } from "@/hooks/api/useAmcBilling";
import { cn } from "@/lib/utils";

interface ManageInvoicesModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    billingId: number | null;
}

export function ManageInvoicesModal({ open, onOpenChange, billingId }: ManageInvoicesModalProps) {
    const { data: billing } = useAmcBilling(billingId ?? 0);
    const addInvoices = useAddInvoices();
    const removeInvoice = useRemoveInvoice();
    const [files, setFiles] = useState<File[]>([]);
    const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);

    const existingInvoices = billing?.invoices ?? [];
    const doneServices = billing?.services?.filter(s => s.status === "Done") ?? [];
    const pending = addInvoices.isPending || removeInvoice.isPending;

    useEffect(() => {
        if (!open) {
            setFiles([]);
            setSelectedServiceIds([]);
        }
    }, [open]);

    const handleClose = () => {
        setFiles([]);
        setSelectedServiceIds([]);
        onOpenChange(false);
    };

    const toggleService = (serviceId: number) => {
        setSelectedServiceIds(prev =>
            prev.includes(serviceId)
                ? prev.filter(id => id !== serviceId)
                : [...prev, serviceId]
        );
    };

    const handleUpload = async () => {
        if (!billingId || files.length === 0) return;
        if (selectedServiceIds.length === 0) return;
        try {
            await addInvoices.mutateAsync({ id: billingId, files });
            handleClose();
        } catch {
            // handled by hook
        }
    };

    const handleRemove = async (index: number) => {
        if (!billingId) return;
        try {
            await removeInvoice.mutateAsync({ id: billingId, index });
        } catch {
            // handled by hook
        }
    };

    const fmtDate = (value?: string | null) =>
        value ? new Date(value).toLocaleDateString() : "—";

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ReceiptText className="h-5 w-5" /> Manage Invoices
                    </DialogTitle>
                    <DialogDescription>
                        Upload and manage invoice files for this bill. Select at least one completed service visit.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                    {/* Existing invoices */}
                    {existingInvoices.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Existing Invoices ({existingInvoices.length})
                            </p>
                            {existingInvoices.map((invoice, idx) => (
                                <div
                                    key={idx}
                                    className="rounded-lg border bg-muted/30 p-3 flex items-center justify-between gap-2"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <FileText className="h-5 w-5 text-muted-foreground" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate">{invoice}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Uploaded
                                            </p>
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

                    {/* Service selection (Option A) */}
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Completed Service Visits (select at least one)
                        </p>
                        {doneServices.length === 0 ? (
                            <p className="text-sm text-amber-600">
                                No completed service visits yet. Complete a service visit first.
                            </p>
                        ) : (
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                                {doneServices.map(service => (
                                    <label
                                        key={service.id}
                                        className={cn(
                                            "flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition-colors",
                                            selectedServiceIds.includes(service.id)
                                                ? "bg-primary/10 border-primary text-primary"
                                                : "hover:bg-muted/50"
                                        )}
                                        onClick={() => toggleService(service.id)}
                                    >
                                        <CheckSquare
                                            className={cn(
                                                "h-4 w-4 flex-shrink-0",
                                                selectedServiceIds.includes(service.id)
                                                    ? "text-primary"
                                                    : "text-muted-foreground"
                                            )}
                                        />
                                        <span className="text-sm font-medium">
                                            Visit {service.serviceNo} — {fmtDate(service.serviceDueDate)}
                                        </span>
                                        <span className="text-xs text-muted-foreground ml-auto">
                                            {service.serviceCompletedDate
                                                ? fmtDate(service.serviceCompletedDate)
                                                : "Pending"}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* File upload */}
                    <div className="space-y-2">
                        <Label htmlFor="invoice-files">Select invoice files</Label>
                        <input
                            id="invoice-files"
                            type="file"
                            multiple
                            className="border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm outline-none file:mr-2 file:border-0 file:bg-transparent file:text-sm file:font-medium"
                            onChange={e => {
                                const selected = Array.from(e.target.files ?? []);
                                setFiles(selected);
                            }}
                            disabled={doneServices.length === 0}
                        />
                        {files.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                                {files.length} file{files.length > 1 ? "s" : ""} selected
                            </p>
                        )}
                        {doneServices.length === 0 && files.length > 0 && (
                            <p className="text-xs text-amber-600">
                                Please select at least one completed service visit.
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
                        disabled={pending || files.length === 0 || selectedServiceIds.length === 0}
                    >
                        {pending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
                            </>
                        ) : (
                            "Upload Invoices"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}