import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAmcService } from "@/hooks/api/useAmcServices";
import { paths } from "@/app/routes/paths";
import { AmcViewPage } from "@/modules/services/amc/AmcViewPage";

export default function AmcServiceViewPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const serviceId = Number(id);

    const { data: service, isLoading } = useAmcService(serviceId);

    if (isLoading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        );
    }

    if (!service) {
        return <p className="text-sm text-muted-foreground">Service record not found.</p>;
    }

    return (
        <AmcViewPage
            amcId={service.amcId}
            defaultSection="service-details"
            onBack={() => navigate(paths.services.amcServices)}
            backLabel="Back to List"
        />
    );
}
