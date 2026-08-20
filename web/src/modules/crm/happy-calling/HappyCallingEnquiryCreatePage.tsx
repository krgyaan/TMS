import { useParams } from "react-router-dom";
import { LeadEnquiryForm } from "../lead-enquiry/components/LeadEnquiryForm";
import { useHappyCalling } from "@/hooks/api/useHappyCalling";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function HappyCallingEnquiryCreatePage() {
    const { id } = useParams<{ id: string }>();
    const happyCallingId = id ? Number(id) : null;
    const { data: record, isLoading } = useHappyCalling(happyCallingId);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (!record) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Happy Calling record not found or failed to load.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <LeadEnquiryForm
            mode="create"
            defaultHappyCallingId={happyCallingId}
            prefillOrganizationName={record.organization ?? undefined}
        />
    );
}