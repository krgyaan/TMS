import { ConditionalSection } from "@/components/form/ConditionalSection";
import { DateInput } from "@/components/form/DateInput";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { formToApi } from "../../helpers/woDetail.mapper";
import { useAutoSave } from "@/hooks/api/useWoDetails";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Info, Receipt, ShieldCheck } from "lucide-react";
import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { WIZARD_CONFIG, YES_NO_OPTIONS } from "../../helpers/constants";
import { Page2FormSchema } from "../../helpers/woDetail.schema";
import { WizardNavigation } from "../WizardNavigation";

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
    filledBgFormat: "",
    isContractAgreement: "false",
    contractAgreementFormat: "",
    detailedPoApplicable: "false",
};

export function Page2Compliance({
    woDetailId,
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

    const { autoSave, isSaving: isAutoSaving } = useAutoSave(woDetailId, 2, true, 4000, formToApi.page2);

    const watchLdApplicable = form.watch("ldApplicable");
    const watchPbgApplicable = form.watch("isPbgApplicable");
    const watchContractAgreement = form.watch("isContractAgreement");

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
                            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                            Compliance Obligations
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        {/* LD Section */}
                        <div>
                            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                                Liquidated Damages (LD)
                            </h3>
                            <p className="text-xs text-muted-foreground mb-4">Configure penalties for completion delays.</p>
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
                        </div>

                        <Separator />

                        {/* PBG Section */}
                        <div>
                            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                Performance Bank Guarantee (PBG)
                            </h3>
                            <p className="text-xs text-muted-foreground mb-4">Security deposit requirements for project performance.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <SelectField
                                    control={form.control}
                                    name="isPbgApplicable"
                                    label="PBG Applicable?"
                                    options={YES_NO_OPTIONS}
                                    placeholder="Select"
                                />
                                <ConditionalSection show={watchPbgApplicable === "true"}>
                                    <FieldWrapper control={form.control} name="filledBgFormat" label="BG Format Required">
                                        {(field) => <Input {...field} placeholder="Enter BG format name or code" />}
                                    </FieldWrapper>
                                </ConditionalSection>
                            </div>
                            <ConditionalSection show={watchPbgApplicable === "true"}>
                                <Alert className="mt-3">
                                    <Info className="h-4 w-4" />
                                    <AlertDescription>
                                        Please fill the BG form (other than tender). This is compulsory for project compliance.
                                    </AlertDescription>
                                </Alert>
                            </ConditionalSection>
                        </div>

                        <Separator />

                        {/* Contract Agreement Section */}
                        <div>
                            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                                <Receipt className="h-4 w-4 text-muted-foreground" />
                                Formal Contract Agreement
                            </h3>
                            <p className="text-xs text-muted-foreground mb-4">Legal contract requirement between client and company.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <SelectField
                                    control={form.control}
                                    name="isContractAgreement"
                                    label="Contract Agreement Required?"
                                    options={YES_NO_OPTIONS}
                                    placeholder="Select"
                                />
                                <ConditionalSection show={watchContractAgreement === "true"}>
                                    <FieldWrapper control={form.control} name="contractAgreementFormat" label="Contract Agreement Format">
                                        {(field) => <Input {...field} placeholder="Specify contract format" />}
                                    </FieldWrapper>
                                </ConditionalSection>
                            </div>
                        </div>

                        <Separator />

                        {/* PO Section */}
                        <div>
                            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                Detailed PO / FOA Requirements
                            </h3>
                            <p className="text-xs text-muted-foreground mb-4">SAP PO and detailed work order configurations.</p>
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
