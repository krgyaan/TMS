// web/src/modules/profile/components/onboarding/OnboardingBankForm.tsx

import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  CreditCard,
  Building2,
  Plus,
  Trash2,
  Save,
  Loader2,
  ChevronDown,
  ChevronUp,
  User,
  Hash,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useProfileContext } from "../../contexts/ProfileContext";
import api from "@/lib/axios";

// ─────────────────────────────────────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────────────────────────────────────

const bankEntrySchema = z.object({
  id: z.number().optional(),
  bankName: z.string().min(2, "Bank name is required"),
  accountHolderName: z.string().min(2, "Account holder name is required"),
  accountNumber: z.string().min(8, "Account number is required"),
  ifscCode: z.string().min(4, "IFSC code is required"),
  branchName: z.string().optional().nullable(),
  branchAddress: z.string().optional().nullable(),
  upiId: z.string().optional().nullable(),
  isPrimary: z.boolean().default(false),
});

const bankFormSchema = z.object({
  bankAccounts: z.array(bankEntrySchema).min(1, "Add at least one bank account"),
});

type BankFormValues = z.infer<typeof bankFormSchema>;

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
      <CreditCard className="h-8 w-8 text-primary/40" />
    </div>
    <h4 className="text-sm font-bold text-foreground mb-1">
      No bank accounts added
    </h4>
    <p className="text-xs text-muted-foreground/60 text-center max-w-sm mb-6">
      Add your bank account details for salary processing and reimbursements.
      You can add multiple accounts and mark one as primary.
    </p>
    <Button
      type="button"
      onClick={onAdd}
      className="rounded-xl gap-2 h-10 px-6 shadow-lg shadow-primary/20"
    >
      <Plus className="h-4 w-4" />
      Add Bank Account
    </Button>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

