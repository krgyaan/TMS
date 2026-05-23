import { useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Link2, AlertCircle, Info } from "lucide-react";

import { Page6FormSchema } from "@/modules/operations/wo-details/helpers/woDetail.schema";
import { WizardNavigation } from "@/modules/operations/wo-details/components/WizardNavigation";
import { YES_NO_OPTIONS, WIZARD_CONFIG } from "@/modules/operations/wo-details/helpers/constants";
import { SelectField } from "@/components/form/SelectField";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { ConditionalSection } from "@/components/form/ConditionalSection";
import { formToApi } from "@/modules/operations/wo-details/helpers/woDetail.mapper";
import { useAutoSave } from "@/hooks/api/useWoDetails";

import type { Page6FormValues, PageFormProps } from "@/modules/operations/wo-details/helpers/woDetail.types";

interface Page6ProfitabilityProps extends PageFormProps {
    initialData?: Partial<Page6FormValues>;
}

const defaultValues: Page6FormValues = {
    costingSheetLink: "",
    hasDiscrepancies: "false",
    discrepancyComments: "",
};

export function Page6Profitability({
    woDetailId,
    initialData,
    onSaveDraft,
    onSaveDraftOnly,
    onSkip,
    onBack,
    isSaving,
}: Page6ProfitabilityProps) {
    const form = useForm<Page6FormValues>({
        resolver: zodResolver(Page6FormSchema),
        defaultValues: { ...defaultValues, ...initialData },
    });

    const { autoSave, isSaving: isAutoSaving } = useAutoSave(woDetailId, 6, true, 4000, formToApi.page6);

    const watchHasDiscrepancies = form.watch("hasDiscrepancies");

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
                            <Link2 className="h-5 w-5 text-muted-foreground" />
                            Profitability
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div>
                            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                                <Link2 className="h-4 w-4 text-muted-foreground" />
                                Tendering Costing Sheet
                            </h3>
                            <p className="text-xs text-muted-foreground mb-4">Reference the original costing sheet for this project.</p>
                            <div className="max-w-md">
                                <FieldWrapper control={form.control} name="costingSheetLink" label="Costing Sheet URL">
                                    {(field) => <Input {...field} type="url" placeholder="https://docs.google.com/spreadsheets/..." />}
                                </FieldWrapper>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                                PO/WO Comparison & Discrepancies
                            </h3>
                            <p className="text-xs text-muted-foreground mb-4">Compare the costing sheet with the received PO/WO.</p>
                            <div className="max-w-xs mb-4">
                                <SelectField
                                    control={form.control}
                                    name="hasDiscrepancies"
                                    label="Discrepancies Found?"
                                    options={YES_NO_OPTIONS}
                                    placeholder="Select"
                                />
                            </div>

                            <ConditionalSection show={watchHasDiscrepancies === "true"}>
                                <FieldWrapper control={form.control} name="discrepancyComments" label="Discrepancy Details">
                                    {(field) => (
                                        <Textarea
                                            {...field}
                                            placeholder="Describe the discrepancies found between costing and PO..."
                                            rows={4}
                                        />
                                    )}
                                </FieldWrapper>
                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertDescription>
                                        TL and TE will be notified of these discrepancies.
                                    </AlertDescription>
                                </Alert>
                            </ConditionalSection>
                        </div>
                    </CardContent>
                </Card>

                <WizardNavigation
                    currentPage={6}
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
