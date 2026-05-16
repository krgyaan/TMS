// pages/tasks/AddTask.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { ArrowLeft, Send, Paperclip, Info } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Priority = "High" | "Medium" | "Low";

interface AddTaskForm {
  teamMember: string;
  taskName: string;
  taskDescription: string;
  priority: Priority | "";
  assignedBy: string;
  dueDate: string;
  attachment: File | null;
}

// ─── Dummy Data ───────────────────────────────────────────────────────────────
const TEAM_MEMBERS = [
  "Alice Johnson",
  "Bob Smith",
  "Carol White",
  "Daniel Brown",
  "Eva Martinez",
];

const COORDINATORS = ["David Lee", "Sarah Kim", "Michael Chen"];

// ─── Field Label with Optional Indicator ─────────────────────────────────────
const FieldLabel: React.FC<{
  label: string;
  required?: boolean;
  hint?: string;
}> = ({ label, required, hint }) => (
  <div className="flex items-center gap-1 mb-1.5">
    <label className="text-sm font-semibold text-foreground/90">
      {label}
      {required && <span className="text-destructive ml-0.5">*</span>}
    </label>
    {hint && (
      <span title={hint}>
        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
      </span>
    )}
  </div>
);

// ─── Priority Indicator ───────────────────────────────────────────────────────
const PriorityIndicator: React.FC<{ priority: Priority | "" }> = ({
  priority,
}) => {
  if (!priority) return null;
  const config = {
    High: {
      text: "This task will be marked as high priority.",
      className: "bg-destructive/10 border-destructive/20 text-destructive",
    },
    Medium: {
      text: "This task will be marked as medium priority.",
      className: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
    },
    Low: {
      text: "This task will be marked as low priority.",
      className: "bg-muted border-border text-muted-foreground",
    },
  };
  const { text, className } = config[priority];
  return (
    <p className={`text-[11px] font-medium mt-1.5 px-3 py-1.5 rounded-lg border ${className}`}>
      {text}
    </p>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const AddTask: React.FC = () => {
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState<AddTaskForm>({
    teamMember: "",
    taskName: "",
    taskDescription: "",
    priority: "",
    assignedBy: "",
    dueDate: "",
    attachment: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof AddTaskForm, string>>>({});

  const set = (field: keyof AddTaskForm, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof AddTaskForm, string>> = {};
    if (!form.teamMember) newErrors.teamMember = "Please select a team member";
    if (!form.taskName.trim()) newErrors.taskName = "Task name is required";
    if (!form.taskDescription.trim())
      newErrors.taskDescription = "Description is required";
    if (!form.priority) newErrors.priority = "Please select a priority";
    if (!form.assignedBy) newErrors.assignedBy = "Please select coordinator";
    if (!form.dueDate) newErrors.dueDate = "Due date is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1200));
    setIsSubmitting(false);
    toast.success("Task assigned successfully! Notification sent to team member.");
    navigate(paths.accounts.delegation);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    set("attachment", file);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(paths.accounts.delegation)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assign New Task</CardTitle>
          <CardDescription>
            Fill in the details below to assign a task to a team member. An
            email notification will be sent automatically.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} noValidate>
            {/* Section: Assignment */}
            <div className="mb-6">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-4 pb-2 border-b border-border">
                Assignment Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Team Member */}
                <div>
                  <FieldLabel label="Team Member" required />
                  <Select
                    value={form.teamMember}
                    onValueChange={(v) => set("teamMember", v)}
                  >
                  <SelectTrigger
                    className={errors.teamMember ? "border-destructive bg-destructive/5" : "bg-muted/30"}
                  >
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEAM_MEMBERS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.teamMember && (
                    <p className="text-[10px] font-bold text-destructive mt-1 uppercase">
                      {errors.teamMember}
                    </p>
                  )}
                </div>

                {/* Assigned By */}
                <div>
                  <FieldLabel label="Assigned By" required />
                  <Select
                    value={form.assignedBy}
                    onValueChange={(v) => set("assignedBy", v)}
                  >
                    <SelectTrigger
                      className={errors.assignedBy ? "border-destructive bg-destructive/5" : "bg-muted/30"}
                    >
                      <SelectValue placeholder="Select coordinator" />
                    </SelectTrigger>
                    <SelectContent>
                      {COORDINATORS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.assignedBy && (
                    <p className="text-[10px] font-bold text-destructive mt-1 uppercase">
                      {errors.assignedBy}
                    </p>
                  )}
                </div>

                {/* Priority */}
                <div>
                  <FieldLabel
                    label="Priority"
                    required
                    hint="Affects reminder frequency"
                  />
                  <Select
                    value={form.priority}
                    onValueChange={(v) => set("priority", v as Priority)}
                  >
                    <SelectTrigger
                      className={errors.priority ? "border-destructive bg-destructive/5" : "bg-muted/30"}
                    >
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">🔴 High</SelectItem>
                      <SelectItem value="Medium">🟡 Medium</SelectItem>
                      <SelectItem value="Low">🔵 Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <PriorityIndicator priority={form.priority} />
                  {errors.priority && (
                    <p className="text-[10px] font-bold text-destructive mt-1 uppercase">
                      {errors.priority}
                    </p>
                  )}
                </div>

                {/* Due Date */}
                <div>
                  <FieldLabel label="Due Date" required />
                  <Input
                    type="date"
                    min={today}
                    value={form.dueDate}
                    onChange={(e) => set("dueDate", e.target.value)}
                    className={errors.dueDate ? "border-destructive bg-destructive/5" : "bg-muted/30"}
                  />
                  {errors.dueDate && (
                    <p className="text-[10px] font-bold text-destructive mt-1 uppercase">
                      {errors.dueDate}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Section: Task Info */}
            <div className="mb-6">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-4 pb-2 border-b border-border">
                Task Information
              </h3>

              {/* Task Name */}
              <div className="mb-4">
                <FieldLabel label="Task Name" required />
                <Input
                  placeholder="Enter a clear, concise task name"
                  value={form.taskName}
                  onChange={(e) => set("taskName", e.target.value)}
                  className={errors.taskName ? "border-destructive bg-destructive/5" : "bg-muted/30"}
                  maxLength={100}
                />
                <div className="flex justify-between mt-1">
                  {errors.taskName ? (
                    <p className="text-[10px] font-bold text-destructive uppercase">{errors.taskName}</p>
                  ) : (
                    <span />
                  )}
                  <span className="text-[10px] font-bold text-muted-foreground opacity-50">
                    {form.taskName.length}/100
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
                <FieldLabel label="Task Description" required />
                <Textarea
                  placeholder="Describe what needs to be done, expected deliverables, and any relevant context..."
                  value={form.taskDescription}
                  onChange={(e) => set("taskDescription", e.target.value)}
                  className={`min-h-[120px] resize-none ${
                    errors.taskDescription ? "border-destructive bg-destructive/5" : "bg-muted/30"
                  }`}
                  maxLength={500}
                />
                <div className="flex justify-between mt-1">
                  {errors.taskDescription ? (
                    <p className="text-[10px] font-bold text-destructive uppercase">
                      {errors.taskDescription}
                    </p>
                  ) : (
                    <span />
                  )}
                  <span className="text-[10px] font-bold text-muted-foreground opacity-50">
                    {form.taskDescription.length}/500
                  </span>
                </div>
              </div>

              {/* Attachment */}
              <div>
                <FieldLabel
                  label="Attachment"
                  hint="Optional supporting document"
                />
                <label className="flex items-center gap-3 px-4 py-3 border border-dashed rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                  <Paperclip className="h-4 w-4 text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    {form.attachment ? (
                      <div>
                        <p className="text-sm font-bold text-foreground/90 truncate">
                          {form.attachment.name}
                        </p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">
                          {(form.attachment.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-bold text-muted-foreground">
                          Click to upload file
                        </p>
                        <p className="text-[10px] font-bold text-muted-foreground/50 uppercase">
                          PDF, DOC, XLS, PNG up to 10MB
                        </p>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </div>

            {/* Info Banner */}
            <div className="flex items-start gap-2 p-4 bg-primary/5 border border-primary/10 rounded-xl mb-6">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-primary/80 leading-relaxed">
                Upon saving, the assigned team member will receive an email
                notification with task details. Automated reminders will be
                sent based on the due date and priority level.
              </p>
            </div>

            {/* Read-only meta */}
            <div className="flex items-center gap-6 text-[10px] font-bold text-muted-foreground uppercase opacity-70 mb-6">
              <span>
                Assigned Date:{" "}
                <strong className="text-foreground">
                  {new Date().toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </strong>
              </span>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(paths.accounts.delegation)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Assign Task
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddTask;