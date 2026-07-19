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

const UploadInvoiceDialog = ({ row, open, onClose }: Props) => {
    const updateMutation = useUpdateSaleInvoice();
    const [taxable, setTaxable] = useState("");
    const [igst, setIgst] = useState("");
    const [cgst, setCgst] = useState("");
    const [sgst, setSgst] = useState("");
    const [uploadedPaths, setUploadedPaths] = useState<string[]>([]);

    const total = useMemo(() => {
        return [taxable, igst, cgst, sgst].reduce((s, v) => s + (Number(v) || 0), 0);
    }, [taxable, igst, cgst, sgst]);

    const handleSubmit = useCallback(async () => {
        if (!row) return;
        await updateMutation.mutateAsync({
            id: row.id,
            status: "invoiced",
            invoiceTaxableAmount: Number(taxable) || 0,
            invoiceIgst: Number(igst) || 0,
            invoiceCgst: Number(cgst) || 0,
            invoiceSgst: Number(sgst) || 0,
            invoiceDocPaths: uploadedPaths,
        });
        onClose();
    }, [row, taxable, igst, cgst, sgst, uploadedPaths, updateMutation, onClose]);

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Upload Invoice</DialogTitle>
                    <DialogDescription>Enter invoice financial details and upload the document.</DialogDescription>
                </DialogHeader>
                {row && (
                    <div className="space-y-4 py-2">
                        <p className="text-sm"><strong>Invoice:</strong> {row.invoiceNumber}</p>
                        <p className="text-sm"><strong>Customer:</strong> {row.billingCustomerName}</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>Taxable Amount</Label>
                                <Input type="number" step="0.01" value={taxable} onChange={(e) => setTaxable(e.target.value)} placeholder="0.00" />
                            </div>
                            <div className="space-y-1">
                                <Label>IGST</Label>
                                <Input type="number" step="0.01" value={igst} onChange={(e) => setIgst(e.target.value)} placeholder="0.00" />
                            </div>
                            <div className="space-y-1">
                                <Label>CGST</Label>
                                <Input type="number" step="0.01" value={cgst} onChange={(e) => setCgst(e.target.value)} placeholder="0.00" />
                            </div>
                            <div className="space-y-1">
                                <Label>SGST</Label>
                                <Input type="number" step="0.01" value={sgst} onChange={(e) => setSgst(e.target.value)} placeholder="0.00" />
                            </div>
                        </div>
                        <p className="text-sm font-medium">Invoice Total: {formatINR(total)}</p>
                        <div className="space-y-1">
                            <Label>Invoice Documents</Label>
                            <TenderFileUploader context="tender-documents" value={uploadedPaths} onChange={setUploadedPaths} />
                        </div>
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? "Saving..." : "Mark as Invoiced"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default UploadInvoiceDialog;
