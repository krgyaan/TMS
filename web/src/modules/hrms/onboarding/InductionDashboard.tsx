import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
  Pencil,
  RotateCcw,
  TrendingUp,
  PartyPopper,
  X,
  Info,
  MonitorCheck,
  PhoneCall,
  FileSignature,
  Milestone,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskStatus = "pending" | "completed";
type TaskPhase = "before_joining" | "after_joining";
type AssignedTo = "HR" | "IT" | "Admin" | "Manager";
type EmployeeInductionTab = "all" | "not_started" | "in_progress" | "completed";

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

// ─── Task Definitions ─────────────────────────────────────────────────────────

const BEFORE_JOINING_TASKS: Omit<InductionTask, "id" | "status" | "completedAt" | "completedBy" | "remarks">[] = [
  { name: "Documents collection form completed", phase: "before_joining", assignedTo: "HR", required: true, icon: ClipboardList },
  { name: "DISC form completed", phase: "before_joining", assignedTo: "HR", required: false, icon: FileSignature },
  { name: "Workstation identified", phase: "before_joining", assignedTo: "Admin", required: true, icon: MonitorCheck },
  { name: "Email ID created", phase: "before_joining", assignedTo: "IT", required: false, icon: Mail },
  { name: "Employee added to systems", phase: "before_joining", assignedTo: "IT", required: true, icon: Database },
  { name: "Visiting card ordered", phase: "before_joining", assignedTo: "Admin", required: true, icon: IdCard },
  { name: "ID card ordered", phase: "before_joining", assignedTo: "Admin", required: false, icon: BadgeCheck },
];

