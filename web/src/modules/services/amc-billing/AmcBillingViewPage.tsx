import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAmcBilling } from "@/hooks/api/useAmcBilling";
import { paths } from "@/app/routes/paths";
import { AmcBillingView } from "./components/AmcBillingView";

export default function AmcBillingViewPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const billingId = Number(id);

    const { data: billing, isLoading } = useAmcBilling(billingId);

    if (isLoading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        );
    }

    if (!billing) {
        return <p className="text-sm text-muted-foreground">Billing record not found.</p>;
    }

    return (
        <div className="max-w-5xl mx-auto space-y-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(paths.services.amcBilling)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <AmcBillingView billing={billing} />
        </div>
    );
}
