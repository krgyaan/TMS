import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  Edit3,
  UserCheck,
  Briefcase,
  CreditCard,
  Building2,
  User,
  MapPin,
  GraduationCap,
  Phone,
  Shield,
  ChevronRight,
  Timer,
  TrendingUp,
  Filter,
  ArrowUpDown,
  CalendarDays,
  Mail,
  Loader2,
  CircleDashed,
  CheckCheck,
  XCircle,
  Info,
  Hash,
  Landmark,
  HeartHandshake,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionStatus = "not_started" | "in_progress" | "completed";
type ProfileTab = "all" | "pending" | "in_progress" | "completed";
type FilterDept = "all" | string;

interface SectionProgress {
  status: SectionStatus;
  completedFields: number;
  totalFields: number;
}

interface HRSections {
  employment: SectionProgress;
  compensation: SectionProgress;
  bankDetails: SectionProgress;
}

interface EmployeeSections {
  personalInfo: SectionProgress;
  currentAddress: SectionProgress;
  permanentAddress: SectionProgress;
  emergencyContact: SectionProgress;
  education: SectionProgress;
  experience: SectionProgress;
}

interface EmployeeProfile {
  id: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  dateOfJoining: string;
  approvedAt: string;
  hrSections: HRSections;
  employeeSections: EmployeeSections;
  hrTimer: number; // minutes elapsed since approval
  lastUpdated: string;
  hrFilledBy?: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_PROFILES: EmployeeProfile[] = [
  {
    id: 1,
    employeeId: "EMP24A1B2",
    firstName: "Priya",
    lastName: "Sharma",
    email: "priya.sharma@gmail.com",
    phone: "+91 98765 43210",
    designation: "Software Engineer",
    department: "Information Technology",
    dateOfJoining: "2024-08-01",
    approvedAt: "2024-07-22T10:30:00Z",
    lastUpdated: "2024-07-23T14:20:00Z",
    hrFilledBy: "Anjali Kapoor",
    hrTimer: 120,
    hrSections: {
      employment: { status: "completed", completedFields: 9, totalFields: 9 },
      compensation: { status: "completed", completedFields: 7, totalFields: 7 },
      bankDetails: { status: "completed", completedFields: 6, totalFields: 6 },
    },
    employeeSections: {
      personalInfo: { status: "completed", completedFields: 14, totalFields: 14 },
      currentAddress: { status: "completed", completedFields: 6, totalFields: 6 },
      permanentAddress: { status: "completed", completedFields: 6, totalFields: 6 },
      emergencyContact: { status: "completed", completedFields: 5, totalFields: 5 },
      education: { status: "in_progress", completedFields: 3, totalFields: 6 },
      experience: { status: "not_started", completedFields: 0, totalFields: 6 },
    },
  },
  {
    id: 2,
    employeeId: "EMP24C3D4",
    firstName: "Rahul",
    lastName: "Mehta",
    email: "rahul.mehta@gmail.com",
    phone: "+91 87654 32109",
    designation: "Product Manager",
    department: "Operations",
    dateOfJoining: "2024-07-28",
    approvedAt: "2024-07-20T09:00:00Z",
    lastUpdated: "2024-07-20T11:00:00Z",
    hrFilledBy: "Anjali Kapoor",
    hrTimer: 45,
    hrSections: {
      employment: { status: "completed", completedFields: 9, totalFields: 9 },
      compensation: { status: "in_progress", completedFields: 4, totalFields: 7 },
      bankDetails: { status: "not_started", completedFields: 0, totalFields: 6 },
    },
    employeeSections: {
      personalInfo: { status: "completed", completedFields: 14, totalFields: 14 },
      currentAddress: { status: "completed", completedFields: 6, totalFields: 6 },
      permanentAddress: { status: "not_started", completedFields: 0, totalFields: 6 },
      emergencyContact: { status: "not_started", completedFields: 0, totalFields: 5 },
      education: { status: "not_started", completedFields: 0, totalFields: 6 },
      experience: { status: "not_started", completedFields: 0, totalFields: 6 },
    },
  },
  {
    id: 3,
    employeeId: "EMP24E5F6",
    firstName: "Sneha",
    lastName: "Iyer",
    email: "sneha.iyer@gmail.com",
    phone: "+91 76543 21098",
    designation: "UX Designer",
    department: "Design",
    dateOfJoining: "2024-08-05",
    approvedAt: "2024-07-23T11:00:00Z",
    lastUpdated: "2024-07-23T11:05:00Z",
    hrTimer: 480,
    hrSections: {
      employment: { status: "not_started", completedFields: 0, totalFields: 9 },
      compensation: { status: "not_started", completedFields: 0, totalFields: 7 },
      bankDetails: { status: "not_started", completedFields: 0, totalFields: 6 },
    },
    employeeSections: {
      personalInfo: { status: "not_started", completedFields: 0, totalFields: 14 },
      currentAddress: { status: "not_started", completedFields: 0, totalFields: 6 },
      permanentAddress: { status: "not_started", completedFields: 0, totalFields: 6 },
      emergencyContact: { status: "not_started", completedFields: 0, totalFields: 5 },
      education: { status: "not_started", completedFields: 0, totalFields: 6 },
      experience: { status: "not_started", completedFields: 0, totalFields: 6 },
    },
  },
  {
    id: 4,
    employeeId: "EMP24G7H8",
    firstName: "Arjun",
    lastName: "Nair",
    email: "arjun.nair@gmail.com",
    phone: "+91 65432 10987",
    designation: "Data Analyst",
    department: "Finance",
    dateOfJoining: "2024-08-12",
    approvedAt: "2024-07-25T08:00:00Z",
    lastUpdated: "2024-07-26T16:30:00Z",
    hrFilledBy: "Vikram Singh",
    hrTimer: 95,
    hrSections: {
      employment: { status: "completed", completedFields: 9, totalFields: 9 },
      compensation: { status: "completed", completedFields: 7, totalFields: 7 },
      bankDetails: { status: "in_progress", completedFields: 3, totalFields: 6 },
    },
    employeeSections: {
      personalInfo: { status: "in_progress", completedFields: 8, totalFields: 14 },
      currentAddress: { status: "in_progress", completedFields: 4, totalFields: 6 },
      permanentAddress: { status: "not_started", completedFields: 0, totalFields: 6 },
      emergencyContact: { status: "completed", completedFields: 5, totalFields: 5 },
      education: { status: "completed", completedFields: 6, totalFields: 6 },
      experience: { status: "in_progress", completedFields: 3, totalFields: 6 },
    },
  },
  {
    id: 5,
    employeeId: "EMP24I9J0",
    firstName: "Meera",
    lastName: "Pillai",
    middleName: "R",
    email: "meera.pillai@gmail.com",
    phone: "+91 54321 09876",
    designation: "HR Executive",
    department: "Human Resources",
    dateOfJoining: "2024-08-03",
    approvedAt: "2024-07-26T13:00:00Z",
    lastUpdated: "2024-07-27T10:00:00Z",
    hrFilledBy: "Anjali Kapoor",
    hrTimer: 60,
    hrSections: {
      employment: { status: "completed", completedFields: 9, totalFields: 9 },
      compensation: { status: "completed", completedFields: 7, totalFields: 7 },
      bankDetails: { status: "completed", completedFields: 6, totalFields: 6 },
    },
    employeeSections: {
      personalInfo: { status: "completed", completedFields: 14, totalFields: 14 },
      currentAddress: { status: "completed", completedFields: 6, totalFields: 6 },
      permanentAddress: { status: "completed", completedFields: 6, totalFields: 6 },
      emergencyContact: { status: "completed", completedFields: 5, totalFields: 5 },
      education: { status: "completed", completedFields: 6, totalFields: 6 },
      experience: { status: "completed", completedFields: 6, totalFields: 6 },
    },
  },
  {
    id: 6,
    employeeId: "EMP24K1L2",
    firstName: "Karan",
    lastName: "Patel",
    email: "karan.patel@gmail.com",
    phone: "+91 43210 98765",
    designation: "Sales Executive",
    department: "Sales",
    dateOfJoining: "2024-07-29",
    approvedAt: "2024-07-18T16:00:00Z",
    lastUpdated: "2024-07-19T09:00:00Z",
    hrTimer: 320,
    hrSections: {
      employment: { status: "in_progress", completedFields: 5, totalFields: 9 },
      compensation: { status: "not_started", completedFields: 0, totalFields: 7 },
      bankDetails: { status: "not_started", completedFields: 0, totalFields: 6 },
    },
    employeeSections: {
      personalInfo: { status: "completed", completedFields: 14, totalFields: 14 },
      currentAddress: { status: "completed", completedFields: 6, totalFields: 6 },
      permanentAddress: { status: "in_progress", completedFields: 3, totalFields: 6 },
      emergencyContact: { status: "not_started", completedFields: 0, totalFields: 5 },
      education: { status: "not_started", completedFields: 0, totalFields: 6 },
      experience: { status: "not_started", completedFields: 0, totalFields: 6 },
    },
  },
];

const DEPARTMENTS = [
  "Information Technology", "Operations", "Design",
  "Finance", "Human Resources", "Sales", "Marketing", "Engineering",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getInitials = (first: string, last: string) =>
  `${first[0]}${last[0]}`.toUpperCase();

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });

const formatTimer = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const computeOverallProgress = (profile: EmployeeProfile): number => {
  const allSections = [
    ...Object.values(profile.hrSections),
    ...Object.values(profile.employeeSections),
  ];
  const total = allSections.reduce((a, s) => a + s.totalFields, 0);
  const completed = allSections.reduce((a, s) => a + s.completedFields, 0);
  return total === 0 ? 0 : Math.round((completed / total) * 100);
};

const computeHRProgress = (hr: HRSections): number => {
  const sections = Object.values(hr);
  const total = sections.reduce((a, s) => a + s.totalFields, 0);
  const done = sections.reduce((a, s) => a + s.completedFields, 0);
  return total === 0 ? 0 : Math.round((done / total) * 100);
};

const computeEmployeeProgress = (emp: EmployeeSections): number => {
  const sections = Object.values(emp);
  const total = sections.reduce((a, s) => a + s.totalFields, 0);
  const done = sections.reduce((a, s) => a + s.completedFields, 0);
  return total === 0 ? 0 : Math.round((done / total) * 100);
};

const getProfileStatus = (profile: EmployeeProfile): ProfileTab => {
  const pct = computeOverallProgress(profile);
  if (pct === 100) return "completed";
  if (pct === 0) return "pending";
  return "in_progress";
};