const AFTER_JOINING_TASKS: Omit<InductionTask, "id" | "status" | "completedAt" | "completedBy" | "remarks">[] = [
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

// ─── Mock Data Generator ──────────────────────────────────────────────────────

const makeTask = (
  def: Omit<InductionTask, "id" | "status" | "completedAt" | "completedBy" | "remarks">,
  idx: number,
  completedCount: number,
  total: number,
): InductionTask => {
  const isCompleted = idx < completedCount;
  return {
    ...def,
    id: `task-${idx}`,
    status: isCompleted ? "completed" : "pending",
    completedAt: isCompleted ? "2024-07-23T10:00:00Z" : undefined,
    completedBy: isCompleted ? "Anjali Kapoor" : undefined,
    remarks: isCompleted && idx % 3 === 0 ? "Completed on schedule." : undefined,
  };
};

const buildTasks = (completedBefore: number, completedAfter: number): InductionTask[] => {
  const before = BEFORE_JOINING_TASKS.map((t, i) =>
    makeTask(t, i, completedBefore, BEFORE_JOINING_TASKS.length)
  );
  const after = AFTER_JOINING_TASKS.map((t, i) =>
    makeTask(t, i + BEFORE_JOINING_TASKS.length, completedBefore + completedAfter, BEFORE_JOINING_TASKS.length + AFTER_JOINING_TASKS.length)
  );
  return [...before, ...after];
};

const MOCK_EMPLOYEES: EmployeeInduction[] = [
  {
    id: 1,
    employeeId: "EMP24A1B2",
    firstName: "Priya",
    lastName: "Sharma",
    email: "priya.sharma@gmail.com",
    designation: "Software Engineer",
    department: "Information Technology",
    dateOfJoining: "2024-08-01",
    approvedAt: "2024-07-22T10:30:00Z",
    inductionCoordinator: "Anjali Kapoor",
    tasks: buildTasks(7, 12),
  },
  {
    id: 2,
    employeeId: "EMP24C3D4",
    firstName: "Rahul",
    lastName: "Mehta",
    email: "rahul.mehta@gmail.com",
    designation: "Product Manager",
    department: "Operations",
    dateOfJoining: "2024-07-28",
    approvedAt: "2024-07-20T09:00:00Z",
    inductionCoordinator: "Vikram Singh",
    tasks: buildTasks(5, 3),
  },
  {
    id: 3,
    employeeId: "EMP24E5F6",
    firstName: "Sneha",
    lastName: "Iyer",
    email: "sneha.iyer@gmail.com",
    designation: "UX Designer",
    department: "Design",
    dateOfJoining: "2024-08-05",
    approvedAt: "2024-07-23T11:00:00Z",
    inductionCoordinator: "Anjali Kapoor",
    tasks: buildTasks(0, 0),
  },
  {
    id: 4,
    employeeId: "EMP24G7H8",
    firstName: "Arjun",
    lastName: "Nair",
    email: "arjun.nair@gmail.com",
    designation: "Data Analyst",
    department: "Finance",
    dateOfJoining: "2024-08-12",
    approvedAt: "2024-07-25T08:00:00Z",
    inductionCoordinator: "Anjali Kapoor",
    tasks: buildTasks(7, 15),
  },
  {
    id: 5,
    employeeId: "EMP24I9J0",
    firstName: "Meera",
    lastName: "Pillai",
    middleName: "R",
    email: "meera.pillai@gmail.com",
    designation: "HR Executive",
    department: "Human Resources",
    dateOfJoining: "2024-08-03",
    approvedAt: "2024-07-26T13:00:00Z",
    inductionCoordinator: "Anjali Kapoor",
    tasks: buildTasks(7, 15),
  },
  {
    id: 6,
    employeeId: "EMP24K1L2",
    firstName: "Karan",
    lastName: "Patel",
    email: "karan.patel@gmail.com",
    designation: "Sales Executive",
    department: "Sales",
    dateOfJoining: "2024-07-29",
    approvedAt: "2024-07-18T16:00:00Z",
    inductionCoordinator: "Vikram Singh",
    tasks: buildTasks(3, 0),
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getInitials = (first: string, last: string) =>
  `${first[0]}${last[0]}`.toUpperCase();

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
  const completed = tasks.filter(t => t.status === "completed").length;
  const pending = total - completed;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  const beforeTasks = tasks.filter(t => t.phase === "before_joining");
  const afterTasks = tasks.filter(t => t.phase === "after_joining");
  const beforeCompleted = beforeTasks.filter(t => t.status === "completed").length;
  const afterCompleted = afterTasks.filter(t => t.status === "completed").length;

  const requiredTotal = tasks.filter(t => t.required).length;
  const requiredCompleted = tasks.filter(t => t.required && t.status === "completed").length;
  const allRequiredDone = requiredCompleted === requiredTotal;

  const byAssignee: Record<AssignedTo, { total: number; completed: number }> = {
    HR: { total: 0, completed: 0 },
    IT: { total: 0, completed: 0 },
    Admin: { total: 0, completed: 0 },
    Manager: { total: 0, completed: 0 },
  };
  tasks.forEach(t => {
    byAssignee[t.assignedTo].total++;
    if (t.status === "completed") byAssignee[t.assignedTo].completed++;
  });

  return {
    total, completed, pending, pct,
    beforeTasks: beforeTasks.length, beforeCompleted,
    afterTasks: afterTasks.length, afterCompleted,
    requiredTotal, requiredCompleted, allRequiredDone,
    byAssignee,
  };
};

const getInductionStatus = (emp: EmployeeInduction): EmployeeInductionTab => {
  const { pct, completed } = computeInductionStats(emp.tasks);
  if (completed === 0) return "not_started";
  if (pct === 100) return "completed";
  return "in_progress";
};

// ─── Assignee Config ──────────────────────────────────────────────────────────

const ASSIGNEE_CONFIG: Record<AssignedTo, { color: string; bg: string }> = {
  HR: { color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/40" },
  IT: { color: "text-purple-700 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-900/40" },
  Admin: { color: "text-orange-700 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/40" },
  Manager: { color: "text-teal-700 dark:text-teal-400", bg: "bg-teal-100 dark:bg-teal-900/40" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string;
  value: number;
  sub?: string;
  icon: React.ElementType;
  highlight?: boolean;
  success?: boolean;
}> = ({ label, value, sub, icon: Icon, highlight, success }) => (
  <div className={cn(
    "rounded-xl border p-4 flex items-center gap-3 transition-shadow hover:shadow-sm",
    highlight && "bg-primary/5 border-primary/20",
    success && "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800",
    !highlight && !success && "bg-card",
  )}>
    <div className={cn(
      "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
      highlight && "bg-primary/10",
      success && "bg-green-100 dark:bg-green-900/40",
      !highlight && !success && "bg-muted",
    )}>
      <Icon className={cn(
        "h-5 w-5",
        highlight && "text-primary",
        success && "text-green-600 dark:text-green-400",
        !highlight && !success && "text-muted-foreground",
      )} />
    </div>
    <div className="min-w-0">
      <p className="text-2xl font-bold tracking-tight leading-none">{value}</p>
      <p className="text-xs font-medium text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/70">{sub}</p>}
    </div>
  </div>
);

const AssigneeBadge: React.FC<{ assignee: AssignedTo }> = ({ assignee }) => {
  const cfg = ASSIGNEE_CONFIG[assignee];
  return (
    <span className={cn(
      "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold",
      cfg.color, cfg.bg,
    )}>
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
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
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
                  pct === 100 ? "bg-green-500" : pct > 0 ? "bg-primary" : "bg-muted-foreground/20",
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
          <p className="text-muted-foreground">{completed}/{total} tasks done</p>
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
    {(Object.entries(byAssignee) as [AssignedTo, { total: number; completed: number }][]).map(
      ([assignee, { total, completed }]) => {
        if (total === 0) return null;
        const pct = Math.round((completed / total) * 100);
        const cfg = ASSIGNEE_CONFIG[assignee];
        return (
          <TooltipProvider key={assignee} delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-default",
                  cfg.color, cfg.bg,
                )}>
                  {assignee}
                  <span className="font-normal opacity-70">{completed}/{total}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                <p className="font-medium">{assignee}</p>
                <p className="text-muted-foreground">{completed}/{total} tasks · {pct}%</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }
    )}
  </div>
);

// ─── Employee Row ─────────────────────────────────────────────────────────────

interface EmployeeRowProps {
  employee: EmployeeInduction;
  onView: (e: EmployeeInduction) => void;
}

const EmployeeRow: React.FC<EmployeeRowProps> = ({ employee, onView }) => {
  const stats = computeInductionStats(employee.tasks);
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
          <div className={cn(
            "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
            status === "completed" ? "bg-green-500"
              : status === "in_progress" ? "bg-primary"
              : "bg-muted-foreground/40",
          )} />
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
        <div className={cn(
          "text-center text-[10px] font-medium px-2 py-1 rounded-lg border",
          stats.allRequiredDone
            ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
            : "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400",
        )}>
          {stats.requiredCompleted}/{stats.requiredTotal} required
        </div>
      </div>

      {/* DOJ */}
      <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0 w-24">
        <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
        <span>{formatDate(employee.dateOfJoining)}</span>
      </div>

      {/* View Button */}
      <div
        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={e => { e.stopPropagation(); onView(employee); }}
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

interface TaskRowProps {
  task: InductionTask;
  onToggle: (task: InductionTask) => void;
  onRemark: (task: InductionTask) => void;
}

const TaskRow: React.FC<TaskRowProps> = ({ task, onToggle, onRemark }) => {
  const TaskIcon = task.icon;
  const isCompleted = task.status === "completed";

  return (
    <div className={cn(
      "flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-colors",
      isCompleted
        ? "bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-900 border-l-2 border-l-green-500"
        : "bg-card border-border hover:bg-muted/30 border-l-2 border-l-border",
    )}>
      {/* Checkbox */}
      <div className="flex-shrink-0 mt-0.5">
        <Checkbox
          checked={isCompleted}
          onCheckedChange={() => onToggle(task)}
          className={cn(
            isCompleted && "border-green-500 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600",
          )}
        />
      </div>

      {/* Icon */}
      <div className={cn(
        "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
        isCompleted ? "bg-green-100 dark:bg-green-900/40" : "bg-muted",
      )}>
        <TaskIcon className={cn(
          "h-3.5 w-3.5",
          isCompleted ? "text-green-600 dark:text-green-400" : "text-muted-foreground",
        )} />
      </div>

      {/* Name + Meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className={cn(
            "text-xs font-medium",
            isCompleted && "line-through text-muted-foreground",
          )}>
            {task.name}
          </p>
          {task.required && (
            <span className="text-[9px] font-bold text-destructive border border-destructive/30 px-1 py-0.5 rounded leading-none">
              REQ
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

      {/* Remark Button */}
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
          <TooltipContent className="text-xs">Add / view remark</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

// ─── Phase Section (inside modal) ────────────────────────────────────────────

const PhaseSection: React.FC<{
  phase: TaskPhase;
  tasks: InductionTask[];
  onToggle: (task: InductionTask) => void;
  onRemark: (task: InductionTask) => void;
  defaultOpen?: boolean;
}> = ({ phase, tasks, onToggle, onRemark, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  const completed = tasks.filter(t => t.status === "completed").length;
  const pct = tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100);

  const isBefore = phase === "before_joining";

  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors"
      >
        <div className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border bg-background",
        )}>
          {isBefore
            ? <Milestone className="h-3.5 w-3.5 text-primary" />
            : <CheckCheck className="h-3.5 w-3.5 text-primary" />
          }
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
          <span className={cn(
            "text-xs font-bold",
            pct === 100 ? "text-green-600 dark:text-green-400" : "text-foreground",
          )}>
            {pct}%
          </span>
        </div>
        {open
          ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        }
      </button>

      {open && (
        <div className="p-3 space-y-2 bg-card">
          {tasks.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={onToggle}
              onRemark={onRemark}
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
    <Dialog open={open} onOpenChange={() => { onClose(); }}>
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
              onChange={e => setRemark(e.target.value)}
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
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => onSave(remark)} disabled={isLoading}>
            {isLoading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Save Remark
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Employee Induction Modal ─────────────────────────────────────────────────

interface EmployeeInductionModalProps {
  employee: EmployeeInduction | null;
  open: boolean;
  onClose: () => void;
  onToggleTask: (empId: number, task: InductionTask) => void;
  onSaveRemark: (empId: number, taskId: string, remark: string) => void;
}

const EmployeeInductionModal: React.FC<EmployeeInductionModalProps> = ({
  employee, open, onClose, onToggleTask, onSaveRemark,
}) => {
  const [filterAssignee, setFilterAssignee] = useState<AssignedTo | "all">("all");
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all");
  const [remarkTask, setRemarkTask] = useState<InductionTask | null>(null);
  const [remarkOpen, setRemarkOpen] = useState(false);
  const [remarkLoading, setRemarkLoading] = useState(false);

  if (!employee) return null;

  const stats = computeInductionStats(employee.tasks);

  const filteredTasks = employee.tasks.filter(t => {
    const aOk = filterAssignee === "all" || t.assignedTo === filterAssignee;
    const sOk = filterStatus === "all" || t.status === filterStatus;
    return aOk && sOk;
  });

  const beforeTasks = filteredTasks.filter(t => t.phase === "before_joining");
  const afterTasks = filteredTasks.filter(t => t.phase === "after_joining");

  const handleRemarkSave = async (remark: string) => {
    if (!remarkTask) return;
    setRemarkLoading(true);
    await new Promise(r => setTimeout(r, 700));
    onSaveRemark(employee.id, remarkTask.id, remark);
    setRemarkLoading(false);
    setRemarkOpen(false);
    setRemarkTask(null);
  };

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
                    {employee.middleName ? `${employee.middleName} ` : ""}
                    {employee.lastName}
                  </DialogTitle>
                  <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                    {employee.employeeId}
                  </span>
                </div>
                <DialogDescription className="text-xs mt-0.5">
                  {employee.designation} · {employee.department} · DOJ {formatDate(employee.dateOfJoining)}
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
                { label: "Total", value: stats.total, cls: "text-foreground" },
                { label: "Completed", value: stats.completed, cls: "text-green-700 dark:text-green-400" },
                { label: "Pending", value: stats.pending, cls: "text-amber-700 dark:text-amber-400" },
                { label: "Required", value: `${stats.requiredCompleted}/${stats.requiredTotal}`, cls: "text-foreground" },
              ].map(({ label, value, cls }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className={cn("text-lg font-bold leading-none", cls)}>{value}</span>
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                </div>
              ))}
              <div className="ml-auto flex items-center gap-2">
                <Progress value={stats.pct} className="w-24 h-1.5" />
                <span className="text-xs font-bold">{stats.pct}%</span>
              </div>
            </div>

            {/* Assignee breakdown */}
            <div className="mt-2">
              <AssigneeProgress byAssignee={stats.byAssignee} />
            </div>
          </DialogHeader>

          {/* Filters */}
          <div className="px-5 py-2.5 border-b bg-muted/10 flex items-center gap-2 flex-wrap flex-shrink-0">
            <Select value={filterAssignee} onValueChange={v => setFilterAssignee(v as any)}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue placeholder="All Teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {(["HR", "IT", "Admin", "Manager"] as AssignedTo[]).map(a => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={v => setFilterStatus(v as any)}>
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
              <span className="text-destructive font-bold border border-destructive/30 px-1 rounded text-[9px]">REQ</span>
              <span>= Required task</span>
            </div>
          </div>

          {/* Task List */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
            {beforeTasks.length > 0 && (
              <PhaseSection
                phase="before_joining"
                tasks={beforeTasks}
                onToggle={task => onToggleTask(employee.id, task)}
                onRemark={task => { setRemarkTask(task); setRemarkOpen(true); }}
                defaultOpen={true}
              />
            )}
            {afterTasks.length > 0 && (
              <PhaseSection
                phase="after_joining"
                tasks={afterTasks}
                onToggle={task => onToggleTask(employee.id, task)}
                onRemark={task => { setRemarkTask(task); setRemarkOpen(true); }}
                defaultOpen={true}
              />
            )}
            {filteredTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <ListChecks className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium">No tasks match filters</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-3.5 border-t bg-muted/30 flex-shrink-0">
            <div className="flex items-center justify-between w-full gap-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                {stats.allRequiredDone ? (
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
                      {stats.requiredCompleted}/{stats.requiredTotal} required tasks done
                    </span>
                  </>
                )}
              </p>
              <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nested Remark Modal */}
      <RemarkModal
        task={remarkTask}
        open={remarkOpen}
        onClose={() => { setRemarkOpen(false); setRemarkTask(null); }}
        onSave={handleRemarkSave}
        isLoading={remarkLoading}
      />
    </>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ search: string; tab: EmployeeInductionTab }> = ({ search, tab }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
      <ListChecks className="h-7 w-7 text-muted-foreground/50" />
    </div>
    <p className="text-sm font-medium">
      {search ? "No matching employees" : `No ${tab === "all" ? "" : tab.replace("_", " ")} inductions`}
    </p>
    <p className="text-xs text-muted-foreground mt-1">
      {search
        ? `Try adjusting your search — "${search}"`
        : "Approved employees will appear here for induction tracking."}
    </p>
  </div>
);

// ─── Legend ───────────────────────────────────────────────────────────────────

const Legend: React.FC = () => (
  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
    {(["HR", "IT", "Admin", "Manager"] as AssignedTo[]).map(a => (
      <div key={a} className="flex items-center gap-1.5">
        <span className={cn(
          "inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold",
          ASSIGNEE_CONFIG[a].color,
          ASSIGNEE_CONFIG[a].bg,
        )}>
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
  const [employees, setEmployees] = useState<EmployeeInduction[]>(MOCK_EMPLOYEES);
  const [activeTab, setActiveTab] = useState<EmployeeInductionTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "progress" | "joined" | "pending">("pending");

  // Modals
  const [viewEmployee, setViewEmployee] = useState<EmployeeInduction | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  // Global stats
  const globalStats = useMemo(() => {
    const totalTasks = employees.reduce((a, e) => a + e.tasks.length, 0);
    const completedTasks = employees.reduce((a, e) => a + e.tasks.filter(t => t.status === "completed").length, 0);
    const pendingTasks = totalTasks - completedTasks;
    const fullyDone = employees.filter(e => computeInductionStats(e.tasks).pct === 100).length;
    const notStarted = employees.filter(e => computeInductionStats(e.tasks).completed === 0).length;
    const inProgress = employees.length - fullyDone - notStarted;
    return { totalTasks, completedTasks, pendingTasks, fullyDone, notStarted, inProgress };
  }, [employees]);

  // Tab counts
  const tabCounts = useMemo(() => ({
    all: employees.length,
    not_started: employees.filter(e => getInductionStatus(e) === "not_started").length,
    in_progress: employees.filter(e => getInductionStatus(e) === "in_progress").length,
    completed: employees.filter(e => getInductionStatus(e) === "completed").length,
  }), [employees]);

  // Filtered + sorted
  const filtered = useMemo(() => {
    let list = employees.filter(e => {
      const matchTab = activeTab === "all" || getInductionStatus(e) === activeTab;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
        e.employeeId.toLowerCase().includes(q) ||
        e.designation.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q);
      return matchTab && matchSearch;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === "name")
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      if (sortBy === "progress")
        return computeInductionStats(b.tasks).pct - computeInductionStats(a.tasks).pct;
      if (sortBy === "joined")
        return new Date(a.dateOfJoining).getTime() - new Date(b.dateOfJoining).getTime();
      if (sortBy === "pending")
        return computeInductionStats(b.tasks).pending - computeInductionStats(a.tasks).pending;
      return 0;
    });

    return list;
  }, [employees, activeTab, searchQuery, sortBy]);

  // Handlers
  const handleToggleTask = (empId: number, task: InductionTask) => {
    const update = (emp: EmployeeInduction): EmployeeInduction => ({
      ...emp,
      tasks: emp.tasks.map(t =>
        t.id === task.id
          ? {
              ...t,
              status: t.status === "completed" ? "pending" : "completed",
              completedAt: t.status === "pending" ? new Date().toISOString() : undefined,
              completedBy: t.status === "pending" ? "You" : undefined,
            }
          : t
      ),
    });

    setEmployees(prev => prev.map(e => e.id === empId ? update(e) : e));
    if (viewEmployee?.id === empId) {
      setViewEmployee(prev => prev ? update(prev) : prev);
    }
  };

  const handleSaveRemark = (empId: number, taskId: string, remark: string) => {
    const update = (emp: EmployeeInduction): EmployeeInduction => ({
      ...emp,
      tasks: emp.tasks.map(t => t.id === taskId ? { ...t, remarks: remark } : t),
    });

    setEmployees(prev => prev.map(e => e.id === empId ? update(e) : e));
    if (viewEmployee?.id === empId) {
      setViewEmployee(prev => prev ? update(prev) : prev);
    }
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
              Manage and track onboarding induction tasks for all new joiners
            </CardDescription>
          </div>
          {globalStats.pendingTasks > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span className="text-amber-800 dark:text-amber-300 font-medium">
                {globalStats.pendingTasks} task{globalStats.pendingTasks > 1 ? "s" : ""} pending
              </span>
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 min-h-0 flex flex-col gap-5">
          {/* ── Stats ── */}
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

          {/* ── Toolbar ── */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={v => setActiveTab(v as EmployeeInductionTab)}>
                <TabsList className="h-9">
                  {tabs.map(tab => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="gap-1.5 text-xs px-3"
                    >
                      <tab.icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className={cn(
                        "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                        activeTab === tab.value
                          ? "bg-background text-foreground"
                          : "bg-muted text-muted-foreground",
                      )}>
                        {tabCounts[tab.value]}
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <div className="flex items-center gap-2 ml-auto flex-wrap">
                {/* Sort */}
                <Select value={sortBy} onValueChange={v => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="h-9 w-40 text-xs">
                    <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Sort: Most pending</SelectItem>
                    <SelectItem value="progress">Sort: Progress</SelectItem>
                    <SelectItem value="name">Sort: Name</SelectItem>
                    <SelectItem value="joined">Sort: Joining date</SelectItem>
                  </SelectContent>
                </Select>

                {/* Search */}
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    className="pl-9 h-9 text-sm"
                    placeholder="Search name, ID, role…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Legend + count */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Legend />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
                {employees.length} employees
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
            {filtered.length === 0 ? (
              <EmptyState search={searchQuery} tab={activeTab} />
            ) : (
              <div className="space-y-2">
                {filtered.map(emp => (
                  <EmployeeRow
                    key={emp.id}
                    employee={emp}
                    onView={e => { setViewEmployee(e); setViewOpen(true); }}
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
          onClose={() => setViewOpen(false)}
          onToggleTask={handleToggleTask}
          onSaveRemark={handleSaveRemark}
        />
      </Card>
    </TooltipProvider>
  );
};

export default InductionDashboard;