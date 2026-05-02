// web/src/modules/profile/components/onboarding/OnboardingBanner.tsx

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Shield,
  XCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { OnboardingStatus } from "../../types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type BannerVariant = "in_progress" | "submitted" | "rejected" | "almost_done";

type BannerConfig = {
  variant: BannerVariant;
  icon: React.ElementType;
  title: string;
  description: string;
  accentColor: string;
  bgGradient: string;
  borderColor: string;
  iconBg: string;
  iconColor: string;
  titleColor: string;
  descColor: string;
  progressLabel?: string;
  actionLabel?: string;
};

export type OnboardingBannerProps = {
  /** The full onboarding status object from the API */
  onboardingStatus: OnboardingStatus;
  /** Whether the banner can be dismissed (minimized) */
  dismissible?: boolean;
  /** Callback when "Continue" / action button is clicked */
  onAction?: () => void;
  /** Optional class name */
  className?: string;
  /** Render in compact mode (for embedding inside other components) */
  compact?: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// Banner Configuration
// ─────────────────────────────────────────────────────────────────────────────

function deriveBannerConfig(onboardingStatus: OnboardingStatus): BannerConfig {
  const { status, employeeCompleted, hrCompleted, progress } = onboardingStatus;

  // ── Rejected: Action Required ────────────────────────────────────────
  if (status === "rejected") {
    return {
      variant: "rejected",
      icon: XCircle,
      title: "Action Required",
      description:
        "Some of your submitted details were rejected and need corrections. Please review the highlighted items and re-submit.",
      accentColor: "red",
      bgGradient:
        "bg-gradient-to-r from-red-50/90 via-red-50/60 to-rose-50/40 dark:from-red-950/40 dark:via-red-950/25 dark:to-rose-950/15",
      borderColor: "border-red-200/70 dark:border-red-800/40",
      iconBg: "bg-red-100 dark:bg-red-900/50",
      iconColor: "text-red-600 dark:text-red-400",
      titleColor: "text-red-800 dark:text-red-200",
      descColor: "text-red-700/70 dark:text-red-300/60",
      actionLabel: "Review & Fix",
    };
  }

  // ── Almost Done: HR is finishing up ──────────────────────────────────
  if (employeeCompleted && hrCompleted && status !== "fully_completed") {
    return {
      variant: "almost_done",
      icon: CheckCircle2,
      title: "Almost Done",
      description:
        "Both you and HR have completed your sections. Final review is in progress — your onboarding will be completed shortly.",
      accentColor: "emerald",
      bgGradient:
        "bg-gradient-to-r from-emerald-50/90 via-emerald-50/60 to-teal-50/40 dark:from-emerald-950/40 dark:via-emerald-950/25 dark:to-teal-950/15",
      borderColor: "border-emerald-200/70 dark:border-emerald-800/40",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      titleColor: "text-emerald-800 dark:text-emerald-200",
      descColor: "text-emerald-700/70 dark:text-emerald-300/60",
      progressLabel: "Final review",
    };
  }

  // ── Submitted: Under Review ──────────────────────────────────────────
  if (employeeCompleted && status !== "fully_completed") {
    return {
      variant: "submitted",
      icon: Shield,
      title: "Under Review",
      description:
        "Your onboarding details have been submitted and are being reviewed by HR. You'll be notified once approved.",
      accentColor: "blue",
      bgGradient:
        "bg-gradient-to-r from-blue-50/90 via-blue-50/60 to-indigo-50/40 dark:from-blue-950/40 dark:via-blue-950/25 dark:to-indigo-950/15",
      borderColor: "border-blue-200/70 dark:border-blue-800/40",
      iconBg: "bg-blue-100 dark:bg-blue-900/50",
      iconColor: "text-blue-600 dark:text-blue-400",
      titleColor: "text-blue-800 dark:text-blue-200",
      descColor: "text-blue-700/70 dark:text-blue-300/60",
      progressLabel: `${progress}% complete`,
    };
  }

  // ── Default: In Progress ─────────────────────────────────────────────
  return {
    variant: "in_progress",
    icon: Sparkles,
    title: "Onboarding In Progress",
    description:
      "Complete all required sections below and submit for HR review. Keep your details accurate for faster approval.",
    accentColor: "amber",
    bgGradient:
      "bg-gradient-to-r from-amber-50/90 via-amber-50/60 to-orange-50/40 dark:from-amber-950/40 dark:via-amber-950/25 dark:to-orange-950/15",
    borderColor: "border-amber-200/70 dark:border-amber-800/40",
    iconBg: "bg-amber-100 dark:bg-amber-900/50",
    iconColor: "text-amber-600 dark:text-amber-400",
    titleColor: "text-amber-800 dark:text-amber-200",
    descColor: "text-amber-700/70 dark:text-amber-300/60",
    progressLabel: progress > 0 ? `${progress}% complete` : undefined,
    actionLabel: "Continue",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage Indicator Pills
// ─────────────────────────────────────────────────────────────────────────────

function StagePill({
  label,
  status,
}: {
  label: string;
  status: "pending" | "in_progress" | "completed";
}) {
  const config = {
    completed: {
      bg: "bg-emerald-100/80 dark:bg-emerald-900/30",
      text: "text-emerald-700 dark:text-emerald-300",
      dot: "bg-emerald-500",
      icon: CheckCircle2,
    },
    in_progress: {
      bg: "bg-amber-100/80 dark:bg-amber-900/30",
      text: "text-amber-700 dark:text-amber-300",
      dot: "bg-amber-500",
      icon: Clock,
    },
    pending: {
      bg: "bg-muted/50",
      text: "text-muted-foreground",
      dot: "bg-muted-foreground/30",
      icon: Clock,
    },
  }[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors",
        config.bg,
        config.text
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", config.dot)} />
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini Progress Track (inside banner)
// ─────────────────────────────────────────────────────────────────────────────

function MiniProgress({
  progress,
  accentColor,
}: {
  progress: number;
  accentColor: string;
}) {
  const colorMap: Record<string, string> = {
    amber: "from-amber-400 to-amber-500",
    blue: "from-blue-400 to-blue-500",
    red: "from-red-400 to-red-500",
    emerald: "from-emerald-400 to-emerald-500",
  };

  const bgMap: Record<string, string> = {
    amber: "bg-amber-200/40 dark:bg-amber-800/20",
    blue: "bg-blue-200/40 dark:bg-blue-800/20",
    red: "bg-red-200/40 dark:bg-red-800/20",
    emerald: "bg-emerald-200/40 dark:bg-emerald-800/20",
  };

  return (
    <div className={cn("h-1.5 w-full rounded-full overflow-hidden", bgMap[accentColor] || bgMap.amber)}>
      <motion.div
        className={cn(
          "h-full rounded-full bg-gradient-to-r",
          colorMap[accentColor] || colorMap.amber
        )}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function OnboardingBanner({
  onboardingStatus,
  dismissible = false,
  onAction,
  className,
  compact = false,
}: OnboardingBannerProps) {
  const [dismissed, setDismissed] = React.useState(false);
  const config = deriveBannerConfig(onboardingStatus);
  const BannerIcon = config.icon;

  if (dismissed) return null;

  // ── Compact Mode (for embedding in ProfileHeader) ──────────────────────
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "flex items-center gap-3 rounded-xl border px-4 py-3",
          config.bgGradient,
          config.borderColor,
          className
        )}
      >
        <div className={cn("shrink-0 rounded-lg p-1.5", config.iconBg)}>
          <BannerIcon className={cn("h-3.5 w-3.5", config.iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("text-xs font-semibold", config.titleColor)}>
            {config.title}
          </p>
          {config.progressLabel && (
            <p className={cn("text-[10px] mt-0.5", config.descColor)}>
              {config.progressLabel}
            </p>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {/* Stage pills (compact: just dots) */}
          <div className="hidden sm:flex items-center gap-1">
            {(["profileStatus", "documentStatus", "inductionStatus"] as const).map(
              (field) => {
                const st = onboardingStatus[field] as "pending" | "in_progress" | "completed";
                return (
                  <span
                    key={field}
                    className={cn(
                      "h-2 w-2 rounded-full",
                      st === "completed"
                        ? "bg-emerald-500"
                        : st === "in_progress"
                        ? "bg-amber-500"
                        : "bg-muted-foreground/25"
                    )}
                    title={`${field.replace("Status", "")}: ${st}`}
                  />
                );
              }
            )}
          </div>

          {config.actionLabel && onAction && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onAction}
              className={cn(
                "h-7 rounded-lg text-[10px] font-semibold gap-1 px-2",
                config.titleColor
              )}
            >
              {config.actionLabel}
              <ArrowRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </motion.div>
    );
  }

  // ── Full Mode (standalone banner) ──────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative overflow-hidden rounded-2xl border",
        config.bgGradient,
        config.borderColor,
        className
      )}
    >
      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {/* Large soft circle */}
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-current opacity-[0.03]" />
        {/* Diagonal line pattern */}
        <svg
          className="absolute right-0 top-0 h-full w-24 opacity-[0.02]"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {[0, 15, 30, 45, 60, 75, 90].map((x) => (
            <line
              key={x}
              x1={x}
              y1="0"
              x2={x + 40}
              y2="100"
              stroke="currentColor"
              strokeWidth="1"
            />
          ))}
        </svg>
      </div>

      <div className="relative p-5 sm:p-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={cn("shrink-0 rounded-xl p-2.5 shadow-sm", config.iconBg)}>
            <BannerIcon className={cn("h-5 w-5", config.iconColor)} />

            {/* Animated ring for action-required state */}
            {config.variant === "rejected" && (
              <motion.div
                className="absolute inset-0 rounded-xl border-2 border-red-400/30"
                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className={cn("text-sm sm:text-base font-bold", config.titleColor)}>
                  {config.title}
                </h3>
                <p
                  className={cn(
                    "text-xs sm:text-sm mt-1 leading-relaxed max-w-xl",
                    config.descColor
                  )}
                >
                  {config.description}
                </p>
              </div>

              {dismissible && (
                <button
                  type="button"
                  onClick={() => setDismissed(true)}
                  className={cn(
                    "shrink-0 rounded-lg p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/5",
                    config.descColor
                  )}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Stage pills + progress */}
            <div className="mt-4 space-y-3">
              {/* Stage status pills */}
              <div className="flex flex-wrap items-center gap-2">
                <StagePill
                  label="Profile"
                  status={onboardingStatus.profileStatus}
                />
                <StagePill
                  label="Documents"
                  status={onboardingStatus.documentStatus}
                />
                <StagePill
                  label="Induction"
                  status={onboardingStatus.inductionStatus}
                />
              </div>

              {/* Mini progress bar */}
              <MiniProgress
                progress={onboardingStatus.progress}
                accentColor={config.accentColor}
              />
            </div>

            {/* Action row */}
            {(config.actionLabel || config.progressLabel) && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-current/[0.06]">
                {config.progressLabel && (
                  <span className={cn("text-[11px] font-semibold", config.descColor)}>
                    {config.progressLabel}
                  </span>
                )}

                {config.actionLabel && onAction && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onAction}
                    className={cn(
                      "h-8 rounded-xl text-xs font-semibold gap-1.5 px-3",
                      config.titleColor,
                      `hover:bg-${config.accentColor}-100/50 dark:hover:bg-${config.accentColor}-900/30`
                    )}
                  >
                    {config.actionLabel}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}