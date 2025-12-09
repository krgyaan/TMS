import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmdTenderFeeRequestForm } from "./components/EmdTenderFeeRequestForm";
import { useParams } from "react-router-dom";
import { AlertCircle } from "lucide-react";

export default function EmdCreatePage() {
    const { tenderId } = useParams<{ tenderId: string }>();

    if (!tenderId) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Select a tender from the list</AlertDescription>
            </Alert>
        );
    }

    return (
        <EmdTenderFeeRequestForm tenderId={Number(tenderId)} />
    );
}
