import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  ArrowUpDown,
  CalendarDays,
  Loader2,
  CheckCheck,
  MessageSquare,
  ListChecks,
  ClipboardList,
  UserCog,
  Laptop,
  Building2,
  Mail,
  CreditCard,
  BadgeCheck,
  Users2,
  BookOpen,
  Presentation,
  ShieldCheck,
  Package,
  IdCard,
  Database,
  UserPlus,
  PartyPopper,
  AlertTriangle,
  MonitorCheck,
  PhoneCall,
  FileSignature,
  Milestone,
  FileText,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useInductionTrackerList,
  useEmployeeInduction,
  useUpdateInductionTask,
} from "./useOnboarding";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskStatus = "pending" | "completed";
type TaskPhase = "before_joining" | "after_joining";
type AssignedTo = "HR" | "IT" | "Admin" | "Manager";
type EmployeeInductionTab =
  | "all"
  | "not_started"
  | "in_progress"
  | "completed";

interface InductionTask {
  id: string;
  name: string;
  phase: TaskPhase;
  assignedTo: AssignedTo;
  required: boolean;
  status: TaskStatus;
  completedAt?: string;
  completedBy?: string;
  remarks?: string;
  icon: React.ElementType;
}

interface EmployeeInduction {
  id: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  designation: string;
  department: string;
  dateOfJoining: string;
  approvedAt: string;
  tasks: InductionTask[];
  inductionCoordinator?: string;
}

// ─── Default task definitions ─────────────────────────────────────────────────
// These are the canonical induction tasks every employee should have.
// They are used as a fallback when the DB has no rows yet for an employee,
// so the UI always shows a meaningful checklist rather than an empty state.

const DEFAULT_BEFORE_TASKS: Array<{
  name: string;
  phase: TaskPhase;
  assignedTo: AssignedTo;
  required: boolean;
  icon: React.ElementType;
}> = [
  {
    name: "Documents collection form completed",
    phase: "before_joining",
    assignedTo: "HR",
    required: true,
    icon: FileSignature,
  },
  {
    name: "DISC form completed",
    phase: "before_joining",
    assignedTo: "HR",
    required: false,
    icon: FileText,
  },
  {
    name: "Workstation identified",
    phase: "before_joining",
    assignedTo: "Admin",
    required: true,
    icon: MonitorCheck,
  },
  {
    name: "Email ID created",
    phase: "before_joining",
    assignedTo: "IT",
    required: false,
    icon: Mail,
  },
  {
    name: "Employee added to systems",
    phase: "before_joining",
    assignedTo: "IT",
    required: true,
    icon: Database,
  },
  {
    name: "Visiting card ordered",
    phase: "before_joining",
    assignedTo: "Admin",
    required: true,
    icon: IdCard,
  },
  {
    name: "ID card ordered",
    phase: "before_joining",
    assignedTo: "Admin",
    required: false,
    icon: BadgeCheck,
  },
];

const DEFAULT_AFTER_TASKS: Array<{
  name: string;
  phase: TaskPhase;
  assignedTo: AssignedTo;
  required: boolean;
  icon: React.ElementType;
}> = [
  {
    name: "HR policy training completed",
    phase: "after_joining",
    assignedTo: "HR",
    required: false,
    icon: ShieldCheck,
  },
  {
    name: "Leave policy training completed",
    phase: "after_joining",
    assignedTo: "HR",
    required: false,
    icon: BookOpen,
  },
  {
    name: "Attendance training completed",
    phase: "after_joining",
    assignedTo: "HR",
    required: false,
    icon: Clock,
  },
  {
    name: "Laptop allotted",
    phase: "after_joining",
    assignedTo: "IT",
    required: false,
    icon: Laptop,
  },
  {
    name: "Office tour completed",
    phase: "after_joining",
    assignedTo: "Admin",
    required: false,
    icon: Building2,
  },
  {
    name: "Reporting manager introduction",
    phase: "after_joining",
    assignedTo: "Manager",
    required: false,
    icon: UserCog,
  },
  {
    name: "PF initiation (if applicable)",
    phase: "after_joining",
    assignedTo: "HR",
    required: false,
    icon: CreditCard,
  },
  {
    name: "Candidate profile shared",
    phase: "after_joining",
    assignedTo: "HR",
    required: false,
    icon: Users2,
  },
  {
    name: "Buddy assigned",
    phase: "after_joining",
    assignedTo: "HR",
    required: true,
    icon: UserPlus,
  },
  {
    name: "Training needs identified",
    phase: "after_joining",
    assignedTo: "Manager",
    required: true,
    icon: Presentation,
  },
  {
    name: "Welcome session completed",
    phase: "after_joining",
    assignedTo: "HR",
    required: false,
    icon: PartyPopper,
  },
  {
    name: "Employee database updated",
    phase: "after_joining",
    assignedTo: "HR",
    required: false,
    icon: Database,
  },
  {
    name: "PF office updated",
    phase: "after_joining",
    assignedTo: "HR",
    required: false,
    icon: PhoneCall,
  },
  {
    name: "ID / Visiting card provided",
    phase: "after_joining",
    assignedTo: "Admin",
    required: false,
    icon: IdCard,
  },
  {
    name: "Welcome kit arranged",
    phase: "after_joining",
    assignedTo: "Admin",
    required: false,
    icon: Package,
  },
];

/** All 22 default tasks with synthetic ids prefixed "default-" */
const DEFAULT_TASKS: InductionTask[] = [
  ...DEFAULT_BEFORE_TASKS,
  ...DEFAULT_AFTER_TASKS,
].map((t, i) => ({
  ...t,
  id: `default-${i}`,
  status: "pending" as TaskStatus,
}));

// ─── Icon resolution (for API tasks whose names we may not know upfront) ──────

