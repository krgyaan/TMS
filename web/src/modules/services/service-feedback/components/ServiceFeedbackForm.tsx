import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { Save, Loader2 } from "lucide-react";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { StarRatingInput } from "@/components/StarRatingInput";
import { paths } from "@/app/routes/paths";
import {
    useServiceFeedback,
    useCreateServiceFeedback,
    useUpdateServiceFeedback,
} from "@/hooks/api/useServiceFeedback";
import {
    ServiceFeedbackFormSchema,
    serviceFeedbackFormDefaultValues,
    type ServiceFeedbackFormValues,
    type CreateServiceFeedbackDto,
} from "../helpers/service-feedback.types";

const sectionCls = "py-6 px-6 border-b last:border-b-0";

interface ServiceFeedbackFormProps {
    complaintId?: number;
    feedbackId?: number;
    /** Standalone (customer-facing): hides the Cancel/back button. */
    standalone?: boolean;
    /** Called after a successful save when `standalone` is set (no redirect). */
    onSuccess?: () => void;
}

export function ServiceFeedbackForm({
    complaintId,
    feedbackId,
    standalone,
    onSuccess,
}: ServiceFeedbackFormProps) {
    const navigate = useNavigate();
    const isEdit = !!feedbackId;

    const createFeedback = useCreateServiceFeedback();
    const updateFeedback = useUpdateServiceFeedback();
    const { data: feedback } = useServiceFeedback(feedbackId ?? 0);

    const form = useForm<ServiceFeedbackFormValues>({
        resolver: zodResolver(ServiceFeedbackFormSchema) as Resolver<ServiceFeedbackFormValues>,
        defaultValues: serviceFeedbackFormDefaultValues,
    });

    useEffect(() => {
        if (!isEdit || !feedback) return;
        form.reset({
            problemResolved: feedback.problemResolved,
            satisfaction: feedback.satisfaction ?? null,
            suggestions: feedback.suggestions ?? "",
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEdit, feedback]);

    const saving = createFeedback.isPending || updateFeedback.isPending;

    const onSubmit = async (values: ServiceFeedbackFormValues) => {
        const payload: CreateServiceFeedbackDto = {
            complaintId: complaintId!,
            problemResolved: values.problemResolved,
            satisfaction: values.satisfaction ?? null,
            suggestions: values.suggestions?.trim() ? values.suggestions : null,
        };

        try {
            if (isEdit && feedbackId) {
                await updateFeedback.mutateAsync({ id: feedbackId, data: payload });
            } else {
                await createFeedback.mutateAsync(payload);
            }
            if (standalone) {
                onSuccess?.();
            } else {
                navigate(paths.services.feedback);
            }
        } catch {
            // handled by hooks
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card className="overflow-hidden">
                    {/* ── 1. Problem Resolved ──────────────────────────────── */}
                    <div className={sectionCls}>
                        <FieldWrapper<ServiceFeedbackFormValues, "problemResolved">
                            control={form.control}
                            name="problemResolved"
                            label="Is your problem resolved? *"
                        >
                            {field => (
                                <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value ?? "0"}  
                                    className="flex gap-6 pt-2"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="1" id="prob-yes" />
                                        <Label htmlFor="prob-yes" className="cursor-pointer">
                                            Yes / हाँ
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="0" id="prob-no" />
                                        <Label htmlFor="prob-no" className="cursor-pointer">
                                            No / नहीं
                                        </Label>
                                    </div>
                                </RadioGroup>
                            )}
                        </FieldWrapper>
                    </div>

                    {/* ── 2. Satisfaction Rating ───────────────────────────── */}
                    <div className={sectionCls}>
                        <FieldWrapper<ServiceFeedbackFormValues, "satisfaction">
                            control={form.control}
                            name="satisfaction"
                            label="How will you rate our services? (1-5) *"
                        >
                            {field => (
                                <div className="pt-2 flex flex-col items-start gap-2">
                                    <StarRatingInput
                                        value={field.value ?? null}
                                        onChange={field.onChange}
                                        max={5}
                                    />
                                    <input
                                        type="hidden"
                                        name="satisfaction"
                                        value={field.value ?? ""}
                                    />
                                    <span className="text-xs text-muted-foreground">
                                        Tap a star to rate (1 = lowest, 5 = highest)
                                    </span>
                                </div>
                            )}
                        </FieldWrapper>
                    </div>

                    {/* ── 3. Suggestions ────────────────────────────────────── */}
                    <div className={sectionCls}>
                        <FieldWrapper<ServiceFeedbackFormValues, "suggestions">
                            control={form.control}
                            name="suggestions"
                            label="Suggestions (if any) / सुझाव"
                        >
                            {field => (
                                <Textarea
                                    className="min-h-[120px]"
                                    placeholder="Write your suggestions..."
                                    disabled={saving}
                                    {...field}
                                    value={field.value ?? ""}
                                />
                            )}
                        </FieldWrapper>
                    </div>

                    {/* ── Form Actions ──────────────────────────────────────── */}
                    <div className="px-6 py-4 border-t bg-muted/30 flex justify-end gap-3">
                        {!standalone && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate(paths.services.feedback)}
                                disabled={saving}
                            >
                                Cancel
                            </Button>
                        )}
                        <Button type="submit" disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    {isEdit ? "Update Feedback" : "Submit Feedback"}
                                </>
                            )}
                        </Button>
                    </div>
                </Card>
            </form>
        </Form>
    );
}