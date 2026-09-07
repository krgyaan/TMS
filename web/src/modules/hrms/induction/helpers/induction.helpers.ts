import React from "react";
import {
  FileSignature,
  FileText,
  MonitorCheck,
  Mail,
  Database,
  IdCard,
  BadgeCheck,
  ShieldCheck,
  BookOpen,
  Clock,
  Laptop,
  Building2,
  UserCog,
  CreditCard,
  Users2,
  UserPlus,
  Presentation,
  PartyPopper,
  Package,
  PhoneCall,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskStatus = "pending" | "completed";
export type TaskPhase = "before_joining" | "after_joining";
export type AssignedTo = "HR" | "IT" | "Admin" | "Manager";
export type EmployeeInductionTab =
  | "all"
  | "not_started"
  | "in_progress"
  | "completed";

export interface InductionTask {
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

export interface EmployeeInduction {
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
  profilePhoto?: string;
}

// ─── Raw API Interfaces ──────────────────────────────────────────────────────

export interface RawInductionTask {
  id?: number | string;
  name?: string;
  taskName?: string;
  phase?: string;
  taskType?: string;
  assignedTo?: string;
  required?: boolean;
  status?: string;
  completedAt?: string;
  completedBy?: string;
  remarks?: string;
}

export interface RawInductionEmployee {
  id: number;
  employeeId?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  email?: string;
  designation?: string;
  employeeType?: string;
  department?: string;
  departmentId?: number;
  dateOfJoining?: string;
  approvedAt?: string;
  tasks?: RawInductionTask[];
  inductionCoordinator?: string;
  profilePhoto?: string;
}

// ─── Default task definitions ─────────────────────────────────────────────────

export const DEFAULT_BEFORE_TASKS: Array<{
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

export const DEFAULT_AFTER_TASKS: Array<{
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

export const DEFAULT_TASKS: InductionTask[] = [
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

export const resolveTaskIcon = (taskName: string): React.ElementType => {
  const lower = taskName.toLowerCase();
  for (const { keywords, icon } of TASK_ICON_MAP) {
    if (keywords.some((k) => lower.includes(k))) return icon;
  }
  return FileText;
};

// ─── Normalizers ──────────────────────────────────────────────────────────────

export const normalizeTaskStatus = (status: string | null | undefined): TaskStatus => {
  if (!status) return "pending";
  const s = status.toLowerCase();
  if (s === "completed" || s === "done" || s === "verified") return "completed";
  return "pending";
};

export const normalizePhase = (phase: string | null | undefined): TaskPhase => {
  if (!phase) return "before_joining";
  const p = phase.toLowerCase();
  if (p === "after_joining" || p === "after") return "after_joining";
  return "before_joining";
};

export const normalizeAssignedTo = (assignedTo: string | null | undefined): AssignedTo => {
  if (!assignedTo) return "HR";
  const a = assignedTo.toUpperCase();
  if (a === "IT") return "IT";
  if (a === "ADMIN") return "Admin";
  if (a === "MANAGER") return "Manager";
  return "HR";
};

// ─── Mappers ──────────────────────────────────────────────────────────────────

export const mapApiTask = (raw: RawInductionTask): InductionTask => {
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

export const mapApiEmployee = (raw: RawInductionEmployee): EmployeeInduction => {
  const nameParts = (raw.name ?? "").split(" ");
  return {
    id: raw.id,
    employeeId: raw.employeeId ?? `EMP-${String(raw.id).padStart(4, "0")}`,
    firstName: raw.firstName ?? (nameParts.length > 0 ? nameParts[0] : "—"),
    lastName: raw.lastName ?? (nameParts.length > 1 ? nameParts[nameParts.length - 1] : ""),
    middleName: raw.middleName ?? undefined,
    email: raw.email ?? "",
    designation: raw.designation ?? raw.employeeType ?? "—",
    department: String(raw.department ?? raw.departmentId ?? "—"),
    dateOfJoining: raw.dateOfJoining ?? raw.approvedAt ?? new Date().toISOString(),
    approvedAt: raw.approvedAt ?? new Date().toISOString(),
    tasks: Array.isArray(raw.tasks) ? raw.tasks.map(mapApiTask) : [],
    inductionCoordinator: raw.inductionCoordinator ?? undefined,
    profilePhoto: raw.profilePhoto ?? undefined,
  };
};

// ─── Utils ────────────────────────────────────────────────────────────────────

export const getInitials = (first: string, last: string) =>
  `${first?.[0] ?? "?"}${last?.[0] ?? "?"}`.toUpperCase();

const avatarColors = [
  "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
];

export const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

export const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export const formatDateTime = (d: string) =>
  new Date(d).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const computeInductionStats = (tasks: InductionTask[]) => {
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

export const getInductionStatus = (emp: EmployeeInduction): EmployeeInductionTab => {
  const tasks = emp.tasks.length > 0 ? emp.tasks : DEFAULT_TASKS;
  const { pct, completed } = computeInductionStats(tasks);
  if (completed === 0) return "not_started";
  if (pct === 100) return "completed";
  return "in_progress";
};
