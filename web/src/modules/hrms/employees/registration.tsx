import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  ArrowLeft, 
  ArrowRight, 
  Loader2, 
  UploadCloud, 
  User, 
  MapPin, 
  Briefcase, 
  CreditCard,
  GraduationCap,
  Building2,
  FileText,
  CheckCircle2,
  Circle,
  AlertCircle,
  Plus,
  Trash2,
  Save,
  SkipForward,
  Phone,
  Mail,
  Calendar,
  Shield,
  AlertTriangle,
  ChevronRight,
  X,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";

import { useUsers } from "@/hooks/api/useUsers";
import { useCreateHrmsEmployeeProfile } from "@/hooks/api/useHrmsEmployeeProfiles";
import { useUpdateUserProfile } from "@/hooks/api/useUserProfiles";

// Validation Schemas for each step
const personalInfoSchema = z.object({
  employeeId: z.string().optional(),
  firstName: z.string().min(1, "First Name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last Name is required"),
  dateOfBirth: z.string().min(1, "Date of Birth is required"),
  gender: z.string().min(1, "Gender is required"),
  maritalStatus: z.string().min(1, "Marital Status is required"),
  nationality: z.string().min(1, "Nationality is required"),
  personalEmail: z.string().email("Valid email required"),
  phone: z.string().min(10, "Valid phone number required"),
  alternatePhone: z.string().optional(),
  aadharNumber: z.string().min(12, "Valid Aadhar Number required").max(12),
  panNumber: z.string().min(10, "Valid PAN Number required").max(10),
});

const addressSchema = z.object({
  currentAddressLine1: z.string().min(1, "Address Line 1 is required"),
  currentAddressLine2: z.string().optional(),
  currentCity: z.string().min(1, "City is required"),
  currentState: z.string().min(1, "State is required"),
  currentCountry: z.string().min(1, "Country is required"),
  currentPostalCode: z.string().min(1, "Postal Code is required"),
  sameAsCurrent: z.boolean().optional(),
  permanentAddressLine1: z.string().optional(),
  permanentAddressLine2: z.string().optional(),
  permanentCity: z.string().optional(),
  permanentState: z.string().optional(),
  permanentCountry: z.string().optional(),
  permanentPostalCode: z.string().optional(),
  emergencyContactName: z.string().min(1, "Emergency Contact Name is required"),
  emergencyContactRelationship: z.string().min(1, "Relationship is required"),
  emergencyContactPhone: z.string().min(10, "Valid phone required"),
  emergencyContactAltPhone: z.string().optional(),
  emergencyContactEmail: z.string().email().optional().or(z.literal("")),
});

const employmentSchema = z.object({
  userId: z.number().positive("User selection is required"),
  employeeType: z.string().min(1, "Employee Type is required"),
  designation: z.string().min(1, "Designation is required"),
  department: z.string().min(1, "Department is required"),
  reportingManager: z.string().optional(),
  workLocation: z.string().min(1, "Work Location is required"),
  employeeStatus: z.string().default("active"),
  probationPeriod: z.string().optional(),
  probationEndDate: z.string().optional(),
  dateOfJoining: z.string().min(1, "Date of Joining is required"),
  officialEmail: z.string().email("Valid official email required"),
});

const compensationSchema = z.object({
  salaryType: z.string().min(1, "Salary Type is required"),
  basicSalary: z.string().min(1, "Basic Salary/CTC is required"),
  bankName: z.string().min(1, "Bank Name is required"),
  accountHolderName: z.string().min(1, "Account Holder Name is required"),
  accountNumber: z.string().min(1, "Account Number is required"),
  ifscCode: z.string().min(1, "IFSC Code is required"),
  branchName: z.string().optional(),
  branchAddress: z.string().optional(),
});

const educationSchema = z.object({
  qualifications: z.array(z.object({
    degree: z.string().optional(),
    institution: z.string().optional(),
    fieldOfStudy: z.string().optional(),
    yearOfCompletion: z.string().optional(),
    grade: z.string().optional(),
  })).optional(),
});

const experienceSchema = z.object({
  experiences: z.array(z.object({
    companyName: z.string().optional(),
    designation: z.string().optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
    currentlyWorking: z.boolean().optional(),
    responsibilities: z.string().optional(),
  })).optional(),
});

// Combined schema with partial validation for skippable fields
const fullSchema = z.object({
  // Personal Info
  employeeId: z.string().optional(),
  firstName: z.string().optional(),
  middleName: z.string().optional(),
  lastName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  maritalStatus: z.string().optional(),
  nationality: z.string().optional(),
  personalEmail: z.string().optional(),
  phone: z.string().optional(),
  alternatePhone: z.string().optional(),
  aadharNumber: z.string().optional(),
  panNumber: z.string().optional(),
  
  // Address
  currentAddressLine1: z.string().optional(),
  currentAddressLine2: z.string().optional(),
  currentCity: z.string().optional(),
  currentState: z.string().optional(),
  currentCountry: z.string().optional(),
  currentPostalCode: z.string().optional(),
  sameAsCurrent: z.boolean().optional(),
  permanentAddressLine1: z.string().optional(),
  permanentAddressLine2: z.string().optional(),
  permanentCity: z.string().optional(),
  permanentState: z.string().optional(),
  permanentCountry: z.string().optional(),
  permanentPostalCode: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactAltPhone: z.string().optional(),
  emergencyContactEmail: z.string().optional(),
  
  // Employment
  userId: z.number().optional(),
  employeeType: z.string().optional(),
  designation: z.string().optional(),
  department: z.string().optional(),
  reportingManager: z.string().optional(),
  workLocation: z.string().optional(),
  employeeStatus: z.string().optional(),
  probationPeriod: z.string().optional(),
  probationEndDate: z.string().optional(),
  dateOfJoining: z.string().optional(),
  officialEmail: z.string().optional(),
  
  // Compensation
  salaryType: z.string().optional(),
  basicSalary: z.string().optional(),
  bankName: z.string().optional(),
  accountHolderName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  branchName: z.string().optional(),
  branchAddress: z.string().optional(),
  
  // Education & Experience
  qualifications: z.array(z.any()).optional(),
  experiences: z.array(z.any()).optional(),
});

type FormData = z.infer<typeof fullSchema>;