const isTimerAlert = (minutes: number) => minutes > 240; // > 4 hours

// ─── Status Config ────────────────────────────────────────────────────────────

const SECTION_STATUS_CONFIG: Record<SectionStatus, {
  label: string;
  icon: React.ElementType;
  className: string;
  dot: string;
}> = {
  not_started: {
    label: "Not Started",
    icon: CircleDashed,
    className: "text-muted-foreground",
    dot: "bg-muted-foreground/40",
  },
  in_progress: {
    label: "In Progress",
    icon: Clock,
    className: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className: "text-green-600 dark:text-green-400",
    dot: "bg-green-500",
  },
};

// ─── Section Config ───────────────────────────────────────────────────────────

const HR_SECTION_CONFIG: { key: keyof HRSections; label: string; icon: React.ElementType }[] = [
  { key: "employment", label: "Employment", icon: Briefcase },
  { key: "compensation", label: "Compensation", icon: CreditCard },
  { key: "bankDetails", label: "Bank Details", icon: Landmark },
];

const EMP_SECTION_CONFIG: { key: keyof EmployeeSections; label: string; icon: React.ElementType }[] = [
  { key: "personalInfo", label: "Personal Info", icon: User },
  { key: "currentAddress", label: "Current Address", icon: MapPin },
  { key: "permanentAddress", label: "Permanent Address", icon: Building2 },
  { key: "emergencyContact", label: "Emergency Contact", icon: HeartHandshake },
  { key: "education", label: "Education", icon: GraduationCap },
  { key: "experience", label: "Experience", icon: BookOpen },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionPill: React.FC<{ status: SectionStatus; label: string; icon: React.ElementType }> = ({
  status, label, icon: Icon,
}) => {
  const cfg = SECTION_STATUS_CONFIG[status];
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex items-center justify-center w-7 h-7 rounded-full border transition-colors",
            status === "completed" && "bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800",
            status === "in_progress" && "bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800",
            status === "not_started" && "bg-muted border-border",
          )}>
            <Icon className={cn("h-3.5 w-3.5", cfg.className)} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <span className="font-medium">{label}</span>
          <span className="text-muted-foreground ml-1">· {cfg.label}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const StatCard: React.FC<{
  label: string; value: number; sub?: string;
  icon: React.ElementType; highlight?: boolean;
}> = ({ label, value, sub, icon: Icon, highlight }) => (
  <div className={cn(
    "rounded-xl border p-4 flex items-center gap-3 transition-shadow hover:shadow-sm",
    highlight ? "bg-primary/5 border-primary/20" : "bg-card",
  )}>
    <div className={cn(
      "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
      highlight ? "bg-primary/10" : "bg-muted",
    )}>
      <Icon className={cn("h-5 w-5", highlight ? "text-primary" : "text-muted-foreground")} />
    </div>
    <div className="min-w-0">
      <p className="text-2xl font-bold tracking-tight leading-none">{value}</p>
      <p className="text-xs font-medium text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/70">{sub}</p>}
    </div>
  </div>
);

