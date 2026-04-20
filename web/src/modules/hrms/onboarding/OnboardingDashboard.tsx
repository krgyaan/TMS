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
  Shield,
  HeartHandshake,
  Globe,
  User,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOnboardingDashboard, useUpdateOnboardingStatus, useProfile } from "./useOnboarding";
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
  return `${days} days ago`;
};

const getInitials = (name: string) => {
  if (!name) return "??";
  const parts = name.split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name[0].toUpperCase();
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: OnboardingRequest["status"] }> = ({ status }) => {
  const map: Record<OnboardingRequest["status"], { label: string; className: string; icon: React.ElementType }> = {
    pending: { label: "Pending", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800", icon: Clock },
    approved: { label: "Approved", className: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800", icon: CheckCircle2 },
    rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
  };
  const { label, className, icon: Icon } = map[status] || map.pending;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-widest", className)}>
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
  joinee: OnboardingRequest;
  onView: (j: OnboardingRequest) => void;
  onApprove: (j: OnboardingRequest) => void;
  onReject: (j: OnboardingRequest) => void;
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
          {getInitials(joinee.name)}
        </AvatarFallback>
      </Avatar>

      {/* Name + ID */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold leading-none">
            {joinee.name}
          </p>
          <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
             #{joinee.id}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 truncate">{joinee.email}</p>
      </div>

      {/* Contact */}
      <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground min-w-0 w-36">
        <Phone className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="truncate">{joinee.phone}</span>
      </div>

      {/* Progress */}
      <div className="hidden lg:flex flex-col gap-1 w-28">
         <div className="flex justify-between text-[10px] font-bold uppercase text-muted-foreground/60">
            <span>Progress</span>
            <span>{joinee.progress}%</span>
         </div>
         <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${joinee.progress}%` }} />
         </div>
      </div>

      {/* Submitted */}
      <div className="hidden lg:block text-xs text-muted-foreground w-24 text-right">
        {timeAgo(joinee.createdAt)}
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

const EmptyState: React.FC<{ tab: "all" | OnboardingRequest["status"]; search: string }> = ({ tab, search }) => {
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

// ─── Data Item ───────────────────────────────────────────────────────────────

const DataItem: React.FC<{ icon: any; label: string; value: React.ReactNode }> = ({ icon: Icon, label, value }) => (
  <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50 space-y-1 transition-colors hover:bg-muted/80">
    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
      <Icon className="h-3 w-3" />
      {label}
    </div>
    <div className="text-xs font-bold text-foreground">
      {value || <span className="text-muted-foreground/30 font-normal italic">Not provided</span>}
    </div>
  </div>
);

// ─── View Modal ───────────────────────────────────────────────────────────────

const ViewModal: React.FC<{
  joinee: OnboardingRequest | null;
  open: boolean;
  onClose: () => void;
  onApprove: (j: OnboardingRequest) => void;
  onReject: (j: OnboardingRequest) => void;
}> = ({ joinee, open, onClose, onApprove, onReject }) => {
  const { data: profile, isLoading: profileLoading } = useProfile(joinee?.id || null);

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
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
              <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
                {getInitials(joinee.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base font-bold">{joinee.name}</DialogTitle>
                <StatusBadge status={joinee.status} />
              </div>
              <DialogDescription className="mt-0.5 flex items-center gap-1.5 text-xs font-medium">
                <Hash className="h-3 w-3" />
                ID: {joinee.id} · Registered {timeAgo(joinee.createdAt)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Progress Section */}
          <div className="space-y-3">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Live Onboarding Progress</p>
            <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-xl border border-dashed">
              <ProgressStage label="Profile" status={joinee.profileStatus} />
              <ProgressStage label="Documents" status={joinee.documentStatus} />
              <ProgressStage label="Induction" status={joinee.inductionStatus} />
            </div>
          </div>

          <Separator />

          {profileLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground font-medium">Fetching complete profile details...</p>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Personal Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-foreground/80">Personal Information</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <DataItem icon={User} label="First Name" value={profile?.firstName} />
                  <DataItem icon={User} label="Middle Name" value={profile?.middleName} />
                  <DataItem icon={User} label="Last Name" value={profile?.lastName} />
                  <DataItem icon={Calendar} label="Date of Birth" value={profile?.dob ? formatDate(profile.dob) : null} />
                  <DataItem icon={Users} label="Gender" value={profile?.gender} />
                  <DataItem icon={Users} label="Marital Status" value={profile?.maritalStatus} />
                  <DataItem icon={Globe} label="Nationality" value={profile?.nationality} />
                  <DataItem icon={Mail} label="Personal Email" value={profile?.email} />
                  <DataItem icon={Phone} label="Phone Number" value={profile?.phone} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <DataItem icon={Shield} label="Aadhar Number" value={profile?.aadharNumber} />
                  <DataItem icon={Shield} label="PAN Number" value={profile?.panNumber} />
                </div>
              </div>

              <Separator />

              {/* Address Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-foreground/80">Address Details</h3>
                </div>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 transition-colors hover:bg-primary/10">
                    <div className="flex items-center gap-2 mb-2">
                       <MapPin className="h-3.5 w-3.5 text-primary" />
                       <p className="text-[9px] font-black text-primary uppercase tracking-widest">Current Address</p>
                    </div>
                    <p className="text-sm font-semibold leading-relaxed">
                      {renderAddress(profile?.currentAddress) || <span className="text-muted-foreground/30 font-normal italic">Not provided</span>}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/50 transition-colors hover:bg-muted/60">
                    <div className="flex items-center gap-2 mb-2">
                       <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                       <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Permanent Address</p>
                    </div>
                    <p className="text-sm font-semibold leading-relaxed">
                      {renderAddress(profile?.permanentAddress) || <span className="text-muted-foreground/30 font-normal italic">Same as current</span>}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Emergency Contact */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-foreground/80">Emergency Contact</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DataItem icon={User} label="Contact Name" value={profile?.emergencyContact?.name} />
                  <DataItem icon={Users} label="Relationship" value={profile?.emergencyContact?.relationship} />
                  <DataItem icon={Phone} label="Primary Phone" value={profile?.emergencyContact?.phone} />
                  <DataItem icon={Phone} label="Alternate Phone" value={profile?.emergencyContact?.altPhone} />
                  <div className="sm:col-span-2">
                    <DataItem icon={Mail} label="Email Address" value={profile?.emergencyContact?.email} />
                  </div>
                </div>
              </div>

              {joinee.reviewedBy && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Review History</p>
                    <div className="p-4 rounded-xl border bg-muted/20 space-y-2 border-dashed">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <UserCheck className="h-3.5 w-3.5" />
                          Reviewed By: <span className="text-foreground">{joinee.reviewedBy}</span>
                        </span>
                        <span className="text-muted-foreground">{joinee.approvedAt ? formatDate(joinee.approvedAt) : "—"}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <div className="flex items-center gap-2 w-full justify-end">
            <Button variant="outline" onClick={onClose}>Close</Button>
            {isPending && (
              <>
                <Button
                  variant="outline"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => { onClose(); onReject(joinee); }}
                >
                  <XCircle className="h-4 w-4 mr-1.5" /> Reject
                </Button>
                <Button
                  onClick={() => { onClose(); onApprove(joinee); }}
                  className="bg-green-600 hover:bg-green-700 text-white shadow-sm shadow-green-900/20"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" /> Approve
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ProgressStage: React.FC<{ label: string; status: string }> = ({ label, status }) => {
  const isDone = status === "completed";
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
       <div className={cn(
         "h-1.5 w-full rounded-full",
         isDone ? "bg-green-500" : "bg-muted"
       )} />
       <span className={cn(
         "text-[9px] font-black uppercase",
         isDone ? "text-green-600" : "text-muted-foreground"
       )}>{label}</span>
    </div>
  );
};

// ─── Approve / Reject Confirm Modal ──────────────────────────────────────────

interface ActionModalProps {
  open: boolean;
  type: "approved" | "rejected" | null;
  joinee: OnboardingRequest | null;
  onClose: () => void;
  onConfirm: (note: string) => void;
  isLoading?: boolean;
}

const ActionModal: React.FC<ActionModalProps> = ({
  open, type, joinee, onClose, onConfirm, isLoading,
}) => {
  const [note, setNote] = useState("");
  const isApprove = type === "approved";

  return (
    <Dialog open={open} onOpenChange={() => { onClose(); setNote(""); }}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center",
              isApprove ? "bg-green-100 dark:bg-green-900/40" : "bg-destructive/10"
            )}>
              {isApprove ? <CheckCircle2 className="h-5 w-5 text-green-700 dark:text-green-400" /> : <XCircle className="h-5 w-5 text-destructive" />}
            </div>
            <div>
              <DialogTitle>{isApprove ? "Approve" : "Reject"} Registration</DialogTitle>
              <DialogDescription className="mt-0.5 text-xs">
                {joinee?.name} · {joinee?.email}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-muted-foreground">{isApprove ? "This will approve the registration. An approval note can be added below." : "Reason for rejection is required to inform the applicant."}</p>
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              {isApprove ? "Approval Note" : "Rejection Reason"}
              {!isApprove && <span className="text-destructive ml-0.5">*</span>}
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={isApprove ? "Optional — e.g. Everything looks good." : "e.g. Incomplete documentation."}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <Button variant="outline" onClick={() => { onClose(); setNote(""); }} disabled={isLoading}>Cancel</Button>
          <Button
            disabled={(!isApprove && !note.trim()) || isLoading}
            onClick={() => { onConfirm(note); setNote(""); }}
            variant={isApprove ? "default" : "destructive"}
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
  const { data: joinees = [], isLoading, isError } = useOnboardingDashboard();
  const updateStatus = useUpdateOnboardingStatus();

  // State
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);

  // Modals
  const [viewJoinee, setViewJoinee] = useState<OnboardingRequest | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [actionType, setActionType] = useState<"approved" | "rejected" | null>(null);
  const [actionJoinee, setActionJoinee] = useState<OnboardingRequest | null>(null);

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
      const matchesSearch = !q || j.name.toLowerCase().includes(q) || j.email.toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [joinees, activeTab, deferredSearch]);

  // Handlers
  const openView = (j: OnboardingRequest) => { setViewJoinee(j); setViewOpen(true); };
  const openApprove = (j: OnboardingRequest) => { setActionJoinee(j); setActionType("approved"); };
  const openReject = (j: OnboardingRequest) => { setActionJoinee(j); setActionType("rejected"); };

  const handleConfirmAction = async (note: string) => {
    if (!actionJoinee || !actionType) return;
    updateStatus.mutate({ 
      id: actionJoinee.id, 
      dto: { status: actionType, note } 
    }, {
      onSuccess: () => {
        setActionType(null);
        setActionJoinee(null);
      }
    });
  };

  if (isLoading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (isError) return <div className="p-8 text-center text-destructive">Failed to load onboarding data.</div>;

  const tabs: { value: TabValue; label: string; icon: React.ElementType; count: number }[] = [
    { value: "all", label: "All", icon: Users, count: stats.total },
    { value: "pending", label: "Pending", icon: Clock, count: stats.pending },
    { value: "approved", label: "Approved", icon: UserCheck, count: stats.approved },
    { value: "rejected", label: "Rejected", icon: UserX, count: stats.rejected },
  ];

  return (
    <TooltipProvider>
      <Card className="flex flex-col h-full min-h-0 border-none shadow-none bg-transparent">
        <CardHeader className="flex flex-row items-center justify-between pb-6">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-2xl font-bold">
              <UserPlus className="h-6 w-6 text-primary" />
              Onboarding
            </CardTitle>
            <CardDescription>Review and manage new hire registrations</CardDescription>
          </div>
          <Button onClick={() => navigate("/hrms/onboarding/signup")} size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> New Hire
          </Button>
        </CardHeader>

        <CardContent className="flex-1 min-h-0 flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard label="Total Joiners" value={stats.total} icon={Users} />
            <StatCard label="Pending Review" value={stats.pending} icon={Clock} highlight={stats.pending > 0} />
            <StatCard label="Approved" value={stats.approved} icon={TrendingUp} />
            <StatCard label="Rejected" value={stats.rejected} icon={XCircle} />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
              <TabsList className="h-10 bg-muted/50 p-1 rounded-xl">
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="gap-2 text-[10px] font-black uppercase px-4 rounded-lg">
                    <tab.icon className="h-3.5 w-3.5" />
                    {tab.label}
                    <Badge variant="secondary" className="ml-1 h-4 px-1 text-[9px] bg-background">{tab.count}</Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9 h-10 text-xs rounded-xl border-muted-foreground/20"
                placeholder="Search candidates…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-tighter">
              Showing <span className="text-foreground">{filtered.length}</span> records
            </p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <EmptyState tab={activeTab} search={deferredSearch} />
            ) : (
              <div className="space-y-3">
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
          onClose={() => { setActionType(null); setActionJoinee(null); }}
          onConfirm={handleConfirmAction}
          isLoading={updateStatus.isPending}
        />
      </Card>
    </TooltipProvider>
  );
};
export default OnboardingDashboard;