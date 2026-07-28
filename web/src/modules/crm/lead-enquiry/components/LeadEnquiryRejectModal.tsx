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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LeadEnquiryRejectModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    enquiryId: number | null;
    enquiryName?: string;
    onConfirm: (enquiryId: number, reason?: string) => Promise<void>;
}

export function LeadEnquiryRejectModal({
    open,
    onOpenChange,
    enquiryId,
    enquiryName,
    onConfirm,
}: LeadEnquiryRejectModalProps) {
    const [reason, setReason] = useState("");
    const [isRejecting, setIsRejecting] = useState(false);

    const handleConfirm = async () => {
        if (!enquiryId) return;
        setIsRejecting(true);
        try {
            await onConfirm(enquiryId, reason || undefined);
            handleClose();
        } catch (error) {
            console.error("Reject failed:", error);
        } finally {
            setIsRejecting(false);
        }
    };

    const handleClose = () => {
        setReason("");
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                        <XCircle className="h-5 w-5" />
                        Reject Enquiry
                    </DialogTitle>
                    <DialogDescription>
                        This enquiry will be marked as Rejected.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>
                            You are about to reject:{" "}
                            <strong>{enquiryName || "this enquiry"}</strong>
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                        <Label htmlFor="reason">
                            Reason for rejection{" "}
                            <span className="text-muted-foreground">(Optional)</span>
                        </Label>
                        <Textarea
                            id="reason"
                            placeholder="Enter the reason for rejecting this enquiry..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="min-h-[100px]"
                            disabled={isRejecting}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={isRejecting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={isRejecting}
                    >
                        {isRejecting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Rejecting...
                            </>
                        ) : (
                            "Reject Enquiry"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
