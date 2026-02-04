import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SelectField } from "@/components/form/SelectField";
import type { SelectOption } from "@/components/form/SelectField";
import { useFilteredStatuses } from "@/hooks/api/useStatuses";
import { useUpdateTenderStatus } from "@/hooks/api/useTenders";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const ChangeStatusFormSchema = z.object({
    status: z.coerce.number().int().positive('Status must be selected'),
    comment: z.string().min(10, 'Comment must be at least 10 characters'),
});

type ChangeStatusFormValues = z.infer<typeof ChangeStatusFormSchema>;

type ChangeStatusModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tenderId: number | null;
    currentStatus?: number | null;
    onSuccess?: () => void;
};

export const ChangeStatusModal = ({ open, onOpenChange, tenderId, currentStatus, onSuccess }: ChangeStatusModalProps) => {
    const statuses = useFilteredStatuses();
    const updateStatus = useUpdateTenderStatus();

    const statusOptions = useMemo<SelectOption[]>(
        () => statuses
            .filter((s: any) => !currentStatus || s.id !== currentStatus)
            .map((s: any) => ({ id: String(s.id), name: s.name })),
        [statuses, currentStatus]
    );

    const form = useForm<ChangeStatusFormValues>({
        resolver: zodResolver(ChangeStatusFormSchema) as any,
        defaultValues: {
            status: undefined,
            comment: "",
        },
    });

    useEffect(() => {
        if (open) {
            form.reset({
                status: undefined,
                comment: "",
            });
            updateStatus.reset?.();
        }
    }, [open]);

    const saving = updateStatus.isPending;
    const mutationError = updateStatus.error;

    const handleSubmit = async (values: ChangeStatusFormValues) => {
        if (!tenderId) return;

        try {
            await updateStatus.mutateAsync({
                id: tenderId,
                data: {
                    status: values.status,
                    comment: values.comment.trim(),
                },
            });
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            // Error handling is done in the hook
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden">
                {/* Header */}
                <DialogHeader className="px-6 pt-6 pb-4">
                    <div className="flex items-start gap-4">
                        <div
                            className={cn(
                                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                                "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                            )}
                        >
                            <RefreshCw className="h-5 w-5" />
                        </div>
                        <div className="space-y-1 flex-1">
                            <DialogTitle className="text-lg">Change Tender Status</DialogTitle>
                            <DialogDescription className="text-sm">
                                Update the status of this tender and provide a comment explaining the change
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <Separator />

                {/* Form Content */}
                <div className="px-6 py-5 max-h-[calc(100vh-280px)] overflow-y-auto">
                    {/* Error Alert */}
                    {mutationError && (
                        <Alert variant="destructive" className="mb-5">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{(mutationError as any)?.message || "An error occurred. Please try again."}</AlertDescription>
                        </Alert>
                    )}

                    <Form {...form}>
                        <form id="change-status-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
                            {/* Status Selection */}
                            <div className="space-y-2">
                                <SelectField
                                    control={form.control}
                                    name="status"
                                    label="Select New Status"
                                    options={statusOptions}
                                    placeholder="Select a status"
                                />
                            </div>

                            {/* Comment Field */}
                            <FormField
                                control={form.control}
                                name="comment"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm font-medium">
                                            Comment <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                placeholder="Enter a comment explaining the status change (minimum 10 characters)..."
                                                rows={4}
                                                className={cn(
                                                    "min-h-[100px]",
                                                    form.formState.errors.comment && "border-destructive focus-visible:ring-destructive"
                                                )}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                        <p className="text-xs text-muted-foreground">
                                            {field.value?.length || 0} / 10 minimum characters
                                        </p>
                                    </FormItem>
                                )}
                            />
                        </form>
                    </Form>
                </div>

                <Separator />

                {/* Footer */}
                <DialogFooter className="px-6 py-4 bg-muted/30">
                    <div className="flex items-center justify-between w-full">
                        <p className="text-xs text-muted-foreground hidden sm:block">
                            <span className="text-destructive">*</span> Required field
                        </p>
                        <div className="flex gap-2 ml-auto">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                                Cancel
                            </Button>
                            <Button type="submit" form="change-status-form" disabled={saving || !tenderId} className="min-w-[110px]">
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    "Update Status"
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
