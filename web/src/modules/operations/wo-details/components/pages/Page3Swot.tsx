import { useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormField, FormItem, FormControl } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { TrendingUp, TrendingDown, Lightbulb, AlertTriangle } from "lucide-react";

import { Page3FormSchema } from "../../helpers/woDetail.schema";
import { WizardNavigation } from "../WizardNavigation";
import { WIZARD_CONFIG } from "../../helpers/constants";
import { useAutoSave } from "@/hooks/api/useWoDetails";

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
            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>SWOT Analysis of the Tender</CardTitle>
                        <CardDescription>
                            All fields are optional. Provide analysis to help with project planning.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-green-600">
                                    <TrendingUp className="h-5 w-5" />
                                    <h3 className="font-semibold">Strengths of VE</h3>
                                </div>
                                <FormField
                                    control={form.control}
                                    name="swotStrengths"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Textarea
                                                    {...field}
                                                    placeholder="What are VE's strengths in this project?"
                                                    className="min-h-[150px] border-green-200 focus:border-green-500"
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-red-600">
                                    <TrendingDown className="h-5 w-5" />
                                    <h3 className="font-semibold">Weaknesses of VE</h3>
                                </div>
                                <FormField
                                    control={form.control}
                                    name="swotWeaknesses"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Textarea
                                                    {...field}
                                                    placeholder="What are VE's weaknesses in this project?"
                                                    className="min-h-[150px] border-red-200 focus:border-red-500"
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-blue-600">
                                    <Lightbulb className="h-5 w-5" />
                                    <h3 className="font-semibold">Opportunities for VE</h3>
                                </div>
                                <FormField
                                    control={form.control}
                                    name="swotOpportunities"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Textarea
                                                    {...field}
                                                    placeholder="What opportunities exist in this project?"
                                                    className="min-h-[150px] border-blue-200 focus:border-blue-500"
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-yellow-600">
                                    <AlertTriangle className="h-5 w-5" />
                                    <h3 className="font-semibold">Threats/Risks in the Project</h3>
                                </div>
                                <FormField
                                    control={form.control}
                                    name="swotThreats"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Textarea
                                                    {...field}
                                                    placeholder="What are the threats or risks in this project?"
                                                    className="min-h-[150px] border-yellow-200 focus:border-yellow-500"
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
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
