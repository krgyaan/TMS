import React, { useState, useCallback, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  User,
  MapPin,
  Heart,
  ChevronRight,
  ChevronLeft,
  Save,
  Loader2,
  AlertCircle,
  Lock,
  CheckCircle2,
  Info,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Globe,
  Droplets,
  Linkedin,
  ShieldCheck,
  Home,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useOnboardingContext } from "./contexts/OnboardingContext";
import api from "@/lib/axios";

// ─────────────────────────────────────────────────────────────────────────────
// Validation Schemas
// ─────────────────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  // Personal
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  middleName: z.string().optional(),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.string().min(1, "Please select your gender"),
  maritalStatus: z.string().min(1, "Please select your marital status"),
  nationality: z.string().min(2, "Nationality is required"),
  bloodGroup: z.string().optional(),
  personalEmail: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  alternatePhone: z.string().optional(),
  aadharNumber: z.string().optional(),
  panNumber: z.string().optional(),
  linkedinProfile: z.string().optional(),

  // Address
  currentAddressLine1: z.string().min(5, "Address must be at least 5 characters"),
  currentAddressLine2: z.string().optional(),
  currentCity: z.string().min(2, "City is required"),
  currentState: z.string().min(2, "State is required"),
  currentCountry: z.string().min(2, "Country is required"),
  currentPostalCode: z.string().min(6, "Postal code must be at least 6 characters"),

  permanentAddressLine1: z.string().min(5, "Address must be at least 5 characters"),
  permanentAddressLine2: z.string().optional(),
  permanentCity: z.string().min(2, "City is required"),
  permanentState: z.string().min(2, "State is required"),
  permanentCountry: z.string().min(2, "Country is required"),
  permanentPostalCode: z.string().min(6, "Postal code must be at least 6 characters"),

  // Emergency Contact
  emergencyName: z.string().min(2, "Contact name must be at least 2 characters"),
  emergencyRelationship: z.string().min(2, "Please select a relationship"),
  emergencyPhone: z.string().min(10, "Phone number must be at least 10 digits"),
  emergencyAltPhone: z.string().optional(),
  emergencyEmail: z.string().email("Please enter a valid email").optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const tabs = [
  {
    id: "personal" as const,
    label: "Personal Details",
    shortLabel: "Personal",
    icon: User,
    description: "Basic identity & contact information",
  },
  {
    id: "address" as const,
    label: "Address Information",
    shortLabel: "Address",
    icon: MapPin,
    description: "Current & permanent address details",
  },
  {
    id: "emergency" as const,
    label: "Emergency Contact",
    shortLabel: "Emergency",
    icon: Heart,
    description: "Someone we can reach in an emergency",
  },
] as const;

type TabId = (typeof tabs)[number]["id"];

const TAB_FIELDS: Record<TabId, (keyof ProfileFormValues)[]> = {
  personal: [
    "firstName",
    "middleName",
    "lastName",
    "dateOfBirth",
    "gender",
    "maritalStatus",
    "nationality",
    "bloodGroup",
    "personalEmail",
    "phone",
    "alternatePhone",
    "aadharNumber",
    "panNumber",
    "linkedinProfile",
  ],
  address: [
    "currentAddressLine1",
    "currentAddressLine2",
    "currentCity",
    "currentState",
    "currentCountry",
    "currentPostalCode",
    "permanentAddressLine1",
    "permanentAddressLine2",
    "permanentCity",
    "permanentState",
    "permanentCountry",
    "permanentPostalCode",
  ],
  emergency: [
    "emergencyName",
    "emergencyRelationship",
    "emergencyPhone",
    "emergencyAltPhone",
    "emergencyEmail",
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Reusable Field Components
// ─────────────────────────────────────────────────────────────────────────────

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  icon?: React.ElementType;
  className?: string;
  disabled?: boolean;
}

function FormField({
  label,
  required,
  error,
  hint,
  children,
  icon: Icon,
  className,
  disabled,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label
        className={cn(
          "text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5 select-none",
          error ? "text-destructive" : "text-muted-foreground/80",
          disabled && "opacity-50"
        )}
      >
        {Icon && <Icon className="h-3 w-3" />}
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="relative">{children}</div>
      {error && (
        <div
          className="flex items-start gap-1.5 text-destructive animate-in fade-in slide-in-from-top-1 duration-200"
          role="alert"
        >
          <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
          <p className="text-[11px] font-medium leading-tight">{error}</p>
        </div>
      )}
      {hint && !error && (
        <p className="text-[10px] text-muted-foreground/60 leading-tight">{hint}</p>
      )}
    </div>
  );
}

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ hasError, className, disabled, ...props }, ref) => (
    <Input
      ref={ref}
      disabled={disabled}
      className={cn(
        "h-11 rounded-xl border-border/40 bg-background transition-all duration-200",
        "focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50",
        "placeholder:text-muted-foreground/40",
        hasError &&
          "border-destructive/50 bg-destructive/5 focus-visible:ring-destructive/20 focus-visible:border-destructive/50",
        disabled && "opacity-50 cursor-not-allowed bg-muted/50",
        className
      )}
      aria-invalid={hasError}
      {...props}
    />
  )
);
FormInput.displayName = "FormInput";

