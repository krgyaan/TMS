import { useParams, useSearchParams } from "react-router-dom";
import { WoDetailsWizard } from "./components/WoDetailsWizard";
import { useWoDetailById } from "@/hooks/api/useWoDetails";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const WoDetailEditPage = () => {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const pageParam = searchParams.get("page");

    const { data: woDetail, isLoading, error } = useWoDetailById(Number(id));

    if (isLoading) {
        return (
            <div className="flex flex-col gap-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (error || !woDetail) {
        return (
            <div className="flex flex-col gap-4">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        Failed to load WO Details. The record may not exist or you may not have permission to view it.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <WoDetailsWizard
                mode="edit"
                woBasicDetailId={woDetail.woBasicDetailId}
                woDetailId={Number(id)}
                existingData={woDetail}
                initialPage={pageParam ? Number(pageParam) : woDetail.currentPage}
            />
        </div>
    );
};

export default WoDetailEditPage;
