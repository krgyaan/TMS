// web/src/modules/profile/components/onboarding/OnboardingExperienceForm.tsx

import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Briefcase,
  Building2,
  Plus,
  Trash2,
  Save,
  Loader2,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useProfileContext } from "../../contexts/ProfileContext";
import api from "@/lib/axios";

// ─────────────────────────────────────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────────────────────────────────────

const experienceEntrySchema = z
  .object({
    id: z.number().optional(),
    companyName: z.string().min(2, "Company name is required"),
    designation: z.string().min(2, "Designation is required"),
    fromDate: z.string().min(1, "Start date is required"),
    toDate: z.string().optional(),
    currentlyWorking: z.boolean().default(false),
    responsibilities: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.currentlyWorking && !data.toDate) {
        return false;
      }
      return true;
    },
    {
      message: "End date is required unless currently working",
      path: ["toDate"],
    }
  )
  .refine(
    (data) => {
      if (data.fromDate && data.toDate && !data.currentlyWorking) {
        return new Date(data.toDate) >= new Date(data.fromDate);
      }
      return true;
    },
    {
      message: "End date must be after start date",
      path: ["toDate"],
    }
  );

const experienceFormSchema = z.object({
  experiences: z.array(experienceEntrySchema),
});

type ExperienceFormValues = z.infer<typeof experienceFormSchema>;

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
      <Briefcase className="h-8 w-8 text-primary/40" />
    </div>
    <h4 className="text-sm font-bold text-foreground mb-1">
      No work experience added
    </h4>
    <p className="text-xs text-muted-foreground/60 text-center max-w-sm mb-6">
      Add your previous work experiences to help us understand your professional
      background. If you're a fresher, you can skip this step.
    </p>
    <Button
      type="button"
      onClick={onAdd}
      className="rounded-xl gap-2 h-10 px-6 shadow-lg shadow-primary/20"
    >
      <Plus className="h-4 w-4" />
      Add Experience
    </Button>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

