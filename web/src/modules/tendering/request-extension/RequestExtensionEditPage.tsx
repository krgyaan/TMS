import { useParams, useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import RequestExtensionForm from "./components/RequestExtensionForm";

const RequestExtensionEditPage = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const tenderId = id ? parseInt(id, 10) : null;

    if (tenderId == null || (id && isNaN(tenderId))) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid PQR ID</AlertDescription>
                <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                    Go Back
                </Button>
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
