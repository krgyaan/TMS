// pages/tasks/TaskDetail.tsx
import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { paths } from "@/app/routes/paths";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  FileEdit,
  Calendar,
  User,
  Flag,
  Paperclip,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  MessageSquare,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type TaskStatus = "Not Started" | "In Progress" | "Completed" | "Blocked";
type TaskPriority = "High" | "Medium" | "Low";
type TaskScore = "Green" | "Yellow" | "Red";

interface TimelineEntry {
  id: string;
  date: string;
  event: string;
  actor: string;
  detail?: string;
  type: "created" | "updated" | "completed" | "blocked" | "reassigned" | "comment";
}

interface Attachment {
  name: string;
  size: string;
  uploadedAt: string;
  uploadedBy: string;
}

interface TaskDetailData {
  id: string;
  teamMember: string;
  taskName: string;
  description: string;
  priority: TaskPriority;
  assignedBy: string;
  assignedDate: string;
  dueDate: string;
  status: TaskStatus;
  score: TaskScore;
  completedDate?: string;
  reassignedCount: number;
  attachments: Attachment[];
  timeline: TimelineEntry[];
}

// ─── Dummy Data ───────────────────────────────────────────────────────────────
const dummyDetail: TaskDetailData = {
  id: "TASK-0001",
  teamMember: "Alice Johnson",
  taskName: "Prepare Q2 Report",
  description:
    "Compile and format the quarterly financial report for Q2 2025. Include revenue breakdown, expense analysis, and year-over-year comparison. Submit to finance department for review before the board meeting.",
  priority: "High",
  assignedBy: "David Lee",
  assignedDate: "2025-06-01",
  dueDate: "2025-06-20",
  status: "In Progress",
  score: "Green",
  reassignedCount: 1,
  attachments: [
    {
      name: "Q2_template.xlsx",
      size: "245 KB",
      uploadedAt: "2025-06-01",
      uploadedBy: "David Lee",
    },
    {
      name: "instructions.pdf",
      size: "88 KB",
      uploadedAt: "2025-06-01",
      uploadedBy: "David Lee",
    },
  ],
  timeline: [
    {
      id: "t1",
      date: "2025-06-01 09:00",
      event: "Task Created",
      actor: "David Lee",
      detail: "Task assigned to Alice Johnson with High priority",
      type: "created",
    },
    {
      id: "t2",
      date: "2025-06-01 09:05",
      event: "Email Notification Sent",
      actor: "System",
      detail: "Assignment email sent to alice@company.com",
      type: "updated",
    },
    {
      id: "t3",
      date: "2025-06-03 14:22",
      event: "Status Updated",
      actor: "Alice Johnson",
      detail: "Changed from Not Started → In Progress",
      type: "updated",
    },
    {
      id: "t4",
      date: "2025-06-05 10:15",
      event: "Due Date Changed",
      actor: "Alice Johnson",
      detail: "Extended from Jun 15 → Jun 20. Reason: Awaiting Q1 data",
      type: "reassigned",
    },
    {
      id: "t5",
      date: "2025-06-06 08:00",
      event: "Reminder Sent",
      actor: "System",
      detail: "14-day reminder email dispatched",
      type: "comment",
    },
  ],
};

