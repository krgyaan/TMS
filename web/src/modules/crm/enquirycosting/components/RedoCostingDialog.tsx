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
import { Loader2, RefreshCw } from "lucide-react";

interface RedoCostingDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    costingId: number | null;
    onConfirm: (reason: string) => Promise<void>;
}

export function RedoCostingDialog({
    open,
    onOpenChange,
    costingId,
    onConfirm,
}: RedoCostingDialogProps) {
    const [reason, setReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirm = async () => {
        if (!costingId || !reason.trim()) return;
        setIsSubmitting(true);
        try {
            await onConfirm(reason.trim());
            handleClose();
        } catch {
        } finally {
            setIsSubmitting(false);
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
                    <DialogTitle className="flex items-center gap-2 text-amber-600">
                        <RefreshCw className="h-5 w-5" />
                        Redo Costing
                    </DialogTitle>
                    <DialogDescription>
                        Provide a reason for requesting a redo of this costing sheet.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="redoReason">
                            Reason for Redo <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                            id="redoReason"
                            placeholder="Enter the reason why this costing needs to be redone..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="min-h-[120px]"
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
                        variant="default"
                        onClick={handleConfirm}
                        disabled={isSubmitting || !reason.trim()}
                    >
                        {isSubmitting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                        ) : "Request Redo"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}