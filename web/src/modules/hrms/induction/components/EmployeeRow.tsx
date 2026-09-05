import React from "react";
import {
  ChevronRight,
  CalendarDays,
  Milestone,
  CheckCheck,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  DEFAULT_TASKS,
  computeInductionStats,
  formatDate,
  getAvatarColor,
  getInitials,
  getInductionStatus,
} from "../helpers/induction.helpers";
import type { EmployeeInduction } from "../helpers/induction.helpers";
import { PhaseMiniBar, CircularProgress } from "./ui-bits";

export const EmployeeRow: React.FC<{
  employee: EmployeeInduction;
  onView: (e: EmployeeInduction) => void;
  index: number;
  isVisible: boolean;
}> = ({ employee, onView, index, isVisible }) => {
  const displayTasks = employee.tasks.length > 0 ? employee.tasks : DEFAULT_TASKS;
  const stats = computeInductionStats(displayTasks);
  const status = getInductionStatus(employee);

  return (
    <div
      className={cn(
        "group relative flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 rounded-2xl border border-border/40 bg-card/80 transition-all duration-300 cursor-pointer",
        "hover:bg-muted/40 hover:border-border/80 hover:shadow-md hover:shadow-black/[0.03] dark:hover:shadow-white/[0.02]",
        isVisible ? "ind-fade-up" : "opacity-0"
      )}
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={() => onView(employee)}
    >
      {/* Avatar + Info */}
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        <div className="relative flex-shrink-0">
          <Avatar className="h-10 w-10 rounded-xl flex-shrink-0 ring-2 ring-background shadow-sm">
            {employee.profilePhoto && (
              <AvatarImage src={employee.profilePhoto} alt={`${employee.firstName} ${employee.lastName}`} className="object-cover" />
            )}
            <AvatarFallback
              className={cn(
                "rounded-xl text-xs font-bold",
                getAvatarColor(`${employee.firstName} ${employee.lastName}`)
              )}
            >
              {getInitials(employee.firstName, employee.lastName)}
            </AvatarFallback>
          </Avatar>
          <div
            className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background transition-colors",
              status === "completed"
                ? "bg-emerald-500"
                : status === "in_progress"
                ? "bg-primary"
                : "bg-muted-foreground/30"
            )}
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold leading-none tracking-tight">
              {employee.firstName}{" "}
              {employee.middleName ? `${employee.middleName} ` : ""}
              {employee.lastName}
            </p>
            <span className="text-[10px] font-mono bg-muted/70 text-muted-foreground px-1.5 py-0.5 rounded-md hidden sm:inline border border-border/40">
              {employee.employeeId}
            </span>
          </div>
          {/* <p className="text-xs text-muted-foreground mt-1 truncate">
            {employee.designation} · {employee.department}
          </p> */}
        </div>
      </div>

      {/* Phase Bars */}
      <div className="hidden lg:flex flex-col gap-2 w-44">
        <PhaseMiniBar label="Before Joining" completed={stats.beforeCompleted} total={stats.beforeTasks} icon={Milestone} />
        <PhaseMiniBar label="After Joining" completed={stats.afterCompleted} total={stats.afterTasks} icon={CheckCheck} />
      </div>

      {/* Circular Progress */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <CircularProgress value={stats.pct} size={42} strokeWidth={3} />
        <div className="text-right">
          <p className="text-xs font-semibold tabular-nums">{stats.completed}/{stats.total}</p>
          <p className="text-[10px] text-muted-foreground">tasks</p>
        </div>
      </div>

      {/* Required */}
      <div className="flex-shrink-0 w-24 hidden md:block">
        <div
          className={cn(
            "text-center text-[10px] font-medium px-2 py-1.5 rounded-xl border transition-colors",
            stats.allRequiredDone
              ? "bg-emerald-50/80 border-emerald-200/50 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800/30 dark:text-emerald-400"
              : "bg-amber-50/80 border-amber-200/50 text-amber-700 dark:bg-amber-950/20 dark:border-amber-800/30 dark:text-amber-400"
          )}
        >
          {stats.requiredCompleted}/{stats.requiredTotal} req
        </div>
      </div>

      {/* DOJ */}
      <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0 w-24">
        <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="tabular-nums">{employee.dateOfJoining ? formatDate(employee.dateOfJoining) : "—"}</span>
      </div>

      {/* View indicator */}
      <div className="flex items-center flex-shrink-0">
        <div className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground/40 group-hover:text-primary group-hover:bg-primary/5 transition-all duration-200">
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </div>
  );
};
