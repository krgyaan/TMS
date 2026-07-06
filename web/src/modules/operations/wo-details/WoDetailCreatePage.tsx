import { paths } from "@/app/routes/paths";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useWoDetailByBasicDetail } from "@/hooks/api/useWoDetails";
import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { WoDetailsWizard } from "./components/WoDetailsWizard";

const WoDetailCreatePage = () => {
    const { woBasicDetailId } = useParams<{ woBasicDetailId: string }>();
    const navigate = useNavigate();
    const numericId = woBasicDetailId ? Number(woBasicDetailId) : null;

    const { data: existingDetail, isLoading } = useWoDetailByBasicDetail(numericId ?? 0);

    useEffect(() => {
        if (!isLoading && existingDetail?.id && numericId) {
            navigate(paths.operations.woDetailEditPage(existingDetail.id), { replace: true });
        }
    }, [isLoading, existingDetail, navigate, numericId]);

    if (!woBasicDetailId) {
        return (
            <div className="flex flex-col gap-4">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        Missing WO Basic Detail ID. Please navigate from the WO Basic Details list.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex flex-col gap-4 items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground">Checking existing WO Details...</p>
            </div>
        );
    }

    if (existingDetail?.id) {
        return null;
    }

    return (
        <div className="flex flex-col gap-4">
            <WoDetailsWizard
                mode="create"
                woBasicDetailId={Number(woBasicDetailId)}
            />
        </div>
    );
};

export default WoDetailCreatePage;
