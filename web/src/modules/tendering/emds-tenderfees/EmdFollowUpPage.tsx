import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePaymentRequest } from "@/hooks/api/useEmds";
import { AlertCircle } from "lucide-react";
import { useParams } from "react-router-dom"
const EmdFollowUpPage = () => {
    const { id } = useParams<{ id: string }>()

    if (!id) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>EMD ID is required</AlertDescription>
            </Alert>
        );
    }

    const { data: paymentRequests, isLoading, error } = usePaymentRequest(id ? Number(id) : null);
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                </CardHeader>
            </Card>
        );
    }
    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Failed to load EMD</AlertDescription>
            </Alert>
        );
    }
    return (
        <div>
            <h1>Emd Follow Up {id}</h1>
        </div>
    )
}

export default EmdFollowUpPage
