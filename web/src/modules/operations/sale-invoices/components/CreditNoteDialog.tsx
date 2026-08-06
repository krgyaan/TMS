import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TenderFileUploader } from "@/components/tender-file-upload";
import { useUpdateSaleInvoice } from "@/hooks/api/useSaleInvoices";
import { formatINR } from "@/hooks/useINRFormatter";
import type { SaleInvoiceListRow } from "@/modules/operations/sale-invoices/helpers/saleInvoice.types";
import { useCallback, useMemo, useState } from "react";

interface Props {
    row: SaleInvoiceListRow | null;
    open: boolean;
    onClose: () => void;
}

const CreditNoteDialog = ({ row, open, onClose }: Props) => {
    const updateMutation = useUpdateSaleInvoice();
    const [cnTaxable, setCnTaxable] = useState("");
    const [cnIgst, setCnIgst] = useState("");
    const [cnCgst, setCnCgst] = useState("");
    const [cnSgst, setCnSgst] = useState("");
    const [uploadedPaths, setUploadedPaths] = useState<string[]>([]);

    const cnTotal = useMemo(() => {
        return [cnTaxable, cnIgst, cnCgst, cnSgst].reduce((s, v) => s + (Number(v) || 0), 0);
    }, [cnTaxable, cnIgst, cnCgst, cnSgst]);

    const handleSubmit = useCallback(async () => {
        if (!row) return;
        await updateMutation.mutateAsync({
            id: row.id,
            status: "credit_note",
            cnTaxable: Number(cnTaxable) || 0,
            cnIgst: Number(cnIgst) || 0,
            cnCgst: Number(cnCgst) || 0,
            cnSgst: Number(cnSgst) || 0,
            creditNoteDocPaths: uploadedPaths,
        });
        onClose();
    }, [row, cnTaxable, cnIgst, cnCgst, cnSgst, uploadedPaths, updateMutation, onClose]);

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Credit Note</DialogTitle>
                    <DialogDescription>Enter credit note details for this invoice.</DialogDescription>
                </DialogHeader>
                {row && (
                    <div className="space-y-4 py-2">
                        <p className="text-sm"><strong>Invoice:</strong> {row.invoiceNumber}</p>
                        <p className="text-sm"><strong>Customer:</strong> {row.billingCustomerName}</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>CN Taxable</Label>
                                <Input type="number" step="0.01" value={cnTaxable} onChange={(e) => setCnTaxable(e.target.value)} placeholder="0.00" />
                            </div>
                            <div className="space-y-1">
                                <Label>CN IGST</Label>
                                <Input type="number" step="0.01" value={cnIgst} onChange={(e) => setCnIgst(e.target.value)} placeholder="0.00" />
                            </div>
                            <div className="space-y-1">
                                <Label>CN CGST</Label>
                                <Input type="number" step="0.01" value={cnCgst} onChange={(e) => setCnCgst(e.target.value)} placeholder="0.00" />
                            </div>
                            <div className="space-y-1">
                                <Label>CN SGST</Label>
                                <Input type="number" step="0.01" value={cnSgst} onChange={(e) => setCnSgst(e.target.value)} placeholder="0.00" />
                            </div>
                        </div>
                        <p className="text-sm font-medium">CN Total: {formatINR(cnTotal)}</p>
                        <div className="space-y-1">
                            <Label>Credit Note Documents</Label>
                            <TenderFileUploader context="tender-documents" value={uploadedPaths} onChange={setUploadedPaths} />
                        </div>
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? "Saving..." : "Issue Credit Note"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CreditNoteDialog;
