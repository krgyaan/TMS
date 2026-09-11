import React, { useState } from "react";
import {
  CalendarDays,
  MapPin,
  User,
  CheckCircle2,
  Users,
  History,
  Lightbulb,
  Paperclip,
  ImageIcon,
  FileText,
  Info,
  Clock,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { fileUploadService } from "@/services/api/file-upload.service";
import { cn } from "@/lib/utils";
import { formatComplaintDate, type Complaint } from "../helpers/types";

interface ComplaintViewProps {
  complaint: Complaint;
}

/**
 * Full read-only content of a complaint — metadata, description, evidence
 * and activity timeline. Shared by the detail dialog and the view page.
 */
const ComplaintView: React.FC<ComplaintViewProps> = ({ complaint: c }) => {
  const [showTimeline, setShowTimeline] = useState(false);

  return (
    <div className="space-y-5">
      {/* Metadata Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          {
            label: "Filed On",
            value: formatComplaintDate(c.createdAt),
            icon: CalendarDays,
          },
          ...(c.incidentDate
            ? [
                {
                  label: "Incident Date",
                  value: formatComplaintDate(c.incidentDate),
                  icon: CalendarDays,
                },
              ]
            : []),
          ...(c.incidentLocation
            ? [
                {
                  label: "Location",
                  value: c.incidentLocation,
                  icon: MapPin,
                },
              ]
            : []),
          ...(c.complaintAgainst
            ? [
                {
                  label: "Against",
                  value: c.complaintAgainstName || c.complaintAgainst,
                  icon: User,
                },
              ]
            : []),
          ...(c.assignedTo
            ? [
                {
                  label: "Assigned To",
                  value: c.assignedTo,
                  icon: User,
                },
              ]
            : []),
          ...(c.resolvedAt
            ? [
                {
                  label: "Resolved On",
                  value: formatComplaintDate(c.resolvedAt),
                  icon: CheckCircle2,
                },
              ]
            : []),
        ].map((item) => {
          const ItemIcon = item.icon;
          return (
            <div
              key={item.label}
              className="p-3 rounded-xl bg-muted/20 border border-border/20"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <ItemIcon className="h-3 w-3 text-muted-foreground/50" />
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                  {item.label}
                </p>
              </div>
              <p className="text-xs font-semibold">{item.value}</p>
            </div>
          );
        })}
      </div>

      {/* Description */}
      <div className="p-4 rounded-xl bg-muted/20 border border-border/20">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
          Description
        </p>
        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
          {c.description}
        </p>
      </div>

      {/* Witnesses */}
      {c.witnesses && (
        <div className="p-3.5 rounded-xl bg-muted/20 border border-border/20">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 flex items-center gap-1.5">
            <Users className="h-3 w-3" />
            Witnesses
          </p>
          <p className="text-xs text-foreground/80">{c.witnesses}</p>
        </div>
      )}

      {/* Previous Attempts */}
      {c.previousAttempts && (
        <div className="p-3.5 rounded-xl bg-muted/20 border border-border/20">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 flex items-center gap-1.5">
            <History className="h-3 w-3" />
            Previous Attempts to Resolve
          </p>
          <p className="text-xs text-foreground/80">{c.previousAttempts}</p>
        </div>
      )}

      {/* Expected Resolution */}
      {c.expectedResolution && (
        <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/15">
          <p className="text-[10px] uppercase tracking-wider text-blue-600 font-semibold mb-1.5 flex items-center gap-1.5">
            <Lightbulb className="h-3 w-3" />
            Expected Resolution
          </p>
          <p className="text-xs text-blue-700/80">{c.expectedResolution}</p>
        </div>
      )}

      {/* Attachments */}
      {c.attachments && c.attachments.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
            <Paperclip className="h-3 w-3" />
            Attachments ({c.attachments.length})
          </p>
          <div className="grid grid-cols-2 gap-2">
            {c.attachments.map((att, i) => {
              const fileName = att.split("/").pop() || att;
              const isImage = /\.(jpe?g|png|webp)$/i.test(att);
              return (
                <a
                  key={i}
                  href={fileUploadService.getFileUrl(att)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/20 border border-border/20 hover:bg-muted/30 transition-colors"
                >
                  <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                    {isImage ? (
                      <ImageIcon className="h-4 w-4 text-primary/60" />
                    ) : (
                      <FileText className="h-4 w-4 text-primary/60" />
                    )}
                  </div>
                  <p className="text-[11px] font-semibold truncate min-w-0">
                    {fileName}
                  </p>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Remarks */}
      {c.remarks && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/15">
          <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-700 mb-0.5">
              HR Remarks
            </p>
            <p className="text-xs text-amber-600/80 leading-relaxed">
              {c.remarks}
            </p>
          </div>
        </div>
      )}

      {/* Timeline */}
      {c.timeline && c.timeline.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <Clock className="h-3.5 w-3.5" />
            Activity Timeline ({c.timeline.length})
            {showTimeline ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          {showTimeline && (
            <div className="overflow-hidden">
              <div className="relative pl-6 space-y-4">
                <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-border/30" />
                {c.timeline.map((event, i) => (
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
                      <p className="text-[10px] text-muted-foreground">
                        by {event.by}
                      </p>
                      {event.note && (
                        <p className="text-[11px] text-foreground/70 mt-1.5 leading-relaxed">
                          {event.note}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ComplaintView;
