import React from "react";
import { cn } from "@/lib/utils";

export const ProgressIndicator: React.FC<{ value: number; className?: string }> = ({ value, className }) => (
  <div className={cn("flex items-center gap-2.5", className)}>
    <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          value >= 80
            ? "bg-emerald-500"
            : value >= 50
              ? "bg-amber-500"
              : "bg-orange-500"
        )}
        style={{ width: `${value}%` }}
      />
    </div>
    <span
      className={cn(
        "text-xs font-semibold tabular-nums",
        value >= 80
          ? "text-emerald-600 dark:text-emerald-400"
          : value >= 50
            ? "text-amber-600 dark:text-amber-400"
            : "text-orange-600 dark:text-orange-400"
      )}
    >
      {value}%
    </span>
  </div>
);
