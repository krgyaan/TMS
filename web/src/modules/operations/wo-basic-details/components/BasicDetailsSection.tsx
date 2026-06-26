import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useWoBasicDetailById } from "@/hooks/api/useWoBasicDetails";
import { useWoContactsByBasicDetail } from "@/hooks/api/useWoContacts";
import { AlertCircle } from "lucide-react";
import BasicDetailView from "./BasicDetailView";

interface BasicDetailsSectionProps {
    woBasicDetailId: number;
}

export function BasicDetailsSection({ woBasicDetailId }: BasicDetailsSectionProps) {
    const { data, isLoading, error } = useWoBasicDetailById(woBasicDetailId);
    const { data: contactsData } = useWoContactsByBasicDetail(woBasicDetailId);

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Failed to load basic details.</AlertDescription>
            </Alert>
        );
    }

    if (isLoading) {
        return (
            <div className="space-y-3">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-32 w-full" />
            </div>
        );
    }

    if (!data) {
        return <p className="text-sm text-muted-foreground italic">No basic details found.</p>;
    }

    return <BasicDetailView data={data} contacts={contactsData} />;
}
