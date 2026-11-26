import { ConditionalSection } from "@/components/form/ConditionalSection";
import { DateInput } from "@/components/form/DateInput";
import { SelectField } from "@/components/form/SelectField";
import { FileUploader } from "@/components/file-upload/FileUploader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useInfoSheet } from "@/hooks/api/useInfoSheets";
import { useAutoSave } from "@/hooks/api/useWoDetails";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { WIZARD_CONFIG, YES_NO_OPTIONS } from "../../helpers/constants";
import { calculateMaxLdDate } from "../../helpers/ldDate";
import { formToApi } from "../../helpers/woDetail.mapper";
import { Page2FormSchema } from "../../helpers/woDetail.schema";
import { WizardNavigation } from "../WizardNavigation";

import FieldWrapper from "@/components/form/FieldWrapper";
import type { Page2FormValues, PageFormProps } from "../../helpers/woDetail.types";

interface Page2ComplianceProps extends PageFormProps {
    initialData?: Partial<Page2FormValues>;
}

const defaultValues: Page2FormValues = {
    ldApplicable: "false",
    maxLd: "",
    ldStartDate: "",
    maxLdDate: "",
    isPbgApplicable: "false",
    filledBgFormat: [],
    isContractAgreement: "false",
    contractAgreementFormat: [],
    detailedPoApplicable: "false",
};

