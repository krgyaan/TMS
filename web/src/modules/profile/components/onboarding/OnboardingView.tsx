import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, FileText, ClipboardCheck, CheckCircle2, Sparkles, ArrowRight, CreditCard, GraduationCap, Briefcase, Laptop, MessageSquare, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOnboardingContext } from "./contexts/OnboardingContext";
import type { ProfileResponse, DocumentData, ProfileData, AddressData, EmergencyContactData } from "../../types";
import { OnboardingStageCard } from "./OnboardingStageCard";
import type { StageDetail, DocumentDetail, EducationInfo, ExperienceInfo, BankAccountInfo, InductionTask } from "./onboarding.types";
import { ProfileHeader } from "../ProfileHeader";
import type {ApprovalStatus} from "./onboarding.types";
// ─────────────────────────────────────────────────────────────────────────────
// Types & Constants
// ─────────────────────────────────────────────────────────────────────────────

type StageKey = "profile" | "documents" | "bank" | "induction" | "education" | "experience";

const STAGES_CONFIG = [
    {
        key: "profile" as StageKey,
        label: "Profile Details",
        description: "Personal info, address & emergency contact",
        icon: User,
        statusField: "profileStatus" as const,
        readOnly: false,
    },
    {
        key: "bank" as StageKey,
        label: "Bank Details",
        description: "Account info for salary processing",
        icon: CreditCard,
        statusField: "bankStatus" as const,
        readOnly: false,
    },
    {
        key: "education" as StageKey,
        label: "Education",
        description: "Academic qualifications and certifications",
        icon: GraduationCap,
        statusField: "educationStatus" as const,
        readOnly: false,
    },
    {
        key: "experience" as StageKey,
        label: "Experience",
        description: "Work history and professional background",
        icon: Briefcase,
        statusField: "experienceStatus" as const,
        readOnly: false,
    },
    {
        key: "documents" as StageKey,
        label: "Documents",
        description: "Upload identity, education & employment documents",
        icon: FileText,
        statusField: "documentStatus" as const,
        readOnly: false,
    },
    {
        key: "induction" as StageKey,
        label: "Induction",
        description: "Orientation tasks and training completion",
        icon: ClipboardCheck,
        statusField: "inductionStatus" as const,
        readOnly: true,
    },
] as const;
const STAGE_TO_TAB: Record<StageKey, string> = {
    profile: "personal",
    bank: "bank",
    education: "education",
    experience: "experience",
    documents: "documents",
    induction: "induction",
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────


function buildProfileDetails(data: ProfileResponse | undefined): StageDetail[] {
    const p = data?.profile;
    const addr = data?.address;
    const ec = data?.emergencyContact;

    if (!p) return [];

    const profile = p as ProfileData & { pfNumber?: string };
    const address = (addr ?? {}) as Partial<AddressData>;
    const emergency = (ec ?? {}) as Partial<EmergencyContactData>;

    return [
        { label: "First Name", value: profile.firstName || null },
        { label: "Last Name", value: profile.lastName || null },
        { label: "Date of Birth", value: profile.dateOfBirth || null },
        { label: "Gender", value: profile.gender || null },
        { label: "Phone", value: profile.phone || null },
        { label: "Personal Email", value: profile.personalEmail || null },
        { label: "Aadhar Number", value: profile.aadharNumber || null },
        { label: "PAN Number", value: profile.panNumber || null },
        { label: "PF Number", value: profile.pfNumber || null },
        { label: "Blood Group", value: profile.bloodGroup || null },
        { label: "Marital Status", value: profile.maritalStatus || null },
        { label: "Nationality", value: profile.nationality || null },
        { label: "Current City", value: address.currentCity || null },
        { label: "Current State", value: address.currentState || null },
        { label: "Emergency Contact", value: emergency.name || null },
        { label: "Emergency Phone", value: emergency.phone || null },
    ];
}

function buildDocumentDetails(data: ProfileResponse | undefined): DocumentDetail[] {
    if (!data?.documents) return [];

    return data.documents.map((d) => {
        const doc = d as DocumentData & { status?: string; hrStatus?: string; hrRemark?: string };
        return {
            id: doc.id,
            name: doc.docType || doc.docCategory || "Document",
            fileName: doc.fileName || null,
            status: (doc.status || "pending") as "pending" | "in_progress" | "submitted" | "resubmitted",
            hrStatus: (doc.hrStatus || "pending") as "approved" | "rejected" | "pending",
            remarks: doc.remarks || doc.hrRemark || null,
            uploadedAt: doc.uploadedAt || null,
        };
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────


function buildEducationDetails(data?: ProfileResponse): EducationInfo[] {
    return (data?.education || []).map((e) => ({
        id: e.id,
        degree: e.degree || "",
        institution: e.institution || "",
        fieldOfStudy: e.fieldOfStudy || null,
        startDate: e.startDate || "",
        endDate: e.endDate || null,
        grade: e.grade || null,
        status: (e.status || "pending") as EducationInfo["status"],
        hrStatus: (e.hrStatus || "pending") as EducationInfo["hrStatus"],
        hrRemark: e.hrRemark || null,
    }));
}

function buildExperienceDetails(data?: ProfileResponse): ExperienceInfo[] {
    return (data?.experience || []).map((x) => ({
        id: x.id,
        companyName: x.companyName || "",
        designation: x.designation || "",
        fromDate: x.fromDate || "",
        toDate: x.toDate || null,
        currentlyWorking: x.currentlyWorking || false,
        responsibilities: x.responsibilities || null,
        status: (x.status || "pending") as ExperienceInfo["status"],
        hrStatus: (x.hrStatus || "pending") as ExperienceInfo["hrStatus"],
        hrRemark: x.hrRemark || null,
    }));
}

function buildBankDetails(data?: ProfileResponse): BankAccountInfo[] {
    return (data?.bankAccounts || []).map((b) => ({
        id: b.id,
        bankName: b.bankName || "",
        accountHolderName: b.accountHolderName || "",
        accountNumber: b.accountNumber || "",
        ifscCode: b.ifscCode || "",
        isPrimary: b.isPrimary || false,
        status: (b.status || "pending") as BankAccountInfo["status"],
        hrStatus: (b.hrStatus || "pending") as BankAccountInfo["hrStatus"],
        hrRemark: b.hrRemark || null,
    }));
}

function buildInductionTasks(data?: ProfileResponse): InductionTask[] {
    return (data?.inductionTasks || []).map((task) => ({
        id: task.id,
        name: task.taskName || "",
        type: (task.taskType === "AFTER" ? "AFTER" : "BEFORE") as InductionTask["type"],
        status: (task.status === "completed" ? "completed" : "pending") as InductionTask["status"],
        hrStatus: "pending" as const,
    }));
}

function WelcomeState({ onBegin }: { onBegin: () => void }) {
    const { data } = useOnboardingContext();
    const userName = data?.currentUser?.name?.split(" ")[0] || "there";

    return (
        <div
            className="relative overflow-hidden rounded-3xl border border-border/40 bg-background/70 backdrop-blur-xl shadow-xl shadow-black/[0.03]"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-primary/[0.02] pointer-events-none" />
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-primary/[0.04] blur-[80px] pointer-events-none" />

            <div className="relative px-6 py-10 sm:px-10 sm:py-14 flex flex-col items-center text-center max-w-lg mx-auto">
                <div className="relative mb-6">
                    <div className="rounded-2xl bg-primary/10 p-4">
                        <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <div
                        className="absolute -top-1 -right-1 rounded-full bg-emerald-100 dark:bg-emerald-900/50 p-1"
                    >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    </div>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Welcome, {userName}!</h2>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-8 max-w-sm">
                    Your onboarding journey starts here. Fill in your basic details, upload required documents, and you'll be all set.
                </p>

                <Button size="lg" onClick={onBegin} className="rounded-xl px-8 gap-2 text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow">
                    Begin Onboarding
                    <ArrowRight className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-6 mt-10 text-xs text-muted-foreground">
                    {STAGES_CONFIG.map((s, i) => (
                        <div key={s.key} className="flex items-center gap-1.5">
                            <span className="flex items-center justify-center h-5 w-5 rounded-full bg-muted text-[10px] font-bold">{i + 1}</span>
                            <span>{s.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Navigation Card (Assets / Support) — matches the closed stage-card styling
// ─────────────────────────────────────────────────────────────────────────────

function NavCard({
    label,
    description,
    icon: Icon,
    onClick,
}: {
    label: string;
    description: string;
    icon: LucideIcon;
    onClick: () => void;
}) {
    return (
        <div className="group/card">
            <button
                type="button"
                onClick={onClick}
                className={cn(
                    "w-full text-left rounded-2xl border border-border/50 transition-all duration-300 overflow-hidden",
                    "bg-background/70 backdrop-blur-sm shadow-sm hover:shadow-md hover:shadow-black/[0.04]",
                    "hover:border-primary/20",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1",
                    "p-5 sm:p-6"
                )}
            >
                <div className="flex items-start gap-4">
                    <div className="shrink-0 rounded-xl p-2.5 bg-muted/60">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-1">
                            <h3 className="text-sm sm:text-base font-semibold text-foreground group-hover/card:text-primary transition-colors duration-300 truncate">
                                {label}
                            </h3>
                            <ArrowRight className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">
                            {description}
                        </p>
                    </div>
                </div>
            </button>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function OnboardingView() {
    const { data } = useOnboardingContext();
    const navigate = useNavigate();
    const [expandedStage, setExpandedStage] = useState<StageKey | null>(null);

    const onboardingStatus = data?.onboardingStatus;
    const employeeCompleted = onboardingStatus?.employeeCompleted ?? false;

    // ── View state ─────────────────────────────────────────────────────────
    const viewState = useMemo(() => {
        if (data?.profileStatus === 'pending') return "welcome";
        // Show welcome state if profile hasn't been submitted yet
        if (onboardingStatus?.profileStatus === "pending" && !employeeCompleted) return "welcome";
        if (employeeCompleted) return "submitted";
        return "in_progress";
    }, [onboardingStatus, employeeCompleted, data?.profileStatus]);

    // ── Stage statuses ─────────────────────────────────────────────────────
    type StageStatusValue = "pending" | "submitted" | "resubmitted";

    const stageStatuses: Record<StageKey, StageStatusValue> = useMemo(
        () => ({
            profile: (onboardingStatus?.profileStatus as StageStatusValue) || "pending",
            documents: (onboardingStatus?.documentStatus as StageStatusValue) || "pending",
            bank: (onboardingStatus?.bankStatus as StageStatusValue) || "pending",
            education: (onboardingStatus?.educationStatus as StageStatusValue) || "pending",
            experience: (onboardingStatus?.experienceStatus as StageStatusValue) || "pending",
            induction: (onboardingStatus?.inductionStatus as StageStatusValue) || "pending",
        }),
        [onboardingStatus]
    );

    // ── Built data for stage cards ─────────────────────────────────────────
    const profileDetails = useMemo(() => buildProfileDetails(data), [data]);
    const documentDetails = useMemo(() => buildDocumentDetails(data), [data]);

    // ── Handlers ───────────────────────────────────────────────────────────

    const stagePath = (key: StageKey, viewOnly = false) =>
        "/profile/" + STAGE_TO_TAB[key] + (viewOnly ? "?mode=view" : "");

    const handleBeginOnboarding = () => {
        navigate(stagePath("profile"));
    };

    const handleToggleExpand = (key: StageKey) => {
        setExpandedStage(prev => (prev === key ? null : key));
    };

    // ── Welcome state ─────────────────────────────────────────────────────
    if (viewState === "welcome") {
        return (
            <div className="space-y-6">
                <ProfileHeader />
                <WelcomeState onBegin={handleBeginOnboarding} />
            </div>
        );
    }

    // ── Main dashboard ────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            <ProfileHeader />

            {/* Stage Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {STAGES_CONFIG.map((stage, index) => {
                    const stageStatus = stageStatuses[stage.key];

                    // Map rejection remarks from onboardingStatus
                    let rejection: string | null = null;
                    if (stage.key === "profile") rejection = onboardingStatus?.profileHrRemark ?? null;
                    else if (stage.key === "bank") rejection = onboardingStatus?.bankHrRemark ?? null;
                    else if (stage.key === "education") rejection = onboardingStatus?.educationHrRemark ?? null;
                    else if (stage.key === "experience") rejection = onboardingStatus?.experienceHrRemark ?? null;
                    else if (stage.key === "documents") rejection = onboardingStatus?.documentHrRemark ?? null;

                    // Derive HR approval status for the card UI
                    let approvalStatus: ApprovalStatus | undefined;
                    if (stage.key === "profile") approvalStatus = onboardingStatus?.profileHrStatus;
                    else if (stage.key === "bank") approvalStatus = onboardingStatus?.bankHrStatus;
                    else if (stage.key === "education") approvalStatus = onboardingStatus?.educationHrStatus;
                    else if (stage.key === "experience") approvalStatus = onboardingStatus?.experienceHrStatus;
                    else if (stage.key === "documents") approvalStatus = onboardingStatus?.documentHrStatus;
                    else if (stage.key === "induction") {
                        if (onboardingStatus?.inductionStatus === "submitted") {
                            approvalStatus = "pending";
                        }
                    }

                    // If stage is still pending by employee and not rejected by HR, don't show HR status
                    // This prevents showing "Approved" by default when no data exists
                    if (stageStatus === "pending" && approvalStatus !== "rejected" && stage.key !== "induction") {
                        approvalStatus = null;
                    }

                    return (
                        <OnboardingStageCard
                            key={stage.key}
                            stageKey={stage.key}
                            label={stage.label}
                            description={stage.description}
                            icon={stage.icon}
                            status={stageStatus}
                            approvalStatus={approvalStatus}
                            rejection={rejection ? { reason: rejection } : null}
                            readOnly={stage.readOnly}
                            isSubmitted={stageStatus === "submitted" || stageStatus === "resubmitted"}
                            index={index}
                            isExpanded={expandedStage === stage.key}
                            onToggleExpand={() => (stage.key === "induction" ? handleToggleExpand(stage.key) : navigate(stagePath(stage.key, approvalStatus === "approved")))}
                            onBeginFill={() => navigate(stagePath(stage.key))}
                            onEdit={() => navigate(stagePath(stage.key))}
                            onView={() => setExpandedStage(stage.key)}
                            details={stage.key === "profile" ? profileDetails : undefined}
                            documents={stage.key === "documents" ? documentDetails : undefined}
                            education={stage.key === "education" ? buildEducationDetails(data) : undefined}
                            experience={stage.key === "experience" ? buildExperienceDetails(data) : undefined}
                            bankAccounts={stage.key === "bank" ? buildBankDetails(data) : undefined}
                            inductionTasks={stage.key === "induction" ? buildInductionTasks(data) : undefined}
                        />
                    );
                })}
            </div>

            {/* Assets & Support — below the stage cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <NavCard
                    label="Assets"
                    description="Company assets assigned to you"
                    icon={Laptop}
                    onClick={() => navigate("/profile/assets")}
                />
                <NavCard
                    label="Support"
                    description="Raise and track complaints"
                    icon={MessageSquare}
                    onClick={() => navigate("/profile/support")}
                />
            </div>
        </div>
    );
}
