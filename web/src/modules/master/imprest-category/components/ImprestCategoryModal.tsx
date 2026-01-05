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

import { Plus, Pencil, Layers, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { useCreateImprestCategory, useUpdateImprestCategory } from "@/hooks/api/useImprestCategories";

import type { ImprestCategory } from "@/types/api.types";

const ImprestCategoryFormSchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    heading: z.string().max(100).optional(),
    status: z.boolean().default(true),
});

type ImprestCategoryFormValues = z.infer<typeof ImprestCategoryFormSchema>;

type ImprestCategoryModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    imprestCategory?: ImprestCategory | null;
    onSuccess?: () => void;
};

export const ImprestCategoryModal = ({ open, onOpenChange, imprestCategory, onSuccess }: ImprestCategoryModalProps) => {
    const createImprestCategory = useCreateImprestCategory();
    const updateImprestCategory = useUpdateImprestCategory();

    const isEdit = !!imprestCategory;

    const form = useForm<ImprestCategoryFormValues>({
        resolver: zodResolver(ImprestCategoryFormSchema),
        defaultValues: {
            name: "",
            heading: "",
            status: true,
        },
    });

    useEffect(() => {
        if (!open) return;

        if (isEdit && imprestCategory) {
            form.reset({
                name: imprestCategory.name ?? "",
                heading: imprestCategory.heading ?? "",
                status: imprestCategory.status ?? true,
            });
        } else {
            form.reset({
                name: "",
                heading: "",
                status: true,
            });
        }

        createImprestCategory.reset?.();
        updateImprestCategory.reset?.();
    }, [open, isEdit, imprestCategory, form]);

    const saving = createImprestCategory.isPending || updateImprestCategory.isPending;

    const handleSubmit = async (values: ImprestCategoryFormValues) => {
        try {
            if (isEdit && imprestCategory) {
                await updateImprestCategory.mutateAsync({
                    id: imprestCategory.id,
                    data: values,
                });
            } else {
                await createImprestCategory.mutateAsync(values);
            }
            onOpenChange(false);
            onSuccess?.();
        } catch {
            // handled in hooks
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[440px] p-0 gap-0 overflow-hidden">
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
                            <DialogTitle className="text-lg">{isEdit ? "Edit Imprest Category" : "Create Imprest Category"}</DialogTitle>
                            <DialogDescription className="text-sm">{isEdit ? "Update imprest category details" : "Add a new imprest category to the system"}</DialogDescription>
                        </div>

                        {isEdit && imprestCategory && (
                            <Badge variant="secondary" className="font-mono text-xs">
                                ID: {imprestCategory.id}
                            </Badge>
                        )}
                    </div>
                </DialogHeader>

                <Separator />

                {/* Form */}
                <div className="px-6 py-5">
                    <Form {...form}>
                        <form id="imprest-category-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
                            {/* Name */}
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                            <Layers className="h-4 w-4 text-muted-foreground" />
                                            Name
                                            <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter category name" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Heading */}
                            <FormField
                                control={form.control}
                                name="heading"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm font-medium">
                                            Heading
                                            <span className="text-muted-foreground text-xs ml-1">(Optional)</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter heading" {...field} />
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
                                                <p className="text-xs text-muted-foreground">{field.value ? "Category is enabled" : "Category is disabled"}</p>
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

                        <Button type="submit" form="imprest-category-form" disabled={saving} className="min-w-[110px]">
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
