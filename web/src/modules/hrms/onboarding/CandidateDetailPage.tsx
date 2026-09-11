import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Loader2,
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  Calendar,
  Shield,
  Briefcase,
  Globe,
  HeartHandshake,
  UserCheck,
  CalendarDays,
  TrendingUp,
  Hash,
  GraduationCap,
  CreditCard,
  FileText,
  Download,
  ExternalLink,
  DollarSign,
  Users,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  ListChecks,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useOnboardingDashboard,
  useProfile,
  useUpdateEntryStatus,
  useUpdateSectionStatus,
} from "@/hooks/api/useOnboarding";
import { useEmployeeInduction } from "@/hooks/api/useInduction";
import { paths } from "@/app/routes/paths";
import { StatusBadge } from "./components/StatusBadge";
import { HrStatusBadge } from "./components/HrStatusBadge";
import { DataItem } from "./components/DataItem";
import { SectionHeader } from "./components/SectionHeader";
import { SectionApproveModal } from "./components/SectionApproveModal";
import {
  formatDate,
  timeAgo,
  getInitials,
  getAvatarColor,
  renderAddress,
  type ProfileEducationItem,
  type ProfileExperienceItem,
  type ProfileDocumentItem,
  type ProfileBankItem,
} from "./helpers/onboarding.type";

type SectionStage = "profile" | "education" | "experience" | "documents" | "bankDetails";

const TAB_STATUS_META: Record<
  string,
  { icon: React.ElementType; className: string; label: string }
> = {
  approved: {
    icon: CheckCircle2,
    className: "text-emerald-700 dark:text-emerald-400",
    label: "Approved",
  },
  completed: {
    icon: CheckCircle2,
    className: "text-emerald-700 dark:text-emerald-400",
    label: "Completed",
  },
  rejected: {
    icon: XCircle,
    className: "text-red-700 dark:text-red-400",
    label: "Rejected",
  },
  pending: {
    icon: Clock,
    className: "text-amber-700 dark:text-amber-400",
    label: "Pending",
  },
  in_progress: {
    icon: Clock,
    className: "text-amber-700 dark:text-amber-400",
    label: "In Progress",
  },
  submitted: {
    icon: Clock,
    className: "text-amber-700 dark:text-amber-400",
    label: "Submitted",
  },
  resubmitted: {
    icon: Clock,
    className: "text-amber-700 dark:text-amber-400",
    label: "Resubmitted",
  },
};

const TabStatusDot: React.FC<{ status: string }> = ({ status }) => {
  const meta = TAB_STATUS_META[status];
  const Icon = meta?.icon ?? Clock;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Icon
            aria-label={`Status: ${meta?.label ?? status}`}
            className={cn(
              "h-3.5 w-3.5 flex-shrink-0 cursor-default",
              meta?.className ?? "text-slate-500 dark:text-slate-400"
            )}
          />
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {meta?.label ?? status.replace(/_/g, " ")}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

type InductionTabPhase = "before_joining" | "after_joining";

interface InductionTabTask {
  id: string;
  name: string;
  phase: InductionTabPhase;
  status: "pending" | "completed";
  required: boolean;
  remarks?: string;
  completedAt?: string;
}

const normalizeInductionPhase = (v?: string | null): InductionTabPhase =>
  (v ?? "").toLowerCase().includes("after") ? "after_joining" : "before_joining";

const mapInductionTasks = (data: unknown): InductionTabTask[] => {
  const source: unknown[] = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { tasks?: unknown[] }).tasks)
      ? (data as { tasks: unknown[] }).tasks
      : [];
  return source.map((raw, i) => {
    const t = (raw ?? {}) as Record<string, unknown>;
    const status = String(t.status ?? "pending").toLowerCase();
    return {
      id: String(t.id ?? i),
      name: String(t.name ?? t.taskName ?? "Unknown Task"),
      phase: normalizeInductionPhase(String(t.phase ?? t.taskType ?? "")),
      status: status === "completed" ? "completed" : "pending",
      required: Boolean(t.required ?? false),
      remarks: t.remarks ? String(t.remarks) : undefined,
      completedAt: t.completedAt ? String(t.completedAt) : undefined,
    };
  });
};

