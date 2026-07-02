// pages/tasks/TaskStatusUpdate.tsx
import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { paths } from "@/app/routes/paths";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  Info,
  Calendar,
  User,
  Flag,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type TaskStatus = "Not Started" | "In Progress" | "Completed" | "Blocked";

interface StatusUpdateForm {
  isCompleted: "yes" | "no" | "";
  status: TaskStatus | "";
  proof: File | null;
  comments: string;
  reassignDueDate: string;
}

// ─── Dummy context task ───────────────────────────────────────────────────────
const contextTask = {
  id: "TASK-0001",
  taskName: "Prepare Q2 Report",
  teamMember: "Alice Johnson",
  assignedBy: "David Lee",
  dueDate: "2025-06-20",
  priority: "High" as const,
  currentStatus: "In Progress" as TaskStatus,
};

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_OPTIONS: {
  value: TaskStatus;
  label: string;
  icon: React.ReactNode;
  className: string;
}[] = [
  {
    value: "Not Started",
    label: "Not Started",
    icon: <Clock className="h-4 w-4" />,
    className:
      "border-border bg-muted/50 text-muted-foreground hover:border-primary/50",
  },
  {
    value: "In Progress",
    label: "In Progress",
    icon: <Clock className="h-4 w-4 text-primary" />,
    className:
      "border-primary/20 bg-primary/10 text-primary hover:border-primary/50",
  },
  {
    value: "Completed",
    label: "Completed",
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    className:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:border-emerald-500/50",
  },
  {
    value: "Blocked",
    label: "Blocked",
    icon: <XCircle className="h-4 w-4 text-destructive" />,
    className:
      "border-destructive/20 bg-destructive/10 text-destructive hover:border-destructive/50",
  },
];

