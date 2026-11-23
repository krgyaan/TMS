import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmdTenderFeeRequestForm } from "./components/EmdTenderFeeRequestForm";
import { useParams } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { usePaymentRequestForEdit } from "@/hooks/api/usePaymentRequests";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { buildEmdEditFormData } from "./helpers/buildEmdEditFormData";

const EMDEditPage = () => {
    const { id } = useParams<{ id: string }>();

    if (!id) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Request ID is required</AlertDescription>
            </Alert>
        );
    }

    const { data: editData, isLoading, error } = usePaymentRequestForEdit(id ? Number(id) : null);

    const { formData, requestIds } = useMemo(() => buildEmdEditFormData(editData), [editData]);

    if (isLoading) {
        return (
            <Card className="m-6">
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[400px] w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error || !editData) {
        return (
            <div className="p-6">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Payment request not found or could not be loaded.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <EmdTenderFeeRequestForm
            tenderId={editData.tenderId}
            requestIds={requestIds}
            initialData={formData}
            mode="edit"
        />
    );
};

export default EMDEditPage;