export function Page2Compliance({
    woDetailId,
    tenderId,
    initialData,
    onSaveDraft,
    onSaveDraftOnly,
    onSkip,
    onBack,
    isSaving,
}: Page2ComplianceProps) {
    const form = useForm<Page2FormValues>({
        resolver: zodResolver(Page2FormSchema),
        defaultValues: { ...defaultValues, ...initialData },
    });

    const { data: infoSheet } = useInfoSheet(tenderId ?? null);
    const seededRef = useRef(false);
    const lastLdStartRef = useRef<string | null>(null);

    const { autoSave, isSaving: isAutoSaving } = useAutoSave(woDetailId, 2, true, 4000, formToApi.page2);

    const watchLdApplicable = form.watch("ldApplicable");
    const watchLdStartDate = form.watch("ldStartDate");
    const watchMaxLd = form.watch("maxLd");
    const watchPbgApplicable = form.watch("isPbgApplicable");
    const watchContractAgreement = form.watch("isContractAgreement");
    const { dirtyFields } = form.formState;

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
        if (!infoSheet || seededRef.current) return;
        seededRef.current = true;

        const isNew = !initialData;
        const current = form.getValues();
        const ldRequired = infoSheet.ldRequired?.toUpperCase();

        const ldApplicable = ldRequired === "YES" ? "true" : ldRequired === "NO" ? "false" : undefined;
        if (ldApplicable && (isNew || !current.ldApplicable)) {
            form.setValue("ldApplicable", ldApplicable, { shouldDirty: false, shouldValidate: false });
        }

        if (infoSheet.maxLdPercentage != null && (isNew || !current.maxLd)) {
            form.setValue("maxLd", String(infoSheet.maxLdPercentage), { shouldDirty: false, shouldValidate: false });
        }
    }, [infoSheet, initialData, form]);

    useEffect(() => {
        const startDate = watchLdStartDate ?? "";
        if (lastLdStartRef.current === null) {
            lastLdStartRef.current = startDate;
            return;
        }
        if (!dirtyFields.ldStartDate || startDate === lastLdStartRef.current) return;
        lastLdStartRef.current = startDate;

        const maxLd = watchMaxLd || infoSheet?.maxLdPercentage;
        const computed = calculateMaxLdDate(startDate, maxLd, infoSheet?.ldPercentagePerWeek);
        if (computed) {
            form.setValue("maxLdDate", computed, { shouldValidate: true });
        }
    }, [watchLdStartDate, watchMaxLd, dirtyFields.ldStartDate, infoSheet, form]);

    useEffect(() => {
        if (watchLdApplicable !== "true") {
            form.resetField("maxLd", { defaultValue: "" });
            form.resetField("ldStartDate", { defaultValue: "" });
            form.resetField("maxLdDate", { defaultValue: "" });
            form.clearErrors(["maxLd", "ldStartDate", "maxLdDate"]);
        }
    }, [watchLdApplicable, form]);

    useEffect(() => {
        if (watchPbgApplicable !== "true") {
            form.setValue("filledBgFormat", [], { shouldValidate: false });
            form.clearErrors("filledBgFormat");
        }
    }, [watchPbgApplicable, form]);

    useEffect(() => {
        if (watchContractAgreement !== "true") {
            form.setValue("contractAgreementFormat", [], { shouldValidate: false });
            form.clearErrors("contractAgreementFormat");
        }
    }, [watchContractAgreement, form]);

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
                            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                            Compliance Obligations
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        {/* LD Section */}
                        <div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <SelectField
                                    control={form.control}
                                    name="ldApplicable"
                                    label="LD Applicable?"
                                    options={YES_NO_OPTIONS}
                                    placeholder="Select"
                                />
                                <ConditionalSection show={watchLdApplicable === "true"}>
                                    <FieldWrapper control={form.control} name="maxLd" label="Max LD %">
                                        {(field) => <Input {...field} placeholder="e.g., 10.00" type="number" step="0.01" min="0" max="100" />}
                                    </FieldWrapper>
                                </ConditionalSection>
                                <ConditionalSection show={watchLdApplicable === "true"}>
                                    <FormField
                                        control={form.control}
                                        name="ldStartDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>LD Start Date</FormLabel>
                                                <FormControl>
                                                    <DateInput {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </ConditionalSection>
                                <ConditionalSection show={watchLdApplicable === "true"}>
                                    <FormField
                                        control={form.control}
                                        name="maxLdDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Max LD Date</FormLabel>
                                                <FormControl>
                                                    <DateInput {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </ConditionalSection>
                            </div>
                            {infoSheet && watchLdApplicable === "true" && (infoSheet.ldPercentagePerWeek != null || infoSheet.maxLdPercentage != null) && (
                                <p className="mt-2 text-xs text-muted-foreground">
                                    From tender info sheet: LD {infoSheet.ldPercentagePerWeek ?? "-"}% per week, max {infoSheet.maxLdPercentage ?? "-"}%. Max LD Date is calculated from the LD Start Date.
                                </p>
                            )}
                        </div>

                        <Separator />

                        {/* PBG & Contract Agreement Section */}
                        <div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                                <SelectField
                                    control={form.control}
                                    name="isPbgApplicable"
                                    label="PBG Applicable?"
                                    options={YES_NO_OPTIONS}
                                    placeholder="Select"
                                />
                                <ConditionalSection show={watchPbgApplicable === "true"}>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium">BG Format / Instrument File</label>
                                        <FileUploader
                                            context="tender-documents"
                                            value={form.watch("filledBgFormat") || []}
                                            onChange={(paths) => form.setValue("filledBgFormat", paths, { shouldValidate: true })}
                                        />
                                    </div>
                                </ConditionalSection>
                                <SelectField
                                    control={form.control}
                                    name="isContractAgreement"
                                    label="Contract Agreement Required?"
                                    options={YES_NO_OPTIONS}
                                    placeholder="Select"
                                />
                                <ConditionalSection show={watchContractAgreement === "true"}>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium">Contract Agreement File</label>
                                        <FileUploader
                                            context="tender-documents"
                                            value={form.watch("contractAgreementFormat") || []}
                                            onChange={(paths) => form.setValue("contractAgreementFormat", paths, { shouldValidate: true })}
                                        />
                                    </div>
                                </ConditionalSection>
                            </div>
                        </div>

                        <Separator />

                        {/* PO Section */}
                        <div>
                            <div className="max-w-xs">
                                <SelectField
                                    control={form.control}
                                    name="detailedPoApplicable"
                                    label="Detailed PO Applicable?"
                                    options={YES_NO_OPTIONS}
                                    placeholder="Select"
                                />
                            </div>
                            <ConditionalSection show={form.watch("detailedPoApplicable") === "true"}>
                                <Alert className="mt-3">
                                    <Info className="h-4 w-4" />
                                    <AlertDescription>
                                        A followup for SAP PO will be automatically initiated once the TL accepts the PO.
                                    </AlertDescription>
                                </Alert>
                            </ConditionalSection>
                            <ConditionalSection show={form.watch("detailedPoApplicable") === "false"}>
                                <Alert className="mt-3">
                                    <Info className="h-4 w-4" />
                                    <AlertDescription>
                                        The WO Upload step will be skipped as Detailed PO is not applicable for this project.
                                    </AlertDescription>
                                </Alert>
                            </ConditionalSection>
                        </div>
                    </CardContent>
                </Card>

                <WizardNavigation
                    currentPage={2}
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
