import React, { useState, useDeferredValue, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Eye,
  Check,
  X,
  UserCheck,
  UserX,
  Phone,
  Hash,
  Calendar,
  Clock,
  UserPlus,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useOnboardingDashboard,
  useUpdateOnboardingStatus,
} from "./useOnboarding";
import { type OnboardingRequest } from "@/services/api/onboarding.service";
import { paths } from "@/app/routes/paths";
import { StatusBadge } from "./components/StatusBadge";
import { HrStatusBadge } from "./components/HrStatusBadge";
import { ActionModal } from "./components/ActionModal";
import { timeAgo, getInitials, getAvatarColor } from "./helpers/onboarding.type";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
              {joinee.profilePhoto && (
                <AvatarImage src={joinee.profilePhoto} alt={joinee.name} className="object-cover" />
              )}
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
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <StatusBadge status={joinee.status} />
                  {joinee.hrStatus && <HrStatusBadge status={joinee.hrStatus} />}
                </div>
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
          <div className="mt-5 grid grid-cols-2 gap-4 pt-4 border-t">
            {/* Employee Progress (Discrete Track) */}
            <div>
              <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                <span>Employee</span>
                <span className="text-blue-600 dark:text-blue-400 tabular-nums">{joinee.employeeProgress}%</span>
              </div>
              <div className="flex gap-1 h-1.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "flex-1 rounded-full transition-colors", 
                      Math.round((joinee.employeeProgress / 100) * 6) > i 
                        ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
                        : "bg-muted"
                    )} 
                  />
                ))}
              </div>
            </div>

            {/* HR Progress (Continuous Line) */}
            <div>
              <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                <span>HR Approval</span>
                <span className={cn(
                  "tabular-nums",
                  joinee.progress >= 80 ? "text-emerald-600 dark:text-emerald-400" :
                  joinee.progress >= 50 ? "text-amber-600 dark:text-amber-400" :
                  "text-orange-600 dark:text-orange-400"
                )}>
                  {joinee.progress}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden relative">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    joinee.progress >= 80 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                    joinee.progress >= 50 ? "bg-amber-500" :
                    "bg-orange-500"
                  )}
                  style={{ width: `${joinee.progress}%` }}
                />
              </div>
            </div>
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
    navigate(paths.hrms.onboardingCandidate(j.id));
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
            onClick={() => navigate(paths.hrms.employeeRegistration)}
            className="gap-2 rounded-xl shadow-sm h-10"
          >
            <Plus className="h-4 w-4" />
            Add New Hire
          </Button>
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