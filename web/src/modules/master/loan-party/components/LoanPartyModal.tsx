import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { Plus, Pencil, Users, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { useCreateLoanParty, useUpdateLoanParty } from "@/hooks/api/useLoanParties";
import type { LoanParty } from "@/types/api.types";

const LoanPartyFormSchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    description: z.string().max(500).optional(),
    status: z.boolean().default(true),
});

type LoanPartyFormValues = z.infer<typeof LoanPartyFormSchema>;

type LoanPartyModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    loanParty?: LoanParty | null;
    onSuccess?: () => void;
};

export const LoanPartyModal = ({ open, onOpenChange, loanParty, onSuccess }: LoanPartyModalProps) => {
    const createLoanParty = useCreateLoanParty();
    const updateLoanParty = useUpdateLoanParty();

    const isEdit = !!loanParty;

    const form = useForm<LoanPartyFormValues>({
        resolver: zodResolver(LoanPartyFormSchema),
        defaultValues: {
            name: "",
            description: "",
            status: true,
        },
    });

    useEffect(() => {
        if (!open) return;

        if (isEdit && loanParty) {
            form.reset({
                name: loanParty.name ?? "",
                description: loanParty.description ?? "",
                status: loanParty.status ?? true,
            });
        } else {
            form.reset({
                name: "",
                description: "",
                status: true,
            });
        }

        createLoanParty.reset?.();
        updateLoanParty.reset?.();
    }, [open, isEdit, loanParty, form]);

    const saving = createLoanParty.isPending || updateLoanParty.isPending;

    const handleSubmit = async (values: LoanPartyFormValues) => {
        try {
            if (isEdit && loanParty) {
                await updateLoanParty.mutateAsync({
                    id: loanParty.id,
                    data: values,
                });
            } else {
                await createLoanParty.mutateAsync(values);
            }
            onOpenChange(false);
            onSuccess?.();
        } catch {
            // handled in hooks
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[460px] p-0 gap-0 overflow-hidden">
                {/* Header */}
                <DialogHeader className="px-6 pt-6 pb-4">
                    <div className="flex items-start gap-4">
                        <div
                            className={cn(
                                "flex h-11 w-11 items-center justify-center rounded-full",
                                isEdit ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                            )}
                        >
                            {isEdit ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                        </div>

                        <div className="flex-1 space-y-1">
                            <DialogTitle className="text-lg">{isEdit ? "Edit Loan Party" : "Create Loan Party"}</DialogTitle>
                            <DialogDescription className="text-sm">{isEdit ? "Update loan party details" : "Add a new loan party to the system"}</DialogDescription>
                        </div>

                        {isEdit && loanParty && (
                            <Badge variant="secondary" className="font-mono text-xs">
                                ID: {loanParty.id}
                            </Badge>
                        )}
                    </div>
                </DialogHeader>

                <Separator />

                {/* Form */}
                <div className="px-6 py-5 max-h-[calc(100vh-280px)] overflow-y-auto">
                    <Form {...form}>
                        <form id="loan-party-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
                            {/* Name */}
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                            <Users className="h-4 w-4 text-muted-foreground" />
                                            Name
                                            <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter loan party name" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Description */}
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea rows={3} placeholder="Enter description (optional)" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Status */}
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <div
                                            className={cn(
                                                "flex items-center justify-between rounded-lg border p-4",
                                                field.value ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800" : "bg-muted/30 border-muted"
                                            )}
                                        >
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-sm font-medium cursor-pointer">{field.value ? "Active" : "Inactive"}</FormLabel>
                                                <p className="text-xs text-muted-foreground">{field.value ? "Loan party is enabled" : "Loan party is disabled"}</p>
                                            </div>
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                        </div>
                                    </FormItem>
                                )}
                            />
                        </form>
                    </Form>
                </div>

                <Separator />

                {/* Footer */}
                <DialogFooter className="px-6 py-4 bg-muted/30">
                    <div className="flex justify-end gap-2 w-full">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                            Cancel
                        </Button>

                        <Button type="submit" form="loan-party-form" disabled={saving} className="min-w-[120px]">
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : isEdit ? (
                                "Save Changes"
                            ) : (
                                "Create"
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
