import { useParams, useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import FinanceDocumentForm from "./components/FinanceDocumentForm";
import { Skeleton } from "@/components/ui/skeleton";
import { useFinanceDocument } from "@/hooks/api/useFinanceDocuments";

const FinanceDocumentEditPage = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const financeDocumentId = id ? parseInt(id, 10) : null;
    const { data: existingData, isLoading, error } = useFinanceDocument(financeDocumentId);

    if (financeDocumentId == null || (id && isNaN(financeDocumentId))) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid Finance Document ID</AlertDescription>
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
                <AlertDescription>Failed to load finance document. Please try again.</AlertDescription>
                <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                    Go Back
                </Button>
            </Alert>
        );
    }

    return (
        <div>
            <FinanceDocumentForm mode="edit" existingData={existingData ?? undefined} />
        </div>
    );
}

export default FinanceDocumentEditPage;