// ─────────────────────────────────────────────────────────────────────────────
// Section Header
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  description,
  badge,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center ring-1 ring-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground tracking-tight">
              {title}
            </h3>
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              {description}
            </p>
          </div>
        </div>
        {badge}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Summary Banner
// ─────────────────────────────────────────────────────────────────────────────

function ErrorSummary({
  errors,
  fields,
}: {
  errors: Record<string, any>;
  fields: string[];
}) {
  const relevantErrors = fields.filter((f) => errors[f]);
  if (relevantErrors.length === 0) return null;

  return (
    <div
      className="p-4 rounded-xl bg-destructive/5 border border-destructive/15 animate-in fade-in slide-in-from-top-2 duration-300"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
          <AlertCircle className="h-4 w-4 text-destructive" />
        </div>
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-semibold text-destructive">
            {relevantErrors.length} {relevantErrors.length === 1 ? "field needs" : "fields need"}{" "}
            your attention
          </p>
          <p className="text-xs text-destructive/70">
            Please fix the highlighted fields below before proceeding.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

interface OnboardingProfileFormProps {
  onCancel: () => void;
  onSuccess: () => void;
  initialTab?: "personal" | "address" | "emergency";
}

export function OnboardingProfileForm({
  onCancel,
  onSuccess,
  initialTab = "personal",
}: OnboardingProfileFormProps) {
  const { data } = useOnboardingContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [sameAsCurrent, setSameAsCurrent] = useState(false);
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(
    new Set([initialTab])
  );
  const [tabValidationAttempted, setTabValidationAttempted] = useState<
    Set<TabId>
  >(new Set());

  const P = data?.profile || ({} as any);
  const ADDR = data?.address || ({} as any);
  const EC = data?.emergencyContact || ({} as any);

  const profileHrStatus =
    data?.onboardingStatus?.profileHrStatus || P.hrStatus || "pending";
  const profileHrRemark =
    data?.onboardingStatus?.profileHrRemark || P.hrRemark || null;
  const isLocked = profileHrStatus === "approved";

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: "onTouched",
    defaultValues: {
      firstName: P.firstName || "",
      middleName: P.middleName || "",
      lastName: P.lastName || "",
      dateOfBirth: P.dateOfBirth || "",
      gender: P.gender || "",
      maritalStatus: P.maritalStatus || "",
      nationality: P.nationality || "Indian",
      bloodGroup: P.bloodGroup || "",
      personalEmail: P.personalEmail || "",
      phone: P.phone || "",
      alternatePhone: P.alternatePhone || "",
      aadharNumber: P.aadharNumber || "",
      panNumber: P.panNumber || "",
      linkedinProfile: P.linkedinProfile || "",

      currentAddressLine1: ADDR.currentAddressLine1 || "",
      currentAddressLine2: ADDR.currentAddressLine2 || "",
      currentCity: ADDR.currentCity || "",
      currentState: ADDR.currentState || "",
      currentCountry: ADDR.currentCountry || "India",
      currentPostalCode: ADDR.currentPostalCode || "",

      permanentAddressLine1: ADDR.permanentAddressLine1 || "",
      permanentAddressLine2: ADDR.permanentAddressLine2 || "",
      permanentCity: ADDR.permanentCity || "",
      permanentState: ADDR.permanentState || "",
      permanentCountry: ADDR.permanentCountry || "India",
      permanentPostalCode: ADDR.permanentPostalCode || "",

      emergencyName: EC.name || "",
      emergencyRelationship: EC.relationship || "",
      emergencyPhone: EC.phone || "",
      emergencyAltPhone: EC.altPhone || "",
      emergencyEmail: EC.email || "",
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    trigger,
    watch,
    control,
    formState: { errors, dirtyFields },
  } = form;

  // Count errors per tab for badge display
  const getTabErrorCount = useCallback(
    (tabId: TabId) => {
      return TAB_FIELDS[tabId].filter(
        (f) => errors[f as keyof typeof errors]
      ).length;
    },
    [errors]
  );

  // Tab completion status
  const getTabStatus = useCallback(
    (tabId: TabId): "complete" | "error" | "current" | "default" => {
      if (activeTab === tabId) return "current";
      const errorCount = getTabErrorCount(tabId);
      if (tabValidationAttempted.has(tabId) && errorCount > 0) return "error";
      if (visitedTabs.has(tabId) && errorCount === 0 && tabValidationAttempted.has(tabId))
        return "complete";
      return "default";
    },
    [activeTab, getTabErrorCount, visitedTabs, tabValidationAttempted]
  );

  const currentTabIndex = tabs.findIndex((t) => t.id === activeTab);

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setVisitedTabs((prev) => new Set([...prev, tabId]));
  };

  const handleNext = async () => {
    const fieldsToValidate = TAB_FIELDS[activeTab];
    setTabValidationAttempted((prev) => new Set([...prev, activeTab]));
    const isValid = await trigger(fieldsToValidate);

    if (isValid) {
      const nextTab = tabs[currentTabIndex + 1];
      if (nextTab) {
        handleTabChange(nextTab.id);
        // Scroll to top of form
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else {
      const firstErrorField = fieldsToValidate.find(
        (f) => errors[f as keyof typeof errors]
      );
      if (firstErrorField) {
        const el = document.querySelector(`[name="${firstErrorField}"]`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          (el as HTMLElement).focus();
        }
      }
      toast.error("Please fix the errors before proceeding", {
        description: `${getTabErrorCount(activeTab)} field(s) need attention`,
        icon: <AlertCircle className="h-4 w-4" />,
      });
    }
  };

  const handlePrevious = () => {
    const prevTab = tabs[currentTabIndex - 1];
    if (prevTab) {
      handleTabChange(prevTab.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const onSubmit = async (values: ProfileFormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        address: {
          currentAddressLine1: values.currentAddressLine1,
          currentAddressLine2: values.currentAddressLine2,
          currentCity: values.currentCity,
          currentState: values.currentState,
          currentCountry: values.currentCountry,
          currentPostalCode: values.currentPostalCode,
          permanentAddressLine1: values.permanentAddressLine1,
          permanentAddressLine2: values.permanentAddressLine2,
          permanentCity: values.permanentCity,
          permanentState: values.permanentState,
          permanentCountry: values.permanentCountry,
          permanentPostalCode: values.permanentPostalCode,
        },
        emergencyContact: {
          name: values.emergencyName,
          relationship: values.emergencyRelationship,
          phone: values.emergencyPhone,
          altPhone: values.emergencyAltPhone,
          email: values.emergencyEmail,
        },
      };

      await api.patch("/hrms/employee-onboarding/me/profile", payload);
      toast.success("Profile saved successfully!", {
        description: "Your details have been submitted for review.",
        icon: <CheckCircle2 className="h-4 w-4" />,
      });
      onSuccess();
    } catch (error: any) {
      console.error("Save profile error:", error);
      const message =
        error?.response?.data?.message ||
        "An unexpected error occurred. Please try again.";
      toast.error("Failed to save profile", {
        description: message,
        icon: <AlertCircle className="h-4 w-4" />,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onError = (formErrors: any) => {
    const errorFields = Object.keys(formErrors) as (keyof ProfileFormValues)[];

    // Mark all tabs as validation-attempted
    setTabValidationAttempted(new Set(tabs.map((t) => t.id)));

    // Navigate to first tab with errors
    for (const tab of tabs) {
      const hasErrorInTab = TAB_FIELDS[tab.id].some((field) =>
        errorFields.includes(field)
      );
      if (hasErrorInTab) {
        setActiveTab(tab.id);
        // Focus first error field
        setTimeout(() => {
          const firstErrorField = TAB_FIELDS[tab.id].find((f) =>
            errorFields.includes(f)
          );
          if (firstErrorField) {
            const el = document.querySelector(`[name="${firstErrorField}"]`);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              (el as HTMLElement).focus();
            }
          }
        }, 100);
        break;
      }
    }

    const totalErrors = errorFields.length;
    toast.error(`Please fix ${totalErrors} error${totalErrors > 1 ? "s" : ""} before saving`, {
      description: "Review each tab for highlighted issues.",
      icon: <AlertCircle className="h-4 w-4" />,
    });
  };

  const handleSameAddress = (checked: boolean) => {
    setSameAsCurrent(checked);
    if (checked) {
      const cur = getValues();
      setValue("permanentAddressLine1", cur.currentAddressLine1, { shouldValidate: true });
      setValue("permanentAddressLine2", cur.currentAddressLine2 || "", { shouldValidate: true });
      setValue("permanentCity", cur.currentCity, { shouldValidate: true });
      setValue("permanentState", cur.currentState, { shouldValidate: true });
      setValue("permanentCountry", cur.currentCountry, { shouldValidate: true });
      setValue("permanentPostalCode", cur.currentPostalCode, { shouldValidate: true });
    }
  };

  // Sync permanent address when current address changes and sameAsCurrent is true
  const currentAddress = watch([
    "currentAddressLine1",
    "currentAddressLine2",
    "currentCity",
    "currentState",
    "currentCountry",
    "currentPostalCode",
  ]);

  useEffect(() => {
    if (sameAsCurrent) {
      const [line1, line2, city, state, country, postal] = currentAddress;
      setValue("permanentAddressLine1", line1, { shouldValidate: false });
      setValue("permanentAddressLine2", line2 || "", { shouldValidate: false });
      setValue("permanentCity", city, { shouldValidate: false });
      setValue("permanentState", state, { shouldValidate: false });
      setValue("permanentCountry", country, { shouldValidate: false });
      setValue("permanentPostalCode", postal, { shouldValidate: false });
    }
  }, [currentAddress, sameAsCurrent, setValue]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab !== "emergency") {
      handleNext();
      return;
    }
    handleSubmit(onSubmit, onError)(e);
  };

  return (
    <form
      onSubmit={handleFormSubmit}
      className="space-y-6"
      noValidate
    >
      {/* ── Status Banners ───────────────────────────────────────────── */}
      {profileHrStatus === "rejected" && profileHrRemark && (
        <div
          className="p-4 rounded-2xl bg-destructive/5 border border-destructive/15 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300"
          role="alert"
        >
          <div className="h-9 w-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <div className="space-y-1 min-w-0">
            <h5 className="text-xs font-bold uppercase tracking-wider text-destructive">
              Profile Rejected by HR
            </h5>
            <p className="text-sm font-medium text-destructive/90">
              {profileHrRemark}
            </p>
            <p className="text-xs text-destructive/60">
              Please update the highlighted details and resubmit your profile.
            </p>
          </div>
        </div>
      )}

      {isLocked && (
        <div
          className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300"
          role="status"
        >
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Lock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="space-y-1">
            <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Profile Approved & Locked
            </h5>
            <p className="text-sm font-medium text-emerald-600/90 dark:text-emerald-400/90">
              Your profile has been approved by HR. No further edits are allowed.
            </p>
          </div>
        </div>
      )}

      {/* ── Tab Navigation ───────────────────────────────────────────── */}
      <nav aria-label="Form sections" className="relative">
        <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-2xl border border-border/10">
          {tabs.map((tab, idx) => {
            const status = getTabStatus(tab.id);
            const errorCount = getTabErrorCount(tab.id);

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                disabled={isLocked}
                aria-selected={activeTab === tab.id}
                aria-controls={`panel-${tab.id}`}
                role="tab"
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 flex-1 justify-center",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1",
                  status === "current" &&
                    "bg-background text-primary shadow-sm ring-1 ring-border/20",
                  status === "complete" &&
                    "text-emerald-600 dark:text-emerald-400 hover:bg-background/40",
                  status === "error" &&
                    "text-destructive hover:bg-destructive/5",
                  status === "default" &&
                    "text-muted-foreground hover:text-foreground hover:bg-background/40",
                  isLocked && "opacity-60 cursor-not-allowed"
                )}
              >
                <div className="relative">
                  {status === "complete" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : status === "error" ? (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  ) : (
                    <tab.icon className="h-4 w-4" />
                  )}
                </div>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
                {status === "error" && errorCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold">
                    {errorCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {/* Step indicator line */}
        <div className="flex items-center gap-1 mt-3 px-2">
          {tabs.map((tab, idx) => (
            <React.Fragment key={tab.id}>
              <div
                className={cn(
                  "h-1 rounded-full flex-1 transition-all duration-500",
                  idx <= currentTabIndex
                    ? "bg-primary"
                    : "bg-muted-foreground/10"
                )}
              />
            </React.Fragment>
          ))}
        </div>
      </nav>

      {/* ── Tab Panels ───────────────────────────────────────────────── */}
      <div className="min-h-[420px]">
        {/* ─── PERSONAL ─── */}
        {activeTab === "personal" && (
          <div
            id="panel-personal"
            role="tabpanel"
            className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6"
          >
            <SectionHeader
              icon={User}
              title="Personal Information"
              description="Your basic identity and contact details"
            />

            <ErrorSummary
              errors={errors}
              fields={TAB_FIELDS.personal}
            />

            {/* Name row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-4">
              <FormField
                label="First Name"
                required
                error={errors.firstName?.message}
                icon={User}
              >
                <FormInput
                  {...register("firstName")}
                  placeholder="John"
                  hasError={!!errors.firstName}
                  disabled={isLocked}
                  autoComplete="given-name"
                />
              </FormField>
              <FormField
                label="Middle Name"
                error={errors.middleName?.message}
              >
                <FormInput
                  {...register("middleName")}
                  placeholder="Quincy"
                  hasError={!!errors.middleName}
                  disabled={isLocked}
                  autoComplete="additional-name"
                />
              </FormField>
              <FormField
                label="Last Name"
                required
                error={errors.lastName?.message}
                icon={User}
              >
                <FormInput
                  {...register("lastName")}
                  placeholder="Doe"
                  hasError={!!errors.lastName}
                  disabled={isLocked}
                  autoComplete="family-name"
                />
              </FormField>
            </div>

            {/* DOB / Gender / Marital */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-4">
              <FormField
                label="Date of Birth"
                required
                error={errors.dateOfBirth?.message}
                icon={Calendar}
              >
                <FormInput
                  {...register("dateOfBirth")}
                  type="date"
                  hasError={!!errors.dateOfBirth}
                  disabled={isLocked}
                  autoComplete="bday"
                />
              </FormField>

              <FormField
                label="Gender"
                required
                error={errors.gender?.message}
              >
                <Controller
                  control={control}
                  name="gender"
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isLocked}
                    >
                      <SelectTrigger
                        className={cn(
                          "rounded-xl h-11 bg-background border-border/40 transition-all duration-200",
                          "focus:ring-2 focus:ring-primary/20 focus:border-primary/50",
                          errors.gender &&
                            "border-destructive/50 bg-destructive/5"
                        )}
                      >
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border/30 shadow-2xl">
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>

              <FormField
                label="Marital Status"
                required
                error={errors.maritalStatus?.message}
              >
                <Controller
                  control={control}
                  name="maritalStatus"
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isLocked}
                    >
                      <SelectTrigger
                        className={cn(
                          "rounded-xl h-11 bg-background border-border/40 transition-all duration-200",
                          "focus:ring-2 focus:ring-primary/20 focus:border-primary/50",
                          errors.maritalStatus &&
                            "border-destructive/50 bg-destructive/5"
                        )}
                      >
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border/30 shadow-2xl">
                        <SelectItem value="Single">Single</SelectItem>
                        <SelectItem value="Married">Married</SelectItem>
                        <SelectItem value="Divorced">Divorced</SelectItem>
                        <SelectItem value="Widowed">Widowed</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            </div>

            {/* Contact */}
            <Separator className="bg-border/10" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-4">
              <FormField
                label="Personal Email"
                required
                error={errors.personalEmail?.message}
                icon={Mail}
              >
                <FormInput
                  {...register("personalEmail")}
                  type="email"
                  placeholder="john@example.com"
                  hasError={!!errors.personalEmail}
                  disabled={isLocked}
                  autoComplete="email"
                />
              </FormField>
              <FormField
                label="Phone Number"
                required
                error={errors.phone?.message}
                icon={Phone}
              >
                <FormInput
                  {...register("phone")}
                  type="tel"
                  placeholder="+91 98765 43210"
                  hasError={!!errors.phone}
                  disabled={isLocked}
                  autoComplete="tel"
                />
              </FormField>
              <FormField
                label="Alternate Phone"
                error={errors.alternatePhone?.message}
                icon={Phone}
              >
                <FormInput
                  {...register("alternatePhone")}
                  type="tel"
                  placeholder="+91 98765 43210"
                  hasError={!!errors.alternatePhone}
                  disabled={isLocked}
                  autoComplete="tel"
                />
              </FormField>
            </div>

            {/* Identity */}
            <Separator className="bg-border/10" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-4">
              <FormField
                label="Nationality"
                required
                error={errors.nationality?.message}
                icon={Globe}
              >
                <FormInput
                  {...register("nationality")}
                  placeholder="Indian"
                  hasError={!!errors.nationality}
                  disabled={isLocked}
                />
              </FormField>
              <FormField
                label="Aadhar Number"
                error={errors.aadharNumber?.message}
                icon={CreditCard}
                hint="12-digit unique identification number"
              >
                <FormInput
                  {...register("aadharNumber")}
                  placeholder="XXXX XXXX XXXX"
                  hasError={!!errors.aadharNumber}
                  disabled={isLocked}
                  className="font-mono"
                />
              </FormField>
              <FormField
                label="PAN Number"
                error={errors.panNumber?.message}
                icon={ShieldCheck}
                hint="Permanent Account Number"
              >
                <FormInput
                  {...register("panNumber")}
                  placeholder="ABCDE1234F"
                  hasError={!!errors.panNumber}
                  disabled={isLocked}
                  className="font-mono uppercase"
                />
              </FormField>
            </div>

            {/* Misc */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-4">
              <FormField
                label="Blood Group"
                error={errors.bloodGroup?.message}
                icon={Droplets}
              >
                <Controller
                  control={control}
                  name="bloodGroup"
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isLocked}
                    >
                      <SelectTrigger className="rounded-xl h-11 bg-background border-border/40">
                        <SelectValue placeholder="Select blood group" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border/30 shadow-2xl">
                        {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                          (bg) => (
                            <SelectItem key={bg} value={bg}>
                              {bg}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField
                label="LinkedIn Profile"
                error={errors.linkedinProfile?.message}
                icon={Linkedin}
                className="sm:col-span-2"
              >
                <FormInput
                  {...register("linkedinProfile")}
                  placeholder="https://linkedin.com/in/johndoe"
                  hasError={!!errors.linkedinProfile}
                  disabled={isLocked}
                />
              </FormField>
            </div>
          </div>
        )}

        {/* ─── ADDRESS ─── */}
        {activeTab === "address" && (
          <div
            id="panel-address"
            role="tabpanel"
            className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-8"
          >
            <ErrorSummary
              errors={errors}
              fields={TAB_FIELDS.address}
            />

            {/* Current Address */}
            <div>
              <SectionHeader
                icon={Home}
                title="Current Address"
                description="Where you currently reside"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                <FormField
                  label="Address Line 1"
                  required
                  error={errors.currentAddressLine1?.message}
                  className="sm:col-span-2"
                >
                  <FormInput
                    {...register("currentAddressLine1")}
                    placeholder="House/Flat No., Street Name"
                    hasError={!!errors.currentAddressLine1}
                    disabled={isLocked}
                    autoComplete="address-line1"
                  />
                </FormField>
                <FormField
                  label="Address Line 2"
                  className="sm:col-span-2"
                >
                  <FormInput
                    {...register("currentAddressLine2")}
                    placeholder="Landmark, Area (optional)"
                    disabled={isLocked}
                    autoComplete="address-line2"
                  />
                </FormField>
                <FormField
                  label="City"
                  required
                  error={errors.currentCity?.message}
                >
                  <FormInput
                    {...register("currentCity")}
                    placeholder="Mumbai"
                    hasError={!!errors.currentCity}
                    disabled={isLocked}
                    autoComplete="address-level2"
                  />
                </FormField>
                <FormField
                  label="State"
                  required
                  error={errors.currentState?.message}
                >
                  <FormInput
                    {...register("currentState")}
                    placeholder="Maharashtra"
                    hasError={!!errors.currentState}
                    disabled={isLocked}
                    autoComplete="address-level1"
                  />
                </FormField>
                <FormField
                  label="Country"
                  required
                  error={errors.currentCountry?.message}
                >
                  <FormInput
                    {...register("currentCountry")}
                    placeholder="India"
                    hasError={!!errors.currentCountry}
                    disabled={isLocked}
                    autoComplete="country-name"
                  />
                </FormField>
                <FormField
                  label="Postal Code"
                  required
                  error={errors.currentPostalCode?.message}
                >
                  <FormInput
                    {...register("currentPostalCode")}
                    placeholder="400001"
                    hasError={!!errors.currentPostalCode}
                    disabled={isLocked}
                    autoComplete="postal-code"
                    className="font-mono"
                  />
                </FormField>
              </div>
            </div>

            <Separator className="bg-border/10" />

            {/* Permanent Address */}
            <div>
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center ring-1 ring-primary/10">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground tracking-tight">
                      Permanent Address
                    </h3>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      Your hometown or base address
                    </p>
                  </div>
                </div>
                <label
                  className={cn(
                    "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border cursor-pointer transition-all duration-200 select-none",
                    sameAsCurrent
                      ? "bg-primary/5 border-primary/20 text-primary"
                      : "bg-muted/30 border-border/10 text-muted-foreground hover:bg-muted/50",
                    isLocked && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Checkbox
                    id="sameAsCurrent"
                    checked={sameAsCurrent}
                    onCheckedChange={(c) => handleSameAddress(!!c)}
                    disabled={isLocked}
                    className="rounded-md"
                  />
                  <span className="text-xs font-semibold whitespace-nowrap">
                    Same as current
                  </span>
                </label>
              </div>

              {sameAsCurrent ? (
                <div className="p-6 border-2 border-dashed border-primary/10 rounded-2xl bg-primary/[0.02] text-center">
                  <CheckCircle2 className="h-8 w-8 text-primary/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground/70 font-medium">
                    Permanent address is set to your current address.
                  </p>
                  <p className="text-xs text-muted-foreground/50 mt-1">
                    Uncheck the box above to provide a different address.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <FormField
                    label="Address Line 1"
                    required
                    error={errors.permanentAddressLine1?.message}
                    className="sm:col-span-2"
                  >
                    <FormInput
                      {...register("permanentAddressLine1")}
                      placeholder="House/Flat No., Street Name"
                      hasError={!!errors.permanentAddressLine1}
                      disabled={isLocked}
                    />
                  </FormField>
                  <FormField
                    label="Address Line 2"
                    className="sm:col-span-2"
                  >
                    <FormInput
                      {...register("permanentAddressLine2")}
                      placeholder="Landmark, Area (optional)"
                      disabled={isLocked}
                    />
                  </FormField>
                  <FormField
                    label="City"
                    required
                    error={errors.permanentCity?.message}
                  >
                    <FormInput
                      {...register("permanentCity")}
                      placeholder="Mumbai"
                      hasError={!!errors.permanentCity}
                      disabled={isLocked}
                    />
                  </FormField>
                  <FormField
                    label="State"
                    required
                    error={errors.permanentState?.message}
                  >
                    <FormInput
                      {...register("permanentState")}
                      placeholder="Maharashtra"
                      hasError={!!errors.permanentState}
                      disabled={isLocked}
                    />
                  </FormField>
                  <FormField
                    label="Country"
                    required
                    error={errors.permanentCountry?.message}
                  >
                    <FormInput
                      {...register("permanentCountry")}
                      placeholder="India"
                      hasError={!!errors.permanentCountry}
                      disabled={isLocked}
                    />
                  </FormField>
                  <FormField
                    label="Postal Code"
                    required
                    error={errors.permanentPostalCode?.message}
                  >
                    <FormInput
                      {...register("permanentPostalCode")}
                      placeholder="400001"
                      hasError={!!errors.permanentPostalCode}
                      disabled={isLocked}
                      className="font-mono"
                    />
                  </FormField>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── EMERGENCY ─── */}
        {activeTab === "emergency" && (
          <div
            id="panel-emergency"
            role="tabpanel"
            className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6"
          >
            <SectionHeader
              icon={Heart}
              title="Emergency Contact"
              description="Someone we can reach in case of an emergency"
            />

            <ErrorSummary
              errors={errors}
              fields={TAB_FIELDS.emergency}
            />

            <div className="max-w-2xl">
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 flex items-start gap-3 mb-6">
                <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400/90 leading-relaxed">
                  Please provide a contact person who is not you. This person
                  will be contacted only in case of a medical or work-related
                  emergency.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                <FormField
                  label="Contact Name"
                  required
                  error={errors.emergencyName?.message}
                  icon={UserCheck}
                >
                  <FormInput
                    {...register("emergencyName")}
                    placeholder="Jane Doe"
                    hasError={!!errors.emergencyName}
                    disabled={isLocked}
                  />
                </FormField>
                <FormField
                  label="Relationship"
                  required
                  error={errors.emergencyRelationship?.message}
                  icon={Heart}
                >
                  <Controller
                    control={control}
                    name="emergencyRelationship"
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLocked}
                      >
                        <SelectTrigger
                          className={cn(
                            "rounded-xl h-11 bg-background border-border/40 transition-all duration-200",
                            "focus:ring-2 focus:ring-primary/20 focus:border-primary/50",
                            errors.emergencyRelationship &&
                              "border-destructive/50 bg-destructive/5"
                          )}
                        >
                          <SelectValue placeholder="Select relationship" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border/30 shadow-2xl">
                          {[
                            "Spouse",
                            "Parent",
                            "Sibling",
                            "Child",
                            "Friend",
                            "Other",
                          ].map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>
                <FormField
                  label="Primary Phone"
                  required
                  error={errors.emergencyPhone?.message}
                  icon={Phone}
                >
                  <FormInput
                    {...register("emergencyPhone")}
                    type="tel"
                    placeholder="+91 98765 43210"
                    hasError={!!errors.emergencyPhone}
                    disabled={isLocked}
                  />
                </FormField>
                <FormField
                  label="Alternate Phone"
                  error={errors.emergencyAltPhone?.message}
                  icon={Phone}
                >
                  <FormInput
                    {...register("emergencyAltPhone")}
                    type="tel"
                    placeholder="+91 98765 43210"
                    hasError={!!errors.emergencyAltPhone}
                    disabled={isLocked}
                  />
                </FormField>
                <FormField
                  label="Email Address"
                  error={errors.emergencyEmail?.message}
                  icon={Mail}
                  className="sm:col-span-2"
                >
                  <FormInput
                    {...register("emergencyEmail")}
                    type="email"
                    placeholder="jane.doe@example.com"
                    hasError={!!errors.emergencyEmail}
                    disabled={isLocked}
                  />
                </FormField>
              </div>
            </div>
          </div>
        )}
      </div>

      <Separator className="bg-border/10" />

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        {/* Progress indicator */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-muted-foreground/60">
            Step {currentTabIndex + 1} of {tabs.length}
          </span>
          <div className="flex items-center gap-1">
            {tabs.map((tab) => {
              const status = getTabStatus(tab.id);
              return (
                <div
                  key={tab.id}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-500",
                    status === "current" && "w-8 bg-primary",
                    status === "complete" && "w-3 bg-emerald-500",
                    status === "error" && "w-3 bg-destructive",
                    status === "default" && "w-1.5 bg-muted-foreground/15"
                  )}
                />
              );
            })}
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {currentTabIndex > 0 && (
            <Button
              key="previous-btn"
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={isLocked}
              className="rounded-xl gap-2 h-11 px-6 flex-1 sm:flex-none border-border/30 hover:bg-muted/50"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </Button>
          )}

          {currentTabIndex === 0 && (
            <Button
              key="cancel-btn"
              type="button"
              variant="ghost"
              onClick={onCancel}
              className="rounded-xl gap-2 h-11 px-6 flex-1 sm:flex-none text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
          )}

          {activeTab !== "emergency" ? (
            <Button
              key="continue-btn"
              type="button"
              onClick={handleNext}
              disabled={isLocked}
              className="rounded-xl gap-2 h-11 px-8 flex-1 sm:flex-none shadow-lg shadow-primary/15 hover:shadow-primary/25 transition-shadow"
            >
              <span>Continue</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              key="submit-btn"
              type="submit"
              disabled={isSubmitting || isLocked}
              className={cn(
                "rounded-xl gap-2 h-11 px-10 flex-1 sm:flex-none shadow-lg transition-all duration-300",
                profileHrStatus === "rejected"
                  ? "bg-amber-600 hover:bg-amber-700 shadow-amber-500/15"
                  : "shadow-primary/15 hover:shadow-primary/25"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>
                    {profileHrStatus === "rejected"
                      ? "Resubmit Profile"
                      : "Save Profile"}
                  </span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}