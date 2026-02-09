import { useParams, useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { paths } from "@/app/routes/paths";
import PqrForm from "./components/PqrForm";
import { Skeleton } from "@/components/ui/skeleton";

const PqrEditPage = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const pqrId = id ? parseInt(id) : null;

    // TODO: Replace with actual API hook when available
    // const { data: existingData, isLoading } = usePqr(pqrId);

    if (!pqrId) {
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

    // TODO: Uncomment when API hook is available
    // if (isLoading) {
    //     return <Skeleton className="h-[400px] w-full" />;
    // }

    return (
        <div>
            <PqrForm mode="edit" existingData={undefined} />
        </div>
    );
}

export default PqrEditPage;
