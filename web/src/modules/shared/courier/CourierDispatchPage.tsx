import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle } from "lucide-react";

import { paths } from "@/app/routes/paths";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { isCourierPrivileged } from "./helpers/courier.constants";
import { CourierDispatchForm } from "./components/CourierDispatchForm";

const CourierDispatchPage = () => {
    const navigate = useNavigate();
    const { role, teamId } = useAuth();
    const { id } = useParams<{ id: string }>();
    const courierId = id ? parseInt(id, 10) : 0;

    if (!isCourierPrivileged(role, teamId)) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>You are not authorized to dispatch couriers.</AlertDescription>
                <Button size="sm" variant="outline" onClick={() => navigate(paths.shared.couriers)}>
                    Go Back
                </Button>
            </Alert>
        );
    }

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
