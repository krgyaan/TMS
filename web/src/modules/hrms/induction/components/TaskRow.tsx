import React from "react";
import { CheckCircle2, MessageSquare, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatDate } from "../helpers/induction.helpers";
import type { InductionTask } from "../helpers/induction.helpers";

export const TaskRow: React.FC<{
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
