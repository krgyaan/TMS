import React, { useState, useDeferredValue, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Plus,
  Search,
  Loader2,
  AlertCircle,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Check,
  X,
  UserCheck,
  UserX,
  CalendarDays,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Building2,
  TrendingUp,
  UserPlus,
  MessageSquare,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type OnboardingStatus = "pending" | "approved" | "rejected";

interface NewJoinee {
  id: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  personalEmail: string;
  phone: string;
  designation: string;
  department: string;
  workLocation: string;
  dateOfJoining: string;
  submittedAt: string;
  status: OnboardingStatus;
  gender: "Male" | "Female" | "Other";
  nationality: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_JOINEES: NewJoinee[] = [
  {
    id: 1,
    employeeId: "EMP24A1B2",
    firstName: "Priya",
    lastName: "Sharma",
    personalEmail: "priya.sharma@gmail.com",
    phone: "+91 98765 43210",
    designation: "Software Engineer",
    department: "Information Technology",
    workLocation: "Bengaluru HQ",
    dateOfJoining: "2024-08-01",
    submittedAt: "2024-07-22T10:30:00Z",
    status: "pending",
    gender: "Female",
    nationality: "Indian",
  },
  {
    id: 2,
    employeeId: "EMP24C3D4",
    firstName: "Rahul",
    lastName: "Mehta",
    personalEmail: "rahul.mehta@gmail.com",
    phone: "+91 87654 32109",
    designation: "Product Manager",
    department: "Operations",
    workLocation: "Mumbai Office",
    dateOfJoining: "2024-07-28",
    submittedAt: "2024-07-20T09:15:00Z",
    status: "approved",
    gender: "Male",
    nationality: "Indian",
    reviewedBy: "Anjali Kapoor",
    reviewedAt: "2024-07-21T14:00:00Z",
    reviewNote: "All documents verified. Welcome aboard!",
  },
  {
    id: 3,
    employeeId: "EMP24E5F6",
    firstName: "Sneha",
    lastName: "Iyer",
    personalEmail: "sneha.iyer@gmail.com",
    phone: "+91 76543 21098",
    designation: "UX Designer",
    department: "Design",
    workLocation: "Remote",
    dateOfJoining: "2024-08-05",
    submittedAt: "2024-07-23T11:45:00Z",
    status: "rejected",
    gender: "Female",
    nationality: "Indian",
    reviewedBy: "Vikram Singh",
    reviewedAt: "2024-07-24T10:30:00Z",
    reviewNote: "Incomplete documentation. Missing PAN card details.",
  },
  {
    id: 4,
    employeeId: "EMP24G7H8",
    firstName: "Arjun",
    lastName: "Nair",
    personalEmail: "arjun.nair@gmail.com",
    phone: "+91 65432 10987",
    designation: "Data Analyst",
    department: "Finance",
    workLocation: "Chennai Office",
    dateOfJoining: "2024-08-12",
    submittedAt: "2024-07-25T08:00:00Z",
    status: "pending",
    gender: "Male",
    nationality: "Indian",
  },
  {
    id: 5,
    employeeId: "EMP24I9J0",
    firstName: "Meera",
    lastName: "Pillai",
    middleName: "R",
    personalEmail: "meera.pillai@gmail.com",
    phone: "+91 54321 09876",
    designation: "HR Executive",
    department: "Human Resources",
    workLocation: "Bengaluru HQ",
    dateOfJoining: "2024-08-03",
    submittedAt: "2024-07-26T13:20:00Z",
    status: "pending",
    gender: "Female",
    nationality: "Indian",
  },
  {
    id: 6,
    employeeId: "EMP24K1L2",
    firstName: "Karan",
    lastName: "Patel",
    personalEmail: "karan.patel@gmail.com",
    phone: "+91 43210 98765",
    designation: "Sales Executive",
    department: "Sales",
    workLocation: "Delhi Office",
    dateOfJoining: "2024-07-29",
    submittedAt: "2024-07-18T16:00:00Z",
    status: "approved",
    gender: "Male",
    nationality: "Indian",
    reviewedBy: "Anjali Kapoor",
    reviewedAt: "2024-07-19T11:00:00Z",
    reviewNote: "Everything looks good. Fast-tracked due to urgent requirement.",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
};

const getInitials = (first: string, last: string) =>
  `${first[0]}${last[0]}`.toUpperCase();

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: OnboardingStatus }> = ({ status }) => {
  const map: Record<OnboardingStatus, { label: string; className: string; icon: React.ElementType }> = {
    pending: { label: "Pending", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800", icon: Clock },
    approved: { label: "Approved", className: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800", icon: CheckCircle2 },
    rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
  };
  const { label, className, icon: Icon } = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border", className)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
};

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  description?: string;
  highlight?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, description, highlight }) => (
  <div className={cn(
    "rounded-xl border p-4 flex items-center gap-4 transition-shadow hover:shadow-sm",
    highlight ? "bg-primary/5 border-primary/20" : "bg-card"
  )}>
    <div className={cn(
      "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
      highlight ? "bg-primary/10" : "bg-muted"
    )}>
      <Icon className={cn("h-5 w-5", highlight ? "text-primary" : "text-muted-foreground")} />
    </div>
    <div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {description && <p className="text-xs text-muted-foreground/70 mt-0.5">{description}</p>}
    </div>
  </div>
);

// ─── Icon Action ──────────────────────────────────────────────────────────────

const IconAction: React.FC<{
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  variant?: "default" | "success" | "danger";
  disabled?: boolean;
}> = ({ icon: Icon, label, onClick, variant = "default", disabled }) => {
  const variantClass = {
    default: "text-muted-foreground hover:bg-muted hover:text-foreground",
    success: "text-muted-foreground hover:bg-green-100 hover:text-green-700 dark:hover:bg-green-900/40 dark:hover:text-green-400",
    danger: "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
  }[variant];

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            disabled={disabled}
            className={cn(
              "inline-flex items-center justify-center h-7 w-7 rounded-md transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              variantClass,
              disabled && "opacity-40 cursor-not-allowed"
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs font-medium">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// ─── Joinee Row ───────────────────────────────────────────────────────────────

interface JoineeRowProps {
  joinee: NewJoinee;
  onView: (j: NewJoinee) => void;
  onApprove: (j: NewJoinee) => void;
  onReject: (j: NewJoinee) => void;
}

const JoineeRow: React.FC<JoineeRowProps> = ({ joinee, onView, onApprove, onReject }) => {
  const isPending = joinee.status === "pending";

  return (
    <div
      className="group flex items-center gap-4 px-4 py-3 rounded-lg border bg-card hover:bg-muted/40 transition-colors cursor-pointer"
      onClick={() => onView(joinee)}
    >
      {/* Avatar */}
      <Avatar className="h-9 w-9 flex-shrink-0">
        <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
          {getInitials(joinee.firstName, joinee.lastName)}
        </AvatarFallback>
      </Avatar>

      {/* Name + ID */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold leading-none">
            {joinee.firstName} {joinee.middleName ? `${joinee.middleName} ` : ""}{joinee.lastName}
          </p>
          <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {joinee.employeeId}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 truncate">{joinee.designation} · {joinee.department}</p>
      </div>

      {/* Location */}
      <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground min-w-0 w-36">
        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="truncate">{joinee.workLocation}</span>
      </div>

      {/* Joining Date */}
      <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground w-28">
        <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
        <span>{formatDate(joinee.dateOfJoining)}</span>
      </div>

      {/* Submitted */}
      <div className="hidden lg:block text-xs text-muted-foreground w-20 text-right">
        {timeAgo(joinee.submittedAt)}
      </div>

      {/* Status */}
      <div className="w-24 flex justify-end">
        <StatusBadge status={joinee.status} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <IconAction icon={Eye} label="View details" onClick={() => onView(joinee)} />
        {isPending && (
          <>
            <IconAction icon={Check} label="Approve" variant="success" onClick={() => onApprove(joinee)} />
            <IconAction icon={X} label="Reject" variant="danger" onClick={() => onReject(joinee)} />
          </>
        )}
      </div>
    </div>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ tab: OnboardingStatus | "all"; search: string }> = ({ tab, search }) => {
  const messages: Record<string, { icon: React.ElementType; title: string; sub: string }> = {
    all: { icon: Users, title: "No registrations yet", sub: "New joinee registrations will appear here." },
    pending: { icon: Clock, title: "No pending reviews", sub: "All registrations have been reviewed." },
    approved: { icon: UserCheck, title: "No approved joiners", sub: "Approved registrations will appear here." },
    rejected: { icon: UserX, title: "No rejected entries", sub: "Rejected registrations will appear here." },
  };
  const { icon: Icon, title, sub } = messages[tab] ?? messages.all;
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-muted-foreground/60" />
      </div>
      <p className="text-sm font-medium">{search ? "No results found" : title}</p>
      <p className="text-xs text-muted-foreground mt-1">
        {search ? `Try adjusting your search — "${search}"` : sub}
      </p>
    </div>
  );
};

// ─── View Modal ───────────────────────────────────────────────────────────────

const ViewModal: React.FC<{
  joinee: NewJoinee | null;
  open: boolean;
  onClose: () => void;
  onApprove: (j: NewJoinee) => void;
  onReject: (j: NewJoinee) => void;
}> = ({ joinee, open, onClose, onApprove, onReject }) => {
  if (!joinee) return null;
  const isPending = joinee.status === "pending";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
                {getInitials(joinee.firstName, joinee.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base">
                  {joinee.firstName} {joinee.middleName ? `${joinee.middleName} ` : ""}{joinee.lastName}
                </DialogTitle>
                <StatusBadge status={joinee.status} />
              </div>
              <DialogDescription className="mt-0.5 flex items-center gap-1.5 text-xs">
                <Hash className="h-3 w-3" />
                {joinee.employeeId} · Submitted {timeAgo(joinee.submittedAt)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Job Info */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Briefcase, label: "Designation", value: joinee.designation },
              { icon: Building2, label: "Department", value: joinee.department },
              { icon: MapPin, label: "Work Location", value: joinee.workLocation },
              { icon: CalendarDays, label: "Date of Joining", value: formatDate(joinee.dateOfJoining) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="p-3 rounded-lg bg-muted/50 border space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </div>
                <p className="text-sm font-semibold">{value}</p>
              </div>
            ))}
          </div>

          <Separator />

          {/* Contact Info */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span>{joinee.personalEmail}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span>{joinee.phone}</span>
              </div>
            </div>
          </div>

          {/* Review Info */}
          {joinee.reviewedBy && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Review</p>
                <div className="p-3 rounded-lg border bg-muted/40 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5" />
                      {joinee.reviewedBy}
                    </span>
                    <span>{joinee.reviewedAt ? formatDate(joinee.reviewedAt) : "—"}</span>
                  </div>
                  {joinee.reviewNote && (
                    <p className="text-sm text-foreground/80 italic">"{joinee.reviewNote}"</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {isPending && (
          <DialogFooter className="px-6 py-4 border-t bg-muted/30">
            <div className="flex items-center gap-2 w-full justify-end">
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => { onClose(); onReject(joinee); }}
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                Reject
              </Button>
              <Button
                onClick={() => { onClose(); onApprove(joinee); }}
                className="bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-600"
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Approve
              </Button>
            </div>
          </DialogFooter>
        )}
        {!isPending && (
          <DialogFooter className="px-6 py-4 border-t bg-muted/30">
            <Button variant="outline" onClick={onClose}>Close</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ─── Approve / Reject Confirm Modal ──────────────────────────────────────────

interface ActionModalProps {
  open: boolean;
  type: "approve" | "reject" | null;
  joinee: NewJoinee | null;
  onClose: () => void;
  onConfirm: (note: string) => void;
  isLoading?: boolean;
}

const ActionModal: React.FC<ActionModalProps> = ({
  open, type, joinee, onClose, onConfirm, isLoading,
}) => {
  const [note, setNote] = useState("");

  const isApprove = type === "approve";

  return (
    <Dialog open={open} onOpenChange={() => { onClose(); setNote(""); }}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center",
              isApprove
                ? "bg-green-100 dark:bg-green-900/40"
                : "bg-destructive/10"
            )}>
              {isApprove
                ? <CheckCircle2 className="h-5 w-5 text-green-700 dark:text-green-400" />
                : <XCircle className="h-5 w-5 text-destructive" />
              }
            </div>
            <div>
              <DialogTitle>
                {isApprove ? "Approve Onboarding" : "Reject Onboarding"}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-xs">
                {joinee?.firstName} {joinee?.lastName} · {joinee?.designation}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            {isApprove
              ? "This will mark the employee as onboarded. An approval note will be recorded."
              : "This will reject the registration. Please provide a reason so the applicant can make corrections."}
          </p>

          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              {isApprove ? "Approval Note" : "Rejection Reason"}
              {!isApprove && <span className="text-destructive ml-0.5">*</span>}
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                isApprove
                  ? "Optional — e.g. All documents verified."
                  : "e.g. Missing Aadhar card, incomplete address details."
              }
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <Button variant="outline" onClick={() => { onClose(); setNote(""); }} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            disabled={(!isApprove && !note.trim()) || isLoading}
            onClick={() => { onConfirm(note); setNote(""); }}
            className={cn(
              isApprove
                ? "bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-600"
                : "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            )}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isApprove ? "Confirm Approval" : "Confirm Rejection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────

type TabValue = "all" | OnboardingStatus;

const OnboardingDashboard: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [joinees, setJoinees] = useState<NewJoinee[]>(MOCK_JOINEES);
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);

  // Modals
  const [viewJoinee, setViewJoinee] = useState<NewJoinee | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [actionJoinee, setActionJoinee] = useState<NewJoinee | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Stats
  const stats = useMemo(() => ({
    total: joinees.length,
    pending: joinees.filter((j) => j.status === "pending").length,
    approved: joinees.filter((j) => j.status === "approved").length,
    rejected: joinees.filter((j) => j.status === "rejected").length,
  }), [joinees]);

  // Filtered list
  const filtered = useMemo(() => {
    return joinees.filter((j) => {
      const matchesTab = activeTab === "all" || j.status === activeTab;
      const q = deferredSearch.toLowerCase();
      const matchesSearch =
        !q ||
        `${j.firstName} ${j.lastName}`.toLowerCase().includes(q) ||
        j.employeeId.toLowerCase().includes(q) ||
        j.designation.toLowerCase().includes(q) ||
        j.department.toLowerCase().includes(q) ||
        j.personalEmail.toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [joinees, activeTab, deferredSearch]);

  // Handlers
  const openView = (j: NewJoinee) => { setViewJoinee(j); setViewOpen(true); };
  const openApprove = (j: NewJoinee) => { setActionJoinee(j); setActionType("approve"); };
  const openReject = (j: NewJoinee) => { setActionJoinee(j); setActionType("reject"); };

  const handleConfirmAction = async (note: string) => {
    if (!actionJoinee || !actionType) return;
    setActionLoading(true);

    // Simulate API delay
    await new Promise((r) => setTimeout(r, 1000));

    setJoinees((prev) =>
      prev.map((j) =>
        j.id === actionJoinee.id
          ? {
              ...j,
              status: actionType === "approve" ? "approved" : "rejected",
              reviewedBy: "You",
              reviewedAt: new Date().toISOString(),
              reviewNote: note || undefined,
            }
          : j
      )
    );

    setActionLoading(false);
    setActionType(null);
    setActionJoinee(null);
  };

  const tabs: { value: TabValue; label: string; icon: React.ElementType; count: number }[] = [
    { value: "all", label: "All", icon: Users, count: stats.total },
    { value: "pending", label: "Pending", icon: Clock, count: stats.pending },
    { value: "approved", label: "Approved", icon: UserCheck, count: stats.approved },
    { value: "rejected", label: "Rejected", icon: UserX, count: stats.rejected },
  ];

  return (
    <TooltipProvider>
      <Card className="flex flex-col h-full min-h-0">
        {/* ── Header ── */}
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4 flex-wrap">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Employee Onboarding
            </CardTitle>
            <CardDescription>
              Review and manage new employee registrations
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => navigate("/hrms/onboarding/new")}>
            <Plus className="h-4 w-4 mr-2" />
            New Registration
          </Button>
        </CardHeader>

        <CardContent className="flex-1 min-h-0 flex flex-col gap-5">
          {/* ── Stats Row ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Joiners" value={stats.total} icon={Users} />
            <StatCard label="Pending Review" value={stats.pending} icon={Clock} highlight={stats.pending > 0} />
            <StatCard label="Approved" value={stats.approved} icon={TrendingUp} />
            <StatCard label="Rejected" value={stats.rejected} icon={XCircle} />
          </div>

          {/* ── Toolbar ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
              <TabsList className="h-9">
                {tabs.map((tab) => (
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
                        : "bg-muted text-muted-foreground"
                    )}>
                      {tab.count}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9 h-9 text-sm"
                placeholder="Search name, ID, role…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* ── Count line ── */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-medium text-foreground">{filtered.length}</span>{" "}
              {filtered.length === 1 ? "record" : "records"}
              {activeTab !== "all" && ` · ${activeTab}`}
            </p>
            {stats.pending > 0 && activeTab !== "pending" && (
              <button
                onClick={() => setActiveTab("pending")}
                className="text-xs text-amber-600 dark:text-amber-400 font-medium hover:underline flex items-center gap-1"
              >
                <Clock className="h-3 w-3" />
                {stats.pending} awaiting review
              </button>
            )}
          </div>

          {/* ── List ── */}
          <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
            {filtered.length === 0 ? (
              <EmptyState tab={activeTab === "all" ? "all" : activeTab} search={deferredSearch} />
            ) : (
              <div className="space-y-2">
                {filtered.map((joinee) => (
                  <JoineeRow
                    key={joinee.id}
                    joinee={joinee}
                    onView={openView}
                    onApprove={openApprove}
                    onReject={openReject}
                  />
                ))}
              </div>
            )}
          </div>
        </CardContent>

        {/* ── View Modal ── */}
        <ViewModal
          joinee={viewJoinee}
          open={viewOpen}
          onClose={() => setViewOpen(false)}
          onApprove={openApprove}
          onReject={openReject}
        />

        {/* ── Action Modal ── */}
        <ActionModal
          open={!!actionType}
          type={actionType}
          joinee={actionJoinee}
          onClose={() => { setActionType(null); setActionJoinee(null); }}
          onConfirm={handleConfirmAction}
          isLoading={actionLoading}
        />
      </Card>
    </TooltipProvider>
  );
};

export default OnboardingDashboard;