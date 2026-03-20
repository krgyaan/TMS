import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Edit, AlertCircle, RefreshCw } from "lucide-react";
import { paths } from "@/app/routes/paths";
import { useWoBasicDetailWithRelations } from "@/hooks/api/useWoBasicDetails";
import { useWoContactsByBasicDetail } from "@/hooks/api/useWoContacts";
import BasicDetailView from "./components/BasicDetailView";

const BasicDetailShowPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const woId = id ? parseInt(id, 10) : 0;

    // Fetch WO Basic Detail with relations
    const {
        data: woBasicDetail,
        isLoading: isLoadingDetail,
        isError: isErrorDetail,
        error: detailError,
        refetch: refetchDetail,
    } = useWoBasicDetailWithRelations(woId);

    // Fetch contacts
    const {
        data: contacts,
        isLoading: isLoadingContacts,
    } = useWoContactsByBasicDetail(woId);

    const isLoading = isLoadingDetail || isLoadingContacts;

    // Handlers
    const handleEdit = () => {
        navigate(paths.operations.woBasicDetailEditPage(woId));
    };

    const handleBack = () => {
        navigate(paths.operations.woBasicDetailListPage);
    };

    // Invalid ID
    if (!woId || isNaN(woId)) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Invalid Work Order</CardTitle>
                    <CardDescription>The requested work order ID is invalid</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                            Please provide a valid work order ID in the URL.
                        </AlertDescription>
                    </Alert>
                    <Button
                        variant="outline"
                        onClick={handleBack}
                        className="mt-4"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to List
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // Loading state
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-4 w-72" />
                        </div>
                        <Skeleton className="h-10 w-24" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Error state
    if (isErrorDetail || !woBasicDetail) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Error Loading Work Order</CardTitle>
                    <CardDescription>Unable to fetch work order details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                            {(detailError as Error)?.message || 'Failed to load work order details. Please try again.'}
                        </AlertDescription>
                    </Alert>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={handleBack}
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to List
                        </Button>
                        <Button
                            variant="default"
                            onClick={() => refetchDetail()}
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Retry
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            Work Order Details
                        </CardTitle>
                        <CardDescription className="mt-1">
                            {woBasicDetail.projectName || `WO #${woBasicDetail.woNumber || woId}`}
                        </CardDescription>
                    </div>
                    <CardAction>
                        <div className="flex items-center gap-2">
                            {/* Edit Button */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleEdit}
                            >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                            </Button>
                            {/* Back Button */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleBack}
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back
                            </Button>
                        </div>
                    </CardAction>
                </div>
            </CardHeader>
            <CardContent className="px-0 md:px-6">
                <BasicDetailView
                    data={woBasicDetail}
                    contacts={contacts || []}
                    isLoading={false}
                />
            </CardContent>
        </Card>
    );
};

export default BasicDetailShowPage;