const TASK_ICON_MAP: Array<{
  keywords: string[];
  icon: React.ElementType;
}> = [
  { keywords: ["document", "form", "disc"], icon: FileSignature },
  { keywords: ["workstation", "monitor", "desktop"], icon: MonitorCheck },
  { keywords: ["email", "mail"], icon: Mail },
  { keywords: ["system", "database", "employee added"], icon: Database },
  { keywords: ["visiting card"], icon: IdCard },
  { keywords: ["id card", "id /"], icon: BadgeCheck },
  { keywords: ["hr policy", "policy"], icon: ShieldCheck },
  { keywords: ["leave"], icon: BookOpen },
  { keywords: ["attendance"], icon: Clock },
  { keywords: ["laptop"], icon: Laptop },
  { keywords: ["office tour", "tour"], icon: Building2 },
  { keywords: ["reporting manager", "manager intro"], icon: UserCog },
  { keywords: ["pf initiation", "pf office"], icon: CreditCard },
  { keywords: ["candidate profile", "profile shared"], icon: Users2 },
  { keywords: ["buddy"], icon: UserPlus },
  { keywords: ["training"], icon: Presentation },
  { keywords: ["welcome session", "welcome kit"], icon: PartyPopper },
  { keywords: ["kit", "package"], icon: Package },
  { keywords: ["phone", "call"], icon: PhoneCall },
];

const resolveTaskIcon = (taskName: string): React.ElementType => {
  const lower = taskName.toLowerCase();
  for (const { keywords, icon } of TASK_ICON_MAP) {
    if (keywords.some((k) => lower.includes(k))) return icon;
  }
  return FileText;
};

// ─── Normalizers ──────────────────────────────────────────────────────────────

const normalizeTaskStatus = (
  status: string | null | undefined
): TaskStatus => {
  if (!status) return "pending";
  const s = status.toLowerCase();
  if (s === "completed" || s === "done" || s === "verified")
    return "completed";
  return "pending";
};

const normalizePhase = (
  phase: string | null | undefined
): TaskPhase => {
  if (!phase) return "before_joining";
  const p = phase.toLowerCase();
  if (p === "after_joining" || p === "after") return "after_joining";
  return "before_joining";
};

const normalizeAssignedTo = (
  assignedTo: string | null | undefined
): AssignedTo => {
  if (!assignedTo) return "HR";
  const a = assignedTo.toUpperCase();
  if (a === "IT") return "IT";
  if (a === "ADMIN") return "Admin";
  if (a === "MANAGER") return "Manager";
  return "HR";
};

/**
 * Map a raw API task row → typed InductionTask.
 * Merges with the matching default task definition (by name) so that
 * required / icon / phase are always correct even if the DB row is sparse.
 */
const mapApiTask = (raw: any): InductionTask => {
  const name: string = raw.name ?? raw.taskName ?? "Unknown Task";

  // Try to find the matching default task so we inherit its metadata
  const defaultMatch = DEFAULT_TASKS.find(
    (d) => d.name.toLowerCase() === name.toLowerCase()
  );

  return {
    id: String(raw.id),
    name,
    phase: normalizePhase(
      raw.phase ?? raw.taskType ?? defaultMatch?.phase
    ),
    assignedTo: normalizeAssignedTo(
      raw.assignedTo ?? defaultMatch?.assignedTo
    ),
    required: raw.required ?? defaultMatch?.required ?? false,
    status: normalizeTaskStatus(raw.status),
    completedAt: raw.completedAt ?? undefined,
    completedBy: raw.completedBy ?? undefined,
    remarks: raw.remarks ?? undefined,
    // Prefer the matched default icon, fall back to keyword resolution
    icon: defaultMatch?.icon ?? resolveTaskIcon(name),
  };
};

/**
 * Map a raw API tracker row → typed EmployeeInduction.
 * The tracker tasks array may be empty (no DB rows seeded yet) —
 * that is handled in the modal, not here.
 */
