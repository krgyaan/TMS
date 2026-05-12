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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  Search,
  Loader2,
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
  Shield,
  HeartHandshake,
  Globe,
  User,
  Calendar,
  GraduationCap,
  CreditCard,
  FileText,
  Download,
  ExternalLink,
  ChevronRight,
  Activity,
  ArrowUpRight,
  Filter,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useOnboardingDashboard,
  useUpdateOnboardingStatus,
  useProfile,
} from "./useOnboarding";
import { type OnboardingRequest } from "@/services/api/onboarding.service";

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
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

const getInitials = (name: string) => {
  if (!name) return "??";
  const parts = name.split(" ");
  if (parts.length >= 2)
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name[0].toUpperCase();
};

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

const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{
  status: OnboardingRequest["status"];
  size?: "sm" | "md";
}> = ({ status, size = "sm" }) => {
  const map: Record<
    OnboardingRequest["status"],
    { label: string; className: string; icon: React.ElementType }
  > = {
    pending: {
      label: "Pending Review",
      className:
        "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
      icon: Clock,
    },
    approved: {
      label: "Approved",
      className:
        "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
      icon: CheckCircle2,
    },
    rejected: {
      label: "Rejected",
      className:
        "bg-red-50 text-red-700 border-red-200/60 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
      icon: XCircle,
    },
  };
  const { label, className, icon: Icon } = map[status] || map.pending;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
        className
      )}
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {label}
    </span>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  trend?: string;
  accentClass: string;
  onClick?: () => void;
  active?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  trend,
  accentClass,
  onClick,
  active,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-200",
      "hover:shadow-md hover:-translate-y-0.5",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      active
        ? "border-primary/30 bg-primary/[0.03] shadow-sm ring-1 ring-primary/10"
        : "border-border/60 bg-card hover:border-border"
    )}
  >
    <div className="flex items-start justify-between">
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {trend && (
            <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="h-3 w-3" />
              {trend}
            </span>
          )}
        </div>
      </div>
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-xl",
          accentClass
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
    </div>
    {active && (
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
    )}
  </button>
);

// ─── Progress Bar ─────────────────────────────────────────────────────────────

const ProgressIndicator: React.FC<{ value: number; className?: string }> = ({
  value,
  className,
}) => (
  <div className={cn("flex items-center gap-2.5", className)}>
    <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          value >= 80
            ? "bg-emerald-500"
            : value >= 50
              ? "bg-amber-500"
              : "bg-orange-500"
        )}
        style={{ width: `${value}%` }}
      />
    </div>
    <span
      className={cn(
        "text-xs font-semibold tabular-nums",
        value >= 80
          ? "text-emerald-600 dark:text-emerald-400"
          : value >= 50
            ? "text-amber-600 dark:text-amber-400"
            : "text-orange-600 dark:text-orange-400"
      )}
    >
      {value}%
    </span>
  </div>
);

// ─── Joinee Card ──────────────────────────────────────────────────────────────

interface JoineeCardProps {
  joinee: OnboardingRequest;
  onView: (j: OnboardingRequest) => void;
  onApprove: (j: OnboardingRequest) => void;
  onReject: (j: OnboardingRequest) => void;
}

