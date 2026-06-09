import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
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
  Sparkles,
  TrendingUp,
  Activity,
  Zap,
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

// ─── Animation Hook ──────────────────────────────────────────────────────────

const useStaggeredEntrance = (itemCount: number, baseDelay = 30) => {
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    for (let i = 0; i < itemCount; i++) {
      timers.push(
        setTimeout(() => {
          setVisibleItems((prev) => new Set([...prev, i]));
        }, i * baseDelay)
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [itemCount, baseDelay]);

  return visibleItems;
};

// ─── Animated Number ─────────────────────────────────────────────────────────

const AnimatedNumber: React.FC<{ value: number; duration?: number }> = ({
  value,
  duration = 600,
}) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    const start = ref.current;
    const diff = value - start;
    if (diff === 0) return;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(animate);
      else ref.current = value;
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <>{display}</>;
};

// ─── Default task definitions ─────────────────────────────────────────────────

const DEFAULT_BEFORE_TASKS: Array<{
  name: string;
  phase: TaskPhase;
  assignedTo: AssignedTo;
  required: boolean;
  icon: React.ElementType;
}> = [
  { name: "Documents collection form completed", phase: "before_joining", assignedTo: "HR", required: true, icon: FileSignature },
  { name: "DISC form completed", phase: "before_joining", assignedTo: "HR", required: false, icon: FileText },
  { name: "Workstation identified", phase: "before_joining", assignedTo: "Admin", required: true, icon: MonitorCheck },
  { name: "Email ID created", phase: "before_joining", assignedTo: "IT", required: false, icon: Mail },
  { name: "Employee added to systems", phase: "before_joining", assignedTo: "IT", required: true, icon: Database },
  { name: "Visiting card ordered", phase: "before_joining", assignedTo: "Admin", required: true, icon: IdCard },
  { name: "ID card ordered", phase: "before_joining", assignedTo: "Admin", required: false, icon: BadgeCheck },
];

const DEFAULT_AFTER_TASKS: Array<{
  name: string;
  phase: TaskPhase;
  assignedTo: AssignedTo;
  required: boolean;
  icon: React.ElementType;
}> = [
  { name: "HR policy training completed", phase: "after_joining", assignedTo: "HR", required: false, icon: ShieldCheck },
  { name: "Leave policy training completed", phase: "after_joining", assignedTo: "HR", required: false, icon: BookOpen },
  { name: "Attendance training completed", phase: "after_joining", assignedTo: "HR", required: false, icon: Clock },
  { name: "Laptop allotted", phase: "after_joining", assignedTo: "IT", required: false, icon: Laptop },
  { name: "Office tour completed", phase: "after_joining", assignedTo: "Admin", required: false, icon: Building2 },
  { name: "Reporting manager introduction", phase: "after_joining", assignedTo: "Manager", required: false, icon: UserCog },
  { name: "PF initiation (if applicable)", phase: "after_joining", assignedTo: "HR", required: false, icon: CreditCard },
  { name: "Candidate profile shared", phase: "after_joining", assignedTo: "HR", required: false, icon: Users2 },
  { name: "Buddy assigned", phase: "after_joining", assignedTo: "HR", required: true, icon: UserPlus },
  { name: "Training needs identified", phase: "after_joining", assignedTo: "Manager", required: true, icon: Presentation },
  { name: "Welcome session completed", phase: "after_joining", assignedTo: "HR", required: false, icon: PartyPopper },
  { name: "Employee database updated", phase: "after_joining", assignedTo: "HR", required: false, icon: Database },
  { name: "PF office updated", phase: "after_joining", assignedTo: "HR", required: false, icon: PhoneCall },
  { name: "ID / Visiting card provided", phase: "after_joining", assignedTo: "Admin", required: false, icon: IdCard },
  { name: "Welcome kit arranged", phase: "after_joining", assignedTo: "Admin", required: false, icon: Package },
];

const DEFAULT_TASKS: InductionTask[] = [
  ...DEFAULT_BEFORE_TASKS,
  ...DEFAULT_AFTER_TASKS,
].map((t, i) => ({
  ...t,
  id: `default-${i}`,
  status: "pending" as TaskStatus,
}));

// ─── Icon resolution ──────────────────────────────────────────────────────────

