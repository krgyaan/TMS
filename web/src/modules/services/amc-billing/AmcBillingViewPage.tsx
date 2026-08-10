import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAmcBilling } from "@/hooks/api/useAmcBilling";
import { paths } from "@/app/routes/paths";
import { AmcViewPage } from "@/modules/services/amc/AmcViewPage";

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
        <AmcViewPage
            amcId={billing.amcId}
            defaultSection="billing-details"
            onBack={() => navigate(paths.services.amcBilling)}
            backLabel="Back to List"
        />
    );
}
