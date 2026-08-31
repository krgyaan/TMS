import React from "react";
import { Check, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export const ProgressStage: React.FC<{ label: string; status: string }> = ({
  label,
  status,
}) => {
  const isDone = status === "approved" || status === "completed";
  const isRejected = status === "rejected";
  const isSubmitted = status === "submitted";

  return (
    <div className="flex flex-col items-center gap-2 flex-1">
      <div
        className={cn(
          "h-9 w-9 rounded-full flex items-center justify-center border-2 transition-colors",
          isDone
            ? "bg-emerald-50 border-emerald-500 dark:bg-emerald-500/10"
            : isRejected
              ? "bg-red-50 border-red-500 dark:bg-red-500/10"
              : isSubmitted
                ? "bg-amber-50 border-amber-500 dark:bg-amber-500/10"
                : "bg-muted border-muted-foreground/20"
        )}
      >
        {isDone ? (
          <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        ) : isRejected ? (
          <X className="h-4 w-4 text-red-600 dark:text-red-400" />
        ) : isSubmitted ? (
          <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        ) : (
          <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
        )}
      </div>
      <span
        className={cn(
          "text-[10px] font-semibold text-center leading-tight",
          isDone
            ? "text-emerald-700 dark:text-emerald-400"
            : isRejected
              ? "text-red-700 dark:text-red-400"
              : isSubmitted
                ? "text-amber-700 dark:text-amber-400"
                : "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </div>
  );
};
