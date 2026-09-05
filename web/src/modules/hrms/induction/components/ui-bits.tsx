import React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ─── CSS Keyframes (injected once) ────────────────────────────────────────────

export const StyleInjector: React.FC = () => (
  <style>{`
    @keyframes ind-fade-up {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes ind-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes ind-scale-in {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes ind-slide-down {
      from { opacity: 0; max-height: 0; }
      to { opacity: 1; max-height: 2000px; }
    }
    @keyframes ind-shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes ind-pulse-soft {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    @keyframes ind-check-pop {
      0% { transform: scale(1); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
    .ind-fade-up {
      animation: ind-fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .ind-fade-in {
      animation: ind-fade-in 0.3s ease forwards;
    }
    .ind-scale-in {
      animation: ind-scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .ind-slide-down {
      animation: ind-slide-down 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      overflow: hidden;
    }
    .ind-check-pop {
      animation: ind-check-pop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .ind-progress-bar {
      transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .ind-glass {
      backdrop-filter: blur(12px) saturate(1.5);
      -webkit-backdrop-filter: blur(12px) saturate(1.5);
    }
  `}</style>
);

// ─── Circular Progress ────────────────────────────────────────────────────────

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

// ─── Phase Mini Progress ──────────────────────────────────────────────────────

export const PhaseMiniBar: React.FC<{
  label: string;
  completed: number;
  total: number;
  icon: React.ElementType;
}> = ({ label, completed, total, icon: Icon }) => {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 cursor-default min-w-0">
            <Icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <div className="w-16 h-1.5 rounded-full bg-muted/60 overflow-hidden flex-shrink-0">
              <div
                className={cn(
                  "h-full rounded-full ind-progress-bar",
                  pct === 100
                    ? "bg-emerald-500"
                    : pct > 0
                    ? "bg-primary"
                    : "bg-muted-foreground/15"
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[10px] tabular-nums text-muted-foreground w-7 text-right flex-shrink-0">
              {pct}%
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p className="font-medium">{label}</p>
          <p className="text-muted-foreground">{completed}/{total} tasks</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
