import { useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useInsurancePolicy } from "@/hooks/api/useInsurancePolicies";
import { InsurancePolicyForm } from "./InsurancePolicyForm";

const InsuranceEditPage = () => {
    const { id } = useParams<{ id: string }>();
    const policyId = Number(id);
    const { data: policy, isLoading, error } = useInsurancePolicy(policyId);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-40 w-full" />
            </div>
        );
    }

    if (error || !policy) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Failed to load insurance policy.</AlertDescription>
            </Alert>
        );
    }

    return <InsurancePolicyForm mode="edit" existingData={policy} />;
};

export default InsuranceEditPage;