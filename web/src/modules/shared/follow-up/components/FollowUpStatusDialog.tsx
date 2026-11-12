import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { Calendar, FileEdit, Loader2, MessageSquare, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import DateInput from "@/components/form/DateInput";
import { FileUploader } from "@/components/file-upload";

import { FREQUENCY_OPTIONS, STOP_REASON_OPTIONS } from "../helpers/followUp.constants";
import { followUpStatusFormSchema, type FollowUpStatusFormValues } from "../helpers/followUp.schema";
import { buildStatusDefaults, mapStatusFormToPayload } from "../helpers/followUp.mappers";
import { useUpdateFollowUpStatus } from "@/hooks/api/useFollowUps";

interface FollowUpStatusDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    followUpId: number | null;
}

export function FollowUpStatusDialog({ open, onOpenChange, followUpId }: FollowUpStatusDialogProps) {
    const mutation = useUpdateFollowUpStatus();

    const form = useForm<FollowUpStatusFormValues>({
        resolver: zodResolver(followUpStatusFormSchema) as Resolver<FollowUpStatusFormValues>,
        defaultValues: buildStatusDefaults(),
    });

    const frequency = form.watch("frequency");
    const stopReason = form.watch("stopReason");
    const isStopping = frequency === 6;

    useEffect(() => {
        if (open) {
            form.reset(buildStatusDefaults());
        }
    }, [open, form]);

    const onSubmit = form.handleSubmit(async values => {
        if (!followUpId) return;
        try {
            await mutation.mutateAsync({
                id: followUpId,
                data: mapStatusFormToPayload(values),
            });
            onOpenChange(false);
            form.reset(buildStatusDefaults());
        } catch {
            return;
        }
    });

    const isPending = mutation.isPending || form.formState.isSubmitting;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
                <DialogHeader className="border-b bg-muted/30 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <FileEdit className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <DialogTitle>Update Status</DialogTitle>
                            <DialogDescription className="mt-0.5">
                                Update the follow-up frequency and add a comment.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={onSubmit}>
                        <div className="max-h-[60vh] space-y-5 overflow-y-auto px-6 py-5">
                            <div className={isStopping ? "grid grid-cols-1 gap-4" : "grid grid-cols-2 gap-4"}>
                                <SelectField
                                    control={form.control}
                                    name="frequency"
                                    label={
                                        <span className="flex items-center gap-1.5">
                                            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                                            Frequency
                                        </span>
                                    }
                                    options={FREQUENCY_OPTIONS}
                                    placeholder="Choose frequency"
                                    valueType="number"
                                />

                                {!isStopping && (
                                    <FieldWrapper
                                        control={form.control}
                                        name="nextFollowUpDate"
                                        label={
                                            <span className="flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                                Next Follow-up
                                            </span>
                                        }
                                    >
                                        {field => <DateInput value={field.value} onChange={field.onChange} />}
                                    </FieldWrapper>
                                )}
                            </div>

                            <FieldWrapper
                                control={form.control}
                                name="latestComment"
                                label={
                                    <span className="flex items-center gap-1.5">
                                        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                                        Comment
                                    </span>
                                }
                                description="This will be visible in the follow-up history."
                            >
                                {field => (
                                    <Textarea
                                        {...field}
                                        value={field.value ?? ""}
                                        placeholder="Add a comment about this follow-up..."
                                        rows={3}
                                        className="resize-none"
                                    />
                                )}
                            </FieldWrapper>

                            {isStopping && (
                                <div className="space-y-4 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                                    <SelectField
                                        control={form.control}
                                        name="stopReason"
                                        label="Reason"
                                        options={STOP_REASON_OPTIONS}
                                        placeholder="Select a reason"
                                        valueType="number"
                                    />

                                    {stopReason === 2 && (
                                        <>
                                            <FieldWrapper control={form.control} name="proofText" label="Proof Details">
                                                {field => (
                                                    <Textarea
                                                        {...field}
                                                        value={field.value ?? ""}
                                                        placeholder="Describe how the objective was achieved..."
                                                        rows={3}
                                                        className="resize-none bg-background"
                                                    />
                                                )}
                                            </FieldWrapper>

                                            <FieldWrapper control={form.control} name="proofImage" label="Proof Image">
                                                {field => (
                                                    <FileUploader
                                                        context="follow-ups"
                                                        value={field.value ? [field.value] : []}
                                                        onChange={files => field.onChange(files[0] ?? "")}
                                                        disabled={isPending}
                                                    />
                                                )}
                                            </FieldWrapper>
                                        </>
                                    )}

                                    {[1, 3, 4].includes(stopReason ?? 0) && (
                                        <FieldWrapper control={form.control} name="stopRemarks" label="Remarks">
                                            {field => (
                                                <Textarea
                                                    {...field}
                                                    value={field.value ?? ""}
                                                    placeholder="Please specify the reason..."
                                                    rows={3}
                                                    className="resize-none bg-background"
                                                />
                                            )}
                                        </FieldWrapper>
                                    )}
                                </div>
                            )}
                        </div>

                        <DialogFooter className="border-t bg-muted/30 px-6 py-4">
                            <div className="flex w-full items-center justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        onOpenChange(false);
                                        form.reset(buildStatusDefaults());
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isPending}
                                    variant={isStopping && stopReason !== 2 ? "destructive" : "default"}
                                >
                                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isStopping ? (stopReason === 2 ? "Mark Achieved" : "Stop Follow-up") : "Update Status"}
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
