import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatINR } from "@/hooks/useINRFormatter";
import { useSetTdsPercentage } from "@/hooks/api/usePurchaseOrders";
import { Loader2 } from "lucide-react";
import type { PurchaseOrderRow } from "@/modules/operations/purchase-orders/helpers/purchaseOrder.types";
import SelectField from "@/components/form/SelectField";
import { Form } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const TDS_RATES = [
    { value: "194C_1", label: "194C @1%" },
    { value: "194C_2", label: "194C @2%" },
    { value: "194J_2", label: "194J @2%" },
    { value: "194J_10", label: "194J @10%" },
    { value: "194A_10", label: "194A @10%" },
    { value: "192B_10", label: "192B @10%" },
    { value: "194I_2", label: "194I @2%" },
    { value: "194I_10", label: "194I @10%" },
    { value: "194H_2", label: "194H @2%" },
];

function parsePercentage(rateValue: string): number {
    const parts = rateValue.split("_");
    return Number(parts.at(-1)) || 0;
}

interface SetTdsDialogProps {
    po: PurchaseOrderRow;
    open: boolean;
    onClose: () => void;
}

interface TdsFormValues {
    tdsRate: string;
}

export const SetTdsDialog: React.FC<SetTdsDialogProps> = ({ po, open, onClose }) => {
    const currentTdsPct = po.tdsPercentage ? Number(po.tdsPercentage) : 0;
    const matchingRate = TDS_RATES.find(r => parsePercentage(r.value) === currentTdsPct);

    const [action, setAction] = useState<"approve" | "reject">("approve");
    const [remark, setRemark] = useState("");

    const form = useForm<TdsFormValues>({
        defaultValues: { tdsRate: matchingRate?.value ?? "" },
    });

    const selectedRate = form.watch("tdsRate");
    const isReject = action === "reject";

    const tdsPercentage = selectedRate ? parsePercentage(selectedRate) : 0;
    const subtotal = Number(po.totalAmount) || 0;
    const grandTotal = Number(po.grandTotal) || 0;
    const tdsAmount = (subtotal * tdsPercentage) / 100;
    const amountAfterTds = grandTotal - tdsAmount;

    const { mutate: saveTds, isPending } = useSetTdsPercentage();

    const handleSave = () => {
        if (isReject) {
            saveTds(
                { id: po.id, data: { approve: false, remark } },
                { onSuccess: () => onClose() }
            );
        } else {
            if (!selectedRate || tdsPercentage <= 0) return;
            saveTds(
                { id: po.id, data: { approve: true, tdsPercentage, remark } },
                { onSuccess: () => onClose() }
            );
        }
    };

    const canSave = isReject || (selectedRate && tdsPercentage > 0);
    const selectedLabel = TDS_RATES.find(r => r.value === selectedRate)?.label ?? "";

    const selectOptions = useMemo(() => TDS_RATES.map(r => ({ value: r.value, label: r.label })), []);

    return (
        <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Approve / Reject TDS for {po.poNumber}</DialogTitle>
                    <DialogDescription>
                        Select whether to approve TDS deduction or reject it with a remark.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <div className="space-y-4 py-2">
                        <RadioGroup
                            value={action}
                            onValueChange={(v) => setAction(v as "approve" | "reject")}
                            className="flex gap-6"
                        >
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="approve" id="approve" />
                                <Label htmlFor="approve">Approve</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="reject" id="reject" />
                                <Label htmlFor="reject">Reject</Label>
                            </div>
                        </RadioGroup>

                        {!isReject && (
                            <>
                                <SelectField
                                    control={form.control}
                                    name="tdsRate"
                                    label="TDS Section"
                                    options={selectOptions}
                                    placeholder="Select TDS rate"
                                />

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
                                        <span>TDS {selectedLabel}</span>
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
                            </>
                        )}

                        <div>
                            <Label htmlFor="remark">Remark (optional)</Label>
                            <Textarea
                                id="remark"
                                value={remark}
                                onChange={(e) => setRemark(e.target.value)}
                                placeholder={isReject ? "Reason for rejection" : "Additional notes"}
                                rows={3}
                                className="mt-1"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleSave} disabled={!canSave || isPending}>
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {isReject ? "Reject & Save" : "Approve & Save"}
                        </Button>
                    </DialogFooter>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
