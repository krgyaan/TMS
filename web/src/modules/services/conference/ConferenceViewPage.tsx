import { useCallback, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { ShowPageLayout } from "@/components/layout/ShowPageLayout";
import { useConference } from "@/hooks/api/useConference";
import { useComplaintStepStatuses } from "@/hooks/api/useComplaintStepStatuses";
import { CustomerView } from "@/modules/services/customer/components/CustomerView";
import { ConferenceView } from "./components/ConferenceView";
import { ServiceReportView } from "@/modules/services/visit/components/ServiceReportView";
import { ServiceFeedbackView } from "@/modules/services/service-feedback/components/ServiceFeedbackView";
import { paths } from "@/app/routes/paths";

export default function ConferenceViewPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const conferenceId = Number(id);

    const { data: conference, isLoading: isConferenceLoading } = useConference(conferenceId);
    const complaintId = conference?.complaintId ?? null;

    const { steps, complaint, visitReport, feedback } = useComplaintStepStatuses(complaintId);

    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["conference-report"]));

    const toggleSection = useCallback((id: string) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
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
        [conference, complaint, visitReport, feedback],
    );

    if (isConferenceLoading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        );
    }

    if (!conference) {
        return <p className="text-sm text-muted-foreground">Conference call report not found.</p>;
    }

    return (
        <ShowPageLayout
            steps={steps}
            expandedSections={expandedSections}
            onToggleSection={toggleSection}
            onExpandAll={expandAll}
            onCollapseAll={collapseAll}
            onBack={() => navigate(paths.services.conference)}
            backLabel="Back to Conference Reports"
            renderSectionContent={renderSectionContent}
        />
    );
}
