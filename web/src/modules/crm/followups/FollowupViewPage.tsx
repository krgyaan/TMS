import { useState, useCallback } from "react";
import { ShowPageLayout, type StepConfig } from "@/components/layout/ShowPageLayout";
import { useFollowups } from "@/hooks/api/useFollowups";
import { MailTab } from "./components/MailTab";
import { CallTab } from "./components/CallTab";
import { VisitTab } from "./components/VisitTab";
import { LetterTab } from "./components/LetterTab";
import { WhatsappTab } from "./components/WhatsappTab";


interface FollowupViewPageProps {
    leadId: number;
    onBack?: () => void;
    backLabel?: string;
}

export function FollowupViewPage({ leadId, onBack, backLabel }: FollowupViewPageProps) {
    const { data: followups = [], isLoading } = useFollowups(leadId);

    const [expandedSections, setExpandedSections] = useState<Set<string>>(
        new Set(["mail-followups"])
    );

    const toggleSection = useCallback((id: string) => {
        setExpandedSections((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    // Count followups by type
    const mailCount = followups.filter(f => f.type === 'mail').length;
    const callCount = followups.filter(f => f.type === 'call').length;
    const visitCount = followups.filter(f => f.type === 'visit').length;
    const letterCount = followups.filter(f => f.type === 'letter').length;
    const whatsappCount = followups.filter(f => f.type === 'whatsapp').length;

    const FOLLOWUP_STEPS: StepConfig[] = [
    {
        id: "mail-followups",
        label: `Mail Follow-ups (${mailCount})`,
        shortLabel: "Mail",
        stepNumber: 1,
        status: mailCount > 0 ? "completed" : "pending",
        hasData: mailCount > 0,
        isLoading,
    },
    {
        id: "call-followups",
        label: `Call Follow-ups (${callCount})`,
        shortLabel: "Call",
        stepNumber: 2,
        status: callCount > 0 ? "completed" : "pending",
        hasData: callCount > 0,
        isLoading,
    },
    {
        id: "visit-followups",
        label: `Visit Follow-ups (${visitCount})`,
        shortLabel: "Visit",
        stepNumber: 3,
        status: visitCount > 0 ? "completed" : "pending",
        hasData: visitCount > 0,
        isLoading,
    },
    {
        id: "letter-followups",
        label: `Letter Follow-ups (${letterCount})`,
        shortLabel: "Letter",
        stepNumber: 4,
        status: letterCount > 0 ? "completed" : "pending",
        hasData: letterCount > 0,
        isLoading,
    },
    {
        id: "whatsapp-followups",
        label: `WhatsApp Follow-ups (${whatsappCount})`,
        shortLabel: "WhatsApp",
        stepNumber: 5,
        status: whatsappCount > 0 ? "completed" : "pending",
        hasData: whatsappCount > 0,
        isLoading,
    },
];

    const expandAll = useCallback(
        () => setExpandedSections(new Set(FOLLOWUP_STEPS.map((s) => s.id))),
        [FOLLOWUP_STEPS]
    );

    const collapseAll = useCallback(() => setExpandedSections(new Set()), []);

    const renderSectionContent = useCallback(
        (stepId: string) => {
            switch (stepId) {
                case "mail-followups":
                    return <MailTab leadId={leadId} mode="view" />;
                case "call-followups":
                    return <CallTab leadId={leadId} mode="view" />;
                case "visit-followups":
                    return <VisitTab leadId={leadId} mode="view" />;
                case "letter-followups":
                    return <LetterTab leadId={leadId} mode="view" />;
                case "whatsapp-followups":
                    return <WhatsappTab leadId={leadId} mode="view" />;
                default:
                    return null;
            }
        },
        [leadId]
    );

    return (
        <ShowPageLayout
            steps={FOLLOWUP_STEPS}
            expandedSections={expandedSections}
            onToggleSection={toggleSection}
            onExpandAll={expandAll}
            onCollapseAll={collapseAll}
            onBack={onBack}
            backLabel={backLabel}
            renderSectionContent={renderSectionContent}
        />
    );
}