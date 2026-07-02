import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoanAdvance } from "@/hooks/api/useLoanAdvance";
import { AlertCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import TdsRecoveredForm from "./components/TdsRecoveredForm";
import { Separator } from "@/components/ui/separator";
import TdsRecoveryHistory from "./components/TdsRecoveryHistory";
import { paths } from "@/app/routes/paths";

const LoanTdsPage = () => {
    const navigate = useNavigate();
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
    return (
        <>
            <TdsRecoveredForm loanId={loanId} totalTdsToRecover={loanAdvance.totalTdsToRecover} onCancel={() => navigate(paths.accounts.loanAdvances)} />
            <Separator className="my-5" />
            <TdsRecoveryHistory loanId={loanId} />
        </>
    )
}

export default LoanTdsPage;
