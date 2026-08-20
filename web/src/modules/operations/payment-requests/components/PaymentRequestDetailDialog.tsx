import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePaymentRequestDetails } from "@/hooks/api/useProjectPaymentRequests";
import type { PaymentRequestRow } from "@/modules/operations/payment-requests/helpers/paymentRequest.types";
import { PaymentRequestDetailFields } from "./PaymentRequestDetailFields";

interface PaymentRequestDetailDialogProps {
    viewingId: number | null;
    onClose: () => void;
}

export const PaymentRequestDetailDialog: React.FC<PaymentRequestDetailDialogProps> = ({ viewingId, onClose }) => {
    const { data: detailData, isLoading: isDetailLoading } = usePaymentRequestDetails(viewingId ?? 0);
    const detail = detailData as PaymentRequestRow | undefined;

    let dialogContent: React.ReactNode;
    if (isDetailLoading) {
        dialogContent = (
            <div className="space-y-4 py-4">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
        );
    } else if (detail) {
        dialogContent = <PaymentRequestDetailFields detail={detail} />;
    } else {
        dialogContent = (
            <p className="text-muted-foreground py-4 text-center">No details found.</p>
        );
    }

    return (
        <Dialog open={viewingId !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Payment Request Details</DialogTitle>
                    <DialogDescription>
                        Full details of the selected payment request
                    </DialogDescription>
                </DialogHeader>
                {dialogContent}
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
