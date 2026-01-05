// components/StatusModal.tsx
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SelectField } from "@/components/form/SelectField";
import { useCreateStatus, useUpdateStatus, useStatuses } from "@/hooks/api/useStatuses";
import type { Status } from "@/types/api.types";
import { AlertCircle, HelpCircle, Loader2, Pencil, Plus, Tag, FolderOpen, ListPlus, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const StatusFormSchema = z.object({
    name: z.string().min(1, "Name is required"),
    tenderCategory: z.string().max(100, "Category cannot exceed 100 characters").optional().nullable(),
    status: z.boolean().default(true),
});

type StatusFormValues = z.infer<typeof StatusFormSchema>;

type StatusModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    status?: Status | null;
    onSuccess?: () => void;
};

export const StatusModal = ({ open, onOpenChange, status, onSuccess }: StatusModalProps) => {
    const createStatus = useCreateStatus();
    const updateStatus = useUpdateStatus();
    const { data: existingStatuses = [] } = useStatuses();
    const [customCategory, setCustomCategory] = useState(false);
    const isEdit = !!status;

    const form = useForm<StatusFormValues>({
        resolver: zodResolver(StatusFormSchema) as any,
        defaultValues: {
            name: "",
            tenderCategory: "",
            status: true,
        },
    });

    const categoryOptions = useMemo(
        () => [
            { id: "", name: "None" },
            ...Array.from(new Set(existingStatuses.map(item => item.tenderCategory).filter((value): value is string => Boolean(value && value.trim().length)))).map(value => ({
                id: value,
                name: value,
            })),
        ],
        [existingStatuses]
    );

    useEffect(() => {
        if (open) {
            if (isEdit && status) {
                form.reset({
                    name: status.name ?? "",
                    tenderCategory: status.tenderCategory ?? "",
                    status: status.status ?? true,
                });
                const hasOption = categoryOptions.some(option => option.id === status.tenderCategory);
                setCustomCategory(!hasOption && !!status.tenderCategory);
            } else {
                form.reset({
                    name: "",
                    tenderCategory: "",
                    status: true,
                });
                setCustomCategory(false);
            }
            // Clear any previous errors
            createStatus.reset?.();
            updateStatus.reset?.();
        }
    }, [form, isEdit, status, open, categoryOptions]);

    const handleCategoryModeToggle = () => {
        setCustomCategory(prev => {
            const next = !prev;
            if (!next) {
                const hasExisting = categoryOptions.some(option => option.id === form.getValues("tenderCategory")?.trim());
                if (!hasExisting) {
                    form.setValue("tenderCategory", "");
                }
            }
            return next;
        });
    };

    const saving = createStatus.isPending || updateStatus.isPending;
    const mutationError = createStatus.error || updateStatus.error;

    const handleSubmit = async (values: StatusFormValues) => {
        try {
            const payload = {
                name: values.name.trim(),
                tenderCategory: values.tenderCategory?.trim() ? values.tenderCategory.trim() : null,
                status: values.status,
            };

            if (isEdit && status) {
                await updateStatus.mutateAsync({ id: status.id, data: payload as any });
            } else {
                await createStatus.mutateAsync(payload as any);
            }
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            // Error handling is done in the hook
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
                                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                                isEdit ? "bg-amber-100 text-amber-600" : "bg-primary/10 text-primary"
                            )}
                        >
                            {isEdit ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                        </div>
                        <div className="space-y-1">
                            <DialogTitle className="text-lg">{isEdit ? "Edit Status" : "Create New Status"}</DialogTitle>
                            <DialogDescription className="text-sm">{isEdit ? "Update the details for this status" : "Add a new status to categorize tenders"}</DialogDescription>
                        </div>
                    </div>
                    {isEdit && status && (
                        <Badge variant="secondary" className="absolute top-4 right-12 font-mono text-xs">
                            ID: {status.id}
                        </Badge>
                    )}
                </DialogHeader>

                <Separator />

                {/* Form Content */}
                <div className="px-6 py-5">
                    {/* Error Alert */}
                    {mutationError && (
                        <Alert variant="destructive" className="mb-5">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{(mutationError as any)?.message || "An error occurred. Please try again."}</AlertDescription>
                        </Alert>
                    )}

                    <Form {...form}>
                        <form id="status-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
                            {/* Status Name Field */}
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center justify-between">
                                            <FormLabel className="flex items-center gap-2 text-sm font-medium">
                                                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                                                Status Name
                                                <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <TooltipProvider delayDuration={300}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="max-w-[220px]">
                                                        <p className="text-xs">A unique identifier for this status (e.g., "Under Review", "Approved", "Rejected")</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                        <FormControl>
                                            <Input
                                                placeholder="Enter status name"
                                                className={cn("h-10", form.formState.errors.name && "border-destructive focus-visible:ring-destructive")}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Tender Category Field */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-2 text-sm font-medium">
                                        <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                                        Tender Category
                                    </Label>
                                    <TooltipProvider delayDuration={300}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="max-w-[220px]">
                                                <p className="text-xs">Optionally group this status under a tender category</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>

                                <div className="space-y-2">
                                    {customCategory ? (
                                        <FormField
                                            control={form.control}
                                            name="tenderCategory"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input placeholder="Enter custom category name" className="h-10" {...field} value={field.value ?? ""} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    ) : (
                                        <SelectField control={form.control} name="tenderCategory" options={categoryOptions} placeholder="Select tender category" />
                                    )}

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                                        onClick={handleCategoryModeToggle}
                                    >
                                        {customCategory ? (
                                            <>
                                                <ChevronRight className="h-3 w-3 mr-1 rotate-180" />
                                                Choose from existing categories
                                            </>
                                        ) : (
                                            <>
                                                <ListPlus className="h-3 w-3 mr-1" />
                                                Add custom category
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {/* Active Status Toggle */}
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <div
                                            className={cn(
                                                "flex items-center justify-between rounded-lg border p-4 transition-colors",
                                                field.value ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900" : "bg-muted/30"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={cn(
                                                        "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                                                        field.value
                                                            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400"
                                                            : "bg-muted text-muted-foreground"
                                                    )}
                                                >
                                                    <div className={cn("h-2 w-2 rounded-full", field.value ? "bg-emerald-500" : "bg-muted-foreground")} />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <Label className="text-sm font-medium cursor-pointer">{field.value ? "Active" : "Inactive"}</Label>
                                                    <p className="text-xs text-muted-foreground">
                                                        {field.value ? "Status is visible and can be assigned" : "Status is hidden from selection"}
                                                    </p>
                                                </div>
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
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                        Cancel
                    </Button>
                    <Button type="submit" form="status-form" disabled={saving} className="min-w-[100px]">
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {isEdit ? "Saving..." : "Creating..."}
                            </>
                        ) : isEdit ? (
                            "Save Changes"
                        ) : (
                            "Create Status"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
