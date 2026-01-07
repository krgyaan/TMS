import { useParams } from "react-router-dom";
import { StatusModal } from "./components/StatusModal";
import { useStatus } from "@/hooks/api/useStatuses";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { paths } from "@/app/routes/paths";

const EditStatusPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const statusId = Number(id);
    const { data, isLoading, error, refetch } = useStatus(statusId);
    const [open, setOpen] = useState(true);

    useEffect(() => {
        if (!open) {
            navigate(paths.master.statuses);
        }
    }, [open, navigate]);

    if (!statusId) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Status not found</CardTitle>
                    <CardDescription>Invalid status identifier</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64 mt-2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-96 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error || !data) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Edit Status</CardTitle>
                    <CardDescription>Update tender status details</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load status. {error?.message}
                            <Button variant="outline" size="sm" className="ml-2" onClick={() => refetch()}>
                                Retry
                            </Button>
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return <StatusDrawer open={open} onOpenChange={setOpen} status={data} onSuccess={() => navigate(paths.master.statuses)} />;
};

export default EditStatusPage;
