import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft } from "lucide-react";

import { paths } from "@/app/routes/paths";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { useCourier } from "@/hooks/api/useCourier";
import { isCourierPrivileged } from "./helpers/courier.constants";
import { CourierStatusForm } from "./components/CourierStatusForm";

const CourierActionPage = () => {
    const navigate = useNavigate();
    const { role, teamId } = useAuth();
    const { id } = useParams<{ id: string }>();
    const courierId = id ? parseInt(id, 10) : 0;

    const { data: courier, isLoading, error } = useCourier(courierId);

    if (!isCourierPrivileged(role, teamId)) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>You are not authorized to change courier status.</AlertDescription>
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

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="mt-2 h-4 w-48" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-72 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error || !courier) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    {error ? "Failed to load courier details" : "Courier not found"}
                </AlertDescription>
                <Button size="sm" variant="outline" onClick={() => navigate(paths.shared.couriers)}>
                    Back to Couriers
                </Button>
            </Alert>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Change Courier Status</CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">
                            Courier #{courier.id} - {courier.toName}
                            {courier.toOrg ? ` (${courier.toOrg})` : ""}
                        </CardDescription>
                    </div>
                    <CardAction>
                        <Button variant="outline" onClick={() => navigate(-1)}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                    </CardAction>
                </div>
            </CardHeader>
            <CardContent>
                <CourierStatusForm
                    courier={courier}
                    onSuccess={() => navigate(paths.shared.courierView(courier.id))}
                    onCancel={() => navigate(-1)}
                />
            </CardContent>
        </Card>
    );
};

export default CourierActionPage;
