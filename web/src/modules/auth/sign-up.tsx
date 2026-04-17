import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import {
  User,
  MapPin,
  Phone,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  Mail,
  Calendar,
  Hash,
  HeartHandshake,
  Building2,
} from "lucide-react";
import { useSubmitSignup } from "@/hooks/api/useSignUp";
import { cn } from "@/lib/utils";


// ─── Schemas ────────────────────────────────────────────────────────────────

const personalSchema = z.object({
  employeeId: z.string().optional(),
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["Male", "Female", "Other"], { required_error: "Gender is required" }),
  maritalStatus: z.string().min(1, "Marital status is required"),
  nationality: z.string().min(1, "Nationality is required"),
  personalEmail: z.string().email("Enter a valid email"),
  phone: z.string().min(7, "Enter a valid phone number"),
  alternatePhone: z.string().optional(),
  aadharNumber: z.string().optional(),
  panNumber: z.string().optional(),
});

const addressSchema = z.object({
  currentAddressLine1: z.string().min(1, "Address line 1 is required"),
  currentAddressLine2: z.string().optional(),
  currentCity: z.string().min(1, "City is required"),
  currentState: z.string().min(1, "State is required"),
  currentCountry: z.string().min(1, "Country is required"),
  currentPostalCode: z.string().min(1, "Postal code is required"),
  sameAsCurrent: z.boolean().optional(),
  permanentAddressLine1: z.string().optional(),
  permanentAddressLine2: z.string().optional(),
  permanentCity: z.string().optional(),
  permanentState: z.string().optional(),
  permanentCountry: z.string().optional(),
  permanentPostalCode: z.string().optional(),
  emergencyContactName: z.string().min(1, "Contact name is required"),
  emergencyContactRelationship: z.string().min(1, "Relationship is required"),
  emergencyContactPhone: z.string().min(7, "Valid phone required"),
  emergencyContactAltPhone: z.string().optional(),
  emergencyContactEmail: z.string().email().optional().or(z.literal("")),
});

const fullSchema = personalSchema.merge(addressSchema);
type FormData = z.infer<typeof fullSchema>;

// ─── Constants ───────────────────────────────────────────────────────────────

const NATIONALITIES = [
  "Indian", "American", "British", "Canadian", "Australian",
  "German", "French", "Singaporean", "Other",
];

const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Other",
];

const COUNTRIES = [
  "India", "United States", "United Kingdom", "Canada",
  "Australia", "Singapore", "Germany", "France", "Other",
];

const RELATIONSHIPS = ["Spouse", "Parent", "Sibling", "Child", "Friend", "Other"];

const MARITAL_STATUSES = ["Single", "Married", "Divorced", "Widowed"];

const COUNTRY_CODES = [
  { code: "+91", label: "IN +91" },
  { code: "+1", label: "US +1" },
  { code: "+44", label: "UK +44" },
  { code: "+61", label: "AU +61" },
  { code: "+65", label: "SG +65" },
];

const generateEmployeeId = () => {
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `EMP${year}${random}`;
};

// ─── Step Config ─────────────────────────────────────────────────────────────

const STEPS = [
  {
    id: 1,
    key: "personal",
    title: "Personal Info",
    subtitle: "Tell us about yourself",
    icon: User,
    fields: ["firstName", "lastName", "dateOfBirth", "gender", "personalEmail", "phone"],
  },
  {
    id: 2,
    key: "address",
    title: "Address",
    subtitle: "Where do you live?",
    icon: MapPin,
    fields: ["currentAddressLine1", "currentCity", "currentState", "currentPostalCode"],
  },
  {
    id: 3,
    key: "emergency",
    title: "Emergency Contact",
    subtitle: "Who should we contact?",
    icon: HeartHandshake,
    fields: ["emergencyContactName", "emergencyContactRelationship", "emergencyContactPhone"],
  },
];

// ─── Animated Wrapper ────────────────────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -60 : 60,
    opacity: 0,
    transition: { duration: 0.2, ease: "easeIn" },
  }),
};

// ─── Field Components ────────────────────────────────────────────────────────

interface FieldWrapperProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  hint?: string;
}

