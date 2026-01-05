import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { Plus, Pencil, CalendarRange, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { useCreateFinancialYear, useUpdateFinancialYear } from "@/hooks/api/useFinancialYear";

import type { FinancialYear } from "@/types/api.types";

const FinancialYearFormSchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    status: z.boolean().default(true),
});

type FinancialYearFormValues = z.infer<typeof FinancialYearFormSchema>;

type FinancialYearModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    financialYear?: FinancialYear | null;
    onSuccess?: () => void;
};

export const FinancialYearModal = ({ open, onOpenChange, financialYear, onSuccess }: FinancialYearModalProps) => {
    const createFinancialYear = useCreateFinancialYear();
    const updateFinancialYear = useUpdateFinancialYear();

    const isEdit = !!financialYear;

    const form = useForm<FinancialYearFormValues>({
        resolver: zodResolver(FinancialYearFormSchema),
        defaultValues: {
            name: "",
            status: true,
        },
    });

    useEffect(() => {
        if (!open) return;

        if (isEdit && financialYear) {
            form.reset({
                name: financialYear.name ?? "",
                status: financialYear.status ?? true,
            });
        } else {
            form.reset({
                name: "",
                status: true,
            });
        }

        createFinancialYear.reset?.();
        updateFinancialYear.reset?.();
    }, [open, isEdit, financialYear, form]);

    const saving = createFinancialYear.isPending || updateFinancialYear.isPending;

    const handleSubmit = async (values: FinancialYearFormValues) => {
        try {
            if (isEdit && financialYear) {
                await updateFinancialYear.mutateAsync({
                    id: financialYear.id,
                    data: values,
                });
            } else {
                await createFinancialYear.mutateAsync(values);
            }
            onOpenChange(false);
            onSuccess?.();
        } catch {
            // handled in hooks
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px] p-0 gap-0 overflow-hidden">
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
                            <DialogTitle className="text-lg">{isEdit ? "Edit Financial Year" : "Create Financial Year"}</DialogTitle>
                            <DialogDescription className="text-sm">{isEdit ? "Update financial year details" : "Add a new financial year to the system"}</DialogDescription>
                        </div>

                        {isEdit && financialYear && (
                            <Badge variant="secondary" className="font-mono text-xs">
                                ID: {financialYear.id}
                            </Badge>
                        )}
                    </div>
                </DialogHeader>

                <Separator />

                {/* Form */}
                <div className="px-6 py-5">
                    <Form {...form}>
                        <form id="financial-year-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
                            {/* Name */}
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                            <CalendarRange className="h-4 w-4 text-muted-foreground" />
                                            Name
                                            <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter financial year (e.g., 2024–2025)" {...field} />
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
                                                <p className="text-xs text-muted-foreground">{field.value ? "Financial year is active" : "Financial year is inactive"}</p>
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
                    <div className="flex gap-2 w-full">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="w-1/2">
                            Cancel
                        </Button>

                        <Button type="submit" form="financial-year-form" disabled={saving} className="w-1/2">
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : isEdit ? (
                                "Update"
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