const ProgressRing: React.FC<{ pct: number; size?: number; stroke?: number; className?: string }> = ({
  pct, size = 36, stroke = 3, className,
}) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct === 100 ? "stroke-green-500" : pct > 0 ? "stroke-amber-500" : "stroke-muted-foreground/30";
  return (
    <svg width={size} height={size} className={cn("rotate-[-90deg]", className)}>
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke}
        className="stroke-muted fill-none" />
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        className={cn("fill-none transition-all duration-700", color)} />
    </svg>
  );
};

// ─── Profile Row ──────────────────────────────────────────────────────────────

interface ProfileRowProps {
  profile: EmployeeProfile;
  onView: (p: EmployeeProfile) => void;
  onEdit: (p: EmployeeProfile) => void;
}

const ProfileRow: React.FC<ProfileRowProps> = ({ profile, onView, onEdit }) => {
  const overall = computeOverallProgress(profile);
  const hrPct = computeHRProgress(profile.hrSections);
  const empPct = computeEmployeeProgress(profile.employeeSections);
  const timerAlert = isTimerAlert(profile.hrTimer);

  return (
    <div
      className="group flex flex-col sm:flex-row sm:items-center gap-4 px-4 py-4 rounded-xl border bg-card hover:bg-muted/30 transition-all cursor-pointer"
      onClick={() => onView(profile)}
    >
      {/* Avatar + Name */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="relative flex-shrink-0">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
              {getInitials(profile.firstName, profile.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className={cn(
            "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
            overall === 100 ? "bg-green-500" : overall > 0 ? "bg-amber-500" : "bg-muted-foreground/40",
          )} />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold leading-none">
              {profile.firstName} {profile.middleName ? `${profile.middleName} ` : ""}{profile.lastName}
            </p>
            <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
              {profile.employeeId}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {profile.designation} · {profile.department}
          </p>
        </div>
      </div>

      {/* HR Section Icons */}
      <div className="flex flex-col gap-1 min-w-0 w-40">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">HR Fills</p>
        <div className="flex items-center gap-1.5">
          {HR_SECTION_CONFIG.map(({ key, label, icon }) => (
            <SectionPill key={key} status={profile.hrSections[key].status} label={label} icon={icon} />
          ))}
          <span className="text-xs text-muted-foreground ml-1">{hrPct}%</span>
        </div>
      </div>

      {/* Employee Section Icons */}
      <div className="flex flex-col gap-1 min-w-0 w-52">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Employee Fills</p>
        <div className="flex items-center gap-1.5">
          {EMP_SECTION_CONFIG.map(({ key, label, icon }) => (
            <SectionPill key={key} status={profile.employeeSections[key].status} label={label} icon={icon} />
          ))}
          <span className="text-xs text-muted-foreground ml-1">{empPct}%</span>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="flex items-center gap-3 w-28">
        <div className="relative flex items-center justify-center">
          <ProgressRing pct={overall} size={40} stroke={3} />
          <span className="absolute text-[10px] font-bold">{overall}%</span>
        </div>
        <div>
          <p className="text-xs font-semibold leading-none">{overall}%</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {overall === 100 ? "Complete" : overall === 0 ? "Not started" : "In progress"}
          </p>
        </div>
      </div>

      {/* HR Timer */}
      <div className={cn(
        "flex items-center gap-1.5 text-xs w-20",
        timerAlert ? "text-destructive" : "text-muted-foreground",
      )}>
        <Timer className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="font-medium">{formatTimer(profile.hrTimer)}</span>
        {timerAlert && (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger>
                <AlertCircle className="h-3.5 w-3.5" />
              </TooltipTrigger>
              <TooltipContent className="text-xs">HR filling overdue (&gt;4h)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        onClick={(e) => e.stopPropagation()}>
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => { e.stopPropagation(); onView(profile); }}
                className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Eye className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">View details</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(profile); }}
                className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Edit3 className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">Fill HR details</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────

const DetailModal: React.FC<{
  profile: EmployeeProfile | null;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
}> = ({ profile, open, onClose, onEdit }) => {
  if (!profile) return null;

  const overall = computeOverallProgress(profile);
  const hrPct = computeHRProgress(profile.hrSections);
  const empPct = computeEmployeeProgress(profile.employeeSections);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden max-h-[90vh]">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-muted/30 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
                  {getInitials(profile.firstName, profile.lastName)}
                </AvatarFallback>
              </Avatar>
              <div className={cn(
                "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background",
                overall === 100 ? "bg-green-500" : overall > 0 ? "bg-amber-500" : "bg-muted-foreground/40",
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base">
                  {profile.firstName} {profile.middleName ? `${profile.middleName} ` : ""}{profile.lastName}
                </DialogTitle>
                <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                  {profile.employeeId}
                </span>
              </div>
              <DialogDescription className="mt-0.5 text-xs">
                {profile.designation} · {profile.department} · Joining {formatDate(profile.dateOfJoining)}
              </DialogDescription>
            </div>
            {/* Overall ring */}
            <div className="relative flex items-center justify-center flex-shrink-0">
              <ProgressRing pct={overall} size={52} stroke={4} />
              <span className="absolute text-xs font-bold">{overall}%</span>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto">
          <div className="px-6 py-5 space-y-6">
            {/* Contact Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { icon: Mail, value: profile.email },
                { icon: Phone, value: profile.phone },
                { icon: CalendarDays, value: `DOJ: ${formatDate(profile.dateOfJoining)}` },
              ].map(({ icon: Icon, value }) => (
                <div key={value} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{value}</span>
                </div>
              ))}
            </div>

            <Separator />

            {/* HR Timer Banner */}
            <div className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg border text-sm",
              isTimerAlert(profile.hrTimer)
                ? "bg-destructive/5 border-destructive/20"
                : "bg-muted/50 border-border",
            )}>
              <Timer className={cn(
                "h-4 w-4 flex-shrink-0",
                isTimerAlert(profile.hrTimer) ? "text-destructive" : "text-muted-foreground",
              )} />
              <div className="flex-1">
                <span className="font-medium">HR Filling Time: </span>
                <span className={isTimerAlert(profile.hrTimer) ? "text-destructive font-semibold" : ""}>
                  {formatTimer(profile.hrTimer)}
                </span>
                {profile.hrFilledBy && (
                  <span className="text-muted-foreground ml-2">· Assigned to {profile.hrFilledBy}</span>
                )}
              </div>
              {isTimerAlert(profile.hrTimer) && (
                <Badge variant="destructive" className="text-[10px]">Overdue</Badge>
              )}
            </div>

            {/* HR Sections */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">HR Filled Sections</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={hrPct} className="w-20 h-1.5" />
                  <span className="text-xs font-medium text-muted-foreground">{hrPct}%</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {HR_SECTION_CONFIG.map(({ key, label, icon: Icon }) => {
                  const sec = profile.hrSections[key];
                  const cfg = SECTION_STATUS_CONFIG[sec.status];
                  const SIcon = cfg.icon;
                  return (
                    <div key={key} className={cn(
                      "p-3 rounded-lg border space-y-2",
                      sec.status === "completed" && "bg-green-50/50 border-green-200 dark:bg-green-900/10 dark:border-green-900",
                      sec.status === "in_progress" && "bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-900",
                      sec.status === "not_started" && "bg-muted/40 border-border",
                    )}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          {label}
                        </div>
                        <SIcon className={cn("h-3.5 w-3.5", cfg.className)} />
                      </div>
                      <div className="space-y-1">
                        <Progress
                          value={sec.totalFields > 0 ? (sec.completedFields / sec.totalFields) * 100 : 0}
                          className="h-1"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          {sec.completedFields}/{sec.totalFields} fields
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Employee Sections */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Employee Filled Sections</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={empPct} className="w-20 h-1.5" />
                  <span className="text-xs font-medium text-muted-foreground">{empPct}%</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {EMP_SECTION_CONFIG.map(({ key, label, icon: Icon }) => {
                  const sec = profile.employeeSections[key];
                  const cfg = SECTION_STATUS_CONFIG[sec.status];
                  const SIcon = cfg.icon;
                  return (
                    <div key={key} className={cn(
                      "p-3 rounded-lg border flex items-center gap-3",
                      sec.status === "completed" && "bg-green-50/50 border-green-200 dark:bg-green-900/10 dark:border-green-900",
                      sec.status === "in_progress" && "bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-900",
                      sec.status === "not_started" && "bg-muted/40 border-border",
                    )}>
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                        sec.status === "completed" && "bg-green-100 dark:bg-green-900/40",
                        sec.status === "in_progress" && "bg-amber-100 dark:bg-amber-900/40",
                        sec.status === "not_started" && "bg-muted",
                      )}>
                        <Icon className={cn("h-4 w-4", cfg.className)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium">{label}</p>
                          <span className={cn("text-[10px] font-medium", cfg.className)}>
                            {cfg.label}
                          </span>
                        </div>
                        <div className="mt-1 space-y-0.5">
                          <Progress
                            value={sec.totalFields > 0 ? (sec.completedFields / sec.totalFields) * 100 : 0}
                            className="h-1"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            {sec.completedFields}/{sec.totalFields} fields
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t bg-muted/30 flex-shrink-0">
          <div className="flex items-center justify-between w-full gap-3">
            <p className="text-xs text-muted-foreground">
              Last updated {formatDate(profile.lastUpdated)}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
              <Button size="sm" onClick={onEdit}>
                <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                Fill HR Details
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── HR Fill Modal (simplified form shell) ────────────────────────────────────

const HRFillModal: React.FC<{
  profile: EmployeeProfile | null;
  open: boolean;
  onClose: () => void;
}> = ({ profile, open, onClose }) => {
  const [activeSection, setActiveSection] = useState<keyof HRSections>("employment");

  if (!profile) return null;

  const sectionPcts = {
    employment: profile.hrSections.employment,
    compensation: profile.hrSections.compensation,
    bankDetails: profile.hrSections.bankDetails,
  };

  // Employment field placeholders
  const EMPLOYMENT_FIELDS = [
    { label: "Employee Type", type: "select", options: ["Full-time", "Part-time", "Contract", "Intern", "Temporary"], required: true },
    { label: "Designation / Job Title", type: "text", placeholder: "e.g. Software Engineer", required: true },
    { label: "Department", type: "select", options: DEPARTMENTS, required: true },
    { label: "Reporting Manager", type: "text", placeholder: "Manager name", required: true },
    { label: "Work Location / Branch", type: "text", placeholder: "e.g. Bengaluru HQ", required: true },
    { label: "Employee Status", type: "select", options: ["Active", "Inactive"], required: true },
    { label: "Date of Joining", type: "date", required: true },
    { label: "Probation Period (months)", type: "number", placeholder: "e.g. 3" },
    { label: "Probation End Date", type: "date" },
  ];

  const COMPENSATION_FIELDS = [
    { label: "Salary Type", type: "select", options: ["Monthly", "Hourly", "Annual"], required: true },
    { label: "Basic Salary / CTC", type: "number", placeholder: "e.g. 50000", required: true },
    { label: "HRA", type: "number", placeholder: "e.g. 10000" },
    { label: "Allowances", type: "number", placeholder: "e.g. 5000" },
    { label: "Bonus", type: "number", placeholder: "e.g. 5000" },
    { label: "PF Applicable", type: "select", options: ["Yes", "No"] },
    { label: "ESIC Applicable", type: "select", options: ["Yes", "No"] },
  ];

  const BANK_FIELDS = [
    { label: "Bank Name", type: "text", placeholder: "e.g. State Bank of India", required: true },
    { label: "Account Holder Name", type: "text", placeholder: "As per bank records", required: true },
    { label: "Account Number", type: "text", placeholder: "XXXXXXXXXXXX", required: true },
    { label: "IFSC Code", type: "text", placeholder: "e.g. SBIN0001234", required: true },
    { label: "Branch Name", type: "text", placeholder: "e.g. Main Branch" },
    { label: "Branch Address", type: "text", placeholder: "Branch location" },
    { label: "UPI ID", type: "text", placeholder: "e.g. name@upi" },
  ];

  const SECTION_FIELDS: Record<keyof HRSections, typeof EMPLOYMENT_FIELDS> = {
    employment: EMPLOYMENT_FIELDS,
    compensation: COMPENSATION_FIELDS,
    bankDetails: BANK_FIELDS,
  };

  const currentFields = SECTION_FIELDS[activeSection];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden max-h-[90vh]">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-muted/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base">Fill HR Details</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {profile.firstName} {profile.lastName} · {profile.employeeId}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden min-h-0">
          {/* Section Sidebar */}
          <div className="sm:w-44 border-b sm:border-b-0 sm:border-r bg-muted/20 flex sm:flex-col flex-row overflow-x-auto sm:overflow-y-auto flex-shrink-0">
            {HR_SECTION_CONFIG.map(({ key, label, icon: Icon }) => {
              const sec = sectionPcts[key];
              const isActive = activeSection === key;
              const cfg = SECTION_STATUS_CONFIG[sec.status];
              const SIcon = cfg.icon;
              return (
                <button
                  key={key}
                  onClick={() => setActiveSection(key)}
                  className={cn(
                    "flex items-center gap-2.5 px-4 py-3 text-left transition-colors text-sm w-full flex-shrink-0",
                    "sm:border-b last:border-b-0 border-r sm:border-r-0 last:border-r-0",
                    isActive
                      ? "bg-background border-r-2 border-primary text-foreground font-medium sm:border-r-2 sm:border-b-0"
                      : "text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0 hidden sm:block">
                    <p className="text-xs font-medium truncate">{label}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <SIcon className={cn("h-3 w-3", cfg.className)} />
                      <span className="text-[10px] text-muted-foreground">
                        {sec.completedFields}/{sec.totalFields}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Form Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">
                {HR_SECTION_CONFIG.find(s => s.key === activeSection)?.label}
              </h4>
              <div className="flex items-center gap-2">
                <Progress
                  value={sectionPcts[activeSection].totalFields > 0
                    ? (sectionPcts[activeSection].completedFields / sectionPcts[activeSection].totalFields) * 100
                    : 0}
                  className="w-20 h-1.5"
                />
                <span className="text-xs text-muted-foreground">
                  {sectionPcts[activeSection].completedFields}/{sectionPcts[activeSection].totalFields}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentFields.map((field) => (
                <div key={field.label} className={cn(
                  "space-y-1.5",
                  field.type === "text" && field.label.includes("Address") && "sm:col-span-2",
                )}>
                  <label className="text-xs font-medium text-foreground flex items-center gap-1">
                    {field.label}
                    {field.required && <span className="text-destructive">*</span>}
                  </label>
                  {field.type === "select" ? (
                    <Select>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((o) => (
                          <SelectItem key={o} value={o.toLowerCase().replace(/\s+/g, "_")}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={field.type}
                      placeholder={"placeholder" in field ? field.placeholder : undefined}
                      className="h-9 text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t bg-muted/30 flex-shrink-0">
          <div className="flex items-center justify-between w-full gap-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" />
              Changes are saved per section
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
              <Button size="sm">
                <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
                Save Section
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ search: string; tab: ProfileTab }> = ({ search, tab }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
      <Users className="h-7 w-7 text-muted-foreground/50" />
    </div>
    <p className="text-sm font-medium">
      {search ? "No matching profiles" : `No ${tab === "all" ? "" : tab} profiles`}
    </p>
    <p className="text-xs text-muted-foreground mt-1">
      {search
        ? `Try adjusting your search — "${search}"`
        : "Approved employees will appear here for profile completion."}
    </p>
  </div>
);

// ─── Legend ───────────────────────────────────────────────────────────────────

const Legend: React.FC = () => (
  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
    {Object.entries(SECTION_STATUS_CONFIG).map(([key, cfg]) => {
      const Icon = cfg.icon;
      return (
        <div key={key} className="flex items-center gap-1.5">
          <Icon className={cn("h-3.5 w-3.5", cfg.className)} />
          <span>{cfg.label}</span>
        </div>
      );
    })}
    <div className="flex items-center gap-1.5">
      <Timer className="h-3.5 w-3.5 text-destructive" />
      <span>HR timer &gt;4h = overdue</span>
    </div>
  </div>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const ProfileDetailsDashboard: React.FC = () => {
  const [profiles] = useState<EmployeeProfile[]>(MOCK_PROFILES);
  const [activeTab, setActiveTab] = useState<ProfileTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState<FilterDept>("all");
  const [sortBy, setSortBy] = useState<"name" | "progress" | "timer" | "joined">("timer");

  // Modals
  const [viewProfile, setViewProfile] = useState<EmployeeProfile | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<EmployeeProfile | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // Stats
  const stats = useMemo(() => {
    const total = profiles.length;
    const pending = profiles.filter(p => getProfileStatus(p) === "pending").length;
    const inProgress = profiles.filter(p => getProfileStatus(p) === "in_progress").length;
    const completed = profiles.filter(p => getProfileStatus(p) === "completed").length;
    const overdue = profiles.filter(p => isTimerAlert(p.hrTimer)).length;
    return { total, pending, inProgress, completed, overdue };
  }, [profiles]);

  // Filtered + sorted
  const filtered = useMemo(() => {
    let list = profiles.filter(p => {
      const matchTab = activeTab === "all" || getProfileStatus(p) === activeTab;
      const q = searchQuery.toLowerCase();
      const matchSearch = !q ||
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
        p.employeeId.toLowerCase().includes(q) ||
        p.designation.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q);
      const matchDept = deptFilter === "all" || p.department === deptFilter;
      return matchTab && matchSearch && matchDept;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === "name") return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      if (sortBy === "progress") return computeOverallProgress(b) - computeOverallProgress(a);
      if (sortBy === "timer") return b.hrTimer - a.hrTimer;
      if (sortBy === "joined") return new Date(a.dateOfJoining).getTime() - new Date(b.dateOfJoining).getTime();
      return 0;
    });

    return list;
  }, [profiles, activeTab, searchQuery, deptFilter, sortBy]);

  const tabs: { value: ProfileTab; label: string; icon: React.ElementType; count: number }[] = [
    { value: "all", label: "All", icon: Users, count: stats.total },
    { value: "pending", label: "Not Started", icon: CircleDashed, count: stats.pending },
    { value: "in_progress", label: "In Progress", icon: Clock, count: stats.inProgress },
    { value: "completed", label: "Completed", icon: CheckCheck, count: stats.completed },
  ];

  const openView = (p: EmployeeProfile) => { setViewProfile(p); setViewOpen(true); };
  const openEdit = (p: EmployeeProfile) => { setEditProfile(p); setEditOpen(true); };

  return (
    <TooltipProvider>
      <Card className="flex flex-col h-full min-h-0">
        {/* ── Header ── */}
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4 flex-wrap">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCheck className="h-5 w-5 text-primary" />
              Profile Details
            </CardTitle>
            <CardDescription>
              Track HR and employee profile completion for all approved joiners
            </CardDescription>
          </div>
          {stats.overdue > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/5 border border-destructive/20 text-xs">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
              <span className="text-destructive font-medium">
                {stats.overdue} profile{stats.overdue > 1 ? "s" : ""} overdue HR filling
              </span>
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 min-h-0 flex flex-col gap-5">
          {/* ── Stats ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Profiles" value={stats.total} icon={Users} />
            <StatCard label="Not Started" value={stats.pending} icon={CircleDashed} highlight={stats.pending > 0} />
            <StatCard label="In Progress" value={stats.inProgress} icon={TrendingUp} />
            <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} />
          </div>

          {/* ── Toolbar ── */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={v => setActiveTab(v as ProfileTab)}>
                <TabsList className="h-9">
                  {tabs.map(tab => (
                    <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 text-xs px-3">
                      <tab.icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className={cn(
                        "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                        activeTab === tab.value ? "bg-background text-foreground" : "bg-muted text-muted-foreground",
                      )}>
                        {tab.count}
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <div className="flex items-center gap-2 ml-auto flex-wrap">
                {/* Dept Filter */}
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger className="h-9 w-44 text-xs">
                    <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {DEPARTMENTS.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Sort */}
                <Select value={sortBy} onValueChange={v => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="h-9 w-36 text-xs">
                    <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="timer">Sort: HR Timer</SelectItem>
                    <SelectItem value="progress">Sort: Progress</SelectItem>
                    <SelectItem value="name">Sort: Name</SelectItem>
                    <SelectItem value="joined">Sort: Joining</SelectItem>
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
                <span className="font-medium text-foreground">{filtered.length}</span> of {stats.total} profiles
              </p>
            </div>
          </div>

          {/* ── Column Headers ── */}
          <div className="hidden sm:flex items-center gap-4 px-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            <div className="flex-1">Employee</div>
            <div className="w-40">HR Sections</div>
            <div className="w-52">Employee Sections</div>
            <div className="w-28">Overall</div>
            <div className="w-20">HR Timer</div>
            <div className="w-16" />
          </div>

          {/* ── List ── */}
          <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
            {filtered.length === 0 ? (
              <EmptyState search={searchQuery} tab={activeTab} />
            ) : (
              <div className="space-y-2">
                {filtered.map(p => (
                  <ProfileRow
                    key={p.id}
                    profile={p}
                    onView={openView}
                    onEdit={openEdit}
                  />
                ))}
              </div>
            )}
          </div>
        </CardContent>

        {/* ── Modals ── */}
        <DetailModal
          profile={viewProfile}
          open={viewOpen}
          onClose={() => setViewOpen(false)}
          onEdit={() => { setViewOpen(false); if (viewProfile) openEdit(viewProfile); }}
        />
        <HRFillModal
          profile={editProfile}
          open={editOpen}
          onClose={() => setEditOpen(false)}
        />
      </Card>
    </TooltipProvider>
  );
};

export default ProfileDetailsDashboard;