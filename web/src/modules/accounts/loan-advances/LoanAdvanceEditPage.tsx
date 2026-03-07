import { useParams } from "react-router-dom";
import LoanAdvanceForm from "./components/LoanAdvanceForm"
import { useLoanAdvance } from "@/hooks/api/useLoanAdvance";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const LoanAdvanceEditPage = () => {
    const { id } = useParams<{ id: string }>();
    const loanId = Number(id);

    const { data: loanAdvance, isLoading, error } = useLoanAdvance(loanId);

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                ))}
            </div>
        );
    }

    if (error || !loanAdvance) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                    Failed to load loan advance data. Please try again later.
                </AlertDescription>
            </Alert>
        );
    }

    return <LoanAdvanceForm mode="edit" existingData={loanAdvance} />
}

export default LoanAdvanceEditPage
