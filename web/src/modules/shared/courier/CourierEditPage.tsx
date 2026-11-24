import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle } from "lucide-react";

import { paths } from "@/app/routes/paths";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { useCourier } from "@/hooks/api/useCourier";
import { isCourierPrivileged } from "./helpers/courier.constants";
import { CourierForm } from "./components/CourierForm";

const CourierEditPage = () => {
    const navigate = useNavigate();
    const { user, role, teamId } = useAuth();
    const { id } = useParams<{ id: string }>();
    const courierId = id ? parseInt(id, 10) : 0;

    const { data: courier, isLoading, error } = useCourier(courierId);

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

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="mt-2 h-4 w-48" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[400px] w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error || !courier) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Failed to load courier. Please try again.</AlertDescription>
                <Button size="sm" variant="outline" onClick={() => navigate(paths.shared.couriers)}>
                    Go Back
                </Button>
            </Alert>
        );
    }

    const canEdit = isCourierPrivileged(role, teamId) || courier.userId === user?.id;

    if (!canEdit) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>You are not authorized to edit this courier.</AlertDescription>
                <Button size="sm" variant="outline" onClick={() => navigate(paths.shared.couriers)}>
                    Go Back
                </Button>
            </Alert>
        );
    }

    return (
        <CourierForm
            mode="edit"
            courierId={courierId}
            existingData={courier}
            title="Edit Courier"
            description={`Courier #${courier.id} - ${courier.toName}${courier.toOrg ? ` (${courier.toOrg})` : ""}`}
            onBack={() => navigate(paths.shared.courierView(courier.id))}
        />
    );
};

export default CourierEditPage;
