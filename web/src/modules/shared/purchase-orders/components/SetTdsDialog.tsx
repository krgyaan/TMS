import SelectField from "@/components/form/SelectField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useSetTdsPercentage } from "@/hooks/api/useProjectDashboard";
import { formatINR } from "@/hooks/useINRFormatter";
import type { PurchaseOrderRow } from "@/modules/operations/project-dashboard/helpers/projectDashboard.types";
import { Loader2 } from "lucide-react";
import React, { useMemo, useState } from "react";

const TDS_RATES = [
    { value: "194C_1", label: "194C @1%" },
    { value: "194C_2", label: "194C @2%" },
    { value: "194J_10", label: "194J @10%" },
    { value: "194J_2", label: "194J @2%" },
    { value: "194A_10", label: "194A @10%" },
    { value: "192B_10", label: "192B @10%" },
    { value: "194I_2", label: "194I @2%" },
    { value: "194I_10", label: "194I @10%" },
    { value: "194H_2", label: "194H @2%" },
];

interface SetTdsDialogProps {
    po: PurchaseOrderRow;
    open: boolean;
    onClose: () => void;
}

export const SetTdsDialog: React.FC<SetTdsDialogProps> = ({ po, open, onClose }) => {
    const currentTdsPct = po.tdsPercentage ? Number(po.tdsPercentage) : 0;
    const [selectedRate, setSelectedRate] = useState(
        TDS_RATES.some(r => Number(r.value) === currentTdsPct) ? String(currentTdsPct) : "__custom__"
    );
    const [customRate, setCustomRate] = useState(
        TDS_RATES.some(r => Number(r.value) === currentTdsPct) ? "" : String(currentTdsPct)
    );

    const tdsPercentage = useMemo(() => {
        if (selectedRate === "__custom__") {
            return Number(customRate) || 0;
        }
        return Number(selectedRate);
    }, [selectedRate, customRate]);

    const tdsAmount = useMemo(() => {
        return (po.grandTotal * tdsPercentage) / 100;
    }, [po.grandTotal, tdsPercentage]);

    const amountAfterTds = useMemo(() => {
        return po.grandTotal - tdsAmount;
    }, [po.grandTotal, tdsAmount]);

    const { mutate: saveTds, isPending } = useSetTdsPercentage();

    const handleSave = () => {
        saveTds(
            { id: po.id, data: { tdsPercentage } },
            { onSuccess: () => onClose() }
        );
    };

    const hasChanged = tdsPercentage !== currentTdsPct;

    return (
        <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Set TDS for {po.poNumber}</DialogTitle>
                    <DialogDescription>
                        Select TDS percentage to deduct. Amount after TDS will be the maximum limit for payment requests.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <SelectField
                            control={}
                            label="Custom TDS Rate"
                            options={TDS_RATES}
                            name="selectedRate"
                        />
                    </div>

                    <Separator />

                    <div className="space-y-2 text-sm">
                        <h4 className="font-medium text-base">Summary</h4>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Total (Pre-GST)</span>
                            <span>{formatINR(po.totalAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">GST Amount</span>
                            <span>{formatINR(po.totalGstAmt)}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                            <span>Grand Total</span>
                            <span>{formatINR(po.grandTotal)}</span>
                        </div>

                        <Separator />

                        <div className="flex justify-between text-destructive">
                            <span>TDS @ {tdsPercentage}%</span>
                            <span>- {formatINR(tdsAmount)}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-base">
                            <span>Amount After TDS</span>
                            <span>{formatINR(amountAfterTds)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            This amount will be the maximum limit for raising payment requests against this PO.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={!hasChanged || isPending || tdsPercentage <= 0}>
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