// Step Configuration
const STEPS = [
  { 
    id: 1, 
    title: "Personal Info", 
    icon: User, 
    description: "Basic details",
    required: true,
    requiredFields: ['firstName', 'lastName', 'dateOfBirth', 'gender', 'personalEmail', 'phone']
  },
  { 
    id: 2, 
    title: "Address", 
    icon: MapPin, 
    description: "Contact & address",
    required: true,
    requiredFields: ['currentAddressLine1', 'currentCity', 'currentState', 'emergencyContactName', 'emergencyContactPhone']
  },
  { 
    id: 3, 
    title: "Employment", 
    icon: Briefcase, 
    description: "Job details",
    required: true,
    requiredFields: ['userId', 'employeeType', 'designation', 'department', 'workLocation', 'officialEmail']
  },
  { 
    id: 4, 
    title: "Compensation", 
    icon: CreditCard, 
    description: "Salary & bank",
    required: false,
    requiredFields: ['salaryType', 'basicSalary', 'bankName', 'accountNumber', 'ifscCode']
  },
  { 
    id: 5, 
    title: "Education", 
    icon: GraduationCap, 
    description: "Qualifications",
    required: false,
    requiredFields: []
  },
  { 
    id: 6, 
    title: "Experience", 
    icon: Building2, 
    description: "Work history",
    required: false,
    requiredFields: []
  },
  { 
    id: 7, 
    title: "Documents", 
    icon: FileText, 
    description: "Upload files",
    required: false,
    requiredFields: []
  },
  { 
    id: 8, 
    title: "Review", 
    icon: CheckCircle2, 
    description: "Final check",
    required: true,
    requiredFields: []
  },
];

const NATIONALITIES = [
  "Indian", "American", "British", "Canadian", "Australian", "German", "French", "Other"
];

const STATES = [
  "Andhra Pradesh", "Karnataka", "Kerala", "Maharashtra", "Tamil Nadu", 
  "Telangana", "Delhi", "Gujarat", "Rajasthan", "Uttar Pradesh", "West Bengal", "Other"
];

const COUNTRIES = ["India", "United States", "United Kingdom", "Canada", "Australia", "Other"];

const DEPARTMENTS = [
  "Human Resources", "Information Technology", "Finance", "Sales", 
  "Marketing", "Operations", "Engineering", "Design", "Legal", "Administration"
];

const RELATIONSHIPS = [
  "Spouse", "Parent", "Sibling", "Child", "Friend", "Other"
];

// Generate Employee ID
const generateEmployeeId = () => {
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `EMP${year}${random}`;
};

const EmployeeRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [skippedSteps, setSkippedSteps] = useState<number[]>([]);
  const [stepErrors, setStepErrors] = useState<Record<number, boolean>>({});
  const [sameAsCurrent, setSameAsCurrent] = useState(false);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [showSkipRequiredDialog, setShowSkipRequiredDialog] = useState(false);
  const [pendingSkipStep, setPendingSkipStep] = useState<number | null>(null);
  const [showSubmitWarning, setShowSubmitWarning] = useState(false);
  
  const { data: users = [], isLoading: usersLoading } = useUsers();
  const createEmployeeMutation = useCreateHrmsEmployeeProfile();
  const updateUserProfileMutation = useUpdateUserProfile();

  const {
    register,
    handleSubmit,
    formState: { errors, dirtyFields },
    setValue,
    watch,
    trigger,
    getValues,
    control,
    clearErrors,
  } = useForm<FormData>({
    resolver: zodResolver(fullSchema),
    defaultValues: {
      employeeId: generateEmployeeId(),
      gender: "Male",
      employeeStatus: "active",
      employeeType: "full_time",
      salaryType: "monthly",
      currentCountry: "India",
      permanentCountry: "India",
      qualifications: [{ degree: "", institution: "", fieldOfStudy: "", yearOfCompletion: "", grade: "" }],
      experiences: [],
    },
    mode: "onChange",
  });

  const { fields: qualificationFields, append: appendQualification, remove: removeQualification } = 
    useFieldArray({ control, name: "qualifications" });
  
  const { fields: experienceFields, append: appendExperience, remove: removeExperience } = 
    useFieldArray({ control, name: "experiences" });

  const isSubmitting = createEmployeeMutation.isPending || updateUserProfileMutation.isPending;

  // Load saved progress
  useEffect(() => {
    const saved = localStorage.getItem('employeeOnboardingDraft');
    if (saved) {
      try {
        const { data, currentStep: savedStep, completedSteps: savedCompleted, skippedSteps: savedSkipped } = JSON.parse(saved);
        Object.entries(data).forEach(([key, value]) => {
          setValue(key as keyof FormData, value as any);
        });
        setCurrentStep(savedStep);
        setCompletedSteps(savedCompleted || []);
        setSkippedSteps(savedSkipped || []);
        toast.info("Restored your previous progress");
      } catch (e) {
        console.error("Failed to restore progress:", e);
      }
    }
  }, [setValue]);

  // Get step validation schema
  const getStepSchema = (step: number) => {
    switch (step) {
      case 1: return personalInfoSchema;
      case 2: return addressSchema;
      case 3: return employmentSchema;
      case 4: return compensationSchema;
      case 5: return educationSchema;
      case 6: return experienceSchema;
      default: return z.object({});
    }
  };

  // Validation for each step
  const validateStep = async (step: number): Promise<boolean> => {
    const stepConfig = STEPS.find(s => s.id === step);
    if (!stepConfig || stepConfig.requiredFields.length === 0) {
      return true;
    }

    const fieldsToValidate = stepConfig.requiredFields as (keyof FormData)[];
    const values = getValues();
    
    let isValid = true;
    for (const field of fieldsToValidate) {
      const value = values[field];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        isValid = false;
        break;
      }
    }
    
    setStepErrors(prev => ({ ...prev, [step]: !isValid }));
    return isValid;
  };

  // Check if step has any data filled
  const hasStepData = (step: number): boolean => {
    const stepConfig = STEPS.find(s => s.id === step);
    if (!stepConfig) return false;
    
    const values = getValues();
    const fieldsToCheck = stepConfig.requiredFields as (keyof FormData)[];
    
    return fieldsToCheck.some(field => {
      const value = values[field];
      return value && (typeof value !== 'string' || value.trim() !== '');
    });
  };

  // Handle next step
  const handleNext = async () => {
    const isValid = await validateStep(currentStep);
    
    if (isValid) {
      setCompletedSteps(prev => [...new Set([...prev, currentStep])]);
      setSkippedSteps(prev => prev.filter(s => s !== currentStep));
      setStepErrors(prev => ({ ...prev, [currentStep]: false }));
      
      if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      toast.error("Please fill in all required fields before proceeding");
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle skip step
  const handleSkipClick = () => {
    const stepConfig = STEPS.find(s => s.id === currentStep);
    
    if (stepConfig?.required) {
      setShowSkipRequiredDialog(true);
    } else {
      setShowSkipDialog(true);
    }
  };

  const confirmSkip = () => {
    setSkippedSteps(prev => [...new Set([...prev, currentStep])]);
    setCompletedSteps(prev => prev.filter(s => s !== currentStep));
    setStepErrors(prev => ({ ...prev, [currentStep]: false }));
    
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
    
    setShowSkipDialog(false);
    toast.info(`Step ${currentStep} skipped. You can complete it later.`);
  };

  const confirmSkipRequired = () => {
    // For required steps, mark as skipped but show warning
    setSkippedSteps(prev => [...new Set([...prev, currentStep])]);
    setCompletedSteps(prev => prev.filter(s => s !== currentStep));
    setStepErrors(prev => ({ ...prev, [currentStep]: true }));
    
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
    
    setShowSkipRequiredDialog(false);
    toast.warning(`Step ${currentStep} skipped. This is required and must be completed before submission.`);
  };

  // Handle go to specific step
  const handleGoToStep = (step: number) => {
    // Allow navigation to any step
    setCurrentStep(step);
  };

  // Handle unskip (complete a skipped step)
  const handleUnskip = async (step: number) => {
    setCurrentStep(step);
    setSkippedSteps(prev => prev.filter(s => s !== step));
  };

  // Handle save progress
  const handleSaveProgress = async () => {
    const data = getValues();
    localStorage.setItem('employeeOnboardingDraft', JSON.stringify({
      data,
      currentStep,
      completedSteps,
      skippedSteps,
      savedAt: new Date().toISOString()
    }));
    toast.success("Progress saved successfully!");
  };

  // Handle same as current address
  const handleSameAsCurrentChange = (checked: boolean) => {
    setSameAsCurrent(checked);
    setValue("sameAsCurrent", checked);
    if (checked) {
      const values = getValues();
      setValue("permanentAddressLine1", values.currentAddressLine1);
      setValue("permanentAddressLine2", values.currentAddressLine2);
      setValue("permanentCity", values.currentCity);
      setValue("permanentState", values.currentState);
      setValue("permanentCountry", values.currentCountry);
      setValue("permanentPostalCode", values.currentPostalCode);
    }
  };

  // Check if can submit
  const canSubmit = (): boolean => {
    const requiredSteps = STEPS.filter(s => s.required && s.id !== 8);
    return requiredSteps.every(step => 
      completedSteps.includes(step.id) && !skippedSteps.includes(step.id)
    );
  };

  // Get incomplete required steps
  const getIncompleteRequiredSteps = (): typeof STEPS => {
    return STEPS.filter(s => 
      s.required && 
      s.id !== 8 && 
      (!completedSteps.includes(s.id) || skippedSteps.includes(s.id))
    );
  };

  // Handle submit
  const handleFormSubmit = async () => {
    if (!canSubmit()) {
      setShowSubmitWarning(true);
      return;
    }
    
    await handleSubmit(onSubmit)();
  };

  const onSubmit = async (data: FormData) => {
    try {
      // Update User Profile
      if (data.userId) {
        await updateUserProfileMutation.mutateAsync({
          userId: data.userId,
          data: {
            firstName: data.firstName,
            middleName: data.middleName,
            lastName: data.lastName,
            dateOfBirth: data.dateOfBirth,
            gender: data.gender,
            maritalStatus: data.maritalStatus,
            nationality: data.nationality,
            phone: data.phone,
            altPhone: data.alternatePhone,
            altEmail: data.personalEmail,
            aadharNumber: data.aadharNumber,
            panNumber: data.panNumber,
            currentAddress: {
              line1: data.currentAddressLine1,
              line2: data.currentAddressLine2,
              city: data.currentCity,
              state: data.currentState,
              country: data.currentCountry,
              postalCode: data.currentPostalCode,
            },
            permanentAddress: {
              line1: data.permanentAddressLine1,
              line2: data.permanentAddressLine2,
              city: data.permanentCity,
              state: data.permanentState,
              country: data.permanentCountry,
              postalCode: data.permanentPostalCode,
            },
            emergencyContact: {
              name: data.emergencyContactName,
              relationship: data.emergencyContactRelationship,
              phone: data.emergencyContactPhone,
              altPhone: data.emergencyContactAltPhone,
              email: data.emergencyContactEmail,
            }
          }
        });

        // Create Employee Profile
        await createEmployeeMutation.mutateAsync({
          userId: data.userId,
          employeeId: data.employeeId,
          employeeType: data.employeeType,
          designation: data.designation,
          department: data.department,
          reportingManager: data.reportingManager,
          workLocation: data.workLocation,
          employeeStatus: data.employeeStatus,
          probationPeriod: data.probationPeriod,
          probationEndDate: data.probationEndDate,
          dateOfJoining: data.dateOfJoining,
          officialEmail: data.officialEmail,
          salaryType: data.salaryType,
          basicSalary: data.basicSalary,
          bankName: data.bankName,
          accountHolderName: data.accountHolderName,
          accountNumber: data.accountNumber,
          ifscCode: data.ifscCode,
          branchName: data.branchName,
          branchAddress: data.branchAddress,
          qualifications: data.qualifications,
          experiences: data.experiences,
        });
      }

      localStorage.removeItem('employeeOnboardingDraft');
      toast.success("Employee onboarded successfully!");
      navigate(`/hrms/employees/${data.userId}`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to onboard employee. Please try again.");
    }
  };

  // Calculate progress
  const totalSteps = STEPS.length - 1; // Exclude review step
  const completedCount = completedSteps.filter(s => s !== 8).length;
  const progressPercentage = (completedCount / totalSteps) * 100;

  // Get step status
  const getStepStatus = (stepId: number) => {
    if (completedSteps.includes(stepId) && !skippedSteps.includes(stepId)) {
      return 'completed';
    }
    if (skippedSteps.includes(stepId)) {
      return 'skipped';
    }
    if (stepErrors[stepId]) {
      return 'error';
    }
    if (currentStep === stepId) {
      return 'current';
    }
    return 'pending';
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto py-6 px-4 max-w-7xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/hrms")}
                className="rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Employee Onboarding</h1>
                <p className="text-muted-foreground text-sm">
                  Complete the registration process for new employees
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleSaveProgress}>
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            {/* Sidebar - Step Navigation */}
            <div className="col-span-12 lg:col-span-3">
              <Card className="sticky top-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    Progress
                    <span className="text-sm font-normal text-muted-foreground">
                      {completedCount}/{totalSteps}
                    </span>
                  </CardTitle>
                  <div className="space-y-2">
                    <Progress value={progressPercentage} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{Math.round(progressPercentage)}% complete</span>
                      <span>Step {currentStep} of {STEPS.length}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <nav className="space-y-1">
                    {STEPS.map((step) => {
                      const status = getStepStatus(step.id);
                      const StepIcon = step.icon;
                      
                      return (
                        <Tooltip key={step.id}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleGoToStep(step.id)}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group",
                                status === 'current' && "bg-primary text-primary-foreground shadow-sm",
                                status === 'completed' && "bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-950",
                                status === 'skipped' && "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950",
                                status === 'error' && "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950",
                                status === 'pending' && "hover:bg-muted text-muted-foreground"
                              )}
                            >
                              <div className={cn(
                                "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
                                status === 'current' && "bg-primary-foreground/20 text-primary-foreground",
                                status === 'completed' && "bg-green-200 dark:bg-green-800",
                                status === 'skipped' && "bg-amber-200 dark:bg-amber-800",
                                status === 'error' && "bg-red-200 dark:bg-red-800",
                                status === 'pending' && "bg-muted group-hover:bg-muted-foreground/10"
                              )}>
                                {status === 'completed' ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : status === 'error' ? (
                                  <AlertCircle className="h-4 w-4" />
                                ) : status === 'skipped' ? (
                                  <SkipForward className="h-4 w-4" />
                                ) : (
                                  <StepIcon className="h-4 w-4" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className={cn(
                                    "text-sm font-medium truncate",
                                    status === 'current' && "text-primary-foreground"
                                  )}>
                                    {step.title}
                                  </p>
                                  {step.required && (
                                    <span className={cn(
                                      "text-[10px] px-1.5 py-0.5 rounded font-medium",
                                      status === 'current' ? "bg-primary-foreground/20" : "bg-muted"
                                    )}>
                                      Required
                                    </span>
                                  )}
                                </div>
                                <p className={cn(
                                  "text-xs truncate",
                                  status === 'current' ? "text-primary-foreground/70" : "text-muted-foreground"
                                )}>
                                  {step.description}
                                </p>
                              </div>
                              <ChevronRight className={cn(
                                "h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity",
                                status === 'current' && "opacity-100"
                              )} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>
                              {status === 'completed' && "Completed - Click to edit"}
                              {status === 'skipped' && "Skipped - Click to complete"}
                              {status === 'error' && "Has errors - Click to fix"}
                              {status === 'current' && "Current step"}
                              {status === 'pending' && "Click to go to this step"}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </nav>

                  {/* Skipped Steps Summary */}
                  {skippedSteps.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Skipped Steps ({skippedSteps.length})
                      </p>
                      <div className="space-y-1">
                        {skippedSteps.map(stepId => {
                          const step = STEPS.find(s => s.id === stepId);
                          if (!step) return null;
                          return (
                            <button
                              key={stepId}
                              onClick={() => handleUnskip(stepId)}
                              className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
                            >
                              <span className="flex items-center gap-1.5">
                                <SkipForward className="h-3 w-3" />
                                {step.title}
                                {step.required && (
                                  <AlertTriangle className="h-3 w-3 text-amber-600" />
                                )}
                              </span>
                              <span className="text-[10px] underline">Complete</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="col-span-12 lg:col-span-9">
              <form onSubmit={(e) => e.preventDefault()}>
                {/* Step 1: Personal Information */}
                {currentStep === 1 && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle>Personal Information</CardTitle>
                            <CardDescription>Basic employee details and identifiers</CardDescription>
                          </div>
                        </div>
                        <Badge variant="destructive" className="text-xs">
                          Required
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Employee ID */}
                      <div className="p-4 bg-muted/50 rounded-lg border">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm text-muted-foreground">Employee ID</Label>
                            <p className="text-lg font-mono font-semibold">{watch("employeeId")}</p>
                          </div>
                          <Badge variant="secondary">Auto-generated</Badge>
                        </div>
                      </div>

                      {/* Name Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">
                            First Name <span className="text-destructive">*</span>
                          </Label>
                          <Input 
                            id="firstName" 
                            {...register("firstName")} 
                            placeholder="John"
                            className={errors.firstName ? "border-destructive" : ""}
                          />
                          {errors.firstName && (
                            <p className="text-sm text-destructive flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {errors.firstName.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="middleName">Middle Name</Label>
                          <Input 
                            id="middleName" 
                            {...register("middleName")} 
                            placeholder="William"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">
                            Last Name <span className="text-destructive">*</span>
                          </Label>
                          <Input 
                            id="lastName" 
                            {...register("lastName")} 
                            placeholder="Doe"
                            className={errors.lastName ? "border-destructive" : ""}
                          />
                          {errors.lastName && (
                            <p className="text-sm text-destructive flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {errors.lastName.message}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* DOB and Gender */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="dateOfBirth">
                            Date of Birth <span className="text-destructive">*</span>
                          </Label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              id="dateOfBirth" 
                              type="date"
                              {...register("dateOfBirth")} 
                              className={cn("pl-10", errors.dateOfBirth && "border-destructive")}
                            />
                          </div>
                          {errors.dateOfBirth && (
                            <p className="text-sm text-destructive flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {errors.dateOfBirth.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>
                            Gender <span className="text-destructive">*</span>
                          </Label>
                          <RadioGroup 
                            defaultValue="Male" 
                            onValueChange={(val) => setValue("gender", val)}
                            className="flex gap-4 pt-2"
                          >
                            {["Male", "Female", "Other"].map((gender) => (
                              <div key={gender} className="flex items-center space-x-2">
                                <RadioGroupItem value={gender} id={gender.toLowerCase()} />
                                <Label htmlFor={gender.toLowerCase()} className="font-normal cursor-pointer">
                                  {gender}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </div>
                      </div>

                      {/* Marital Status and Nationality */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>
                            Marital Status <span className="text-destructive">*</span>
                          </Label>
                          <Select onValueChange={(val) => setValue("maritalStatus", val)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              {["Single", "Married", "Divorced", "Widowed"].map((status) => (
                                <SelectItem key={status} value={status}>{status}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>
                            Nationality <span className="text-destructive">*</span>
                          </Label>
                          <Select onValueChange={(val) => setValue("nationality", val)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select nationality" />
                            </SelectTrigger>
                            <SelectContent>
                              {NATIONALITIES.map((nat) => (
                                <SelectItem key={nat} value={nat}>{nat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Separator />

                      {/* Contact Information */}
                      <div>
                        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Contact Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="personalEmail">
                              Personal Email <span className="text-destructive">*</span>
                            </Label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input 
                                id="personalEmail"
                                type="email" 
                                {...register("personalEmail")} 
                                placeholder="john.doe@gmail.com"
                                className="pl-10"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phone">
                              Phone Number <span className="text-destructive">*</span>
                            </Label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input 
                                id="phone" 
                                {...register("phone")} 
                                placeholder="+91 98765 43210"
                                className="pl-10"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="alternatePhone">Alternate Phone</Label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input 
                                id="alternatePhone" 
                                {...register("alternatePhone")} 
                                placeholder="+91 98765 43210"
                                className="pl-10"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Identity Documents */}
                      <div>
                        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Identity Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="aadharNumber">
                              Aadhar Number <span className="text-destructive">*</span>
                            </Label>
                            <Input 
                              id="aadharNumber" 
                              {...register("aadharNumber")} 
                              placeholder="1234 5678 9012"
                              maxLength={12}
                              className="font-mono"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="panNumber">
                              PAN Number <span className="text-destructive">*</span>
                            </Label>
                            <Input 
                              id="panNumber" 
                              {...register("panNumber")} 
                              placeholder="ABCDE1234F"
                              maxLength={10}
                              className="font-mono uppercase"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Step 2: Address Information */}
                {currentStep === 2 && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <MapPin className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle>Address & Emergency Contact</CardTitle>
                            <CardDescription>Current, permanent address and emergency contact details</CardDescription>
                          </div>
                        </div>
                        <Badge variant="destructive" className="text-xs">Required</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Current Address */}
                      <div>
                        <h3 className="text-sm font-semibold mb-4">Current Address</h3>
                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="currentAddressLine1">
                              Address Line 1 <span className="text-destructive">*</span>
                            </Label>
                            <Input 
                              id="currentAddressLine1" 
                              {...register("currentAddressLine1")} 
                              placeholder="Street address, building name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="currentAddressLine2">Address Line 2</Label>
                            <Input 
                              id="currentAddressLine2" 
                              {...register("currentAddressLine2")} 
                              placeholder="Apartment, suite, unit, etc."
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="currentCity">
                                City <span className="text-destructive">*</span>
                              </Label>
                              <Input 
                                id="currentCity" 
                                {...register("currentCity")} 
                                placeholder="City"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>
                                State <span className="text-destructive">*</span>
                              </Label>
                              <Select onValueChange={(val) => setValue("currentState", val)}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select state" />
                                </SelectTrigger>
                                <SelectContent>
                                  {STATES.map((state) => (
                                    <SelectItem key={state} value={state}>{state}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Country</Label>
                              <Select 
                                defaultValue="India"
                                onValueChange={(val) => setValue("currentCountry", val)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select country" />
                                </SelectTrigger>
                                <SelectContent>
                                  {COUNTRIES.map((country) => (
                                    <SelectItem key={country} value={country}>{country}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="currentPostalCode">Postal Code</Label>
                              <Input 
                                id="currentPostalCode" 
                                {...register("currentPostalCode")} 
                                placeholder="560001"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Permanent Address */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-semibold">Permanent Address</h3>
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="sameAsCurrent" 
                              checked={sameAsCurrent}
                              onCheckedChange={handleSameAsCurrentChange}
                            />
                            <Label htmlFor="sameAsCurrent" className="text-sm font-normal cursor-pointer">
                              Same as current address
                            </Label>
                          </div>
                        </div>
                        
                        <div className={cn("grid grid-cols-1 gap-4 transition-opacity", sameAsCurrent && "opacity-50 pointer-events-none")}>
                          <div className="space-y-2">
                            <Label htmlFor="permanentAddressLine1">Address Line 1</Label>
                            <Input 
                              id="permanentAddressLine1" 
                              {...register("permanentAddressLine1")} 
                              placeholder="Street address, building name"
                              disabled={sameAsCurrent}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="permanentAddressLine2">Address Line 2</Label>
                            <Input 
                              id="permanentAddressLine2" 
                              {...register("permanentAddressLine2")} 
                              placeholder="Apartment, suite, unit, etc."
                              disabled={sameAsCurrent}
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="permanentCity">City</Label>
                              <Input 
                                id="permanentCity" 
                                {...register("permanentCity")} 
                                placeholder="City"
                                disabled={sameAsCurrent}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>State</Label>
                              <Select 
                                onValueChange={(val) => setValue("permanentState", val)}
                                disabled={sameAsCurrent}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select state" />
                                </SelectTrigger>
                                <SelectContent>
                                  {STATES.map((state) => (
                                    <SelectItem key={state} value={state}>{state}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Country</Label>
                              <Select 
                                defaultValue="India"
                                onValueChange={(val) => setValue("permanentCountry", val)}
                                disabled={sameAsCurrent}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select country" />
                                </SelectTrigger>
                                <SelectContent>
                                  {COUNTRIES.map((country) => (
                                    <SelectItem key={country} value={country}>{country}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="permanentPostalCode">Postal Code</Label>
                              <Input 
                                id="permanentPostalCode" 
                                {...register("permanentPostalCode")} 
                                placeholder="560001"
                                disabled={sameAsCurrent}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Emergency Contact */}
                      <div>
                        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Emergency Contact
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="emergencyContactName">
                              Contact Name <span className="text-destructive">*</span>
                            </Label>
                            <Input 
                              id="emergencyContactName" 
                              {...register("emergencyContactName")} 
                              placeholder="Full name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Relationship <span className="text-destructive">*</span></Label>
                            <Select onValueChange={(val) => setValue("emergencyContactRelationship", val)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select relationship" />
                              </SelectTrigger>
                              <SelectContent>
                                {RELATIONSHIPS.map((rel) => (
                                  <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="emergencyContactPhone">
                              Phone Number <span className="text-destructive">*</span>
                            </Label>
                            <Input 
                              id="emergencyContactPhone" 
                              {...register("emergencyContactPhone")} 
                              placeholder="+91 98765 43210"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="emergencyContactAltPhone">Alternate Phone</Label>
                            <Input 
                              id="emergencyContactAltPhone" 
                              {...register("emergencyContactAltPhone")} 
                              placeholder="+91 98765 43210"
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="emergencyContactEmail">Email</Label>
                            <Input 
                              id="emergencyContactEmail" 
                              type="email"
                              {...register("emergencyContactEmail")} 
                              placeholder="email@example.com"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Step 3: Employment Information */}
                {currentStep === 3 && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Briefcase className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle>Employment Information</CardTitle>
                            <CardDescription>Job details and organizational information</CardDescription>
                          </div>
                        </div>
                        <Badge variant="destructive" className="text-xs">Required</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* User Selection */}
                      <div className="p-4 bg-muted/50 rounded-lg border">
                        <Label className="text-sm font-semibold mb-3 block">
                          Link to Workspace User <span className="text-destructive">*</span>
                        </Label>
                        <Select 
                          onValueChange={(val) => setValue("userId", Number(val))}
                          disabled={usersLoading}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={usersLoading ? "Loading users..." : "Select user account"} />
                          </SelectTrigger>
                          <SelectContent>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={String(user.id)}>
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                                    {user.name?.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-medium">{user.name}</p>
                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Employee Type <span className="text-destructive">*</span></Label>
                          <Select 
                            defaultValue="full_time"
                            onValueChange={(val) => setValue("employeeType", val)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="full_time">Full-time</SelectItem>
                              <SelectItem value="part_time">Part-time</SelectItem>
                              <SelectItem value="contract">Contract</SelectItem>
                              <SelectItem value="intern">Intern</SelectItem>
                              <SelectItem value="temporary">Temporary</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="designation">
                            Designation <span className="text-destructive">*</span>
                          </Label>
                          <Input 
                            id="designation" 
                            {...register("designation")} 
                            placeholder="Software Engineer"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Department <span className="text-destructive">*</span></Label>
                          <Select onValueChange={(val) => setValue("department", val)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                            <SelectContent>
                              {DEPARTMENTS.map((dept) => (
                                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Reporting Manager</Label>
                          <Select onValueChange={(val) => setValue("reportingManager", val)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select manager" />
                            </SelectTrigger>
                            <SelectContent>
                              {users.map((user) => (
                                <SelectItem key={user.id} value={String(user.id)}>
                                  {user.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="workLocation">
                            Work Location <span className="text-destructive">*</span>
                          </Label>
                          <Input 
                            id="workLocation" 
                            {...register("workLocation")} 
                            placeholder="Head Office, Remote, etc."
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Employee Status</Label>
                          <Select 
                            defaultValue="active"
                            onValueChange={(val) => setValue("employeeStatus", val)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="on_leave">On Leave</SelectItem>
                              <SelectItem value="terminated">Terminated</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Separator />

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="dateOfJoining">Date of Joining <span className="text-destructive">*</span></Label>
                          <Input 
                            id="dateOfJoining" 
                            type="date"
                            {...register("dateOfJoining")} 
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="probationPeriod">Probation (months)</Label>
                          <Input 
                            id="probationPeriod" 
                            type="number"
                            {...register("probationPeriod")} 
                            placeholder="3"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="probationEndDate">Probation End Date</Label>
                          <Input 
                            id="probationEndDate" 
                            type="date"
                            {...register("probationEndDate")} 
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="officialEmail">
                            Official Email <span className="text-destructive">*</span>
                          </Label>
                          <Input 
                            id="officialEmail" 
                            type="email"
                            {...register("officialEmail")} 
                            placeholder="john.doe@company.com"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Step 4: Compensation & Bank Details */}
                {currentStep === 4 && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <CreditCard className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle>Compensation & Bank Details</CardTitle>
                            <CardDescription>Salary information and banking details for payroll</CardDescription>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">Optional</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Compensation */}
                      <div>
                        <h3 className="text-sm font-semibold mb-4">Compensation Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Salary Type</Label>
                            <Select 
                              defaultValue="monthly"
                              onValueChange={(val) => setValue("salaryType", val)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="hourly">Hourly</SelectItem>
                                <SelectItem value="annual">Annual</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="basicSalary">Basic Salary / CTC</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                              <Input 
                                id="basicSalary" 
                                type="number"
                                {...register("basicSalary")} 
                                placeholder="50000"
                                className="pl-8"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Bank Details */}
                      <div>
                        <h3 className="text-sm font-semibold mb-4">Bank Account Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="bankName">Bank Name</Label>
                            <Input 
                              id="bankName" 
                              {...register("bankName")} 
                              placeholder="State Bank of India"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="accountHolderName">Account Holder Name</Label>
                            <Input 
                              id="accountHolderName" 
                              {...register("accountHolderName")} 
                              placeholder="As per bank records"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="accountNumber">Account Number</Label>
                            <Input 
                              id="accountNumber" 
                              {...register("accountNumber")} 
                              placeholder="XXXXXXXXXXXX"
                              className="font-mono"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="ifscCode">IFSC Code</Label>
                            <Input 
                              id="ifscCode" 
                              {...register("ifscCode")} 
                              placeholder="SBIN0001234"
                              className="font-mono uppercase"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="branchName">Branch Name</Label>
                            <Input 
                              id="branchName" 
                              {...register("branchName")} 
                              placeholder="Main Branch"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="branchAddress">Branch Address</Label>
                            <Input 
                              id="branchAddress" 
                              {...register("branchAddress")} 
                              placeholder="Branch location"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Step 5: Educational Qualifications */}
                {currentStep === 5 && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <GraduationCap className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle>Educational Qualifications</CardTitle>
                            <CardDescription>Academic background and certifications</CardDescription>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">Optional</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {qualificationFields.map((field, index) => (
                        <div key={field.id} className="p-4 border rounded-lg space-y-4 relative">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium">Qualification {index + 1}</h4>
                            {qualificationFields.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeQualification(index)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>Degree/Certification</Label>
                              <Input 
                                {...register(`qualifications.${index}.degree`)} 
                                placeholder="B.Tech, MBA, etc."
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Institution/University</Label>
                              <Input 
                                {...register(`qualifications.${index}.institution`)} 
                                placeholder="University name"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Field of Study</Label>
                              <Input 
                                {...register(`qualifications.${index}.fieldOfStudy`)} 
                                placeholder="Computer Science"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Year of Completion</Label>
                              <Input 
                                type="number"
                                {...register(`qualifications.${index}.yearOfCompletion`)} 
                                placeholder="2020"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Grade/Percentage</Label>
                              <Input 
                                {...register(`qualifications.${index}.grade`)} 
                                placeholder="85% or 8.5 CGPA"
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => appendQualification({ 
                          degree: "", 
                          institution: "", 
                          fieldOfStudy: "", 
                          yearOfCompletion: "", 
                          grade: "" 
                        })}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Another Qualification
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Step 6: Work Experience */}
                {currentStep === 6 && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle>Work Experience</CardTitle>
                            <CardDescription>Previous employment history</CardDescription>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">Optional</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {experienceFields.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed rounded-lg">
                          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-muted-foreground mb-4">No work experience added yet</p>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => appendExperience({
                              companyName: "",
                              designation: "",
                              fromDate: "",
                              toDate: "",
                              currentlyWorking: false,
                              responsibilities: ""
                            })}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Experience
                          </Button>
                        </div>
                      ) : (
                        <>
                          {experienceFields.map((field, index) => (
                            <div key={field.id} className="p-4 border rounded-lg space-y-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-medium">Experience {index + 1}</h4>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeExperience(index)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Company Name</Label>
                                  <Input 
                                    {...register(`experiences.${index}.companyName`)} 
                                    placeholder="Company name"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Designation</Label>
                                  <Input 
                                    {...register(`experiences.${index}.designation`)} 
                                    placeholder="Job title"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>From Date</Label>
                                  <Input 
                                    type="date"
                                    {...register(`experiences.${index}.fromDate`)} 
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>To Date</Label>
                                  <Input 
                                    type="date"
                                    {...register(`experiences.${index}.toDate`)} 
                                    disabled={watch(`experiences.${index}.currentlyWorking`)}
                                  />
                                </div>
                                <div className="flex items-center space-x-2 md:col-span-2">
                                  <Checkbox 
                                    id={`currentlyWorking-${index}`}
                                    onCheckedChange={(checked) => 
                                      setValue(`experiences.${index}.currentlyWorking`, checked as boolean)
                                    }
                                  />
                                  <Label htmlFor={`currentlyWorking-${index}`} className="font-normal">
                                    Currently working here
                                  </Label>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                  <Label>Responsibilities</Label>
                                  <Textarea 
                                    {...register(`experiences.${index}.responsibilities`)} 
                                    placeholder="Key responsibilities and achievements"
                                    rows={3}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}

                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => appendExperience({
                              companyName: "",
                              designation: "",
                              fromDate: "",
                              toDate: "",
                              currentlyWorking: false,
                              responsibilities: ""
                            })}
                            className="w-full"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Another Experience
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Step 7: Document Uploads */}
                {currentStep === 7 && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle>Document Uploads</CardTitle>
                            <CardDescription>Upload required documents and certificates</CardDescription>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">Optional</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Identity Documents */}
                      <div>
                        <h3 className="text-sm font-semibold mb-4">Identity Documents</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {["Aadhar Card", "PAN Card", "Passport", "Driving License", "Voter ID"].map((doc) => (
                            <div 
                              key={doc}
                              className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer"
                            >
                              <UploadCloud className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                              <p className="text-sm font-medium">{doc}</p>
                              <p className="text-xs text-muted-foreground mb-2">PDF or Image</p>
                              <Input 
                                type="file" 
                                accept=".pdf,image/*" 
                                className="text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      {/* Educational Documents */}
                      <div>
                        <h3 className="text-sm font-semibold mb-4">Educational Documents</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {["10th Certificate", "12th Certificate", "Graduation Certificate", "Post Graduation", "Professional Certifications"].map((doc) => (
                            <div 
                              key={doc}
                              className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer"
                            >
                              <UploadCloud className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                              <p className="text-sm font-medium">{doc}</p>
                              <p className="text-xs text-muted-foreground mb-2">PDF or Image</p>
                              <Input 
                                type="file" 
                                accept=".pdf,image/*" 
                                className="text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      {/* Employment Documents */}
                      <div>
                        <h3 className="text-sm font-semibold mb-4">Employment Documents</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {["Offer Letter", "Relieving Letter", "Experience Certificate", "Salary Slips", "Resume/CV", "Passport Photo"].map((doc) => (
                            <div 
                              key={doc}
                              className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer"
                            >
                              <UploadCloud className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                              <p className="text-sm font-medium">{doc}</p>
                              <p className="text-xs text-muted-foreground mb-2">PDF or Image</p>
                              <Input 
                                type="file" 
                                accept=".pdf,image/*" 
                                className="text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Step 8: Review & Submit */}
                {currentStep === 8 && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <CardTitle>Review & Submit</CardTitle>
                          <CardDescription>Review all information before final submission</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Warning for incomplete required steps */}
                      {!canSubmit() && (
                        <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                            <div>
                              <p className="font-medium text-amber-800 dark:text-amber-200">
                                Required steps incomplete
                              </p>
                              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                Please complete the following required steps before submitting:
                              </p>
                              <ul className="mt-2 space-y-1">
                                {getIncompleteRequiredSteps().map(step => (
                                  <li key={step.id} className="flex items-center gap-2 text-sm">
                                    <button
                                      type="button"
                                      onClick={() => setCurrentStep(step.id)}
                                      className="text-amber-800 dark:text-amber-200 underline hover:no-underline"
                                    >
                                      Step {step.id}: {step.title}
                                    </button>
                                    {skippedSteps.includes(step.id) && (
                                      <Badge variant="outline" className="text-xs">Skipped</Badge>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Summary Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Personal Info Summary */}
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Personal Information
                            </h4>
                            <div className="flex items-center gap-2">
                              {completedSteps.includes(1) && !skippedSteps.includes(1) ? (
                                <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Complete
                                </Badge>
                              ) : skippedSteps.includes(1) ? (
                                <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                                  <SkipForward className="h-3 w-3 mr-1" />
                                  Skipped
                                </Badge>
                              ) : (
                                <Badge variant="outline">Pending</Badge>
                              )}
                              <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)}>
                                Edit
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-1 text-sm">
                            <p><span className="text-muted-foreground">Name:</span> {watch("firstName")} {watch("middleName")} {watch("lastName")}</p>
                            <p><span className="text-muted-foreground">DOB:</span> {watch("dateOfBirth")}</p>
                            <p><span className="text-muted-foreground">Gender:</span> {watch("gender")}</p>
                            <p><span className="text-muted-foreground">Email:</span> {watch("personalEmail")}</p>
                            <p><span className="text-muted-foreground">Phone:</span> {watch("phone")}</p>
                          </div>
                        </div>

                        {/* Address Summary */}
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              Address
                            </h4>
                            <div className="flex items-center gap-2">
                              {completedSteps.includes(2) && !skippedSteps.includes(2) ? (
                                <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Complete
                                </Badge>
                              ) : skippedSteps.includes(2) ? (
                                <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                                  <SkipForward className="h-3 w-3 mr-1" />
                                  Skipped
                                </Badge>
                              ) : (
                                <Badge variant="outline">Pending</Badge>
                              )}
                              <Button variant="ghost" size="sm" onClick={() => setCurrentStep(2)}>
                                Edit
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-1 text-sm">
                            <p><span className="text-muted-foreground">Address:</span> {watch("currentAddressLine1")}</p>
                            <p><span className="text-muted-foreground">City:</span> {watch("currentCity")}, {watch("currentState")}</p>
                            <p><span className="text-muted-foreground">Emergency:</span> {watch("emergencyContactName")} ({watch("emergencyContactRelationship")})</p>
                          </div>
                        </div>

                        {/* Employment Summary */}
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium flex items-center gap-2">
                              <Briefcase className="h-4 w-4" />
                              Employment Details
                            </h4>
                            <div className="flex items-center gap-2">
                              {completedSteps.includes(3) && !skippedSteps.includes(3) ? (
                                <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Complete
                                </Badge>
                              ) : skippedSteps.includes(3) ? (
                                <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                                  <SkipForward className="h-3 w-3 mr-1" />
                                  Skipped
                                </Badge>
                              ) : (
                                <Badge variant="outline">Pending</Badge>
                              )}
                              <Button variant="ghost" size="sm" onClick={() => setCurrentStep(3)}>
                                Edit
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-1 text-sm">
                            <p><span className="text-muted-foreground">Employee ID:</span> {watch("employeeId")}</p>
                            <p><span className="text-muted-foreground">Designation:</span> {watch("designation")}</p>
                            <p><span className="text-muted-foreground">Department:</span> {watch("department")}</p>
                            <p><span className="text-muted-foreground">Location:</span> {watch("workLocation")}</p>
                            <p><span className="text-muted-foreground">Joining Date:</span> {watch("dateOfJoining")}</p>
                          </div>
                        </div>

                        {/* Compensation Summary */}
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium flex items-center gap-2">
                              <CreditCard className="h-4 w-4" />
                              Compensation
                            </h4>
                            <div className="flex items-center gap-2">
                              {completedSteps.includes(4) && !skippedSteps.includes(4) ? (
                                <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Complete
                                </Badge>
                              ) : skippedSteps.includes(4) ? (
                                <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                                  <SkipForward className="h-3 w-3 mr-1" />
                                  Skipped
                                </Badge>
                              ) : (
                                <Badge variant="outline">Pending</Badge>
                              )}
                              <Button variant="ghost" size="sm" onClick={() => setCurrentStep(4)}>
                                Edit
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-1 text-sm">
                            <p><span className="text-muted-foreground">Salary Type:</span> {watch("salaryType")}</p>
                            <p><span className="text-muted-foreground">CTC:</span> ₹{watch("basicSalary")}</p>
                            <p><span className="text-muted-foreground">Bank:</span> {watch("bankName")}</p>
                            <p><span className="text-muted-foreground">Account:</span> ****{watch("accountNumber")?.slice(-4)}</p>
                          </div>
                        </div>
                      </div>

                      {/* All Steps Status */}
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-4">All Steps Status</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {STEPS.slice(0, -1).map((step) => {
                            const status = getStepStatus(step.id);
                            return (
                              <button
                                key={step.id}
                                onClick={() => setCurrentStep(step.id)}
                                className={cn(
                                  "flex items-center gap-2 p-2 rounded-lg text-sm transition-colors text-left",
                                  status === 'completed' && "bg-green-50 dark:bg-green-950/30 hover:bg-green-100",
                                  status === 'skipped' && "bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100",
                                  status === 'error' && "bg-red-50 dark:bg-red-950/30 hover:bg-red-100",
                                  status === 'pending' && "bg-muted hover:bg-muted/80"
                                )}
                              >
                                {status === 'completed' ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                ) : status === 'skipped' ? (
                                  <SkipForward className="h-4 w-4 text-amber-600" />
                                ) : status === 'error' ? (
                                  <AlertCircle className="h-4 w-4 text-red-600" />
                                ) : (
                                  <Circle className="h-4 w-4 text-muted-foreground" />
                                )}
                                <div>
                                  <p className="font-medium">{step.title}</p>
                                  {step.required && (
                                    <p className="text-xs text-muted-foreground">Required</p>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Terms */}
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <Checkbox id="terms" />
                          <Label htmlFor="terms" className="text-sm font-normal leading-relaxed cursor-pointer">
                            I confirm that all the information provided above is accurate and complete. 
                            I understand that any false information may result in termination of employment.
                          </Label>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="flex gap-2">
                    {currentStep > 1 && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handlePrevious}
                        disabled={isSubmitting}
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Previous
                      </Button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {currentStep < STEPS.length && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={handleSkipClick}
                        disabled={isSubmitting}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <SkipForward className="h-4 w-4 mr-2" />
                        Skip Step
                      </Button>
                    )}

                    {currentStep < STEPS.length ? (
                      <Button 
                        type="button" 
                        onClick={handleNext}
                        disabled={isSubmitting}
                      >
                        Next
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    ) : (
                      <Button 
                        type="button"
                        onClick={handleFormSubmit}
                        disabled={isSubmitting}
                        className="min-w-40"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Complete Onboarding
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Skip Optional Step Dialog */}
        <AlertDialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <SkipForward className="h-5 w-5" />
                Skip this step?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This step is optional. You can skip it now and complete it later if needed.
                Your progress will be saved.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmSkip}>
                Skip Step
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Skip Required Step Warning Dialog */}
        <AlertDialog open={showSkipRequiredDialog} onOpenChange={setShowSkipRequiredDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
                This step is required
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  <strong>Step {currentStep}: {STEPS[currentStep - 1]?.title}</strong> contains 
                  required information that must be completed before you can submit the form.
                </p>
                <p>
                  You can skip it for now, but you'll need to return and complete it before 
                  final submission.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Stay & Complete</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmSkipRequired}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Skip Anyway
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Submit Warning Dialog */}
        <AlertDialog open={showSubmitWarning} onOpenChange={setShowSubmitWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Cannot Submit Yet
              </AlertDialogTitle>
              <AlertDialogDescription>
                <p className="mb-4">
                  The following required steps must be completed before you can submit:
                </p>
                <ul className="space-y-2">
                  {getIncompleteRequiredSteps().map(step => (
                    <li key={step.id} className="flex items-center gap-2">
                      <step.icon className="h-4 w-4" />
                      <span>Step {step.id}: {step.title}</span>
                      {skippedSteps.includes(step.id) && (
                        <Badge variant="secondary" className="text-xs">Skipped</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  const firstIncomplete = getIncompleteRequiredSteps()[0];
                  if (firstIncomplete) {
                    setCurrentStep(firstIncomplete.id);
                  }
                  setShowSubmitWarning(false);
                }}
              >
                Go to First Incomplete Step
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
};

export default EmployeeRegistration;