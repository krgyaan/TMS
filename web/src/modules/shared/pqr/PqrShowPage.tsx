import { useParams, useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit } from "lucide-react";

const PqrShowPage = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const pqrId = id ? parseInt(id) : null;

    // TODO: Replace with actual API hook when available
    // const { data: pqr, isLoading } = usePqr(pqrId);

    if (!pqrId) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid PQR ID</AlertDescription>
                <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                    Go Back
                </Button>
            </Alert>
        );
    }

    // TODO: Uncomment when API hook is available
    // if (isLoading) {
    //     return <Skeleton className="h-[400px] w-full" />;
    // }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>PQR Details</CardTitle>
                        <CardDescription className="mt-2">
                            View PQR information
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate(-1)}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                        <Button variant="outline" onClick={() => navigate(`/document-dashboard/pqr/${pqrId}/edit`)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-center text-muted-foreground py-8">
                    <p>PQR details will be displayed here</p>
                    <p className="text-sm mt-2">TODO: Implement detail view</p>
                </div>
            </CardContent>
        </Card>
    );
};

export default PqrShowPage;
