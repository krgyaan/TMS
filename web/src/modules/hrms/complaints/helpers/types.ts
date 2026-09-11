import {
  ShieldAlert,
  Scale,
  Wallet,
  Calendar,
  Wrench,
  Monitor,
  UserX,
  BookOpen,
  Shield,
  HelpCircle,
  Info,
  AlertCircle,
  AlertTriangle,
  Flame,
  Clock,
  RotateCcw,
  CheckCircle2,
  XCircle,
  type LucideIcon,
} from "lucide-react";

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface ComplaintTimelineEvent {
  date: string;
  action: string;
  by: string;
  note?: string;
}

/** Mirrors GET /hrms/complaints (HRMS complaints module) */
export interface Complaint {
  id: number;
  complaintCode: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  complaintType?: string;
  complaintAgainst?: string;
  complaintAgainstName?: string;
  complainantId?: number | null;
  complainantName?: string | null;
  createdBy?: number | null;
  createdByName?: string | null;
  description?: string;
  incidentDate?: string | null;
  incidentLocation?: string | null;
  witnesses?: string | null;
  previousAttempts?: string | null;
  expectedResolution?: string | null;
  updatedAt?: string | null;
  resolvedAt?: string | null;
  attachments?: string[];
  remarks?: string;
  assignedTo?: string;
  timeline?: ComplaintTimelineEvent[];
}

/** GET /hrms/complaints/lookups response */
export interface ComplaintLookups {
  users: { id: number; name: string }[];
  departments: { id: number; name: string }[];
}

/** POST /hrms/complaints body */
export interface CreateComplaintDto {
  complaintType: string;
  subject: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  complaintAgainst?: "person" | "department" | "system" | "policy" | "facility";
  complaintAgainstId?: number | null;
  incidentDate?: string;
  incidentLocation?: string;
  previousAttempts?: string;
  witnesses?: string;
  expectedResolution?: string;
  attachments?: string[];
}

/** PATCH /hrms/complaints/:id body */
export type UpdateComplaintDto = Partial<CreateComplaintDto>;

/** Internal complaint form state */
export interface ComplaintFormValues {
  complaintType: string;
  subject: string;
  complaintAgainst: string;
  complaintAgainstId: number | null;
  priority: string;
  incidentDate: string;
  incidentLocation: string;
  description: string;
  previousAttempts: string;
  witnesses: string;
  expectedResolution: string;
  attachments: string[];
}

// ─── CONFIG ──────────────────────────────────────────────────────────────────

export const COMPLAINT_TYPES: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "harassment", label: "Harassment / Workplace Misconduct", icon: ShieldAlert },
  { value: "discrimination", label: "Discrimination", icon: Scale },
  { value: "salary", label: "Salary / Payment Issue", icon: Wallet },
  { value: "leave", label: "Leave / Attendance Issue", icon: Calendar },
  { value: "facilities", label: "Facilities / Infrastructure", icon: Wrench },
  { value: "it", label: "IT / Technical Issue", icon: Monitor },
  { value: "behavior", label: "Manager / Colleague Behavior", icon: UserX },
  { value: "policy", label: "Policy Violation", icon: BookOpen },
  { value: "safety", label: "Safety / Security", icon: Shield },
  { value: "other", label: "Other", icon: HelpCircle },
];

export const COMPLAINT_AGAINST_OPTIONS: { value: string; label: string }[] = [
  { value: "person", label: "Person" },
  { value: "department", label: "Department" },
  { value: "system", label: "System" },
  { value: "policy", label: "Policy" },
  { value: "facility", label: "Facility" },
];

export const PRIORITY_CONFIG: Record<
  string,
  {
    label: string;
    icon: LucideIcon;
    className: string;
    dotColor: string;
    badgeBg: string;
  }
> = {
  low: {
    label: "Low",
    icon: Info,
    className: "bg-muted/50 text-muted-foreground border-border/30",
    dotColor: "bg-muted-foreground",
    badgeBg: "bg-slate-100 text-slate-600 border-slate-200",
  },
  medium: {
    label: "Medium",
    icon: AlertCircle,
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    dotColor: "bg-amber-500",
    badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
  },
  high: {
    label: "High",
    icon: AlertTriangle,
    className: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    dotColor: "bg-orange-500",
    badgeBg: "bg-orange-50 text-orange-700 border-orange-200",
  },
  critical: {
    label: "Critical",
    icon: Flame,
    className: "bg-destructive/10 text-destructive border-destructive/20",
    dotColor: "bg-destructive",
    badgeBg: "bg-red-50 text-red-700 border-red-200",
  },
};

export const STATUS_CONFIG: Record<
  string,
  { label: string; icon: LucideIcon; className: string; dotColor: string }
> = {
  open: {
    label: "Open",
    icon: Clock,
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    dotColor: "bg-blue-500",
  },
  in_progress: {
    label: "In Progress",
    icon: RotateCcw,
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    dotColor: "bg-amber-500",
  },
  resolved: {
    label: "Resolved",
    icon: CheckCircle2,
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    dotColor: "bg-emerald-500",
  },
  closed: {
    label: "Closed",
    icon: XCircle,
    className: "bg-muted/50 text-muted-foreground border-border/30",
    dotColor: "bg-muted-foreground",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
    dotColor: "bg-destructive",
  },
};

// ─── SMALL UTILS ─────────────────────────────────────────────────────────────

export const formatComplaintDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/** Convert an ISO date to a datetime-local input value (YYYY-MM-DDTHH:mm) */
export const toDateTimeInput = (dateStr: string | null | undefined) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};
