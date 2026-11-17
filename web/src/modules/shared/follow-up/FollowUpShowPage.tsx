import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { paths } from "@/app/routes/paths";
import { useFollowUp } from "@/hooks/api/useFollowUps";
import { FollowUpView } from "./components/FollowUpView";

const FollowUpShowPage = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const followUpId = Number(id);

    const { data, isLoading, isError } = useFollowUp(Number.isFinite(followUpId) ? followUpId : null);

    if (!Number.isFinite(followUpId) || followUpId <= 0) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid follow-up ID</AlertDescription>
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
                <CardContent className="space-y-4 p-6">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-64 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (isError || !data) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Unable to load this follow-up. It may have been deleted.</AlertDescription>
            </Alert>
        );
    }

    return (
        <FollowUpView
            data={data}
            onBack={() => navigate(paths.shared.followUp)}
            onEdit={() => navigate(paths.shared.followUpEdit(data.id))}
        />
    );
};

export default FollowUpShowPage;
