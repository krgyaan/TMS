import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerView } from "./components/CustomerView";
import { useCustomer } from "@/hooks/api/useCustomer";
import { paths } from "@/app/routes/paths";

export default function CustomerViewPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const complaintId = Number(id);

    const { data: complaint, isLoading } = useCustomer(complaintId);

    if (isLoading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        );
    }

    if (!complaint) {
        return (
            <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => navigate(paths.services.customer)}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <p className="text-sm text-muted-foreground">Complaint not found.</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 relative">
            <div className="sticky top-[-1rem] z-30 bg-background py-4 -mt-4 border-b border-border shadow-md transition-all">
                <Button variant="ghost" size="sm" onClick={() => navigate(paths.services.customer)} className="-ml-2">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Complaints
                </Button>
            </div>
            <CustomerView complaint={complaint} />
        </div>
    );
}