interface OnboardingExperienceFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export function OnboardingExperienceForm({
  onCancel,
  onSuccess,
}: OnboardingExperienceFormProps) {
  const { data, refetch } = useProfileContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [collapsedCards, setCollapsedCards] = useState<Set<number>>(new Set());

  // Map existing experience data from context
  const existingExperiences =
    data?.experience?.map((exp: any) => ({
      id: exp.id,
      companyName: exp.companyName || "",
      designation: exp.designation || "",
      fromDate: exp.fromDate || "",
      toDate: exp.toDate || "",
      currentlyWorking: exp.currentlyWorking || false,
      responsibilities: exp.responsibilities || "",
    })) || [];

  const form = useForm<ExperienceFormValues>({
    resolver: zodResolver(experienceFormSchema),
    defaultValues: {
      experiences: existingExperiences.length > 0 ? existingExperiences : [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "experiences",
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

  const addNewExperience = () => {
    append({
      companyName: "",
      designation: "",
      fromDate: "",
      toDate: "",
      currentlyWorking: false,
      responsibilities: "",
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

  const onSubmit = async (values: ExperienceFormValues) => {
    setIsSubmitting(true);
    try {
      const payload = values.experiences.map((exp) => ({
        ...(exp.id ? { id: exp.id } : {}),
        companyName: exp.companyName,
        designation: exp.designation,
        fromDate: exp.fromDate,
        toDate: exp.currentlyWorking ? null : exp.toDate,
        currentlyWorking: exp.currentlyWorking,
        responsibilities: exp.responsibilities || null,
      }));

      await api.put("/profile/me/experiences", { experiences: payload });

      toast.success("Work experience saved successfully");
      refetch?.();
      onSuccess();
    } catch (error) {
      console.error("Save experience error:", error);
      toast.error("An error occurred while saving experience details");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateRange = (from: string, to: string, current: boolean) => {
    const fmt = (d: string) => {
      if (!d) return "";
      const date = new Date(d);
      return date.toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      });
    };
    const fromStr = fmt(from);
    const toStr = current ? "Present" : fmt(to);
    if (!fromStr) return "";
    return `${fromStr} — ${toStr}`;
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <SectionHeader
        icon={Briefcase}
        title="Work Experience"
        description="Add your previous employment details. Most recent first."
      />

      {fields.length === 0 ? (
        <EmptyState onAdd={addNewExperience} />
      ) : (
        <div className="space-y-4">
          {fields.map((field, index) => {
            const isCollapsed = collapsedCards.has(index);
            const watchCompany = form.watch(
              `experiences.${index}.companyName`
            );
            const watchDesignation = form.watch(
              `experiences.${index}.designation`
            );
            const watchFrom = form.watch(`experiences.${index}.fromDate`);
            const watchTo = form.watch(`experiences.${index}.toDate`);
            const watchCurrent = form.watch(
              `experiences.${index}.currentlyWorking`
            );
            const errors = form.formState.errors.experiences?.[index];

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
                    {watchCurrent ? (
                      <Award className="h-4 w-4 text-primary" />
                    ) : (
                      <Building2 className="h-4 w-4 text-muted-foreground/60" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-foreground truncate">
                        {watchDesignation || `Experience ${index + 1}`}
                      </h4>
                      {watchCurrent && (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full shrink-0">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {watchCompany && (
                        <span className="text-xs text-muted-foreground/70 truncate">
                          {watchCompany}
                        </span>
                      )}
                      {watchFrom && (
                        <>
                          <span className="text-muted-foreground/30">·</span>
                          <span className="text-[10px] text-muted-foreground/50 font-medium shrink-0">
                            {formatDateRange(
                              watchFrom,
                              watchTo || "",
                              watchCurrent || false
                            )}
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
                      {/* Company Name */}
                      <div className="space-y-2">
                        <Label
                          className="text-xs font-bold text-muted-foreground uppercase tracking-wider"
                        >
                          Company Name *
                        </Label>
                        <div className="relative">
                          <Building2 className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/50" />
                          <Input
                            {...form.register(
                              `experiences.${index}.companyName`
                            )}
                            className="rounded-xl h-11 pl-10"
                            placeholder="e.g. Infosys Technologies"
                          />
                        </div>
                        {errors?.companyName && (
                          <p className="text-[10px] text-destructive font-medium">
                            {errors.companyName.message}
                          </p>
                        )}
                      </div>

                      {/* Designation */}
                      <div className="space-y-2">
                        <Label
                          className="text-xs font-bold text-muted-foreground uppercase tracking-wider"
                        >
                          Designation / Role *
                        </Label>
                        <div className="relative">
                          <Briefcase className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/50" />
                          <Input
                            {...form.register(
                              `experiences.${index}.designation`
                            )}
                            className="rounded-xl h-11 pl-10"
                            placeholder="e.g. Senior Software Engineer"
                          />
                        </div>
                        {errors?.designation && (
                          <p className="text-[10px] text-destructive font-medium">
                            {errors.designation.message}
                          </p>
                        )}
                      </div>

                      {/* From Date */}
                      <div className="space-y-2">
                        <Label
                          className="text-xs font-bold text-muted-foreground uppercase tracking-wider"
                        >
                          Start Date *
                        </Label>
                        <div className="relative">
                          <CalendarDays className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/50" />
                          <Input
                            {...form.register(`experiences.${index}.fromDate`)}
                            type="date"
                            className="rounded-xl h-11 pl-10"
                          />
                        </div>
                        {errors?.fromDate && (
                          <p className="text-[10px] text-destructive font-medium">
                            {errors.fromDate.message}
                          </p>
                        )}
                      </div>

                      {/* To Date */}
                      <div className="space-y-2">
                        <Label
                          className={cn(
                            "text-xs font-bold uppercase tracking-wider",
                            watchCurrent
                              ? "text-muted-foreground/40"
                              : "text-muted-foreground"
                          )}
                        >
                          End Date {!watchCurrent && "*"}
                        </Label>
                        <div className="relative">
                          <CalendarDays
                            className={cn(
                              "absolute left-3.5 top-3.5 h-4 w-4",
                              watchCurrent
                                ? "text-muted-foreground/20"
                                : "text-muted-foreground/50"
                            )}
                          />
                          <Input
                            {...form.register(`experiences.${index}.toDate`)}
                            type="date"
                            disabled={watchCurrent}
                            className={cn(
                              "rounded-xl h-11 pl-10",
                              watchCurrent && "opacity-40 cursor-not-allowed"
                            )}
                          />
                        </div>
                        {errors?.toDate && (
                          <p className="text-[10px] text-destructive font-medium">
                            {errors.toDate.message}
                          </p>
                        )}

                        {/* Currently Working Checkbox */}
                        <div className="flex items-center gap-2 mt-2 bg-muted/30 px-3.5 py-2.5 rounded-xl border border-border/10">
                          <Checkbox
                            id={`currentlyWorking-${index}`}
                            checked={watchCurrent}
                            onCheckedChange={(checked) => {
                              form.setValue(
                                `experiences.${index}.currentlyWorking`,
                                !!checked
                              );
                              if (checked) {
                                form.setValue(
                                  `experiences.${index}.toDate`,
                                  ""
                                );
                                form.clearErrors(
                                  `experiences.${index}.toDate`
                                );
                              }
                            }}
                            className="rounded-md"
                          />
                          <Label
                            htmlFor={`currentlyWorking-${index}`}
                            className="text-xs font-semibold cursor-pointer"
                          >
                            I currently work here
                          </Label>
                        </div>
                      </div>

                      {/* Responsibilities */}
                      <div className="md:col-span-2 space-y-2">
                        <Label
                          className="text-xs font-bold text-muted-foreground uppercase tracking-wider"
                        >
                          Key Responsibilities
                        </Label>
                        <Textarea
                          {...form.register(
                            `experiences.${index}.responsibilities`
                          )}
                          className="rounded-xl min-h-[100px] resize-none"
                          placeholder="Describe your key responsibilities, achievements, and technologies used..."
                        />
                        <p className="text-[10px] text-muted-foreground/50 font-medium">
                          Brief summary of your role and contributions
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
            onClick={addNewExperience}
            className="w-full rounded-2xl h-14 border-dashed border-2 border-border/20 hover:border-primary/30 hover:bg-primary/[0.02] text-muted-foreground hover:text-primary transition-all duration-300 gap-2"
          >
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Plus className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-sm font-semibold">
              Add Another Experience
            </span>
          </Button>
        </div>
      )}

      <Separator className="bg-border/20" />

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground/50">
          <Briefcase className="h-3.5 w-3.5" />
          <span className="font-medium">
            {fields.length === 0
              ? "No experience entries"
              : `${fields.length} experience${fields.length > 1 ? "s" : ""} added`}
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
            Save Experience
          </Button>
        </div>
      </div>
    </form>
  );
}