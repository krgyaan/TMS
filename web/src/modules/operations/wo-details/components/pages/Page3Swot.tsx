import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Lightbulb, TrendingDown, TrendingUp } from "lucide-react";
import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";

import { FieldWrapper } from "@/components/form/FieldWrapper";
import { useAutoSave } from "@/hooks/api/useWoDetails";
import { WIZARD_CONFIG } from "../../helpers/constants";
import { Page3FormSchema } from "../../helpers/woDetail.schema";
import { WizardNavigation } from "../WizardNavigation";

import type { Page3FormValues, PageFormProps } from "../../helpers/woDetail.types";

interface Page3SwotProps extends PageFormProps {
    initialData?: Partial<Page3FormValues>;
}

const defaultValues: Page3FormValues = {
    swotStrengths: "",
    swotWeaknesses: "",
    swotOpportunities: "",
    swotThreats: "",
};

export function Page3Swot({
    woDetailId,
    initialData,
    onSaveDraft,
    onSaveDraftOnly,
    onSkip,
    onBack,
    isSaving,
}: Page3SwotProps) {
    const form = useForm<Page3FormValues>({
        resolver: zodResolver(Page3FormSchema),
        defaultValues: { ...defaultValues, ...initialData },
    });

    const { autoSave, isSaving: isAutoSaving } = useAutoSave(woDetailId, 3);

    useEffect(() => {
        const subscription = form.watch((values) => {
            if (values) autoSave(values);
        });
        return () => subscription.unsubscribe();
    }, [form, autoSave]);

    useEffect(() => {
        if (initialData) {
            form.reset({ ...defaultValues, ...initialData });
        }
    }, [initialData, form]);

    const handleSaveAndContinue = useCallback(async () => {
        const errors = await onSaveDraft(form.getValues());
        if (errors?.length) {
            for (const err of errors) {
                form.setError(err.field as any, { message: err.message });
            }
        }
    }, [onSaveDraft, form]);

    const handleSaveDraftOnly = useCallback(async () => {
        const errors = await onSaveDraftOnly(form.getValues());
        if (errors?.length) {
            for (const err of errors) {
                form.setError(err.field as any, { message: err.message });
            }
        }
    }, [onSaveDraftOnly, form]);

    return (
        <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <TrendingUp className="h-5 w-5 text-muted-foreground" />
                            SWOT Analysis of the Tender
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground mb-4">
                            All fields are optional. Provide analysis to help with project planning.
                        </p>
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                    Strengths of VE
                                </h3>
                                <FieldWrapper control={form.control} name="swotStrengths" label="Strengths of VE">
                                    {(field) => (
                                        <Textarea
                                            {...field}
                                            placeholder="What are VE's strengths in this project?"
                                            className="min-h-[150px]"
                                        />
                                    )}
                                </FieldWrapper>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                                    Weaknesses of VE
                                </h3>
                                <FieldWrapper control={form.control} name="swotWeaknesses" label="Weaknesses of VE">
                                    {(field) => (
                                        <Textarea
                                            {...field}
                                            placeholder="What are VE's weaknesses in this project?"
                                            className="min-h-[150px]"
                                        />
                                    )}
                                </FieldWrapper>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                    <Lightbulb className="h-4 w-4 text-muted-foreground" />
                                    Opportunities for VE
                                </h3>
                                <FieldWrapper control={form.control} name="swotOpportunities" label="Opportunities for VE">
                                    {(field) => (
                                        <Textarea
                                            {...field}
                                            placeholder="What opportunities exist in this project?"
                                            className="min-h-[150px]"
                                        />
                                    )}
                                </FieldWrapper>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                                    Threats/Risks in the Project
                                </h3>
                                <FieldWrapper control={form.control} name="swotThreats" label="Threats/Risks in the Project">
                                    {(field) => (
                                        <Textarea
                                            {...field}
                                            placeholder="What are the threats or risks in this project?"
                                            className="min-h-[150px]"
                                        />
                                    )}
                                </FieldWrapper>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <WizardNavigation
                    currentPage={3}
                    totalPages={WIZARD_CONFIG.TOTAL_PAGES}
                    canSkip={true}
                    isSubmitting={isSaving}
                    isSaving={isSaving || isAutoSaving}
                    onBack={onBack}
                    onSubmit={handleSaveAndContinue}
                    onSkip={onSkip}
                    onSaveDraft={handleSaveDraftOnly}
                />
            </form>
        </Form>
    );
}
