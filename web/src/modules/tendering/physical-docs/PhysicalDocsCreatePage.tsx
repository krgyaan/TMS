import PhysicalDocsForm from "./components/PhysicalDocsForm"
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { paths } from "@/app/routes/paths";
import { useNavigate, useParams } from "react-router-dom";

const PhysicalDocsCreate = () => {
    const navigate = useNavigate();
    const { tenderId } = useParams<{ tenderId: string }>();
    const tenderIdNumber = tenderId ? parseInt(tenderId) : null;

    if (!tenderIdNumber) {
        return <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Invalid tender ID</AlertDescription>
            <Button variant="outline" size="sm" onClick={() => navigate(paths.tendering.physicalDocs)}>Go Back</Button>
        </Alert>;
    }

    return (
        <div>
            <PhysicalDocsForm tenderId={tenderIdNumber} mode="create" />
        </div>
    )
}

export default PhysicalDocsCreate
