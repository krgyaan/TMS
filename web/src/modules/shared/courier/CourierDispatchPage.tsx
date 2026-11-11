import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle } from "lucide-react";

import { paths } from "@/app/routes/paths";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { CourierDispatchForm } from "./components/CourierDispatchForm";

const CourierDispatchPage = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const courierId = id ? parseInt(id, 10) : 0;

    if (!courierId) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid courier ID</AlertDescription>
                <Button size="sm" variant="outline" onClick={() => navigate(paths.shared.couriers)}>
                    Go Back
                </Button>
            </Alert>
        );
    }

    return (
        <div>
            <CourierDispatchForm courierId={courierId} />
        </div>
    );
};

export default CourierDispatchPage;
