import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AmcView } from "./components/AmcView";
import { useAmc } from "@/hooks/api/useAmc";
import { paths } from "@/app/routes/paths";

export default function AmcViewPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const amcId = Number(id);

    const { data: amc, isLoading } = useAmc(amcId);

    if (isLoading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        );
    }

    if (!amc) {
        return <p className="text-sm text-muted-foreground">AMC not found.</p>;
    }

    return (
        <div className="max-w-7xl mx-auto space-y-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(paths.services.amc)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <AmcView amc={amc} />
        </div>
    );
}