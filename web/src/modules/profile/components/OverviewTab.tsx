// OverviewTab.tsx
import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  Calendar,
  Shield,
  Briefcase,
  Heart,
  Globe,
  MapPinned,
  Clock,
  CheckCircle2,
  Pencil,
  CreditCard,
  Hash,
  GraduationCap,
  Building,
  Plus,
  Trash2,
  Save,
  X,
  ChevronRight,
  AlertCircle,
  FileText,
  ArrowUpRight,
  Sparkles,
  Eye,
  EyeOff,
  Loader2,
  Check,
  Info,
  TrendingUp,
  Zap,
  BookOpen,
  Award,
  ExternalLink,
  Linkedin,
  Droplets,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfileContext } from "../contexts/ProfileContext";
import { formatDate } from "../utils";
import { GlassCard } from "./GlassCard";
import { tabContentVariants, staggerContainer, fadeInUp } from "../animations";
import api from "@/lib/axios";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface OverviewTabProps {
  setActiveTab: (tab: string) => void;
}

// ─── Animated Section Wrapper ────────────────────────────────────────────────

const SectionMotion: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}> = ({ children, className, delay = 0 }) => (
  <motion.div
    variants={fadeInUp}
    className={className}
    custom={delay}
  >
    {children}
  </motion.div>
);

// ─── Modern Info Display ─────────────────────────────────────────────────────

