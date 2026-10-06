import React, { useEffect, useState } from "react";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { formatINR } from "@/hooks/useINRFormatter";
import { round2, CLOSURE_TOLERANCE } from "@/utils/money";

interface CloseClosureDialogProps {
    open: boolean;
    onClose: () => void;
    /** Called with the trimmed, non-empty closure note. */
    onConfirm: (closureNote: string) => void;
    pending?: boolean;
    /** API error from the last close attempt, shown above the footer. */
    error?: string | null;
    /** e.g. "Close Purchase Order" */
    title: string;
    /** PO / VWO number shown in the header */
    referenceNo: string;
    amountAfterTds: number;
    totalPaymentDone: number;
    totalPiAmount: number;
}

/**
 * Confirmation dialog for closing a PO/VWO: shows the reconciliation summary
 * (including any sub-₹10 round-off difference) and collects the mandatory
 * closure note that gets stored alongside `closed_at` / `closed_by`.
 */
export const CloseClosureDialog: React.FC<CloseClosureDialogProps> = ({
    open,
    onClose,
    onConfirm,
    pending = false,
    error = null,
    title,
    referenceNo,
    amountAfterTds,
    totalPaymentDone,
    totalPiAmount,
}) => {
    const [note, setNote] = useState("");

    useEffect(() => {
        if (!open) setNote("");
    }, [open]);

    const effective = round2(amountAfterTds);
    const paid = round2(totalPaymentDone);
    const invoiced = round2(totalPiAmount);
    const remainingToPay = round2(effective - paid);
    const remainingInvoice = round2(effective - invoiced);
    const isWithinTolerance = (r: number) => r > 0 && r < CLOSURE_TOLERANCE;

    const trimmed = note.trim();
    const canConfirm = trimmed.length > 0 && !pending;

    const handleConfirm = () => {
        if (!canConfirm) return;
        onConfirm(trimmed);
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && !pending && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {title} — {referenceNo}
                    </DialogTitle>
                    <DialogDescription>
                        Review the reconciliation summary below. A closure note is required and will be stored with
                        this closure for audit.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2 rounded-lg border p-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Amount after TDS</span>
                            <span className="font-medium">{formatINR(effective)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Payment done</span>
                            <span>{formatINR(paid)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Invoice received</span>
                            <span>{formatINR(invoiced)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Remaining to pay</span>
                            <span>{remainingToPay > 0 ? formatINR(remainingToPay) : "—"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Remaining invoice</span>
                            <span>{remainingInvoice > 0 ? formatINR(remainingInvoice) : "—"}</span>
                        </div>
                    </div>

                    {(isWithinTolerance(remainingToPay) || isWithinTolerance(remainingInvoice)) && (
                        <p className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            A small difference
                            {isWithinTolerance(remainingToPay) && ` — ${formatINR(remainingToPay)} payable`}
                            {isWithinTolerance(remainingToPay) && isWithinTolerance(remainingInvoice) && " and"}
                            {isWithinTolerance(remainingInvoice) && ` — ${formatINR(remainingInvoice)} uninvoiced`}
                            {" "}will be absorbed as round-off (within the ₹{CLOSURE_TOLERANCE} closure tolerance).
                        </p>
                    )}

                    <div>
                        <Label htmlFor="closure-note">Closure note (required)</Label>
                        <Textarea
                            id="closure-note"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Reason for closing this PO/VWO, e.g. all payments settled and invoices received"
                            rows={3}
                            className="mt-1"
                        />
                        {!trimmed && open && (
                            <p className="text-xs text-muted-foreground mt-1">A closure note is mandatory.</p>
                        )}
                    </div>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={pending}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={!canConfirm} className="bg-green-600 hover:bg-green-700">
                        {pending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                        Confirm & Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CloseClosureDialog;
