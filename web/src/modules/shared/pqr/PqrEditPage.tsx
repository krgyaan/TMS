import { useParams, useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import PqrForm from "./components/PqrForm";
import { Skeleton } from "@/components/ui/skeleton";
import { usePqr } from "@/hooks/api/usePqrs";

const PqrEditPage = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const pqrId = id ? parseInt(id, 10) : null;
    const { data: existingData, isLoading, error } = usePqr(pqrId);

    if (pqrId == null || (id && isNaN(pqrId))) {
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

    if (isLoading) {
        return <Skeleton className="h-[400px] w-full" />;
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Failed to load PQR. Please try again.</AlertDescription>
                <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                    Go Back
                </Button>
            </Alert>
        );
    }

    return (
        <div>
            <PqrForm mode="edit" existingData={existingData ?? undefined} />
        </div>
    );
}

export default PqrEditPage;
