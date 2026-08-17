import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFinalizeSaleInvoice } from "@/hooks/api/useSaleInvoices";
import { formatINR } from "@/hooks/useINRFormatter";
import type { SaleInvoiceListRow } from "@/modules/operations/sale-invoices/helpers/saleInvoice.types";
import { useCallback } from "react";
import { toast } from "sonner";

interface Props {
    row: SaleInvoiceListRow | null;
    open: boolean;
    onClose: () => void;
}

const FinalizeDialog = ({ row, open, onClose }: Props) => {
    const finalizeMutation = useFinalizeSaleInvoice();

    const handleSubmit = useCallback(async () => {
        if (!row) return;
        try {
            await finalizeMutation.mutateAsync(row.id);
            toast.success(`Invoice ${row.invoiceNumber} finalized and marked as Invoiced`);
            onClose();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to finalize invoice");
        }
    }, [row, finalizeMutation, onClose]);

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Finalize Invoice</DialogTitle>
                    <DialogDescription>Confirm and mark this invoice as Invoiced. This cannot be undone.</DialogDescription>
                </DialogHeader>
                {row && (
                    <div className="space-y-4 py-2">
                        <p className="text-sm"><strong>Invoice:</strong> {row.invoiceNumber}</p>
                        <p className="text-sm"><strong>Customer:</strong> {row.billingCustomerName}</p>
                        <p className="text-sm"><strong>Grand Total:</strong> {formatINR(Number(row.grandTotal || 0))}</p>
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={finalizeMutation.isPending}>
                        {finalizeMutation.isPending ? "Finalizing..." : "Finalize Invoice"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default FinalizeDialog;