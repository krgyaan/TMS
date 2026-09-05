import React, { useState } from "react";
import {
  CheckCircle2,
  Clock,
  ListChecks,
  UserCog,
  AlertCircle,
  Info,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  getAvatarColor,
  getInitials,
} from "../helpers/induction.helpers";
import type { InductionTask, TaskStatus } from "../helpers/induction.helpers";
import type { EmployeeInduction } from "../helpers/induction.helpers";
import { CircularProgress } from "./ui-bits";
import { PhaseSection } from "./PhaseSection";
import { RemarkModal } from "./RemarkModal";
import { TaskRowSkeleton } from "./skeletons";

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