const FieldWrapper: React.FC<FieldWrapperProps> = ({ label, required, error, children, hint }) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-medium text-foreground">
      {label}
      {required && <span className="text-destructive ml-1">*</span>}
    </Label>
    {children}
    {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    {error && (
      <motion.p
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xs text-destructive flex items-center gap-1"
      >
        <AlertCircle className="h-3 w-3 flex-shrink-0" />
        {error}
      </motion.p>
    )}
  </div>
);

// ─── Section Header ───────────────────────────────────────────────────────────

const SectionLabel: React.FC<{ icon: React.ElementType; label: string }> = ({ icon: Icon, label }) => (
  <div className="flex items-center gap-2 mb-4">
    <div className="h-px flex-1 bg-border" />
    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
    <div className="h-px flex-1 bg-border" />
  </div>
);

// ─── Phone Input ─────────────────────────────────────────────────────────────

interface PhoneInputProps {
  value?: string;
  onChange: (val: string) => void;
  placeholder?: string;
  error?: boolean;
}

const PhoneInput: React.FC<PhoneInputProps> = ({ value = "", onChange, placeholder, error }) => {
  const [code, setCode] = useState("+91");
  const [number, setNumber] = useState("");

  useEffect(() => {
    onChange(`${code} ${number}`);
  }, [code, number]);

  return (
    <div className="flex gap-2">
      <Select value={code} onValueChange={setCode}>
        <SelectTrigger className={cn("w-28 shrink-0", error && "border-destructive")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COUNTRY_CODES.map((c) => (
            <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        value={number}
        onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))}
        placeholder={placeholder || "Phone number"}
        className={cn("flex-1", error && "border-destructive")}
      />
    </div>
  );
};

// ─── Step Indicators ─────────────────────────────────────────────────────────

