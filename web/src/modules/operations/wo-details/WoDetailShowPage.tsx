import { useParams, useNavigate } from "react-router-dom";
import { useWoDetailWithRelations } from "@/hooks/api/useWoDetails";
import { WoDetailView } from "./components/WoDetailView";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import BasicDetailView from "../wo-basic-details/components/BasicDetailView";
import { Card, CardAction } from "@/components/ui/card";

const WoDetailShowPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const woDetailId = parseInt(id || "0");

    const { data: woDetail, isLoading: isWoDetailLoading, error: woDetailError } = useWoDetailWithRelations(woDetailId);

    if (woDetailError) {
        return (
            <div className="p-8">
                <div className="p-8 text-center bg-destructive/10 text-destructive rounded-lg border border-destructive/20 mb-6">
                    <h2 className="text-xl font-bold mb-2">Error Loading Details</h2>
                    <p>Could not fetch the work order details. Please try again later.</p>
                    <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back to List
                    </Button>
                </div>
            </div>
        );
    }

    if (isWoDetailLoading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-12 w-1/3" />
                <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </div>
                <Skeleton className="h-[600px] w-full" />
            </div>
        );
    }

    if (!woDetail) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                <p>No work order details found.</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to List
                </Button>
            </div>
        );
    }

    return (
        <div>
            <Button className="justify-start mb-4" variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <Card className="px-0 md:px-6 space-y-4">
                {/* Use woBasicDetail from woDetail directly if available */}
                {woDetail.woBasicDetail && (
                    <BasicDetailView data={woDetail.woBasicDetail} />
                )}

                <WoDetailView data={woDetail} />
            </Card>
        </div>
    );
};

export default WoDetailShowPage;