interface OnboardingBankFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export function OnboardingBankForm({
  onCancel,
  onSuccess,
}: OnboardingBankFormProps) {
  const { data, refetch } = useProfileContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [collapsedCards, setCollapsedCards] = useState<Set<number>>(new Set());

  // Map existing bank data from context
  const existingBanks =
    data?.bankAccounts?.map((bank: any) => ({
      id: bank.id,
      bankName: bank.bankName || "",
      accountHolderName: bank.accountHolderName || "",
      accountNumber: bank.accountNumber || "",
      ifscCode: bank.ifscCode || "",
      branchName: bank.branchName || "",
      branchAddress: bank.branchAddress || "",
      upiId: bank.upiId || "",
      isPrimary: bank.isPrimary || false,
    })) || [];

  const form = useForm<BankFormValues>({
    resolver: zodResolver(bankFormSchema),
    defaultValues: {
      bankAccounts: existingBanks.length > 0 ? existingBanks : [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "bankAccounts",
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

  const addNewBank = () => {
    append({
      bankName: "",
      accountHolderName: data?.profile?.firstName + " " + data?.profile?.lastName || "",
      accountNumber: "",
      ifscCode: "",
      branchName: "",
      branchAddress: "",
      upiId: "",
      isPrimary: fields.length === 0,
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

  const handleSetPrimary = (index: number) => {
    fields.forEach((_, i) => {
      form.setValue(`bankAccounts.${i}.isPrimary`, i === index);
    });
  };

  const onSubmit = async (values: BankFormValues) => {
    setIsSubmitting(true);
    try {
      await api.patch("/profile/me", {
        bankAccounts: values.bankAccounts
      });

      toast.success("Bank details saved successfully");
      refetch?.();
      onSuccess();
    } catch (error) {
      console.error("Save bank error:", error);
      toast.error("An error occurred while saving bank details");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <SectionHeader
        icon={CreditCard}
        title="Bank Details"
        description="Add your bank accounts for salary and reimbursements"
      />

      {fields.length === 0 ? (
        <EmptyState onAdd={addNewBank} />
      ) : (
        <div className="space-y-4">
          {fields.map((field, index) => {
            const isCollapsed = collapsedCards.has(index);
            const watchBankName = form.watch(`bankAccounts.${index}.bankName`);
            const watchAccNumber = form.watch(`bankAccounts.${index}.accountNumber`);
            const watchIsPrimary = form.watch(`bankAccounts.${index}.isPrimary`);
            const errors = form.formState.errors.bankAccounts?.[index];

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
                    <CreditCard className="h-4 w-4 text-muted-foreground/60" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-foreground truncate">
                        {watchBankName || `Bank Account ${index + 1}`}
                      </h4>
                      {watchIsPrimary && (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {watchAccNumber && (
                        <span className="text-xs text-muted-foreground/70 font-mono">
                          •••• {watchAccNumber.slice(-4)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {!watchIsPrimary && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-primary/5 hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetPrimary(index);
                        }}
                      >
                        Set Primary
                      </Button>
                    )}
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
                      {/* Bank Name */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Bank Name *
                        </Label>
                        <div className="relative">
                          <Building2 className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/50" />
                          <Input
                            {...form.register(`bankAccounts.${index}.bankName`)}
                            className="rounded-xl h-11 pl-10"
                            placeholder="e.g. HDFC Bank"
                          />
                        </div>
                        {errors?.bankName && (
                          <p className="text-[10px] text-destructive font-medium">
                            {errors.bankName.message}
                          </p>
                        )}
                      </div>

                      {/* Account Holder Name */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Account Holder Name *
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/50" />
                          <Input
                            {...form.register(`bankAccounts.${index}.accountHolderName`)}
                            className="rounded-xl h-11 pl-10"
                            placeholder="Full name as per bank"
                          />
                        </div>
                        {errors?.accountHolderName && (
                          <p className="text-[10px] text-destructive font-medium">
                            {errors.accountHolderName.message}
                          </p>
                        )}
                      </div>

                      {/* Account Number */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Account Number *
                        </Label>
                        <div className="relative">
                          <Hash className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/50" />
                          <Input
                            {...form.register(`bankAccounts.${index}.accountNumber`)}
                            className="rounded-xl h-11 pl-10 font-mono"
                            placeholder="XXXXXXXXXXXX"
                          />
                        </div>
                        {errors?.accountNumber && (
                          <p className="text-[10px] text-destructive font-medium">
                            {errors.accountNumber.message}
                          </p>
                        )}
                      </div>

                      {/* IFSC Code */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          IFSC Code *
                        </Label>
                        <div className="relative">
                          <Hash className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/50" />
                          <Input
                            {...form.register(`bankAccounts.${index}.ifscCode`)}
                            className="rounded-xl h-11 pl-10 font-mono uppercase"
                            placeholder="HDFC0001234"
                          />
                        </div>
                        {errors?.ifscCode && (
                          <p className="text-[10px] text-destructive font-medium">
                            {errors.ifscCode.message}
                          </p>
                        )}
                      </div>

                      {/* Branch Name */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Branch Name
                        </Label>
                        <Input
                          {...form.register(`bankAccounts.${index}.branchName`)}
                          className="rounded-xl h-11"
                          placeholder="Main Branch"
                        />
                      </div>

                      {/* UPI ID */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          UPI ID (Optional)
                        </Label>
                        <Input
                          {...form.register(`bankAccounts.${index}.upiId`)}
                          className="rounded-xl h-11 font-mono"
                          placeholder="username@bank"
                        />
                      </div>

                      {/* Branch Address */}
                      <div className="md:col-span-2 space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Branch Address
                        </Label>
                        <div className="relative">
                          <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/50" />
                          <Input
                            {...form.register(`bankAccounts.${index}.branchAddress`)}
                            className="rounded-xl h-11 pl-10"
                            placeholder="Full address of the branch"
                          />
                        </div>
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
            onClick={addNewBank}
            className="w-full rounded-2xl h-14 border-dashed border-2 border-border/20 hover:border-primary/30 hover:bg-primary/[0.02] text-muted-foreground hover:text-primary transition-all duration-300 gap-2"
          >
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Plus className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-sm font-semibold">
              Add Another Bank Account
            </span>
          </Button>
        </div>
      )}

      <Separator className="bg-border/20" />

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground/50">
          <CreditCard className="h-3.5 w-3.5" />
          <span className="font-medium">
            {fields.length === 0
              ? "No accounts added"
              : `${fields.length} account${fields.length > 1 ? "s" : ""} added`}
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
            Save Bank Details
          </Button>
        </div>
      </div>
    </form>
  );
}