const InfoField: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  masked?: boolean;
  className?: string;
  compact?: boolean;
}> = ({ icon: Icon, label, value, mono, masked, className, compact }) => {
  const [revealed, setRevealed] = useState(false);

  const displayValue = value || "—";
  const shouldMask = masked && value && !revealed;
  const maskedValue = shouldMask
    ? value.slice(0, 2) + "•".repeat(Math.max(0, value.length - 4)) + value.slice(-2)
    : displayValue;

  if (compact) {
    return (
      <div className={cn("flex items-center justify-between py-2 group", className)}>
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-muted-foreground/50" />
          <span className="text-xs text-muted-foreground/70">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "text-xs font-medium text-foreground",
              mono && "font-mono tracking-wide text-[11px]",
              !value && "text-muted-foreground/40 italic"
            )}
          >
            {maskedValue}
          </span>
          {masked && value && (
            <button
              onClick={() => setRevealed(!revealed)}
              className="p-0.5 rounded hover:bg-muted/50 transition-colors"
            >
              {revealed ? (
                <EyeOff className="h-3 w-3 text-muted-foreground/40" />
              ) : (
                <Eye className="h-3 w-3 text-muted-foreground/40" />
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 p-3.5 rounded-2xl",
        "bg-gradient-to-br from-muted/30 to-muted/10",
        "border border-border/40 hover:border-border/60",
        "transition-all duration-300 hover:shadow-sm",
        className
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        <div className="h-8 w-8 rounded-xl bg-primary/8 flex items-center justify-center group-hover:bg-primary/12 transition-colors">
          <Icon className="h-3.5 w-3.5 text-primary/70" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground/60 mb-0.5">
          {label}
        </p>
        <p
          className={cn(
            "text-sm font-medium text-foreground truncate",
            mono && "font-mono tracking-wide text-xs",
            !value && "text-muted-foreground/40 italic"
          )}
        >
          {maskedValue}
        </p>
      </div>
      {masked && value && (
        <button
          onClick={() => setRevealed(!revealed)}
          className="flex-shrink-0 mt-1 p-1 rounded-lg hover:bg-muted/50 transition-colors"
        >
          {revealed ? (
            <EyeOff className="h-3.5 w-3.5 text-muted-foreground/50" />
          ) : (
            <Eye className="h-3.5 w-3.5 text-muted-foreground/50" />
          )}
        </button>
      )}
    </div>
  );
};

// ─── Section Header ──────────────────────────────────────────────────────────

const ModernSectionHeader: React.FC<{
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: "default" | "success" | "warning" | "info";
  action?: React.ReactNode;
  compact?: boolean;
}> = ({ icon: Icon, title, subtitle, badge, badgeVariant = "default", action, compact }) => {
  const badgeColors = {
    default: "bg-muted/50 text-muted-foreground border-border/50",
    success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    info: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center border border-primary/10">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground tracking-tight">{title}</h3>
            {badge && (
              <span className={cn("text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border", badgeColors[badgeVariant])}>
                {badge}
              </span>
            )}
          </div>
        </div>
        {action}
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between mb-5">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shadow-sm border border-primary/10">
          <Icon className="h-4.5 w-4.5 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-foreground tracking-tight">{title}</h3>
            {badge && (
              <span className={cn("text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border", badgeColors[badgeVariant])}>
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground/60 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
};

// ─── Edit Button ─────────────────────────────────────────────────────────────

const EditButton: React.FC<{ onClick: () => void; label?: string }> = ({
  onClick,
  label = "Edit",
}) => (
  <Button
    variant="ghost"
    size="sm"
    onClick={onClick}
    className="rounded-xl text-primary font-semibold h-8 text-xs hover:bg-primary/8 gap-1.5 transition-all"
  >
    <Pencil className="h-3 w-3" />
    {label}
  </Button>
);

// ─── Completion Ring ─────────────────────────────────────────────────────────

const CompletionRing: React.FC<{
  percentage: number;
  size?: number;
  strokeWidth?: number;
}> = ({ percentage, size = 80, strokeWidth = 6 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--primary) / 0.6)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-lg font-black text-foreground tracking-tight"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {percentage}%
        </motion.span>
        <span className="text-[8px] uppercase tracking-[0.15em] font-semibold text-muted-foreground/50">
          Done
        </span>
      </div>
    </div>
  );
};

// ─── Personal Info Edit Dialog ───────────────────────────────────────────────

const PersonalInfoDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  data: any;
  onSave: (data: any) => Promise<void>;
  saving: boolean;
  isOnboarding?: boolean;
}> = ({ open, onClose, data, onSave, saving, isOnboarding = true }) => {
  const [form, setForm] = useState({
    firstName: data?.firstName || "",
    middleName: data?.middleName || "",
    lastName: data?.lastName || "",
    dateOfBirth: data?.dateOfBirth || "",
    gender: data?.gender || "",
    maritalStatus: data?.maritalStatus || "",
    nationality: data?.nationality || "",
    personalEmail: data?.personalEmail || "",
    phone: data?.phone || "",
    alternatePhone: data?.alternatePhone || "",
    aadharNumber: data?.aadharNumber || "",
    panNumber: data?.panNumber || "",
    bloodGroup: data?.bloodGroup || "",
    linkedinProfile: data?.linkedinProfile || "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev: typeof form) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border-border/50 p-0">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/30 px-6 py-5 rounded-t-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              Personal Information
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground/60">
              {isOnboarding 
                ? "Update your personal details. Fields marked with * are required."
                : "Your profile is verified. Only LinkedIn profile can be updated."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground/50 mb-3">
              Full Name
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                  className="rounded-xl h-10 border-border/50 focus:border-primary/50 bg-muted/20"
                  placeholder="John"
                  disabled={!isOnboarding}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Middle Name
                </Label>
                <Input
                  value={form.middleName}
                  onChange={(e) => handleChange("middleName", e.target.value)}
                  className="rounded-xl h-10 border-border/50 focus:border-primary/50 bg-muted/20"
                  placeholder="—"
                  disabled={!isOnboarding}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                  className="rounded-xl h-10 border-border/50 focus:border-primary/50 bg-muted/20"
                  placeholder="Doe"
                  disabled={!isOnboarding}
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground/50 mb-3">
              Personal Details
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Date of Birth <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => handleChange("dateOfBirth", e.target.value)}
                  className="rounded-xl h-10 border-border/50 focus:border-primary/50 bg-muted/20"
                  disabled={!isOnboarding}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Gender <span className="text-destructive">*</span>
                </Label>
                <Select disabled={!isOnboarding} value={form.gender} onValueChange={(v) => handleChange("gender", v)}>
                  <SelectTrigger className="rounded-xl h-10 border-border/50 bg-muted/20">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Marital Status <span className="text-destructive">*</span>
                </Label>
                <Select disabled={!isOnboarding} value={form.maritalStatus} onValueChange={(v) => handleChange("maritalStatus", v)}>
                  <SelectTrigger className="rounded-xl h-10 border-border/50 bg-muted/20">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Single">Single</SelectItem>
                    <SelectItem value="Married">Married</SelectItem>
                    <SelectItem value="Divorced">Divorced</SelectItem>
                    <SelectItem value="Widowed">Widowed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Nationality <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.nationality}
                  onChange={(e) => handleChange("nationality", e.target.value)}
                  className="rounded-xl h-10 border-border/50 focus:border-primary/50 bg-muted/20"
                  placeholder="Indian"
                  disabled={!isOnboarding}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Blood Group</Label>
                <Select disabled={!isOnboarding} value={form.bloodGroup} onValueChange={(v) => handleChange("bloodGroup", v)}>
                  <SelectTrigger className="rounded-xl h-10 border-border/50 bg-muted/20">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                      <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">LinkedIn</Label>
                <Input
                  value={form.linkedinProfile}
                  onChange={(e) => handleChange("linkedinProfile", e.target.value)}
                  className="rounded-xl h-10 border-border/50 focus:border-primary/50 bg-muted/20"
                  placeholder="linkedin.com/in/username"
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground/50 mb-3">
              Contact Information
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Personal Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="email"
                  value={form.personalEmail}
                  onChange={(e) => handleChange("personalEmail", e.target.value)}
                  className="rounded-xl h-10 border-border/50 focus:border-primary/50 bg-muted/20"
                  disabled={!isOnboarding}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Phone <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  className="rounded-xl h-10 border-border/50 focus:border-primary/50 bg-muted/20"
                  disabled={!isOnboarding}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Alternate Phone</Label>
                <Input
                  value={form.alternatePhone}
                  onChange={(e) => handleChange("alternatePhone", e.target.value)}
                  className="rounded-xl h-10 border-border/50 focus:border-primary/50 bg-muted/20"
                  disabled={!isOnboarding}
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground/50 mb-3">
              Identity Documents
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Aadhar Number</Label>
                <Input
                  value={form.aadharNumber}
                  onChange={(e) => handleChange("aadharNumber", e.target.value)}
                  className="rounded-xl h-10 border-border/50 focus:border-primary/50 bg-muted/20 font-mono"
                  placeholder="XXXX XXXX XXXX"
                  disabled={!isOnboarding}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">PAN Number</Label>
                <Input
                  value={form.panNumber}
                  onChange={(e) => handleChange("panNumber", e.target.value.toUpperCase())}
                  className="rounded-xl h-10 border-border/50 focus:border-primary/50 bg-muted/20 font-mono"
                  placeholder="ABCDE1234F"
                  disabled={!isOnboarding}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-background/95 backdrop-blur-xl border-t border-border/30 px-6 py-4 rounded-b-3xl">
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={onClose} className="rounded-xl" disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={() => onSave(form)}
              disabled={saving || !form.firstName || !form.lastName}
              className="rounded-xl gap-2 min-w-[120px]"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Address Edit Dialog ─────────────────────────────────────────────────────

const AddressDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  data: any;
  onSave: (data: any) => Promise<void>;
  saving: boolean;
}> = ({ open, onClose, data, onSave, saving }) => {
  const [sameAsCurrent, setSameAsCurrent] = useState(false);
  const [form, setForm] = useState({
    currentAddressLine1: data?.currentAddressLine1 || "",
    currentAddressLine2: data?.currentAddressLine2 || "",
    currentCity: data?.currentCity || "",
    currentState: data?.currentState || "",
    currentCountry: data?.currentCountry || "",
    currentPostalCode: data?.currentPostalCode || "",
    permanentAddressLine1: data?.permanentAddressLine1 || "",
    permanentAddressLine2: data?.permanentAddressLine2 || "",
    permanentCity: data?.permanentCity || "",
    permanentState: data?.permanentState || "",
    permanentCountry: data?.permanentCountry || "",
    permanentPostalCode: data?.permanentPostalCode || "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev: typeof form) => {
      const updated = { ...prev, [field]: value };
      if (sameAsCurrent && field.startsWith("current")) {
        const permField = field.replace("current", "permanent");
        (updated as any)[permField] = value;
      }
      return updated;
    });
  };

  const handleSameToggle = (checked: boolean) => {
    setSameAsCurrent(checked);
    if (checked) {
      setForm((prev: typeof form) => ({
        ...prev,
        permanentAddressLine1: prev.currentAddressLine1,
        permanentAddressLine2: prev.currentAddressLine2,
        permanentCity: prev.currentCity,
        permanentState: prev.currentState,
        permanentCountry: prev.currentCountry,
        permanentPostalCode: prev.currentPostalCode,
      }));
    }
  };

  const AddressFields: React.FC<{ prefix: "current" | "permanent"; disabled?: boolean }> = ({
    prefix,
    disabled,
  }) => (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2 space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          Address Line 1 <span className="text-destructive">*</span>
        </Label>
        <Input
          value={(form as any)[`${prefix}AddressLine1`]}
          onChange={(e) => handleChange(`${prefix}AddressLine1`, e.target.value)}
          className="rounded-xl h-10 border-border/50 bg-muted/20"
          disabled={disabled}
        />
      </div>
      <div className="col-span-2 space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Address Line 2</Label>
        <Input
          value={(form as any)[`${prefix}AddressLine2`]}
          onChange={(e) => handleChange(`${prefix}AddressLine2`, e.target.value)}
          className="rounded-xl h-10 border-border/50 bg-muted/20"
          disabled={disabled}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          City <span className="text-destructive">*</span>
        </Label>
        <Input
          value={(form as any)[`${prefix}City`]}
          onChange={(e) => handleChange(`${prefix}City`, e.target.value)}
          className="rounded-xl h-10 border-border/50 bg-muted/20"
          disabled={disabled}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          State <span className="text-destructive">*</span>
        </Label>
        <Input
          value={(form as any)[`${prefix}State`]}
          onChange={(e) => handleChange(`${prefix}State`, e.target.value)}
          className="rounded-xl h-10 border-border/50 bg-muted/20"
          disabled={disabled}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          Country <span className="text-destructive">*</span>
        </Label>
        <Input
          value={(form as any)[`${prefix}Country`]}
          onChange={(e) => handleChange(`${prefix}Country`, e.target.value)}
          className="rounded-xl h-10 border-border/50 bg-muted/20"
          disabled={disabled}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          Postal Code <span className="text-destructive">*</span>
        </Label>
        <Input
          value={(form as any)[`${prefix}PostalCode`]}
          onChange={(e) => handleChange(`${prefix}PostalCode`, e.target.value)}
          className="rounded-xl h-10 border-border/50 bg-muted/20"
          disabled={disabled}
        />
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border-border/50 p-0">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/30 px-6 py-5 rounded-t-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              Address Details
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground/60">
              Update your current and permanent address
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-primary mb-3 flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              Current Address
            </p>
            <AddressFields prefix="current" />
          </div>

          <div className="flex items-center gap-2 py-2">
            <Checkbox
              id="sameAddress"
              checked={sameAsCurrent}
              onCheckedChange={(c) => handleSameToggle(!!c)}
              className="rounded-md"
            />
            <label htmlFor="sameAddress" className="text-xs font-medium text-muted-foreground cursor-pointer">
              Same as current address
            </label>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground/60 mb-3 flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
              Permanent Address
            </p>
            <AddressFields prefix="permanent" disabled={sameAsCurrent} />
          </div>
        </div>

        <div className="sticky bottom-0 bg-background/95 backdrop-blur-xl border-t border-border/30 px-6 py-4 rounded-b-3xl">
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={onClose} className="rounded-xl" disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => onSave({ address: form })} disabled={saving} className="rounded-xl gap-2 min-w-[120px]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Emergency Contact Dialog ────────────────────────────────────────────────

const EmergencyContactDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  data: any;
  onSave: (data: any) => Promise<void>;
  saving: boolean;
}> = ({ open, onClose, data, onSave, saving }) => {
  const [form, setForm] = useState({
    name: data?.name || "",
    relationship: data?.relationship || "",
    phone: data?.phone || "",
    altPhone: data?.altPhone || "",
    email: data?.email || "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev: typeof form) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg rounded-3xl border-border/50 p-0">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/30 px-6 py-5 rounded-t-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-destructive/10 flex items-center justify-center">
                <Heart className="h-4 w-4 text-destructive" />
              </div>
              Emergency Contact
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="rounded-xl h-10 border-border/50 bg-muted/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Relationship <span className="text-destructive">*</span>
              </Label>
              <Select value={form.relationship} onValueChange={(v) => handleChange("relationship", v)}>
                <SelectTrigger className="rounded-xl h-10 border-border/50 bg-muted/20">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {["Spouse", "Parent", "Sibling", "Child", "Friend", "Other"].map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Phone <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                className="rounded-xl h-10 border-border/50 bg-muted/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Alt. Phone</Label>
              <Input
                value={form.altPhone}
                onChange={(e) => handleChange("altPhone", e.target.value)}
                className="rounded-xl h-10 border-border/50 bg-muted/20"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className="rounded-xl h-10 border-border/50 bg-muted/20"
            />
          </div>
        </div>

        <div className="bg-background/95 border-t border-border/30 px-6 py-4 rounded-b-3xl">
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={onClose} className="rounded-xl" disabled={saving}>Cancel</Button>
            <Button
              onClick={() => onSave({ emergencyContact: form })}
              disabled={saving || !form.name || !form.relationship || !form.phone}
              className="rounded-xl gap-2 min-w-[120px]"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Education Dialog ────────────────────────────────────────────────────────

const EducationDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  existing?: any;
  onSave: (data: any) => Promise<void>;
  saving: boolean;
}> = ({ open, onClose, existing, onSave, saving }) => {
  const [form, setForm] = useState({
    degree: existing?.degree || "",
    institution: existing?.institution || "",
    fieldOfStudy: existing?.fieldOfStudy || "",
    yearOfCompletion: existing?.yearOfCompletion || "",
    grade: existing?.grade || "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev: typeof form) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg rounded-3xl border-border/50 p-0">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/30 px-6 py-5 rounded-t-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-primary" />
              </div>
              {existing ? "Edit Education" : "Add Education"}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Degree <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.degree}
                onChange={(e) => handleChange("degree", e.target.value)}
                className="rounded-xl h-10 border-border/50 bg-muted/20"
                placeholder="B.Tech, MBA, etc."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Institution <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.institution}
                onChange={(e) => handleChange("institution", e.target.value)}
                className="rounded-xl h-10 border-border/50 bg-muted/20"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Field of Study</Label>
              <Input
                value={form.fieldOfStudy}
                onChange={(e) => handleChange("fieldOfStudy", e.target.value)}
                className="rounded-xl h-10 border-border/50 bg-muted/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Year <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.yearOfCompletion}
                onChange={(e) => handleChange("yearOfCompletion", e.target.value)}
                className="rounded-xl h-10 border-border/50 bg-muted/20"
                placeholder="2023"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Grade / CGPA</Label>
              <Input
                value={form.grade}
                onChange={(e) => handleChange("grade", e.target.value)}
                className="rounded-xl h-10 border-border/50 bg-muted/20"
              />
            </div>
          </div>
        </div>

        <div className="bg-background/95 border-t border-border/30 px-6 py-4 rounded-b-3xl">
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={onClose} className="rounded-xl" disabled={saving}>Cancel</Button>
            <Button
              onClick={() => onSave(form)}
              disabled={saving || !form.degree || !form.institution || !form.yearOfCompletion}
              className="rounded-xl gap-2 min-w-[120px]"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : existing ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Experience Dialog ───────────────────────────────────────────────────────

const ExperienceDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  existing?: any;
  onSave: (data: any) => Promise<void>;
  saving: boolean;
}> = ({ open, onClose, existing, onSave, saving }) => {
  const [form, setForm] = useState({
    companyName: existing?.companyName || "",
    designation: existing?.designation || "",
    fromDate: existing?.fromDate || "",
    toDate: existing?.toDate || "",
    currentlyWorking: existing?.currentlyWorking || false,
    responsibilities: existing?.responsibilities || "",
  });

  const handleChange = (field: string, value: any) => {
    setForm((prev: typeof form) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg rounded-3xl border-border/50 p-0">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/30 px-6 py-5 rounded-t-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-4 w-4 text-primary" />
              </div>
              {existing ? "Edit Experience" : "Add Experience"}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Company Name</Label>
              <Input
                value={form.companyName}
                onChange={(e) => handleChange("companyName", e.target.value)}
                className="rounded-xl h-10 border-border/50 bg-muted/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Designation</Label>
              <Input
                value={form.designation}
                onChange={(e) => handleChange("designation", e.target.value)}
                className="rounded-xl h-10 border-border/50 bg-muted/20"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">From Date</Label>
              <Input
                type="date"
                value={form.fromDate}
                onChange={(e) => handleChange("fromDate", e.target.value)}
                className="rounded-xl h-10 border-border/50 bg-muted/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">To Date</Label>
              <Input
                type="date"
                value={form.toDate}
                onChange={(e) => handleChange("toDate", e.target.value)}
                className="rounded-xl h-10 border-border/50 bg-muted/20"
                disabled={form.currentlyWorking}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="currentlyWorking"
              checked={form.currentlyWorking}
              onCheckedChange={(c) => handleChange("currentlyWorking", !!c)}
              className="rounded-md"
            />
            <label htmlFor="currentlyWorking" className="text-xs font-medium text-muted-foreground cursor-pointer">
              Currently working here
            </label>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Key Responsibilities</Label>
            <textarea
              value={form.responsibilities}
              onChange={(e) => handleChange("responsibilities", e.target.value)}
              className="w-full rounded-xl border border-border/50 bg-muted/20 p-3 text-sm resize-none h-20 focus:outline-none focus:border-primary/50 transition-colors"
              placeholder="Brief description of role..."
            />
          </div>
        </div>

        <div className="bg-background/95 border-t border-border/30 px-6 py-4 rounded-b-3xl">
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={onClose} className="rounded-xl" disabled={saving}>Cancel</Button>
            <Button onClick={() => onSave(form)} disabled={saving} className="rounded-xl gap-2 min-w-[120px]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : existing ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main OverviewTab Component ──────────────────────────────────────────────

export const OverviewTab: React.FC<OverviewTabProps> = ({ setActiveTab }) => {
  const { data, refetch } = useProfileContext();

  // Dialog states
  const [editPersonal, setEditPersonal] = useState(false);
  const [editAddress, setEditAddress] = useState(false);
  const [editEmergency, setEditEmergency] = useState(false);
  const [editEducation, setEditEducation] = useState<any | null>(null);
  const [editExperience, setEditExperience] = useState<any | null>(null);

  if (!data) return null;

  const PROFILE = data.profile || ({} as any);
  const EMPLOYEE_PROFILE = data.employeeProfile || ({} as any);
  const ADDRESS = data.address || ({} as any);
  const EMERGENCY_CONTACT = data.emergencyContact || ({} as any);
  const EDUCATION = data.education || [];
  const EXPERIENCE = data.experience || [];
  const CURRENT_USER = data.currentUser || ({} as any);

  // ─── Profile completion calculation ──────────────────────────────────────
  const completionItems = [
    { label: "Name", done: !!PROFILE.firstName, icon: User, section: "personal" },
    { label: "Date of Birth", done: !!PROFILE.dateOfBirth, icon: Calendar, section: "personal" },
    { label: "Gender", done: !!PROFILE.gender, icon: User, section: "personal" },
    { label: "Phone", done: !!PROFILE.phone, icon: Phone, section: "personal" },
    { label: "Email", done: !!PROFILE.personalEmail, icon: Mail, section: "personal" },
    { label: "Current Address", done: !!ADDRESS.currentAddressLine1, icon: MapPin, section: "address" },
    { label: "Permanent Address", done: !!ADDRESS.permanentAddressLine1, icon: MapPinned, section: "address" },
    { label: "Emergency Contact", done: !!EMERGENCY_CONTACT.name, icon: Heart, section: "emergency" },
    { label: "Education", done: EDUCATION.length > 0, icon: GraduationCap, section: "education" },
    { label: "Documents", done: (data.documents || []).length > 0, icon: FileText, section: "documents" },
    { label: "Aadhar", done: !!PROFILE.aadharNumber, icon: Shield, section: "personal" },
    { label: "PAN", done: !!PROFILE.panNumber, icon: Shield, section: "personal" },
  ];
  const completedCount = completionItems.filter((i) => i.done).length;
  const completionPct = Math.round((completedCount / completionItems.length) * 100);
  const pendingItems = completionItems.filter((i) => !i.done);

  // ─── Mutations ───────────────────────────────────────────────────────────

  const profileMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (!data.isOnboarding) {
        await api.patch("/profile/me/basic", payload);
      } else {
        await api.patch("/profile/me", payload);
      }
    },
    onSuccess: () => {
      toast.success("Profile updated successfully");
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update profile");
    },
  });

  const educationAddMutation = useMutation({
    mutationFn: async (payload: any) => {
      await api.post("/profile/education", payload);
    },
    onSuccess: () => {
      toast.success("Education added");
      refetch();
    },
    onError: () => toast.error("Failed to add education"),
  });

  const educationUpdateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      await api.patch(`/profile/education/${id}`, payload);
    },
    onSuccess: () => {
      toast.success("Education updated");
      refetch();
    },
    onError: () => toast.error("Failed to update education"),
  });

  const educationDeleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/profile/education/${id}`);
    },
    onSuccess: () => {
      toast.success("Education removed");
      refetch();
    },
    onError: () => toast.error("Failed to delete education"),
  });

  const experienceAddMutation = useMutation({
    mutationFn: async (payload: any) => {
      await api.post("/profile/experience", payload);
    },
    onSuccess: () => {
      toast.success("Experience added");
      refetch();
    },
    onError: () => toast.error("Failed to add experience"),
  });

  const experienceUpdateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      await api.patch(`/profile/experience/${id}`, payload);
    },
    onSuccess: () => {
      toast.success("Experience updated");
      refetch();
    },
    onError: () => toast.error("Failed to update experience"),
  });

  const experienceDeleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/profile/experience/${id}`);
    },
    onSuccess: () => {
      toast.success("Experience removed");
      refetch();
    },
    onError: () => toast.error("Failed to delete experience"),
  });

  // ─── Save handlers ──────────────────────────────────────────────────────

  const handleSavePersonal = async (formData: any) => {
    await profileMutation.mutateAsync(formData);
    setEditPersonal(false);
  };

  const handleSaveAddress = async (formData: any) => {
    await profileMutation.mutateAsync(formData);
    setEditAddress(false);
  };

  const handleSaveEmergency = async (formData: any) => {
    await profileMutation.mutateAsync(formData);
    setEditEmergency(false);
  };

  const handleSaveEducation = async (formData: any) => {
    if (editEducation?.id) {
      await educationUpdateMutation.mutateAsync({ id: editEducation.id, ...formData });
    } else {
      await educationAddMutation.mutateAsync(formData);
    }
    setEditEducation(null);
  };

  const handleSaveExperience = async (formData: any) => {
    if (editExperience?.id) {
      await experienceUpdateMutation.mutateAsync({ id: editExperience.id, ...formData });
    } else {
      await experienceAddMutation.mutateAsync(formData);
    }
    setEditExperience(null);
  };

  const fullName = PROFILE.firstName
    ? `${PROFILE.firstName} ${PROFILE.middleName || ""} ${PROFILE.lastName || ""}`.trim()
    : CURRENT_USER.name || "—";

  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <motion.div
        key="overview"
        variants={tabContentVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="space-y-6"
      >
        {/* ─── Row 1: Hero Banner + Profile Completion ──────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Profile Hero Card */}
          <SectionMotion className="lg:col-span-8">
            <GlassCard>
              <div className="p-6 relative overflow-hidden">
                {/* Decorative background pattern */}
                <div className="absolute inset-0 opacity-[0.015]">
                  <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full border-[20px] border-foreground" />
                  <div className="absolute -right-4 -bottom-12 h-32 w-32 rounded-full border-[16px] border-foreground" />
                </div>

                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/15 flex items-center justify-center shadow-lg">
                      <span className="text-2xl font-black text-primary/80">{initials}</span>
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-background border-2 border-primary/20 flex items-center justify-center">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-black text-foreground tracking-tight">{fullName}</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {EMPLOYEE_PROFILE.designation || "Employee"} 
                      {EMPLOYEE_PROFILE.department && (
                        <span className="text-muted-foreground/50"> · {EMPLOYEE_PROFILE.department}</span>
                      )}
                    </p>

                    {/* Quick info pills */}
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      {PROFILE.personalEmail && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/70 bg-muted/30 px-2.5 py-1 rounded-full border border-border/30">
                          <Mail className="h-3 w-3" />
                          {PROFILE.personalEmail}
                        </span>
                      )}
                      {PROFILE.phone && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/70 bg-muted/30 px-2.5 py-1 rounded-full border border-border/30">
                          <Phone className="h-3 w-3" />
                          {PROFILE.phone}
                        </span>
                      )}
                      {EMPLOYEE_PROFILE.workLocation && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/70 bg-muted/30 px-2.5 py-1 rounded-full border border-border/30">
                          <MapPin className="h-3 w-3" />
                          {EMPLOYEE_PROFILE.workLocation}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Edit personal */}
                  <div className="flex-shrink-0 self-start">
                    <EditButton onClick={() => setEditPersonal(true)} />
                  </div>
                </div>
              </div>
            </GlassCard>
          </SectionMotion>

          {/* Profile Completion Ring */}
          <SectionMotion className="lg:col-span-4">
            <GlassCard className="h-full">
              <div className="p-6 flex flex-col items-center justify-center h-full text-center">
                <CompletionRing percentage={completionPct} size={90} strokeWidth={7} />
                <p className="text-xs font-bold text-foreground mt-3">Profile Completion</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  {completedCount} of {completionItems.length} fields complete
                </p>
                {pendingItems.length > 0 && pendingItems.length <= 4 && (
                  <div className="flex flex-wrap justify-center gap-1 mt-3">
                    {pendingItems.slice(0, 3).map((item) => (
                      <span
                        key={item.label}
                        className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground/60 border border-border/30"
                      >
                        {item.label}
                      </span>
                    ))}
                    {pendingItems.length > 3 && (
                      <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground/60 border border-border/30">
                        +{pendingItems.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </GlassCard>
          </SectionMotion>
        </div>

        {/* ─── Row 2: Key Details Mosaic ─────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Personal Snapshot */}
          <SectionMotion className="lg:col-span-1">
            <GlassCard className="h-full">
              <div className="p-5">
                <ModernSectionHeader
                  icon={User}
                  title="Identity"
                  compact
                />
                <div className="space-y-0 divide-y divide-border/20">
                  <InfoField icon={Calendar} label="Date of Birth" value={formatDate(PROFILE.dateOfBirth)} compact />
                  <InfoField icon={User} label="Gender" value={PROFILE.gender} compact />
                  <InfoField icon={Heart} label="Marital Status" value={PROFILE.maritalStatus} compact />
                  <InfoField icon={Globe} label="Nationality" value={PROFILE.nationality} compact />
                  <InfoField icon={Droplets} label="Blood Group" value={PROFILE.bloodGroup} compact />
                </div>
              </div>
            </GlassCard>
          </SectionMotion>

          {/* ID Documents */}
          <SectionMotion className="lg:col-span-1">
            <GlassCard className="h-full">
              <div className="p-5">
                <ModernSectionHeader
                  icon={Shield}
                  title="Documents"
                  compact
                />
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">Aadhar</span>
                      {PROFILE.aadharNumber ? (
                        <CheckCircle2 className="h-3 w-3 text-primary/60" />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-muted-foreground/30" />
                      )}
                    </div>
                    <InfoField icon={Shield} label="" value={PROFILE.aadharNumber} mono masked compact />
                  </div>
                  <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">PAN</span>
                      {PROFILE.panNumber ? (
                        <CheckCircle2 className="h-3 w-3 text-primary/60" />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-muted-foreground/30" />
                      )}
                    </div>
                    <InfoField icon={CreditCard} label="" value={PROFILE.panNumber} mono masked compact />
                  </div>
                  {PROFILE.linkedinProfile && (
                    <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
                      <InfoField icon={Linkedin} label="LinkedIn" value={PROFILE.linkedinProfile} compact />
                    </div>
                  )}
                </div>
              </div>
            </GlassCard>
          </SectionMotion>

          {/* Emergency Contact */}
          <SectionMotion className="lg:col-span-1">
            <GlassCard className="h-full">
              <div className="p-5">
                <ModernSectionHeader
                  icon={Heart}
                  title="Emergency"
                  compact
                  action={
                    data.isOnboarding ? (
                      <button
                        onClick={() => setEditEmergency(true)}
                        className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <Pencil className="h-3 w-3 text-muted-foreground/50" />
                      </button>
                    ) : undefined
                  }
                />
                {EMERGENCY_CONTACT.name ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-destructive/8 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-destructive/60" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{EMERGENCY_CONTACT.name}</p>
                        <p className="text-[10px] text-muted-foreground/60">{EMERGENCY_CONTACT.relationship}</p>
                      </div>
                    </div>
                    <div className="space-y-0 divide-y divide-border/20">
                      <InfoField icon={Phone} label="Phone" value={EMERGENCY_CONTACT.phone} compact />
                      {EMERGENCY_CONTACT.altPhone && (
                        <InfoField icon={Phone} label="Alt. Phone" value={EMERGENCY_CONTACT.altPhone} compact />
                      )}
                      {EMERGENCY_CONTACT.email && (
                        <InfoField icon={Mail} label="Email" value={EMERGENCY_CONTACT.email} compact />
                      )}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => data.isOnboarding && setEditEmergency(true)}
                    className={cn(
                      "w-full py-8 rounded-2xl border-2 border-dashed flex flex-col items-center gap-2 group transition-colors",
                      data.isOnboarding ? "border-border/30 hover:border-primary/20 cursor-pointer" : "border-border/10 cursor-default"
                    )}
                  >
                    <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center transition-colors", 
                      data.isOnboarding ? "bg-destructive/8 group-hover:bg-destructive/15" : "bg-muted/30")}>
                      <Plus className="h-4 w-4 text-destructive/50" />
                    </div>
                    <p className="text-[11px] font-semibold text-muted-foreground/50 group-hover:text-foreground transition-colors">
                      {data.isOnboarding ? "Add contact" : "No contact added"}
                    </p>
                  </button>
                )}
              </div>
            </GlassCard>
          </SectionMotion>

          {/* Quick Actions */}
          <SectionMotion className="lg:col-span-1">
            <GlassCard className="h-full">
              <div className="p-5">
                <ModernSectionHeader
                  icon={Zap}
                  title="Quick Actions"
                  compact
                />
                <div className="space-y-1.5">
                  {[
                    {
                      icon: FileText,
                      label: "Upload Documents",
                      desc: "ID & certificates",
                      tab: "documents",
                    },
                    {
                      icon: Briefcase,
                      label: "View Assets",
                      desc: "Equipment assigned",
                      tab: "assets",
                    },
                    {
                      icon: AlertCircle,
                      label: "Raise Support",
                      desc: "Issues & complaints",
                      tab: "complaints",
                    },
                  ].map((action) => (
                    <button
                      key={action.label}
                      onClick={() => setActiveTab(action.tab)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-all duration-200 group text-left"
                    >
                      <div className="h-8 w-8 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors">
                        <action.icon className="h-3.5 w-3.5 text-primary/70" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground">{action.label}</p>
                        <p className="text-[10px] text-muted-foreground/40">{action.desc}</p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/20 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </GlassCard>
          </SectionMotion>
        </div>

        {/* ─── Row 3: Address + Employment Side-by-Side ──────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Address Card */}
          <SectionMotion>
            <GlassCard>
              <div className="p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-[0.015]">
                  <MapPin className="h-28 w-28" />
                </div>
                <ModernSectionHeader
                  icon={MapPin}
                  title="Address"
                  subtitle="Residential information"
                  action={data.isOnboarding ? <EditButton onClick={() => setEditAddress(true)} /> : undefined}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                  {/* Current */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/[0.04] to-primary/[0.01] border border-primary/10 hover:border-primary/20 transition-all duration-300">
                    <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-primary mb-2.5 flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                      Current Residence
                    </p>
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold">{ADDRESS.currentAddressLine1 || "Not provided"}</p>
                      {ADDRESS.currentAddressLine2 && (
                        <p className="text-xs text-muted-foreground">{ADDRESS.currentAddressLine2}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {[ADDRESS.currentCity, ADDRESS.currentState, ADDRESS.currentPostalCode]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">{ADDRESS.currentCountry || ""}</p>
                    </div>
                  </div>

                  {/* Permanent */}
                  <div className="p-4 rounded-2xl bg-muted/15 border border-border/40 hover:border-border/60 transition-all duration-300">
                    <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground/60 mb-2.5 flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                      Permanent
                    </p>
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold">{ADDRESS.permanentAddressLine1 || "Not provided"}</p>
                      {ADDRESS.permanentAddressLine2 && (
                        <p className="text-xs text-muted-foreground">{ADDRESS.permanentAddressLine2}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {[ADDRESS.permanentCity, ADDRESS.permanentState, ADDRESS.permanentPostalCode]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">{ADDRESS.permanentCountry || ""}</p>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </SectionMotion>

          {/* Employment Details (Read Only) */}
          <SectionMotion>
            <GlassCard>
              <div className="p-6">
                <ModernSectionHeader
                  icon={Briefcase}
                  title="Employment"
                  subtitle="HR-managed details"
                  badge="Read Only"
                  badgeVariant="default"
                />
                <div className="grid grid-cols-2 gap-x-4 gap-y-0 divide-y-0">
                  <div className="space-y-0 divide-y divide-border/20 col-span-1">
                    <InfoField icon={Briefcase} label="Designation" value={EMPLOYEE_PROFILE.designation} compact />
                    <InfoField icon={Building2} label="Department" value={EMPLOYEE_PROFILE.department} compact />
                    <InfoField icon={User} label="Type" value={EMPLOYEE_PROFILE.employeeType} compact />
                  </div>
                  <div className="space-y-0 divide-y divide-border/20 col-span-1">
                    <InfoField icon={MapPinned} label="Location" value={EMPLOYEE_PROFILE.workLocation} compact />
                    <InfoField icon={User} label="Manager" value={EMPLOYEE_PROFILE.reportingManager} compact />
                    <InfoField icon={Clock} label="Joined" value={formatDate(EMPLOYEE_PROFILE.joiningDate)} compact />
                  </div>
                </div>

                {/* Onboarding checklist */}
                {(EMPLOYEE_PROFILE.offerLetterDate !== undefined ||
                  EMPLOYEE_PROFILE.joiningLetterIssued !== undefined) && (
                  <>
                    <Separator className="my-4 bg-border/20" />
                    <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground/50 mb-3">
                      Onboarding
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: "Offer", done: !!EMPLOYEE_PROFILE?.offerLetterDate },
                        { label: "Joining", done: !!EMPLOYEE_PROFILE?.joiningLetterIssued },
                        { label: "Induction", done: !!EMPLOYEE_PROFILE?.inductionCompleted },
                        { label: "ID Card", done: !!EMPLOYEE_PROFILE?.idCardIssued },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className={cn(
                            "flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-center transition-colors",
                            item.done
                              ? "bg-primary/5 border-primary/15 text-primary"
                              : "bg-muted/20 border-border/30 text-muted-foreground/40"
                          )}
                        >
                          {item.done ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Clock className="h-4 w-4" />
                          )}
                          <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </GlassCard>
          </SectionMotion>
        </div>

        {/* ─── Row 4: Education + Experience Side-by-Side ────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Education */}
          <SectionMotion>
            <GlassCard className="h-full">
              <div className="p-6">
                <ModernSectionHeader
                  icon={GraduationCap}
                  title="Education"
                  subtitle="Academic qualifications"
                  badge={EDUCATION.length > 0 ? `${EDUCATION.length}` : undefined}
                  badgeVariant="info"
                  action={
                    data.isOnboarding ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditEducation({})}
                        className="rounded-xl text-primary font-semibold h-8 text-xs hover:bg-primary/8 gap-1.5"
                      >
                        <Plus className="h-3 w-3" />
                        Add
                      </Button>
                    ) : undefined
                  }
                />
                {EDUCATION.length > 0 ? (
                  <div className="space-y-3">
                    {EDUCATION.map((edu: any) => (
                      <div
                        key={edu.id}
                        className="group relative flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-br from-muted/20 to-transparent border border-border/30 hover:border-primary/15 transition-all duration-300"
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Award className="h-4 w-4 text-primary" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground">{edu.degree}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{edu.institution}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {edu.fieldOfStudy && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/8 text-primary border border-primary/15">
                                {edu.fieldOfStudy}
                              </span>
                            )}
                            {edu.yearOfCompletion && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground">
                                {edu.yearOfCompletion}
                              </span>
                            )}
                            {edu.grade && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/8 text-primary">
                                Grade: {edu.grade}
                              </span>
                            )}
                          </div>
                        </div>
                        {data.isOnboarding && (
                          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => setEditEducation(edu)}
                                    className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                                  >
                                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs rounded-lg">Edit</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => educationDeleteMutation.mutate(edu.id)}
                                    className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-destructive/60" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs rounded-lg">Delete</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <button
                    onClick={() => setEditEducation({})}
                    className="w-full p-8 rounded-2xl border-2 border-dashed border-border/30 hover:border-primary/20 transition-all duration-300 flex flex-col items-center gap-3 group"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-primary/8 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                      <GraduationCap className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                        Add your education
                      </p>
                      <p className="text-xs text-muted-foreground/50 mt-0.5">
                        Degrees, certifications & qualifications
                      </p>
                    </div>
                  </button>
                )}
              </div>
            </GlassCard>
          </SectionMotion>

          {/* Work Experience */}
          <SectionMotion>
            <GlassCard className="h-full">
              <div className="p-6">
                <ModernSectionHeader
                  icon={Briefcase}
                  title="Work Experience"
                  subtitle="Professional history"
                  badge={EXPERIENCE.length > 0 ? `${EXPERIENCE.length}` : undefined}
                  badgeVariant="info"
                  action={
                    data.isOnboarding ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditExperience({})}
                        className="rounded-xl text-primary font-semibold h-8 text-xs hover:bg-primary/8 gap-1.5"
                      >
                        <Plus className="h-3 w-3" />
                        Add
                      </Button>
                    ) : undefined
                  }
                />
                {EXPERIENCE.length > 0 ? (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-[17px] top-5 bottom-5 w-px bg-gradient-to-b from-primary/20 via-border/20 to-transparent" />

                    <div className="space-y-3">
                      {EXPERIENCE.map((exp: any) => (
                        <div key={exp.id} className="group relative flex items-start gap-3 pl-0.5">
                          {/* Timeline dot */}
                          <div className="flex-shrink-0 relative z-10 mt-1">
                            <div
                              className={cn(
                                "h-8 w-8 rounded-xl flex items-center justify-center border-2 transition-colors",
                                exp.currentlyWorking
                                  ? "bg-primary/10 border-primary/30"
                                  : "bg-muted/30 border-border/40"
                              )}
                            >
                              <Building className="h-3.5 w-3.5 text-primary/70" />
                            </div>
                          </div>

                          <div className="flex-1 min-w-0 p-3.5 rounded-2xl bg-gradient-to-br from-muted/20 to-transparent border border-border/30 hover:border-primary/15 transition-all duration-300">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-foreground">
                                  {exp.designation || "Role not specified"}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {exp.companyName || "Company not specified"}
                                </p>
                              </div>
                              {data.isOnboarding && (
                                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                  <button
                                    onClick={() => setEditExperience(exp)}
                                    className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                                  >
                                    <Pencil className="h-3 w-3 text-muted-foreground" />
                                  </button>
                                  <button
                                    onClick={() => experienceDeleteMutation.mutate(exp.id)}
                                    className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                                  >
                                    <Trash2 className="h-3 w-3 text-destructive/60" />
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {(exp.fromDate || exp.toDate) && (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-2.5 w-2.5" />
                                  {exp.fromDate ? formatDate(exp.fromDate) : "—"} →{" "}
                                  {exp.currentlyWorking ? "Present" : exp.toDate ? formatDate(exp.toDate) : "—"}
                                </span>
                              )}
                              {exp.currentlyWorking && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/15">
                                  Current
                                </span>
                              )}
                            </div>
                            {exp.responsibilities && (
                              <p className="text-xs text-muted-foreground/70 mt-2 line-clamp-2">
                                {exp.responsibilities}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => data.isOnboarding && setEditExperience({})}
                    className={cn(
                      "w-full p-8 rounded-2xl border-2 border-dashed flex flex-col items-center gap-3 group transition-all duration-300",
                      data.isOnboarding ? "border-border/30 hover:border-primary/20 cursor-pointer" : "border-border/10 cursor-default"
                    )}
                  >
                    <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center transition-colors",
                      data.isOnboarding ? "bg-primary/8 group-hover:bg-primary/15" : "bg-muted/30"
                    )}>
                      <Briefcase className={cn("h-5 w-5", data.isOnboarding ? "text-primary" : "text-muted-foreground/40")} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                        {data.isOnboarding ? "Add work experience" : "No work experience added"}
                      </p>
                      {data.isOnboarding && (
                        <p className="text-xs text-muted-foreground/50 mt-0.5">
                          Previous employment & roles
                        </p>
                      )}
                    </div>
                  </button>
                )}
              </div>
            </GlassCard>
          </SectionMotion>
        </div>

        {/* ─── Row 5: Banking + Account ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Banking (Read Only) */}
          <SectionMotion className="lg:col-span-8">
            <GlassCard>
              <div className="p-6">
                <ModernSectionHeader
                  icon={CreditCard}
                  title="Banking & Payroll"
                  subtitle="Financial information"
                  badge="Read Only"
                  badgeVariant="default"
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <InfoField icon={Building2} label="Bank" value={EMPLOYEE_PROFILE.bankName} />
                  <InfoField icon={User} label="Holder" value={EMPLOYEE_PROFILE.accountHolderName} />
                  <InfoField icon={Hash} label="Account" value={EMPLOYEE_PROFILE.accountNumber} mono masked />
                  <InfoField icon={Hash} label="IFSC" value={EMPLOYEE_PROFILE.ifscCode} mono />
                  <InfoField icon={MapPinned} label="Branch" value={EMPLOYEE_PROFILE.branchName} />
                  {(EMPLOYEE_PROFILE.uanNumber || EMPLOYEE_PROFILE.pfNumber || EMPLOYEE_PROFILE.esicNumber) && (
                    <>
                      <InfoField icon={Shield} label="UAN" value={EMPLOYEE_PROFILE.uanNumber} mono masked />
                    </>
                  )}
                </div>

                {(EMPLOYEE_PROFILE.pfNumber || EMPLOYEE_PROFILE.esicNumber) && (
                  <>
                    <Separator className="my-4 bg-border/20" />
                    <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground/50 mb-3">
                      Statutory
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <InfoField icon={Hash} label="PF" value={EMPLOYEE_PROFILE.pfNumber} mono />
                      <InfoField icon={Hash} label="ESIC" value={EMPLOYEE_PROFILE.esicNumber} mono />
                    </div>
                  </>
                )}
              </div>
            </GlassCard>
          </SectionMotion>

          {/* Account Info */}
          <SectionMotion className="lg:col-span-4">
            <GlassCard className="h-full">
              <div className="p-6">
                <ModernSectionHeader icon={Info} title="Account" subtitle="System information" />
                <div className="space-y-0 divide-y divide-border/20">
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-xs text-muted-foreground/60">Username</span>
                    <span className="font-mono font-medium text-xs">{CURRENT_USER.username || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-xs text-muted-foreground/60">Team</span>
                    <span className="font-medium text-xs">{CURRENT_USER.team || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-xs text-muted-foreground/60">Last Login</span>
                    <span className="font-medium text-xs">{CURRENT_USER.lastLoginAt ? formatDate(CURRENT_USER.lastLoginAt) : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-xs text-muted-foreground/60">Member Since</span>
                    <span className="font-medium text-xs">{CURRENT_USER.createdAt ? formatDate(CURRENT_USER.createdAt) : "—"}</span>
                  </div>
                </div>

                {/* Completion checklist mini */}
                {pendingItems.length > 0 && (
                  <>
                    <Separator className="my-4 bg-border/20" />
                    <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground/50 mb-2.5">
                      Pending Items
                    </p>
                    <div className="space-y-1.5">
                      {pendingItems.slice(0, 5).map((item) => (
                        <div key={item.label} className="flex items-center gap-2 text-xs text-muted-foreground/60">
                          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/20 flex-shrink-0" />
                          {item.label}
                        </div>
                      ))}
                      {pendingItems.length > 5 && (
                        <p className="text-[10px] text-muted-foreground/40 pl-3.5">
                          +{pendingItems.length - 5} more
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </GlassCard>
          </SectionMotion>
        </div>
      </motion.div>

      {/* ─── Edit Dialogs ─────────────────────────────────────────────────── */}
      {editPersonal && (
        <PersonalInfoDialog
          open={editPersonal}
          onClose={() => setEditPersonal(false)}
          data={PROFILE}
          onSave={handleSavePersonal}
          saving={profileMutation.isPending}
          isOnboarding={data.isOnboarding}
        />
      )}

      {editAddress && (
        <AddressDialog
          open={editAddress}
          onClose={() => setEditAddress(false)}
          data={ADDRESS}
          onSave={handleSaveAddress}
          saving={profileMutation.isPending}
        />
      )}

      {editEmergency && (
        <EmergencyContactDialog
          open={editEmergency}
          onClose={() => setEditEmergency(false)}
          data={EMERGENCY_CONTACT}
          onSave={handleSaveEmergency}
          saving={profileMutation.isPending}
        />
      )}

      {editEducation !== null && (
        <EducationDialog
          open={editEducation !== null}
          onClose={() => setEditEducation(null)}
          existing={editEducation?.id ? editEducation : undefined}
          onSave={handleSaveEducation}
          saving={educationAddMutation.isPending || educationUpdateMutation.isPending}
        />
      )}

      {editExperience !== null && (
        <ExperienceDialog
          open={editExperience !== null}
          onClose={() => setEditExperience(null)}
          existing={editExperience?.id ? editExperience : undefined}
          onSave={handleSaveExperience}
          saving={experienceAddMutation.isPending || experienceUpdateMutation.isPending}
        />
      )}
    </>
  );
};