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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, XCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVendors } from "@/hooks/api/useVendors";
import type { PrivateQuote } from "../helpers/leads-quotation.type";

interface QuotationDroppedModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    quote: PrivateQuote | null;
    onConfirm: (data: {
        missedReason: string;
        oemVendorId: number | null;
        preventRepeat: string;
        tmsImprovement: string;
    }) => Promise<void>;
}

export function QuotationDroppedModal({
    open,
    onOpenChange,
    quote,
    onConfirm,
}: QuotationDroppedModalProps) {
    const [missedReason, setMissedReason] = useState("");
    const [oemVendorId, setOemVendorId] = useState("");
    const [preventRepeat, setPreventRepeat] = useState("");
    const [tmsImprovement, setTmsImprovement] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { data: vendorsList } = useVendors();

    useEffect(() => {
        if (open) {
            setMissedReason("");
            setOemVendorId("");
            setPreventRepeat("");
            setTmsImprovement("");
        }
    }, [open]);

    const handleConfirm = async () => {
        if (!quote) return;
        setIsSubmitting(true);
        try {
            await onConfirm({
                missedReason,
                oemVendorId: oemVendorId ? Number(oemVendorId) : null,
                preventRepeat,
                tmsImprovement,
            });
            handleClose();
        } catch {
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-destructive" />
                        Mark Quotation as Dropped
                    </DialogTitle>
                    <DialogDescription>
                        Record the details for{" "}
                        <strong>{quote?.enquiryNumber || quote?.enqName || "this enquiry"}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="missedReason">
                            Reason for Missing <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id="missedReason"
                            placeholder="Why was the quotation not submitted?"
                            value={missedReason}
                            onChange={(e) => setMissedReason(e.target.value)}
                            className="min-h-[100px]"
                            disabled={isSubmitting}
                        />
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
                        <p className="text-xs text-muted-foreground">
                            Name of the OEM or competitor who secured the order
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="preventRepeat">How to Prevent Repeat</Label>
                        <Textarea
                            id="preventRepeat"
                            placeholder="Describe how this situation can be prevented in the future..."
                            value={preventRepeat}
                            onChange={(e) => setPreventRepeat(e.target.value)}
                            className="min-h-[80px]"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="tmsImprovement">TMS Improvement Suggestions</Label>
                        <Textarea
                            id="tmsImprovement"
                            placeholder="How can TMS improve to prevent this in the future?"
                            value={tmsImprovement}
                            onChange={(e) => setTmsImprovement(e.target.value)}
                            className="min-h-[80px]"
                            disabled={isSubmitting}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="button" variant="destructive" onClick={handleConfirm} disabled={isSubmitting || !missedReason}>
                        {isSubmitting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                        ) : (
                            "Mark as Dropped"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
