import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  FileText,
  ClipboardCheck,
  CheckCircle2,
  Clock,
  XCircle,
  Send,
  Sparkles,
  ArrowRight,
  Shield,
  Loader2,
  CreditCard,
  GraduationCap,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useProfileContext } from "../../contexts/ProfileContext";
import api from "@/lib/axios";
import type { OnboardingStatus, ProfileResponse } from "../../types";
import { OnboardingStageCard, type StageDetail, type DocumentDetail, type InductionTask } from "./OnboardingStageCard";
import { OnboardingProgressBar, type ProgressStage } from "./OnboardingProgressBar";
import { OnboardingProfileForm } from "./OnboardingProfileForm";
import { OnboardingEducationForm } from "./OnboardingEducationForm";
import { OnboardingExperienceForm } from "./OnboardingExperienceForm";
import { OnboardingBankForm } from "./OnboardingBankForm";
import { DocumentsSection } from "../DocumentsSection";

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

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getBannerConfig(onboardingStatus: OnboardingStatus) {
  const { status, employeeCompleted } = onboardingStatus;

  if (status === "rejected") {
    return {
      bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50",
      iconBg: "bg-red-100 dark:bg-red-900/50",
      iconColor: "text-red-600 dark:text-red-400",
      textColor: "text-red-800 dark:text-red-200",
      subtextColor: "text-red-600/80 dark:text-red-400/70",
      icon: XCircle,
      title: "Action Required",
      description: "Some of your submitted details need corrections. Please review and re-submit.",
    };
  }

  if (employeeCompleted && status !== "fully_completed") {
    return {
      bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50",
      iconBg: "bg-blue-100 dark:bg-blue-900/50",
      iconColor: "text-blue-600 dark:text-blue-400",
      textColor: "text-blue-800 dark:text-blue-200",
      subtextColor: "text-blue-600/80 dark:text-blue-400/70",
      icon: Shield,
      title: "Submitted For Review",
      description: "Your onboarding details are being reviewed by HR. You'll be notified once approved.",
    };
  }

  if (!employeeCompleted) {
    return {
      bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50",
      iconBg: "bg-amber-100 dark:bg-amber-900/50",
      iconColor: "text-amber-600 dark:text-amber-400",
      textColor: "text-amber-800 dark:text-amber-200",
      subtextColor: "text-amber-600/80 dark:text-amber-400/70",
      icon: Sparkles,
      title: "Please Complete the Onboarding Details",
      description: "Please complete all the stages",
    };
  }

  return {
    bg: "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/50",
    iconBg: "bg-indigo-100 dark:bg-indigo-900/50",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    textColor: "text-indigo-800 dark:text-indigo-200",
    subtextColor: "text-indigo-600/80 dark:text-indigo-400/70",
    icon: Sparkles,
    title: "Onboarding In Progress",
    description: "Complete the remaining sections below and submit for HR review.",
  };
}

function buildProfileDetails(data: any): StageDetail[] {
  const p = data?.profile;
  const addr = data?.address;
  const ec = data?.emergencyContact;

  if (!p) return [];

  return [
    { label: "First Name", value: p.firstName || null },
    { label: "Last Name", value: p.lastName || null },
    { label: "Date of Birth", value: p.dateOfBirth || null },
    { label: "Gender", value: p.gender || null },
    { label: "Phone", value: p.phone || null },
    { label: "Personal Email", value: p.personalEmail || null },
    { label: "Aadhar Number", value: p.aadharNumber || null },
    { label: "PAN Number", value: p.panNumber || null },
    { label: "Blood Group", value: p.bloodGroup || null },
    { label: "Marital Status", value: p.maritalStatus || null },
    { label: "Nationality", value: p.nationality || null },
    { label: "Current City", value: addr?.currentCity || null },
    { label: "Current State", value: addr?.currentState || null },
    { label: "Emergency Contact", value: ec?.name || null },
    { label: "Emergency Phone", value: ec?.phone || null },
  ];
}

function buildDocumentDetails(data: any): DocumentDetail[] {
  if (!data?.documents) return [];

  return data.documents.map((d: any) => ({
    id: d.id,
    name: d.docType || d.docCategory || "Document",
    fileName: d.fileName || null,
    status: d.verificationStatus === "verified" ? "verified" : d.verificationStatus === "rejected" ? "rejected" : "pending",
    remarks: d.remarks || null,
    uploadedAt: d.uploadedAt || null,
  }));
}