const JoineeCard: React.FC<JoineeCardProps> = ({
  joinee,
  onView,
  onApprove,
  onReject,
}) => {
  const isPending = joinee.status === "pending";

  return (
    <div
      className={cn(
        "group relative rounded-2xl border bg-card transition-all duration-200",
        "hover:shadow-lg hover:shadow-black/[0.03] hover:-translate-y-0.5 hover:border-border",
        "cursor-pointer"
      )}
      onClick={() => onView(joinee)}
    >
      <div className="p-5">
        {/* Top row: avatar, name, status */}
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12 rounded-xl flex-shrink-0 ring-1 ring-border/50">
            <AvatarFallback
              className={cn(
                "rounded-xl text-sm font-bold",
                getAvatarColor(joinee.name)
              )}
            >
              {getInitials(joinee.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold leading-tight truncate">
                  {joinee.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {joinee.email}
                </p>
              </div>
              <StatusBadge status={joinee.status} />
            </div>
          </div>
        </div>

        {/* Details grid */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{joinee.phone}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Hash className="h-3.5 w-3.5 flex-shrink-0" />
            <span>ID-{joinee.id}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground justify-end">
            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{timeAgo(joinee.createdAt)}</span>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-4">
          <ProgressIndicator value={joinee.progress} />
        </div>
      </div>

      {/* Action footer */}
      <div
        className={cn(
          "flex items-center justify-between border-t px-5 py-3",
          "bg-muted/20"
        )}
      >
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5"
          onClick={(e) => {
            e.stopPropagation();
            onView(joinee);
          }}
        >
          <Eye className="h-3.5 w-3.5" />
          View Details
        </Button>

        {isPending && (
          <div className="flex items-center gap-1.5">
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReject(joinee);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Reject
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onApprove(joinee);
                    }}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Approve
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState: React.FC<{
  tab: "all" | OnboardingRequest["status"];
  search: string;
}> = ({ tab, search }) => {
  const messages: Record<
    string,
    { icon: React.ElementType; title: string; sub: string }
  > = {
    all: {
      icon: Users,
      title: "No registrations yet",
      sub: "New joinee registrations will appear here once they register.",
    },
    pending: {
      icon: Clock,
      title: "All caught up!",
      sub: "There are no pending registrations to review right now.",
    },
    approved: {
      icon: UserCheck,
      title: "No approved joiners",
      sub: "Approved registrations will show up here.",
    },
    rejected: {
      icon: UserX,
      title: "No rejected entries",
      sub: "Rejected registrations will appear here.",
    },
  };
  const { icon: Icon, title, sub } = messages[tab] ?? messages.all;
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted/80 flex items-center justify-center mb-5">
        <Icon className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h3 className="text-base font-semibold">
        {search ? "No results found" : title}
      </h3>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
        {search ? `Try adjusting your search term — "${search}"` : sub}
      </p>
    </div>
  );
};

// ─── Data Item ────────────────────────────────────────────────────────────────

const DataItem: React.FC<{
  icon: any;
  label: string;
  value: React.ReactNode;
}> = ({ icon: Icon, label, value }) => (
  <div className="space-y-1.5">
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
    <div className="text-sm font-medium text-foreground pl-5">
      {value || (
        <span className="text-muted-foreground/40 font-normal italic">
          Not provided
        </span>
      )}
    </div>
  </div>
);

// ─── Section Header ───────────────────────────────────────────────────────────

const SectionHeader: React.FC<{
  icon: React.ElementType;
  title: string;
  count?: number;
}> = ({ icon: Icon, title, count }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2.5">
      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
    {count !== undefined && (
      <Badge
        variant="secondary"
        className="text-[10px] font-semibold rounded-full"
      >
        {count}
      </Badge>
    )}
  </div>
);

// ─── Progress Stage ───────────────────────────────────────────────────────────

const ProgressStage: React.FC<{ label: string; status: string }> = ({
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

// ─── View Modal ───────────────────────────────────────────────────────────────

const ViewModal: React.FC<{
  joinee: OnboardingRequest | null;
  open: boolean;
  onClose: () => void;
  onApprove: (j: OnboardingRequest) => void;
  onReject: (j: OnboardingRequest) => void;
}> = ({ joinee, open, onClose, onApprove, onReject }) => {
  const { data: profile, isLoading: profileLoading } = useProfile(
    joinee?.id || null
  );

  if (!joinee) return null;
  const isPending = joinee.status === "pending";

  const renderAddress = (addr: any) => {
    if (!addr || Object.keys(addr).length === 0) return null;
    const parts = [
      addr.line1,
      addr.line2,
      addr.city,
      addr.state,
      addr.country,
      addr.postalCode ? `PIN: ${addr.postalCode}` : "",
    ].filter(Boolean);
    return parts.join(", ");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl md:w-full p-0 gap-0 overflow-hidden rounded-2xl">
        {/* Header */}
        <DialogHeader className="px-8 py-6 border-b">
          <div className="flex items-center gap-5">
            <Avatar className="h-14 w-14 rounded-2xl ring-2 ring-border/50">
              <AvatarFallback
                className={cn(
                  "rounded-2xl text-lg font-bold",
                  getAvatarColor(joinee.name)
                )}
              >
                {getInitials(joinee.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <DialogTitle className="text-lg font-bold">
                  {joinee.name}
                </DialogTitle>
                <StatusBadge status={joinee.status} size="md" />
              </div>
              <DialogDescription className="mt-1 flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {joinee.email}
                </span>
                <span className="text-muted-foreground/30">·</span>
                <span className="flex items-center gap-1">
                  <Hash className="h-3.5 w-3.5" />
                  ID-{joinee.id}
                </span>
                <span className="text-muted-foreground/30">·</span>
                <span>{timeAgo(joinee.createdAt)}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="px-8 py-6 space-y-8 max-h-[68vh] overflow-y-auto">
          {/* Progress Pipeline */}
          <div className="space-y-4">
            <SectionHeader icon={Activity} title="Onboarding Progress" />
            <div className="p-6 rounded-2xl bg-muted/30 border border-dashed">
              <div className="flex items-start gap-1">
                <ProgressStage
                  label="Profile"
                  status={joinee.profileStatus}
                />
                <div className="flex-shrink-0 h-px w-4 bg-border mt-[18px]" />
                <ProgressStage
                  label="Documents"
                  status={joinee.documentStatus}
                />
                <div className="flex-shrink-0 h-px w-4 bg-border mt-[18px]" />
                <ProgressStage
                  label="Education"
                  status={joinee.educationStatus}
                />
                <div className="flex-shrink-0 h-px w-4 bg-border mt-[18px]" />
                <ProgressStage
                  label="Experience"
                  status={joinee.experienceStatus}
                />
                <div className="flex-shrink-0 h-px w-4 bg-border mt-[18px]" />
                <ProgressStage label="Bank" status={joinee.bankStatus} />
                <div className="flex-shrink-0 h-px w-4 bg-border mt-[18px]" />
                <ProgressStage
                  label="Induction"
                  status={joinee.inductionStatus}
                />
              </div>
              <div className="mt-5">
                <ProgressIndicator value={joinee.progress} />
              </div>
            </div>
          </div>

          {profileLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                Loading complete profile...
              </p>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-300">
              {/* Personal Information */}
              <div className="space-y-4">
                <SectionHeader icon={User} title="Personal Information" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-5 pl-1">
                  <DataItem
                    icon={User}
                    label="First Name"
                    value={profile?.firstName}
                  />
                  <DataItem
                    icon={User}
                    label="Middle Name"
                    value={profile?.middleName}
                  />
                  <DataItem
                    icon={User}
                    label="Last Name"
                    value={profile?.lastName}
                  />
                  <DataItem
                    icon={Calendar}
                    label="Date of Birth"
                    value={profile?.dob ? formatDate(profile.dob) : null}
                  />
                  <DataItem
                    icon={Users}
                    label="Gender"
                    value={profile?.gender}
                  />
                  <DataItem
                    icon={Users}
                    label="Marital Status"
                    value={profile?.maritalStatus}
                  />
                  <DataItem
                    icon={Globe}
                    label="Nationality"
                    value={profile?.nationality}
                  />
                  <DataItem
                    icon={HeartHandshake}
                    label="Blood Group"
                    value={profile?.bloodGroup}
                  />
                  <DataItem
                    icon={Mail}
                    label="Personal Email"
                    value={profile?.email}
                  />
                  <DataItem
                    icon={Phone}
                    label="Phone"
                    value={profile?.phone}
                  />
                  <DataItem
                    icon={Shield}
                    label="Aadhar Number"
                    value={profile?.aadharNumber}
                  />
                  <DataItem
                    icon={Shield}
                    label="PAN Number"
                    value={profile?.panNumber}
                  />
                </div>
                {profile?.linkedinProfile && (
                  <div className="pl-1">
                    <DataItem
                      icon={Globe}
                      label="LinkedIn Profile"
                      value={
                        <a
                          href={profile.linkedinProfile}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          View Profile{" "}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      }
                    />
                  </div>
                )}
              </div>

              <Separator />

              {/* Addresses */}
              <div className="space-y-4">
                <SectionHeader icon={MapPin} title="Address Details" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border bg-card space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                        Current Address
                      </p>
                    </div>
                    <p className="text-sm leading-relaxed pl-6">
                      {renderAddress(profile?.currentAddress) || (
                        <span className="text-muted-foreground/40 italic">
                          Not provided
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border bg-card space-y-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Permanent Address
                      </p>
                    </div>
                    <p className="text-sm leading-relaxed pl-6">
                      {renderAddress(profile?.permanentAddress) || (
                        <span className="text-muted-foreground/40 italic">
                          Same as current
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Emergency Contact */}
              <div className="space-y-4">
                <SectionHeader
                  icon={HeartHandshake}
                  title="Emergency Contact"
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-5 pl-1">
                  <DataItem
                    icon={User}
                    label="Contact Name"
                    value={profile?.emergencyContact?.name}
                  />
                  <DataItem
                    icon={Users}
                    label="Relationship"
                    value={profile?.emergencyContact?.relationship}
                  />
                  <DataItem
                    icon={Phone}
                    label="Primary Phone"
                    value={profile?.emergencyContact?.phone}
                  />
                  <DataItem
                    icon={Phone}
                    label="Alternate Phone"
                    value={profile?.emergencyContact?.altPhone}
                  />
                  <DataItem
                    icon={Mail}
                    label="Email"
                    value={profile?.emergencyContact?.email}
                  />
                </div>
              </div>

              <Separator />

              {/* Work Information */}
              <div className="space-y-4">
                <SectionHeader icon={Briefcase} title="Work Information" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-5 pl-1">
                  <DataItem
                    icon={Briefcase}
                    label="Designation"
                    value={profile?.designation}
                  />
                  <DataItem
                    icon={Building2}
                    label="Department"
                    value={profile?.department}
                  />
                  <DataItem
                    icon={User}
                    label="Reporting TL"
                    value={profile?.reportingTl}
                  />
                  <DataItem
                    icon={CalendarDays}
                    label="Date of Joining"
                    value={
                      profile?.dateOfJoining
                        ? formatDate(profile.dateOfJoining)
                        : null
                    }
                  />
                  <DataItem
                    icon={Briefcase}
                    label="Employee Type"
                    value={profile?.employeeType}
                  />
                  <DataItem
                    icon={MapPin}
                    label="Work Location"
                    value={profile?.workLocation}
                  />
                  <DataItem
                    icon={TrendingUp}
                    label="Salary Type"
                    value={profile?.salaryType}
                  />
                  <DataItem
                    icon={CalendarDays}
                    label="Probation End"
                    value={
                      profile?.probationEndDate
                        ? formatDate(profile.probationEndDate)
                        : null
                    }
                  />
                  <DataItem
                    icon={Clock}
                    label="Probation Period"
                    value={
                      profile?.probationMonths
                        ? `${profile.probationMonths} Months`
                        : null
                    }
                  />
                </div>
              </div>

              <Separator />

              {/* Bank Details */}
              <div className="space-y-4">
                <SectionHeader
                  icon={CreditCard}
                  title="Bank Details"
                  count={profile?.bankDetails?.length}
                />
                {profile?.bankDetails?.length > 0 ? (
                  <div className="space-y-3">
                    {profile.bankDetails.map((bank: any) => (
                      <div
                        key={bank.id}
                        className="p-4 rounded-xl border bg-card"
                      >
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <CreditCard className="h-4 w-4 text-primary" />
                            </div>
                            <span className="text-sm font-semibold">
                              {bank.bankName}
                            </span>
                            {bank.isPrimary && (
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
                                Primary
                              </Badge>
                            )}
                          </div>
                          <StatusBadge
                            status={bank.hrStatus || "pending"}
                          />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pl-[42px]">
                          <div>
                            <p className="text-[11px] text-muted-foreground">
                              Account Holder
                            </p>
                            <p className="text-sm font-medium mt-0.5">
                              {bank.accountHolderName}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] text-muted-foreground">
                              Account Number
                            </p>
                            <p className="text-sm font-medium mt-0.5">
                              {bank.accountNumber}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] text-muted-foreground">
                              IFSC Code
                            </p>
                            <p className="text-sm font-medium mt-0.5">
                              {bank.ifscCode}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] text-muted-foreground">
                              Branch
                            </p>
                            <p className="text-sm font-medium mt-0.5">
                              {bank.branchName || "—"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic pl-[42px]">
                    No bank details provided
                  </p>
                )}
              </div>

              <Separator />

              {/* Education */}
              <div className="space-y-4">
                <SectionHeader
                  icon={GraduationCap}
                  title="Education"
                  count={profile?.education?.length}
                />
                {profile?.education?.length > 0 ? (
                  <div className="space-y-3">
                    {profile.education.map((edu: any) => (
                      <div
                        key={edu.id}
                        className="p-4 rounded-xl border bg-card"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <GraduationCap className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold">
                                {edu.degree}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {edu.institution}
                              </p>
                            </div>
                          </div>
                          <StatusBadge
                            status={edu.hrStatus || "pending"}
                          />
                        </div>
                        <div className="flex items-center gap-6 mt-3 pl-[42px]">
                          <div>
                            <p className="text-[11px] text-muted-foreground">
                              Duration
                            </p>
                            <p className="text-xs font-medium mt-0.5">
                              {edu.startDate
                                ? formatDate(edu.startDate)
                                : "—"}{" "}
                              →{" "}
                              {edu.endDate
                                ? formatDate(edu.endDate)
                                : "Present"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] text-muted-foreground">
                              Grade / CGPA
                            </p>
                            <p className="text-xs font-medium mt-0.5">
                              {edu.grade || "—"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic pl-[42px]">
                    No education details provided
                  </p>
                )}
              </div>

              <Separator />

              {/* Experience */}
              <div className="space-y-4">
                <SectionHeader
                  icon={Briefcase}
                  title="Work Experience"
                  count={profile?.experience?.length}
                />
                {profile?.experience?.length > 0 ? (
                  <div className="space-y-3">
                    {profile.experience.map((exp: any) => (
                      <div
                        key={exp.id}
                        className="p-4 rounded-xl border bg-card"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Briefcase className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold">
                                {exp.designation}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {exp.companyName}
                              </p>
                            </div>
                          </div>
                          <StatusBadge
                            status={exp.hrStatus || "pending"}
                          />
                        </div>
                        <div className="mt-3 pl-[42px]">
                          <p className="text-[11px] text-muted-foreground">
                            Duration
                          </p>
                          <p className="text-xs font-medium mt-0.5">
                            {exp.fromDate
                              ? formatDate(exp.fromDate)
                              : "—"}{" "}
                            →{" "}
                            {exp.currentlyWorking
                              ? "Present"
                              : exp.toDate
                                ? formatDate(exp.toDate)
                                : "—"}
                          </p>
                          {exp.responsibilities && (
                            <div className="mt-3 pt-3 border-t border-dashed">
                              <p className="text-[11px] text-muted-foreground mb-1">
                                Responsibilities
                              </p>
                              <p className="text-xs leading-relaxed text-foreground/80 line-clamp-3">
                                {exp.responsibilities}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic pl-[42px]">
                    No work experience provided
                  </p>
                )}
              </div>

              <Separator />

              {/* Documents */}
              <div className="space-y-4">
                <SectionHeader
                  icon={FileText}
                  title="Documents"
                  count={profile?.documents?.length}
                />
                {profile?.documents?.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {profile.documents.map((doc: any) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:border-primary/20 transition-colors"
                      >
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {doc.docType}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[9px] uppercase h-5 px-1.5 font-semibold rounded-full",
                                doc.hrStatus === "approved"
                                  ? "border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-400 dark:bg-emerald-500/10"
                                  : doc.hrStatus === "rejected"
                                    ? "border-red-300 text-red-700 bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:bg-red-500/10"
                                    : "border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-500/30 dark:text-amber-400 dark:bg-amber-500/10"
                              )}
                            >
                              {doc.hrStatus || "pending"}
                            </Badge>
                            {doc.uploadedAt && (
                              <span className="text-[10px] text-muted-foreground">
                                {formatDate(doc.uploadedAt)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(doc.fileUrl, "_blank");
                                  }}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">
                                Open
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const link = document.createElement("a");
                                    link.href = doc.fileUrl;
                                    link.download =
                                      doc.fileName || "document";
                                    link.click();
                                  }}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">
                                Download
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic pl-[42px]">
                    No documents uploaded yet
                  </p>
                )}
              </div>

              {/* Review History */}
              {joinee.reviewedBy && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <SectionHeader icon={UserCheck} title="Review History" />
                    <div className="p-4 rounded-xl border border-dashed bg-muted/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8 rounded-lg">
                            <AvatarFallback className="rounded-lg text-[10px] font-semibold bg-muted">
                              {getInitials(joinee.reviewedBy)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {joinee.reviewedBy}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Reviewer
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {joinee.approvedAt
                            ? formatDate(joinee.approvedAt)
                            : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-8 py-5 border-t bg-muted/20">
          <div className="flex items-center gap-3 w-full justify-end">
            <Button variant="outline" onClick={onClose} className="rounded-xl">
              Close
            </Button>
            {isPending && (
              <>
                <Button
                  variant="outline"
                  className="rounded-xl border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                  onClick={() => {
                    onClose();
                    onReject(joinee);
                  }}
                >
                  <XCircle className="h-4 w-4 mr-2" /> Reject
                </Button>
                <Button
                  onClick={() => {
                    onClose();
                    onApprove(joinee);
                  }}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Action Confirm Modal ────────────────────────────────────────────────────

interface ActionModalProps {
  open: boolean;
  type: "approved" | "rejected" | null;
  joinee: OnboardingRequest | null;
  onClose: () => void;
  onConfirm: (note: string) => void;
  isLoading?: boolean;
}

const ActionModal: React.FC<ActionModalProps> = ({
  open,
  type,
  joinee,
  onClose,
  onConfirm,
  isLoading,
}) => {
  const [note, setNote] = useState("");
  const isApprove = type === "approved";

  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        onClose();
        setNote("");
      }}
    >
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-6 py-5 border-b">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "h-12 w-12 rounded-2xl flex items-center justify-center",
                isApprove
                  ? "bg-emerald-50 dark:bg-emerald-500/10"
                  : "bg-red-50 dark:bg-red-500/10"
              )}
            >
              {isApprove ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div>
              <DialogTitle className="text-base">
                {isApprove ? "Approve" : "Reject"} Registration
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-xs">
                {joinee?.name} · {joinee?.email}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isApprove
              ? "This will approve the registration and notify the joinee. You can add an optional note below."
              : "Please provide a reason for rejection. The joinee will be notified."}
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              {isApprove ? "Approval Note" : "Rejection Reason"}
              {!isApprove && (
                <span className="text-red-500 ml-0.5">*</span>
              )}
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                isApprove
                  ? "Optional — e.g. Everything looks good."
                  : "e.g. Incomplete documentation — missing ID proof."
              }
              rows={3}
              className="resize-none rounded-xl"
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/20">
          <Button
            variant="outline"
            onClick={() => {
              onClose();
              setNote("");
            }}
            disabled={isLoading}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            disabled={(!isApprove && !note.trim()) || isLoading}
            onClick={() => {
              onConfirm(note);
              setNote("");
            }}
            className={cn(
              "rounded-xl",
              isApprove
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-red-600 hover:bg-red-700 text-white"
            )}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirm {isApprove ? "Approval" : "Rejection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────

type TabValue = "all" | OnboardingRequest["status"];

const OnboardingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    data: joinees = [],
    isLoading,
    isError,
  } = useOnboardingDashboard();
  const updateStatus = useUpdateOnboardingStatus();

  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);

  const [viewJoinee, setViewJoinee] = useState<OnboardingRequest | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [actionType, setActionType] = useState<
    "approved" | "rejected" | null
  >(null);
  const [actionJoinee, setActionJoinee] =
    useState<OnboardingRequest | null>(null);

  const stats = useMemo(
    () => ({
      total: joinees.length,
      pending: joinees.filter((j) => j.status === "pending").length,
      approved: joinees.filter((j) => j.status === "approved").length,
      rejected: joinees.filter((j) => j.status === "rejected").length,
    }),
    [joinees]
  );

  const filtered = useMemo(() => {
    return joinees.filter((j) => {
      const matchesTab = activeTab === "all" || j.status === activeTab;
      const q = deferredSearch.toLowerCase();
      const matchesSearch =
        !q ||
        j.name.toLowerCase().includes(q) ||
        j.email.toLowerCase().includes(q) ||
        j.phone?.toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [joinees, activeTab, deferredSearch]);

  const openView = (j: OnboardingRequest) => {
    setViewJoinee(j);
    setViewOpen(true);
  };
  const openApprove = (j: OnboardingRequest) => {
    setActionJoinee(j);
    setActionType("approved");
  };
  const openReject = (j: OnboardingRequest) => {
    setActionJoinee(j);
    setActionType("rejected");
  };

  const handleConfirmAction = async (note: string) => {
    if (!actionJoinee || !actionType) return;
    updateStatus.mutate(
      {
        id: actionJoinee.id,
        dto: { status: actionType, note },
      },
      {
        onSuccess: () => {
          setActionType(null);
          setActionJoinee(null);
        },
      }
    );
  };

  // Loading state
  if (isLoading)
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-24">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">
          Loading onboarding data...
        </p>
      </div>
    );

  // Error state
  if (isError)
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-24">
        <div className="h-14 w-14 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
          <XCircle className="h-7 w-7 text-red-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold">Failed to load data</p>
          <p className="text-sm text-muted-foreground mt-1">
            Please try refreshing the page.
          </p>
        </div>
      </div>
    );

  const tabs: {
    value: TabValue;
    label: string;
    icon: React.ElementType;
    count: number;
  }[] = [
    { value: "all", label: "All", icon: Users, count: stats.total },
    { value: "pending", label: "Pending", icon: Clock, count: stats.pending },
    {
      value: "approved",
      label: "Approved",
      icon: UserCheck,
      count: stats.approved,
    },
    {
      value: "rejected",
      label: "Rejected",
      icon: UserX,
      count: stats.rejected,
    },
  ];

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full min-h-0 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Onboarding
                </h1>
                <p className="text-sm text-muted-foreground">
                  Review and manage new hire registrations
                </p>
              </div>
            </div>
          </div>
          <Button
            onClick={() => navigate("/hrms/onboarding/signup")}
            className="gap-2 rounded-xl shadow-sm h-10"
          >
            <Plus className="h-4 w-4" />
            Add New Hire
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Joiners"
            value={stats.total}
            icon={Users}
            accentClass="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
            onClick={() => setActiveTab("all")}
            active={activeTab === "all"}
          />
          <StatCard
            label="Pending Review"
            value={stats.pending}
            icon={Clock}
            accentClass="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
            onClick={() => setActiveTab("pending")}
            active={activeTab === "pending"}
            trend={stats.pending > 0 ? "Action needed" : undefined}
          />
          <StatCard
            label="Approved"
            value={stats.approved}
            icon={CheckCircle2}
            accentClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
            onClick={() => setActiveTab("approved")}
            active={activeTab === "approved"}
          />
          <StatCard
            label="Rejected"
            value={stats.rejected}
            icon={XCircle}
            accentClass="bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
            onClick={() => setActiveTab("rejected")}
            active={activeTab === "rejected"}
          />
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as TabValue)}
          >
            <TabsList className="h-10 bg-muted/50 p-1 rounded-xl">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="gap-2 text-xs font-medium px-4 rounded-lg data-[state=active]:shadow-sm"
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <Badge
                    variant="secondary"
                    className="ml-0.5 h-5 min-w-[20px] px-1.5 text-[10px] font-semibold rounded-full bg-background/80"
                  >
                    {tab.count}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-10 h-10 text-sm rounded-xl border-border/60 focus-visible:border-primary/40"
              placeholder="Search by name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between -mt-4">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-semibold text-foreground">
              {filtered.length}
            </span>{" "}
            {filtered.length === 1 ? "record" : "records"}
          </p>
        </div>

        {/* Content Grid */}
        <div className="flex-1 min-h-0 -mt-2">
          {filtered.length === 0 ? (
            <EmptyState tab={activeTab} search={deferredSearch} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
              {filtered.map((joinee) => (
                <JoineeCard
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

        {/* Modals */}
        <ViewModal
          joinee={viewJoinee}
          open={viewOpen}
          onClose={() => setViewOpen(false)}
          onApprove={openApprove}
          onReject={openReject}
        />

        <ActionModal
          open={!!actionType}
          type={actionType}
          joinee={actionJoinee}
          onClose={() => {
            setActionType(null);
            setActionJoinee(null);
          }}
          onConfirm={handleConfirmAction}
          isLoading={updateStatus.isPending}
        />
      </div>
    </TooltipProvider>
  );
};

export default OnboardingDashboard;