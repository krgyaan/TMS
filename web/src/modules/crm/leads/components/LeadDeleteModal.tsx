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
import { Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LeadDeleteModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    leadId: number | null;
    leadName?: string;
    onConfirm: (leadId: number, reason?: string) => Promise<void>;
}

export function LeadDeleteModal({
    open,
    onOpenChange,
    leadId,
    leadName,
    onConfirm,
}: LeadDeleteModalProps) {
    const [reason, setReason] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    const handleConfirm = async () => {
        if (!leadId) return;
        setIsDeleting(true);
        try {
            // ← reason is now properly passed and saved
            await onConfirm(leadId, reason || undefined);
            handleClose();
        } catch (error) {
            console.error("Delete failed:", error);
        } finally {
            setIsDeleting(false);
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
                        <AlertTriangle className="h-5 w-5" />
                        Disqualify Lead
                    </DialogTitle>
                    <DialogDescription>
                        This lead will be marked as disqualified and moved to the Disqualified tab.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            You are about to disqualify:{" "}
                            <strong>{leadName || "this lead"}</strong>
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                        <Label htmlFor="reason">
                            Reason for disqualification{" "}
                            <span className="text-muted-foreground">(Optional)</span>
                        </Label>
                        <Textarea
                            id="reason"
                            placeholder="Enter the reason for disqualifying this lead..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="min-h-[100px]"
                            disabled={isDeleting}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={isDeleting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            "Disqualify Lead"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}