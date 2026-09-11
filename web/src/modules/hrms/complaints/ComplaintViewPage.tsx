import { useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ShowPageLayout, type StepConfig } from "@/components/layout/ShowPageLayout";
import { cn } from "@/lib/utils";
import { ComplaintView } from "./components/ComplaintView";
import { useComplaint } from "@/hooks/api/useComplaints";
import {
  formatComplaintDate,
  type ComplaintTimelineEvent,
} from "./helpers/types";

interface ComplaintViewPageProps {
  /** Back-navigation target + label (defaults to the employee support flow). */
  backTo?: string;
  backLabel?: string;
}

/**
 * Read-only complaint page — LeadShowPage style: ShowPageLayout with
 * accordion sections (details + timeline) and a table-based details view.
 * Shared by the employee support flow and the admin complaints list —
 * always fetches by id (GET /hrms/complaints/:id/detail).
 */
export default function ComplaintViewPage({
  backTo = "/profile/support",
  backLabel = "Back to Support",
}: ComplaintViewPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const complaintId = id ? Number(id) : null;

  const { data: complaint, isLoading } = useComplaint(complaintId);

  const steps = useMemo<StepConfig[]>(() => {
    const list: StepConfig[] = [
      {
        id: "complaint-details",
        label: "Complaint Details",
        shortLabel: "Details",
        stepNumber: 1,
        hasData: !!complaint,
        isLoading,
        status: isLoading ? "loading" : complaint ? "completed" : "pending",
      },
    ];
    if (complaint?.timeline && complaint.timeline.length > 0) {
      list.push({
        id: "activity-timeline",
        label: "Activity Timeline",
        shortLabel: "Timeline",
        stepNumber: 2,
        hasData: true,
        isLoading: false,
        status: "completed",
      });
    }
    return list;
  }, [complaint, isLoading]);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(["complaint-details"])
  );

  const toggleSection = useCallback((stepId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  }, []);

  const expandAll = useCallback(
    () => setExpandedSections(new Set(steps.map((s) => s.id))),
    [steps]
  );

  const collapseAll = useCallback(() => setExpandedSections(new Set()), []);

  const renderSectionContent = useCallback(
    (stepId: string) => {
      switch (stepId) {
        case "complaint-details":
          return <ComplaintView complaint={complaint} />;
        case "activity-timeline":
          return complaint?.timeline ? (
            <TimelineContent timeline={complaint.timeline} />
          ) : null;
        default:
          return null;
      }
    },
    [complaint]
  );

  if (!id || Number.isNaN(complaintId)) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Invalid complaint ID.
      </div>
    );
  }

  if (!isLoading && !complaint) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Complaint not found or doesn't belong to you.
      </div>
    );
  }

  return (
    <ShowPageLayout
      steps={steps}
      expandedSections={expandedSections}
      onToggleSection={toggleSection}
      onExpandAll={expandAll}
      onCollapseAll={collapseAll}
      onBack={() => navigate(backTo)}
      backLabel={backLabel}
      renderSectionContent={renderSectionContent}
    />
  );
}

/** Timeline for the second accordion section (rendered expanded). */
function TimelineContent({ timeline }: { timeline: ComplaintTimelineEvent[] }) {
  return (
    <div className="relative pl-6 space-y-4">
      <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-border/30" />
      {timeline.map((event, i) => (
        <div key={i} className="relative">
          <div
            className={cn(
              "absolute left-[-18px] top-1.5 h-3 w-3 rounded-full border-2 border-background",
              i === 0 ? "bg-primary" : "bg-border"
            )}
          />
          <div className="p-3 rounded-xl bg-muted/15 border border-border/15">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold">{event.action}</p>
              <p className="text-[9px] text-muted-foreground">
                {formatComplaintDate(event.date)}
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground">by {event.by}</p>
            {event.note && (
              <p className="text-[11px] text-foreground/70 mt-1.5 leading-relaxed">
                {event.note}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
