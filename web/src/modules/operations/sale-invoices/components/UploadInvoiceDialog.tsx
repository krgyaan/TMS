import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCreateSaleInvoiceDraft } from "@/hooks/api/useSaleInvoices";
import type { SaleInvoiceListRow } from "@/modules/operations/sale-invoices/helpers/saleInvoice.types";
import { useCallback } from "react";
import { toast } from "sonner";

interface Props {
    row: SaleInvoiceListRow | null;
    open: boolean;
    onClose: () => void;
}

const UploadInvoiceDialog = ({ row, open, onClose }: Props) => {
    const createDraftMutation = useCreateSaleInvoiceDraft();

    const handleSubmit = useCallback(async () => {
        if (!row) return;
        try {
            await createDraftMutation.mutateAsync(row.id);
            toast.success(`Draft created for ${row.invoiceNumber}. Review the latest invoice PDF.`);
            onClose();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to create draft");
        }
    }, [row, createDraftMutation, onClose]);

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Create Draft</DialogTitle>
                    <DialogDescription>
                        Generate the account draft for this OE request. Review the latest invoice PDF before approval.
                    </DialogDescription>
                </DialogHeader>
                {row && (
                    <div className="space-y-4 py-2">
                        <p className="text-sm"><strong>Invoice:</strong> {row.invoiceNumber}</p>
                        <p className="text-sm"><strong>Customer:</strong> {row.billingCustomerName}</p>
                        {row.status === "changes_requested" && (
                            <p className="text-sm text-muted-foreground">
                                This will reopen the draft. Any corrected billing details create a new PDF version.
                            </p>
                        )}
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={createDraftMutation.isPending}>
                        {createDraftMutation.isPending ? "Creating..." : "Create Draft"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default UploadInvoiceDialog;