import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAmcService } from "@/hooks/api/useAmcServices";
import { paths } from "@/app/routes/paths";
import { AmcServiceView } from "./components/AmcServiceView";

export default function AmcServiceShowPage() {
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
        return (
            <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => navigate(paths.services.amcServices)}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <p className="text-sm text-muted-foreground">Service record not found.</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 relative">
            <div className="sticky top-[-1rem] z-30 bg-background py-4 -mt-4 border-b border-border shadow-md transition-all">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(paths.services.amcServices)}
                    className="-ml-2"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to AMC Services
                </Button>
            </div>
            <AmcServiceView service={service} />
        </div>
    );
}
