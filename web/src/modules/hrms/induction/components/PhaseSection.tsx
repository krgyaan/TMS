import React, { useState } from "react";
import { Milestone, CheckCheck, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InductionTask, TaskPhase } from "../helpers/induction.helpers";
import { TaskRow } from "./TaskRow";

export const PhaseSection: React.FC<{
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
