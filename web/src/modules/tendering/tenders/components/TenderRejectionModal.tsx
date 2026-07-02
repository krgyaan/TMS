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
import { useTenderRejectionStatuses } from "@/hooks/api/useTenderApprovals";
import { useUpdateTenderStatus } from "@/hooks/api/useTenders";
import { AlertCircle, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const TenderRejectionFormSchema = z.object({
    status: z.coerce.number().int().positive('Rejection reason must be selected'),
    comment: z.string().min(10, 'Remarks must be at least 10 characters'),
});

type TenderRejectionFormValues = z.infer<typeof TenderRejectionFormSchema>;

type TenderRejectionModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tenderId: number | null;
    tenderName?: string;
    onSuccess?: () => void;
};

export const TenderRejectionModal = ({ open, onOpenChange, tenderId, tenderName, onSuccess }: TenderRejectionModalProps) => {
    const { data: statuses, isLoading: isStatusesLoading } = useTenderRejectionStatuses();
    const updateStatus = useUpdateTenderStatus();

    const statusOptions = useMemo<SelectOption[]>(
        () => statuses?.map((s: any) => ({ id: String(s.id), name: s.name })) ?? [],
        [statuses]
    );

    const form = useForm<TenderRejectionFormValues>({
        resolver: zodResolver(TenderRejectionFormSchema) as any,
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

    const handleSubmit = async (values: TenderRejectionFormValues) => {
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
            // Error handling is done in the hook or via mutationError
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden border-none shadow-2xl">
                {/* Header with Red Rejection Theme */}
                <DialogHeader className="px-6 pt-6 pb-4 bg-red-50 dark:bg-red-950/20">
                    <div className="flex items-start gap-4">
                        <div
                            className={cn(
                                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                                "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 shadow-sm border border-red-200 dark:border-red-800"
                            )}
                        >
                            <XCircle className="h-6 w-6" />
                        </div>
                        <div className="space-y-1 flex-1">
                            <DialogTitle className="text-xl font-bold text-red-700 dark:text-red-400">Reject Tender</DialogTitle>
                            <DialogDescription className="text-sm text-red-600/80 dark:text-red-400/80 font-medium">
                                {tenderName ? `Rejecting: ${tenderName}` : "Provide a reason for rejecting this tender"}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <Separator className="bg-red-100 dark:bg-red-900/30" />

                {/* Form Content */}
                <div className="px-6 py-6 bg-background">
                    {/* Error Alert */}
                    {mutationError && (
                        <Alert variant="destructive" className="mb-5 border-red-200 bg-red-50 text-red-800">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{(mutationError as any)?.message || "An error occurred. Please try again."}</AlertDescription>
                        </Alert>
                    )}

                    <Form {...form}>
                        <form id="tender-rejection-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                            {/* Status Selection */}
                            <div className="space-y-2">
                                <SelectField
                                    control={form.control}
                                    name="status"
                                    label={<span className="text-sm font-semibold">Rejection Reason <span className="text-destructive">*</span></span>}
                                    options={statusOptions}
                                    placeholder={isStatusesLoading ? "Loading reasons..." : "Select a rejection reason"}
                                    disabled={isStatusesLoading}
                                />
                            </div>

                            {/* Comment Field */}
                            <FormField
                                control={form.control}
                                name="comment"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm font-semibold">
                                            Rejection Remarks <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                placeholder="Explain why this tender is being rejected (minimum 10 characters)..."
                                                rows={4}
                                                className={cn(
                                                    "min-h-[120px] resize-none focus-visible:ring-red-500",
                                                    form.formState.errors.comment && "border-destructive focus-visible:ring-destructive"
                                                )}
                                            />
                                        </FormControl>
                                        <div className="flex justify-between items-center mt-1">
                                            <FormMessage className="text-xs" />
                                            <p className={cn(
                                                "text-[10px] font-medium uppercase tracking-wider",
                                                (field.value?.length || 0) < 10 ? "text-muted-foreground" : "text-green-600"
                                            )}>
                                                {field.value?.length || 0} / 10 min characters
                                            </p>
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
                    <div className="flex items-center justify-between w-full">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving} className="hover:bg-red-50 hover:text-red-600">
                            Cancel
                        </Button>
                        <div className="flex gap-3">
                            <Button 
                                type="submit" 
                                form="tender-rejection-form" 
                                disabled={saving || !tenderId} 
                                variant="destructive"
                                className="min-w-[140px] shadow-lg shadow-red-500/20"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Rejecting...
                                    </>
                                ) : (
                                    "Confirm Rejection"
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