const mapApiEmployee = (raw: any): EmployeeInduction => {
  const nameParts = (raw.name ?? "").split(" ");
  return {
    id: raw.id,
    employeeId:
      raw.employeeId ?? `EMP-${String(raw.id).padStart(4, "0")}`,
    firstName:
      raw.firstName ?? (nameParts.length > 0 ? nameParts[0] : "—"),
    lastName:
      raw.lastName ??
      (nameParts.length > 1 ? nameParts[nameParts.length - 1] : ""),
    middleName: raw.middleName ?? undefined,
    email: raw.email ?? "",
    designation: raw.designation ?? raw.employeeType ?? "—",
    department: raw.department ?? raw.departmentId ?? "—",
    dateOfJoining:
      raw.dateOfJoining ?? raw.approvedAt ?? new Date().toISOString(),
    approvedAt: raw.approvedAt ?? new Date().toISOString(),
    // Map whatever tasks the tracker returned (may be [])
    tasks: Array.isArray(raw.tasks)
      ? raw.tasks.map(mapApiTask)
      : [],
    inductionCoordinator: raw.inductionCoordinator ?? undefined,
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getInitials = (first: string, last: string) =>
  `${first?.[0] ?? "?"}${last?.[0] ?? "?"}`.toUpperCase();

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatDateTime = (d: string) =>
  new Date(d).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const computeInductionStats = (tasks: InductionTask[]) => {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const pending = total - completed;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  const beforeTasks = tasks.filter((t) => t.phase === "before_joining");
  const afterTasks = tasks.filter((t) => t.phase === "after_joining");
  const beforeCompleted = beforeTasks.filter(
    (t) => t.status === "completed"
  ).length;
  const afterCompleted = afterTasks.filter(
    (t) => t.status === "completed"
  ).length;

  const requiredTotal = tasks.filter((t) => t.required).length;
  const requiredCompleted = tasks.filter(
    (t) => t.required && t.status === "completed"
  ).length;
  const allRequiredDone =
    requiredTotal === 0 || requiredCompleted === requiredTotal;

  const byAssignee: Record<
    AssignedTo,
    { total: number; completed: number }
  > = {
    HR: { total: 0, completed: 0 },
    IT: { total: 0, completed: 0 },
    Admin: { total: 0, completed: 0 },
    Manager: { total: 0, completed: 0 },
  };
  tasks.forEach((t) => {
    byAssignee[t.assignedTo].total++;
    if (t.status === "completed") byAssignee[t.assignedTo].completed++;
  });

  return {
    total,
    completed,
    pending,
    pct,
    beforeTasks: beforeTasks.length,
    beforeCompleted,
    afterTasks: afterTasks.length,
    afterCompleted,
    requiredTotal,
    requiredCompleted,
    allRequiredDone,
    byAssignee,
  };
};

const getInductionStatus = (
  emp: EmployeeInduction
): EmployeeInductionTab => {
  // Use default tasks length as reference when DB has no tasks yet
  const tasks =
    emp.tasks.length > 0 ? emp.tasks : DEFAULT_TASKS;
  const { pct, completed } = computeInductionStats(tasks);
  if (completed === 0) return "not_started";
  if (pct === 100) return "completed";
  return "in_progress";
};

// ─── Assignee Config ──────────────────────────────────────────────────────────

const ASSIGNEE_CONFIG: Record<
  AssignedTo,
  { color: string; bg: string }
> = {
  HR: {
    color: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/40",
  },
  IT: {
    color: "text-purple-700 dark:text-purple-400",
    bg: "bg-purple-100 dark:bg-purple-900/40",
  },
  Admin: {
    color: "text-orange-700 dark:text-orange-400",
    bg: "bg-orange-100 dark:bg-orange-900/40",
  },
  Manager: {
    color: "text-teal-700 dark:text-teal-400",
    bg: "bg-teal-100 dark:bg-teal-900/40",
  },
};

// ─── Skeleton Loaders ─────────────────────────────────────────────────────────

const EmployeeRowSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl border bg-card">
    <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-3.5 w-40" />
      <Skeleton className="h-3 w-56" />
    </div>
    <Skeleton className="h-3 w-28 hidden lg:block" />
    <Skeleton className="h-3 w-36 hidden xl:block" />
    <Skeleton className="h-4 w-28" />
    <Skeleton className="h-6 w-20 hidden md:block" />
    <Skeleton className="h-4 w-16 hidden lg:block" />
  </div>
);

const StatCardSkeleton: React.FC = () => (
  <div className="rounded-xl border p-4 flex items-center gap-3 bg-card">
    <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
    <div className="space-y-2">
      <Skeleton className="h-6 w-10" />
      <Skeleton className="h-3 w-24" />
    </div>
  </div>
);

const TaskRowSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-card">
    <Skeleton className="h-4 w-4 rounded flex-shrink-0" />
    <Skeleton className="w-7 h-7 rounded-lg flex-shrink-0" />
    <div className="flex-1 space-y-1.5">
      <Skeleton className="h-3 w-48" />
      <Skeleton className="h-2.5 w-32" />
    </div>
    <Skeleton className="h-5 w-12 rounded" />
  </div>
);

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string;
  value: number;
  sub?: string;
  icon: React.ElementType;
  highlight?: boolean;
  success?: boolean;
}> = ({ label, value, sub, icon: Icon, highlight, success }) => (
  <div
    className={cn(
      "rounded-xl border p-4 flex items-center gap-3 transition-shadow hover:shadow-sm",
      highlight && "bg-primary/5 border-primary/20",
      success &&
        "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800",
      !highlight && !success && "bg-card"
    )}
  >
    <div
      className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
        highlight && "bg-primary/10",
        success && "bg-green-100 dark:bg-green-900/40",
        !highlight && !success && "bg-muted"
      )}
    >
      <Icon
        className={cn(
          "h-5 w-5",
          highlight && "text-primary",
          success && "text-green-600 dark:text-green-400",
          !highlight && !success && "text-muted-foreground"
        )}
      />
    </div>
    <div className="min-w-0">
      <p className="text-2xl font-bold tracking-tight leading-none">
        {value}
      </p>
      <p className="text-xs font-medium text-muted-foreground mt-0.5">
        {label}
      </p>
      {sub && (
        <p className="text-[10px] text-muted-foreground/70">{sub}</p>
      )}
    </div>
  </div>
);

// ─── Assignee Badge ───────────────────────────────────────────────────────────

const AssigneeBadge: React.FC<{ assignee: AssignedTo }> = ({
  assignee,
}) => {
  const cfg = ASSIGNEE_CONFIG[assignee];
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold",
        cfg.color,
        cfg.bg
      )}
    >
      {assignee}
    </span>
  );
};

// ─── Phase mini progress bar ──────────────────────────────────────────────────

const PhaseMiniBar: React.FC<{
  label: string;
  completed: number;
  total: number;
  icon: React.ElementType;
}> = ({ label, completed, total, icon: Icon }) => {
  const pct =
    total === 0 ? 0 : Math.round((completed / total) * 100);
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-default min-w-0">
            <Icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden flex-shrink-0">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  pct === 100
                    ? "bg-green-500"
                    : pct > 0
                    ? "bg-primary"
                    : "bg-muted-foreground/20"
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground w-7 text-right flex-shrink-0">
              {pct}%
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p className="font-medium">{label}</p>
          <p className="text-muted-foreground">
            {completed}/{total} tasks done
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// ─── Assignee Progress Pills ──────────────────────────────────────────────────

const AssigneeProgress: React.FC<{
  byAssignee: Record<AssignedTo, { total: number; completed: number }>;
}> = ({ byAssignee }) => (
  <div className="flex items-center gap-2 flex-wrap">
    {(
      Object.entries(byAssignee) as [
        AssignedTo,
        { total: number; completed: number }
      ][]
    ).map(([assignee, { total, completed }]) => {
      if (total === 0) return null;
      const pct = Math.round((completed / total) * 100);
      const cfg = ASSIGNEE_CONFIG[assignee];
      return (
        <TooltipProvider key={assignee} delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-default",
                  cfg.color,
                  cfg.bg
                )}
              >
                {assignee}
                <span className="font-normal opacity-70">
                  {completed}/{total}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="text-xs">
              <p className="font-medium">{assignee}</p>
              <p className="text-muted-foreground">
                {completed}/{total} tasks · {pct}%
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    })}
  </div>
);

