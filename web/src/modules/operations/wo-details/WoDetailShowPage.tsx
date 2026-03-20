import { useParams, useNavigate } from "react-router-dom";
import { useWoDetailWithRelations } from "@/hooks/api/useWoDetails";
import { WoDetailView } from "./components/WoDetailView";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const WoDetailShowPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const woDetailId = parseInt(id || "0");

    const { data, isLoading, error } = useWoDetailWithRelations(woDetailId);

    if (error) {
        return (
            <div className="p-8 text-center bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
                <h2 className="text-xl font-bold mb-2">Error Loading Details</h2>
                <p>Could not fetch the work order details. Please try again later.</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to List
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto px-4 py-6">
            <div className="flex justify-between items-center">
                <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to List
                </Button>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate(`/operations/wo-details/edit/${id}`)} className="gap-2">
                        <Edit className="h-4 w-4" />
                        Edit Details
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-12 w-1/3" />
                    <Skeleton className="h-[600px] w-full" />
                </div>
            ) : (
                data && <WoDetailView data={data} />
            )}
        </div>
    );
};

export default WoDetailShowPage;
