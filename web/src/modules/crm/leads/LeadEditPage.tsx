import { useParams, useNavigate } from "react-router-dom";
import { LeadForm } from "./components/LeadForm";
import { useLead } from "@/hooks/api/useLeads";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { paths } from "@/app/routes/paths";

export default function LeadEditPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: lead, isLoading, error } = useLead(id ? Number(id) : null);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (error || !lead) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Lead not found or failed to load.
                    <Button
                        variant="outline"
                        size="sm"
                        className="ml-4"
                        onClick={() => navigate(paths.crm.leads)}
                    >
                        Back to List
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    return <LeadForm key={lead.id} lead={lead} mode="edit" />;
}