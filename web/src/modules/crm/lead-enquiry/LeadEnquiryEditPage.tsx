import { useParams, useNavigate } from "react-router-dom";
import { LeadEnquiryForm } from "./components/LeadEnquiryForm";
import { useLeadEnquiry } from "@/hooks/api/useLeadEnquiry";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { paths } from "@/app/routes/paths";

export default function LeadEnquiryEditPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: enquiry, isLoading, error } = useLeadEnquiry(id ? Number(id) : null);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (error || !enquiry) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Enquiry not found or failed to load.
                    <Button variant="outline" size="sm" className="ml-4" onClick={() => navigate(paths.crm.enquiries)}>
                        Back to List
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    return <LeadEnquiryForm key={enquiry.id} enquiry={enquiry} mode="edit" />;
}
