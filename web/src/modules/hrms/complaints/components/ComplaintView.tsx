import {
  Calendar,
  CalendarDays,
  CheckCircle2,
  FileText,
  HelpCircle,
  History,
  ImageIcon,
  Lightbulb,
  MapPin,
  Megaphone,
  Paperclip,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { fileUploadService } from "@/services/api/file-upload.service";
import { cn } from "@/lib/utils";
import {
  COMPLAINT_TYPES,
  PRIORITY_CONFIG,
  STATUS_CONFIG,
  formatComplaintDate,
  type Complaint,
} from "../helpers/types";

interface ComplaintViewProps {
  complaint?: Complaint | null;
  isLoading?: boolean;
  className?: string;
}

/**
 * Read-only complaint details in the LeadView table style — grouped rows
 * (Basic / Incident / Additional / Attachments). Timeline lives in the page.
 */
export function ComplaintView({
  complaint: c,
  isLoading: manualLoading = false,
  className = "",
}: ComplaintViewProps) {
  if (manualLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!c) return null;

  const statusConfig = STATUS_CONFIG[c.status] || STATUS_CONFIG.open;
  const StatusIcon = statusConfig.icon;
  const priorityConfig =
    PRIORITY_CONFIG[c.priority] || PRIORITY_CONFIG.medium;
  const PriorityIcon = priorityConfig.icon;
  const typeConfig = COMPLAINT_TYPES.find((t) => t.value === c.complaintType);
  const TypeIcon = typeConfig?.icon || HelpCircle;

  const attachments = c.attachments || [];
  const hasAdditional = !!(
    c.witnesses ||
    c.previousAttempts ||
    c.expectedResolution ||
    c.remarks
  );
  // "Created By" is only shown when a different user filed the record
  // (e.g. HR filing on behalf of the complainant).
  const showCreatedBy =
    c.createdBy != null &&
    c.complainantId != null &&
    c.createdBy !== c.complainantId;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          Complaint Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableBody>
            {/* Basic Information */}
            <TableRow className="bg-muted/50">
              <TableCell colSpan={4} className="font-semibold text-sm">
                Basic Information
              </TableCell>
            </TableRow>
            <TableRow className="hover:bg-muted/30 transition-colors">
              <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                <div className="flex items-center gap-2">
                  <TypeIcon className="h-4 w-4" />
                  Complaint Type
                </div>
              </TableCell>
              <TableCell className="text-sm w-1/4">
                {typeConfig?.label || c.complaintType || "—"}
              </TableCell>
              <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                <div className="flex items-center gap-2">
                  <StatusIcon className="h-4 w-4" />
                  Status
                </div>
              </TableCell>
              <TableCell className="text-sm w-1/4">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] h-6 font-bold rounded-lg",
                    statusConfig.className
                  )}
                >
                  {statusConfig.label}
                </Badge>
              </TableCell>
            </TableRow>
            <TableRow className="hover:bg-muted/30 transition-colors">
              <TableCell className="text-sm font-medium text-muted-foreground">
                Subject
              </TableCell>
              <TableCell className="text-sm font-semibold break-words" colSpan={3}>
                {c.subject}
              </TableCell>
            </TableRow>
            <TableRow className="hover:bg-muted/30 transition-colors">
              <TableCell className="text-sm font-medium text-muted-foreground">
                Complaint Code
              </TableCell>
              <TableCell className="text-sm">
                <span className="font-mono text-xs font-semibold">
                  {c.complaintCode}
                </span>
              </TableCell>
              <TableCell className="text-sm font-medium text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Filed On
                </div>
              </TableCell>
              <TableCell className="text-sm">
                {formatComplaintDate(c.createdAt)}
              </TableCell>
            </TableRow>
            <TableRow className="hover:bg-muted/30 transition-colors">
              <TableCell className="text-sm font-medium text-muted-foreground">
                <div className="flex items-center gap-2">
                  <PriorityIcon className="h-4 w-4" />
                  Priority
                </div>
              </TableCell>
              <TableCell className="text-sm">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] h-6 font-bold rounded-lg capitalize",
                    priorityConfig.className
                  )}
                >
                  {priorityConfig.label}
                </Badge>
              </TableCell>
              <TableCell className="text-sm font-medium text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Complaint Against
                </div>
              </TableCell>
              <TableCell className="text-sm">
                {c.complaintAgainstName || c.complaintAgainst || "—"}
              </TableCell>
            </TableRow>
            <TableRow className="hover:bg-muted/30 transition-colors">
              <TableCell className="text-sm font-medium text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Complaint By
                </div>
              </TableCell>
              <TableCell className="text-sm">
                {c.complainantName || "—"}
              </TableCell>
              {showCreatedBy ? (
                <>
                  <TableCell className="text-sm font-medium text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Created By
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.createdByName || "—"}
                  </TableCell>
                </>
              ) : (
                <TableCell colSpan={2} />
              )}
            </TableRow>
            {c.resolvedAt && (
              <TableRow className="hover:bg-muted/30 transition-colors">
                <TableCell className="text-sm font-medium text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Resolved On
                  </div>
                </TableCell>
                <TableCell className="text-sm" colSpan={3}>
                  {formatComplaintDate(c.resolvedAt)}
                </TableCell>
              </TableRow>
            )}

            {/* Incident Information */}
            <TableRow className="bg-muted/50">
              <TableCell colSpan={4} className="font-semibold text-sm">
                Incident Information
              </TableCell>
            </TableRow>
            <TableRow className="hover:bg-muted/30 transition-colors">
              <TableCell className="text-sm font-medium text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Incident Date & Time
                </div>
              </TableCell>
              <TableCell className="text-sm">
                {c.incidentDate ? formatComplaintDate(c.incidentDate) : "—"}
              </TableCell>
              <TableCell className="text-sm font-medium text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </div>
              </TableCell>
              <TableCell className="text-sm">
                {c.incidentLocation || "—"}
              </TableCell>
            </TableRow>
            <TableRow className="hover:bg-muted/30 transition-colors">
              <TableCell className="text-sm font-medium text-muted-foreground">
                Description
              </TableCell>
              <TableCell
                className="text-sm whitespace-pre-wrap break-words"
                colSpan={3}
              >
                {c.description || "—"}
              </TableCell>
            </TableRow>

            {/* Additional Information */}
            {hasAdditional && (
              <>
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={4} className="font-semibold text-sm">
                    Additional Information
                  </TableCell>
                </TableRow>
                {c.witnesses && (
                  <TableRow className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-sm font-medium text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Witnesses
                      </div>
                    </TableCell>
                    <TableCell className="text-sm break-words" colSpan={3}>
                      {c.witnesses}
                    </TableCell>
                  </TableRow>
                )}
                {c.previousAttempts && (
                  <TableRow className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-sm font-medium text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Previous Attempts to Resolve
                      </div>
                    </TableCell>
                    <TableCell className="text-sm break-words" colSpan={3}>
                      {c.previousAttempts}
                    </TableCell>
                  </TableRow>
                )}
                {c.expectedResolution && (
                  <TableRow className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-sm font-medium text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" />
                        Expected Resolution
                      </div>
                    </TableCell>
                    <TableCell className="text-sm break-words" colSpan={3}>
                      {c.expectedResolution}
                    </TableCell>
                  </TableRow>
                )}
                {c.remarks && (
                  <TableRow className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-sm font-medium text-muted-foreground">
                      HR Remarks
                    </TableCell>
                    <TableCell
                      className="text-sm break-words text-amber-700 dark:text-amber-400"
                      colSpan={3}
                    >
                      {c.remarks}
                    </TableCell>
                  </TableRow>
                )}
              </>
            )}

            {/* Attachments */}
            {attachments.length > 0 && (
              <>
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={4} className="font-semibold text-sm">
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      Attachments ({attachments.length})
                    </div>
                  </TableCell>
                </TableRow>
                {attachments.map((att, i) => {
                  const fileName = att.split("/").pop() || att;
                  const isImage = /\.(jpe?g|png|webp)$/i.test(att);
                  return (
                    <TableRow
                      key={i}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="text-sm font-medium">
                        <div className="flex items-center gap-2">
                          {isImage ? (
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          )}
                          {fileName}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm" colSpan={3}>
                        <a
                          href={fileUploadService.getFileUrl(att)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          Open file
                        </a>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
