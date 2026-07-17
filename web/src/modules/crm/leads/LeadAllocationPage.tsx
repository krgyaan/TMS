import { useParams, useNavigate } from "react-router-dom";
import { LeadAllocationForm } from "./components/LeadAllocationForm";
import { paths } from "@/app/routes/paths";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LeadAllocationPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const leadId = id ? Number(id) : null;

    if (!leadId || isNaN(leadId)) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Invalid lead ID.
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

    return <LeadAllocationForm leadId={leadId} />;
}