import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmdTenderFeeRequestForm } from "./components/EmdTenderFeeRequestForm";
import { useParams, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { usePaymentRequestsByTender } from "@/hooks/api/useEmds";
import { useEffect } from "react";
import { useFormContext } from "react-hook-form";

const EMDEditPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    if (!id) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Tender ID is required</AlertDescription>
            </Alert>
        );
    }

    const tenderId = Number(id);
    const { data: paymentRequests, isLoading, error } = usePaymentRequestsByTender(tenderId);

    if (isLoading) {
        return (
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Loading payment requests...</AlertDescription>
            </Alert>
        );
    }

    if (error || !paymentRequests || paymentRequests.length === 0) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    No payment requests found for this tender.
                    <button
                        onClick={() => navigate(`/tendering/emds-tenderfees/create/${tenderId}`)}
                        className="ml-2 text-blue-600 underline"
                    >
                        Create one instead
                    </button>
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Edit EMD & Tender Fee Request</h1>
            <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Note: Instrument type (payment mode) cannot be changed after creation. You can only edit other details.
                </AlertDescription>
            </Alert>
            <EmdTenderFeeRequestForm tenderId={tenderId} />
        </div>
    );
};

export default EMDEditPage;
