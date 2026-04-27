// web/src/modules/profile/components/onboarding/OnboardingProgressBar.tsx

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type StageProgressStatus = "pending" | "in_progress" | "completed";

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
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getStepStyles(status: StageProgressStatus, isLast: boolean) {
  switch (status) {
    case "completed":
      return {
        dot: "bg-emerald-500 border-emerald-500 text-white",
        label: "text-emerald-700 dark:text-emerald-300 font-semibold",
        connector: "bg-emerald-500",
        icon: CheckCircle2,
        ring: "ring-emerald-200 dark:ring-emerald-800/50",
      };
    case "in_progress":
      return {
        dot: "bg-primary border-primary text-primary-foreground",
        label: "text-primary font-semibold",
        connector: "bg-gradient-to-r from-primary/60 to-muted/40",
        icon: Clock,
        ring: "ring-primary/20",
      };
    default:
      return {
        dot: "bg-muted border-border text-muted-foreground",
        label: "text-muted-foreground",
        connector: "bg-muted/60",
        icon: Clock,
        ring: "ring-transparent",
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StepIndicator({
  stage,
  stepNumber,
  isLast,
  totalSteps,
  index,
}: {
  stage: ProgressStage;
  stepNumber: number;
  isLast: boolean;
  totalSteps: number;
  index: number;
}) {
  const styles = getStepStyles(stage.status, isLast);
  const StepIcon = stage.icon || styles.icon;

  return (
    <div className="flex flex-col items-center relative" style={{ flex: 1 }}>
      {/* Connector line (before this step) */}
      {index > 0 && (
        <div
          className="absolute top-4 right-1/2 h-0.5 z-0"
          style={{ width: "100%" }}
        >
          <motion.div
            className={cn("h-full rounded-full", styles.connector)}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: stage.status !== "pending" ? 1 : 0.3 }}
            transition={{ duration: 0.5, delay: index * 0.15 }}
            style={{ transformOrigin: "left" }}
          />
          {/* Background track */}
          <div className="absolute inset-0 h-full rounded-full bg-muted/40 -z-10" />
        </div>
      )}

      {/* Step dot */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 20,
          delay: index * 0.12,
        }}
        className="relative z-10"
      >
        <div
          className={cn(
            "h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all duration-300",
            "ring-4",
            styles.dot,
            styles.ring
          )}
        >
          {stage.status === "completed" ? (
            <motion.div
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 15, delay: index * 0.12 + 0.1 }}
            >
              <CheckCircle2 className="h-4 w-4" />
            </motion.div>
          ) : stage.status === "in_progress" ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              <Clock className="h-3.5 w-3.5" />
            </motion.div>
          ) : (
            <span className="text-[10px] font-bold">{stepNumber}</span>
          )}
        </div>

        {/* Active pulse ring */}
        {stage.status === "in_progress" && (
          <span className="absolute inset-0 rounded-full animate-ping bg-primary/20" />
        )}
      </motion.div>

      {/* Label */}
      <motion.span
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.12 + 0.15 }}
        className={cn(
          "mt-2.5 text-[10px] sm:text-[11px] text-center leading-tight max-w-[80px] sm:max-w-[100px]",
          styles.label
        )}
      >
        {stage.label}
      </motion.span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function OnboardingProgressBar({
  progress,
  stages,
  className,
}: OnboardingProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  const completedCount = stages.filter(s => s.status === "completed").length;
  const inProgressCount = stages.filter(s => s.status === "in_progress").length;

  // Determine overall status label
  const overallLabel = useMemo(() => {
    if (clampedProgress === 100) return "Complete!";
    if (completedCount === 0 && inProgressCount === 0) return "Not started";
    return "In progress";
  }, [clampedProgress, completedCount, inProgressCount]);

  return (
    <div className={cn("space-y-5", className)}>
      {/* ── Percentage Bar ───────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              Overall Progress
            </span>
            <span
              className={cn(
                "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                clampedProgress === 100
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                  : clampedProgress > 0
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {overallLabel}
            </span>
          </div>
          <span className="text-sm font-bold text-primary tabular-nums">
            {clampedProgress}%
          </span>
        </div>

        {/* Track */}
        <div className="relative h-3 w-full rounded-full bg-muted/50 overflow-hidden">
          {/* Segmented background marks */}
          <div className="absolute inset-0 flex">
            {stages.map((_, i) =>
              i < stages.length - 1 ? (
                <div
                  key={i}
                  className="flex-1 border-r border-background/50 last:border-r-0"
                />
              ) : (
                <div key={i} className="flex-1" />
              )
            )}
          </div>

          {/* Filled progress */}
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-primary/90 to-primary/80"
            initial={{ width: 0 }}
            animate={{ width: `${clampedProgress}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          >
            {/* Shimmer */}
            <div className="absolute inset-0 overflow-hidden rounded-full">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-shimmer" />
            </div>

            {/* Glow on tip */}
            {clampedProgress > 0 && clampedProgress < 100 && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-primary/30 blur-md" />
            )}
          </motion.div>

          {/* Completed checkmark at 100% */}
          {clampedProgress === 100 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 1 }}
              className="absolute right-1 top-1/2 -translate-y-1/2"
            >
              <CheckCircle2 className="h-2.5 w-2.5 text-primary-foreground" />
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Stepped Stage Indicators ─────────────────────────────────────── */}
      <div className="relative">
        {/* Connector track behind all steps */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted/30 rounded-full mx-[16.67%]" />

        <div className="relative flex justify-between">
          {stages.map((stage, index) => (
            <StepIndicator
              key={stage.key}
              stage={stage}
              stepNumber={index + 1}
              isLast={index === stages.length - 1}
              totalSteps={stages.length}
              index={index}
            />
          ))}
        </div>
      </div>

      {/* ── Summary Stats ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-5 pt-1">
        <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px]">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">
            Completed{" "}
            <span className="font-semibold text-foreground">{completedCount}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px]">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span className="text-muted-foreground">
            In Progress{" "}
            <span className="font-semibold text-foreground">{inProgressCount}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px]">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
          <span className="text-muted-foreground">
            Pending{" "}
            <span className="font-semibold text-foreground">
              {stages.length - completedCount - inProgressCount}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}