interface StepIndicatorProps {
  steps: typeof STEPS;
  current: number;
  completed: number[];
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, current, completed }) => (
  <div className="flex items-center justify-center gap-0">
    {steps.map((step, i) => {
      const isDone = completed.includes(step.id);
      const isActive = step.id === current;
      const Icon = step.icon;

      return (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center gap-1">
            <motion.div
              animate={{
                scale: isActive ? 1.1 : 1,
              }}
              transition={{ duration: 0.2 }}
              className={cn(
                "flex items-center justify-center w-9 h-9 rounded-full border-2 transition-colors duration-300",
                isDone
                  ? "bg-primary border-primary text-primary-foreground"
                  : isActive
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border text-muted-foreground bg-background"
              )}
            >
              {isDone ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
            </motion.div>
            <span
              className={cn(
                "text-[10px] font-medium hidden sm:block transition-colors",
                isActive ? "text-primary" : isDone ? "text-muted-foreground" : "text-muted-foreground/60"
              )}
            >
              {step.title}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "h-0.5 w-12 sm:w-20 mb-4 mx-1 transition-colors duration-500",
                completed.includes(step.id) ? "bg-primary" : "bg-border"
              )}
            />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [direction, setDirection] = useState(1);
  const [sameAsCurrent, setSameAsCurrent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submitSignupMutation = useSubmitSignup();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    trigger,
    getValues,
  } = useForm<FormData>({
    resolver: zodResolver(fullSchema),
    defaultValues: {
      employeeId: generateEmployeeId(),
      gender: "Male",
      currentCountry: "India",
      permanentCountry: "India",
    },
    mode: "onChange",
  });

  const totalSteps = STEPS.length;
  const progress = ((completedSteps.length) / totalSteps) * 100;
  const currentStepConfig = STEPS.find((s) => s.id === currentStep)!;

  // ── Validate current step fields ──────────────────────────────────────────

  const validateCurrentStep = async (): Promise<boolean> => {
    const fieldsToValidate = currentStepConfig.fields as (keyof FormData)[];
    return trigger(fieldsToValidate);
  };

  // ── Navigation ────────────────────────────────────────────────────────────

  const goNext = async () => {
    const valid = await validateCurrentStep();
    if (!valid) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setCompletedSteps((prev) => [...new Set([...prev, currentStep])]);
    setDirection(1);
    setCurrentStep((s) => Math.min(s + 1, totalSteps));
  };

  const goPrev = () => {
    setDirection(-1);
    setCurrentStep((s) => Math.max(s - 1, 1));
  };

  // ── Same address handler ──────────────────────────────────────────────────

  const handleSameAsCurrentChange = (checked: boolean) => {
    setSameAsCurrent(checked);
    setValue("sameAsCurrent", checked);
    if (checked) {
      const v = getValues();
      setValue("permanentAddressLine1", v.currentAddressLine1);
      setValue("permanentAddressLine2", v.currentAddressLine2);
      setValue("permanentCity", v.currentCity);
      setValue("permanentState", v.currentState);
      setValue("permanentCountry", v.currentCountry);
      setValue("permanentPostalCode", v.currentPostalCode);
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const onSubmit = async (data: FormData) => {
      setIsSubmitting(true);
      try {
          await submitSignupMutation.mutateAsync({
              // Personal
              firstName: data.firstName,
              middleName: data.middleName,
              lastName: data.lastName,
              dateOfBirth: data.dateOfBirth,
              gender: data.gender as "Male" | "Female" | "Other",
              maritalStatus: data.maritalStatus!,
              nationality: data.nationality!,
              personalEmail: data.personalEmail,
              phone: data.phone,
              alternatePhone: data.alternatePhone,
              aadharNumber: data.aadharNumber,
              panNumber: data.panNumber,

              // Current Address
              currentAddressLine1: data.currentAddressLine1,
              currentAddressLine2: data.currentAddressLine2,
              currentCity: data.currentCity,
              currentState: data.currentState,
              currentCountry: data.currentCountry,
              currentPostalCode: data.currentPostalCode,

              // Permanent Address
              sameAsCurrent: data.sameAsCurrent,
              permanentAddressLine1: data.permanentAddressLine1,
              permanentAddressLine2: data.permanentAddressLine2,
              permanentCity: data.permanentCity,
              permanentState: data.permanentState,
              permanentCountry: data.permanentCountry,
              permanentPostalCode: data.permanentPostalCode,

              // Emergency Contact
              emergencyContactName: data.emergencyContactName,
              emergencyContactRelationship: data.emergencyContactRelationship,
              emergencyContactPhone: data.emergencyContactPhone,
              emergencyContactAltPhone: data.emergencyContactAltPhone,
              emergencyContactEmail: data.emergencyContactEmail,
          });
          
          // Show success screen
          setSubmitted(true);
      } catch (e) {
          // Error toast is handled automatically by the hook's onError callback
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleFinalSubmit = async () => {
    const valid = await validateCurrentStep();
    if (!valid) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setCompletedSteps((prev) => [...new Set([...prev, currentStep])]);
    handleSubmit(onSubmit)();
  };

  // ── Success Screen ────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-2">You're all set!</h2>
          <p className="text-muted-foreground mb-6">
            Your registration has been submitted successfully. HR will review your information shortly.
          </p>
          <div className="p-3 bg-muted rounded-lg inline-flex items-center gap-2 text-sm font-mono">
            <Hash className="h-4 w-4 text-muted-foreground" />
            {watch("employeeId")}
          </div>
        </motion.div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-semibold text-base sm:text-lg">Employee Registration</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Complete all steps to submit your information
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono bg-muted px-2 py-1 rounded text-[11px]">
                {watch("employeeId")}
              </span>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-3">
            <Progress value={progress} className="h-1.5" />
            <StepIndicator steps={STEPS} current={currentStep} completed={completedSteps} />
          </div>
        </div>
      </div>

      {/* Form body */}
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-6 sm:py-10">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="flex-1"
          >
            <Card className="border shadow-sm">
              {/* Step header */}
              <div className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {React.createElement(currentStepConfig.icon, {
                      className: "h-5 w-5 text-primary",
                    })}
                  </div>
                  <div>
                    <h2 className="font-semibold text-base">{currentStepConfig.title}</h2>
                    <p className="text-xs text-muted-foreground">{currentStepConfig.subtitle}</p>
                  </div>
                  <div className="ml-auto text-xs text-muted-foreground font-medium">
                    {currentStep} / {totalSteps}
                  </div>
                </div>
              </div>

              <CardContent className="p-6 space-y-6">
                {/* ── Step 1: Personal Information ── */}
                {currentStep === 1 && (
                  <div className="space-y-5">
                    {/* Name */}
                    <SectionLabel icon={User} label="Full Name" />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <FieldWrapper label="First Name" required error={errors.firstName?.message}>
                        <Input
                          {...register("firstName")}
                          placeholder="John"
                          className={cn(errors.firstName && "border-destructive")}
                        />
                      </FieldWrapper>
                      <FieldWrapper label="Middle Name" error={errors.middleName?.message}>
                        <Input {...register("middleName")} placeholder="William" />
                      </FieldWrapper>
                      <FieldWrapper label="Last Name" required error={errors.lastName?.message}>
                        <Input
                          {...register("lastName")}
                          placeholder="Doe"
                          className={cn(errors.lastName && "border-destructive")}
                        />
                      </FieldWrapper>
                    </div>

                    {/* Personal Details */}
                    <SectionLabel icon={Calendar} label="Personal Details" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FieldWrapper label="Date of Birth" required error={errors.dateOfBirth?.message}>
                        <Input
                          type="date"
                          {...register("dateOfBirth")}
                          className={cn(errors.dateOfBirth && "border-destructive")}
                        />
                      </FieldWrapper>

                      <FieldWrapper label="Marital Status" required error={errors.maritalStatus?.message}>
                        <Select onValueChange={(v) => setValue("maritalStatus", v)}>
                          <SelectTrigger className={cn(errors.maritalStatus && "border-destructive")}>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            {MARITAL_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FieldWrapper>
                    </div>

                    <FieldWrapper label="Gender" required error={errors.gender?.message}>
                      <RadioGroup
                        defaultValue="Male"
                        onValueChange={(v) => setValue("gender", v as "Male" | "Female" | "Other")}
                        className="flex gap-6 pt-1"
                      >
                        {["Male", "Female", "Other"].map((g) => (
                          <div key={g} className="flex items-center gap-2">
                            <RadioGroupItem value={g} id={`gender-${g}`} />
                            <Label htmlFor={`gender-${g}`} className="font-normal cursor-pointer">{g}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FieldWrapper>

                    <FieldWrapper label="Nationality" required error={errors.nationality?.message}>
                      <Select onValueChange={(v) => setValue("nationality", v)}>
                        <SelectTrigger className={cn(errors.nationality && "border-destructive")}>
                          <SelectValue placeholder="Select nationality" />
                        </SelectTrigger>
                        <SelectContent>
                          {NATIONALITIES.map((n) => (
                            <SelectItem key={n} value={n}>{n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldWrapper>

                    {/* Contact */}
                    <SectionLabel icon={Phone} label="Contact" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FieldWrapper label="Personal Email" required error={errors.personalEmail?.message}>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                          <Input
                            type="email"
                            {...register("personalEmail")}
                            placeholder="john@gmail.com"
                            className={cn("pl-9", errors.personalEmail && "border-destructive")}
                          />
                        </div>
                      </FieldWrapper>

                      <FieldWrapper label="Phone Number" required error={errors.phone?.message}>
                        <PhoneInput
                          onChange={(v) => setValue("phone", v)}
                          error={!!errors.phone}
                          placeholder="98765 43210"
                        />
                      </FieldWrapper>

                      <FieldWrapper label="Alternate Phone" error={errors.alternatePhone?.message}>
                        <PhoneInput
                          onChange={(v) => setValue("alternatePhone", v)}
                          placeholder="98765 43210"
                        />
                      </FieldWrapper>
                    </div>

                    {/* Identity */}
                    <SectionLabel icon={Shield} label="Identity (Optional)" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FieldWrapper
                        label="Aadhar Number"
                        error={errors.aadharNumber?.message}
                        hint="12-digit unique identification number"
                      >
                        <Input
                          {...register("aadharNumber")}
                          placeholder="1234 5678 9012"
                          maxLength={12}
                          className="font-mono tracking-wider"
                        />
                      </FieldWrapper>

                      <FieldWrapper
                        label="PAN Number"
                        error={errors.panNumber?.message}
                        hint="10-character alphanumeric identifier"
                      >
                        <Input
                          {...register("panNumber")}
                          placeholder="ABCDE1234F"
                          maxLength={10}
                          className="font-mono uppercase tracking-wider"
                        />
                      </FieldWrapper>
                    </div>
                  </div>
                )}

                {/* ── Step 2: Address ── */}
                {currentStep === 2 && (
                  <div className="space-y-5">
                    {/* Current Address */}
                    <SectionLabel icon={MapPin} label="Current Address" />
                    <div className="space-y-4">
                      <FieldWrapper
                        label="Address Line 1"
                        required
                        error={errors.currentAddressLine1?.message}
                      >
                        <Input
                          {...register("currentAddressLine1")}
                          placeholder="House no., street, area"
                          className={cn(errors.currentAddressLine1 && "border-destructive")}
                        />
                      </FieldWrapper>

                      <FieldWrapper label="Address Line 2" error={errors.currentAddressLine2?.message}>
                        <Input
                          {...register("currentAddressLine2")}
                          placeholder="Landmark, apartment, suite"
                        />
                      </FieldWrapper>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="col-span-2 sm:col-span-1">
                          <FieldWrapper label="City" required error={errors.currentCity?.message}>
                            <Input
                              {...register("currentCity")}
                              placeholder="Bengaluru"
                              className={cn(errors.currentCity && "border-destructive")}
                            />
                          </FieldWrapper>
                        </div>

                        <div className="col-span-2 sm:col-span-1">
                          <FieldWrapper label="State" required error={errors.currentState?.message}>
                            <Select onValueChange={(v) => setValue("currentState", v)}>
                              <SelectTrigger className={cn(errors.currentState && "border-destructive")}>
                                <SelectValue placeholder="State" />
                              </SelectTrigger>
                              <SelectContent>
                                {STATES.map((s) => (
                                  <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FieldWrapper>
                        </div>

                        <div className="col-span-2 sm:col-span-1">
                          <FieldWrapper label="Country" required error={errors.currentCountry?.message}>
                            <Select
                              defaultValue="India"
                              onValueChange={(v) => setValue("currentCountry", v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Country" />
                              </SelectTrigger>
                              <SelectContent>
                                {COUNTRIES.map((c) => (
                                  <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FieldWrapper>
                        </div>

                        <div className="col-span-2 sm:col-span-1">
                          <FieldWrapper
                            label="Postal Code"
                            required
                            error={errors.currentPostalCode?.message}
                          >
                            <Input
                              {...register("currentPostalCode")}
                              placeholder="560001"
                              className={cn(errors.currentPostalCode && "border-destructive")}
                            />
                          </FieldWrapper>
                        </div>
                      </div>
                    </div>

                    {/* Permanent Address */}
                    <div className="flex items-center gap-3 my-2">
                      <div className="h-px flex-1 bg-border" />
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <Building2 className="h-3.5 w-3.5" />
                        Permanent Address
                      </div>
                      <div className="h-px flex-1 bg-border" />
                    </div>

                    <div
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors cursor-pointer",
                        sameAsCurrent
                          ? "bg-primary/5 border-primary/30"
                          : "bg-muted/40 border-border"
                      )}
                      onClick={() => handleSameAsCurrentChange(!sameAsCurrent)}
                    >
                      <Checkbox
                        id="sameAsCurrent"
                        checked={sameAsCurrent}
                        onCheckedChange={handleSameAsCurrentChange}
                      />
                      <Label
                        htmlFor="sameAsCurrent"
                        className="text-sm font-medium cursor-pointer select-none"
                      >
                        Same as current address
                      </Label>
                    </div>

                    <AnimatePresence>
                      {!sameAsCurrent && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden space-y-4"
                        >
                          <FieldWrapper label="Address Line 1" error={errors.permanentAddressLine1?.message}>
                            <Input
                              {...register("permanentAddressLine1")}
                              placeholder="House no., street, area"
                            />
                          </FieldWrapper>

                          <FieldWrapper label="Address Line 2" error={errors.permanentAddressLine2?.message}>
                            <Input
                              {...register("permanentAddressLine2")}
                              placeholder="Landmark, apartment, suite"
                            />
                          </FieldWrapper>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="col-span-2 sm:col-span-1">
                              <FieldWrapper label="City" error={errors.permanentCity?.message}>
                                <Input {...register("permanentCity")} placeholder="City" />
                              </FieldWrapper>
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                              <FieldWrapper label="State" error={errors.permanentState?.message}>
                                <Select onValueChange={(v) => setValue("permanentState", v)}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="State" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {STATES.map((s) => (
                                      <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FieldWrapper>
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                              <FieldWrapper label="Country" error={errors.permanentCountry?.message}>
                                <Select
                                  defaultValue="India"
                                  onValueChange={(v) => setValue("permanentCountry", v)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Country" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {COUNTRIES.map((c) => (
                                      <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FieldWrapper>
                            </div>

                            <div className="col-span-2 sm:col-span-1">
                              <FieldWrapper label="Postal Code" error={errors.permanentPostalCode?.message}>
                                <Input {...register("permanentPostalCode")} placeholder="560001" />
                              </FieldWrapper>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* ── Step 3: Emergency Contact ── */}
                {currentStep === 3 && (
                  <div className="space-y-5">
                    <SectionLabel icon={HeartHandshake} label="Emergency Contact Details" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FieldWrapper
                        label="Contact Name"
                        required
                        error={errors.emergencyContactName?.message}
                      >
                        <Input
                          {...register("emergencyContactName")}
                          placeholder="Full name"
                          className={cn(errors.emergencyContactName && "border-destructive")}
                        />
                      </FieldWrapper>

                      <FieldWrapper
                        label="Relationship"
                        required
                        error={errors.emergencyContactRelationship?.message}
                      >
                        <Select onValueChange={(v) => setValue("emergencyContactRelationship", v)}>
                          <SelectTrigger
                            className={cn(errors.emergencyContactRelationship && "border-destructive")}
                          >
                            <SelectValue placeholder="Select relationship" />
                          </SelectTrigger>
                          <SelectContent>
                            {RELATIONSHIPS.map((r) => (
                              <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FieldWrapper>

                      <FieldWrapper
                        label="Phone Number"
                        required
                        error={errors.emergencyContactPhone?.message}
                      >
                        <PhoneInput
                          onChange={(v) => setValue("emergencyContactPhone", v)}
                          error={!!errors.emergencyContactPhone}
                          placeholder="98765 43210"
                        />
                      </FieldWrapper>

                      <FieldWrapper label="Alternate Phone" error={errors.emergencyContactAltPhone?.message}>
                        <PhoneInput
                          onChange={(v) => setValue("emergencyContactAltPhone", v)}
                          placeholder="98765 43210"
                        />
                      </FieldWrapper>

                      <div className="sm:col-span-2">
                        <FieldWrapper label="Email" error={errors.emergencyContactEmail?.message}>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                              type="email"
                              {...register("emergencyContactEmail")}
                              placeholder="contact@email.com"
                              className="pl-9"
                            />
                          </div>
                        </FieldWrapper>
                      </div>
                    </div>

                    {/* Summary confirmation */}
                    <div className="mt-4 p-4 rounded-xl bg-muted/50 border space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Review before submitting
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Name: </span>
                          <span className="font-medium">
                            {[watch("firstName"), watch("middleName"), watch("lastName")]
                              .filter(Boolean)
                              .join(" ") || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Email: </span>
                          <span className="font-medium">{watch("personalEmail") || "—"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Phone: </span>
                          <span className="font-medium">{watch("phone") || "—"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">City: </span>
                          <span className="font-medium">
                            {[watch("currentCity"), watch("currentState")].filter(Boolean).join(", ") || "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={goPrev}
            disabled={currentStep === 1 || isSubmitting}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="flex items-center gap-1.5">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={cn(
                  "rounded-full transition-all duration-300",
                  s.id === currentStep
                    ? "w-6 h-2 bg-primary"
                    : completedSteps.includes(s.id)
                    ? "w-2 h-2 bg-primary/50"
                    : "w-2 h-2 bg-border"
                )}
              />
            ))}
          </div>

          {currentStep < totalSteps ? (
            <Button type="button" onClick={goNext} className="gap-2">
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="gap-2 min-w-32"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Submit
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignUp;