import { useSearchParams } from "react-router-dom";
import { WoDetailsWizard } from "./components/WoDetailsWizard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const WoDetailCreatePage = () => {
    const [searchParams] = useSearchParams();
    const woBasicDetailId = searchParams.get("woBasicDetailId");

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
