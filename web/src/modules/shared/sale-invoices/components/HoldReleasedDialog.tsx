import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateSaleInvoice } from "@/hooks/api/useSaleInvoices";
import type { SaleInvoiceListRow } from "@/modules/operations/sale-invoices/helpers/saleInvoice.types";
import { useCallback, useState } from "react";

interface Props {
    row: SaleInvoiceListRow | null;
    open: boolean;
    onClose: () => void;
}

const HoldReleasedDialog = ({ row, open, onClose }: Props) => {
    const updateMutation = useUpdateSaleInvoice();
    const [releasedAmount, setReleasedAmount] = useState("");
    const [releasedAt, setReleasedAt] = useState(new Date().toISOString().slice(0, 16));

    const handleSubmit = useCallback(async () => {
        if (!row) return;
        await updateMutation.mutateAsync({
            id: row.id,
            holdReleasedAmount: Number(releasedAmount) || 0,
            holdReleasedAt: releasedAt ? new Date(releasedAt).toISOString() : null,
        });
        onClose();
    }, [row, releasedAmount, releasedAt, updateMutation, onClose]);

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Release Hold Amount</DialogTitle>
                    <DialogDescription>Record a hold amount release for this invoice.</DialogDescription>
                </DialogHeader>
                {row && (
                    <div className="space-y-4 py-2">
                        <p className="text-sm"><strong>Invoice:</strong> {row.invoiceNumber}</p>
                        <div className="space-y-1">
                            <Label>Released Amount</Label>
                            <Input type="number" step="0.01" value={releasedAmount} onChange={(e) => setReleasedAmount(e.target.value)} placeholder="0.00" />
                        </div>
                        <div className="space-y-1">
                            <Label>Released At</Label>
                            <Input type="datetime-local" value={releasedAt} onChange={(e) => setReleasedAt(e.target.value)} />
                        </div>
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? "Saving..." : "Record Release"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default HoldReleasedDialog;