const TASK_ICON_MAP: Array<{ keywords: string[]; icon: React.ElementType }> = [
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

const normalizeTaskStatus = (status: string | null | undefined): TaskStatus => {
  if (!status) return "pending";
  const s = status.toLowerCase();
  if (s === "completed" || s === "done" || s === "verified") return "completed";
  return "pending";
};

const normalizePhase = (phase: string | null | undefined): TaskPhase => {
  if (!phase) return "before_joining";
  const p = phase.toLowerCase();
  if (p === "after_joining" || p === "after") return "after_joining";
  return "before_joining";
};

const normalizeAssignedTo = (assignedTo: string | null | undefined): AssignedTo => {
  if (!assignedTo) return "HR";
  const a = assignedTo.toUpperCase();
  if (a === "IT") return "IT";
  if (a === "ADMIN") return "Admin";
  if (a === "MANAGER") return "Manager";
  return "HR";
};

const mapApiTask = (raw: any): InductionTask => {
  const name: string = raw.name ?? raw.taskName ?? "Unknown Task";
  const defaultMatch = DEFAULT_TASKS.find(
    (d) => d.name.toLowerCase() === name.toLowerCase()
  );

  return {
    id: String(raw.id),
    name,
    phase: normalizePhase(raw.phase ?? raw.taskType ?? defaultMatch?.phase),
    assignedTo: normalizeAssignedTo(raw.assignedTo ?? defaultMatch?.assignedTo),
    required: raw.required ?? defaultMatch?.required ?? false,
    status: normalizeTaskStatus(raw.status),
    completedAt: raw.completedAt ?? undefined,
    completedBy: raw.completedBy ?? undefined,
    remarks: raw.remarks ?? undefined,
    icon: defaultMatch?.icon ?? resolveTaskIcon(name),
  };
};

const mapApiEmployee = (raw: any): EmployeeInduction => {
  const nameParts = (raw.name ?? "").split(" ");
  return {
    id: raw.id,
    employeeId: raw.employeeId ?? `EMP-${String(raw.id).padStart(4, "0")}`,
    firstName: raw.firstName ?? (nameParts.length > 0 ? nameParts[0] : "—"),
    lastName: raw.lastName ?? (nameParts.length > 1 ? nameParts[nameParts.length - 1] : ""),
    middleName: raw.middleName ?? undefined,
    email: raw.email ?? "",
    designation: raw.designation ?? raw.employeeType ?? "—",
    department: raw.department ?? raw.departmentId ?? "—",
    dateOfJoining: raw.dateOfJoining ?? raw.approvedAt ?? new Date().toISOString(),
    approvedAt: raw.approvedAt ?? new Date().toISOString(),
    tasks: Array.isArray(raw.tasks) ? raw.tasks.map(mapApiTask) : [],
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
  const beforeCompleted = beforeTasks.filter((t) => t.status === "completed").length;
  const afterCompleted = afterTasks.filter((t) => t.status === "completed").length;

  const requiredTotal = tasks.filter((t) => t.required).length;
  const requiredCompleted = tasks.filter((t) => t.required && t.status === "completed").length;
  const allRequiredDone = requiredTotal === 0 || requiredCompleted === requiredTotal;

  const byAssignee: Record<AssignedTo, { total: number; completed: number }> = {
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

const getInductionStatus = (emp: EmployeeInduction): EmployeeInductionTab => {
  const tasks = emp.tasks.length > 0 ? emp.tasks : DEFAULT_TASKS;
  const { pct, completed } = computeInductionStats(tasks);
  if (completed === 0) return "not_started";
  if (pct === 100) return "completed";
  return "in_progress";
};



// ─── CSS Keyframes (injected once) ────────────────────────────────────────────

const StyleInjector: React.FC = () => (
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

// ─── Skeleton Loaders ─────────────────────────────────────────────────────────

const EmployeeRowSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 px-5 py-4 rounded-2xl border border-border/50 bg-card/50">
    <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
    <div className="flex-1 space-y-2.5">
      <Skeleton className="h-3.5 w-44" />
      <Skeleton className="h-3 w-60" />
    </div>
    <Skeleton className="h-3 w-28 hidden lg:block" />
    <Skeleton className="h-6 w-20 hidden md:block" />
  </div>
);

const StatCardSkeleton: React.FC = () => (
  <div className="rounded-2xl border border-border/50 p-5 flex items-center gap-4 bg-card/50">
    <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
    <div className="space-y-2.5">
      <Skeleton className="h-7 w-12" />
      <Skeleton className="h-3 w-28" />
    </div>
  </div>
);

const TaskRowSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/50 bg-card/50">
    <Skeleton className="h-4 w-4 rounded flex-shrink-0" />
    <Skeleton className="w-8 h-8 rounded-xl flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-3 w-52" />
      <Skeleton className="h-2.5 w-36" />
    </div>
    <Skeleton className="h-5 w-14 rounded-lg" />
  </div>
);

// ─── Circular Progress ────────────────────────────────────────────────────────

const CircularProgress: React.FC<{
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

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string;
  value: number;
  sub?: string;
  icon: React.ElementType;
  highlight?: boolean;
  success?: boolean;
  delay?: number;
}> = ({ label, value, sub, icon: Icon, highlight, success, delay = 0 }) => (
  <div
    className={cn(
      "group relative rounded-2xl border p-5 flex items-center gap-4 transition-all duration-300",
      "hover:shadow-lg hover:-translate-y-0.5 ind-fade-up",
      highlight && "bg-primary/[0.03] border-primary/20 hover:border-primary/30 hover:shadow-primary/5",
      success && "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200/50 dark:border-emerald-800/30 hover:border-emerald-300 hover:shadow-emerald-500/5",
      !highlight && !success && "bg-card border-border/50 hover:border-border"
    )}
    style={{ animationDelay: `${delay}ms` }}
  >
    <div
      className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-105",
        highlight && "bg-primary/10",
        success && "bg-emerald-100 dark:bg-emerald-900/30",
        !highlight && !success && "bg-muted/70"
      )}
    >
      <Icon
        className={cn(
          "h-5.5 w-5.5",
          highlight && "text-primary",
          success && "text-emerald-600 dark:text-emerald-400",
          !highlight && !success && "text-muted-foreground"
        )}
      />
    </div>
    <div className="min-w-0">
      <p className="text-2xl font-bold tracking-tight leading-none">
        <AnimatedNumber value={value} />
      </p>
      <p className="text-xs font-medium text-muted-foreground mt-1">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>}
    </div>
  </div>
);



