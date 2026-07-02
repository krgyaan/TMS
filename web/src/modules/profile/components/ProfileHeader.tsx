import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Mail,
  Phone,
  MapPin,
  Shield,
  BadgeCheck,
  Camera,
  Hash,
  Pencil,
  Briefcase,
  Building2,
  FileText,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  User,
  Heart,
  MapPinned,
  CreditCard,
  ArrowRight,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfileContext } from "../contexts/ProfileContext";
import { getInitials } from "../utils";
import { scaleIn } from "../animations";

interface ProfileHeaderProps {
  onEditProfile?: () => void;
  onUploadPhoto?: () => void;
  onNavigateToSection?: (section: string) => void;
}

// ─── Animated Counter ────────────────────────────────────────────────────────

const AnimatedNumber: React.FC<{ value: number; className?: string }> = ({
  value,
  className,
}) => (
  <motion.span
    key={value}
    initial={{ opacity: 0, y: 10, scale: 0.8 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ type: "spring", stiffness: 300, damping: 20 }}
    className={className}
  >
    {value}
  </motion.span>
);

// ─── Modern Progress Bar ─────────────────────────────────────────────────────

const SegmentedProgress: React.FC<{
  items: { id: string; done: boolean }[];
  className?: string;
}> = ({ items, className }) => {
  const total = items.length;
  const completed = items.filter((i) => i.done).length;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Progress track */}
      <div className="relative h-2 w-full rounded-full bg-muted/60 overflow-hidden">
        {/* Filled portion */}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-primary to-primary/80"
          initial={{ width: 0 }}
          animate={{ width: `${(completed / total) * 100}%` }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
        />
        {/* Segment dividers */}
        <div className="absolute inset-0 flex">
          {items.map((_, idx) =>
            idx < total - 1 ? (
              <div
                key={idx}
                className="flex-1 border-r-2 border-background/80"
              />
            ) : (
              <div key={idx} className="flex-1" />
            )
          )}
        </div>
        {/* Shine effect */}
        <motion.div
          className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{ x: ["-100%", "800%"] }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
            repeatDelay: 2,
          }}
        />
      </div>
      {/* Labels */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-muted-foreground/60">
          {completed} of {total} completed
        </span>
        <span
          className={cn(
            "text-[10px] font-bold",
            completed === total
              ? "text-emerald-500"
              : completed >= total * 0.7
              ? "text-primary"
              : "text-muted-foreground/60"
          )}
        >
          {Math.round((completed / total) * 100)}%
        </span>
      </div>
    </div>
  );
};

// ─── Checklist Item ──────────────────────────────────────────────────────────

const ChecklistItem: React.FC<{
  icon: React.ElementType;
  label: string;
  description: string;
  done: boolean;
  onAction?: () => void;
  index: number;
}> = ({ icon: Icon, label, description, done, onAction, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{
      delay: 0.04 * index,
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1],
    }}
    onClick={!done ? onAction : undefined}
    className={cn(
      "group relative flex items-center gap-3 rounded-2xl p-3.5 transition-all duration-300 border",
      done
        ? "bg-muted/20 border-border/30"
        : "bg-muted/40 border-border/50 hover:border-primary/30 hover:bg-muted/60 cursor-pointer hover:shadow-sm"
    )}
  >
    {/* Status icon */}
    <div className="relative flex-shrink-0">
      {done ? (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 15,
            delay: 0.08 * index,
          }}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/15"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        </motion.div>
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/8 border border-primary/10 group-hover:bg-primary/12 group-hover:border-primary/20 transition-colors">
          <Icon className="h-4 w-4 text-primary/70 group-hover:text-primary transition-colors" />
        </div>
      )}
    </div>

    {/* Content */}
    <div className="flex-1 min-w-0">
      <p
        className={cn(
          "text-xs font-semibold transition-colors",
          done
            ? "text-muted-foreground/40 line-through decoration-muted-foreground/20"
            : "text-foreground/90 group-hover:text-foreground"
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "text-[10px] mt-0.5 transition-colors leading-relaxed",
          done
            ? "text-muted-foreground/25"
            : "text-muted-foreground/55 group-hover:text-muted-foreground/70"
        )}
      >
        {description}
      </p>
    </div>

    {/* Action / Status */}
    {!done && (
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
          <ArrowRight className="h-3 w-3 text-primary" />
        </div>
      </div>
    )}

    {done && (
      <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-[0.15em] text-emerald-500/50">
        Done
      </span>
    )}
  </motion.div>
);

