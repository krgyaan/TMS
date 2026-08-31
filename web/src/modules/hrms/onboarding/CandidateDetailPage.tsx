import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
  Activity,
  DollarSign,
  Users,
  ArrowLeft,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useOnboardingDashboard,
  useProfile,
  useUpdateOnboardingStatus,
} from "./useOnboarding";
import { type OnboardingRequest } from "@/services/api/onboarding.service";
import { paths } from "@/app/routes/paths";
import { StatusBadge } from "./components/StatusBadge";
import { HrStatusBadge } from "./components/HrStatusBadge";
import { ProgressIndicator } from "./components/ProgressIndicator";
import { ProgressStage } from "./components/ProgressStage";
import { DataItem } from "./components/DataItem";
import { SectionHeader } from "./components/SectionHeader";
import { ActionModal } from "./components/ActionModal";
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

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const candidateId = Number(id);

  const { data: joinees } = useOnboardingDashboard();
  const joinee = joinees?.find((j) => j.id === candidateId);

  const { data: profile, isLoading: profileLoading } = useProfile(
    Number.isNaN(candidateId) ? null : candidateId
  );
  const updateStatus = useUpdateOnboardingStatus();
  const [actionType, setActionType] = useState<"approved" | "rejected" | null>(
    null
  );
  const [actionJoinee, setActionJoinee] = useState<OnboardingRequest | null>(
    null
  );

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
      { id: actionJoinee.id, dto: { status: actionType, note } },
      {
        onSuccess: () => {
          setActionType(null);
          setActionJoinee(null);
        },
      }
    );
  };

  if (!joinee) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading candidate...</p>
      </div>
    );
  }

  const isPending = joinee.status === "pending";

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

          {isPending && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                className="rounded-xl border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                onClick={() => openReject(joinee)}
              >
                <XCircle className="h-4 w-4 mr-2" /> Reject
              </Button>
              <Button
                onClick={() => openApprove(joinee)}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
              </Button>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-8 overflow-y-auto">
          {/* Progress Pipeline */}
          <div className="space-y-4">
            <SectionHeader icon={Activity} title="Onboarding Progress" />
            <div className="p-6 rounded-2xl bg-muted/30 border border-dashed">
              <div className="flex items-start gap-1">
                <ProgressStage label="Profile" status={joinee.profileStatus} />
                <div className="flex-shrink-0 h-px w-4 bg-border mt-[18px]" />
                <ProgressStage label="Documents" status={joinee.documentStatus} />
                <div className="flex-shrink-0 h-px w-4 bg-border mt-[18px]" />
                <ProgressStage label="Education" status={joinee.educationStatus} />
                <div className="flex-shrink-0 h-px w-4 bg-border mt-[18px]" />
                <ProgressStage label="Experience" status={joinee.experienceStatus} />
                <div className="flex-shrink-0 h-px w-4 bg-border mt-[18px]" />
                <ProgressStage label="Bank" status={joinee.bankStatus} />
                <div className="flex-shrink-0 h-px w-4 bg-border mt-[18px]" />
                <ProgressStage label="Induction" status={joinee.inductionStatus} />
              </div>
              <div className="mt-5">
                <ProgressIndicator value={joinee.progress} />
              </div>
            </div>
          </div>

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
                <TabsList className="grid w-full grid-cols-4 rounded-xl bg-muted/60 p-1">
                  <TabsTrigger value="personal" className="rounded-lg text-xs font-semibold py-2">
                    Personal
                  </TabsTrigger>
                  <TabsTrigger value="education_experience" className="rounded-lg text-xs font-semibold py-2">
                    Edu & Exp
                  </TabsTrigger>
                  <TabsTrigger value="work_compensation" className="rounded-lg text-xs font-semibold py-2">
                    Work & Salary
                  </TabsTrigger>
                  <TabsTrigger value="documents_bank" className="rounded-lg text-xs font-semibold py-2">
                    Docs & Bank
                  </TabsTrigger>
                </TabsList>

                <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
                  {/* Tab: Personal */}
                  <TabsContent value="personal" className="space-y-6 mt-4 outline-none">
                    <div className="space-y-4">
                      <SectionHeader icon={User} title="Personal Information" />
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

                  {/* Tab: Edu & Exp */}
                  <TabsContent value="education_experience" className="space-y-6 mt-4 outline-none">
                    <div className="space-y-4">
                      <SectionHeader icon={GraduationCap} title="Education" count={profile?.education?.length} />
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
                                    <p className="text-sm font-semibold">{edu.degree}</p>
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

                    <Separator />

                    <div className="space-y-4">
                      <SectionHeader icon={Briefcase} title="Work Experience" count={profile?.experience?.length} />
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

                  {/* Tab: Docs & Bank */}
                  <TabsContent value="documents_bank" className="space-y-6 mt-4 outline-none">
                    <div className="space-y-4">
                      <SectionHeader icon={FileText} title="Documents" count={profile?.documents?.length} />
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

                    <Separator />

                    <div className="space-y-4">
                      <SectionHeader icon={CreditCard} title="Bank Details" count={profile?.bankDetails?.length} />
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
}
