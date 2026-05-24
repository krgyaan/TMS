import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useWoDetailWithRelations } from "@/hooks/api/useWoDetails";
import { AlertCircle } from "lucide-react";
import BasicDetailView from "./BasicDetailView";

interface BasicDetailsSectionProps {
    woDetailId: number;
}

export function BasicDetailsSection({ woDetailId }: BasicDetailsSectionProps) {
    const { data, isLoading, error } = useWoDetailWithRelations(woDetailId);

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

    if (!data?.woBasicDetail) {
        return <p className="text-sm text-muted-foreground italic">No basic details found.</p>;
    }

    return <BasicDetailView data={data.woBasicDetail} contacts={data.contacts} />;
}
