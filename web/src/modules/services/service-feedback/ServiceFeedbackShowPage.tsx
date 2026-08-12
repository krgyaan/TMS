import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServiceFeedbackForm } from "./components/ServiceFeedbackForm";
import { useServiceFeedback } from "@/hooks/api/useServiceFeedback";
import { paths } from "@/app/routes/paths";

export default function ServiceFeedbackShowPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const feedbackId = Number(id);

    const { data: feedback, isLoading } = useServiceFeedback(feedbackId);

    if (isLoading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        );
    }

    if (!feedback) {
        return (
            <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => navigate(paths.services.feedback)} className="-ml-2">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to Customer Feedback
                </Button>
                <p className="text-sm text-muted-foreground">Customer feedback not found.</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 relative">
            <div className="sticky top-[-1rem] z-30 bg-background py-4 -mt-4 border-b border-border shadow-md transition-all">
                <Button variant="ghost" size="sm" onClick={() => navigate(paths.services.feedback)} className="-ml-2">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Customer Feedback
                </Button>
            </div>

            <div className="mb-4">
                <h1 className="text-lg font-semibold flex items-center gap-2">
                    <Edit className="h-5 w-5" />
                    Edit Customer Feedback #{feedbackId}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">Update the customer feedback details below.</p>
            </div>

            <ServiceFeedbackForm complaintId={feedback.complaintId} feedbackId={feedbackId} />
        </div>
    );
}
