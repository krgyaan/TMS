import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRequestSaleInvoiceChanges } from "@/hooks/api/useSaleInvoices";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface RequestRow {
    id: number;
    invoiceNumber: string;
    billingCustomerName: string;
}

interface Props {
    row: RequestRow | null;
    open: boolean;
    onClose: () => void;
}

const RequestChangesDialog = ({ row, open, onClose }: Props) => {
    const requestChangesMutation = useRequestSaleInvoiceChanges();
    const [remark, setRemark] = useState("");

    const handleSubmit = useCallback(async () => {
        if (!row) return;
        if (!remark.trim()) {
            toast.error("Please enter a remark describing the changes needed");
            return;
        }
        await requestChangesMutation.mutateAsync({ id: row.id, remark: remark.trim() });
        setRemark("");
        onClose();
    }, [row, remark, requestChangesMutation, onClose]);

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Request Changes</DialogTitle>
                    <DialogDescription>Request corrections for this invoice draft. The Accounts team will revise the draft and generate a new PDF revision.</DialogDescription>
                </DialogHeader>
                {row && (
                    <div className="space-y-4 py-2">
                        <p className="text-sm"><strong>Invoice:</strong> {row.invoiceNumber}</p>
                        <p className="text-sm"><strong>Customer:</strong> {row.billingCustomerName}</p>
                        <div className="space-y-1">
                            <Label>Changes Remark <span className="text-destructive">*</span></Label>
                            <Textarea
                                rows={4}
                                value={remark}
                                onChange={(e) => setRemark(e.target.value)}
                                placeholder="Describe what needs to be corrected..."
                            />
                        </div>
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={requestChangesMutation.isPending}>
                        {requestChangesMutation.isPending ? "Submitting..." : "Request Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default RequestChangesDialog;