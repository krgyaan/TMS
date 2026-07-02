import { useParams, useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import RequestExtensionForm from "./components/RequestExtensionForm";
import { useRequestExtension } from "@/hooks/api/useRequestExtension";
import { Skeleton } from "@/components/ui/skeleton";

const RequestExtensionEditPage = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const tenderId = id ? parseInt(id, 10) : null;

    // Fetch existing data for the form
    const { data: existingData, isLoading, error } = useRequestExtension(tenderId!);

    if (tenderId == null || (id && isNaN(tenderId))) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid Tender ID</AlertDescription>
                <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                    Go Back
                </Button>
            </Alert>
        );
    }

    if (isLoading) {
        return <div className="p-4">
            <Skeleton className="h-10 w-full mb-4" />
            <Skeleton className="h-6 w-full mb-2" />
            <Skeleton className="h-6 w-full mb-2" />
            <Skeleton className="h-6 w-full mb-2" />
        </div>;
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Failed to load Request Extension data. Please try again later.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div>
            <RequestExtensionForm mode="edit" existingData={existingData ?? undefined} />
        </div>
    );
}

export default RequestExtensionEditPage;
