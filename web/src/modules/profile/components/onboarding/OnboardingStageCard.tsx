// web/src/modules/profile/components/onboarding/OnboardingStageCard.tsx

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Pencil,
  Eye,
  Upload,
  Lock,
  ExternalLink,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type StageStatus = "pending" | "in_progress" | "completed";

export type ApprovalStatus = "pending" | "approved" | "rejected" | null;

export type RejectionInfo = {
  reason: string;
  rejectedAt?: string;
  rejectedBy?: string;
};

export type StageDetail = {
  label: string;
  value: string | null;
  status?: ApprovalStatus;
};

export type DocumentDetail = {
  id: number;
  name: string;
  fileName: string | null;
  status: "pending" | "verified" | "rejected";
  remarks: string | null;
  uploadedAt: string | null;
};

export type InductionTask = {
  id: number;
  name: string;
  type: "BEFORE" | "AFTER";
  status: "pending" | "completed";
};

export type EducationInfo = {
  id: number;
  degree: string;
  institution: string;
  fieldOfStudy?: string | null;
  startDate: string;
  endDate?: string | null;
  grade?: string | null;
};

export type ExperienceInfo = {
  id: number;
  companyName: string;
  designation: string;
  fromDate: string;
  toDate?: string | null;
  currentlyWorking: boolean;
  responsibilities?: string | null;
};

export type BankAccountInfo = {
  id: number;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  isPrimary: boolean;
};

export type StageCardProps = {
  /** Unique key for the stage */
  stageKey: string;
  /** Display label */
  label: string;
  /** Short description */
  description: string;
  /** Icon component */
  icon: React.ElementType;
  /** Current fill status of the stage */
  status: StageStatus;
  /** HR approval status (null if not yet submitted) */
  approvalStatus?: ApprovalStatus;
  /** Rejection details if rejected */
  rejection?: RejectionInfo | null;
  /** Whether this stage is read-only for the employee */
  readOnly?: boolean;
  /** Whether the employee has submitted for review */
  isSubmitted?: boolean;
  /** Animation delay index */
  index?: number;
  /** Whether this card is currently expanded */
  isExpanded?: boolean;
  /** Toggle expand callback */
  onToggleExpand?: () => void;
  /** Action: begin filling this stage */
  onBeginFill?: () => void;
  /** Action: edit/re-fill this stage */
  onEdit?: () => void;
  /** Action: view details read-only */
  onView?: () => void;

  // ── Expanded Content Data ──────────────────────────────────────────────
  /** Summary details for profile stage */
  details?: StageDetail[];
  /** Document list for documents stage */
  documents?: DocumentDetail[];
  /** Induction tasks for induction stage */
  inductionTasks?: InductionTask[];
  /** Education info for education stage */
  education?: EducationInfo[];
  /** Experience info for experience stage */
  experience?: ExperienceInfo[];
  /** Bank accounts for bank stage */
  bankAccounts?: BankAccountInfo[];
  /** Custom expanded content (overrides default) */
  children?: React.ReactNode;
};

// ─────────────────────────────────────────────────────────────────────────────
// Status Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getStageStatusMeta(status: StageStatus) {
  switch (status) {
    case "completed":
      return {
        label: "Completed",
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-50 dark:bg-emerald-950/40",
        border: "border-emerald-200/60 dark:border-emerald-800/40",
        iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
        dot: "bg-emerald-500",
        icon: CheckCircle2,
      };
    case "in_progress":
      return {
        label: "In Progress",
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-50 dark:bg-amber-950/40",
        border: "border-amber-200/60 dark:border-amber-800/40",
        iconBg: "bg-amber-100 dark:bg-amber-900/40",
        dot: "bg-amber-500",
        icon: Clock,
      };
    default:
      return {
        label: "Pending",
        color: "text-muted-foreground",
        bg: "bg-muted/40",
        border: "border-border/50",
        iconBg: "bg-muted/60",
        dot: "bg-muted-foreground/40",
        icon: Clock,
      };
  }
}

function getApprovalMeta(status: ApprovalStatus) {
  switch (status) {
    case "approved":
      return {
        label: "Approved",
        color: "text-emerald-700 dark:text-emerald-300",
        bg: "bg-emerald-50 dark:bg-emerald-950/50",
        border: "border-emerald-200 dark:border-emerald-800/50",
        icon: CheckCircle2,
      };
    case "rejected":
      return {
        label: "Rejected",
        color: "text-red-700 dark:text-red-300",
        bg: "bg-red-50 dark:bg-red-950/50",
        border: "border-red-200 dark:border-red-800/50",
        icon: XCircle,
      };
    case "pending":
      return {
        label: "Pending Review",
        color: "text-blue-700 dark:text-blue-300",
        bg: "bg-blue-50 dark:bg-blue-950/50",
        border: "border-blue-200 dark:border-blue-800/50",
        icon: Clock,
      };
    default:
      return null;
  }
}

