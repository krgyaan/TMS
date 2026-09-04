// web/src/modules/profile/components/onboarding/OnboardingProgressBar.tsx

import React from "react";
import { CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type StageProgressStatus = "pending" | "in_progress" | "submitted" | "completed" | "resubmitted";

export type ProgressStage = {
  key: string;
  label: string;
  status: StageProgressStatus;
  icon?: React.ElementType;
};

type OnboardingProgressBarProps = {
  /** Overall progress 0–100 from the backend */
  progress: number;
  /** Individual stage statuses for the stepped indicator */
  stages: ProgressStage[];
  /** Optional class name */
  className?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function OnboardingProgressBar({
  progress,
  stages,
  className,
}: OnboardingProgressBarProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Onboarding Progress</h2>
          <p className="text-xs text-muted-foreground">
            Complete all stages to finalize your profile
          </p>
                </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-muted/30 px-4 py-2">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Overall</p>
            <p className="text-sm font-bold text-primary tabular-nums">
              {Math.min(100, Math.max(0, progress))}%
            </p>
          </div>
        </div>
      </div>

      {/* Non-Linear Status Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stages.map((stage) => {
          const isCompleted = ["completed", "submitted" , "resubmitted"].includes(stage.status);
          const Icon = stage.icon || Clock;

          return (
            <div
              key={stage.key}
              
              
              
              className={cn(
                "group relative rounded-2xl border p-3 transition-all duration-300",
                isCompleted
                  ? "bg-emerald-50/50 border-emerald-200/60 dark:bg-emerald-950/20 dark:border-emerald-800/40"
                  : "bg-muted/30 border-border/50 opacity-60"
              )}
            >
              <div className="flex flex-col gap-2">
                <div className={cn(
                  "h-8 w-8 rounded-xl flex items-center justify-center transition-colors",
                  isCompleted 
                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                )}>
                  {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                
                <div>
                  <p className={cn(
                    "text-[11px] font-bold truncate",
                    isCompleted ? "text-emerald-700 dark:text-emerald-300" : "text-foreground"
                  )}>
                    {stage.label}
                  </p>
                  <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter mt-0.5">
                    {stage.status === 'submitted' ? 'Review' : isCompleted ? 'Done' : 'Pending'}
                  </p>
                </div>
              </div>

              {/* Status Indicator Bar at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden rounded-b-2xl">
                <div className={cn(
                  "h-full w-full",
                  isCompleted ? "bg-emerald-500" : "bg-transparent"
                )} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
