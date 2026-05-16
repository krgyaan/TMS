// web/src/modules/profile/components/onboarding/OnboardingEducationForm.tsx

import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  GraduationCap,
  Building2,
  Plus,
  Trash2,
  Save,
  Loader2,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Hash,
  Award,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useProfileContext } from "../../contexts/ProfileContext";
import api from "@/lib/axios";

// ─────────────────────────────────────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────────────────────────────────────

const currentYear = new Date().getFullYear();

const educationEntrySchema = z.object({
  id: z.number().optional(),
  degree: z.string().min(2, "Degree is required"),
  institution: z.string().min(2, "Institution is required"),
  fieldOfStudy: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  grade: z.string().optional(),
});

const educationFormSchema = z.object({
  educations: z.array(educationEntrySchema).min(1, "Add at least one education entry"),
});

type EducationFormValues = z.infer<typeof educationFormSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const YEARS = Array.from({ length: 50 }, (_, i) => currentYear + 5 - i);

const DEGREE_OPTIONS = [
  "10th / SSLC",
  "12th / HSC / PUC",
  "ITI",
  "Diploma",
  "B.A.",
  "B.Sc.",
  "B.Com.",
  "B.Tech / B.E.",
  "BBA",
  "BCA",
  "B.Arch",
  "B.Ed",
  "B.Pharm",
  "B.Des",
  "BHM",
  "LLB / BA LLB",
  "MBBS / BDS",
  "M.A.",
  "M.Sc.",
  "M.Com.",
  "M.Tech / M.E.",
  "MBA",
  "MCA",
  "M.Ed",
  "M.Pharm",
  "M.Des",
  "LLM",
  "MD / MS",
  "Ph.D.",
  "Other",
];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const SectionHeader = ({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) => (
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

const EmptyState = ({ onAdd }: { onAdd: () => void }) => (
  <div className="flex flex-col items-center justify-center py-16 px-8 border-2 border-dashed border-border/20 rounded-2xl bg-muted/5">
    <div className="h-16 w-16 rounded-2xl bg-primary/5 flex items-center justify-center mb-4">
      <GraduationCap className="h-8 w-8 text-primary/40" />
    </div>
    <h4 className="text-sm font-bold text-foreground mb-1">
      No education details added
    </h4>
    <p className="text-xs text-muted-foreground/60 text-center max-w-sm mb-6">
      Add your educational qualifications starting from the highest degree.
      This information is required for your employee profile.
    </p>
    <Button
      type="button"
      onClick={onAdd}
      className="rounded-xl gap-2 h-10 px-6 shadow-lg shadow-primary/20"
    >
      <Plus className="h-4 w-4" />
      Add Education
    </Button>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

interface OnboardingEducationFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export function OnboardingEducationForm({
  onCancel,
  onSuccess,
}: OnboardingEducationFormProps) {
  const { data, refetch } = useProfileContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [collapsedCards, setCollapsedCards] = useState<Set<number>>(new Set());

  // Map existing education data from context
  const existingEducations =
    data?.education?.map((edu: any) => ({
      id: edu.id,
      degree: edu.degree || "",
      institution: edu.institution || "",
      fieldOfStudy: edu.fieldOfStudy || "",
      startDate: edu.startDate || "",
      endDate: edu.endDate || "",
      grade: edu.grade || "",
    })) || [];

  const form = useForm<EducationFormValues>({
    resolver: zodResolver(educationFormSchema),
    defaultValues: {
      educations: existingEducations.length > 0 ? existingEducations : [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "educations",
  });

  // Auto-collapse all but the last card when a new one is added
  useEffect(() => {
    if (fields.length > 1) {
      const newCollapsed = new Set<number>();
      for (let i = 0; i < fields.length - 1; i++) {
        newCollapsed.add(i);
      }
      setCollapsedCards(newCollapsed);
    }
  }, [fields.length]);

  const toggleCollapse = (index: number) => {
    setCollapsedCards((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const addNewEducation = () => {
    append({
      degree: "",
      institution: "",
      fieldOfStudy: "",
      startDate: "",
      endDate: "",
      grade: "",
    });
  };

  const handleRemove = (index: number) => {
    remove(index);
    setCollapsedCards((prev) => {
      const next = new Set<number>();
      prev.forEach((v) => {
        if (v < index) next.add(v);
        else if (v > index) next.add(v - 1);
      });
      return next;
    });
  };

  const onSubmit = async (values: EducationFormValues) => {
    setIsSubmitting(true);
    try {
      const payload = values.educations.map((edu) => ({
        ...(edu.id ? { id: edu.id } : {}),
        degree: edu.degree,
        institution: edu.institution,
        fieldOfStudy: edu.fieldOfStudy || null,
        startDate: edu.startDate,
        endDate: edu.endDate,
        grade: edu.grade || null,
      }));

      await api.put("/profile/me/educations", { educations: payload });

      toast.success("Education details saved successfully");
      refetch?.();
      onSuccess();
    } catch (error) {
      console.error("Save education error:", error);
      toast.error("An error occurred while saving education details");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate year options (current+5 down to 1970)
  const yearOptions: number[] = [];
  for (let y = currentYear + 5; y >= 1970; y--) {
    yearOptions.push(y);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <SectionHeader
        icon={GraduationCap}
        title="Education Details"
        description="Add your qualifications starting from the highest degree"
      />

      {fields.length === 0 ? (
        <EmptyState onAdd={addNewEducation} />
      ) : (
        <div className="space-y-4">
          {fields.map((field, index) => {
            const isCollapsed = collapsedCards.has(index);
            const watchDegree = form.watch(`educations.${index}.degree`);
            const watchInstitution = form.watch(
              `educations.${index}.institution`
            );
            const watchField = form.watch(
              `educations.${index}.fieldOfStudy`
            );
            const watchYear = form.watch(
              `educations.${index}.yearOfCompletion`
            );
            const watchGrade = form.watch(`educations.${index}.grade`);
            const errors = form.formState.errors.educations?.[index];

            return (
              <div
                key={field.id}
                className={cn(
                  "rounded-2xl border transition-all duration-300",
                  errors
                    ? "border-destructive/30 bg-destructive/[0.02]"
                    : "border-border/20 bg-background",
                  !isCollapsed && "shadow-sm"
                )}
              >
                {/* Card Header — always visible */}
                <div
                  className={cn(
                    "flex items-center gap-3 px-5 py-4 cursor-pointer select-none",
                    isCollapsed
                      ? "hover:bg-muted/30 rounded-2xl"
                      : "border-b border-border/10"
                  )}
                  onClick={() => toggleCollapse(index)}
                >
                  <div className="h-9 w-9 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
                    <GraduationCap className="h-4 w-4 text-muted-foreground/60" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-foreground truncate">
                        {watchDegree || `Education ${index + 1}`}
                      </h4>
                      {watchField && (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-primary/5 text-primary/70 px-2 py-0.5 rounded-full shrink-0 hidden sm:inline-block">
                          {watchField}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {watchInstitution && (
                        <span className="text-xs text-muted-foreground/70 truncate">
                          {watchInstitution}
                        </span>
                      )}
                      <span className="text-muted-foreground/30">·</span>
                      <span className="text-[10px] text-muted-foreground/50 font-medium shrink-0">
                        {form.watch(`educations.${index}.startDate`) || "Start"} - {
                          form.watch(`educations.${index}.endDate`) && new Date(form.watch(`educations.${index}.endDate`)) > new Date()
                            ? "Present" 
                            : form.watch(`educations.${index}.endDate`) || "End"
                        }
                      </span>
                      {watchGrade && (
                        <>
                          <span className="text-muted-foreground/30">·</span>
                          <span className="text-[10px] text-muted-foreground/50 font-medium shrink-0">
                            {watchGrade}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(index);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground/40">
                      {isCollapsed ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronUp className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Body — collapsible */}
                {!isCollapsed && (
                  <div className="px-5 py-5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Degree */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Degree / Qualification *
                        </Label>
                        <Select
                          onValueChange={(v) =>
                            form.setValue(`educations.${index}.degree`, v, {
                              shouldValidate: true,
                            })
                          }
                          defaultValue={watchDegree}
                        >
                          <SelectTrigger className="rounded-xl h-11 bg-background border-border/50">
                            <div className="flex items-center gap-2">
                              <Award className="h-4 w-4 text-muted-foreground/50" />
                              <SelectValue placeholder="Select Degree" />
                            </div>
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-border/50 shadow-2xl max-h-[280px]">
                            {DEGREE_OPTIONS.map((deg) => (
                              <SelectItem key={deg} value={deg}>
                                {deg}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors?.degree && (
                          <p className="text-[10px] text-destructive font-medium">
                            {errors.degree.message}
                          </p>
                        )}
                      </div>

                      {/* Institution */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Institution / University *
                        </Label>
                        <div className="relative">
                          <Building2 className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/50" />
                          <Input
                            {...form.register(
                              `educations.${index}.institution`
                            )}
                            className="rounded-xl h-11 pl-10"
                            placeholder="e.g. IIT Bombay"
                          />
                        </div>
                        {errors?.institution && (
                          <p className="text-[10px] text-destructive font-medium">
                            {errors.institution.message}
                          </p>
                        )}
                      </div>

                      {/* Field of Study */}
                      <div className="md:col-span-2 space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Field of Study / Specialization
                        </Label>
                        <div className="relative">
                          <BookOpen className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/50" />
                          <Input
                            {...form.register(
                              `educations.${index}.fieldOfStudy`
                            )}
                            className="rounded-xl h-11 pl-10"
                            placeholder="e.g. Computer Science"
                          />
                        </div>
                      </div>

                      {/* Start Date */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Start Date *
                        </Label>
                        <Input
                          type="month"
                          {...form.register(`educations.${index}.startDate`)}
                          className="rounded-xl h-11 bg-background border-border/50"
                        />
                        {errors?.startDate && (
                          <p className="text-[10px] text-destructive font-medium">
                            {errors.startDate.message}
                          </p>
                        )}
                      </div>

                      {/* End Date */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          End Date *
                        </Label>
                        <Input
                          type="month"
                          {...form.register(`educations.${index}.endDate`)}
                          className="rounded-xl h-11 bg-background border-border/50"
                        />
                        {errors?.endDate && (
                          <p className="text-[10px] text-destructive font-medium">
                            {errors.endDate.message}
                          </p>
                        )}
                      </div>

                      {/* Grade / CGPA / Percentage */}
                      <div className="md:col-span-2 space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Grade / CGPA / Percentage
                        </Label>
                        <div className="relative max-w-md">
                          <Hash className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/50" />
                          <Input
                            {...form.register(`educations.${index}.grade`)}
                            className="rounded-xl h-11 pl-10"
                            placeholder="e.g. 8.5 CGPA / 85% / First Class with Distinction"
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground/50 font-medium">
                          Enter your CGPA, percentage, or grade classification
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add More Button */}
          <Button
            type="button"
            variant="outline"
            onClick={addNewEducation}
            className="w-full rounded-2xl h-14 border-dashed border-2 border-border/20 hover:border-primary/30 hover:bg-primary/[0.02] text-muted-foreground hover:text-primary transition-all duration-300 gap-2"
          >
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Plus className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-sm font-semibold">
              Add Another Qualification
            </span>
          </Button>
        </div>
      )}

      <Separator className="bg-border/20" />

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground/50">
          <GraduationCap className="h-3.5 w-3.5" />
          <span className="font-medium">
            {fields.length === 0
              ? "No qualifications added"
              : `${fields.length} qualification${fields.length > 1 ? "s" : ""} added`}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="rounded-xl gap-2 h-11 px-6 flex-1 sm:flex-none border-border/40"
          >
            Cancel
          </Button>

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
            Save Education
          </Button>
        </div>
      </div>
    </form>
  );
}