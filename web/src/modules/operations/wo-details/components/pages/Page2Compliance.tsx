import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/form/DateInput";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ShieldCheck, FileText, Truck, Receipt } from "lucide-react";
import { Page2FormSchema } from "../../helpers/woDetail.schema";
import { WizardNavigation } from "../WizardNavigation";
import type { Page2FormValues, PageFormProps } from "../../helpers/woDetail.types";

interface Page2ComplianceProps extends PageFormProps {
    initialData?: Partial<Page2FormValues>;
}

export function Page2Compliance({
    initialData,
    onSubmit,
    onSkip,
    onBack,
    isLoading,
}: Page2ComplianceProps) {
    const form = useForm<Page2FormValues>({
        resolver: zodResolver(Page2FormSchema) as Resolver<Page2FormValues>,
        defaultValues: {
            ldApplicable: false,
            maxLd: "",
            ldStartDate: "",
            maxLdDate: "",
            isPbgApplicable: false,
            filledBgFormat: "",
            isContractAgreement: false,
            contractAgreementFormat: "",
            detailedPoApplicable: false,
            ...initialData,
        },
    });

    const watchLdApplicable = form.watch("ldApplicable");
    const watchPbgApplicable = form.watch("isPbgApplicable");
    const watchContractAgreement = form.watch("isContractAgreement");
    const watchDetailedPo = form.watch("detailedPoApplicable");

    const handleFormSubmit = async (values: Page2FormValues) => {
        // TODO: Call API to save page 2 data
        console.log("Page 2 data:", values);
        onSubmit();
    };

    const handleSaveDraft = async () => {
        const values = form.getValues();
        // TODO: Call API to save draft
        console.log("Save draft:", values);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
                {/* LD Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-orange-500" />
                            Liquidated Damages (LD)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <FieldWrapper control={form.control} name="ldApplicable" label="">
                                {(field) => (
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="ldApplicable"
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                        <Label htmlFor="ldApplicable">LD Applicable</Label>
                                    </div>
                                )}
                            </FieldWrapper>
                        </div>

                        {watchLdApplicable && (
                            <div className="grid gap-4 md:grid-cols-3 mt-4 p-4 bg-muted/50 rounded-lg border">
                                <FieldWrapper control={form.control} name="maxLd" label="Max LD %">
                                    {(field) => (
                                        <Input
                                            {...field}
                                            placeholder="e.g., 10.00"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                        />
                                    )}
                                </FieldWrapper>

                                <FieldWrapper control={form.control} name="ldStartDate" label="LD Start Date">
                                    {(field) => (
                                        <DateInput
                                            value={field.value}
                                            onChange={field.onChange}
                                        />
                                    )}
                                </FieldWrapper>

                                <FieldWrapper control={form.control} name="maxLdDate" label="Max LD Date">
                                    {(field) => (
                                        <DateInput
                                            value={field.value}
                                            onChange={field.onChange}
                                        />
                                    )}
                                </FieldWrapper>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* PBG Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-orange-500" />
                            Performance Bank Guarantee (PBG)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <FieldWrapper control={form.control} name="isPbgApplicable" label="">
                                {(field) => (
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="isPbgApplicable"
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                        <Label htmlFor="isPbgApplicable">PBG Applicable</Label>
                                    </div>
                                )}
                            </FieldWrapper>
                        </div>

                        {watchPbgApplicable && (
                            <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
                                <FieldWrapper control={form.control} name="filledBgFormat" label="BG Format">
                                    {(field) => (
                                        <Input {...field} placeholder="Enter BG format or upload file" />
                                    )}
                                </FieldWrapper>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Please fill the BG form (other than tender). This is compulsory.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Contract Agreement Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Receipt className="h-5 w-5 text-orange-500" />
                            Contract Agreement
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <FieldWrapper control={form.control} name="isContractAgreement" label="">
                                {(field) => (
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="isContractAgreement"
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                        <Label htmlFor="isContractAgreement">Contract Agreement Required</Label>
                                    </div>
                                )}
                            </FieldWrapper>
                        </div>

                        {watchContractAgreement && (
                            <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
                                <FieldWrapper
                                    control={form.control}
                                    name="contractAgreementFormat"
                                    label="Contract Agreement Format"
                                >
                                    {(field) => (
                                        <Input {...field} placeholder="Enter format or upload contract agreement" />
                                    )}
                                </FieldWrapper>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Detailed PO Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Truck className="h-5 w-5 text-orange-500" />
                            Detailed PO / FOA / SAP PO / Detailed WO
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <FieldWrapper control={form.control} name="detailedPoApplicable" label="">
                                {(field) => (
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="detailedPoApplicable"
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                        <Label htmlFor="detailedPoApplicable">Detailed PO Applicable</Label>
                                    </div>
                                )}
                            </FieldWrapper>
                        </div>

                        {watchDetailedPo && (
                            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                    A follow-up for SAP PO will be initiated after the TL accepts the PO.
                                </p>
                            </div>
                        )}

                        {!watchDetailedPo && (
                            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                    The WO Upload step will be skipped since Detailed PO is not applicable.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Navigation */}
                <WizardNavigation
                    currentPage={2}
                    totalPages={7}
                    canSkip={true}
                    isSubmitting={isLoading}
                    onBack={onBack}
                    onSubmit={() => form.handleSubmit(handleFormSubmit)()}
                    onSkip={onSkip}
                    onSaveDraft={handleSaveDraft}
                />
            </form>
        </Form>
    );
}
