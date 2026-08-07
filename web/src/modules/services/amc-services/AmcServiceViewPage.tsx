import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAmcService } from "@/hooks/api/useAmcServices";
import { paths } from "@/app/routes/paths";
import { AmcServiceView } from "./components/AmcServiceView";

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
        <div className="max-w-5xl mx-auto space-y-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(paths.services.amcServices)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <AmcServiceView service={service} />
        </div>
    );
}