// ─── Helper Components ────────────────────────────────────────────────────────
const ScoreBadge: React.FC<{ score: TaskScore }> = ({ score }) => {
  const config = {
    Green: { label: "Green", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
    Yellow: { label: "Yellow", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
    Red: { label: "Red", className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
  };
  const dot = { Green: "bg-emerald-500", Yellow: "bg-amber-500", Red: "bg-red-500" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${config[score].className}`}>
      <span className={`w-2 h-2 rounded-full ${dot[score]}`} />
      {config[score].label}
    </span>
  );
};

const StatusBadge: React.FC<{ status: TaskStatus }> = ({ status }) => {
  const config: Record<TaskStatus, string> = {
    "Not Started": "bg-muted text-muted-foreground border-border",
    "In Progress": "bg-primary/10 text-primary border-primary/20",
    Completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    Blocked: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${config[status]}`}>
      {status}
    </span>
  );
};

const PriorityBadge: React.FC<{ priority: TaskPriority }> = ({ priority }) => {
  const config: Record<TaskPriority, string> = {
    High: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    Medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    Low: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${config[priority]}`}>
      {priority}
    </span>
  );
};

const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const InfoRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}> = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
    <div className="text-muted-foreground/50 shrink-0 mt-0.5">{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-bold uppercase text-muted-foreground opacity-70 mb-0.5">{label}</p>
      <div className="text-sm font-semibold text-foreground/90">{value}</div>
    </div>
  </div>
);

// ─── Timeline Icon ─────────────────────────────────────────────────────────────
const TimelineIcon: React.FC<{ type: TimelineEntry["type"] }> = ({ type }) => {
  const config = {
    created: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, className: "bg-emerald-500/10 text-emerald-600" },
    updated: { icon: <Clock className="h-3.5 w-3.5" />, className: "bg-primary/10 text-primary" },
    completed: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, className: "bg-emerald-500/10 text-emerald-600" },
    blocked: { icon: <AlertCircle className="h-3.5 w-3.5" />, className: "bg-destructive/10 text-destructive" },
    reassigned: { icon: <RotateCcw className="h-3.5 w-3.5" />, className: "bg-amber-500/10 text-amber-600" },
    comment: { icon: <MessageSquare className="h-3.5 w-3.5" />, className: "bg-muted text-muted-foreground" },
  };
  const { icon, className } = config[type];
  return (
    <div className={`w-7 h-7 rounded-full border border-current/10 flex items-center justify-center shrink-0 ${className}`}>
      {icon}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const TaskDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  // In production: fetch task by id. Using dummy data here.
  const task = dummyDetail;

  const daysUntilDue = Math.ceil(
    (new Date(task.dueDate).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24)
  );

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Back */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(paths.accounts.delegation)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
        <Button
          onClick={() => navigate(paths.accounts.delegationUpdate(task.id))}
          className="gap-2"
        >
          <FileEdit className="h-4 w-4" />
          Update Status
        </Button>
      </div>

      {/* Title Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[10px] font-bold uppercase text-muted-foreground/60">
                  {task.id}
                </span>
              </div>
              <h1 className="text-xl font-bold text-foreground mb-3">
                {task.taskName}
              </h1>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
                <ScoreBadge score={task.score} />
                {task.reassignedCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    <RotateCcw className="h-3 w-3" />
                    Rescheduled {task.reassignedCount}×
                  </span>
                )}
              </div>
            </div>

            {/* Due Date Alert */}
            {task.status !== "Completed" && (
              <div
                className={`shrink-0 rounded-2xl border px-5 py-3 text-center min-w-[120px] shadow-sm ${
                  daysUntilDue < 0
                    ? "bg-destructive/10 border-destructive/20"
                    : daysUntilDue === 0
                    ? "bg-amber-500/10 border-amber-500/20"
                    : daysUntilDue <= 3
                    ? "bg-amber-500/10 border-amber-500/20"
                    : "bg-muted/50 border-border"
                }`}
              >
                <p
                  className={`text-2xl font-bold ${
                    daysUntilDue < 0
                      ? "text-red-600"
                      : daysUntilDue <= 3
                      ? "text-amber-600"
                      : "text-slate-700"
                  }`}
                >
                  {daysUntilDue < 0
                    ? Math.abs(daysUntilDue)
                    : daysUntilDue}
                </p>
                <p
                  className={`text-xs mt-0.5 uppercase font-bold tracking-wider ${
                    daysUntilDue < 0
                      ? "text-destructive"
                      : daysUntilDue <= 3
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-muted-foreground"
                  }`}
                >
                  {daysUntilDue < 0
                    ? "days overdue"
                    : daysUntilDue === 0
                    ? "due today"
                    : "days left"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Body Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Info + Description + Attachments */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                {task.description}
              </p>
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Attachments & Proof
              </CardTitle>
            </CardHeader>
            <CardContent>
              {task.attachments.length === 0 ? (
                <p className="text-sm text-slate-400">No attachments</p>
              ) : (
                <div className="space-y-2">
                  {task.attachments.map((a, i) => (
                    <div
                      className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors group"
                    >
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Paperclip className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground/90 truncate">
                          {a.name}
                        </p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-50">
                          {a.size} · Uploaded by {a.uploadedBy} on{" "}
                          {formatDate(a.uploadedAt)}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" className="text-blue-600">
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Task Info */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Task Info</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border/50 p-0 px-6 pb-4">
              <InfoRow
                icon={<User className="h-4 w-4" />}
                label="Assigned To"
                value={
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                      {task.teamMember.charAt(0)}
                    </div>
                    <span className="font-semibold text-foreground/90">{task.teamMember}</span>
                  </div>
                }
              />
              <InfoRow
                icon={<User className="h-4 w-4" />}
                label="Assigned By"
                value={task.assignedBy}
              />
              <InfoRow
                icon={<Flag className="h-4 w-4" />}
                label="Priority"
                value={<PriorityBadge priority={task.priority} />}
              />
              <InfoRow
                icon={<Calendar className="h-4 w-4" />}
                label="Assigned Date"
                value={formatDate(task.assignedDate)}
              />
              <InfoRow
                icon={<Calendar className="h-4 w-4" />}
                label="Due Date"
                value={formatDate(task.dueDate)}
              />
              {task.completedDate && (
                <InfoRow
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  label="Completed On"
                  value={formatDate(task.completedDate)}
                />
              )}
              <InfoRow
                icon={<RotateCcw className="h-4 w-4" />}
                label="Rescheduled"
                value={`${task.reassignedCount} time(s)`}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative pl-4">
            {/* Vertical line */}
            <div className="absolute left-[27px] top-0 bottom-0 w-px bg-border" />
            <div className="space-y-4">
              {task.timeline.map((entry, idx) => (
                <div key={entry.id} className="flex gap-4 relative">
                  <TimelineIcon type={entry.type} />
                  <div className="flex-1 min-w-0 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <p className="text-sm font-bold text-foreground/90">
                        {entry.event}
                      </p>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-50">
                        {entry.date}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-50 mt-0.5">
                      by{" "}
                      <span className="text-primary/80">
                        {entry.actor}
                      </span>
                    </p>
                    {entry.detail && (
                      <p className="text-xs font-medium text-foreground/70 mt-2 bg-muted/30 rounded-lg px-3 py-2 border border-border/50 italic">
                        {entry.detail}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TaskDetail;