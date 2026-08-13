import { useCallback, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { ShowPageLayout } from "@/components/layout/ShowPageLayout";
import { useServiceFeedback } from "@/hooks/api/useServiceFeedback";
import { useComplaintStepStatuses } from "@/hooks/api/useComplaintStepStatuses";
import { CustomerView } from "@/modules/services/customer/components/CustomerView";
import { ConferenceView } from "@/modules/services/conference/components/ConferenceView";
import { ServiceReportView } from "@/modules/services/visit/components/ServiceReportView";
import { ServiceFeedbackView } from "./components/ServiceFeedbackView";
import { paths } from "@/app/routes/paths";

export default function ServiceFeedbackViewPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const feedbackId = Number(id);

    const { data: feedback, isLoading: isFeedbackLoading } = useServiceFeedback(feedbackId);
    const complaintId = feedback?.complaintId ?? null;

    const { steps, complaint, conference, visitReport } = useComplaintStepStatuses(complaintId);

    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["customer-feedback"]));

    const toggleSection = useCallback((sectionId: string) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(sectionId)) next.delete(sectionId);
            else next.add(sectionId);
            return next;
        });
    }, []);

    const expandAll = useCallback(() => setExpandedSections(new Set(steps.map(s => s.id))), [steps]);
    const collapseAll = useCallback(() => setExpandedSections(new Set()), []);

    const renderSectionContent = useCallback(
        (stepId: string) => {
            switch (stepId) {
                case "complaint-details":
                    return complaint ? <CustomerView complaint={complaint} /> : <p className="text-sm text-muted-foreground">Complaint details not available.</p>;
                case "conference-report":
                    return conference ? <ConferenceView conference={conference} /> : <p className="text-sm text-muted-foreground">No conference call report yet.</p>;
                case "service-visit-report":
                    return visitReport ? <ServiceReportView report={visitReport} /> : <p className="text-sm text-muted-foreground">No service visit report yet.</p>;
                case "customer-feedback":
                    return feedback ? <ServiceFeedbackView feedback={feedback} /> : <p className="text-sm text-muted-foreground">No customer feedback yet.</p>;
                default:
                    return null;
            }
        },
        [feedback, complaint, conference, visitReport],
    );

    if (isFeedbackLoading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        );
    }

    if (!feedback) {
        return <p className="text-sm text-muted-foreground">Customer feedback not found.</p>;
    }

    return (
        <ShowPageLayout
            steps={steps}
            expandedSections={expandedSections}
            onToggleSection={toggleSection}
            onExpandAll={expandAll}
            onCollapseAll={collapseAll}
            onBack={() => navigate(paths.services.feedback)}
            backLabel="Back to Customer Feedback"
            renderSectionContent={renderSectionContent}
        />
    );
}
