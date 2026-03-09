import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoanAdvance } from "@/hooks/api/useLoanAdvance";
import { AlertCircle } from "lucide-react";
import { useParams } from "react-router-dom";
import TdsRecoveredForm from "./components/TdsRecoveredForm";

const LoanTdsPage = () => {
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
    return <TdsRecoveredForm loanId={loanId} totalTdsToRecover={loanAdvance.totalTdsToRecover} />
}

export default LoanTdsPage;
