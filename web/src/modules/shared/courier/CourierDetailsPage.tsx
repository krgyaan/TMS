import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, FileEdit, Pencil } from "lucide-react";

import { paths } from "@/app/routes/paths";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { useCourierDetails } from "@/hooks/api/useCourier";
import { isCourierPrivileged } from "./helpers/courier.constants";
import { CourierView } from "./components/CourierView";

const CourierDetailsPage = () => {
    const navigate = useNavigate();
    const { user, role, teamId } = useAuth();
    const { id } = useParams<{ id: string }>();
    const courierId = id ? parseInt(id, 10) : 0;

    const { data: courier, isLoading, error } = useCourierDetails(courierId);

    const isPrivileged = isCourierPrivileged(role, teamId);
    const canEdit = isPrivileged || courier?.userId === user?.id;

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Button variant="outline" onClick={() => navigate(paths.shared.couriers)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
                <Skeleton className="h-[600px]" />
            </div>
        );
    }

    if (error || !courier) {
        return (
            <div className="space-y-6">
                <Button variant="outline" onClick={() => navigate(paths.shared.couriers)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        {error ? "Failed to load courier details. Please try again later." : "Courier not found."}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Button variant="outline" onClick={() => navigate(paths.shared.couriers)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>

                <div className="flex flex-wrap items-center gap-2">
                    {isPrivileged && (
                        <Button variant="outline" onClick={() => navigate(paths.shared.courierAction(courier.id))}>
                            <FileEdit className="h-4 w-4 mr-2" />
                            Change Status
                        </Button>
                    )}
                    {canEdit && (
                        <Button onClick={() => navigate(paths.shared.courierEdit(courier.id))}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                        </Button>
                    )}
                </div>
            </div>

            <CourierView courier={courier} />
        </div>
    );
};

export default CourierDetailsPage;
