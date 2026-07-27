import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle } from "lucide-react";
import { useVendors } from "@/hooks/api/useVendors";

interface ApproveCostingSheetModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    costingId: number | null;
    submittedValues: {
        finalPrice?: string | null;
        receiptPreGst?: string | null;
        budgetPreGst?: string | null;
        grossMargin?: string | null;
    };
    onConfirm: (data: {
        finalPrice?: string | null;
        receiptPreGst?: string | null;
        budgetPreGst?: string | null;
        grossMargin?: string | null;
        oemVendorId?: number | null;
        approvalRemarks?: string | null;
    }) => Promise<void>;
}

export function ApproveCostingSheetModal({
    open,
    onOpenChange,
    costingId,
    submittedValues,
    onConfirm,
}: ApproveCostingSheetModalProps) {
    const { data: vendorsList } = useVendors();
    const [finalPrice, setFinalPrice] = useState("");
    const [receiptPreGst, setReceiptPreGst] = useState("");
    const [budgetPreGst, setBudgetPreGst] = useState("");
    const [grossMargin, setGrossMargin] = useState("");
    const [oemVendorId, setOemVendorId] = useState<string>("");
    const [approvalRemarks, setApprovalRemarks] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setFinalPrice(submittedValues.finalPrice || "");
            setReceiptPreGst(submittedValues.receiptPreGst || "");
            setBudgetPreGst(submittedValues.budgetPreGst || "");
            setGrossMargin(submittedValues.grossMargin || "");
            setOemVendorId("");
            setApprovalRemarks("");
        }
    }, [open, submittedValues]);

    useEffect(() => {
        const receipt = parseFloat(receiptPreGst) || 0;
        const budget = parseFloat(budgetPreGst) || 0;
        if (receipt > 0) {
            setGrossMargin((((receipt - budget) / receipt) * 100).toFixed(2));
        }
    }, [receiptPreGst, budgetPreGst]);

    const handleConfirm = async () => {
        if (!costingId) return;
        setIsSubmitting(true);
        try {
            await onConfirm({
                finalPrice: finalPrice || null,
                receiptPreGst: receiptPreGst || null,
                budgetPreGst: budgetPreGst || null,
                grossMargin: grossMargin || null,
                oemVendorId: oemVendorId ? Number(oemVendorId) : null,
                approvalRemarks: approvalRemarks || null,
            });
            handleClose();
        } catch {
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFinalPrice("");
        setReceiptPreGst("");
        setBudgetPreGst("");
        setGrossMargin("");
        setOemVendorId("");
        setApprovalRemarks("");
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        Approve Costing Sheet
                    </DialogTitle>
                    <DialogDescription>
                        Review and approve the costing sheet. Submitted values are shown below.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="rounded-md bg-muted p-3 space-y-2">
                        <p className="text-sm font-medium">Previously Submitted Values</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>Final Price: <strong>{submittedValues.finalPrice ? `₹${submittedValues.finalPrice}` : '-'}</strong></div>
                            <div>Receipt: <strong>{submittedValues.receiptPreGst ? `₹${submittedValues.receiptPreGst}` : '-'}</strong></div>
                            <div>Budget: <strong>{submittedValues.budgetPreGst ? `₹${submittedValues.budgetPreGst}` : '-'}</strong></div>
                            <div>Gross Margin: <strong>{submittedValues.grossMargin ? `${submittedValues.grossMargin}%` : '-'}</strong></div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="finalPrice">
                            Final Price (GST Inclusive) <span className="text-muted-foreground">(₹)</span>
                        </Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                            <Input
                                id="finalPrice"
                                type="text"
                                placeholder="0.00"
                                value={finalPrice}
                                onChange={(e) => setFinalPrice(e.target.value)}
                                className="pl-8"
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="receiptPreGst">
                            Receipt (Pre GST) <span className="text-muted-foreground">(₹)</span>
                        </Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                            <Input
                                id="receiptPreGst"
                                type="text"
                                placeholder="0.00"
                                value={receiptPreGst}
                                onChange={(e) => setReceiptPreGst(e.target.value)}
                                className="pl-8"
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="budgetPreGst">
                            Budget (Pre GST) <span className="text-muted-foreground">(₹)</span>
                        </Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                            <Input
                                id="budgetPreGst"
                                type="text"
                                placeholder="0.00"
                                value={budgetPreGst}
                                onChange={(e) => setBudgetPreGst(e.target.value)}
                                className="pl-8"
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="grossMargin">
                            Gross Margin <span className="text-muted-foreground">(%)</span>
                        </Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                            <Input
                                id="grossMargin"
                                type="text"
                                value={grossMargin}
                                readOnly
                                className="pl-8 bg-muted"
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="oemVendorId">OEM Name</Label>
                        <Select value={oemVendorId} onValueChange={setOemVendorId} disabled={isSubmitting}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select vendor..." />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.isArray(vendorsList) && vendorsList.map((v: any) => (
                                    <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="approvalRemarks">Remarks</Label>
                        <Textarea
                            id="approvalRemarks"
                            placeholder="Enter approval remarks..."
                            value={approvalRemarks}
                            onChange={(e) => setApprovalRemarks(e.target.value)}
                            className="min-h-[80px]"
                            disabled={isSubmitting}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleConfirm} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Approving...</>
                        ) : "Approve"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}