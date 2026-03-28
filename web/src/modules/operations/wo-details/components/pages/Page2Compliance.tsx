import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ShieldCheck, FileText, Truck, Receipt } from "lucide-react";
import { Page2FormSchema } from "../../helpers/woDetail.schema";
import { WizardNavigation } from "../WizardNavigation";
import { YES_NO_OPTIONS, WIZARD_CONFIG } from "../../helpers/constants";
import { SelectField } from "@/components/form/SelectField";
import { DateInput } from "@/components/form/DateInput";
import { useAutoSave } from "@/hooks/api/useWoDetails";

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
    onSubmit,
    onSkip,
    onBack,
    onSaveDraft,
    isLoading,
    isSaving,
}: Page2ComplianceProps) {
    const form = useForm<Page2FormValues>({
        resolver: zodResolver(Page2FormSchema),
        defaultValues: { ...defaultValues, ...initialData },
    });

    const { autoSave, isSaving: isAutoSaving } = useAutoSave(woDetailId, 2);

    const watchLdApplicable = form.watch("ldApplicable");
    const watchPbgApplicable = form.watch("isPbgApplicable");
    const watchContractAgreement = form.watch("isContractAgreement");
    const watchDetailedPo = form.watch("detailedPoApplicable");

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

    const handleFormSubmit = async (values: Page2FormValues) => {
        await onSubmit(values);
    };

    const handleSaveDraft = async () => {
        await onSaveDraft(form.getValues());
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
                {/* LD Section */}
                <Card>
                    <CardHeader className="border-b bg-muted/10">
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-orange-500" />
                            Liquidated Damages (LD) Settings
                        </CardTitle>
                        <CardDescription>Configure penalties for completion delays.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                            <SelectField
                                control={form.control}
                                name="ldApplicable"
                                label="LD Applicable?"
                                options={YES_NO_OPTIONS}
                                placeholder="Select"
                            />

                            {watchLdApplicable === "true" && (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="maxLd"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Max LD %</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder="e.g., 10.00"
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        max="100"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

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
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* PBG Section */}
                <Card>
                    <CardHeader className="border-b bg-muted/10">
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-orange-500" />
                            Performance Bank Guarantee (PBG)
                        </CardTitle>
                        <CardDescription>Security deposit requirements for project performance.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                            <SelectField
                                control={form.control}
                                name="isPbgApplicable"
                                label="PBG Applicable?"
                                options={YES_NO_OPTIONS}
                                placeholder="Select"
                            />

                            {watchPbgApplicable === "true" && (
                                <FormField
                                    control={form.control}
                                    name="filledBgFormat"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>BG Format Required</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Enter BG format name or code" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>

                        {watchPbgApplicable === "true" && (
                            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
                                <p className="text-sm text-orange-800">
                                    <strong>Note:</strong> Please fill the BG form (other than tender). This is compulsory for project compliance.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Contract Agreement Section */}
                <Card>
                    <CardHeader className="border-b bg-muted/10">
                        <CardTitle className="flex items-center gap-2">
                            <Receipt className="h-5 w-5 text-orange-500" />
                            Formal Contract Agreement
                        </CardTitle>
                        <CardDescription>Legal contract requirement between client and company.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                            <SelectField
                                control={form.control}
                                name="isContractAgreement"
                                label="Contract Agreement Required?"
                                options={YES_NO_OPTIONS}
                                placeholder="Select"
                            />

                            {watchContractAgreement === "true" && (
                                <FormField
                                    control={form.control}
                                    name="contractAgreementFormat"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Contract Agreement Format</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Specify contract format" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Detailed PO Section */}
                <Card>
                    <CardHeader className="border-b bg-muted/10">
                        <CardTitle className="flex items-center gap-2">
                            <Truck className="h-5 w-5 text-orange-500" />
                            Detailed PO / FOA Requirements
                        </CardTitle>
                        <CardDescription>SAP PO and detailed work order configurations.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="max-w-xs">
                            <SelectField
                                control={form.control}
                                name="detailedPoApplicable"
                                label="Detailed PO Applicable?"
                                options={YES_NO_OPTIONS}
                                placeholder="Select"
                            />
                        </div>

                        {watchDetailedPo === "true" ? (
                            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex gap-3 items-center">
                                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                    <FileText className="h-5 w-5" />
                                </div>
                                <p className="text-sm text-blue-800">
                                    A followup for SAP PO will be automatically initiated once the TL accepts the PO.
                                </p>
                            </div>
                        ) : (
                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 items-center">
                                <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                                    <ShieldCheck className="h-5 w-5" />
                                </div>
                                <p className="text-sm text-amber-800">
                                    The WO Upload step will be skipped as Detailed PO is not applicable for this project.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <WizardNavigation
                    currentPage={2}
                    totalPages={WIZARD_CONFIG.TOTAL_PAGES}
                    canSkip={false}
                    isSubmitting={isLoading}
                    isSaving={isSaving || isAutoSaving}
                    onBack={onBack}
                    onSubmit={() => form.handleSubmit(handleFormSubmit)()}
                    onSkip={onSkip}
                    onSaveDraft={handleSaveDraft}
                />
            </form>
        </Form>
    );
}
