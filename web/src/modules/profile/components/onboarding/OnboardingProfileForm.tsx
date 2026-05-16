// web/src/modules/profile/components/onboarding/OnboardingProfileForm.tsx

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  User, 
  MapPin, 
  Heart, 
  CreditCard, 
  GraduationCap, 
  Briefcase, 
  ChevronRight, 
  ChevronLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  Building2,
  Hash
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
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useProfileContext } from "../../contexts/ProfileContext";
import api from "@/lib/axios";

// ─────────────────────────────────────────────────────────────────────────────
// Validation Schemas
// ─────────────────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  // Personal
  firstName: z.string().min(2, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(2, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.string().min(1, "Gender is required"),
  maritalStatus: z.string().min(1, "Marital status is required"),
  nationality: z.string().min(2, "Nationality is required"),
  bloodGroup: z.string().optional(),
  personalEmail: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Valid phone number is required"),
  alternatePhone: z.string().optional(),
  aadharNumber: z.string().optional(),
  panNumber: z.string().optional(),
  linkedinProfile: z.string().optional(),

  // Address
  currentAddressLine1: z.string().min(5, "Address is required"),
  currentAddressLine2: z.string().optional(),
  currentCity: z.string().min(2, "City is required"),
  currentState: z.string().min(2, "State is required"),
  currentCountry: z.string().min(2, "Country is required"),
  currentPostalCode: z.string().min(6, "Postal code is required"),
  
  permanentAddressLine1: z.string().min(5, "Address is required"),
  permanentAddressLine2: z.string().optional(),
  permanentCity: z.string().min(2, "City is required"),
  permanentState: z.string().min(2, "State is required"),
  permanentCountry: z.string().min(2, "Country is required"),
  permanentPostalCode: z.string().min(6, "Postal code is required"),

  // Emergency Contact
  emergencyName: z.string().min(2, "Name is required"),
  emergencyRelationship: z.string().min(2, "Relationship is required"),
  emergencyPhone: z.string().min(10, "Phone is required"),
  emergencyAltPhone: z.string().optional(),
  emergencyEmail: z.string().email().optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const SectionHeader = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
  <div className="mb-6">
    <div className="flex items-center gap-2.5 mb-1">
      <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
    </div>
    <p className="text-xs text-muted-foreground/70 ml-[34px]">{description}</p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
interface OnboardingProfileFormProps {
  onCancel: () => void;
  onSuccess: () => void;
  initialTab?: "personal" | "address" | "emergency";
}

export function OnboardingProfileForm({ onCancel, onSuccess, initialTab = "personal" }: OnboardingProfileFormProps) {
  const { data } = useProfileContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>(initialTab as any);
  const [sameAsCurrent, setSameAsCurrent] = useState(false);

  const P = data?.profile || {};
  const ADDR = data?.address || {};
  const EC = data?.emergencyContact || {};
  const EP = data?.employeeProfile || {};

  const tabs = [
    { id: "personal", label: "Personal", icon: User },
    { id: "address", label: "Address", icon: MapPin },
    { id: "emergency", label: "Emergency", icon: Heart },
  ] as const;

  type TabId = typeof tabs[number]["id"];

  const TAB_FIELDS: Record<TabId, (keyof ProfileFormValues)[]> = {
    personal: [
      "firstName", "middleName", "lastName", "dateOfBirth", "gender", 
      "maritalStatus", "nationality", "bloodGroup", "personalEmail", 
      "phone", "alternatePhone", "aadharNumber", "panNumber", "linkedinProfile"
    ],
    address: [
      "currentAddressLine1", "currentAddressLine2", "currentCity", "currentState", 
      "currentCountry", "currentPostalCode", "permanentAddressLine1", "permanentAddressLine2", 
      "permanentCity", "permanentState", "permanentCountry", "permanentPostalCode"
    ],
    emergency: [
      "emergencyName", "emergencyRelationship", "emergencyPhone", "emergencyAltPhone", "emergencyEmail"
    ]
  };

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
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

      const response = await api.patch("/profile/me", payload);

      toast.success("Profile details saved successfully");
      onSuccess();
    } catch (error) {
      console.error("Save profile error:", error);
      toast.error("An error occurred while saving profile details");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onError = (errors: any) => {
    const errorFields = Object.keys(errors) as (keyof ProfileFormValues)[];
    
    // Find the earliest tab that has an error
    for (const tab of tabs) {
      const hasErrorInTab = TAB_FIELDS[tab.id].some(field => errorFields.includes(field));
      if (hasErrorInTab) {
        setActiveTab(tab.id);
        break;
      }
    }
    toast.error("Please fix the errors in the form before saving");
  };

  const handleSameAddress = (checked: boolean) => {
    setSameAsCurrent(checked);
    if (checked) {
      const cur = form.getValues();
      form.setValue("permanentAddressLine1", cur.currentAddressLine1);
      form.setValue("permanentAddressLine2", cur.currentAddressLine2);
      form.setValue("permanentCity", cur.currentCity);
      form.setValue("permanentState", cur.currentState);
      form.setValue("permanentCountry", cur.currentCountry);
      form.setValue("permanentPostalCode", cur.currentPostalCode);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-8">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 p-1 bg-muted/30 rounded-2xl border border-border/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300",
              activeTab === tab.id
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {/* PERSONAL SECTION */}
        {activeTab === "personal" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <SectionHeader 
              icon={User} 
              title="Personal Information" 
              description="Tell us a bit about yourself" 
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">First Name *</Label>
                <Input {...form.register("firstName")} id="firstName" className="rounded-xl h-11" placeholder="John" />
                {form.formState.errors.firstName && <p className="text-[10px] text-destructive font-medium">{form.formState.errors.firstName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="middleName" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Middle Name</Label>
                <Input {...form.register("middleName")} id="middleName" className="rounded-xl h-11" placeholder="Quincy" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Last Name *</Label>
                <Input {...form.register("lastName")} id="lastName" className="rounded-xl h-11" placeholder="Doe" />
                {form.formState.errors.lastName && <p className="text-[10px] text-destructive font-medium">{form.formState.errors.lastName.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Date of Birth *</Label>
                <Input {...form.register("dateOfBirth")} type="date" id="dateOfBirth" className="rounded-xl h-11" />
                {form.formState.errors.dateOfBirth && <p className="text-[10px] text-destructive font-medium">{form.formState.errors.dateOfBirth.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Gender *</Label>
                <Select onValueChange={(v) => form.setValue("gender", v)} defaultValue={form.getValues("gender")}>
                  <SelectTrigger className="rounded-xl h-11 bg-background border-border/50">
                    <SelectValue placeholder="Select Gender" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/50 shadow-2xl">
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.gender && <p className="text-[10px] text-destructive font-medium">{form.formState.errors.gender.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Marital Status *</Label>
                <Select onValueChange={(v) => form.setValue("maritalStatus", v)} defaultValue={form.getValues("maritalStatus")}>
                  <SelectTrigger className="rounded-xl h-11 bg-background border-border/50">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/50 shadow-2xl">
                    <SelectItem value="Single">Single</SelectItem>
                    <SelectItem value="Married">Married</SelectItem>
                    <SelectItem value="Divorced">Divorced</SelectItem>
                    <SelectItem value="Widowed">Widowed</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.maritalStatus && <p className="text-[10px] text-destructive font-medium">{form.formState.errors.maritalStatus.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="personalEmail" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Personal Email *</Label>
                <Input {...form.register("personalEmail")} id="personalEmail" type="email" className="rounded-xl h-11" placeholder="john.doe@example.com" />
                {form.formState.errors.personalEmail && <p className="text-[10px] text-destructive font-medium">{form.formState.errors.personalEmail.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Phone Number *</Label>
                <Input {...form.register("phone")} id="phone" className="rounded-xl h-11" placeholder="+91 98765 43210" />
                {form.formState.errors.phone && <p className="text-[10px] text-destructive font-medium">{form.formState.errors.phone.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="nationality" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Nationality *</Label>
                <Input {...form.register("nationality")} id="nationality" className="rounded-xl h-11" placeholder="Indian" />
                {form.formState.errors.nationality && <p className="text-[10px] text-destructive font-medium">{form.formState.errors.nationality.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="aadharNumber" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Aadhar Number</Label>
                <Input {...form.register("aadharNumber")} id="aadharNumber" className="rounded-xl h-11 font-mono" placeholder="XXXX XXXX XXXX" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="panNumber" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">PAN Number</Label>
                <Input {...form.register("panNumber")} id="panNumber" className="rounded-xl h-11 font-mono uppercase" placeholder="ABCDE1234F" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bloodGroup" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Blood Group</Label>
                <Select onValueChange={(v) => form.setValue("bloodGroup", v)} defaultValue={form.getValues("bloodGroup")}>
                  <SelectTrigger className="rounded-xl h-11 bg-background border-border/50">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/50 shadow-2xl">
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => (
                      <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* ADDRESS SECTION */}
        {activeTab === "address" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-10">
            <div>
              <SectionHeader 
                icon={MapPin} 
                title="Current Address" 
                description="Where you currently reside" 
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Address Line 1 *</Label>
                  <Input {...form.register("currentAddressLine1")} className="rounded-xl h-11" />
                  {form.formState.errors.currentAddressLine1 && <p className="text-[10px] text-destructive font-medium">{form.formState.errors.currentAddressLine1.message}</p>}
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Address Line 2</Label>
                  <Input {...form.register("currentAddressLine2")} className="rounded-xl h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">City *</Label>
                  <Input {...form.register("currentCity")} className="rounded-xl h-11" />
                  {form.formState.errors.currentCity && <p className="text-[10px] text-destructive font-medium">{form.formState.errors.currentCity.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">State *</Label>
                  <Input {...form.register("currentState")} className="rounded-xl h-11" />
                  {form.formState.errors.currentState && <p className="text-[10px] text-destructive font-medium">{form.formState.errors.currentState.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Country *</Label>
                  <Input {...form.register("currentCountry")} className="rounded-xl h-11" />
                  {form.formState.errors.currentCountry && <p className="text-[10px] text-destructive font-medium">{form.formState.errors.currentCountry.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Postal Code *</Label>
                  <Input {...form.register("currentPostalCode")} className="rounded-xl h-11" />
                  {form.formState.errors.currentPostalCode && <p className="text-[10px] text-destructive font-medium">{form.formState.errors.currentPostalCode.message}</p>}
                </div>
              </div>
            </div>

            <Separator className="bg-border/20" />

            <div>
              <div className="flex items-center justify-between mb-6">
                <SectionHeader 
                  icon={MapPin} 
                  title="Permanent Address" 
                  description="Your hometown or base address" 
                />
                <div className="flex items-center gap-2 bg-muted/40 px-4 py-2 rounded-xl border border-border/10">
                  <Checkbox 
                    id="sameAsCurrent" 
                    checked={sameAsCurrent} 
                    onCheckedChange={(c) => handleSameAddress(!!c)} 
                    className="rounded-md"
                  />
                  <Label htmlFor="sameAsCurrent" className="text-xs font-semibold cursor-pointer">Same as current</Label>
                </div>
              </div>
              
              {!sameAsCurrent && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Address Line 1 *</Label>
                    <Input {...form.register("permanentAddressLine1")} className="rounded-xl h-11" />
                    {form.formState.errors.permanentAddressLine1 && <p className="text-[10px] text-destructive font-medium">{form.formState.errors.permanentAddressLine1.message}</p>}
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Address Line 2</Label>
                    <Input {...form.register("permanentAddressLine2")} className="rounded-xl h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">City *</Label>
                    <Input {...form.register("permanentCity")} className="rounded-xl h-11" />
                    {form.formState.errors.permanentCity && <p className="text-[10px] text-destructive font-medium">{form.formState.errors.permanentCity.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">State *</Label>
                    <Input {...form.register("permanentState")} className="rounded-xl h-11" />
                    {form.formState.errors.permanentState && <p className="text-[10px] text-destructive font-medium">{form.formState.errors.permanentState.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Country *</Label>
                    <Input {...form.register("permanentCountry")} className="rounded-xl h-11" />
                    {form.formState.errors.permanentCountry && <p className="text-[10px] text-destructive font-medium">{form.formState.errors.permanentCountry.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Postal Code *</Label>
                    <Input {...form.register("permanentPostalCode")} className="rounded-xl h-11" />
                    {form.formState.errors.permanentPostalCode && <p className="text-[10px] text-destructive font-medium">{form.formState.errors.permanentPostalCode.message}</p>}
                  </div>
                </div>
              )}
              {sameAsCurrent && (
                <div className="p-8 border-2 border-dashed border-border/10 rounded-2xl bg-muted/10 text-center">
                  <p className="text-sm text-muted-foreground font-medium italic">
                    Same as current address. You can uncheck the box to provide a different address.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* EMERGENCY SECTION */}
        {activeTab === "emergency" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <SectionHeader 
              icon={Heart} 
              title="Emergency Contact" 
              description="Someone we can reach in case of emergency" 
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
              <div className="space-y-2">
                <Label htmlFor="emergencyName" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Contact Name *</Label>
                <Input {...form.register("emergencyName")} id="emergencyName" className="rounded-xl h-11" placeholder="Jane Doe" />
                {form.formState.errors.emergencyName && <p className="text-[10px] text-destructive font-medium">{form.formState.errors.emergencyName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Relationship *</Label>
                <Select onValueChange={(v) => form.setValue("emergencyRelationship", v)} defaultValue={form.getValues("emergencyRelationship")}>
                  <SelectTrigger className="rounded-xl h-11 bg-background border-border/50">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/50 shadow-2xl">
                    {["Spouse", "Parent", "Sibling", "Child", "Friend", "Other"].map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.emergencyRelationship && <p className="text-[10px] text-destructive font-medium">{form.formState.errors.emergencyRelationship.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyPhone" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Primary Phone *</Label>
                <Input {...form.register("emergencyPhone")} id="emergencyPhone" className="rounded-xl h-11" />
                {form.formState.errors.emergencyPhone && <p className="text-[10px] text-destructive font-medium">{form.formState.errors.emergencyPhone.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyAltPhone" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Alternate Phone</Label>
                <Input {...form.register("emergencyAltPhone")} id="emergencyAltPhone" className="rounded-xl h-11" />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="emergencyEmail" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email Address</Label>
                <Input {...form.register("emergencyEmail")} id="emergencyEmail" type="email" className="rounded-xl h-11" />
              </div>
            </div>
          </div>
        )}


      </div>

      <Separator className="bg-border/20" />

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
        <div className="flex items-center gap-2">
          {tabs.map((tab, idx) => (
            <div 
              key={tab.id}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                activeTab === tab.id ? "w-8 bg-primary" : "w-1.5 bg-muted-foreground/20"
              )}
            />
          ))}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {activeTab !== "personal" && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setActiveTab(tabs[tabs.findIndex(t => t.id === activeTab) - 1].id)}
              className="rounded-xl gap-2 h-11 px-6 flex-1 sm:flex-none border-border/40"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
          )}
          
          {activeTab !== "emergency" ? (
            <Button 
              type="button" 
              onClick={async () => {
                const fieldsToValidate = TAB_FIELDS[activeTab];
                const isValid = await form.trigger(fieldsToValidate);
                if (isValid) {
                  setActiveTab(tabs[tabs.findIndex(t => t.id === activeTab) + 1].id);
                } else {
                  toast.error("Please resolve the errors in this section before proceeding");
                }
              }}
              className="rounded-xl gap-2 h-11 px-8 flex-1 sm:flex-none shadow-lg shadow-primary/20"
            >
              Next Step
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="rounded-xl gap-2 h-11 px-10 flex-1 sm:flex-none shadow-lg shadow-primary/20"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Profile
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