// ─── Employee Row ─────────────────────────────────────────────────────────────

const EmployeeRow: React.FC<{
  employee: EmployeeInduction;
  onView: (e: EmployeeInduction) => void;
}> = ({ employee, onView }) => {
  // For display purposes on the list row, use tracker tasks if available,
  // otherwise fall back to default tasks so progress bars aren't all zeros.
  const displayTasks =
    employee.tasks.length > 0 ? employee.tasks : DEFAULT_TASKS;
  const stats = computeInductionStats(displayTasks);
  const status = getInductionStatus(employee);

  return (
    <div
      className="group flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5 rounded-xl border bg-card hover:bg-muted/30 transition-all cursor-pointer"
      onClick={() => onView(employee)}
    >
      {/* Avatar + Info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="relative flex-shrink-0">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
              {getInitials(employee.firstName, employee.lastName)}
            </AvatarFallback>
          </Avatar>
          <div
            className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
              status === "completed"
                ? "bg-green-500"
                : status === "in_progress"
                ? "bg-primary"
                : "bg-muted-foreground/40"
            )}
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold leading-none">
              {employee.firstName}{" "}
              {employee.middleName ? `${employee.middleName} ` : ""}
              {employee.lastName}
            </p>
            <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded hidden sm:inline">
              {employee.employeeId}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {employee.designation} · {employee.department}
          </p>
        </div>
      </div>

      {/* Phase Bars */}
      <div className="hidden lg:flex flex-col gap-1.5 w-44">
        <PhaseMiniBar
          label="Before Joining"
          completed={stats.beforeCompleted}
          total={stats.beforeTasks}
          icon={Milestone}
        />
        <PhaseMiniBar
          label="After Joining"
          completed={stats.afterCompleted}
          total={stats.afterTasks}
          icon={CheckCheck}
        />
      </div>

      {/* Assignee Progress */}
      <div className="hidden xl:block w-48">
        <AssigneeProgress byAssignee={stats.byAssignee} />
      </div>

      {/* Overall */}
      <div className="flex items-center gap-3 flex-shrink-0 w-36">
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-muted-foreground">
              {stats.completed}/{stats.total} tasks
            </span>
            <span className="text-[10px] font-bold">{stats.pct}%</span>
          </div>
          <Progress value={stats.pct} className="h-1.5" />
        </div>
      </div>

      {/* Required */}
      <div className="flex-shrink-0 w-28 hidden md:block">
        <div
          className={cn(
            "text-center text-[10px] font-medium px-2 py-1 rounded-lg border",
            stats.allRequiredDone
              ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
              : "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400"
          )}
        >
          {stats.requiredCompleted}/{stats.requiredTotal} required
        </div>
      </div>

      {/* DOJ */}
      <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0 w-24">
        <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
        <span>
          {employee.dateOfJoining
            ? formatDate(employee.dateOfJoining)
            : "—"}
        </span>
      </div>

      {/* View Button */}
      <div
        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onView(employee);
                }}
                className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Eye className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">View tasks</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

// ─── Task Row (inside modal) ──────────────────────────────────────────────────

