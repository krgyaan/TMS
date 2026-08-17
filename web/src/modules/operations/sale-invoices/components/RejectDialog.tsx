import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRejectSaleInvoice } from "@/hooks/api/useSaleInvoices";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface RejectRow {
    id: number;
    invoiceNumber: string;
    billingCustomerName: string;
}

interface Props {
    row: RejectRow | null;
    open: boolean;
    onClose: () => void;
}

const RejectDialog = ({ row, open, onClose }: Props) => {
    const rejectMutation = useRejectSaleInvoice();
    const [remark, setRemark] = useState("");

    const handleSubmit = useCallback(async () => {
        if (!row) return;
        if (!remark.trim()) {
            toast.error("Please enter a remark explaining the rejection");
            return;
        }
        await rejectMutation.mutateAsync({ id: row.id, remark: remark.trim() });
        setRemark("");
        onClose();
    }, [row, remark, rejectMutation, onClose]);

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Reject Request</DialogTitle>
                    <DialogDescription>Reject this sale invoice request. The reserved PO quantity will be released for future invoices.</DialogDescription>
                </DialogHeader>
                {row && (
                    <div className="space-y-4 py-2">
                        <p className="text-sm"><strong>Invoice:</strong> {row.invoiceNumber}</p>
                        <p className="text-sm"><strong>Customer:</strong> {row.billingCustomerName}</p>
                        <div className="space-y-1">
                            <Label>Rejection Remark <span className="text-destructive">*</span></Label>
                            <Textarea
                                rows={4}
                                value={remark}
                                onChange={(e) => setRemark(e.target.value)}
                                placeholder="Explain why this request is being rejected..."
                            />
                        </div>
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button variant="destructive" onClick={handleSubmit} disabled={rejectMutation.isPending}>
                        {rejectMutation.isPending ? "Submitting..." : "Reject Request"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default RejectDialog;