const SectionActionBar: React.FC<{
  status?: string;
  loading?: boolean;
  hasData?: boolean;
  onAction: (action: "approved" | "rejected" | "pending") => void;
}> = ({ status, loading, hasData = true, onAction }) => {
  const actions: {
    value: "approved" | "rejected" | "pending";
    label: string;
    icon: React.ElementType;
    className: string;
  }[] = [
    {
      value: "approved",
      label: "Approve",
      icon: CheckCircle2,
      className: "text-emerald-600 focus:text-emerald-600",
    },
    {
      value: "rejected",
      label: "Reject",
      icon: XCircle,
      className: "text-red-600 focus:text-red-600",
    },
    {
      value: "pending",
      label: "Revert",
      icon: RotateCcw,
      className: "text-amber-600 focus:text-amber-600",
    },
  ];

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {status === "approved" && (
        <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-500/30 dark:bg-emerald-500/10 gap-1 rounded-lg px-2 py-1">
          <CheckCircle2 className="h-3 w-3" />
          Approved
        </Badge>
      )}
      {status === "rejected" && (
        <Badge variant="outline" className="text-[10px] text-red-600 border-red-300 bg-red-50 dark:text-red-400 dark:border-red-500/30 dark:bg-red-500/10 gap-1 rounded-lg px-2 py-1">
          <XCircle className="h-3 w-3" />
          Rejected
        </Badge>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            disabled={loading || !hasData}
            title={!hasData ? "No details submitted yet" : undefined}
            className="gap-1.5 rounded-lg h-8 text-xs"
          >
            Action
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          {actions.map(({ value, label, icon: Icon, className }) => (
            <DropdownMenuItem
              key={value}
              disabled={loading || status === value}
              onClick={() => onAction(value)}
              className={cn("gap-2 text-xs cursor-pointer", className)}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
    </div>
  );
};

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const candidateId = Number(id);
  const { data: joinees } = useOnboardingDashboard();
  const joinee = joinees?.find((j) => j.id === candidateId);

  const { data: profile, isLoading: profileLoading } = useProfile(
    Number.isNaN(candidateId) ? null : candidateId
  );

  // ── Induction tasks (view-only tab) ──────────────────────────────────────
  const { data: rawInduction, isLoading: inductionLoading } =
    useEmployeeInduction(Number.isNaN(candidateId) ? null : candidateId);
  // ── Section-level approve/reject ─────────────────────────────────────────
  const [sectionAction, setSectionAction] = useState<{
    stage: "profile" | "education" | "experience" | "documents" | "bankDetails";
    type: "approved" | "rejected";
  } | null>(null);

  const sectionMutations = {
    education: useUpdateSectionStatus("education"),
    experience: useUpdateSectionStatus("experience"),
    documents: useUpdateSectionStatus("documents"),
    bankDetails: useUpdateSectionStatus("bankDetails"),
  };
  const profileMutation = useUpdateEntryStatus("profile");

  const handleConfirmSectionAction = (note: string) => {
    if (!sectionAction) return;
    const { stage, type } = sectionAction;
    const onSuccess = () => setSectionAction(null);
    if (stage === "profile") {
      profileMutation.mutate(
        { onboardingId: candidateId, status: type, reason: note },
        { onSuccess }
      );
    } else {
      sectionMutations[stage].mutate(
        { onboardingId: candidateId, status: type, reason: note },
        { onSuccess }
      );
    }
  };

  const isSectionLoading =
    sectionAction !== null &&
    (sectionAction.stage === "profile"
      ? profileMutation.isPending
      : sectionMutations[sectionAction.stage].isPending);

  const openSectionApprove = (stage: SectionStage) => {
    setSectionAction({ stage, type: "approved" });
  };
  const openSectionReject = (stage: SectionStage) => {
    setSectionAction({ stage, type: "rejected" });
  };

  const runSectionMutation = (
    stage: SectionStage,
    type: "approved" | "rejected" | "pending",
    note: string
  ) => {
    if (stage === "profile") {
      profileMutation.mutate(
        { onboardingId: candidateId, status: type, reason: note }
      );
    } else {
      sectionMutations[stage].mutate(
        { onboardingId: candidateId, status: type, reason: note }
      );
    }
  };

  const handleSectionAction = (
    stage: SectionStage,
    action: "approved" | "rejected" | "pending"
  ) => {
    if (action === "pending") {
      runSectionMutation(stage, "pending", "");
      return;
    }
    if (action === "approved") {
      openSectionApprove(stage);
    } else {
      openSectionReject(stage);
    }
  };

  if (!joinee) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading candidate...</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-8 py-4 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-4 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl shrink-0"
              onClick={() => navigate(paths.hrms.onboardingDashboard)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Avatar className="h-12 w-12 rounded-2xl ring-2 ring-border/50 shrink-0">
              {joinee.profilePhoto && (
                <AvatarImage
                  src={joinee.profilePhoto}
                  alt={joinee.name}
                  className="object-cover"
                />
              )}
              <AvatarFallback
                className={cn(
                  "rounded-2xl text-base font-bold",
                  getAvatarColor(joinee.name)
                )}
              >
                {getInitials(joinee.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-lg font-bold truncate">{joinee.name}</h1>
                <StatusBadge status={joinee.status} size="md" />
                {joinee.hrStatus && (
                  <HrStatusBadge status={joinee.hrStatus} size="md" />
                )}
              </div>
              <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
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
              </div>
            </div>
          </div>

        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-8 overflow-y-auto">
          {profileLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground font-medium">
                Loading complete profile...
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <Tabs defaultValue="personal" className="w-full space-y-6">

                <TabsList className="grid w-full grid-cols-7 rounded-xl bg-muted/60 p-1 overflow-hidden">
                  <TabsTrigger
                    value="personal"
                    className="rounded-lg text-xs font-semibold py-1.5 gap-1.5"
                  >
                    Personal
                    <TabStatusDot status={joinee.profileStatus} />
                  </TabsTrigger>
                  <TabsTrigger
                    value="education"
                    className="rounded-lg text-xs font-semibold py-1.5 gap-1.5"
                  >
                    Education
                    <TabStatusDot status={joinee.educationStatus} />
                  </TabsTrigger>
                  <TabsTrigger
                    value="experience"
                    className="rounded-lg text-xs font-semibold py-1.5 gap-1.5"
                  >
                    Experience
                    <TabStatusDot status={joinee.experienceStatus} />
                  </TabsTrigger>
                  <TabsTrigger
                    value="documents"
                    className="rounded-lg text-xs font-semibold py-1.5 gap-1.5"
                  >
                    Documents
                    <TabStatusDot status={joinee.documentStatus} />
                  </TabsTrigger>
                  <TabsTrigger
                    value="bank"
                    className="rounded-lg text-xs font-semibold py-1.5 gap-1.5"
                  >
                    Bank
                    <TabStatusDot status={joinee.bankStatus} />
                  </TabsTrigger>
                  <TabsTrigger
                    value="induction"
                    className="rounded-lg text-xs font-semibold py-1.5 gap-1.5"
                  >
                    Induction
                    <TabStatusDot status={joinee.inductionStatus} />
                  </TabsTrigger>
                  <TabsTrigger
                    value="work_compensation"
                    className="rounded-lg text-xs font-semibold py-1.5"
                  >
                    Work & Salary
                  </TabsTrigger>
                </TabsList>

                <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
                  {/* Tab: Personal */}
                  <TabsContent value="personal" className="space-y-6 mt-4 outline-none">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <SectionHeader icon={User} title="Personal Information" />
                        <SectionActionBar
                          status={joinee.profileStatus}
                          loading={sectionAction?.stage === "profile" && isSectionLoading}
                          hasData={!!profile?.firstName}
                          onAction={(action) => handleSectionAction("profile", action)}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-5 pl-1">
                        <DataItem icon={User} label="First Name" value={profile?.firstName} />
                        <DataItem icon={User} label="Middle Name" value={profile?.middleName} />
                        <DataItem icon={User} label="Last Name" value={profile?.lastName} />
                        <DataItem icon={Calendar} label="Date of Birth" value={profile?.dob ? formatDate(profile.dob) : null} />
                        <DataItem icon={Users} label="Gender" value={profile?.gender} />
                        <DataItem icon={Users} label="Marital Status" value={profile?.maritalStatus} />
                        <DataItem icon={Globe} label="Nationality" value={profile?.nationality} />
                        <DataItem icon={HeartHandshake} label="Blood Group" value={profile?.bloodGroup} />
                        <DataItem icon={Mail} label="Work Email" value={profile?.email} />
                        <DataItem icon={Mail} label="Personal Email" value={profile?.personalEmail} />
                        <DataItem icon={Phone} label="Phone" value={profile?.phone} />
                        <DataItem icon={Shield} label="Aadhar Number" value={profile?.aadharNumber} />
                        <DataItem icon={Shield} label="PAN Number" value={profile?.panNumber} />
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
                                View Profile <ExternalLink className="h-3 w-3" />
                              </a>
                            }
                          />
                        </div>
                      )}
                    </div>

                    <Separator />

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
                          <div className="text-sm leading-relaxed pl-6">
                            {renderAddress(profile?.currentAddress) || (
                              <span className="text-muted-foreground/40 italic">
                                Not provided
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="p-4 rounded-xl border bg-card space-y-2">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Permanent Address
                            </p>
                          </div>
                          <div className="text-sm leading-relaxed pl-6">
                            {renderAddress(profile?.permanentAddress) || (
                              <span className="text-muted-foreground/40 italic">
                                Same as current
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <SectionHeader icon={HeartHandshake} title="Emergency Contact" />
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-5 pl-1">
                        <DataItem icon={User} label="Contact Name" value={profile?.emergencyContact?.name} />
                        <DataItem icon={Users} label="Relationship" value={profile?.emergencyContact?.relationship} />
                        <DataItem icon={Phone} label="Primary Phone" value={profile?.emergencyContact?.phone} />
                        <DataItem icon={Phone} label="Alternate Phone" value={profile?.emergencyContact?.altPhone} />
                        <DataItem icon={Mail} label="Email" value={profile?.emergencyContact?.email} />
                      </div>
                    </div>
                  </TabsContent>

                  {/* Tab: Education */}
                  <TabsContent value="education" className="space-y-6 mt-4 outline-none">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <SectionHeader icon={GraduationCap} title="Education" count={profile?.education?.length} />
                        <SectionActionBar
                          status={joinee.educationStatus}
                          loading={sectionAction?.stage === "education" && isSectionLoading}
                          hasData={(profile?.education?.length ?? 0) > 0}
                          onAction={(action) => handleSectionAction("education", action)}
                        />
                      </div>
                      {(profile?.education?.length ?? 0) > 0 ? (
                        <div className="space-y-3">
                          {profile?.education?.map((edu: ProfileEducationItem) => (
                            <div key={edu.id} className="p-4 rounded-xl border bg-card">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <GraduationCap className="h-4 w-4 text-primary" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold">{edu.degree}{edu.fieldOfStudy ? ` (${edu.fieldOfStudy})` : ""}</p>
                                    <p className="text-xs text-muted-foreground">{edu.institution}</p>
                                  </div>
                                </div>
                                <StatusBadge status={edu.hrStatus || "pending"} />
                              </div>
                              <div className="flex items-center gap-6 mt-3 pl-[42px]">
                                <div>
                                  <p className="text-[11px] text-muted-foreground">Duration</p>
                                  <p className="text-xs font-medium mt-0.5">
                                    {edu.startDate ? formatDate(edu.startDate) : "—"} →{" "}
                                    {edu.endDate ? formatDate(edu.endDate) : "Present"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[11px] text-muted-foreground">Grade / CGPA</p>
                                  <p className="text-xs font-medium mt-0.5">{edu.grade || "—"}</p>
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
                  </TabsContent>

                  {/* Tab: Experience */}
                  <TabsContent value="experience" className="space-y-6 mt-4 outline-none">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <SectionHeader icon={Briefcase} title="Work Experience" count={profile?.experience?.length} />
                        <SectionActionBar
                          status={joinee.experienceStatus}
                          loading={sectionAction?.stage === "experience" && isSectionLoading}
                          hasData={(profile?.experience?.length ?? 0) > 0}
                          onAction={(action) => handleSectionAction("experience", action)}
                        />
                      </div>
                      {(profile?.experience?.length ?? 0) > 0 ? (
                        <div className="space-y-3">
                          {profile?.experience?.map((exp: ProfileExperienceItem) => (
                            <div key={exp.id} className="p-4 rounded-xl border bg-card">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Briefcase className="h-4 w-4 text-primary" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold">{exp.designation}</p>
                                    <p className="text-xs text-muted-foreground">{exp.companyName}</p>
                                  </div>
                                </div>
                                <StatusBadge status={exp.hrStatus || "pending"} />
                              </div>
                              <div className="mt-3 pl-[42px]">
                                <p className="text-[11px] text-muted-foreground">Duration</p>
                                <p className="text-xs font-medium mt-0.5">
                                  {exp.fromDate ? formatDate(exp.fromDate) : "—"} →{" "}
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
                  </TabsContent>

                  {/* Tab: Induction */}
                  <TabsContent value="induction" className="space-y-6 mt-4 outline-none">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <SectionHeader icon={UserCheck} title="Induction Tasks" />
                        {(() => {
                          const tasks = mapInductionTasks(rawInduction);
                          const done = tasks.filter((t) => t.status === "completed").length;
                          return (
                            <Badge variant="secondary" className="text-[10px] font-semibold rounded-full">
                              {done} / {tasks.length} completed
                            </Badge>
                          );
                        })()}
                      </div>

                      {inductionLoading ? (
                        <div className="space-y-2">
                          {[0, 1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-12 w-full rounded-xl" />
                          ))}
                        </div>
                      ) : mapInductionTasks(rawInduction).length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">
                          No induction tasks assigned yet
                        </p>
                      ) : (
                        (["before_joining", "after_joining"] as InductionTabPhase[]).map((phase) => {
                          const phaseTasks = mapInductionTasks(rawInduction).filter(
                            (t) => t.phase === phase
                          );
                          if (phaseTasks.length === 0) return null;
                          return (
                            <div key={phase} className="space-y-2">
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {phase === "before_joining" ? "Before Joining" : "After Joining"}
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                {phaseTasks.map((task) => {
                                  const isDone = task.status === "completed";
                                  return (
                                    <div
                                      key={task.id}
                                      className={cn(
                                        "flex items-center gap-2.5 px-3 py-3 rounded-xl border",
                                        isDone
                                          ? "bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200/40 dark:border-emerald-900/30"
                                          : "bg-card border-border/40"
                                      )}
                                    >
                                      <div
                                        className={cn(
                                          "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                                          isDone ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-muted/60"
                                        )}
                                      >
                                        {isDone ? (
                                          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                        ) : (
                                          <ListChecks className="h-4 w-4 text-muted-foreground" />
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <p
                                          className={cn(
                                            "text-xs font-medium",
                                            isDone && "line-through text-muted-foreground/70"
                                          )}
                                        >
                                          {task.name}
                                        </p>
                                        {(task.remarks || (isDone && task.completedAt)) && (
                                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                            {isDone && task.completedAt && (
                                              <span className="text-[10px] text-muted-foreground/70">
                                                {formatDate(task.completedAt)}
                                              </span>
                                            )}
                                            {task.remarks && (
                                              <span className="text-[10px] text-muted-foreground/60 italic line-clamp-1">
                                                {task.remarks}
                                              </span>
                                            )}
        </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </TabsContent>

                  {/* Tab: Work & Salary */}
                  <TabsContent value="work_compensation" className="space-y-6 mt-4 outline-none">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <SectionHeader icon={Briefcase} title="Work Information" />
                        <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 bg-amber-50 dark:text-amber-400 dark:border-amber-500/30 dark:bg-amber-500/10">
                          To be filled by Admin
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-5 pl-1">
                        <DataItem icon={Briefcase} label="Designation" value={profile?.designation} />
                        <DataItem icon={Building2} label="Department" value={profile?.department} />
                        <DataItem icon={User} label="Reporting TL" value={profile?.reportingTl} />
                        <DataItem icon={CalendarDays} label="Date of Joining" value={profile?.dateOfJoining ? formatDate(profile.dateOfJoining) : null} />
                        <DataItem icon={Briefcase} label="Employee Type" value={profile?.employeeType} />
                        <DataItem icon={MapPin} label="Work Location" value={profile?.workLocation} />
                        <DataItem icon={CalendarDays} label="Probation End Date" value={profile?.probationEndDate ? formatDate(profile.probationEndDate) : null} />
                        <DataItem icon={Calendar} label="Probation Period" value={profile?.probationMonths ? `${profile.probationMonths} Months` : null} />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <SectionHeader icon={DollarSign} title="Compensation Details" />
                        <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 bg-amber-50 dark:text-amber-400 dark:border-amber-500/30 dark:bg-amber-500/10">
                          To be filled by Admin
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-5 pl-1">
                        <DataItem icon={TrendingUp} label="Salary Type" value={profile?.salaryType} />
                        <DataItem icon={DollarSign} label="Basic Salary" value={profile?.basicSalary} />
                        <DataItem icon={DollarSign} label="HRA" value={profile?.hra} />
                        <DataItem icon={DollarSign} label="Allowances" value={profile?.allowances} />
                        <DataItem icon={DollarSign} label="Bonus" value={profile?.bonus} />
                        <DataItem icon={Shield} label="PF Applicable" value={profile?.pfApplicable ? "Yes" : "No"} />
                        <DataItem icon={Shield} label="ESIC Applicable" value={profile?.esicApplicable ? "Yes" : "No"} />
                      </div>
                    </div>
                  </TabsContent>

                  {/* Tab: Documents */}
                  <TabsContent value="documents" className="space-y-6 mt-4 outline-none">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <SectionHeader icon={FileText} title="Documents" count={profile?.documents?.length} />
                        <SectionActionBar
                          status={joinee.documentStatus}
                          loading={sectionAction?.stage === "documents" && isSectionLoading}
                          hasData={(profile?.documents?.length ?? 0) > 0}
                          onAction={(action) => handleSectionAction("documents", action)}
                        />
                      </div>
                      {(profile?.documents?.length ?? 0) > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {profile?.documents?.map((doc: ProfileDocumentItem) => (
                            <div
                              key={doc.id}
                              className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:border-primary/20 transition-colors"
                            >
                              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <FileText className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{doc.docType}</p>
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
                                    <TooltipContent className="text-xs">Open</TooltipContent>
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
                                          link.href = doc.fileUrl ?? "";
                                          link.download = doc.fileName || "document";
                                          link.click();
                                        }}
                                      >
                                        <Download className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="text-xs">Download</TooltipContent>
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
                  </TabsContent>

                  {/* Tab: Bank */}
                  <TabsContent value="bank" className="space-y-6 mt-4 outline-none">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <SectionHeader icon={CreditCard} title="Bank Details" count={profile?.bankDetails?.length} />
                        <SectionActionBar
                          status={joinee.bankStatus}
                          loading={sectionAction?.stage === "bankDetails" && isSectionLoading}
                          hasData={(profile?.bankDetails?.length ?? 0) > 0}
                          onAction={(action) => handleSectionAction("bankDetails", action)}
                        />
                      </div>
                      {(profile?.bankDetails?.length ?? 0) > 0 ? (
                        <div className="space-y-3">
                          {profile?.bankDetails?.map((bank: ProfileBankItem) => (
                            <div key={bank.id} className="p-4 rounded-xl border bg-card">
                              <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <CreditCard className="h-4 w-4 text-primary" />
                                  </div>
                                  <span className="text-sm font-semibold">{bank.bankName}</span>
                                  {bank.isPrimary && (
                                    <Badge variant="secondary" className="text-[10px]">
                                      Primary
                                    </Badge>
                                  )}
                                </div>
                                <StatusBadge status={bank.hrStatus || "pending"} />
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pl-[42px]">
                                <div>
                                  <p className="text-[11px] text-muted-foreground">Account Holder</p>
                                  <p className="text-sm font-medium mt-0.5">{bank.accountHolderName}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] text-muted-foreground">Account Number</p>
                                  <p className="text-sm font-medium mt-0.5">{bank.accountNumber}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] text-muted-foreground">IFSC Code</p>
                                  <p className="text-sm font-medium mt-0.5">{bank.ifscCode}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] text-muted-foreground">Branch</p>
                                  <p className="text-sm font-medium mt-0.5">{bank.branchName || "—"}</p>
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
                  </TabsContent>
                </div>
              </Tabs>

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
                            <p className="text-sm font-medium">{joinee.reviewedBy}</p>
                            <p className="text-xs text-muted-foreground">Reviewer</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {joinee.approvedAt ? formatDate(joinee.approvedAt) : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <SectionApproveModal
          open={!!sectionAction}
          type={sectionAction?.type ?? null}
          title={
            sectionAction?.stage === "profile"
              ? "Approve / Reject Personal Details"
              : `Approve / Reject ${sectionAction?.stage ? sectionAction.stage.charAt(0).toUpperCase() + sectionAction.stage.slice(1) : ""}`
          }
          onClose={() => setSectionAction(null)}
          onConfirm={handleConfirmSectionAction}
          isLoading={isSectionLoading}
        />
      </div>
    </TooltipProvider>
  );
}
