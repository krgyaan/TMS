import { useNavigate, useParams } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { paths } from "@/app/routes/paths";
import { useImprestDetail } from "@/hooks/api/imprest.hooks";
import { ImprestForm } from "./components/ImprestForm";

export default function EditImprestPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const imprestId = Number(id);

    const { data: imprest, isLoading, isError, error } = useImprestDetail(imprestId);

    if (isLoading) {
        return (
            <div className="container mx-auto py-6 space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (isError || !imprest) {
        return (
            <div className="container mx-auto py-6">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        {error instanceof Error ? error.message : "Imprest not found or failed to load."}
                        <Button
                            variant="outline"
                            size="sm"
                            className="ml-4"
                            onClick={() => navigate(paths.shared.imprest)}
                        >
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Back to List
                        </Button>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return <ImprestForm key={imprest.id} imprest={imprest} mode="edit" />;
}