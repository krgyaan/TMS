import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useWoDetailWithRelations } from "@/hooks/api/useWoDetails";
import { AlertCircle } from "lucide-react";
import { WoDetailView } from "./WoDetailView";

interface WoDetailsSectionProps {
    woDetailId: number;
}

export function WoDetailsSection({ woDetailId }: WoDetailsSectionProps) {
    const { data, isLoading, error } = useWoDetailWithRelations(woDetailId);

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Failed to load WO details.</AlertDescription>
            </Alert>
        );
    }

    if (isLoading) {
        return (
            <div className="space-y-3">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }

    if (!data) {
        return <p className="text-sm text-muted-foreground italic">No WO details found.</p>;
    }

    return <WoDetailView data={data} />;
}