// ─── Info Panel ───────────────────────────────────────────────────────────────
const TaskContextPanel: React.FC<{ task: typeof contextTask }> = ({
  task,
}) => {
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const daysLeft = Math.ceil(
    (new Date(task.dueDate).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const priorityColors = {
    High: "text-destructive bg-destructive/10 border-destructive/20",
    Medium: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
    Low: "text-muted-foreground bg-muted border-border",
  };

  return (
    <Card className="lg:sticky lg:top-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Task Reference</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs text-slate-500 font-mono">{task.id}</p>
          <p className="text-sm font-semibold text-slate-800 mt-0.5 leading-tight">
            {task.taskName}
          </p>
        </div>

        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <User className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-400">Assigned to:</span>
            <span className="font-medium">{task.teamMember}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <User className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-400">Assigned by:</span>
            <span className="font-medium">{task.assignedBy}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-400">Due:</span>
            <span className="font-medium">{formatDate(task.dueDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Flag className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-400">Priority:</span>
            <span
              className={`font-medium px-1.5 py-0.5 rounded border text-xs ${
                priorityColors[task.priority]
              }`}
            >
              {task.priority}
            </span>
          </div>
        </div>

        {/* Days left pill */}
        <div
          className={`rounded-xl p-4 text-center border shadow-sm ${
            daysLeft < 0
              ? "bg-destructive/10 border-destructive/20"
              : daysLeft <= 3
              ? "bg-amber-500/10 border-amber-500/20"
              : "bg-muted/50 border-border"
          }`}
        >
          <p
            className={`text-xl font-bold ${
              daysLeft < 0
                ? "text-red-600"
                : daysLeft <= 3
                ? "text-amber-600"
                : "text-slate-700"
            }`}
          >
            {daysLeft < 0 ? Math.abs(daysLeft) : daysLeft}
          </p>
          <p
            className={`text-xs ${
              daysLeft < 0
                ? "text-red-500"
                : daysLeft <= 3
                ? "text-amber-500"
                : "text-slate-500"
            }`}
          >
            {daysLeft < 0
              ? "days overdue"
              : daysLeft === 0
              ? "due today"
              : "days remaining"}
          </p>
        </div>

        {/* Current status */}
        <div className="pt-2 border-t border-border/50">
          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 opacity-70">Current Status</p>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
            <Clock className="h-3 w-3" />
            {task.currentStatus}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Scoring Preview ──────────────────────────────────────────────────────────
const ScoringPreview: React.FC<{
  isCompleted: string;
  hasReassigned: boolean;
}> = ({ isCompleted, hasReassigned }) => {
  let score: "Green" | "Yellow" | "Red" | null = null;
  let reason = "";

  if (isCompleted === "yes" && !hasReassigned) {
    score = "Green";
    reason = "Completed on time without rescheduling";
  } else if (isCompleted === "yes" && hasReassigned) {
    score = "Yellow";
    reason = "Completed but due date was rescheduled";
  } else if (isCompleted === "no") {
    score = "Red";
    reason = "Marked as incomplete";
  }

  if (!score) return null;

  const config = {
    Green: {
      className: "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-400",
      dot: "bg-emerald-500",
    },
    Yellow: {
      className: "bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-400",
      dot: "bg-amber-500",
    },
    Red: {
      className: "bg-destructive/10 border-destructive/20 text-destructive",
      dot: "bg-destructive",
    },
  };
  const { className, dot } = config[score];

  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-xl border shadow-sm ${className}`}
    >
      <span className={`w-3 h-3 rounded-full shrink-0 ${dot} animate-pulse`} />
      <div>
        <p className="text-[10px] font-bold uppercase opacity-70">
          Projected Score: {score}
        </p>
        <p className="text-sm font-semibold mt-0.5">{reason}</p>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const TaskStatusUpdate: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const task = contextTask; // In production, fetch by id

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState<StatusUpdateForm>({
    isCompleted: "",
    status: task.currentStatus,
    proof: null,
    comments: "",
    reassignDueDate: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof StatusUpdateForm, string>>
  >({});

  const set = (field: keyof StatusUpdateForm, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // Auto-sync status when completion is set
  const handleCompletionChange = (value: "yes" | "no") => {
    set("isCompleted", value);
    if (value === "yes") set("status", "Completed");
    else if (value === "no" && form.status === "Completed")
      set("status", "In Progress");
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof StatusUpdateForm, string>> = {};
    if (!form.isCompleted)
      newErrors.isCompleted = "Please indicate completion";
    if (!form.status) newErrors.status = "Please select a status";
    if (form.isCompleted === "yes" && !form.proof)
      newErrors.proof = "Proof of completion is required";
    if (!form.comments.trim())
      newErrors.comments = "Please add a comment or note";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1000));
    setIsSubmitting(false);
    toast.success("Task status updated successfully!");
    navigate(paths.accounts.delegationView(task.id));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Back */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(paths.accounts.delegationView(task.id))}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Task
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Update Task Status</CardTitle>
              <CardDescription>
                Report your progress and update the status for{" "}
                <strong>{task.taskName}</strong>
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} noValidate className="space-y-6">
                {/* Section: Completion */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 pb-2 border-b">
                    Completion Status
                  </h3>

                  <div className="mb-4">
                    <label className="text-sm font-semibold text-foreground/90 block mb-2">
                      Is this task completed?
                      <span className="text-destructive ml-0.5">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        {
                          value: "yes",
                          label: "Yes, Completed",
                          icon: (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          ),
                          active:
                            "border-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-300 dark:ring-emerald-500/30",
                          inactive: "border-border bg-muted/30 hover:border-muted-foreground/30",
                        },
                        {
                          value: "no",
                          label: "No, Not Yet",
                          icon: (
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                          ),
                          active:
                            "border-amber-400 bg-amber-500/10 ring-1 ring-amber-300 dark:ring-amber-500/30",
                          inactive: "border-border bg-muted/30 hover:border-muted-foreground/30",
                        },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            handleCompletionChange(opt.value as "yes" | "no")
                          }
                          className={`flex items-center gap-3 p-4 rounded-lg border transition-all text-left ${
                            form.isCompleted === opt.value
                              ? opt.active
                              : opt.inactive
                          }`}
                        >
                          {opt.icon}
                          <span className="text-sm font-medium text-slate-700">
                            {opt.label}
                          </span>
                        </button>
                      ))}
                    </div>
                    {errors.isCompleted && (
                      <p className="text-[10px] font-bold text-destructive mt-1 uppercase">
                        {errors.isCompleted}
                      </p>
                    )}
                  </div>

                  {/* Status picker */}
                  <div>
                    <label className="text-sm font-semibold text-foreground/90 block mb-2">
                      Task Status
                      <span className="text-destructive ml-0.5">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {STATUS_OPTIONS.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => set("status", s.value)}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-[10px] font-bold uppercase transition-all shadow-sm ${
                            form.status === s.value
                              ? `${s.className} ring-2 ring-offset-2 ring-offset-background`
                              : "border-border bg-muted/20 hover:bg-muted/40 text-muted-foreground"
                          }`}
                        >
                          {s.icon}
                          {s.label}
                        </button>
                      ))}
                    </div>
                    {errors.status && (
                      <p className="text-[10px] font-bold text-destructive mt-1 uppercase">
                        {errors.status}
                      </p>
                    )}
                  </div>
                </div>

                {/* Section: Evidence */}
                <div>
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-4 pb-2 border-b border-border">
                    Evidence & Notes
                  </h3>

                  {/* Proof Upload */}
                  <div className="mb-4">
                    <label className="text-sm font-semibold text-foreground/90 block mb-1.5">
                      Proof of Completion
                      {form.isCompleted === "yes" && (
                        <span className="text-destructive ml-0.5">*</span>
                      )}
                    </label>
                    <label
                      className={`flex items-center gap-3 px-4 py-4 border border-dashed rounded-xl cursor-pointer hover:bg-muted/50 transition-colors ${
                        errors.proof
                          ? "border-destructive bg-destructive/5"
                          : "border-border bg-muted/20"
                      }`}
                    >
                      <div
                        className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                          form.proof ? "bg-primary/20" : "bg-muted"
                        }`}
                      >
                        <Paperclip
                          className={`h-5 w-5 ${
                            form.proof
                              ? "text-blue-500"
                              : "text-slate-400"
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        {form.proof ? (
                          <div>
                            <p className="text-sm font-bold text-foreground/90 truncate">
                              {form.proof.name}
                            </p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">
                              {(form.proof.size / 1024).toFixed(1)} KB ·
                              Click to change
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm font-bold text-muted-foreground">
                              Upload proof document
                            </p>
                            <p className="text-[10px] font-bold text-muted-foreground/50 uppercase">
                              Screenshot, PDF, or image · Max 10MB
                            </p>
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*,.pdf,.doc,.docx"
                        className="hidden"
                        onChange={(e) =>
                          set("proof", e.target.files?.[0] ?? null)
                        }
                      />
                    </label>
                    {errors.proof && (
                      <p className="text-[10px] font-bold text-destructive mt-1 uppercase">
                        {errors.proof}
                      </p>
                    )}
                  </div>

                  {/* Comments */}
                  <div className="mb-4">
                    <label className="text-sm font-semibold text-foreground/90 block mb-1.5">
                      Comments / Notes
                      <span className="text-destructive ml-0.5">*</span>
                    </label>
                    <Textarea
                      placeholder="Describe what was done, any blockers encountered, or notes for the coordinator..."
                      value={form.comments}
                      onChange={(e) => set("comments", e.target.value)}
                      className={`min-h-[100px] resize-none ${
                        errors.comments ? "border-destructive bg-destructive/5" : "bg-muted/30"
                      }`}
                      maxLength={500}
                    />
                    <div className="flex justify-between mt-1">
                      {errors.comments ? (
                        <p className="text-[10px] font-bold text-destructive uppercase">
                          {errors.comments}
                        </p>
                      ) : (
                        <span />
                      )}
                      <span className="text-[10px] font-bold text-muted-foreground opacity-50">
                        {form.comments.length}/500
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section: Reschedule */}
                <div>
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-4 pb-2 border-b border-border">
                    Due Date (Optional)
                  </h3>
                  <div>
                    <label className="text-sm font-semibold text-foreground/90 block mb-1.5">
                      Request Due Date Extension
                    </label>
                    <Input
                      type="date"
                      min={today}
                      value={form.reassignDueDate}
                      onChange={(e) =>
                        set("reassignDueDate", e.target.value)
                      }
                      className="max-w-xs bg-muted/30"
                    />
                    {form.reassignDueDate && (
                      <div className="flex items-start gap-2 mt-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-xs font-medium text-amber-800 dark:text-amber-400">
                          Requesting a due date change may affect your
                          performance score. This change will be logged.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Scoring preview */}
                <ScoringPreview
                  isCompleted={form.isCompleted}
                  hasReassigned={!!form.reassignDueDate}
                />

                {/* Auto-fill info */}
                <div className="flex items-start gap-2 p-4 bg-muted/50 border border-border/50 rounded-xl">
                  <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs font-medium text-muted-foreground/80 leading-relaxed">
                    <strong>Updated By</strong> and{" "}
                    <strong>Updated On</strong> will be auto-recorded from
                    your session on submission.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(paths.accounts.delegationView(task.id))}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Update
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right: Context Panel */}
        <TaskContextPanel task={task} />
      </div>
    </div>
  );
};

export default TaskStatusUpdate;