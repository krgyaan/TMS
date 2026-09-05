import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Clock,
  ListChecks,
  UserCog,
  AlertCircle,
  Info,
  Zap,
  Milestone,
  CheckCheck,
  ChevronDown,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  DEFAULT_TASKS,
  computeInductionStats,
  formatDate,
  formatDateTime,
  getAvatarColor,
  getInitials,
} from "../helpers/induction.helpers";
import type {
  EmployeeInduction,
  InductionTask,
  TaskPhase,
  TaskStatus,
} from "../helpers/induction.helpers";

// ─── Circular Progress (shared with the dashboard) ────────────────────────────

export const CircularProgress: React.FC<{
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}> = ({ value, size = 40, strokeWidth = 3, className }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/40"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(
            "transition-all duration-700 ease-out",
            value === 100
              ? "text-emerald-500"
              : value > 50
              ? "text-primary"
              : value > 0
              ? "text-amber-500"
              : "text-muted-foreground/30"
          )}
        />
      </svg>
      <span className="absolute text-[9px] font-bold">{value}%</span>
    </div>
  );
};

// ─── Task Row Skeleton ────────────────────────────────────────────────────────

const TaskRowSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/50 bg-card/50">
    <Skeleton className="h-4 w-4 rounded flex-shrink-0" />
    <Skeleton className="w-8 h-8 rounded-xl flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-3 w-52" />
      <Skeleton className="h-2.5 w-36" />
    </div>
    <Skeleton className="h-5 w-14 rounded-lg" />
  </div>
);

// ─── Task Row (Modal) ─────────────────────────────────────────────────────────