// ─── Main Component ──────────────────────────────────────────────────────────

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  onEditProfile,
  onUploadPhoto,
  onNavigateToSection,
}) => {
  const { data } = useProfileContext();
  const [checklistExpanded, setChecklistExpanded] = useState(true);

  if (!data) return null;

  const CURRENT_USER = (data.currentUser || {}) as any;
  const PROFILE = (data.profile || {}) as any;
  const EMPLOYEE_PROFILE = (data.employeeProfile || {}) as any;
  const ADDRESS = (data.address || {}) as any;
  const EMERGENCY_CONTACT = (data.emergencyContact || {}) as any;
  const DOCUMENTS = data.documents || [];
  const EDUCATION = data.education || [];
  const EXPERIENCE = data.experience || [];

  const fullName =
    [PROFILE.firstName, PROFILE.middleName, PROFILE.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || CURRENT_USER.name || "Employee";

  const initials = getInitials(fullName);

  const status = (
    EMPLOYEE_PROFILE?.employeeStatus || "pending"
  ).toLowerCase();

  const statusConfig: Record<string, { classes: string; label: string }> = {
    active: {
      classes:
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      label: "Active",
    },
    approved: {
      classes:
        "bg-primary/10 text-primary border-primary/20",
      label: "Approved",
    },
    in_progress: {
      classes:
        "bg-primary/10 text-primary border-primary/20",
      label: "In Progress",
    },
    rejected: {
      classes:
        "bg-destructive/10 text-destructive border-destructive/20",
      label: "Rejected",
    },
    pending: {
      classes:
        "bg-muted text-muted-foreground border-border",
      label: "Pending",
    },
  };

  const currentStatus = statusConfig[status] || statusConfig.pending;

  // ─── Checklist Definition ────────────────────────────────────────────────

  const checklistItems = [
    {
      id: "personal",
      icon: User,
      label: "Personal Information",
      description: "Name, DOB, gender, nationality",
      done: !!(PROFILE.firstName && PROFILE.dateOfBirth && PROFILE.gender),
      section: "personal",
    },
    {
      id: "contact",
      icon: Phone,
      label: "Contact Details",
      description: "Phone number, personal email",
      done: !!(PROFILE.phone && PROFILE.personalEmail),
      section: "personal",
    },
    {
      id: "address",
      icon: MapPinned,
      label: "Address Information",
      description: "Current & permanent address",
      done: !!(
        ADDRESS.currentAddressLine1 && ADDRESS.permanentAddressLine1
      ),
      section: "address",
    },
    {
      id: "emergency",
      icon: Heart,
      label: "Emergency Contact",
      description: "Name, relationship, phone",
      done: !!(
        EMERGENCY_CONTACT.name &&
        EMERGENCY_CONTACT.relationship &&
        EMERGENCY_CONTACT.phone
      ),
      section: "emergency",
    },
    {
      id: "identity",
      icon: Shield,
      label: "Identity Documents",
      description: "Aadhar number, PAN number",
      done: !!(PROFILE.aadharNumber || PROFILE.panNumber),
      section: "personal",
    },
    {
      id: "education",
      icon: GraduationCap,
      label: "Educational Qualifications",
      description: "Degree, institution, year",
      done: EDUCATION.length > 0,
      section: "education",
    },
    {
      id: "documents",
      icon: FileText,
      label: "Upload Documents",
      description: "ID proof, certificates, etc.",
      done: DOCUMENTS.length > 0,
      section: "documents",
    },
    {
      id: "bank",
      icon: CreditCard,
      label: "Bank & Financial Details",
      description: "Bank account, IFSC, UAN",
      done: !!(
        EMPLOYEE_PROFILE?.bankName && EMPLOYEE_PROFILE?.accountNumber
      ),
      section: "banking",
    },
  ];

  const completedCount = checklistItems.filter((i) => i.done).length;
  const totalCount = checklistItems.length;
  const completion = Math.round((completedCount / totalCount) * 100);
  const allDone = completedCount === totalCount;

  // ─── Info chips ──────────────────────────────────────────────────────────

  const infoChips = [
    {
      icon: Mail,
      label: "Email",
      value: CURRENT_USER.email || PROFILE.personalEmail || "—",
    },
    {
      icon: Phone,
      label: "Phone",
      value: PROFILE.phone || CURRENT_USER.mobile || "—",
    },
    {
      icon: MapPin,
      label: "Location",
      value:
        EMPLOYEE_PROFILE?.workLocation || ADDRESS?.currentCity || "—",
    },
    {
      icon: Hash,
      label: "ID",
      value: PROFILE?.employeeCode || CURRENT_USER?.username || "—",
      mono: true,
    },
  ];

  // ─── Stat cards ──────────────────────────────────────────────────────────

  const statCards = [
    {
      label: "Documents",
      value: DOCUMENTS.length,
      hint: DOCUMENTS.length ? "uploaded" : "pending",
      icon: FileText,
    },
    {
      label: "Education",
      value: EDUCATION.length,
      hint: EDUCATION.length ? "records" : "not added",
      icon: GraduationCap,
    },
    {
      label: "Experience",
      value: EXPERIENCE.length,
      hint: EXPERIENCE.length ? "records" : "optional",
      icon: Briefcase,
    },
    {
      label: "Verification",
      value:
        PROFILE?.aadharNumber || PROFILE?.panNumber ? "Ready" : "Pending",
      hint: "identity",
      icon: Shield,
      isReady: !!(PROFILE?.aadharNumber || PROFILE?.panNumber),
    },
  ];

  return (
    <motion.div variants={scaleIn}>
      <Card className="relative overflow-hidden rounded-3xl border border-border/50 shadow-xl shadow-black/[0.03] dark:shadow-black/[0.15] p-0 gap-0">
        {/* ─── Top Section: Profile Info ──────────────────────────────── */}
        <div className="relative bg-background">
          {/* Subtle background gradient */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-primary/[0.06] to-transparent" />
            <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-primary/[0.04] blur-[80px] -translate-y-1/3 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-primary/[0.03] blur-[60px] translate-y-1/3 -translate-x-1/4" />
          </div>

          <div className="relative px-6 sm:px-8 lg:px-10 pt-8 sm:pt-10 pb-8">
            <div className="flex flex-col xl:flex-row xl:items-start gap-8">
              {/* Left: Avatar + Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                  {/* Avatar */}
                  <div className="relative shrink-0 self-center sm:self-start">
                    <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 blur-xl" />
                    <Avatar className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-3xl border-4 border-background shadow-xl">
                      <AvatarImage src="" />
                      <AvatarFallback className="rounded-[calc(1.5rem-4px)] bg-gradient-to-br from-primary/10 to-primary/25 text-2xl sm:text-3xl font-black text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <button
                      type="button"
                      onClick={onUploadPhoto}
                      className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-xl border-2 border-background bg-background shadow-lg transition-all duration-200 hover:scale-105 hover:bg-primary hover:text-primary-foreground"
                    >
                      <Camera className="h-4 w-4" />
                    </button>

                    {status === "active" && (
                      <div className="absolute -top-1 -left-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-emerald-500 shadow-md">
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Name & Role */}
                  <div className="min-w-0 flex-1 text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em]",
                          currentStatus.classes
                        )}
                      >
                        <BadgeCheck className="mr-1 h-3 w-3" />
                        {currentStatus.label}
                      </Badge>
                      {CURRENT_USER?.team && (
                        <Badge
                          variant="outline"
                          className="rounded-full border-border/50 px-3 py-1 text-[10px] font-medium text-muted-foreground"
                        >
                          {CURRENT_USER.team}
                        </Badge>
                      )}
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground truncate">
                      {fullName}
                    </h1>

                    <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-foreground/85">
                        <Briefcase className="h-4 w-4 text-primary/60" />
                        {EMPLOYEE_PROFILE?.designation || "Designation"}
                      </span>
                      <span className="hidden sm:inline text-border">
                        •
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <Building2 className="h-4 w-4 text-muted-foreground/50" />
                        {EMPLOYEE_PROFILE?.department || "Department"}
                      </span>
                    </div>

                    {/* Info Chips */}
                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
                      {infoChips.map((item, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5 text-left transition-all duration-200 hover:border-border hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/8">
                              <item.icon className="h-3.5 w-3.5 text-primary/60" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground/50">
                                {item.label}
                              </p>
                              <p
                                className={cn(
                                  "truncate text-xs font-medium text-foreground/80",
                                  item.mono &&
                                    "font-mono text-[11px] tracking-wider"
                                )}
                              >
                                {item.value}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="w-full xl:w-[250px] space-y-3 flex-shrink-0">
                <div className="flex gap-2">
                  <Button
                    onClick={onEditProfile}
                    className="h-10 flex-1 rounded-xl font-semibold shadow-md shadow-primary/15 transition-all hover:shadow-lg hover:shadow-primary/20"
                  >
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    Edit Profile
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onUploadPhoto}
                    className="h-10 rounded-xl border-border/50 px-3"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="rounded-xl border border-border/40 bg-muted/25 px-3.5 py-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
                    <Shield className="h-3.5 w-3.5 text-primary/60" />
                    Keep details accurate
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground/60 leading-relaxed">
                    Updated info helps HR verify your onboarding faster.
                  </p>
                </div>
              </div>
            </div>

            {/* Stat Cards */}
            <div className="mt-7 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              {statCards.map((item, idx) => {
                const isReady = (item as any).isReady;
                return (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 * idx, duration: 0.3 }}
                    className="rounded-xl border border-border/50 bg-muted/25 p-3.5 transition-all duration-200 hover:bg-muted/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground/50">
                          {item.label}
                        </p>
                        <p className="mt-1 text-lg font-black tracking-tight text-foreground">
                          {item.value}
                        </p>
                        <p className="text-[10px] text-muted-foreground/50">
                          {item.hint}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl border",
                          isReady === false
                            ? "bg-destructive/8 border-destructive/15"
                            : isReady === true
                            ? "bg-emerald-500/8 border-emerald-500/15"
                            : "bg-primary/8 border-primary/12"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-4 w-4",
                            isReady === false
                              ? "text-destructive/60"
                              : isReady === true
                              ? "text-emerald-500/70"
                              : "text-primary/60"
                          )}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── Divider ───────────────────────────────────────────────────── */}
        <div className="h-px bg-border/60" />

        {/* ─── Bottom Section: Profile Completion Checklist ───────────── */}
        <div className="relative bg-muted/15">
          {/* Very subtle texture */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-primary/[0.02]" />
          </div>

          <div className="relative px-6 sm:px-8 lg:px-10 py-5">
            {/* Checklist Header */}
            <button
              onClick={() => setChecklistExpanded(!checklistExpanded)}
              className="w-full flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                {/* Completion percentage badge */}
                <div
                  className={cn(
                    "relative flex h-12 w-12 items-center justify-center rounded-2xl border transition-colors",
                    allDone
                      ? "bg-emerald-500/10 border-emerald-500/20"
                      : "bg-primary/8 border-primary/15"
                  )}
                >
                  <span
                    className={cn(
                      "text-sm font-black",
                      allDone ? "text-emerald-500" : "text-primary"
                    )}
                  >
                    <AnimatedNumber value={completion} />
                  </span>
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 text-[7px] font-bold",
                      allDone ? "text-emerald-500/60" : "text-primary/50"
                    )}
                  >
                    %
                  </span>
                </div>

                <div className="text-left">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-sm font-bold text-foreground">
                      Profile Completion
                    </h3>
                    {allDone ? (
                      <Badge
                        variant="outline"
                        className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5"
                      >
                        <Sparkles className="h-2.5 w-2.5 mr-1" />
                        Complete
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="rounded-full border-border/50 text-[9px] font-semibold text-muted-foreground px-2 py-0.5"
                      >
                        {completedCount}/{totalCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    {allDone
                      ? "Ready for HR verification"
                      : `${totalCount - completedCount} item${
                          totalCount - completedCount > 1 ? "s" : ""
                        } remaining`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Inline segmented progress (desktop) */}
                <div className="hidden md:block w-48">
                  <div className="flex items-center gap-[3px]">
                    {checklistItems.map((item, idx) => (
                      <motion.div
                        key={item.id}
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{
                          delay: 0.04 * idx,
                          duration: 0.3,
                        }}
                        className={cn(
                          "h-2 flex-1 rounded-full transition-colors duration-500",
                          item.done
                            ? "bg-emerald-500/70"
                            : "bg-border/60"
                        )}
                      />
                    ))}
                  </div>
                </div>

                <motion.div
                  animate={{
                    rotate: checklistExpanded ? 180 : 0,
                  }}
                  transition={{
                    duration: 0.3,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/50 bg-muted/40 group-hover:bg-muted/60 transition-colors"
                >
                  <ChevronDown className="h-4 w-4 text-muted-foreground/60" />
                </motion.div>
              </div>
            </button>

            {/* Expanded Checklist */}
            <AnimatePresence>
              {checklistExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{
                    duration: 0.4,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="overflow-hidden"
                >
                  <div className="pt-5 mt-4 border-t border-border/40">
                    {/* Full-width progress bar */}
                    <SegmentedProgress
                      items={checklistItems}
                      className="mb-5"
                    />

                    {/* Checklist grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {checklistItems.map((item, idx) => (
                        <ChecklistItem
                          key={item.id}
                          icon={item.icon}
                          label={item.label}
                          description={item.description}
                          done={item.done}
                          index={idx}
                          onAction={() =>
                            onNavigateToSection?.(item.section)
                          }
                        />
                      ))}
                    </div>

                    {/* Bottom contextual message */}
                    {!allDone && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="mt-4 flex items-center gap-3 rounded-xl bg-primary/[0.05] border border-primary/10 px-4 py-3"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                          <Zap className="h-4 w-4 text-primary/70" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground/80">
                            Complete all items for faster HR
                            approval
                          </p>
                          <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                            Fully completed profiles are
                            prioritized during verification
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={onEditProfile}
                          className="h-8 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 gap-1 flex-shrink-0"
                        >
                          Continue
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </motion.div>
                    )}

                    {allDone && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="mt-4 flex items-center gap-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15 px-4 py-3"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 flex-shrink-0">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            Profile complete — HR will review
                            shortly
                          </p>
                          <p className="text-[10px] text-emerald-600/50 dark:text-emerald-400/40 mt-0.5">
                            You'll be notified once
                            verification is done
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};