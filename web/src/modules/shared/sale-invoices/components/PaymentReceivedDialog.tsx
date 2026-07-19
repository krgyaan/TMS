import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TenderFileUploader } from "@/components/tender-file-upload";
import { useUpdateSaleInvoice } from "@/hooks/api/useSaleInvoices";
import type { SaleInvoiceListRow } from "@/modules/operations/sale-invoices/helpers/saleInvoice.types";
import { useCallback, useState } from "react";

interface Props {
    row: SaleInvoiceListRow | null;
    open: boolean;
    onClose: () => void;
}

const PaymentReceivedDialog = ({ row, open, onClose }: Props) => {
    const updateMutation = useUpdateSaleInvoice();
    const [paymentAdvicePaths, setPaymentAdvicePaths] = useState<string[]>([]);
    const [buybackPaths, setBuybackPaths] = useState<string[]>([]);
    const [gstTds, setGstTds] = useState("");
    const [itTds, setItTds] = useState("");
    const [ldDeduction, setLdDeduction] = useState("");
    const [otherDeduction, setOtherDeduction] = useState("");

    const handleSubmit = useCallback(async () => {
        if (!row) return;
        await updateMutation.mutateAsync({
            id: row.id,
            status: "payment_received",
            paymentAdviceDocPaths: paymentAdvicePaths,
            buybackInvoiceDocPaths: buybackPaths,
            gstTds: Number(gstTds) || 0,
            itTds: Number(itTds) || 0,
            ldDeduction: Number(ldDeduction) || 0,
            otherDeduction: Number(otherDeduction) || 0,
        });
        onClose();
    }, [row, paymentAdvicePaths, buybackPaths, gstTds, itTds, ldDeduction, otherDeduction, updateMutation, onClose]);

    const handleRequestPaymentAdvice = useCallback(async () => {
        if (!row) return;
        await updateMutation.mutateAsync({
            id: row.id,
            paymentAdviceRequestedAt: new Date().toISOString(),
        });
        onClose();
    }, [row, updateMutation, onClose]);

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Payment Received</DialogTitle>
                    <DialogDescription>Record payment details for this invoice.</DialogDescription>
                </DialogHeader>
                {row && (
                    <div className="space-y-4 py-2">
                        <p className="text-sm"><strong>Invoice:</strong> {row.invoiceNumber}</p>
                        <p className="text-sm"><strong>Customer:</strong> {row.billingCustomerName}</p>

                        <div className="space-y-1">
                            <Label>Payment Advice Documents</Label>
                            <TenderFileUploader context="tender-documents" value={paymentAdvicePaths} onChange={setPaymentAdvicePaths} />
                            <Button variant="outline" size="sm" className="mt-2" onClick={handleRequestPaymentAdvice}>
                                Request Payment Advice from OE
                            </Button>
                        </div>

                        <div className="space-y-1">
                            <Label>Buyback Invoice (if available)</Label>
                            <TenderFileUploader context="tender-documents" value={buybackPaths} onChange={setBuybackPaths} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>GST TDS</Label>
                                <Input type="number" step="0.01" value={gstTds} onChange={(e) => setGstTds(e.target.value)} placeholder="0.00" />
                            </div>
                            <div className="space-y-1">
                                <Label>IT TDS</Label>
                                <Input type="number" step="0.01" value={itTds} onChange={(e) => setItTds(e.target.value)} placeholder="0.00" />
                            </div>
                            <div className="space-y-1">
                                <Label>LD Deduction</Label>
                                <Input type="number" step="0.01" value={ldDeduction} onChange={(e) => setLdDeduction(e.target.value)} placeholder="0.00" />
                            </div>
                            <div className="space-y-1">
                                <Label>Other Deduction</Label>
                                <Input type="number" step="0.01" value={otherDeduction} onChange={(e) => setOtherDeduction(e.target.value)} placeholder="0.00" />
                            </div>
                        </div>
                    </div>
                )}
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? "Saving..." : "Record Payment Received"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default PaymentReceivedDialog;
