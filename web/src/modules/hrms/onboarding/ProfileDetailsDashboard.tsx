import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  Loader2,
  AlertCircle,
  RefreshCw,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building2,
  GraduationCap,
  Briefcase,
  CreditCard,
  Heart,
  ChevronRight,
  Clock,
  Check,
  X,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfileList, useProfile, useUpdateProfile } from "./useOnboarding";
import type { ProfileListItem, FullProfile, UpdateProfileDto } from "../../../services/api/onboarding.service";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabValue = "pending" | "approved" | "rejected";

interface ProfileSummary {
  id: number;
  name: string;
  email: string;
  phone: string;
  submittedAt: string;
  hrStatus: "pending" | "approved" | "rejected";
  hrRemark?: string;
  employeeCompleted: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mapProfile = (item: ProfileListItem): ProfileSummary => ({
  id: item.id,
  name: item.name || `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim() || "Unknown",
  email: item.email,
  phone: item.phone || "—",
  submittedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
  hrStatus: (item.hrStatus as ProfileSummary["hrStatus"]) || "pending",
  hrRemark: item.hrRemark || undefined,
  employeeCompleted: item.employeeCompleted ?? false,
});

const getInitials = (name: string) => {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const timeAgo = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending: {
    label: "Pending Review",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    icon: Clock,
  },
  approved: {
    label: "Approved",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
    icon: XCircle,
  },
} as const;

// ─── Detail Section Component ─────────────────────────────────────────────────

interface DetailSectionProps {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  className?: string;
}

const DetailSection: React.FC<DetailSectionProps> = ({
  icon: Icon,
  title,
  children,
  className,
}) => (
  <div className={cn("space-y-3", className)}>
    <div className="flex items-center gap-2">
      <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
    </div>
    <div className="grid grid-cols-2 gap-x-6 gap-y-3">{children}</div>
  </div>
);

const Field: React.FC<{ label: string; value?: string | number | null; full?: boolean }> = ({
  label,
  value,
  full,
}) => (
  <div className={cn(full && "col-span-2")}>
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className="text-sm font-medium text-foreground mt-0.5 break-words">
      {value || <span className="text-muted-foreground/50 italic">Not provided</span>}
    </p>
  </div>
);

// ─── Profile Review Modal ─────────────────────────────────────────────────────

interface ReviewModalProps {
  profileId: number | null;
  open: boolean;
  onClose: () => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ profileId, open, onClose }) => {
  const { data: profile, isLoading, isError } = useProfile(profileId);
  const updateMutation = useUpdateProfile(profileId ?? 0);

  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionDone, setActionDone] = useState<"approved" | "rejected" | null>(null);

  const handleClose = () => {
    setShowReject(false);
    setRejectReason("");
    setActionDone(null);
    onClose();
  };

  const handleApprove = () => {
    updateMutation.mutate(
      { hrStatus: "approved" } as UpdateProfileDto,
      {
        onSuccess: () => setActionDone("approved"),
      }
    );
  };

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    updateMutation.mutate(
      { hrStatus: "rejected", hrRemark: rejectReason.trim() } as UpdateProfileDto,
      {
        onSuccess: () => setActionDone("rejected"),
      }
    );
  };

  const currentAddress = profile?.currentAddress as Record<string, string> | undefined;
  const permanentAddress = profile?.permanentAddress as Record<string, string> | undefined;
  const emergencyContact = profile?.emergencyContact as Record<string, string> | undefined;

  const formatAddress = (addr?: Record<string, string> | null) => {
    if (!addr) return null;
    return [addr.line1, addr.line2, addr.city, addr.state, addr.pincode, addr.country]
      .filter(Boolean)
      .join(", ");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/8 flex items-center justify-center">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Profile Review</h2>
                {profile && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {profile.firstName} {profile.lastName} · Submitted{" "}
                    {formatDate(profile.updatedAt as string)}
                  </p>
                )}
              </div>
            </div>
            {profile && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-medium border-0",
                  STATUS_CONFIG[
                    actionDone ?? ((profile.hrStatus as keyof typeof STATUS_CONFIG) || "pending")
                  ].badge
                )}
              >
                {STATUS_CONFIG[
                  actionDone ?? ((profile.hrStatus as keyof typeof STATUS_CONFIG) || "pending")
                ].label}
              </Badge>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading profile…</p>
            </div>
          ) : isError || !profile ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-xs text-muted-foreground">Failed to load profile data.</p>
            </div>
          ) : actionDone ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              {actionDone === "approved" ? (
                <>
                  <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold">Profile Approved</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {profile.firstName}'s details have been approved and saved.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold">Profile Rejected</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {profile.firstName} will be notified to re-submit.
                    </p>
                  </div>
                </>
              )}
              <Button variant="outline" size="sm" onClick={handleClose} className="mt-2">
                Close
              </Button>
            </div>
          ) : (
            <div className="px-6 py-5 space-y-6">
              {/* Personal Info */}
              <DetailSection icon={User} title="Personal Information">
                <Field label="First Name" value={profile.firstName} />
                <Field label="Middle Name" value={profile.middleName} />
                <Field label="Last Name" value={profile.lastName} />
                <Field label="Date of Birth" value={profile.dob ? formatDate(profile.dob) : null} />
                <Field label="Gender" value={profile.gender} />
                <Field label="Marital Status" value={profile.maritalStatus} />
                <Field label="Nationality" value={profile.nationality} />
                <Field label="Blood Group" value={profile.bloodGroup} />
              </DetailSection>

              <Separator />

              {/* Contact */}
              <DetailSection icon={Phone} title="Contact Details">
                <Field label="Work Email" value={profile.email} />
                <Field label="Personal Email" value={profile.personalEmail} />
                <Field label="Phone" value={profile.phone} />
                <Field label="LinkedIn" value={profile.linkedinProfile} full />
              </DetailSection>

              <Separator />

              {/* ID Documents */}
              <DetailSection icon={CreditCard} title="Identity Documents">
                <Field label="Aadhar Number" value={profile.aadharNumber} />
                <Field label="PAN Number" value={profile.panNumber} />
              </DetailSection>

              <Separator />

              {/* Current Address */}
              <DetailSection icon={MapPin} title="Current Address">
                <Field
                  label="Address"
                  value={formatAddress(currentAddress)}
                  full
                />
              </DetailSection>

              <Separator />

              {/* Permanent Address */}
              <DetailSection icon={Building2} title="Permanent Address">
                <Field
                  label="Address"
                  value={formatAddress(permanentAddress)}
                  full
                />
              </DetailSection>

              <Separator />

              {/* Emergency Contact */}
              <DetailSection icon={Heart} title="Emergency Contact">
                <Field label="Name" value={emergencyContact?.name} />
                <Field label="Relationship" value={emergencyContact?.relationship} />
                <Field label="Phone" value={emergencyContact?.phone} />
                <Field label="Email" value={emergencyContact?.email} />
              </DetailSection>

              {/* Rejection reason display if already rejected */}
              {profile.hrStatus === "rejected" && profile.hrRemark && (
                <>
                  <Separator />
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-red-700 dark:text-red-400">
                          Rejection Reason
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                          {profile.hrRemark}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer — only show actions for pending profiles that haven't been acted on */}
        {!isLoading && !isError && profile && !actionDone && profile.hrStatus === "pending" && (
          <div className="px-6 py-4 border-t flex-shrink-0 bg-muted/10">
            {showReject ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-foreground">
                    Reason for rejection <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    className="mt-1.5 text-sm resize-none"
                    placeholder="Describe what needs to be corrected…"
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowReject(false);
                      setRejectReason("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={!rejectReason.trim() || updateMutation.isPending}
                    onClick={handleReject}
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <X className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Confirm Rejection
                  </Button>
                </div>
                {updateMutation.isError && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {(updateMutation.error as Error)?.message || "Something went wrong."}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Review all details before approving.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowReject(true)}
                    className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50
                      dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/30"
                  >
                    <X className="h-3.5 w-3.5 mr-1.5" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    disabled={updateMutation.isPending}
                    onClick={handleApprove}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Approve
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ─── Profile Row ──────────────────────────────────────────────────────────────

interface ProfileRowProps {
  profile: ProfileSummary;
  onReview: (id: number) => void;
}

const ProfileRow: React.FC<ProfileRowProps> = ({ profile, onReview }) => {
  const cfg = STATUS_CONFIG[profile.hrStatus];
  const StatusIcon = cfg.icon;

  return (
    <button
      onClick={() => onReview(profile.id)}
      className={cn(
        "w-full text-left group flex items-center gap-4 px-4 py-3.5 rounded-xl",
        "border bg-card transition-all duration-150",
        "hover:shadow-sm hover:border-border/80 hover:-translate-y-px",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      {/* Avatar */}
      <Avatar className="h-9 w-9 flex-shrink-0">
        <AvatarFallback className="text-[11px] font-semibold bg-primary/8 text-primary">
          {getInitials(profile.name)}
        </AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{profile.name}</span>
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full",
              cfg.badge
            )}
          >
            <StatusIcon className="h-3 w-3" />
            {cfg.label}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 truncate">
            <Mail className="h-3 w-3 flex-shrink-0" />
            {profile.email}
          </span>
          <span className="hidden sm:flex items-center gap-1">
            <Clock className="h-3 w-3 flex-shrink-0" />
            {timeAgo(profile.submittedAt)}
          </span>
        </div>
        {/* Show rejection reason if rejected */}
        {profile.hrStatus === "rejected" && profile.hrRemark && (
          <p className="text-[11px] text-red-500 dark:text-red-400 mt-1.5 truncate">
            Reason: {profile.hrRemark}
          </p>
        )}
      </div>

      {/* Review button */}
      <div className="flex-shrink-0 flex items-center gap-2">
        <span className="text-xs text-muted-foreground hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity">
          {profile.hrStatus === "pending" ? "Review" : "View"}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
      </div>
    </button>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ tab: TabValue; hasSearch: boolean }> = ({ tab, hasSearch }) => {
  const messages = {
    pending: {
      title: "No pending reviews",
      desc: "All submitted profiles have been reviewed.",
    },
    approved: {
      title: "No approved profiles",
      desc: "Approved profiles will appear here.",
    },
    rejected: {
      title: "No rejected profiles",
      desc: "Rejected profiles will appear here.",
    },
  };

  const msg = messages[tab];

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center">
        {tab === "approved" ? (
          <CheckCircle2 className="h-5 w-5 text-muted-foreground/40" />
        ) : tab === "rejected" ? (
          <XCircle className="h-5 w-5 text-muted-foreground/40" />
        ) : (
          <Clock className="h-5 w-5 text-muted-foreground/40" />
        )}
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">{hasSearch ? "No results found" : msg.title}</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          {hasSearch ? "Try a different search term." : msg.desc}
        </p>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const ProfileDetailsDashboard: React.FC = () => {
  const { data: rawProfiles = [], isLoading, isError, refetch } = useProfileList();
  const profiles = useMemo(() => rawProfiles.map(mapProfile), [rawProfiles]);

  const [activeTab, setActiveTab] = useState<TabValue>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [reviewId, setReviewId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Counts
  const counts = useMemo(
    () => ({
      pending: profiles.filter((p) => p.hrStatus === "pending").length,
      approved: profiles.filter((p) => p.hrStatus === "approved").length,
      rejected: profiles.filter((p) => p.hrStatus === "rejected").length,
    }),
    [profiles]
  );

  // Filtered list
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return profiles
      .filter((p) => p.hrStatus === activeTab)
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q)
      )
      .sort(
        (a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
  }, [profiles, activeTab, searchQuery]);

  const openReview = (id: number) => {
    setReviewId(id);
    setModalOpen(true);
  };

  const tabs: { value: TabValue; label: string; icon: React.ElementType }[] = [
    { value: "pending", label: "Pending", icon: Clock },
    { value: "approved", label: "Approved", icon: CheckCircle2 },
    { value: "rejected", label: "Rejected", icon: XCircle },
  ];

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 h-full min-h-0 max-w-4xl mx-auto w-full">
        {/* Page header */}
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Profile Reviews</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review and approve employee-submitted profile details.
          </p>
        </div>

        {/* Tabs + Search */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Tab pills */}
            <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.value;
                const Icon = tab.icon;
                const count = counts[tab.value];
                return (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium",
                      "transition-all duration-150",
                      isActive
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-3.5 w-3.5",
                        isActive
                          ? tab.value === "approved"
                            ? "text-emerald-600"
                            : tab.value === "rejected"
                            ? "text-red-500"
                            : "text-amber-600"
                          : ""
                      )}
                    />
                    {tab.label}
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-semibold tabular-nums min-w-[20px] text-center",
                        isActive
                          ? tab.value === "pending"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                            : tab.value === "approved"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                            : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9 h-9 text-sm bg-card"
                placeholder="Search by name or email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Result count */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{filtered.length}</span>{" "}
              {activeTab} {filtered.length === 1 ? "profile" : "profiles"}
            </p>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading profiles…</p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-11 h-11 rounded-xl bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Failed to load profiles</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Please try again in a moment.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Retry
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState tab={activeTab} hasSearch={!!searchQuery} />
          ) : (
            <div className="space-y-2">
              {filtered.map((p) => (
                <ProfileRow key={p.id} profile={p} onReview={openReview} />
              ))}
            </div>
          )}
        </div>

        {/* Review Modal */}
        <ReviewModal
          profileId={reviewId}
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setReviewId(null);
          }}
        />
      </div>
    </TooltipProvider>
  );
};

export default ProfileDetailsDashboard;