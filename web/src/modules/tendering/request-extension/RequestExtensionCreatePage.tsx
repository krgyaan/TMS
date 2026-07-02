import { useParams } from "react-router-dom";
import { RequestExtensionForm } from "./components/RequestExtensionForm"
import { Alert, AlertDescription } from "@/components/ui/alert";

const RequestExtensionCreatePage = () => {
    const { tenderId } = useParams<{ tenderId: string }>();
    const tenderIdNum = tenderId ? parseInt(tenderId, 10) : null;

    if (!tenderIdNum) {
        return (
            <Alert variant="destructive">
                <AlertDescription>Invalid Tender ID</AlertDescription>
            </Alert>
        );
    }

    return (
        <div>
            <RequestExtensionForm mode="create" tenderId={tenderIdNum} />
        </div>
    )
}

export default RequestExtensionCreatePage