function getActionLabel(
  status: StageStatus,
  approvalStatus: ApprovalStatus,
  isSubmitted: boolean,
  readOnly: boolean
): { text: string; icon: React.ElementType } {
  if (readOnly) {
    return { text: "View progress", icon: Eye };
  }
  if (approvalStatus === "rejected") {
    return { text: "Re-fill & resubmit", icon: Pencil };
  }
  if (isSubmitted) {
    return { text: "View details", icon: Eye };
  }
  switch (status) {
    case "pending":
      return { text: "Begin filling", icon: Pencil };
    case "in_progress":
      return { text: "Continue editing", icon: Pencil };
    case "completed":
      return { text: "Review & edit", icon: Eye };
    default:
      return { text: "Open", icon: ExternalLink };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Document Verification Badge
// ─────────────────────────────────────────────────────────────────────────────

function DocStatusBadge({ status }: { status: "pending" | "verified" | "rejected" }) {
  const config = {
    pending: {
      label: "Pending",
      className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50",
      icon: Clock,
    },
    verified: {
      label: "Verified",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50",
      icon: CheckCircle2,
    },
    rejected: {
      label: "Rejected",
      className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50",
      icon: XCircle,
    },
  }[status];

  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
        config.className
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Expanded Content Sections
// ─────────────────────────────────────────────────────────────────────────────

function ProfileDetailsContent({
  details,
  approvalStatus,
  rejection,
  onEdit,
  isSubmitted,
}: {
  details: StageDetail[];
  approvalStatus: ApprovalStatus;
  rejection?: RejectionInfo | null;
  onEdit?: () => void;
  isSubmitted: boolean;
}) {
  const filledDetails = details.filter(d => d.value);
  const emptyDetails = details.filter(d => !d.value);

  return (
    <div className="space-y-4">
      {/* Rejection notice */}
      {approvalStatus === "rejected" && rejection && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50/80 dark:bg-red-950/30 p-4"
        >
          <div className="flex items-start gap-3">
            <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-red-800 dark:text-red-200 mb-1">
                Correction Required
              </p>
              <p className="text-xs text-red-700/80 dark:text-red-300/70 leading-relaxed">
                {rejection.reason}
              </p>
              {rejection.rejectedAt && (
                <p className="text-[10px] text-red-500/60 mt-1.5">
                  {new Date(rejection.rejectedAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>
          {onEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={onEdit}
              className="mt-3 rounded-lg text-xs gap-1.5 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40"
            >
              <Pencil className="h-3 w-3" />
              Edit & Resubmit
            </Button>
          )}
        </motion.div>
      )}

      {/* Filled details grid */}
      {filledDetails.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filledDetails.map((detail, i) => (
            <motion.div
              key={detail.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-xl border border-border/30 bg-muted/20 px-4 py-3"
            >
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                {detail.label}
              </p>
              <p className="text-sm text-foreground font-medium truncate">
                {detail.value}
              </p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty details notice */}
      {emptyDetails.length > 0 && filledDetails.length > 0 && (
        <p className="text-xs text-muted-foreground/70 flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3" />
          {emptyDetails.length} field{emptyDetails.length > 1 ? "s" : ""} not yet filled
        </p>
      )}

      {/* No data state */}
      {filledDetails.length === 0 && (
        <div className="flex flex-col items-center py-8 text-center">
          <div className="rounded-xl bg-muted/40 p-3 mb-3">
            <Pencil className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground font-medium mb-1">
            No details filled yet
          </p>
          <p className="text-xs text-muted-foreground/60">
            Click below to start filling your profile details
          </p>
          {onEdit && !isSubmitted && (
            <Button
              size="sm"
              onClick={onEdit}
              className="mt-4 rounded-lg text-xs gap-1.5"
            >
              <Pencil className="h-3 w-3" />
              Start Filling
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function DocumentsContent({
  documents,
  onEdit,
  isSubmitted,
}: {
  documents: DocumentDetail[];
  onEdit?: () => void;
  isSubmitted: boolean;
}) {
  const rejectedDocs = documents.filter(d => d.status === "rejected");

  return (
    <div className="space-y-3">
      {documents.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <div className="rounded-xl bg-muted/40 p-3 mb-3">
            <Upload className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground font-medium mb-1">
            No documents uploaded
          </p>
          <p className="text-xs text-muted-foreground/60">
            Upload your required documents to proceed
          </p>
          {onEdit && !isSubmitted && (
            <Button
              size="sm"
              onClick={onEdit}
              className="mt-4 rounded-lg text-xs gap-1.5"
            >
              <Upload className="h-3 w-3" />
              Upload Documents
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Rejected docs warning */}
          {rejectedDocs.length > 0 && (
            <div className="rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50/80 dark:bg-red-950/30 px-4 py-3">
              <p className="text-xs font-semibold text-red-700 dark:text-red-300 flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5" />
                {rejectedDocs.length} document{rejectedDocs.length > 1 ? "s" : ""} need
                re-upload
              </p>
            </div>
          )}

          {/* Document list */}
          <div className="space-y-2">
            {documents.map((doc, i) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={cn(
                  "rounded-xl border px-4 py-3 flex items-center justify-between gap-3",
                  doc.status === "rejected"
                    ? "border-red-200/60 dark:border-red-800/40 bg-red-50/40 dark:bg-red-950/20"
                    : "border-border/30 bg-muted/10"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {doc.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {doc.fileName && (
                      <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                        {doc.fileName}
                      </span>
                    )}
                    {doc.uploadedAt && (
                      <span className="text-[10px] text-muted-foreground/60">
                        {new Date(doc.uploadedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    )}
                  </div>
                  {doc.status === "rejected" && doc.remarks && (
                    <p className="text-[11px] text-red-600 dark:text-red-400 mt-1.5 leading-relaxed">
                      Reason: {doc.remarks}
                    </p>
                  )}
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <DocStatusBadge status={doc.status} />
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function BankAccountsContent({ accounts }: { accounts: BankAccountInfo[] }) {
  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <div className="rounded-xl bg-muted/40 p-3 mb-3">
          <CreditCard className="h-5 w-5 text-muted-foreground/50" />
        </div>
        <p className="text-sm text-muted-foreground font-medium mb-1">
          No bank accounts added
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {accounts.map((acc, i) => (
        <motion.div
          key={acc.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className={cn(
            "rounded-xl border p-4",
            acc.isPrimary
              ? "border-emerald-200/50 bg-emerald-50/20 dark:border-emerald-800/30 dark:bg-emerald-950/10"
              : "border-border/30 bg-muted/10"
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-bold text-foreground truncate">
                  {acc.bankName}
                </p>
                {acc.isPrimary && (
                  <Badge variant="secondary" className="text-[10px] h-5 rounded-full px-2">
                    Primary
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{acc.accountHolderName}</p>
              <div className="flex items-center gap-4 mt-2">
                <p className="text-xs font-mono text-foreground tracking-wide">
                  •••• {acc.accountNumber.slice(-4)}
                </p>
                <p className="text-xs font-mono text-muted-foreground">{acc.ifscCode}</p>
              </div>
            </div>
            <div className="shrink-0 rounded-lg bg-muted p-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function InductionContent({ tasks }: { tasks: InductionTask[] }) {
  const beforeTasks = tasks.filter(t => t.type === "BEFORE");
  const afterTasks = tasks.filter(t => t.type === "AFTER");
  const completedCount = tasks.filter(t => t.status === "completed").length;

  const renderGroup = (label: string, items: InductionTask[]) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          {label}
        </p>
        {items.map((task, i) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-4 py-3",
              task.status === "completed"
                ? "border-emerald-200/50 dark:border-emerald-800/30 bg-emerald-50/30 dark:bg-emerald-950/15"
                : "border-border/30 bg-muted/10"
            )}
          >
            {task.status === "completed" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            ) : (
              <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
            )}
            <span
              className={cn(
                "text-sm font-medium",
                task.status === "completed"
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-foreground"
              )}
            >
              {task.name}
            </span>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Induction progress mini bar */}
      {tasks.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Task Progress</span>
            <span className="text-foreground font-semibold tabular-nums">
              {completedCount}/{tasks.length}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-emerald-500/80"
              initial={{ width: 0 }}
              animate={{
                width: tasks.length > 0 ? `${(completedCount / tasks.length) * 100}%` : "0%",
              }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
            />
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <div className="rounded-xl bg-muted/40 p-3 mb-3">
            <Lock className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground font-medium mb-1">
            No induction tasks yet
          </p>
          <p className="text-xs text-muted-foreground/60">
            HR will assign induction tasks once your profile is reviewed
          </p>
        </div>
      ) : (
        <>
          {renderGroup("Before Joining", beforeTasks)}
          {renderGroup("After Joining", afterTasks)}
        </>
      )}

      {/* Read-only notice */}
      <div className="flex items-center gap-2 pt-2 border-t border-border/20">
        <Lock className="h-3 w-3 text-muted-foreground/50" />
        <span className="text-[10px] text-muted-foreground/60">
          Induction tasks are managed by HR
        </span>
      </div>
    </div>
  );
}

function EducationContent({ education }: { education: EducationInfo[] }) {
  if (education.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <div className="rounded-xl bg-muted/40 p-3 mb-3">
          <AlertCircle className="h-5 w-5 text-muted-foreground/50" />
        </div>
        <p className="text-sm text-muted-foreground font-medium mb-1">
          No education history added
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {education.map((edu, i) => (
        <motion.div
          key={edu.id || i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="rounded-xl border border-border/30 bg-muted/10 p-4"
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground truncate">
                {edu.degree}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {edu.institution}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-muted-foreground/50" />
                  <span className="text-[10px] text-muted-foreground">
                    {edu.startDate ? new Date(edu.startDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "Start"} - 
                    {edu.endDate && new Date(edu.endDate) > new Date()
                      ? " Present" 
                      : edu.endDate 
                        ? ` ${new Date(edu.endDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}` 
                        : " End"
                    }
                  </span>
                </div>
                {edu.grade && (
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-muted-foreground/50" />
                    <span className="text-[10px] text-muted-foreground">{edu.grade}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function ExperienceContent({ experience }: { experience: ExperienceInfo[] }) {
  if (experience.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <div className="rounded-xl bg-muted/40 p-3 mb-3">
          <AlertCircle className="h-5 w-5 text-muted-foreground/50" />
        </div>
        <p className="text-sm text-muted-foreground font-medium mb-1">
          No work history added
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {experience.map((exp, i) => (
        <motion.div
          key={exp.id || i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="rounded-xl border border-border/30 bg-muted/10 p-4"
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground truncate">
                {exp.designation}
              </p>
              <p className="text-xs text-primary font-medium mt-0.5">
                {exp.companyName}
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <Clock className="h-3 w-3 text-muted-foreground/50" />
                <span className="text-[10px] text-muted-foreground">
                  {new Date(exp.fromDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })} - 
                  {exp.currentlyWorking 
                    ? " Present" 
                    : exp.toDate 
                      ? ` ${new Date(exp.toDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}` 
                      : ""
                  }
                </span>
              </div>
              {exp.responsibilities && (
                <p className="text-[11px] text-muted-foreground/70 mt-2 line-clamp-2 italic">
                  "{exp.responsibilities}"
                </p>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function OnboardingStageCard({
  stageKey,
  label,
  description,
  icon: StageIcon,
  status,
  approvalStatus = null,
  rejection = null,
  readOnly = false,
  isSubmitted = false,
  index = 0,
  isExpanded = false,
  onToggleExpand,
  onBeginFill,
  onEdit,
  onView,
  details,
  documents,
  inductionTasks,
  education,
  experience,
  bankAccounts,
  children,
}: StageCardProps) {
  const meta = getStageStatusMeta(status);
  const approval = getApprovalMeta(approvalStatus);
  const action = getActionLabel(status, approvalStatus, isSubmitted, readOnly);
  const ActionIcon = action.icon;

  const hasRejection = approvalStatus === "rejected" && rejection;
  const showPulse = hasRejection || (status === "in_progress" && !isSubmitted);

  // ── Determine what to render in expanded section ─────────────────────
  const hasExpandedContent = Boolean(children || details || documents || inductionTasks || education || experience || bankAccounts);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 * index }}
      className="group/card"
    >
      <div
        className={cn(
          "rounded-2xl border transition-all duration-300 overflow-hidden",
          "bg-background/70 backdrop-blur-sm",
          isExpanded
            ? "shadow-lg shadow-black/[0.06] ring-1 ring-primary/10"
            : "shadow-sm hover:shadow-md hover:shadow-black/[0.04]",
          hasRejection
            ? "border-red-200/70 dark:border-red-800/40"
            : isExpanded
            ? "border-primary/20"
            : meta.border
        )}
      >
        {/* ── Card Header (always visible, clickable) ───────────────────── */}
        <button
          type="button"
          onClick={onToggleExpand}
          className={cn(
            "w-full text-left p-5 sm:p-6 transition-colors duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1",
            isExpanded && "bg-muted/10"
          )}
        >
          <div className="flex items-start gap-4">
            {/* Icon with status indicator */}
            <div className="relative shrink-0">
              <div
                className={cn(
                  "rounded-xl p-2.5 transition-colors duration-300",
                  meta.iconBg
                )}
              >
                <StageIcon className={cn("h-5 w-5", meta.color)} />
              </div>

              {/* Pulse dot for attention */}
              {showPulse && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span
                    className={cn(
                      "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                      hasRejection ? "bg-red-400" : "bg-amber-400"
                    )}
                  />
                  <span
                    className={cn(
                      "relative inline-flex h-2.5 w-2.5 rounded-full",
                      hasRejection ? "bg-red-500" : "bg-amber-500"
                    )}
                  />
                </span>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 mb-1">
                <h3 className="text-sm sm:text-base font-semibold text-foreground group-hover/card:text-primary transition-colors duration-300 truncate">
                  {label}
                </h3>

                {/* Chevron */}
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.25 }}
                  className="shrink-0 mt-0.5"
                >
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </motion.div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">
                {description}
              </p>

              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Stage status badge */}
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                    meta.bg,
                    meta.color
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                  {meta.label}
                </span>

                {/* Approval badge (only if submitted) */}
                {approval && isSubmitted && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                      approval.bg,
                      approval.color,
                      approval.border
                    )}
                  >
                    <approval.icon className="h-3 w-3" />
                    {approval.label}
                  </span>
                )}

                {/* Read-only badge */}
                {readOnly && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    <Lock className="h-2.5 w-2.5" />
                    HR Managed
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action hint footer */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/25">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <ActionIcon className="h-3 w-3" />
              {action.text}
            </span>

            {readOnly && (
              <Badge
                variant="outline"
                className="text-[9px] h-5 rounded-md font-medium opacity-60"
              >
                Read Only
              </Badge>
            )}
          </div>
        </button>

        {/* ── Expanded Content ──────────────────────────────────────────── */}
        <AnimatePresence initial={false}>
          {isExpanded && hasExpandedContent && (
            <motion.div
              key="expanded"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="overflow-hidden"
            >
              <div className="border-t border-border/25 px-5 py-5 sm:px-6 sm:py-6">
                {children ? (
                  children
                ) : details ? (
                  <ProfileDetailsContent
                    details={details}
                    approvalStatus={approvalStatus}
                    rejection={rejection}
                    onEdit={onEdit}
                    isSubmitted={isSubmitted}
                  />
                ) : documents ? (
                  <DocumentsContent
                    documents={documents}
                    onEdit={onEdit}
                    isSubmitted={isSubmitted}
                  />
                ) : education ? (
                  <EducationContent education={education} />
                ) : experience ? (
                  <ExperienceContent experience={experience} />
                ) : bankAccounts ? (
                  <BankAccountsContent accounts={bankAccounts} />
                ) : inductionTasks ? (
                  <InductionContent tasks={inductionTasks} />
                ) : null}

                {/* Action button at bottom of expanded area */}
                {!readOnly && !children && (
                  <div className="flex justify-end mt-5 pt-4 border-t border-border/20">
                    {status === "pending" && !isSubmitted && onBeginFill && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onBeginFill();
                        }}
                        className="rounded-xl text-xs gap-1.5"
                      >
                        <Pencil className="h-3 w-3" />
                        Start Filling
                      </Button>
                    )}

                    {(status === "in_progress" || status === "completed") &&
                      !isSubmitted &&
                      onEdit && (
                        <Button
                          size="sm"
                          variant={approvalStatus === "rejected" ? "default" : "outline"}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit();
                          }}
                          className={cn(
                            "rounded-xl text-xs gap-1.5",
                            approvalStatus === "rejected" &&
                              "bg-red-600 hover:bg-red-700 text-white"
                          )}
                        >
                          <Pencil className="h-3 w-3" />
                          {approvalStatus === "rejected" ? "Edit & Resubmit" : "Edit"}
                        </Button>
                      )}

                    {isSubmitted && onView && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onView();
                        }}
                        className="rounded-xl text-xs gap-1.5"
                      >
                        <Eye className="h-3 w-3" />
                        View Full Details
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}