const TaskRow: React.FC<{
  task: InductionTask;
  onToggle: (task: InductionTask) => void;
  onRemark: (task: InductionTask) => void;
  isToggling?: boolean;
  /** True when the task is a default placeholder (not yet in DB) */
  isDefault?: boolean;
}> = ({ task, onToggle, onRemark, isToggling, isDefault }) => {
  const TaskIcon = task.icon;
  const isCompleted = task.status === "completed";

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-colors",
        isCompleted
          ? "bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-900 border-l-2 border-l-green-500"
          : "bg-card border-border hover:bg-muted/30 border-l-2 border-l-border",
        isDefault && "opacity-60"
      )}
    >
      {/* Checkbox — disabled for defaults since they have no real DB id */}
      <div className="flex-shrink-0 mt-0.5">
        {isToggling ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Checkbox
            checked={isCompleted}
            onCheckedChange={() => !isDefault && onToggle(task)}
            disabled={isDefault}
            className={cn(
              isCompleted &&
                "border-green-500 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
            )}
          />
        )}
      </div>

      {/* Icon */}
      <div
        className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
          isCompleted
            ? "bg-green-100 dark:bg-green-900/40"
            : "bg-muted"
        )}
      >
        <TaskIcon
          className={cn(
            "h-3.5 w-3.5",
            isCompleted
              ? "text-green-600 dark:text-green-400"
              : "text-muted-foreground"
          )}
        />
      </div>

      {/* Name + Meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p
            className={cn(
              "text-xs font-medium",
              isCompleted && "line-through text-muted-foreground"
            )}
          >
            {task.name}
          </p>
          {task.required && (
            <span className="text-[9px] font-bold text-destructive border border-destructive/30 px-1 py-0.5 rounded leading-none">
              REQ
            </span>
          )}
          {isDefault && (
            <span className="text-[9px] font-medium text-muted-foreground border border-border px-1 py-0.5 rounded leading-none">
              NOT STARTED
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <AssigneeBadge assignee={task.assignedTo} />
          {isCompleted && task.completedAt && (
            <span className="text-[10px] text-muted-foreground">
              Done {formatDate(task.completedAt)}
              {task.completedBy && ` · ${task.completedBy}`}
            </span>
          )}
          {task.remarks && (
            <span className="text-[10px] text-muted-foreground italic truncate max-w-40">
              "{task.remarks}"
            </span>
          )}
        </div>
      </div>

      {/* Remark Button — only for real DB tasks */}
      {!isDefault && (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onRemark(task)}
                className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex-shrink-0"
              >
                <MessageSquare className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">
              Add / view remark
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

// ─── Phase Section (inside modal) ────────────────────────────────────────────

const PhaseSection: React.FC<{
  phase: TaskPhase;
  tasks: InductionTask[];
  onToggle: (task: InductionTask) => void;
  onRemark: (task: InductionTask) => void;
  togglingTaskId: string | null;
  defaultTaskIds: Set<string>;
  defaultOpen?: boolean;
}> = ({
  phase,
  tasks,
  onToggle,
  onRemark,
  togglingTaskId,
  defaultTaskIds,
  defaultOpen = true,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const completed = tasks.filter((t) => t.status === "completed").length;
  const pct =
    tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100);
  const isBefore = phase === "before_joining";

  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors"
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border bg-background">
          {isBefore ? (
            <Milestone className="h-3.5 w-3.5 text-primary" />
          ) : (
            <CheckCheck className="h-3.5 w-3.5 text-primary" />
          )}
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold">
            {isBefore ? "Before Joining" : "After Joining"}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {completed}/{tasks.length} tasks completed
          </p>
        </div>
        <div className="flex items-center gap-3 mr-2">
          <Progress value={pct} className="w-20 h-1.5" />
          <span
            className={cn(
              "text-xs font-bold",
              pct === 100
                ? "text-green-600 dark:text-green-400"
                : "text-foreground"
            )}
          >
            {pct}%
          </span>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {open && (
        <div className="p-3 space-y-2 bg-card">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={onToggle}
              onRemark={onRemark}
              isToggling={togglingTaskId === task.id}
              isDefault={defaultTaskIds.has(task.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Remark Modal ─────────────────────────────────────────────────────────────

const RemarkModal: React.FC<{
  task: InductionTask | null;
  open: boolean;
  onClose: () => void;
  onSave: (remark: string) => void;
  isLoading?: boolean;
}> = ({ task, open, onClose, onSave, isLoading }) => {
  const [remark, setRemark] = useState(task?.remarks ?? "");

  React.useEffect(() => {
    if (open) setRemark(task?.remarks ?? "");
  }, [open, task]);

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-sm p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base">Task Remark</DialogTitle>
              <DialogDescription className="text-xs mt-0.5 line-clamp-1">
                {task?.name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              Remarks / Notes
            </label>
            <Textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Add any notes or remarks for this task…"
              rows={3}
              className="resize-none text-sm"
            />
          </div>
          {task?.completedAt && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              Completed {formatDateTime(task.completedAt)}
              {task.completedBy && ` by ${task.completedBy}`}
            </p>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => onSave(remark)}
            disabled={isLoading}
          >
            {isLoading && (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            )}
            Save Remark
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Employee Induction Modal ─────────────────────────────────────────────────

const EmployeeInductionModal: React.FC<{
  employee: EmployeeInduction | null;
  open: boolean;
  onClose: () => void;
  liveTasks: InductionTask[] | undefined;
  isLoadingTasks: boolean;
  togglingTaskId: string | null;
  onToggleTask: (task: InductionTask) => void;
  onSaveRemark: (taskId: string, remark: string) => void;
  isRemarkLoading: boolean;
}> = ({
  employee,
  open,
  onClose,
  liveTasks,
  isLoadingTasks,
  togglingTaskId,
  onToggleTask,
  onSaveRemark,
  isRemarkLoading,
}) => {
  const [filterAssignee, setFilterAssignee] = useState<
    AssignedTo | "all"
  >("all");
  const [filterStatus, setFilterStatus] = useState<
    TaskStatus | "all"
  >("all");
  const [remarkTask, setRemarkTask] = useState<InductionTask | null>(
    null
  );
  const [remarkOpen, setRemarkOpen] = useState(false);

  if (!employee) return null;

  // ── Resolve which tasks to display ───────────────────────────────────────
  // Priority: liveTasks (fresh from API) > DEFAULT_TASKS (placeholder)
  // We never fall back to employee.tasks from the tracker because the
  // tracker often returns [] for employees who have no DB rows yet.
  //
  // defaultTaskIds tracks which ids came from DEFAULT_TASKS so TaskRow
  // can render them as read-only placeholders.
  let resolvedTasks: InductionTask[];
  let defaultTaskIds: Set<string>;

  if (isLoadingTasks) {
    // Still fetching — show nothing yet (skeleton rendered below)
    resolvedTasks = [];
    defaultTaskIds = new Set();
  } else if (liveTasks && liveTasks.length > 0) {
    // Real tasks exist in DB — show them, fully interactive
    resolvedTasks = liveTasks;
    defaultTaskIds = new Set(); // no defaults mixed in
  } else {
    // No DB rows yet — show the canonical default checklist as read-only
    // placeholders so HR sees what needs to be done
    resolvedTasks = DEFAULT_TASKS;
    defaultTaskIds = new Set(DEFAULT_TASKS.map((t) => t.id));
  }

  const stats = computeInductionStats(resolvedTasks);

  const filteredTasks = resolvedTasks.filter((t) => {
    const aOk =
      filterAssignee === "all" || t.assignedTo === filterAssignee;
    const sOk = filterStatus === "all" || t.status === filterStatus;
    return aOk && sOk;
  });

  const beforeTasks = filteredTasks.filter(
    (t) => t.phase === "before_joining"
  );
  const afterTasks = filteredTasks.filter(
    (t) => t.phase === "after_joining"
  );

  const isShowingDefaults = defaultTaskIds.size > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden max-h-[92vh] flex flex-col">
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b bg-muted/30 flex-shrink-0">
            <div className="flex items-center gap-4">
              <Avatar className="h-11 w-11 flex-shrink-0">
                <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
                  {getInitials(employee.firstName, employee.lastName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-base">
                    {employee.firstName}{" "}
                    {employee.middleName
                      ? `${employee.middleName} `
                      : ""}
                    {employee.lastName}
                  </DialogTitle>
                  <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                    {employee.employeeId}
                  </span>
                </div>
                <DialogDescription className="text-xs mt-0.5">
                  {employee.designation} · {employee.department} · DOJ{" "}
                  {employee.dateOfJoining
                    ? formatDate(employee.dateOfJoining)
                    : "—"}
                </DialogDescription>
                {employee.inductionCoordinator && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <UserCog className="h-3 w-3" />
                    Coordinator: {employee.inductionCoordinator}
                  </p>
                )}
              </div>
            </div>

            {/* Stat Strip */}
            <div className="flex items-center gap-5 mt-3 pt-3 border-t flex-wrap">
              {[
                {
                  label: "Total",
                  value: stats.total,
                  cls: "text-foreground",
                },
                {
                  label: "Completed",
                  value: stats.completed,
                  cls: "text-green-700 dark:text-green-400",
                },
                {
                  label: "Pending",
                  value: stats.pending,
                  cls: "text-amber-700 dark:text-amber-400",
                },
                {
                  label: "Required",
                  value: `${stats.requiredCompleted}/${stats.requiredTotal}`,
                  cls: "text-foreground",
                },
              ].map(({ label, value, cls }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span
                    className={cn("text-lg font-bold leading-none", cls)}
                  >
                    {isLoadingTasks ? "—" : value}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {label}
                  </span>
                </div>
              ))}
              <div className="ml-auto flex items-center gap-2">
                <Progress
                  value={isLoadingTasks ? 0 : stats.pct}
                  className="w-24 h-1.5"
                />
                <span className="text-xs font-bold">
                  {isLoadingTasks ? "—" : `${stats.pct}%`}
                </span>
              </div>
            </div>

            {/* Assignee breakdown */}
            {!isLoadingTasks && (
              <div className="mt-2">
                <AssigneeProgress byAssignee={stats.byAssignee} />
              </div>
            )}
          </DialogHeader>

          {/* Filters */}
          <div className="px-5 py-2.5 border-b bg-muted/10 flex items-center gap-2 flex-wrap flex-shrink-0">
            <Select
              value={filterAssignee}
              onValueChange={(v) => setFilterAssignee(v as any)}
            >
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue placeholder="All Teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {(["HR", "IT", "Admin", "Manager"] as AssignedTo[]).map(
                  (a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            <Select
              value={filterStatus}
              onValueChange={(v) => setFilterStatus(v as any)}
            >
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue placeholder="All Tasks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground ml-auto">
              <span className="text-destructive font-bold border border-destructive/30 px-1 rounded text-[9px]">
                REQ
              </span>
              <span>= Required task</span>
            </div>
          </div>

          {/* Info banner when showing defaults */}
          {isShowingDefaults && !isLoadingTasks && (
            <div className="px-5 py-2.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 flex items-center gap-2 flex-shrink-0">
              <Info className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                Induction tasks have not been initialised for this
                employee yet. Tasks shown are the standard checklist.
                Contact your system administrator to seed tasks.
              </p>
            </div>
          )}

          {/* Task List */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
            {isLoadingTasks ? (
              <div className="space-y-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <TaskRowSkeleton key={i} />
                ))}
              </div>
            ) : (
              <>
                {beforeTasks.length > 0 && (
                  <PhaseSection
                    phase="before_joining"
                    tasks={beforeTasks}
                    onToggle={onToggleTask}
                    onRemark={(task) => {
                      setRemarkTask(task);
                      setRemarkOpen(true);
                    }}
                    togglingTaskId={togglingTaskId}
                    defaultTaskIds={defaultTaskIds}
                    defaultOpen={true}
                  />
                )}
                {afterTasks.length > 0 && (
                  <PhaseSection
                    phase="after_joining"
                    tasks={afterTasks}
                    onToggle={onToggleTask}
                    onRemark={(task) => {
                      setRemarkTask(task);
                      setRemarkOpen(true);
                    }}
                    togglingTaskId={togglingTaskId}
                    defaultTaskIds={defaultTaskIds}
                    defaultOpen={true}
                  />
                )}
                {filteredTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <ListChecks className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm font-medium">
                      No tasks match filters
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-3.5 border-t bg-muted/30 flex-shrink-0">
            <div className="flex items-center justify-between w-full gap-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                {!isLoadingTasks && stats.allRequiredDone ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-green-700 dark:text-green-400 font-medium">
                      All required tasks completed
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                    <span>
                      {isLoadingTasks
                        ? "Loading tasks…"
                        : `${stats.requiredCompleted}/${stats.requiredTotal} required tasks done`}
                    </span>
                  </>
                )}
              </p>
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nested Remark Modal */}
      <RemarkModal
        task={remarkTask}
        open={remarkOpen}
        onClose={() => {
          setRemarkOpen(false);
          setRemarkTask(null);
        }}
        onSave={(remark) => {
          if (remarkTask) {
            onSaveRemark(remarkTask.id, remark);
            setRemarkOpen(false);
            setRemarkTask(null);
          }
        }}
        isLoading={isRemarkLoading}
      />
    </>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState: React.FC<{
  search: string;
  tab: EmployeeInductionTab;
}> = ({ search, tab }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
      <ListChecks className="h-7 w-7 text-muted-foreground/50" />
    </div>
    <p className="text-sm font-medium">
      {search
        ? "No matching employees"
        : `No ${
            tab === "all" ? "" : tab.replace(/_/g, " ")
          } inductions`}
    </p>
    <p className="text-xs text-muted-foreground mt-1">
      {search
        ? `Try adjusting your search — "${search}"`
        : "Approved employees will appear here for induction tracking."}
    </p>
  </div>
);

// ─── Error State ──────────────────────────────────────────────────────────────

const ErrorState: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
      <AlertTriangle className="h-7 w-7 text-destructive/60" />
    </div>
    <p className="text-sm font-medium">Failed to load induction data</p>
    <p className="text-xs text-muted-foreground mt-1 mb-4">
      There was an error fetching induction tasks from the server.
    </p>
    <Button variant="outline" size="sm" onClick={onRetry}>
      Try Again
    </Button>
  </div>
);

// ─── Legend ───────────────────────────────────────────────────────────────────

const Legend: React.FC = () => (
  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
    {(["HR", "IT", "Admin", "Manager"] as AssignedTo[]).map((a) => (
      <div key={a} className="flex items-center gap-1.5">
        <span
          className={cn(
            "inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold",
            ASSIGNEE_CONFIG[a].color,
            ASSIGNEE_CONFIG[a].bg
          )}
        >
          {a}
        </span>
      </div>
    ))}
    <div className="flex items-center gap-1.5">
      <Milestone className="h-3.5 w-3.5 text-muted-foreground" />
      <span>Before Joining</span>
    </div>
    <div className="flex items-center gap-1.5">
      <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />
      <span>After Joining</span>
    </div>
  </div>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const InductionDashboard: React.FC = () => {
  const [activeTab, setActiveTab] =
    useState<EmployeeInductionTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "name" | "progress" | "joined" | "pending"
  >("pending");

  const [viewEmployee, setViewEmployee] =
    useState<EmployeeInduction | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(
    null
  );
  const [remarkSavingTaskId, setRemarkSavingTaskId] = useState<
    string | null
  >(null);

  // ── API ───────────────────────────────────────────────────────────────────
  const {
    data: rawTracker,
    isLoading: isLoadingTracker,
    isError: isTrackerError,
    refetch: refetchTracker,
  } = useInductionTrackerList();

  // Only fires when the modal is open and we have an employee selected
  const { data: rawEmployeeTasks, isLoading: isLoadingTasks } =
    useEmployeeInduction(
      viewOpen && viewEmployee ? viewEmployee.id : null
    );

  const activeOnboardingId = viewEmployee?.id ?? 0;
  const { mutate: updateTask } =
    useUpdateInductionTask(activeOnboardingId);

  // ── Derived data ──────────────────────────────────────────────────────────
  const employees: EmployeeInduction[] = useMemo(() => {
    if (!rawTracker) return [];
    return (rawTracker as any[]).map(mapApiEmployee);
  }, [rawTracker]);

  // Map raw API tasks → typed tasks (with icons resolved)
  const liveTasks: InductionTask[] | undefined = useMemo(() => {
    if (!rawEmployeeTasks) return undefined;
    return (rawEmployeeTasks as any[]).map(mapApiTask);
  }, [rawEmployeeTasks]);

  // ── Global stats ──────────────────────────────────────────────────────────
  // Use DEFAULT_TASKS.length as the per-employee total when the tracker
  // returns no tasks, so numbers are meaningful rather than 0.
  const globalStats = useMemo(() => {
    const perEmpTotal = DEFAULT_TASKS.length;
    const totalTasks = employees.length * perEmpTotal;

    const completedTasks = employees.reduce((acc, e) => {
      // If tracker has real task data, count from it; otherwise 0
      return (
        acc + e.tasks.filter((t) => t.status === "completed").length
      );
    }, 0);

    const pendingTasks = totalTasks - completedTasks;
    const fullyDone = employees.filter((e) => {
      if (e.tasks.length === 0) return false;
      return computeInductionStats(e.tasks).pct === 100;
    }).length;

    return { totalTasks, completedTasks, pendingTasks, fullyDone };
  }, [employees]);

  // ── Tab counts ─────────────────────────────────────────────────────────────
  const tabCounts = useMemo(
    () => ({
      all: employees.length,
      not_started: employees.filter(
        (e) => getInductionStatus(e) === "not_started"
      ).length,
      in_progress: employees.filter(
        (e) => getInductionStatus(e) === "in_progress"
      ).length,
      completed: employees.filter(
        (e) => getInductionStatus(e) === "completed"
      ).length,
    }),
    [employees]
  );

  // ── Filtered & sorted list ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = employees.filter((e) => {
      const matchTab =
        activeTab === "all" || getInductionStatus(e) === activeTab;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
        e.employeeId.toLowerCase().includes(q) ||
        e.designation.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q);
      return matchTab && matchSearch;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === "name")
        return `${a.firstName} ${a.lastName}`.localeCompare(
          `${b.firstName} ${b.lastName}`
        );
      if (sortBy === "progress") {
        const statsA = computeInductionStats(
          a.tasks.length > 0 ? a.tasks : DEFAULT_TASKS
        );
        const statsB = computeInductionStats(
          b.tasks.length > 0 ? b.tasks : DEFAULT_TASKS
        );
        return statsB.pct - statsA.pct;
      }
      if (sortBy === "joined")
        return (
          new Date(a.dateOfJoining).getTime() -
          new Date(b.dateOfJoining).getTime()
        );
      if (sortBy === "pending") {
        const pendA =
          a.tasks.length > 0
            ? computeInductionStats(a.tasks).pending
            : DEFAULT_TASKS.length;
        const pendB =
          b.tasks.length > 0
            ? computeInductionStats(b.tasks).pending
            : DEFAULT_TASKS.length;
        return pendB - pendA;
      }
      return 0;
    });

    return list;
  }, [employees, activeTab, searchQuery, sortBy]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleToggleTask = (task: InductionTask) => {
    if (!viewEmployee) return;
    const newStatus =
      task.status === "completed" ? "pending" : "completed";
    setTogglingTaskId(task.id);
    updateTask(
      { taskId: Number(task.id), updates: { status: newStatus } },
      { onSettled: () => setTogglingTaskId(null) }
    );
  };

  const handleSaveRemark = (taskId: string, remark: string) => {
    if (!viewEmployee) return;
    setRemarkSavingTaskId(taskId);
    updateTask(
      { taskId: Number(taskId), updates: { remarks: remark } },
      { onSettled: () => setRemarkSavingTaskId(null) }
    );
  };

  const tabs: {
    value: EmployeeInductionTab;
    label: string;
    icon: React.ElementType;
  }[] = [
    { value: "all", label: "All", icon: Users },
    { value: "not_started", label: "Not Started", icon: CircleDashed },
    { value: "in_progress", label: "In Progress", icon: Clock },
    { value: "completed", label: "Completed", icon: CheckCircle2 },
  ];

  return (
    <TooltipProvider>
      <Card className="flex flex-col h-full min-h-0">
        {/* ── Header ── */}
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4 flex-wrap">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5 text-primary" />
              Induction Tracker
            </CardTitle>
            <CardDescription>
              Manage and track onboarding induction tasks for all new
              joiners
            </CardDescription>
          </div>
          {!isLoadingTracker && globalStats.pendingTasks > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span className="text-amber-800 dark:text-amber-300 font-medium">
                {globalStats.pendingTasks} task
                {globalStats.pendingTasks > 1 ? "s" : ""} pending
              </span>
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 min-h-0 flex flex-col gap-5">
          {/* ── Stats ── */}
          {isLoadingTracker ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <StatCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                label="Total Tasks"
                value={globalStats.totalTasks}
                icon={ListChecks}
                sub={`across ${employees.length} employees`}
              />
              <StatCard
                label="Pending Tasks"
                value={globalStats.pendingTasks}
                icon={Clock}
                highlight={globalStats.pendingTasks > 0}
              />
              <StatCard
                label="Completed Tasks"
                value={globalStats.completedTasks}
                icon={CheckCheck}
              />
              <StatCard
                label="Fully Inducted"
                value={globalStats.fullyDone}
                icon={PartyPopper}
                success={globalStats.fullyDone > 0}
                sub={`of ${employees.length} employees`}
              />
            </div>
          )}

          {/* ── Toolbar ── */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Tabs
                value={activeTab}
                onValueChange={(v) =>
                  setActiveTab(v as EmployeeInductionTab)
                }
              >
                <TabsList className="h-9">
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="gap-1.5 text-xs px-3"
                    >
                      <tab.icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">
                        {tab.label}
                      </span>
                      <span
                        className={cn(
                          "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                          activeTab === tab.value
                            ? "bg-background text-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {isLoadingTracker ? "—" : tabCounts[tab.value]}
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <div className="flex items-center gap-2 ml-auto flex-wrap">
                <Select
                  value={sortBy}
                  onValueChange={(v) => setSortBy(v as typeof sortBy)}
                >
                  <SelectTrigger className="h-9 w-40 text-xs">
                    <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">
                      Sort: Most pending
                    </SelectItem>
                    <SelectItem value="progress">
                      Sort: Progress
                    </SelectItem>
                    <SelectItem value="name">Sort: Name</SelectItem>
                    <SelectItem value="joined">
                      Sort: Joining date
                    </SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    className="pl-9 h-9 text-sm"
                    placeholder="Search name, ID, role…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2">
              <Legend />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {isLoadingTracker ? "—" : filtered.length}
                </span>{" "}
                of {isLoadingTracker ? "—" : employees.length} employees
              </p>
            </div>
          </div>

          {/* ── Column Headers ── */}
          <div className="hidden lg:flex items-center gap-3 px-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            <div className="flex-1">Employee</div>
            <div className="w-44">Phase Progress</div>
            <div className="w-48">Team Breakdown</div>
            <div className="w-36">Overall</div>
            <div className="w-28">Required</div>
            <div className="w-24">Joining</div>
            <div className="w-8" />
          </div>

          {/* ── List ── */}
          <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
            {isLoadingTracker ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <EmployeeRowSkeleton key={i} />
                ))}
              </div>
            ) : isTrackerError ? (
              <ErrorState onRetry={refetchTracker} />
            ) : filtered.length === 0 ? (
              <EmptyState search={searchQuery} tab={activeTab} />
            ) : (
              <div className="space-y-2">
                {filtered.map((emp) => (
                  <EmployeeRow
                    key={emp.id}
                    employee={emp}
                    onView={(e) => {
                      setViewEmployee(e);
                      setViewOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </CardContent>

        {/* ── Modal ── */}
        <EmployeeInductionModal
          employee={viewEmployee}
          open={viewOpen}
          onClose={() => {
            setViewOpen(false);
            setViewEmployee(null);
            setTogglingTaskId(null);
          }}
          liveTasks={liveTasks}
          isLoadingTasks={isLoadingTasks}
          togglingTaskId={togglingTaskId}
          onToggleTask={handleToggleTask}
          onSaveRemark={handleSaveRemark}
          isRemarkLoading={remarkSavingTaskId !== null}
        />
      </Card>
    </TooltipProvider>
  );
};

export default InductionDashboard;