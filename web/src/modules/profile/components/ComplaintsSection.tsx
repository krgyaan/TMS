import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ArrowUpRight,
  ChevronRight,
  CalendarDays,
  Hash,
  User,
  Building2,
  Shield,
  AlertTriangle,
  Flame,
  Info,
  Send,
  Paperclip,
  CloudUpload,
  X,
  FileText,
  ImageIcon,
  Eye,
  MapPin,
  Users,
  Lightbulb,
  History,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Megaphone,
  Scale,
  Wallet,
  Calendar,
  Wrench,
  Monitor,
  UserX,
  BookOpen,
  ShieldAlert,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfileContext } from "../contexts/ProfileContext";
import { formatDate } from "../utils";
import { staggerContainer, fadeInUp, tabContentVariants } from "../animations";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Complaint {
  id: string;
  complaintCode: string;
  subject: string;
  complaintType: string;
  complaintAgainst: string;
  complaintAgainstName?: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "resolved" | "closed" | "rejected";
  description: string;
  incidentDate?: string;
  incidentLocation?: string;
  witnesses?: string;
  previousAttempts?: string;
  expectedResolution?: string;
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string;
  attachments?: { name: string; size: string; type: string }[];
  remarks?: string;
  assignedTo?: string;
  timeline?: {
    date: string;
    action: string;
    by: string;
    note?: string;
  }[];
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const COMPLAINT_TYPES = [
  { value: "harassment", label: "Harassment / Workplace Misconduct", icon: ShieldAlert },
  { value: "discrimination", label: "Discrimination", icon: Scale },
  { value: "salary", label: "Salary / Payment Issue", icon: Wallet },
  { value: "leave", label: "Leave / Attendance Issue", icon: Calendar },
  { value: "facilities", label: "Facilities / Infrastructure", icon: Wrench },
  { value: "it", label: "IT / Technical Issue", icon: Monitor },
  { value: "behavior", label: "Manager / Colleague Behavior", icon: UserX },
  { value: "policy", label: "Policy Violation", icon: BookOpen },
  { value: "safety", label: "Safety / Security", icon: Shield },
  { value: "other", label: "Other", icon: HelpCircle },
];

const COMPLAINT_AGAINST_OPTIONS = [
  { value: "person", label: "Person" },
  { value: "department", label: "Department" },
  { value: "system", label: "System" },
  { value: "policy", label: "Policy" },
  { value: "facility", label: "Facility" },
];

const PRIORITY_CONFIG = {
  low: {
    label: "Low",
    icon: Info,
    className: "bg-muted/50 text-muted-foreground border-border/30",
    dotColor: "bg-muted-foreground",
    badgeBg: "bg-slate-100 text-slate-600 border-slate-200",
  },
  medium: {
    label: "Medium",
    icon: AlertCircle,
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    dotColor: "bg-amber-500",
    badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
  },
  high: {
    label: "High",
    icon: AlertTriangle,
    className: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    dotColor: "bg-orange-500",
    badgeBg: "bg-orange-50 text-orange-700 border-orange-200",
  },
  critical: {
    label: "Critical",
    icon: Flame,
    className: "bg-destructive/10 text-destructive border-destructive/20",
    dotColor: "bg-destructive",
    badgeBg: "bg-red-50 text-red-700 border-red-200",
  },
};

const STATUS_CONFIG = {
  open: {
    label: "Open",
    icon: Clock,
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    dotColor: "bg-blue-500",
  },
  in_progress: {
    label: "In Progress",
    icon: RotateCcw,
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    dotColor: "bg-amber-500",
  },
  resolved: {
    label: "Resolved",
    icon: CheckCircle2,
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    dotColor: "bg-emerald-500",
  },
  closed: {
    label: "Closed",
    icon: XCircle,
    className: "bg-muted/50 text-muted-foreground border-border/30",
    dotColor: "bg-muted-foreground",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
    dotColor: "bg-destructive",
  },
};

// ─── FORM STATE ──────────────────────────────────────────────────────────────

interface ComplaintFormData {
  complaintType: string;
  subject: string;
  complaintAgainst: string;
  complaintAgainstName: string;
  priority: string;
  incidentDate: string;
  incidentLocation: string;
  description: string;
  previousAttempts: string;
  witnesses: string;
  expectedResolution: string;
  attachments: File[];
}

const INITIAL_FORM: ComplaintFormData = {
  complaintType: "",
  subject: "",
  complaintAgainst: "",
  complaintAgainstName: "",
  priority: "",
  incidentDate: "",
  incidentLocation: "",
  description: "",
  previousAttempts: "",
  witnesses: "",
  expectedResolution: "",
  attachments: [],
};

// ─── RAISE COMPLAINT DIALOG ─────────────────────────────────────────────────

interface RaiseComplaintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RaiseComplaintDialog: React.FC<RaiseComplaintDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { data } = useProfileContext();
  const [form, setForm] = useState<ComplaintFormData>({ ...INITIAL_FORM });
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalSteps = 3;

  const updateForm = (field: keyof ComplaintFormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files);
      setForm((prev) => ({ ...prev, attachments: [...prev.attachments, ...files] }));
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setForm((prev) => ({ ...prev, attachments: [...prev.attachments, ...files] }));
    }
  };

  const removeAttachment = (index: number) => {
    setForm((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 2000));
    setSubmitting(false);
    setForm({ ...INITIAL_FORM });
    setStep(1);
    onOpenChange(false);
  };

  const canProceedStep1 = form.complaintType && form.subject && form.priority;
  const canProceedStep2 = form.description;
  const canSubmit = canProceedStep1 && canProceedStep2;

  const handleClose = () => {
    setForm({ ...INITIAL_FORM });
    setStep(1);
    onOpenChange(false);
  };

  const selectedType = COMPLAINT_TYPES.find((t) => t.value === form.complaintType);
  const TypeIcon = selectedType?.icon || HelpCircle;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl rounded-2xl border-border/40 bg-background/95 backdrop-blur-xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 shrink-0">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent" />
          <DialogHeader className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shadow-lg shadow-primary/10">
                <Megaphone className="h-5.5 w-5.5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  Raise a Complaint
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Submit your concern and we'll look into it
                </DialogDescription>
              </div>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-2 mt-2">
              {[
                { num: 1, label: "Classification" },
                { num: 2, label: "Details" },
                { num: 3, label: "Evidence" },
              ].map((s, i) => (
                <React.Fragment key={s.num}>
                  <button
                    onClick={() => {
                      if (s.num < step) setStep(s.num);
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                      step === s.num
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                        : step > s.num
                        ? "bg-emerald-500/10 text-emerald-600 cursor-pointer hover:bg-emerald-500/15"
                        : "bg-muted/30 text-muted-foreground"
                    )}
                  >
                    {step > s.num ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <span className="h-4 w-4 rounded-full border-2 flex items-center justify-center text-[9px] font-black border-current">
                        {s.num}
                      </span>
                    )}
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                  {i < 2 && (
                    <div
                      className={cn(
                        "flex-1 h-0.5 rounded-full transition-colors",
                        step > s.num ? "bg-emerald-500/30" : "bg-border/30"
                      )}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </DialogHeader>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <AnimatePresence mode="wait">
            {/* ── STEP 1: Classification ──────────────────────────────── */}
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* Complainant Info (Auto-filled) */}
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/20">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3 flex items-center gap-1.5">
                    <User className="h-3 w-3" />
                    Complainant Details (Auto-filled)
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: "Name", value: data?.employee?.firstName + " " + (data?.employee?.lastName || "") },
                      { label: "Employee ID", value: data?.employee?.employeeId || "—" },
                      { label: "Department", value: data?.employee?.department || "—" },
                      { label: "Designation", value: data?.employee?.designation || "—" },
                      { label: "Email", value: data?.employee?.email || "—" },
                      { label: "Phone", value: data?.employee?.phone || "—" },
                    ].map((item) => (
                      <div key={item.label}>
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
                          {item.label}
                        </p>
                        <p className="text-xs font-semibold mt-0.5 truncate">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Complaint Type */}
                <div className="space-y-2.5">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    Complaint Type <span className="text-destructive">*</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {COMPLAINT_TYPES.map((type) => {
                      const Icon = type.icon;
                      const isSelected = form.complaintType === type.value;
                      return (
                        <button
                          key={type.value}
                          onClick={() => updateForm("complaintType", type.value)}
                          className={cn(
                            "flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all duration-200 text-xs",
                            isSelected
                              ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                              : "border-border/30 hover:border-primary/20 hover:bg-muted/20"
                          )}
                        >
                          <div
                            className={cn(
                              "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted/30 text-muted-foreground"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <span
                            className={cn(
                              "font-semibold leading-tight",
                              isSelected ? "text-primary" : "text-foreground/80"
                            )}
                          >
                            {type.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Subject / Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="Brief description of your complaint"
                    value={form.subject}
                    onChange={(e) => updateForm("subject", e.target.value)}
                    className="h-11 rounded-xl border-border/50 bg-muted/20 focus:bg-background text-sm"
                  />
                </div>

                {/* Complaint Against + Priority */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Complaint Against
                    </Label>
                    <Select
                      value={form.complaintAgainst}
                      onValueChange={(v) => updateForm("complaintAgainst", v)}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-border/50 bg-muted/20 text-sm">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {COMPLAINT_AGAINST_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="rounded-lg">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Priority <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={form.priority}
                      onValueChange={(v) => updateForm("priority", v)}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-border/50 bg-muted/20 text-sm">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {Object.entries(PRIORITY_CONFIG).map(([key, config]) => {
                          const PIcon = config.icon;
                          return (
                            <SelectItem key={key} value={key} className="rounded-lg">
                              <div className="flex items-center gap-2">
                                <PIcon className="h-3.5 w-3.5" />
                                {config.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Complaint Against Name (conditional) */}
                {(form.complaintAgainst === "person" ||
                  form.complaintAgainst === "department") && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <Label className="text-xs font-semibold text-muted-foreground">
                      {form.complaintAgainst === "person"
                        ? "Person Name"
                        : "Department Name"}
                    </Label>
                    <Input
                      placeholder={
                        form.complaintAgainst === "person"
                          ? "Enter person's name"
                          : "Enter department name"
                      }
                      value={form.complaintAgainstName}
                      onChange={(e) =>
                        updateForm("complaintAgainstName", e.target.value)
                      }
                      className="h-11 rounded-xl border-border/50 bg-muted/20 focus:bg-background text-sm"
                    />
                  </motion.div>
                )}

                {/* Incident Date + Location */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Incident Date & Time
                    </Label>
                    <Input
                      type="datetime-local"
                      value={form.incidentDate}
                      onChange={(e) => updateForm("incidentDate", e.target.value)}
                      className="h-11 rounded-xl border-border/50 bg-muted/20 focus:bg-background text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Location of Incident
                    </Label>
                    <Input
                      placeholder="e.g. Floor 3, Meeting Room B"
                      value={form.incidentLocation}
                      onChange={(e) =>
                        updateForm("incidentLocation", e.target.value)
                      }
                      className="h-11 rounded-xl border-border/50 bg-muted/20 focus:bg-background text-sm"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: Details ─────────────────────────────────────── */}
            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* Summary of Step 1 */}
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/20">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <TypeIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{form.subject}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {selectedType?.label} •{" "}
                        {form.priority &&
                          PRIORITY_CONFIG[form.priority as keyof typeof PRIORITY_CONFIG]
                            ?.label}{" "}
                        Priority
                      </p>
                    </div>
                  </div>
                </div>

                {/* Detailed Description */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Detailed Description{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    placeholder="Describe the incident or issue in detail. Include what happened, when, and who was involved..."
                    value={form.description}
                    onChange={(e) => updateForm("description", e.target.value)}
                    className="min-h-[140px] rounded-xl border-border/50 bg-muted/20 focus:bg-background text-sm resize-none"
                  />
                  <p className="text-[10px] text-muted-foreground/60 text-right">
                    {form.description.length} characters
                  </p>
                </div>

                {/* Previous Attempts */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <History className="h-3 w-3" />
                    Previous Attempts to Resolve
                  </Label>
                  <Textarea
                    placeholder="Have you tried to resolve this before? Describe any steps taken..."
                    value={form.previousAttempts}
                    onChange={(e) =>
                      updateForm("previousAttempts", e.target.value)
                    }
                    className="min-h-[80px] rounded-xl border-border/50 bg-muted/20 focus:bg-background text-sm resize-none"
                  />
                </div>

                {/* Witnesses */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-3 w-3" />
                    Witnesses (if any)
                  </Label>
                  <Input
                    placeholder="Names and contact details of witnesses"
                    value={form.witnesses}
                    onChange={(e) => updateForm("witnesses", e.target.value)}
                    className="h-11 rounded-xl border-border/50 bg-muted/20 focus:bg-background text-sm"
                  />
                </div>

                {/* Expected Resolution */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Lightbulb className="h-3 w-3" />
                    Expected Resolution
                  </Label>
                  <Textarea
                    placeholder="What outcome or action do you expect?"
                    value={form.expectedResolution}
                    onChange={(e) =>
                      updateForm("expectedResolution", e.target.value)
                    }
                    className="min-h-[80px] rounded-xl border-border/50 bg-muted/20 focus:bg-background text-sm resize-none"
                  />
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: Evidence & Submit ───────────────────────────── */}
            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* Drop Zone */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Paperclip className="h-3 w-3" />
                    Supporting Documents
                  </Label>
                  <div
                    className={cn(
                      "relative border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer",
                      dragActive
                        ? "border-primary bg-primary/5 scale-[1.01]"
                        : "border-border/50 hover:border-primary/30 hover:bg-muted/20"
                    )}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                      onChange={handleFileSelect}
                    />
                    <div className="p-8 text-center">
                      <motion.div
                        animate={
                          dragActive
                            ? { scale: 1.1, y: -4 }
                            : { scale: 1, y: 0 }
                        }
                        transition={{ type: "spring", stiffness: 300 }}
                        className="h-14 w-14 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-3"
                      >
                        <CloudUpload
                          className={cn(
                            "h-7 w-7 transition-colors",
                            dragActive ? "text-primary" : "text-primary/40"
                          )}
                        />
                      </motion.div>
                      <p className="text-sm font-semibold mb-1">
                        {dragActive
                          ? "Drop files here"
                          : "Drag & drop files here"}
                      </p>
                      <p className="text-xs text-muted-foreground mb-2">
                        or click to browse
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium">
                        Screenshots, photos, documents • Max 10MB each
                      </p>
                    </div>
                  </div>
                </div>

                {/* Attached Files */}
                {form.attachments.length > 0 && (
                  <div className="space-y-2">
                    {form.attachments.map((file, index) => (
                      <motion.div
                        key={`${file.name}-${index}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/20"
                      >
                        <div className="h-9 w-9 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                          {file.type.startsWith("image/") ? (
                            <ImageIcon className="h-4 w-4 text-primary/60" />
                          ) : (
                            <FileText className="h-4 w-4 text-primary/60" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">
                            {file.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg hover:bg-destructive/10 hover:text-destructive shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeAttachment(index);
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Review Summary */}
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/20 space-y-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                    <Eye className="h-3 w-3" />
                    Review Summary
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[9px] uppercase text-muted-foreground/60 font-semibold">
                        Type
                      </p>
                      <p className="text-xs font-semibold mt-0.5">
                        {selectedType?.label || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase text-muted-foreground/60 font-semibold">
                        Priority
                      </p>
                      <p className="text-xs font-semibold mt-0.5 capitalize">
                        {form.priority || "—"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[9px] uppercase text-muted-foreground/60 font-semibold">
                        Subject
                      </p>
                      <p className="text-xs font-semibold mt-0.5">
                        {form.subject || "—"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[9px] uppercase text-muted-foreground/60 font-semibold">
                        Description
                      </p>
                      <p className="text-xs text-foreground/80 mt-0.5 line-clamp-3">
                        {form.description || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase text-muted-foreground/60 font-semibold">
                        Attachments
                      </p>
                      <p className="text-xs font-semibold mt-0.5">
                        {form.attachments.length} file(s)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Confidentiality Note */}
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/15">
                  <Shield className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-blue-700 mb-0.5">
                      Confidentiality Notice
                    </p>
                    <p className="text-[11px] text-blue-600/80 leading-relaxed">
                      Your complaint will be handled confidentially. Only
                      authorized HR personnel will have access to the details
                      you've provided.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border/20 bg-muted/5 shrink-0">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              className="rounded-xl font-semibold text-xs"
              onClick={() => {
                if (step > 1) setStep(step - 1);
                else handleClose();
              }}
            >
              {step > 1 ? "Back" : "Cancel"}
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground font-medium">
                Step {step} of {totalSteps}
              </span>
              {step < totalSteps ? (
                <Button
                  className="rounded-xl font-semibold text-xs gap-2 h-10 px-6 shadow-lg shadow-primary/20"
                  onClick={() => setStep(step + 1)}
                  disabled={
                    (step === 1 && !canProceedStep1) ||
                    (step === 2 && !canProceedStep2)
                  }
                >
                  Continue
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  className="rounded-xl font-semibold text-xs gap-2 h-10 px-6 shadow-lg shadow-primary/20"
                  onClick={handleSubmit}
                  disabled={!canSubmit || submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Submit Complaint
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── COMPLAINT DETAIL DIALOG ────────────────────────────────────────────────

interface ComplaintDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  complaint: Complaint | null;
}

const ComplaintDetailDialog: React.FC<ComplaintDetailDialogProps> = ({
  open,
  onOpenChange,
  complaint: c,
}) => {
  const [showTimeline, setShowTimeline] = useState(false);

  if (!c) return null;

  const statusConfig = STATUS_CONFIG[c.status] || STATUS_CONFIG.open;
  const StatusIcon = statusConfig.icon;
  const priorityConfig =
    PRIORITY_CONFIG[c.priority] || PRIORITY_CONFIG.medium;
  const PriorityIcon = priorityConfig.icon;
  const typeConfig = COMPLAINT_TYPES.find((t) => t.value === c.complaintType);
  const TypeIcon = typeConfig?.icon || HelpCircle;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-2xl border-border/40 bg-background/95 backdrop-blur-xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 shrink-0">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent" />
          <DialogHeader className="relative">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shadow-lg shadow-primary/10">
                  <TypeIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold leading-tight">
                    {c.subject}
                  </DialogTitle>
                  <DialogDescription className="text-xs mt-1 flex items-center gap-2">
                    <span className="font-mono font-semibold">
                      {c.complaintCode}
                    </span>
                    <span className="text-primary/20">•</span>
                    <span>{typeConfig?.label || c.complaintType}</span>
                  </DialogDescription>
                </div>
              </div>
            </div>
            {/* Status + Priority */}
            <div className="flex items-center gap-2 mt-3">
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] h-6 font-bold rounded-lg",
                  statusConfig.className
                )}
              >
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] h-6 font-bold rounded-lg capitalize",
                  priorityConfig.className
                )}
              >
                <PriorityIcon className="h-3 w-3 mr-1" />
                {priorityConfig.label} Priority
              </Badge>
            </div>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              {
                label: "Filed On",
                value: formatDate(c.createdAt),
                icon: CalendarDays,
              },
              ...(c.incidentDate
                ? [
                    {
                      label: "Incident Date",
                      value: formatDate(c.incidentDate),
                      icon: CalendarDays,
                    },
                  ]
                : []),
              ...(c.incidentLocation
                ? [
                    {
                      label: "Location",
                      value: c.incidentLocation,
                      icon: MapPin,
                    },
                  ]
                : []),
              ...(c.complaintAgainst
                ? [
                    {
                      label: "Against",
                      value:
                        c.complaintAgainstName ||
                        c.complaintAgainst,
                      icon: User,
                    },
                  ]
                : []),
              ...(c.assignedTo
                ? [
                    {
                      label: "Assigned To",
                      value: c.assignedTo,
                      icon: User,
                    },
                  ]
                : []),
              ...(c.resolvedAt
                ? [
                    {
                      label: "Resolved On",
                      value: formatDate(c.resolvedAt),
                      icon: CheckCircle2,
                    },
                  ]
                : []),
            ].map((item) => {
              const ItemIcon = item.icon;
              return (
                <div
                  key={item.label}
                  className="p-3 rounded-xl bg-muted/20 border border-border/20"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <ItemIcon className="h-3 w-3 text-muted-foreground/50" />
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                      {item.label}
                    </p>
                  </div>
                  <p className="text-xs font-semibold">{item.value}</p>
                </div>
              );
            })}
          </div>

          {/* Description */}
          <div className="p-4 rounded-xl bg-muted/20 border border-border/20">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Description
            </p>
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
              {c.description}
            </p>
          </div>

          {/* Witnesses */}
          {c.witnesses && (
            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/20">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 flex items-center gap-1.5">
                <Users className="h-3 w-3" />
                Witnesses
              </p>
              <p className="text-xs text-foreground/80">{c.witnesses}</p>
            </div>
          )}

          {/* Previous Attempts */}
          {c.previousAttempts && (
            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/20">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 flex items-center gap-1.5">
                <History className="h-3 w-3" />
                Previous Attempts to Resolve
              </p>
              <p className="text-xs text-foreground/80">
                {c.previousAttempts}
              </p>
            </div>
          )}

          {/* Expected Resolution */}
          {c.expectedResolution && (
            <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/15">
              <p className="text-[10px] uppercase tracking-wider text-blue-600 font-semibold mb-1.5 flex items-center gap-1.5">
                <Lightbulb className="h-3 w-3" />
                Expected Resolution
              </p>
              <p className="text-xs text-blue-700/80">
                {c.expectedResolution}
              </p>
            </div>
          )}

          {/* Attachments */}
          {c.attachments && c.attachments.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                <Paperclip className="h-3 w-3" />
                Attachments ({c.attachments.length})
              </p>
              <div className="grid grid-cols-2 gap-2">
                {c.attachments.map((att, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/20 border border-border/20 hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                      {att.type.startsWith("image") ? (
                        <ImageIcon className="h-4 w-4 text-primary/60" />
                      ) : (
                        <FileText className="h-4 w-4 text-primary/60" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold truncate">
                        {att.name}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        {att.size}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Remarks */}
          {c.remarks && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/15">
              <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-amber-700 mb-0.5">
                  HR Remarks
                </p>
                <p className="text-xs text-amber-600/80 leading-relaxed">
                  {c.remarks}
                </p>
              </div>
            </div>
          )}

          {/* Timeline */}
          {c.timeline && c.timeline.length > 0 && (
            <div className="space-y-3">
              <button
                onClick={() => setShowTimeline(!showTimeline)}
                className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                <Clock className="h-3.5 w-3.5" />
                Activity Timeline ({c.timeline.length})
                {showTimeline ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>

              <AnimatePresence>
                {showTimeline && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="relative pl-6 space-y-4">
                      <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-border/30" />
                      {c.timeline.map((event, i) => (
                        <div key={i} className="relative">
                          <div
                            className={cn(
                              "absolute left-[-18px] top-1.5 h-3 w-3 rounded-full border-2 border-background",
                              i === 0 ? "bg-primary" : "bg-border"
                            )}
                          />
                          <div className="p-3 rounded-xl bg-muted/15 border border-border/15">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-bold">
                                {event.action}
                              </p>
                              <p className="text-[9px] text-muted-foreground">
                                {formatDate(event.date)}
                              </p>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              by {event.by}
                            </p>
                            {event.note && (
                              <p className="text-[11px] text-foreground/70 mt-1.5 leading-relaxed">
                                {event.note}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── COMPLAINT CARD ─────────────────────────────────────────────────────────

interface ComplaintCardProps {
  complaint: Complaint;
  index: number;
  onClick: (c: Complaint) => void;
}

const ComplaintCard: React.FC<ComplaintCardProps> = ({
  complaint: c,
  index,
  onClick,
}) => {
  const statusConfig = STATUS_CONFIG[c.status] || STATUS_CONFIG.open;
  const StatusIcon = statusConfig.icon;
  const priorityConfig =
    PRIORITY_CONFIG[c.priority] || PRIORITY_CONFIG.medium;
  const PriorityIcon = priorityConfig.icon;
  const typeConfig = COMPLAINT_TYPES.find((t) => t.value === c.complaintType);
  const TypeIcon = typeConfig?.icon || MessageSquare;

  return (
    <motion.div
      variants={fadeInUp}
      custom={index}
      whileHover={{ x: 4 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className="border-border/40 shadow-lg shadow-black/[0.03] hover:shadow-xl hover:shadow-primary/[0.06] hover:border-primary/15 hover:bg-muted/30 transition-all duration-400 group bg-muted/20 backdrop-blur-sm cursor-pointer"
        onClick={() => onClick(c)}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/20">
                <TypeIcon className="h-5 w-5 text-primary/60 group-hover:text-primary-foreground transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold group-hover:text-primary transition-colors truncate">
                  {c.subject}
                </p>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground flex-wrap">
                  <span className="font-mono font-semibold text-[11px]">
                    {c.complaintCode}
                  </span>
                  <span className="text-primary/20">•</span>
                  <span className="text-[11px]">
                    {typeConfig?.label || c.complaintType}
                  </span>
                  <span className="text-primary/20">•</span>
                  <span className="text-[11px]">
                    {formatDate(c.createdAt)}
                  </span>
                </div>

                {/* Description Preview */}
                {c.description && (
                  <p className="text-xs text-muted-foreground/70 mt-2 line-clamp-2 leading-relaxed">
                    {c.description}
                  </p>
                )}

                {/* Tags Row */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {c.complaintAgainst && (
                    <span className="text-[10px] text-muted-foreground/60 bg-muted/30 px-2 py-0.5 rounded-md font-medium">
                      Against: {c.complaintAgainstName || c.complaintAgainst}
                    </span>
                  )}
                  {c.attachments && c.attachments.length > 0 && (
                    <span className="text-[10px] text-muted-foreground/60 bg-muted/30 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                      <Paperclip className="h-2.5 w-2.5" />
                      {c.attachments.length}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] h-6 font-bold rounded-lg",
                  statusConfig.className
                )}
              >
                <div
                  className={cn(
                    "h-1.5 w-1.5 rounded-full mr-1.5",
                    statusConfig.dotColor,
                    (c.status === "open" || c.status === "in_progress") &&
                      "animate-pulse"
                  )}
                />
                {statusConfig.label}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] h-5 font-bold rounded-md capitalize border-0",
                  priorityConfig.badgeBg
                )}
              >
                <PriorityIcon className="h-2.5 w-2.5 mr-1" />
                {priorityConfig.label}
              </Badge>
              <div className="h-6 w-6 rounded-md bg-muted/20 flex items-center justify-center mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ─── MAIN COMPLAINTS SECTION ────────────────────────────────────────────────

export const ComplaintsSection: React.FC = () => {
  const { data } = useProfileContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [raiseDialogOpen, setRaiseDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );

  if (!data) return null;

  const COMPLAINTS: Complaint[] = data?.complaints || [];

  // Filters
  const filtered = COMPLAINTS.filter((c) => {
    const matchesStatus =
      statusFilter === "all" || c.status === statusFilter;
    const matchesPriority =
      priorityFilter === "all" || c.priority === priorityFilter;
    const matchesSearch =
      !searchQuery ||
      c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.complaintCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesPriority && matchesSearch;
  });

  // Stats
  const openCount = COMPLAINTS.filter((c) => c.status === "open").length;
  const inProgressCount = COMPLAINTS.filter(
    (c) => c.status === "in_progress"
  ).length;
  const resolvedCount = COMPLAINTS.filter(
    (c) => c.status === "resolved"
  ).length;
  const totalCount = COMPLAINTS.length;

  const handleComplaintClick = (c: Complaint) => {
    setSelectedComplaint(c);
    setDetailDialogOpen(true);
  };

  // ─── EMPTY STATE ────────────────────────────────────────────────────────
  if (COMPLAINTS.length === 0) {
    return (
      <motion.div
        key="complaints"
        variants={tabContentVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          <motion.div variants={fadeInUp}>
            <Card className="border-dashed border-2 border-border/30 bg-muted/10 backdrop-blur-sm">
              <CardContent className="py-20 px-6">
                <div className="text-center max-w-sm mx-auto">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: 0.2,
                      type: "spring",
                      stiffness: 200,
                    }}
                    className="relative w-20 h-20 mx-auto mb-6"
                  >
                    <div className="absolute inset-0 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle2 className="h-10 w-10 text-emerald-500/40" />
                    </div>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.4, type: "spring" }}
                      className="absolute -top-1 -right-1 h-7 w-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-white" />
                    </motion.div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h3 className="text-lg font-bold mb-2">
                      No Complaints Filed
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-1">
                      You haven't raised any complaints yet.
                    </p>
                    <p className="text-xs text-muted-foreground/60 mb-6">
                      If you're facing any issues at work, feel free to raise a
                      complaint. All submissions are handled confidentially.
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Button
                      className="gap-2 rounded-xl font-semibold shadow-lg shadow-primary/20 h-11 px-6"
                      onClick={() => setRaiseDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                      Raise a Complaint
                    </Button>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-6 p-4 rounded-2xl bg-muted/20 border border-border/20"
                  >
                    <div className="flex items-center gap-3 justify-center">
                      <div className="h-8 w-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Shield className="h-4 w-4 text-blue-500/60" />
                      </div>
                      <p className="text-xs text-muted-foreground text-left">
                        All complaints are treated with strict confidentiality
                        and handled by authorized HR personnel only.
                      </p>
                    </div>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        <RaiseComplaintDialog
          open={raiseDialogOpen}
          onOpenChange={setRaiseDialogOpen}
        />
      </motion.div>
    );
  }

  // ─── MAIN RENDER ────────────────────────────────────────────────────────
  return (
    <motion.div
      key="complaints"
      variants={tabContentVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* ── Stats Grid ──────────────────────────────────────────────── */}
        <motion.div
          variants={fadeInUp}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {[
            {
              label: "Total",
              value: totalCount,
              icon: MessageSquare,
              color: "text-primary",
              bg: "bg-primary/10",
              borderColor: "border-primary/10",
            },
            {
              label: "Open",
              value: openCount,
              icon: Clock,
              color: "text-blue-600",
              bg: "bg-blue-500/10",
              borderColor: "border-blue-500/10",
            },
            {
              label: "In Progress",
              value: inProgressCount,
              icon: RotateCcw,
              color: "text-amber-600",
              bg: "bg-amber-500/10",
              borderColor: "border-amber-500/10",
            },
            {
              label: "Resolved",
              value: resolvedCount,
              icon: CheckCircle2,
              color: "text-emerald-600",
              bg: "bg-emerald-500/10",
              borderColor: "border-emerald-500/10",
            },
          ].map((stat) => (
            <Card
              key={stat.label}
              className={cn(
                "border shadow-lg shadow-black/[0.02] bg-muted/20 backdrop-blur-sm hover:bg-muted/30 transition-all duration-300",
                stat.borderColor
              )}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    stat.bg
                  )}
                >
                  <stat.icon className={cn("h-4.5 w-4.5", stat.color)} />
                </div>
                <div>
                  <motion.p
                    className="text-xl font-black tracking-tight"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {stat.value}
                  </motion.p>
                  <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground font-semibold leading-tight">
                    {stat.label}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* ── Search + Filters + Raise Button ─────────────────────────── */}
        <motion.div variants={fadeInUp} className="space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <Input
                placeholder="Search complaints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 rounded-xl border-border/40 bg-muted/20 focus:bg-background text-sm"
              />
            </div>
            <Button
              className="gap-2 rounded-xl font-semibold shadow-lg shadow-primary/20 h-9 text-xs shrink-0"
              onClick={() => setRaiseDialogOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Raise Complaint
            </Button>
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mr-1 flex items-center gap-1">
              <Filter className="h-3 w-3" />
              Status:
            </span>
            {[
              { label: "All", value: "all" },
              ...Object.entries(STATUS_CONFIG).map(([key, config]) => ({
                label: config.label,
                value: key,
              })),
            ].map((f) => (
              <Button
                key={f.value}
                variant={statusFilter === f.value ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  "h-7 text-[10px] rounded-lg font-semibold transition-all",
                  statusFilter === f.value && "shadow-sm shadow-primary/20"
                )}
              >
                {f.label}
              </Button>
            ))}

            <div className="w-px h-5 bg-border/30 mx-1" />

            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mr-1">
              Priority:
            </span>
            {[
              { label: "All", value: "all" },
              ...Object.entries(PRIORITY_CONFIG).map(([key, config]) => ({
                label: config.label,
                value: key,
              })),
            ].map((f) => (
              <Button
                key={`priority-${f.value}`}
                variant={priorityFilter === f.value ? "default" : "outline"}
                size="sm"
                onClick={() => setPriorityFilter(f.value)}
                className={cn(
                  "h-7 text-[10px] rounded-lg font-semibold transition-all",
                  priorityFilter === f.value && "shadow-sm shadow-primary/20"
                )}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* ── Complaints List ─────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {filtered.length > 0 ? (
            <motion.div
              key="complaints-list"
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="space-y-3"
            >
              {filtered.map((c, index) => (
                <ComplaintCard
                  key={c.id}
                  complaint={c}
                  index={index}
                  onClick={handleComplaintClick}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="no-results"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <Card className="border-dashed border-2 border-border/30 bg-muted/10">
                <CardContent className="p-12 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
                    <Search className="h-7 w-7 text-muted-foreground/30" />
                  </div>
                  <h3 className="text-sm font-bold mb-1">
                    No complaints match your filters
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Try adjusting your search or filter criteria
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs font-semibold"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                      setPriorityFilter("all");
                    }}
                  >
                    Clear all filters
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Raise Complaint CTA ─────────────────────────────────────── */}
        <motion.div variants={fadeInUp}>
          <Card
            className="border-dashed border-2 border-border/30 bg-muted/5 hover:border-primary/20 hover:bg-primary/[0.02] transition-all duration-300 cursor-pointer group"
            onClick={() => setRaiseDialogOpen(true)}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="h-11 w-11 rounded-2xl bg-primary/5 flex items-center justify-center group-hover:bg-primary group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300">
                    <Plus className="h-5 w-5 text-primary/40 group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <div>
                    <p className="text-sm font-bold group-hover:text-primary transition-colors">
                      Have an issue to report?
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Raise a new complaint — it will be handled confidentially
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* ── Dialogs ─────────────────────────────────────────────────── */}
      <RaiseComplaintDialog
        open={raiseDialogOpen}
        onOpenChange={setRaiseDialogOpen}
      />
      <ComplaintDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        complaint={selectedComplaint}
      />
    </motion.div>
  );
};