const TaskRow: React.FC<{
  task: InductionTask;
  onToggle: (task: InductionTask) => void;
  onRemark: (task: InductionTask) => void;
  isToggling?: boolean;
  isDefault?: boolean;
  index?: number;
}> = ({ task, onToggle, onRemark, isToggling, isDefault, index = 0 }) => {
  const TaskIcon = task.icon;
  const isCompleted = task.status === "completed";

  return (
    <div
      className={cn(
        "group flex items-start gap-3 px-4 py-3 rounded-xl border transition-all duration-200 ind-fade-up",
        isCompleted
          ? "bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200/40 dark:border-emerald-900/30"
          : "bg-card border-border/40 hover:bg-muted/30 hover:border-border/60",
        isDefault && "opacity-50"
      )}
      style={{ animationDelay: `${index * 25}ms` }}
    >
      {/* Completion indicator line */}
      <div
        className={cn(
          "absolute left-0 top-2 bottom-2 w-0.5 rounded-full transition-colors duration-300",
          isCompleted ? "bg-emerald-500" : "bg-transparent"
        )}
      />

      {/* Checkbox */}
      <div className="flex-shrink-0 mt-0.5">
        {isToggling ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Checkbox
            checked={isCompleted}
            onCheckedChange={() => !isDefault && onToggle(task)}
            disabled={isDefault}
            className={cn(
              "transition-all",
              isCompleted &&
                "border-emerald-500 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 ind-check-pop"
            )}
          />
        )}
      </div>

      {/* Icon */}
      <div
        className={cn(
          "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-200",
          isCompleted ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-muted/60"
        )}
      >
        <TaskIcon
          className={cn(
            "h-4 w-4 transition-colors",
            isCompleted ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
          )}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p
            className={cn(
              "text-xs font-medium transition-colors",
              isCompleted && "line-through text-muted-foreground/70"
            )}
          >
            {task.name}
          </p>
          {task.required && (
            <span className="text-[8px] font-bold text-destructive/80 border border-destructive/20 bg-destructive/5 px-1.5 py-0.5 rounded-md leading-none uppercase tracking-wider">
              Required
            </span>
          )}
          {isDefault && (
            <span className="text-[8px] font-medium text-muted-foreground border border-border/60 px-1.5 py-0.5 rounded-md leading-none">
              Template
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {isCompleted && task.completedAt && (
            <span className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
              {formatDate(task.completedAt)}
              {task.completedBy && ` · ${task.completedBy}`}
            </span>
          )}
          {task.remarks && (
            <span className="text-[10px] text-muted-foreground/60 italic truncate max-w-40 flex items-center gap-0.5">
              <MessageSquare className="h-2.5 w-2.5" />
              {task.remarks}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      {!isDefault && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onRemark(task)}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Remark</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
};

// ─── Phase Section (Modal) ────────────────────────────────────────────────────

const PhaseSection: React.FC<{
  phase: TaskPhase;
  tasks: InductionTask[];
  onToggle: (task: InductionTask) => void;
  onRemark: (task: InductionTask) => void;
  togglingTaskId: string | null;
  defaultTaskIds: Set<string>;
  defaultOpen?: boolean;
}> = ({ phase, tasks, onToggle, onRemark, togglingTaskId, defaultTaskIds, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  const completed = tasks.filter((t) => t.status === "completed").length;
  const pct = tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100);
  const isBefore = phase === "before_joining";

  return (
    <div className="border border-border/40 rounded-2xl overflow-hidden ind-scale-in">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-3.5 bg-muted/20 hover:bg-muted/40 transition-colors duration-200"
      >
        <div
          className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border transition-colors",
            pct === 100
              ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/30"
              : "bg-background border-border/50"
          )}
        >
          {isBefore ? (
            <Milestone className={cn("h-4 w-4", pct === 100 ? "text-emerald-600" : "text-primary")} />
          ) : (
            <CheckCheck className={cn("h-4 w-4", pct === 100 ? "text-emerald-600" : "text-primary")} />
          )}
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold tracking-tight">
            {isBefore ? "Before Joining" : "After Joining"}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {completed}/{tasks.length} completed
          </p>
        </div>
        <div className="flex items-center gap-3 mr-2">
          <div className="w-24 h-1.5 rounded-full bg-muted/60 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full ind-progress-bar",
                pct === 100 ? "bg-emerald-500" : pct > 0 ? "bg-primary" : "bg-muted-foreground/15"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span
            className={cn(
              "text-xs font-bold tabular-nums w-8 text-right",
              pct === 100 ? "text-emerald-600 dark:text-emerald-400" : ""
            )}
          >
            {pct}%
          </span>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform duration-200",
            !open && "-rotate-90"
          )}
        />
      </button>

      {open && (
        <div className="p-3 space-y-1.5 bg-card/50 ind-slide-down">
          {tasks.map((task, i) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={onToggle}
              onRemark={onRemark}
              isToggling={togglingTaskId === task.id}
              isDefault={defaultTaskIds.has(task.id)}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Remark Modal ─────────────────────────────────────────────────────────────

const RemarkModal: React.FC<{
  task: InductionTask | null;
  open: boolean;
  onClose: () => void;
  onSave: (remark: string) => void;
  isLoading?: boolean;
}> = ({ task, open, onClose, onSave, isLoading }) => {
  const [remark, setRemark] = useState(task?.remarks ?? "");

  useEffect(() => {
    if (open) setRemark(task?.remarks ?? "");
  }, [open, task]);

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-sm p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-6 py-5 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base">Task Remark</DialogTitle>
              <DialogDescription className="text-xs mt-0.5 line-clamp-1">
                {task?.name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              Remarks / Notes
            </label>
            <Textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Add any notes or remarks for this task…"
              rows={3}
              className="resize-none text-sm rounded-xl"
            />
          </div>
          {task?.completedAt && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              Completed {formatDateTime(task.completedAt)}
              {task.completedBy && ` by ${task.completedBy}`}
            </p>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/20">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading} className="rounded-xl">
            Cancel
          </Button>
          <Button size="sm" onClick={() => onSave(remark)} disabled={isLoading} className="rounded-xl">
            {isLoading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Save Remark
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Employee Induction Modal ─────────────────────────────────────────────────

export const EmployeeInductionModal: React.FC<{
  employee: EmployeeInduction | null;
  open: boolean;
  onClose: () => void;
  liveTasks: InductionTask[] | undefined;
  isLoadingTasks: boolean;
  togglingTaskId: string | null;
  onToggleTask: (task: InductionTask) => void;
  onSaveRemark: (taskId: string, remark: string) => void;
  isRemarkLoading: boolean;
}> = ({
  employee,
  open,
  onClose,
  liveTasks,
  isLoadingTasks,
  togglingTaskId,
  onToggleTask,
  onSaveRemark,
  isRemarkLoading,
}) => {
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all");
  const [remarkTask, setRemarkTask] = useState<InductionTask | null>(null);
  const [remarkOpen, setRemarkOpen] = useState(false);

  if (!employee) return null;

  let resolvedTasks: InductionTask[];
  let defaultTaskIds: Set<string>;

  if (isLoadingTasks) {
    resolvedTasks = [];
    defaultTaskIds = new Set();
  } else if (liveTasks && liveTasks.length > 0) {
    resolvedTasks = liveTasks;
    defaultTaskIds = new Set();
  } else {
    resolvedTasks = DEFAULT_TASKS;
    defaultTaskIds = new Set(DEFAULT_TASKS.map((t) => t.id));
  }

  const stats = computeInductionStats(resolvedTasks);

  const filteredTasks = resolvedTasks.filter((t) => {
    return filterStatus === "all" || t.status === filterStatus;
  });

  const beforeTasks = filteredTasks.filter((t) => t.phase === "before_joining");
  const afterTasks = filteredTasks.filter((t) => t.phase === "after_joining");
  const isShowingDefaults = defaultTaskIds.size > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden max-h-[92vh] flex flex-col rounded-2xl">
          {/* Header */}
          <DialogHeader className="px-6 py-5 border-b bg-muted/10 flex-shrink-0">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12 rounded-xl flex-shrink-0 ring-2 ring-background shadow-md">
                {employee.profilePhoto && (
                  <AvatarImage src={employee.profilePhoto} alt={`${employee.firstName} ${employee.lastName}`} className="object-cover" />
                )}
                <AvatarFallback
                  className={cn(
                    "rounded-xl text-sm font-bold",
                    getAvatarColor(`${employee.firstName} ${employee.lastName}`)
                  )}
                >
                  {getInitials(employee.firstName, employee.lastName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-base tracking-tight">
                    {employee.firstName}{" "}
                    {employee.middleName ? `${employee.middleName} ` : ""}
                    {employee.lastName}
                  </DialogTitle>
                  <span className="text-[10px] font-mono bg-muted/70 text-muted-foreground px-1.5 py-0.5 rounded-md border border-border/40">
                    {employee.employeeId}
                  </span>
                </div>
                <DialogDescription className="text-xs mt-1">DOJ{" "}
                  {employee.dateOfJoining ? formatDate(employee.dateOfJoining) : "—"}
                </DialogDescription>
                {employee.inductionCoordinator && (
                  <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                    <UserCog className="h-3 w-3" />
                    Coordinator: {employee.inductionCoordinator}
                  </p>
                )}
              </div>
              <CircularProgress value={isLoadingTasks ? 0 : stats.pct} size={56} strokeWidth={3.5} />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-border/30">
              {[
                { label: "Total", value: stats.total, icon: ListChecks, cls: "" },
                { label: "Done", value: stats.completed, icon: CheckCircle2, cls: "text-emerald-700 dark:text-emerald-400" },
                { label: "Pending", value: stats.pending, icon: Clock, cls: "text-amber-700 dark:text-amber-400" },
                { label: "Required", value: stats.requiredCompleted, icon: Zap, cls: "" },
              ].map(({ label, value, icon: SIcon, cls }) => (
                <div key={label} className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-muted/30">
                  <SIcon className={cn("h-3.5 w-3.5 text-muted-foreground", cls)} />
                  <div>
                    <span className={cn("text-base font-bold leading-none tabular-nums", cls)}>
                      {isLoadingTasks ? "—" : value}
                    </span>
                    {label === "Required" && !isLoadingTasks && (
                      <span className="text-muted-foreground font-normal text-[10px]">/{stats.requiredTotal}</span>
                    )}
                    <p className="text-[9px] text-muted-foreground mt-0.5">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </DialogHeader>

          {/* Filters */}
          <div className="px-5 py-3 border-b border-border/30 bg-muted/5 flex items-center gap-2 flex-wrap flex-shrink-0">
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as TaskStatus | "all")}>
              <SelectTrigger className="h-8 w-32 text-xs rounded-xl">
                <SelectValue placeholder="All Tasks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground ml-auto">
              <span className="text-destructive/70 font-bold border border-destructive/20 bg-destructive/5 px-1.5 rounded-md text-[8px] uppercase tracking-wider">
                Required
              </span>
              <span>= Mandatory task</span>
            </div>
          </div>

          {/* Info banner */}
          {isShowingDefaults && !isLoadingTasks && (
            <div className="px-5 py-3 bg-amber-50/60 dark:bg-amber-950/10 border-b border-amber-200/40 dark:border-amber-800/20 flex items-center gap-2.5 flex-shrink-0">
              <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <Info className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                Tasks shown are from the standard template. They haven't been initialised in the database yet.
              </p>
            </div>
          )}

          {/* Task List */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
            {isLoadingTasks ? (
              <div className="space-y-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <TaskRowSkeleton key={i} />
                ))}
              </div>
            ) : (
              <>
                {beforeTasks.length > 0 && (
                  <PhaseSection
                    phase="before_joining"
                    tasks={beforeTasks}
                    onToggle={onToggleTask}
                    onRemark={(task) => { setRemarkTask(task); setRemarkOpen(true); }}
                    togglingTaskId={togglingTaskId}
                    defaultTaskIds={defaultTaskIds}
                    defaultOpen={true}
                  />
                )}
                {afterTasks.length > 0 && (
                  <PhaseSection
                    phase="after_joining"
                    tasks={afterTasks}
                    onToggle={onToggleTask}
                    onRemark={(task) => { setRemarkTask(task); setRemarkOpen(true); }}
                    togglingTaskId={togglingTaskId}
                    defaultTaskIds={defaultTaskIds}
                    defaultOpen={true}
                  />
                )}
                {filteredTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-14 text-center ind-fade-in">
                    <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                      <ListChecks className="h-7 w-7 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm font-medium">No tasks match your filters</p>
                    <p className="text-xs text-muted-foreground mt-1">Try adjusting the status filter</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-4 border-t border-border/30 bg-muted/10 flex-shrink-0">
            <div className="flex items-center justify-between w-full gap-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                {!isLoadingTasks && stats.allRequiredDone ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                      All required tasks completed
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                    <span>
                      {isLoadingTasks
                        ? "Loading tasks…"
                        : `${stats.requiredCompleted}/${stats.requiredTotal} required tasks done`}
                    </span>
                  </>
                )}
              </p>
              <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl">
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RemarkModal
        task={remarkTask}
        open={remarkOpen}
        onClose={() => { setRemarkOpen(false); setRemarkTask(null); }}
        onSave={(remark) => {
          if (remarkTask) {
            onSaveRemark(remarkTask.id, remark);
            setRemarkOpen(false);
            setRemarkTask(null);
          }
        }}
        isLoading={isRemarkLoading}
      />
    </>
  );
};
