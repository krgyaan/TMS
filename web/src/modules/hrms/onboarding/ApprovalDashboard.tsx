import React, { useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
  Mail,
  Clock,
  Check,
  X,
  AlertTriangle,
  GraduationCap,
  Briefcase,
  CreditCard,
  FileText,
  ChevronLeft,
  ChevronRight,
  Building2,
  Calendar,
  MapPin,
  Hash,
  BookOpen,
  Upload,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useOnboardingList,
  useEducation,
  useExperience,
  useDocuments,
  useBankDetails,
  useUpdateEntryStatus,
} from "./useOnboarding";

import AvatarComponent from "./components/AvatarComponent";
import { formatDate } from "./components/helpers";
// ─── Types ────────────────────────────────────────────────────────────────────

type StageKey = "education" | "experience" | "documents" | "bankDetails";
type EntryStatus = "pending" | "submitted" | "approved" | "rejected" | "resubmitted";
type TabValue = "active" | "rejected";

interface OnboardingUser {
  id: number;
  name: string;
  email: string;
  stages: Record<StageKey, EntryStatus>;
  hasRejection: boolean;
}

interface StageEntry {
  id: number;
  onboardingId: number;
  status: EntryStatus;
  hrStatus: EntryStatus;
  hrRemark?: string;
  [key: string]: any;
}

// ─── Stage Configuration ──────────────────────────────────────────────────────

const STAGES: {
  key: StageKey;
  label: string;
  icon: React.ElementType;
  color: { base: string; light: string; dark: string; ring: string };
}[] = [
  {
    key: "experience",
    label: "Work Ex",
    icon: Briefcase,
    color: {
      base: "text-violet-600 dark:text-violet-400",
      light: "bg-violet-100 dark:bg-violet-900/40",
      dark: "bg-violet-600",
      ring: "ring-violet-200 dark:ring-violet-800",
    },
  },
  {
    key: "education",
    label: "Education",
    icon: GraduationCap,
    color: {
      base: "text-blue-600 dark:text-blue-400",
      light: "bg-blue-100 dark:bg-blue-900/40",
      dark: "bg-blue-600",
      ring: "ring-blue-200 dark:ring-blue-800",
    },
  },
  {
    key: "documents",
    label: "Documents",
    icon: FileText,
    color: {
      base: "text-amber-600 dark:text-amber-400",
      light: "bg-amber-100 dark:bg-amber-900/40",
      dark: "bg-amber-600",
      ring: "ring-amber-200 dark:ring-amber-800",
    },
  },
  {
    key: "bankDetails",
    label: "Bank A/C",
    icon: CreditCard,
    color: {
      base: "text-emerald-600 dark:text-emerald-400",
      light: "bg-emerald-100 dark:bg-emerald-900/40",
      dark: "bg-emerald-600",
      ring: "ring-emerald-200 dark:ring-emerald-800",
    },
  },
];

const STATUS_STYLES: Record<
  EntryStatus,
  { bg: string; border: string; dot: string; label: string }
> = {
  pending: {
    bg: "bg-slate-50 dark:bg-slate-900/30",
    border: "border",
    dot: "bg-slate-300 dark:bg-slate-600",
    label: "Pending",
  },
  submitted: {
    bg: "bg-amber-50 dark:bg-amber-950/20",
    border: "border",
    dot: "bg-amber-400",
    label: "Submitted",
  },
  resubmitted: {
    bg: "bg-amber-50 dark:bg-amber-950/20",
    border: "border",
    dot: "bg-amber-400",
    label: "Resubmitted",
  },
  approved: {
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    border: "border",
    dot: "bg-emerald-500",
    label: "Approved",
  },
  rejected: {
    bg: "bg-red-50 dark:bg-red-950/20",
    border: "border",
    dot: "bg-red-500",
    label: "Rejected",
  },
};



// ─── Stage Box (inline indicator) ─────────────────────────────────────────────

interface StageBoxProps {
  stageKey: StageKey;
  status: EntryStatus;
  onClick: () => void;
}

const StageBox: React.FC<StageBoxProps> = ({ stageKey, status, onClick }) => {
  const stage = STAGES.find((s) => s.key === stageKey)!;
  const Icon = stage.icon;
  const statusCfg = STATUS_STYLES[status];

  const isActionable = status === "submitted" || status === "resubmitted";

  return (
    <TooltipProvider delayDuration={80}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className={cn(
              "relative flex items-center justify-center w-10 h-10 rounded-xl border transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              statusCfg.bg,
              statusCfg.border,
              isActionable && [
                "hover:shadow-md hover:-translate-y-0.5 hover:scale-105",
                "ring-2 ring-offset-1 ring-offset-background",
                stage.color.ring,
              ],
              !isActionable && "hover:shadow-sm hover:-translate-y-px",
              status === "pending" && "opacity-50",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 transition-colors",
                status === "approved"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : status === "rejected"
                  ? "text-red-500 dark:text-red-400"
                  : (status === "submitted" || status === "resubmitted")
                  ? stage.color.base
                  : "text-slate-400 dark:text-slate-500"
              )}
            />

            {/* Status indicator dot */}
            <span
              className={cn(
                "absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-background transition-all",
                statusCfg.dot,
                isActionable && "animate-pulse",
              )}
            />

            {/* Approved / Rejected icon overlay */}
            {status === "approved" && (
              <CheckCircle2 className="absolute -bottom-1 -right-1 h-3.5 w-3.5 text-emerald-500
                bg-background rounded-full" />
            )}
            {status === "rejected" && (
              <XCircle className="absolute -bottom-1 -right-1 h-3.5 w-3.5 text-red-500
                bg-background rounded-full" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <span className="font-medium">{stage.label}</span>
          <span className="text-muted-foreground"> · {statusCfg.label}</span>
          {isActionable && (
            <span className="block text-[10px] text-muted-foreground mt-0.5">
              Click to review
            </span>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// ─── User Row ─────────────────────────────────────────────────────────────────
//our actual row to show the data of the user row  

interface UserRowProps {
  user: OnboardingUser;
  onStageClick: (userId: number, stage: StageKey) => void;
}

const UserRow: React.FC<UserRowProps> = ({ user, onStageClick }) => {
  const submittedCount = Object.values(user.stages).filter(
    (s) => s === "submitted" || s === "resubmitted"
  ).length;

  return (
    <div
      className={cn(
        "group flex items-center gap-4 px-4 py-3.5 rounded-xl border bg-card",
        "transition-all duration-150",
        "hover:shadow-sm hover:border-border/80",
        user.hasRejection && "border-l-2 border-l-red-300 dark:border-l-red-700",
      )}
    >
      {/* Avatar */}
      <AvatarComponent user= {user} />

      {/* Name + email */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{user.name}</span>
          {submittedCount > 0 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full
              bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 tabular-nums">
              {submittedCount} to review
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
          <Mail className="h-3 w-3 flex-shrink-0" />
          {user.email}
        </p>
      </div>

      {/* Stage boxes */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {STAGES.map((stage) => (
          <StageBox
            key={stage.key}
            stageKey={stage.key}
            status={user.stages[stage.key]}
            onClick={() => onStageClick(user.id, stage.key)}
          />
        ))}
      </div>
    </div>
  );
};

// ─── Entry Card (inside modal) ────────────────────────────────────────────────

interface EntryCardProps {
  entry: StageEntry;
  stageKey: StageKey;
  index: number;
  total: number;
  onApprove: (id: number) => void;
  onReject: (id: number, reason: string) => void;
  isActioning: boolean;
}

const EntryCard: React.FC<EntryCardProps> = ({
  entry,
  stageKey,
  index,
  total,
  onApprove,
  onReject,
  isActioning,
}) => {
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [localStatus, setLocalStatus] = useState<EntryStatus | null>(null);

  const displayStatus = localStatus ?? (entry.hrStatus as EntryStatus) ?? "pending";
  const statusCfg = STATUS_STYLES[displayStatus];
  const isActionable = displayStatus !== "approved" && displayStatus !== "rejected";

  const handleApprove = () => {
    setLocalStatus("approved");
    onApprove(entry.id);
  };

  const handleReject = () => {
    if (!reason.trim()) return;
    setLocalStatus("rejected");
    onReject(entry.id, reason.trim());
    setShowReject(false);
  };

  // Render fields based on stage type
  const renderFields = () => {
    switch (stageKey) {
      case "experience":
        return (
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <DetailField icon={Building2} label="Company" value={entry.companyName} />
            <DetailField icon={Briefcase} label="Designation" value={entry.designation} />
            <DetailField icon={Calendar} label="From" value={formatDate(entry.fromDate)} />
            <DetailField
              icon={Calendar}
              label="To"
              value={entry.currentlyWorking ? "Present" : formatDate(entry.toDate)}
            />
            {entry.responsibilities && (
              <div className="col-span-2">
                <DetailField icon={BookOpen} label="Responsibilities" value={entry.responsibilities} />
              </div>
            )}
          </div>
        );

      case "education":
        return (
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <DetailField icon={GraduationCap} label="Degree" value={entry.degree} />
            <DetailField icon={Building2} label="Institution" value={entry.institution} />
            <DetailField icon={BookOpen} label="Field of Study" value={entry.fieldOfStudy} />
            <DetailField icon={Hash} label="Grade" value={entry.grade} />
          </div>
        );

      case "documents":
        return (
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <DetailField icon={FileText} label="Category" value={entry.docCategory} />
            <DetailField icon={FileText} label="Type" value={entry.docType} />
            <DetailField icon={Hash} label="Document No." value={entry.docNumber} />
            {/* <DetailField icon={Calendar} label="Issue Date" value={formatDate(entry.issueDate)} />
            <DetailField icon={Calendar} label="Expiry Date" value={formatDate(entry.expiryDate)} /> */}
            {entry.fileUrl && (
              <div className="col-span-2 mt-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-foreground">Document Preview</p>
                  <a
                    href={entry.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10 px-2.5 py-1 rounded-md transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open Full Size
                  </a>
                </div>
                <div className="relative w-full h-48 sm:h-64 rounded-xl border bg-muted/20 overflow-hidden flex items-center justify-center group">
                  {entry.fileUrl.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp)$/i) ? (
                    <img
                      src={entry.fileUrl}
                      alt="Document Preview"
                      className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                  ) : entry.fileUrl.match(/\.pdf$/i) ? (
                    <iframe
                      src={`${entry.fileUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                      className="w-full h-full bg-white"
                      title="PDF Preview"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <FileText className="h-8 w-8 opacity-40" />
                      <span className="text-xs font-medium">Preview not available for this file format</span>
                    </div>
                  )}
                  {/* Inner shadow overlay for depth */}
                  <div className="absolute inset-0 ring-1 ring-inset ring-black/5 dark:ring-white/5 pointer-events-none rounded-xl" />
                </div>
              </div>
            )}
          </div>
        );

      case "bankDetails":
        return (
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <DetailField icon={Building2} label="Bank Name" value={entry.bankName} />
            <DetailField icon={CreditCard} label="Account Holder" value={entry.accountHolderName} />
            <DetailField icon={Hash} label="Account Number" value={entry.accountNumber} />
            <DetailField icon={Hash} label="IFSC Code" value={entry.ifscCode} />
            <DetailField icon={MapPin} label="Branch" value={entry.branchName} />
            {entry.upiId && <DetailField icon={CreditCard} label="UPI ID" value={entry.upiId} />}
            {entry.isPrimary && (
              <div className="col-span-2">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full
                  bg-primary/10 text-primary">
                  Primary Account
                </span>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border transition-all duration-300",
        displayStatus === "approved" && "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/10 dark:border-emerald-900",
        displayStatus === "rejected" && "bg-red-50/50 border-red-200 dark:bg-red-950/10 dark:border-red-900",
        (displayStatus === "submitted" || displayStatus === "resubmitted") && "bg-card border-border",
        displayStatus === "pending" && "bg-muted/30 border-border",
      )}
    >
      {/* Entry header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-inherit">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">
            Entry {index + 1} of {total}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full",
              displayStatus === "approved" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
              displayStatus === "rejected" && "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
              (displayStatus === "submitted" || displayStatus === "resubmitted") && "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
              displayStatus === "pending" && "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
            {statusCfg.label}
          </span>
        </div>

        {/* Action buttons for actionable entries */}
        {isActionable && !showReject && (
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50
                dark:text-red-400 dark:hover:bg-red-950/30"
              onClick={() => setShowReject(true)}
              disabled={isActioning}
            >
              <X className="h-3 w-3 mr-1" />
              Reject
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleApprove}
              disabled={isActioning}
            >
              {isActioning ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Check className="h-3 w-3 mr-1" />
              )}
              Approve
            </Button>
          </div>
        )}

        {/* Confirmed status icons */}
        {displayStatus === "approved" && (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        )}
        {displayStatus === "rejected" && (
          <XCircle className="h-4 w-4 text-red-500" />
        )}
      </div>

      {/* Entry body */}
      <div className="px-4 py-4">{renderFields()}</div>

      {/* Rejection reason input */}
      {showReject && (
        <div className="px-4 pb-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <Separator />
          <div>
            <label className="text-xs font-medium">
              Rejection reason <span className="text-destructive">*</span>
            </label>
            <Textarea
              className="mt-1.5 text-sm resize-none"
              placeholder="Describe what needs to be corrected…"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setShowReject(false);
                setReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-xs"
              disabled={!reason.trim() || isActioning}
              onClick={handleReject}
            >
              {isActioning ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <X className="h-3 w-3 mr-1" />
              )}
              Confirm Reject
            </Button>
          </div>
        </div>
      )}

      {/* Existing rejection remark */}
      {displayStatus === "rejected" && (entry.hrRemark || reason) && (
        <div className="px-4 pb-4">
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/20
            border border-red-100 dark:border-red-900">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-600 dark:text-red-400">
              {entry.hrRemark || reason}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Detail Field ─────────────────────────────────────────────────────────────

const DetailField: React.FC<{
  icon: React.ElementType;
  label: string;
  value?: string | number | null;
}> = ({ icon: Icon, label, value }) => (
  <div>
    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mb-0.5">
      <Icon className="h-3 w-3" />
      {label}
    </p>
    <p className="text-sm font-medium text-foreground break-words">
      {value || <span className="text-muted-foreground/50 italic text-xs">Not provided</span>}
    </p>
  </div>
);

// ─── Stage Review Modal ───────────────────────────────────────────────────────

interface StageModalProps {
  open: boolean;
  onClose: () => void;
  userId: number | null;
  userName: string;
  stageKey: StageKey | null;
}

const StageReviewModal: React.FC<StageModalProps> = ({
  open,
  onClose,
  userId,
  userName,
  stageKey,
}) => {
  const stage = STAGES.find((s) => s.key === stageKey) ?? STAGES[0];
  const Icon = stage.icon;

  // Fetch entries based on stage
  const educationQuery = useEducation(stageKey === "education" ? userId : null);
  const experienceQuery = useExperience(stageKey === "experience" ? userId : null);
  const documentsQuery = useDocuments(stageKey === "documents" ? userId : null);
  const bankQuery = useBankDetails(stageKey === "bankDetails" ? userId : null);

  const updateStatusMutation = useUpdateEntryStatus(stageKey ?? "education");

  // Select the right query
  const activeQuery = useMemo(() => {
    switch (stageKey) {
      case "education":
        return educationQuery;
      case "experience":
        return experienceQuery;
      case "documents":
        return documentsQuery;
      case "bankDetails":
        return bankQuery;
      default:
        return { data: [], isLoading: false, isError: false };
    }
  }, [stageKey, educationQuery, experienceQuery, documentsQuery, bankQuery]);

  const entries = (activeQuery.data ?? []) as StageEntry[];
  const isLoading = activeQuery.isLoading;
  const isError = activeQuery.isError;

  const handleApprove = useCallback(
    (entryId: number) => {
      updateStatusMutation.mutate({ entryId, onboardingId: userId!, status: 'approved' });
    },
    [updateStatusMutation, userId]
  );

  const handleReject = useCallback(
    (entryId: number, reason: string) => {
      updateStatusMutation.mutate({ entryId, onboardingId: userId!, status: 'rejected', reason });
    },
    [updateStatusMutation, userId]
  );

  const submittedCount = entries.filter(
    (e) => {
      const s = e.hrStatus ?? e.status;
      return s === "submitted" || s === "resubmitted";
    }
  ).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center",
                stage.color.light
              )}
            >
              <Icon className={cn("h-5 w-5", stage.color.base)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">{stage.label}</h2>
                {submittedCount > 0 && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full
                    bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                    {submittedCount} pending
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {userName} · {entries.length}{" "}
                {entries.length === 1 ? "entry" : "entries"}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading entries…</p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-xs text-muted-foreground">
                Failed to load data.
              </p>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center">
                <Icon className="h-5 w-5 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium">No entries yet</p>
              <p className="text-xs text-muted-foreground">
                Employee hasn't submitted any {stage.label.toLowerCase()} details.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry, i) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  stageKey={stageKey!}
                  index={i}
                  total={entries.length}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  isActioning={updateStatusMutation.isPending}
                />
              ))}
            </div>
          )}

          {/* Mutation error */}
          {updateStatusMutation.isError && (
            <div className="mt-4 flex items-center gap-2 text-xs text-destructive
              bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              {(approveMutation.error as Error)?.message ||
                (rejectMutation.error as Error)?.message ||
                "Something went wrong. Please try again."}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t flex-shrink-0 flex items-center justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Empty / Error States ─────────────────────────────────────────────────────

const EmptyState: React.FC<{ tab: TabValue; hasSearch: boolean }> = ({
  tab,
  hasSearch,
}) => (
  <div className="flex flex-col items-center justify-center py-16 gap-3">
    <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center">
      {tab === "rejected" ? (
        <XCircle className="h-5 w-5 text-muted-foreground/40" />
      ) : (
        <CheckCircle2 className="h-5 w-5 text-muted-foreground/40" />
      )}
    </div>
    <div className="text-center">
      <p className="text-sm font-medium">
        {hasSearch
          ? "No results found"
          : tab === "rejected"
          ? "No rejected entries"
          : "No employees to show"}
      </p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">
        {hasSearch
          ? "Try a different search term."
          : tab === "rejected"
          ? "All entries are either pending or approved."
          : "Employees with submissions will appear here."}
      </p>
    </div>
  </div>
);

// ─── Legend ───────────────────────────────────────────────────────────────────

const Legend: React.FC = () => (
  <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
    {(["pending", "submitted", "approved", "rejected"] as EntryStatus[]).map((s) => (
      <div key={s} className="flex items-center gap-1.5">
        <span className={cn("w-2 h-2 rounded-full", STATUS_STYLES[s].dot)} />
        <span>{STATUS_STYLES[s].label}</span>
      </div>
    ))}
  </div>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const ApprovalDashboard: React.FC = () => {
  const { data: rawUsers = [], isLoading, isError, refetch } = useOnboardingList();

  const users: OnboardingUser[] = useMemo(
    () =>
      rawUsers.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        profilePhoto: u.profilePhoto,
        stages: {
          education: (u.educationStatus as EntryStatus) || "pending",
          experience: (u.experienceStatus as EntryStatus) || "pending",
          documents: (u.documentStatus as EntryStatus) || "pending",
          bankDetails: (u.bankStatus as EntryStatus) || "pending",
        },
        hasRejection:
          u.educationStatus === "rejected" ||
          u.experienceStatus === "rejected" ||
          u.documentStatus === "rejected" ||
          u.bankStatus === "rejected",
      })),
    [rawUsers]
  );

  const [activeTab, setActiveTab] = useState<TabValue>("active");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<OnboardingUser | null>(null);
  const [selectedStage, setSelectedStage] = useState<StageKey | null>(null);

  const openStageModal = (userId: number, stage: StageKey) => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      setSelectedUser(user);
      setSelectedStage(stage);
      setModalOpen(true);
    }
  };

  // Counts
  const counts = useMemo(
    () => ({
      active: users.filter((u) => !u.hasRejection || Object.values(u.stages).some(s => s !== "rejected")).length,
      rejected: users.filter((u) => u.hasRejection).length,
    }),
    [users]
  );

  // Filtered list
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return users
      .filter((u) => {
        if (activeTab === "rejected") return u.hasRejection;
        return true; // "active" shows all
      })
      .filter(
        (u) =>
          !q ||
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        // Sort by most actionable first (most "submitted" stages)
        const aSubmitted = Object.values(a.stages).filter((s) => s === "submitted" || s === "resubmitted").length;
        const bSubmitted = Object.values(b.stages).filter((s) => s === "submitted" || s === "resubmitted").length;
        return bSubmitted - aSubmitted;
      });
  }, [users, activeTab, searchQuery]);

  const tabs: { value: TabValue; label: string; icon: React.ElementType }[] = [
    { value: "active", label: "All Employees", icon: CheckCircle2 },
    { value: "rejected", label: "Has Rejections", icon: XCircle },
  ];

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 h-full min-h-0 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Approval Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review and approve employee submissions across all onboarding stages.
          </p>
        </div>

        {/* Stage Legend */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Stage indicators */}
          <div className="flex items-center gap-3">
            {STAGES.map((stage) => {
              const Icon = stage.icon;
              return (
                <div
                  key={stage.key}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded-md flex items-center justify-center",
                      stage.color.light
                    )}
                  >
                    <Icon className={cn("h-3 w-3", stage.color.base)} />
                  </div>
                  <span className="font-medium">{stage.label}</span>
                </div>
              );
            })}
          </div>
          <Legend />
        </div>

        <Separator />

        {/* Controls */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.value;
                const Icon = tab.icon;
                const count = counts[tab.value];
                return (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium",
                      "transition-all duration-150",
                      isActive
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-3.5 w-3.5",
                        isActive && tab.value === "rejected"
                          ? "text-red-500"
                          : ""
                      )}
                    />
                    {tab.label}
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-semibold tabular-nums",
                        isActive && tab.value === "rejected"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                          : isActive
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4
                text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9 h-9 text-sm bg-card"
                placeholder="Search by name or email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{filtered.length}</span>{" "}
            {filtered.length === 1 ? "employee" : "employees"}
          </p>
        </div>

        {/* List Page -> showing the actual values inside our dashboard*/}
        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">
                Loading employees…
              </p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-11 h-11 rounded-xl bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Failed to load data</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Something went wrong. Please try again.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Retry
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState tab={activeTab} hasSearch={!!searchQuery} />
          ) : (
            <div className="space-y-2">
              {filtered.map((user) => (
                // user row actual user row for showing the progress of each and every user
                <UserRow
                  key={user.id}
                  user={user}
                  onStageClick={openStageModal}
                />
              ))}
            </div>
          )}
        </div>

        {/* Stage Review Modal */}
        <StageReviewModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedUser(null);
            setSelectedStage(null);
          }}
          userId={selectedUser?.id ?? null}
          userName={selectedUser?.name ?? ""}
          stageKey={selectedStage}
        />
      </div>
    </TooltipProvider>
  );
};

export default ApprovalDashboard;