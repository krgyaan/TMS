import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, CheckCircle2, FileEdit, Info, Pen, Plus, Trash2, Truck } from "lucide-react";
import { useCallback, useEffect } from "react";
import { useFieldArray, useForm, type Resolver } from "react-hook-form";
import { ConditionalSection } from "@/components/form/ConditionalSection";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { useAutoSave } from "@/hooks/api/useWoDetails";
import { WizardNavigation } from "@/modules/operations/wo-details/components/WizardNavigation";
import { WIZARD_CONFIG, YES_NO_OPTIONS } from "@/modules/operations/wo-details/helpers/constants";
import { formToApi } from "@/modules/operations/wo-details/helpers/woDetail.mapper";
import { Page7FormSchema } from "@/modules/operations/wo-details/helpers/woDetail.schema";

import type { Amendment, Page7FormValues, PageFormProps } from "@/modules/operations/wo-details/helpers/woDetail.types";

interface Page7AcceptanceProps extends PageFormProps {
    initialData?: Partial<Page7FormValues>;
}

const defaultAmendment: Amendment = {
    pageNo: "",
    clauseNo: "",
    currentStatement: "",
    correctedStatement: "",
};

const defaultValues: Page7FormValues = {
    oeWoAmendmentNeeded: "false",
    amendments: [],
    oeSignaturePrepared: "false",
    courierRequestPrepared: "false",
};

export function Page7Acceptance({
    woDetailId,
    initialData,
    onSaveDraft,
    onSaveDraftOnly,
    onSkip,
    onBack,
    isSaving,
}: Page7AcceptanceProps) {
    const form = useForm<Page7FormValues>({
        resolver: zodResolver(Page7FormSchema) as Resolver<Page7FormValues>,
        defaultValues: { ...defaultValues, ...initialData },
    });

    const {
        fields: amendmentFields,
        append: appendAmendment,
        remove: removeAmendment,
    } = useFieldArray({ control: form.control, name: "amendments" });

    const { autoSave, isSaving: isAutoSaving } = useAutoSave(woDetailId, 7, true, 4000, formToApi.page7);

    const watchAmendmentNeeded = form.watch("oeWoAmendmentNeeded");

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

    useEffect(() => {
        if (watchAmendmentNeeded === "true") {
            form.setValue("oeSignaturePrepared", "false", { shouldValidate: false });
            form.setValue("courierRequestPrepared", "false", { shouldValidate: false });
            form.clearErrors(["oeSignaturePrepared", "courierRequestPrepared"]);
        } else {
            removeAmendment(Array.from({ length: amendmentFields.length }, (_, i) => i));
            form.clearErrors("amendments");
        }
    }, [watchAmendmentNeeded, form, removeAmendment, amendmentFields.length]);

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
                            <FileEdit className="h-5 w-5 text-muted-foreground" />
                            WO Acceptance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div>
                            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                                <FileEdit className="h-4 w-4 text-muted-foreground" />
                                WO Amendment Decision
                            </h3>
                            <p className="text-xs text-muted-foreground mb-4">Does this WO require any amendments before acceptance?</p>
                            <div className="max-w-xs">
                                <SelectField
                                    control={form.control}
                                    name="oeWoAmendmentNeeded"
                                    label="Amendment Needed?"
                                    options={YES_NO_OPTIONS}
                                    placeholder="Select"
                                />
                            </div>
                        </div>

                        <ConditionalSection show={watchAmendmentNeeded === "true"}>
                            <Separator />
                            <div>
                                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                                    Amendment Details
                                </h3>
                                <p className="text-xs text-muted-foreground mb-4">Specify all required corrections for the Work Order.</p>
                                <div className="space-y-6">
                                    {amendmentFields.map((field, index) => (
                                        <div key={field.id} className="p-4 border rounded-lg space-y-4 relative">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-semibold text-sm">Amendment #{index + 1}</h4>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    type="button"
                                                    onClick={() => removeAmendment(index)}
                                                    className="text-destructive h-8 w-8"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            <div className="grid gap-4 md:grid-cols-6 items-start">
                                                <FieldWrapper control={form.control} name={`amendments.${index}.pageNo`} label="Page Number">
                                                    {(field) => <Input {...field} placeholder="e.g., 12" />}
                                                </FieldWrapper>
                                                <FieldWrapper control={form.control} name={`amendments.${index}.clauseNo`} label="Clause Number">
                                                    {(field) => <Input {...field} placeholder="e.g., 5.1.a" />}
                                                </FieldWrapper>

                                                <div className="md:col-span-4 grid grid-cols-2 gap-4">
                                                    <FieldWrapper control={form.control} name={`amendments.${index}.currentStatement`} label="Current Statement in WO">
                                                        {(field) => (
                                                            <Textarea
                                                                {...field}
                                                                placeholder="Copy the exact text from the PO/WO..."
                                                                rows={2}
                                                            />
                                                        )}
                                                    </FieldWrapper>
                                                    <FieldWrapper control={form.control} name={`amendments.${index}.correctedStatement`} label="Proposed Corrected Statement">
                                                        {(field) => (
                                                            <Textarea
                                                                {...field}
                                                                placeholder="How it should read after amendment..."
                                                                rows={2}
                                                            />
                                                        )}
                                                    </FieldWrapper>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => appendAmendment(defaultAmendment)}
                                        className="w-full border-dashed border-2 py-4"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Another Amendment
                                    </Button>
                                </div>
                            </div>
                        </ConditionalSection>

                        <ConditionalSection show={watchAmendmentNeeded === "false"}>
                            <Separator />
                            <div>
                                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                                    Final Acceptance Checklist
                                </h3>
                                <p className="text-xs text-muted-foreground mb-4">Complete these steps to finalize Work Order acceptance.</p>
                                <div className="grid gap-6 md:grid-cols-2 mb-4">
                                    <div className="p-4 border rounded-lg space-y-3 bg-muted/5">
                                        <div className="flex items-center gap-3">
                                            <Pen className="h-4 w-4 text-muted-foreground" />
                                            <h4 className="font-semibold text-sm">Digital Signature</h4>
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Apply digital signature of authorized signatory on all pages of the PO/WO PDF.
                                        </p>
                                        <SelectField
                                            control={form.control}
                                            name="oeSignaturePrepared"
                                            label="Signature Applied?"
                                            options={YES_NO_OPTIONS}
                                            placeholder="Select"
                                        />
                                    </div>

                                    <div className="p-4 border rounded-lg space-y-3 bg-muted/5">
                                        <div className="flex items-center gap-3">
                                            <Truck className="h-4 w-4 text-muted-foreground" />
                                            <h4 className="font-semibold text-sm">Courier Preparation</h4>
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Initiate courier request for physical signed copies. Processed after TL approval.
                                        </p>
                                        <SelectField
                                            control={form.control}
                                            name="courierRequestPrepared"
                                            label="Courier Initiated?"
                                            options={YES_NO_OPTIONS}
                                            placeholder="Select"
                                        />
                                    </div>
                                </div>

                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertDescription>
                                        Upon submission, an authority letter will be automatically generated authorizing the TL to sign on behalf of the company for this specific project.
                                    </AlertDescription>
                                </Alert>
                            </div>
                        </ConditionalSection>
                    </CardContent>
                </Card>

                <WizardNavigation
                    currentPage={7}
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
