import { useCallback, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { ShowPageLayout } from "@/components/layout/ShowPageLayout";
import { useServiceVisit } from "@/hooks/api/useServiceVisit";
import { useComplaintStepStatuses } from "@/hooks/api/useComplaintStepStatuses";
import { CustomerView } from "@/modules/services/customer/components/CustomerView";
import { ConferenceView } from "@/modules/services/conference/components/ConferenceView";
import { ServiceReportView } from "./components/ServiceReportView";
import { ServiceFeedbackView } from "@/modules/services/service-feedback/components/ServiceFeedbackView";
import { paths } from "@/app/routes/paths";

export default function ServiceVisitViewPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const reportId = Number(id);

    const { data: report, isLoading: isReportLoading } = useServiceVisit(reportId);
    const complaintId = report?.complaintId ?? null;

    const { steps, complaint, conference, feedback } = useComplaintStepStatuses(complaintId);

    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["service-visit-report"]));

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
                    return report ? <ServiceReportView report={report} /> : <p className="text-sm text-muted-foreground">No service visit report yet.</p>;
                case "customer-feedback":
                    return feedback ? <ServiceFeedbackView feedback={feedback} /> : <p className="text-sm text-muted-foreground">No customer feedback yet.</p>;
                default:
                    return null;
            }
        },
        [report, complaint, conference, feedback],
    );

    if (isReportLoading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        );
    }

    if (!report) {
        return <p className="text-sm text-muted-foreground">Service visit report not found.</p>;
    }

    return (
        <ShowPageLayout
            steps={steps}
            expandedSections={expandedSections}
            onToggleSection={toggleSection}
            onExpandAll={expandAll}
            onCollapseAll={collapseAll}
            onBack={() => navigate(paths.services.visit)}
            backLabel="Back to Service Visits"
            renderSectionContent={renderSectionContent}
        />
    );
}
