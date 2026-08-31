import React from "react";
import { Clock, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { type OnboardingRequest } from "@/services/api/onboarding.service";

export const StatusBadge: React.FC<{
  status: OnboardingRequest["status"];
  size?: "sm" | "md";
}> = ({ status, size = "sm" }) => {
  const map: Record<
    OnboardingRequest["status"],
    { label: string; className: string; icon: React.ElementType }
  > = {
    pending: {
      label: "Pending Review",
      className:
        "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
      icon: Clock,
    },
    approved: {
      label: "Approved",
      className:
        "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
      icon: CheckCircle2,
    },
    rejected: {
      label: "Rejected",
      className:
        "bg-red-50 text-red-700 border-red-200/60 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
      icon: XCircle,
    },
  };
  const { label, className, icon: Icon } = map[status] || map.pending;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
        className
      )}
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {label}
    </span>
  );
};
