import { useParams } from "react-router-dom";
import { useLoanAdvanceFullDetails } from "@/hooks/api/useLoanAdvance";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import LoanAdvanceView from "./components/LoanAdvanceView";

const LoanAdvanceShowPage = () => {
    const { id } = useParams<{ id: string }>();
    const loanId = Number(id);

    const { data, isLoading, error } = useLoanAdvanceFullDetails(loanId);

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                ))}
            </div>
        );
    }

    if (error || !data) {
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

    return <LoanAdvanceView loanAdvance={data} />
}

export default LoanAdvanceShowPage
