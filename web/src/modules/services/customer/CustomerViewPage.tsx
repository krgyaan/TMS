import { useCallback, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ShowPageLayout } from "@/components/layout/ShowPageLayout";
import { useComplaintStepStatuses } from "@/hooks/api/useComplaintStepStatuses";
import { CustomerView } from "./components/CustomerView";
import { ConferenceView } from "@/modules/services/conference/components/ConferenceView";
import { ServiceReportView } from "@/modules/services/visit/components/ServiceReportView";
import { paths } from "@/app/routes/paths";

export default function CustomerViewPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const complaintId = Number(id);

    const { steps, complaint, conference, visitReport } = useComplaintStepStatuses(complaintId);

    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["complaint-details"]));

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
                default:
                    return null;
            }
        },
        [complaint, conference, visitReport],
    );

    return (
        <ShowPageLayout
            steps={steps}
            expandedSections={expandedSections}
            onToggleSection={toggleSection}
            onExpandAll={expandAll}
            onCollapseAll={collapseAll}
            onBack={() => navigate(paths.services.customer)}
            backLabel="Back to Complaints"
            renderSectionContent={renderSectionContent}
        />
    );
}
