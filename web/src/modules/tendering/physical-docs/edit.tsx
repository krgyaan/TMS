import PhysicalDocsForm from './components/PhysicalDocsForm'
import { useParams, useNavigate } from 'react-router-dom'
import { usePhysicalDocByTenderId } from '@/hooks/api/usePhysicalDocs'
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { paths } from "@/app/routes/paths";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const PhysicalDocsEdit = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const tenderId = id ? parseInt(id) : null;

    const { data: physicalDoc, isLoading, error } = usePhysicalDocByTenderId(tenderId);

    if (!tenderId) {
        return <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Invalid tender ID</AlertDescription>
            <Button variant="outline" size="sm" onClick={() => navigate(paths.tendering.physicalDocs)}>Go Back</Button>
        </Alert>;
    }

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48 mt-2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[400px] w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error || !physicalDoc) {
        return <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to load physical doc. Please try again.</AlertDescription>
            <Button variant="outline" size="sm" onClick={() => navigate(paths.tendering.physicalDocs)}>Go Back</Button>
        </Alert>;
    }

    return (
        <div>
            <PhysicalDocsForm tenderId={physicalDoc.tenderId} mode="edit" existingData={physicalDoc} />
        </div>
    )
}

export default PhysicalDocsEdit
