import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateSaleInvoice } from "@/hooks/api/useSaleInvoices";
import { formatINR } from "@/hooks/useINRFormatter";
import type { SaleInvoiceListRow } from "@/modules/operations/sale-invoices/helpers/saleInvoice.types";
import { useCallback, useMemo, useState } from "react";

interface Props {
    row: SaleInvoiceListRow | null;
    open: boolean;
    onClose: () => void;
}

const HoldAmountDialog = ({ row, open, onClose }: Props) => {
    const updateMutation = useUpdateSaleInvoice();
    const [gstIgst, setGstIgst] = useState("");
    const [gstCgst, setGstCgst] = useState("");
    const [gstSgst, setGstSgst] = useState("");
    const [itc, setItc] = useState("");
    const [retention, setRetention] = useState("");
    const [buyback, setBuyback] = useState("");
    const [other, setOther] = useState("");

    const totalHold = useMemo(() => {
        return [gstIgst, gstCgst, gstSgst, itc, retention, buyback, other]
            .reduce((s, v) => s + (Number(v) || 0), 0);
    }, [gstIgst, gstCgst, gstSgst, itc, retention, buyback, other]);

    const handleSubmit = useCallback(async () => {
        if (!row) return;
        await updateMutation.mutateAsync({
            id: row.id,
            holdGstIgst: Number(gstIgst) || 0,
            holdGstCgst: Number(gstCgst) || 0,
            holdGstSgst: Number(gstSgst) || 0,
            holdItc: Number(itc) || 0,
            holdRetention: Number(retention) || 0,
            holdBuyback: Number(buyback) || 0,
            holdOther: Number(other) || 0,
        });
        onClose();
    }, [row, gstIgst, gstCgst, gstSgst, itc, retention, buyback, other, updateMutation, onClose]);

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Hold Amount</DialogTitle>
                    <DialogDescription>Set hold amounts for this invoice.</DialogDescription>
                </DialogHeader>
                {row && (
                    <div className="space-y-4 py-2">
                        <p className="text-sm"><strong>Invoice:</strong> {row.invoiceNumber}</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>GST IGST</Label>
                                <Input type="number" step="0.01" value={gstIgst} onChange={(e) => setGstIgst(e.target.value)} placeholder="0.00" />
                            </div>
                            <div className="space-y-1">
                                <Label>GST CGST</Label>
                                <Input type="number" step="0.01" value={gstCgst} onChange={(e) => setGstCgst(e.target.value)} placeholder="0.00" />
                            </div>
                            <div className="space-y-1">
                                <Label>GST SGST</Label>
                                <Input type="number" step="0.01" value={gstSgst} onChange={(e) => setGstSgst(e.target.value)} placeholder="0.00" />
                            </div>
                            <div className="space-y-1">
                                <Label>ITC</Label>
                                <Input type="number" step="0.01" value={itc} onChange={(e) => setItc(e.target.value)} placeholder="0.00" />
                            </div>
                            <div className="space-y-1">
                                <Label>Retention (Security)</Label>
                                <Input type="number" step="0.01" value={retention} onChange={(e) => setRetention(e.target.value)} placeholder="0.00" />
                            </div>
                            <div className="space-y-1">
                                <Label>Buyback</Label>
                                <Input type="number" step="0.01" value={buyback} onChange={(e) => setBuyback(e.target.value)} placeholder="0.00" />
                            </div>
                            <div className="space-y-1 col-span-2">
                                <Label>Other Hold</Label>
                                <Input type="number" step="0.01" value={other} onChange={(e) => setOther(e.target.value)} placeholder="0.00" />
                            </div>
                        </div>
                        <p className="text-sm font-medium">Total Hold Amount: {formatINR(totalHold)}</p>
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? "Saving..." : "Save Hold Amounts"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default HoldAmountDialog;