// ─── Phase Mini Progress ──────────────────────────────────────────────────────

const PhaseMiniBar: React.FC<{
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



// ─── Status Badge ─────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: EmployeeInductionTab }> = ({ status }) => {
  const config = {
    not_started: {
      label: "Not Started",
      icon: CircleDashed,
      cls: "text-muted-foreground bg-muted/60 border-border/50",
    },
    in_progress: {
      label: "In Progress",
      icon: Activity,
      cls: "text-primary bg-primary/5 border-primary/20",
    },
    completed: {
      label: "Completed",
      icon: CheckCircle2,
      cls: "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40",
    },
    all: { label: "", icon: Users, cls: "" },
  };

  const c = config[status];
  if (status === "all") return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border",
        c.cls
      )}
    >
      <c.icon className="h-3 w-3" />
      {c.label}
    </span>
  );
};

// ─── Employee Row ─────────────────────────────────────────────────────────────

const EmployeeRow: React.FC<{
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
          <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm">
            <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
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

// ─── Task Row (Modal) ─────────────────────────────────────────────────────────

const TaskRow: React.FC<{
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

// ─── Phase Section (Modal) ───────────────────────────────────────────────────

const PhaseSection: React.FC<{
  phase: TaskPhase;
  tasks: InductionTask[];
  onToggle: (task: InductionTask) => void;
  onRemark: (task: InductionTask) => void;
  togglingTaskId: string | null;
  defaultTaskIds: Set<string>;
  defaultOpen?: boolean;
}> = ({ phase, tasks, onToggle, onRemark, togglingTaskId, defaultTaskIds, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  const completed = tasks.filter((t) => t.status === "completed").length;
  const pct = tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100);
  const isBefore = phase === "before_joining";

  return (
    <div className="border border-border/40 rounded-2xl overflow-hidden ind-scale-in">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-3.5 bg-muted/20 hover:bg-muted/40 transition-colors duration-200"
      >
        <div
          className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border transition-colors",
            pct === 100
              ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/30"
              : "bg-background border-border/50"
          )}
        >
          {isBefore ? (
            <Milestone className={cn("h-4 w-4", pct === 100 ? "text-emerald-600" : "text-primary")} />
          ) : (
            <CheckCheck className={cn("h-4 w-4", pct === 100 ? "text-emerald-600" : "text-primary")} />
          )}
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold tracking-tight">
            {isBefore ? "Before Joining" : "After Joining"}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {completed}/{tasks.length} completed
          </p>
        </div>
        <div className="flex items-center gap-3 mr-2">
          <div className="w-24 h-1.5 rounded-full bg-muted/60 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full ind-progress-bar",
                pct === 100 ? "bg-emerald-500" : pct > 0 ? "bg-primary" : "bg-muted-foreground/15"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span
            className={cn(
              "text-xs font-bold tabular-nums w-8 text-right",
              pct === 100 ? "text-emerald-600 dark:text-emerald-400" : ""
            )}
          >
            {pct}%
          </span>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform duration-200",
            !open && "-rotate-90"
          )}
        />
      </button>

      {open && (
        <div className="p-3 space-y-1.5 bg-card/50 ind-slide-down">
          {tasks.map((task, i) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={onToggle}
              onRemark={onRemark}
              isToggling={togglingTaskId === task.id}
              isDefault={defaultTaskIds.has(task.id)}
              index={i}
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
      <DialogContent className="sm:max-w-sm p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-6 py-5 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
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

        <div className="px-6 py-5 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              Remarks / Notes
            </label>
            <Textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Add any notes or remarks for this task…"
              rows={3}
              className="resize-none text-sm rounded-xl"
            />
          </div>
          {task?.completedAt && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              Completed {formatDateTime(task.completedAt)}
              {task.completedBy && ` by ${task.completedBy}`}
            </p>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/20">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading} className="rounded-xl">
            Cancel
          </Button>
          <Button size="sm" onClick={() => onSave(remark)} disabled={isLoading} className="rounded-xl">
            {isLoading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
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
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all");
  const [remarkTask, setRemarkTask] = useState<InductionTask | null>(null);
  const [remarkOpen, setRemarkOpen] = useState(false);

  if (!employee) return null;

  let resolvedTasks: InductionTask[];
  let defaultTaskIds: Set<string>;

  if (isLoadingTasks) {
    resolvedTasks = [];
    defaultTaskIds = new Set();
  } else if (liveTasks && liveTasks.length > 0) {
    resolvedTasks = liveTasks;
    defaultTaskIds = new Set();
  } else {
    resolvedTasks = DEFAULT_TASKS;
    defaultTaskIds = new Set(DEFAULT_TASKS.map((t) => t.id));
  }

  const stats = computeInductionStats(resolvedTasks);

  const filteredTasks = resolvedTasks.filter((t) => {
    return filterStatus === "all" || t.status === filterStatus;
  });

  const beforeTasks = filteredTasks.filter((t) => t.phase === "before_joining");
  const afterTasks = filteredTasks.filter((t) => t.phase === "after_joining");
  const isShowingDefaults = defaultTaskIds.size > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden max-h-[92vh] flex flex-col rounded-2xl">
          {/* Header */}
          <DialogHeader className="px-6 py-5 border-b bg-muted/10 flex-shrink-0">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12 flex-shrink-0 ring-2 ring-background shadow-md">
                <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
                  {getInitials(employee.firstName, employee.lastName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-base tracking-tight">
                    {employee.firstName}{" "}
                    {employee.middleName ? `${employee.middleName} ` : ""}
                    {employee.lastName}
                  </DialogTitle>
                  <span className="text-[10px] font-mono bg-muted/70 text-muted-foreground px-1.5 py-0.5 rounded-md border border-border/40">
                    {employee.employeeId}
                  </span>
                </div>
                <DialogDescription className="text-xs mt-1">DOJ{" "}
                  {employee.dateOfJoining ? formatDate(employee.dateOfJoining) : "—"}
                </DialogDescription>
                {employee.inductionCoordinator && (
                  <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                    <UserCog className="h-3 w-3" />
                    Coordinator: {employee.inductionCoordinator}
                  </p>
                )}
              </div>
              <CircularProgress value={isLoadingTasks ? 0 : stats.pct} size={56} strokeWidth={3.5} />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-border/30">
              {[
                { label: "Total", value: stats.total, icon: ListChecks, cls: "" },
                { label: "Done", value: stats.completed, icon: CheckCircle2, cls: "text-emerald-700 dark:text-emerald-400" },
                { label: "Pending", value: stats.pending, icon: Clock, cls: "text-amber-700 dark:text-amber-400" },
                { label: "Required", value: stats.requiredCompleted, icon: Zap, cls: "" },
              ].map(({ label, value, icon: SIcon, cls }) => (
                <div key={label} className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-muted/30">
                  <SIcon className={cn("h-3.5 w-3.5 text-muted-foreground", cls)} />
                  <div>
                    <span className={cn("text-base font-bold leading-none tabular-nums", cls)}>
                      {isLoadingTasks ? "—" : value}
                    </span>
                    {label === "Required" && !isLoadingTasks && (
                      <span className="text-muted-foreground font-normal text-[10px]">/{stats.requiredTotal}</span>
                    )}
                    <p className="text-[9px] text-muted-foreground mt-0.5">{label}</p>
                  </div>
                </div>
              ))}
            </div>


          </DialogHeader>

          {/* Filters */}
          <div className="px-5 py-3 border-b border-border/30 bg-muted/5 flex items-center gap-2 flex-wrap flex-shrink-0">
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
              <SelectTrigger className="h-8 w-32 text-xs rounded-xl">
                <SelectValue placeholder="All Tasks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground ml-auto">
              <span className="text-destructive/70 font-bold border border-destructive/20 bg-destructive/5 px-1.5 rounded-md text-[8px] uppercase tracking-wider">
                Required
              </span>
              <span>= Mandatory task</span>
            </div>
          </div>

          {/* Info banner */}
          {isShowingDefaults && !isLoadingTasks && (
            <div className="px-5 py-3 bg-amber-50/60 dark:bg-amber-950/10 border-b border-amber-200/40 dark:border-amber-800/20 flex items-center gap-2.5 flex-shrink-0">
              <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <Info className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                Tasks shown are from the standard template. They haven't been initialised in the database yet.
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
                    onRemark={(task) => { setRemarkTask(task); setRemarkOpen(true); }}
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
                    onRemark={(task) => { setRemarkTask(task); setRemarkOpen(true); }}
                    togglingTaskId={togglingTaskId}
                    defaultTaskIds={defaultTaskIds}
                    defaultOpen={true}
                  />
                )}
                {filteredTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-14 text-center ind-fade-in">
                    <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                      <ListChecks className="h-7 w-7 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm font-medium">No tasks match your filters</p>
                    <p className="text-xs text-muted-foreground mt-1">Try adjusting the status filter</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-4 border-t border-border/30 bg-muted/10 flex-shrink-0">
            <div className="flex items-center justify-between w-full gap-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                {!isLoadingTasks && stats.allRequiredDone ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">
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
              <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl">
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RemarkModal
        task={remarkTask}
        open={remarkOpen}
        onClose={() => { setRemarkOpen(false); setRemarkTask(null); }}
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

const EmptyState: React.FC<{ search: string; tab: EmployeeInductionTab }> = ({ search, tab }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center ind-fade-in">
    <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-5">
      <ListChecks className="h-8 w-8 text-muted-foreground/40" />
    </div>
    <p className="text-sm font-semibold">
      {search ? "No matching employees" : `No ${tab === "all" ? "" : tab.replace(/_/g, " ")} inductions`}
    </p>
    <p className="text-xs text-muted-foreground mt-1.5 max-w-xs">
      {search
        ? `Try adjusting your search — "${search}"`
        : "Approved employees will appear here for induction tracking."}
    </p>
  </div>
);

// ─── Error State ──────────────────────────────────────────────────────────────

const ErrorState: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center ind-fade-in">
    <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-5">
      <AlertTriangle className="h-8 w-8 text-destructive/50" />
    </div>
    <p className="text-sm font-semibold">Failed to load induction data</p>
    <p className="text-xs text-muted-foreground mt-1.5 mb-5">
      There was an error fetching data from the server.
    </p>
    <Button variant="outline" size="sm" onClick={onRetry} className="rounded-xl">
      Try Again
    </Button>
  </div>
);

// ─── Legend ───────────────────────────────────────────────────────────────────

const Legend: React.FC = () => (
  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
    <div className="flex items-center gap-1">
      <Milestone className="h-3 w-3" />
      <span className="text-[10px]">Before</span>
    </div>
    <div className="flex items-center gap-1">
      <CheckCheck className="h-3 w-3" />
      <span className="text-[10px]">After</span>
    </div>
  </div>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const InductionDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<EmployeeInductionTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "progress" | "joined" | "pending">("pending");
  const [viewEmployee, setViewEmployee] = useState<EmployeeInduction | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);
  const [remarkSavingTaskId, setRemarkSavingTaskId] = useState<string | null>(null);

  // ── API ───────────────────────────────────────────────────────────────────
  const {
    data: rawTracker,
    isLoading: isLoadingTracker,
    isError: isTrackerError,
    refetch: refetchTracker,
  } = useInductionTrackerList();

  const { data: rawEmployeeTasks, isLoading: isLoadingTasks } = useEmployeeInduction(
    viewOpen && viewEmployee ? viewEmployee.id : null
  );

  const activeOnboardingId = viewEmployee?.id ?? 0;
  const { mutate: updateTask } = useUpdateInductionTask(activeOnboardingId);

  // ── Derived data ──────────────────────────────────────────────────────────
  const employees: EmployeeInduction[] = useMemo(() => {
    if (!rawTracker) return [];
    return (rawTracker as any[]).map(mapApiEmployee);
  }, [rawTracker]);

  const liveTasks: InductionTask[] | undefined = useMemo(() => {
    if (!rawEmployeeTasks) return undefined;
    return (rawEmployeeTasks as any[]).map(mapApiTask);
  }, [rawEmployeeTasks]);

  // ── Global stats ──────────────────────────────────────────────────────────
  const globalStats = useMemo(() => {
    const perEmpTotal = DEFAULT_TASKS.length;
    const totalTasks = employees.length * perEmpTotal;
    const completedTasks = employees.reduce(
      (acc, e) => acc + e.tasks.filter((t) => t.status === "completed").length,
      0
    );
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
      not_started: employees.filter((e) => getInductionStatus(e) === "not_started").length,
      in_progress: employees.filter((e) => getInductionStatus(e) === "in_progress").length,
      completed: employees.filter((e) => getInductionStatus(e) === "completed").length,
    }),
    [employees]
  );

  // ── Filtered & sorted list ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = employees.filter((e) => {
      const matchTab = activeTab === "all" || getInductionStatus(e) === activeTab;
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
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      if (sortBy === "progress") {
        const statsA = computeInductionStats(a.tasks.length > 0 ? a.tasks : DEFAULT_TASKS);
        const statsB = computeInductionStats(b.tasks.length > 0 ? b.tasks : DEFAULT_TASKS);
        return statsB.pct - statsA.pct;
      }
      if (sortBy === "joined")
        return new Date(a.dateOfJoining).getTime() - new Date(b.dateOfJoining).getTime();
      if (sortBy === "pending") {
        const pendA = a.tasks.length > 0 ? computeInductionStats(a.tasks).pending : DEFAULT_TASKS.length;
        const pendB = b.tasks.length > 0 ? computeInductionStats(b.tasks).pending : DEFAULT_TASKS.length;
        return pendB - pendA;
      }
      return 0;
    });

    return list;
  }, [employees, activeTab, searchQuery, sortBy]);

  const visibleItems = useStaggeredEntrance(filtered.length, 40);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleToggleTask = useCallback(
    (task: InductionTask) => {
      if (!viewEmployee) return;
      const newStatus = task.status === "completed" ? "pending" : "completed";
      setTogglingTaskId(task.id);
      updateTask(
        { taskId: Number(task.id), updates: { status: newStatus } },
        { onSettled: () => setTogglingTaskId(null) }
      );
    },
    [viewEmployee, updateTask]
  );

  const handleSaveRemark = useCallback(
    (taskId: string, remark: string) => {
      if (!viewEmployee) return;
      setRemarkSavingTaskId(taskId);
      updateTask(
        { taskId: Number(taskId), updates: { remarks: remark } },
        { onSettled: () => setRemarkSavingTaskId(null) }
      );
    },
    [viewEmployee, updateTask]
  );

  const tabs: { value: EmployeeInductionTab; label: string; icon: React.ElementType }[] = [
    { value: "all", label: "All", icon: Users },
    { value: "not_started", label: "Not Started", icon: CircleDashed },
    { value: "in_progress", label: "In Progress", icon: Activity },
    { value: "completed", label: "Completed", icon: CheckCircle2 },
  ];

  return (
    <TooltipProvider>
      <StyleInjector />
      <Card className="flex flex-col h-full min-h-0 rounded-2xl border-border/50 shadow-sm">
        {/* ── Header ── */}
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-5 flex-wrap">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2.5 text-lg tracking-tight">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <ClipboardList className="h-4.5 w-4.5 text-primary" />
              </div>
              Induction Tracker
            </CardTitle>
            <CardDescription className="text-sm">
              Track onboarding induction tasks for new joiners
            </CardDescription>
          </div>
          {!isLoadingTracker && globalStats.pendingTasks > 0 && (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/15 border border-amber-200/50 dark:border-amber-800/25 text-xs ind-fade-in">
              <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-amber-800 dark:text-amber-300 font-medium">
                {globalStats.pendingTasks} task{globalStats.pendingTasks > 1 ? "s" : ""} pending
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
                delay={0}
              />
              <StatCard
                label="Pending Tasks"
                value={globalStats.pendingTasks}
                icon={Clock}
                highlight={globalStats.pendingTasks > 0}
                delay={60}
              />
              <StatCard
                label="Completed Tasks"
                value={globalStats.completedTasks}
                icon={CheckCheck}
                delay={120}
              />
              <StatCard
                label="Fully Inducted"
                value={globalStats.fullyDone}
                icon={Sparkles}
                success={globalStats.fullyDone > 0}
                sub={`of ${employees.length} employees`}
                delay={180}
              />
            </div>
          )}

          {/* ── Toolbar ── */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as EmployeeInductionTab)}
              >
                <TabsList className="h-10 p-1 rounded-xl bg-muted/50">
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="gap-1.5 text-xs px-3.5 rounded-lg data-[state=active]:shadow-sm transition-all"
                    >
                      <tab.icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span
                        className={cn(
                          "ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold tabular-nums transition-colors",
                          activeTab === tab.value
                            ? "bg-background text-foreground shadow-sm"
                            : "bg-muted/60 text-muted-foreground"
                        )}
                      >
                        {isLoadingTracker ? "—" : tabCounts[tab.value]}
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <div className="flex items-center gap-2 ml-auto flex-wrap">
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="h-9 w-40 text-xs rounded-xl">
                    <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Most pending</SelectItem>
                    <SelectItem value="progress">Progress</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="joined">Joining date</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    className="pl-9 h-9 text-sm rounded-xl"
                    placeholder="Search name, ID, role…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2">
              <Legend />
              <p className="text-xs text-muted-foreground tabular-nums">
                <span className="font-semibold text-foreground">
                  {isLoadingTracker ? "—" : filtered.length}
                </span>{" "}
                of {isLoadingTracker ? "—" : employees.length} employees
              </p>
            </div>
          </div>

          {/* ── Column Headers ── */}
          <div className="hidden lg:flex items-center gap-3 px-5 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
            <div className="flex-1">Employee</div>
            <div className="w-44">Phase Progress</div>
            <div className="w-24 text-center">Progress</div>
            <div className="w-24 text-center">Required</div>
            <div className="w-24">Joining</div>
            <div className="w-8" />
          </div>

          {/* ── List ── */}
          <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
            {isLoadingTracker ? (
              <div className="space-y-2.5">
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
                {filtered.map((emp, idx) => (
                  <EmployeeRow
                    key={emp.id}
                    employee={emp}
                    index={idx}
                    isVisible={visibleItems.has(idx)}
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