const buildBankDetails = (data: any): StageDetail[] => {
  if (!data?.bankAccounts || data.bankAccounts.length === 0) return [];
  const primaryBank = data.bankAccounts.find((b: any) => b.isPrimary) || data.bankAccounts[0];
  const details: StageDetail[] = [];

  if (primaryBank.bankName) details.push({ label: "Bank Name", value: primaryBank.bankName });
  if (primaryBank.accountNumber) details.push({ label: "Account Number", value: `•••• ${primaryBank.accountNumber.slice(-4)}` });
  
  if (data.bankAccounts.length > 1) {
    details.push({ label: "Total Accounts", value: String(data.bankAccounts.length) });
  }

  return details;
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function OnboardingBanner({ 
  onboardingStatus,
  onFillProfile 
}: { 
  onboardingStatus: OnboardingStatus;
  onFillProfile?: () => void;
}) {
  const config = getBannerConfig(onboardingStatus);
  const BannerIcon = config.icon;
  const isProfileIncomplete = onboardingStatus.profileStatus === 'pending' || onboardingStatus.profileStatus === 'in_progress';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border p-4 sm:p-5",
        config.bg
      )}
    >
      <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.04] pointer-events-none">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="80" cy="20" r="60" fill="currentColor" />
        </svg>
      </div>

      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className={cn("shrink-0 rounded-xl p-2.5", config.iconBg)}>
            <BannerIcon className={cn("h-5 w-5", config.iconColor)} />
          </div>
          <div className="min-w-0">
            <h3 className={cn("text-sm sm:text-base font-semibold", config.textColor)}>
              {config.title}
            </h3>
            <p className={cn("text-xs sm:text-sm mt-0.5 leading-relaxed", config.subtextColor)}>
              {config.description}
            </p>
          </div>
        </div>

        {onFillProfile && isProfileIncomplete && (
          <Button 
            size="sm" 
            onClick={onFillProfile}
            className="rounded-xl px-6 h-9 sm:h-10 text-xs sm:text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all shrink-0"
          >
            {onboardingStatus.profileStatus === 'rejected' ? 'Re-fill Profile Details' : 'Fill Profile Details'}
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function OnboardingHeader() {
  const { data } = useProfileContext();
  const user = data?.currentUser;

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 mb-6"
    >
      <div className="relative shrink-0">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
          <span className="text-lg font-bold text-primary">
            {user.name?.charAt(0)?.toUpperCase() || "?"}
          </span>
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-amber-400 border-2 border-background" />
      </div>
      <div className="min-w-0">
        <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">
          {user.name}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground truncate">
          {user.email} · {user.team}
        </p>
      </div>
    </motion.div>
  );
}

function WelcomeState({ onBegin }: { onBegin: () => void }) {
  const { data } = useProfileContext();
  const userName = data?.currentUser?.name?.split(" ")[0] || "there";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-3xl border border-border/40 bg-background/70 backdrop-blur-xl shadow-xl shadow-black/[0.03]"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-primary/[0.02] pointer-events-none" />
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-primary/[0.04] blur-[80px] pointer-events-none" />

      <div className="relative px-6 py-10 sm:px-10 sm:py-14 flex flex-col items-center text-center max-w-lg mx-auto">
        <div className="relative mb-6">
          <div className="rounded-2xl bg-primary/10 p-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <motion.div
            className="absolute -top-1 -right-1 rounded-full bg-emerald-100 dark:bg-emerald-900/50 p-1"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          </motion.div>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
          Welcome, {userName}!
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-8 max-w-sm">
          Your onboarding journey starts here. Fill in your basic details,
          upload required documents, and you'll be all set.
        </p>

        <Button
          size="lg"
          onClick={onBegin}
          className="rounded-xl px-8 gap-2 text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow"
        >
          Begin Onboarding
          <ArrowRight className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-6 mt-10 text-xs text-muted-foreground">
          {STAGES_CONFIG.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1.5">
              <span className="flex items-center justify-center h-5 w-5 rounded-full bg-muted text-[10px] font-bold">
                {i + 1}
              </span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function OnboardingView() {
  const { data, refetch } = useProfileContext();
  const [expandedStage, setExpandedStage] = useState<StageKey | null>(null);
  const [editingStage, setEditingStage] = useState<StageKey | null>(null);

  const onboardingStatus = data?.onboardingStatus;
  const employeeCompleted = onboardingStatus?.employeeCompleted ?? false;

  // ── View state ─────────────────────────────────────────────────────────
  const viewState = useMemo(() => {
    if (!onboardingStatus) return "welcome";
    // Show welcome state if profile hasn't been submitted yet
    if (onboardingStatus.profileStatus === "pending" && !employeeCompleted) return "welcome";
    if (employeeCompleted) return "submitted";
    return "in_progress";
  }, [onboardingStatus, employeeCompleted]);

  // ── Stage statuses ─────────────────────────────────────────────────────
  type StageStatusValue = "pending" | "submitted";

  const stageStatuses: Record<StageKey, StageStatusValue> = useMemo(() => ({
    profile: (onboardingStatus?.profileStatus as StageStatusValue) || "pending",
    documents: (onboardingStatus?.documentStatus as StageStatusValue) || "pending",
    bank: (onboardingStatus?.bankStatus as StageStatusValue) || "pending",
    education: (onboardingStatus?.educationStatus as StageStatusValue) || "pending",
    experience: (onboardingStatus?.experienceStatus as StageStatusValue) || "pending",
    induction: (onboardingStatus?.inductionStatus as StageStatusValue) || "pending",
  }), [onboardingStatus]);

  // ── Progress bar stages ────────────────────────────────────────────────
  const progressStages: ProgressStage[] = useMemo(() =>
    STAGES_CONFIG.map(s => ({
      key: s.key,
      label: s.label,
      status: stageStatuses[s.key],
      icon: s.icon,
    })),
    [stageStatuses]
  );

  // ── Built data for stage cards ─────────────────────────────────────────
  const profileDetails = useMemo(() => buildProfileDetails(data), [data]);
  const documentDetails = useMemo(() => buildDocumentDetails(data), [data]);
  const bankDetailsSummary = useMemo(() => buildBankDetails(data), [data]);


  // ── Handlers ───────────────────────────────────────────────────────────

  const handleBeginOnboarding = () => {
    setEditingStage("profile");
  };

  const handleToggleExpand = (key: StageKey) => {
    setExpandedStage(prev => (prev === key ? null : key));
  };

  const handleCloseForm = () => {
    setEditingStage(null);
    refetch?.();
  };

  // ── Render Editing Mode ───────────────────────────────────────────────
  if (editingStage === "profile") {
    return (
      <div className="space-y-6">
        <OnboardingHeader />
        <div className="rounded-3xl border border-border/40 bg-background/50 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
           <div className="flex items-center justify-between mb-8">
             <div>
               <h2 className="text-2xl font-bold text-foreground">Profile Details</h2>
               <p className="text-muted-foreground mt-1 text-sm">Please provide your personal and professional information</p>
             </div>
             <Button variant="ghost" onClick={() => setEditingStage(null)} className="rounded-xl">
               Back to Dashboard
             </Button>
           </div>
           
           <OnboardingProfileForm 
             onCancel={() => setEditingStage(null)} 
             onSuccess={handleCloseForm} 
           />
        </div>
      </div>
    );
  }

  if (editingStage === "bank") {
    return (
      <div className="space-y-6">
        <OnboardingHeader />
        <div className="rounded-3xl border border-border/40 bg-background/50 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
           <div className="flex items-center justify-between mb-8">
             <div>
               <h2 className="text-2xl font-bold text-foreground">Bank Details</h2>
               <p className="text-muted-foreground mt-1 text-sm">Please provide your bank account information for salary processing</p>
             </div>
             <Button variant="ghost" onClick={() => setEditingStage(null)} className="rounded-xl">
               Back to Dashboard
             </Button>
           </div>
           
            <OnboardingBankForm 
              onCancel={() => setEditingStage(null)} 
              onSuccess={handleCloseForm} 
            />
        </div>
      </div>
    );
  }

  if (editingStage === "education") {
    return (
      <div className="space-y-6">
        <OnboardingHeader />
        <div className="rounded-3xl border border-border/40 bg-background/50 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
           <div className="flex items-center justify-between mb-8">
             <div>
               <h2 className="text-2xl font-bold text-foreground">Education Details</h2>
               <p className="text-muted-foreground mt-1 text-sm">Please provide your academic details</p>
             </div>
             <Button variant="ghost" onClick={() => setEditingStage(null)} className="rounded-xl">
               Back to Dashboard
             </Button>
           </div>
           
           <OnboardingEducationForm 
             onCancel={() => setEditingStage(null)} 
             onSuccess={handleCloseForm} 
           />
        </div>
      </div>
    );
  }

  if (editingStage === "experience") {
    return (
      <div className="space-y-6">
        <OnboardingHeader />
        <div className="rounded-3xl border border-border/40 bg-background/50 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
           <div className="flex items-center justify-between mb-8">
             <div>
               <h2 className="text-2xl font-bold text-foreground">Work Experience</h2>
               <p className="text-muted-foreground mt-1 text-sm">Please provide your previous employment history</p>
             </div>
             <Button variant="ghost" onClick={() => setEditingStage(null)} className="rounded-xl">
               Back to Dashboard
             </Button>
           </div>
           
           <OnboardingExperienceForm 
             onCancel={() => setEditingStage(null)} 
             onSuccess={handleCloseForm} 
           />
        </div>
      </div>
    );
  }

  if (editingStage === "documents") {
    return (
      <div className="space-y-6">
        <OnboardingHeader />
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Documents</h2>
            <p className="text-muted-foreground mt-1 text-sm">Upload required identity and academic documents</p>
          </div>
          <Button variant="ghost" onClick={() => setEditingStage(null)} className="rounded-xl">
            Back to Dashboard
          </Button>
        </div>
        <DocumentsSection />
      </div>
    );
  }

  // ── Welcome state ─────────────────────────────────────────────────────
  if (viewState === "welcome" && expandedStage === null && editingStage === null) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        <OnboardingHeader />
        <WelcomeState onBegin={handleBeginOnboarding} />
      </motion.div>
    );
  }

  // ── Main dashboard ────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <OnboardingHeader />

      {onboardingStatus && (
        <OnboardingBanner 
          onboardingStatus={onboardingStatus} 
          onFillProfile={() => setEditingStage("profile")}
        />
      )}

      {/* Progress Section */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl border border-border/40 bg-background/70 backdrop-blur-sm p-5 sm:p-6 shadow-sm"
      >
        <OnboardingProgressBar
          progress={onboardingStatus?.progress ?? 0}
          stages={progressStages}
        />
      </motion.div>

      {/* Stage Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {STAGES_CONFIG.map((stage, index) => {
          const stageStatus = stageStatuses[stage.key];
          
          // Map rejection remarks from onboardingStatus
          let rejection: string | null = null;
          if (stage.key === 'profile') rejection = onboardingStatus.profileHrRemark ?? null;
          else if (stage.key === 'bank') rejection = onboardingStatus.bankHrRemark ?? null;
          else if (stage.key === 'education') rejection = onboardingStatus.educationHrRemark ?? null;
          else if (stage.key === 'experience') rejection = onboardingStatus.experienceHrRemark ?? null;
          else if (stage.key === 'documents') rejection = onboardingStatus.documentHrRemark ?? null;
          
          // Derive HR approval status for the card UI
          let approvalStatus: "pending" | "approved" | "rejected" | null = null;
          if (stage.key === 'profile') approvalStatus = onboardingStatus.profileHrStatus;
          else if (stage.key === 'bank') approvalStatus = onboardingStatus.bankHrStatus;
          else if (stage.key === 'education') approvalStatus = onboardingStatus.educationHrStatus;
          else if (stage.key === 'experience') approvalStatus = onboardingStatus.experienceHrStatus;
          else if (stage.key === 'documents') approvalStatus = onboardingStatus.documentHrStatus;
          else if (stage.key === 'induction') {
            if (onboardingStatus.inductionStatus === 'submitted') {
              approvalStatus = 'pending';
            }
          }

          // If stage is still pending by employee and not rejected by HR, don't show HR status
          // This prevents showing "Approved" by default when no data exists
          if (stageStatus === 'pending' && approvalStatus !== 'rejected' && stage.key !== 'induction') {
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
              rejection={rejection}
              readOnly={stage.readOnly}
              isSubmitted={stageStatus === 'submitted' || stageStatus === 'approved'}
              index={index}
              isExpanded={expandedStage === stage.key}
              onToggleExpand={() => handleToggleExpand(stage.key)}
              onBeginFill={() => setEditingStage(stage.key)}
              onEdit={() => setEditingStage(stage.key)}
              onView={() => setExpandedStage(stage.key)}
              details={
                stage.key === "profile" 
                  ? profileDetails 
                  : stage.key === "bank" 
                    ? bankDetailsSummary 
                    : undefined
              }
              documents={stage.key === "documents" ? documentDetails : undefined}
              education={stage.key === "education" ? data?.education || [] : undefined}
              experience={stage.key === "experience" ? data?.experience || [] : undefined}
              bankAccounts={stage.key === "bank" ? data?.bankAccounts || [] : undefined}
              inductionTasks={stage.key === "induction" ? data?.inductionTasks || [] : undefined}
            />
          );
        })}
      </div>

    </motion.div>
  );
}