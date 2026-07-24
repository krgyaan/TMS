import { useState } from "react";
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
import { Loader2, FileText } from "lucide-react";

interface LeadEnquirySubmitCostingSheetModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    enquiryId: number | null;
    enquiryName?: string;
    onConfirm: (data: {
        enquiryId: number;
        finalPrice?: string | null;
        receiptPreGst?: string | null;
        budgetPreGst?: string | null;
        grossMargin?: string | null;
        remarks?: string | null;
    }) => Promise<void>;
}

export function LeadEnquirySubmitCostingSheetModal({
    open,
    onOpenChange,
    enquiryId,
    enquiryName,
    onConfirm,
}: LeadEnquirySubmitCostingSheetModalProps) {
    const [finalPrice, setFinalPrice] = useState("");
    const [receiptPreGst, setReceiptPreGst] = useState("");
    const [budgetPreGst, setBudgetPreGst] = useState("");
    const [grossMargin, setGrossMargin] = useState("");
    const [remarks, setRemarks] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirm = async () => {
        if (!enquiryId) return;
        setIsSubmitting(true);
        try {
            await onConfirm({
                enquiryId,
                finalPrice: finalPrice || null,
                receiptPreGst: receiptPreGst || null,
                budgetPreGst: budgetPreGst || null,
                grossMargin: grossMargin || null,
                remarks: remarks || null,
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
        setRemarks("");
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Submit Costing Sheet
                    </DialogTitle>
                    <DialogDescription>
                        Fill in the costing details for {enquiryName || "this enquiry"}.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
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
                                placeholder="0.00"
                                value={grossMargin}
                                onChange={(e) => setGrossMargin(e.target.value)}
                                className="pl-8"
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="remarks">Remarks</Label>
                        <Textarea
                            id="remarks"
                            placeholder="Enter any remarks..."
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            className="min-h-[80px]"
                            disabled={isSubmitting}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            "Submit Costing Sheet"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
