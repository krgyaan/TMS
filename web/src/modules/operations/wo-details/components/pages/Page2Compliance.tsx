import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/form/DateInput";
import { SelectField } from "@/components/form/SelectField";
import { ShieldCheck, FileText, Truck, Receipt } from "lucide-react";
import { Page2FormSchema } from "../../helpers/woDetail.schema";
import { WizardNavigation } from "../WizardNavigation";
import { YES_NO_OPTIONS } from "../../helpers/constants";
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
            ldApplicable: 'false',
            maxLd: "",
            ldStartDate: "",
            maxLdDate: "",
            isPbgApplicable: 'false',
            filledBgFormat: "",
            isContractAgreement: 'false',
            contractAgreementFormat: "",
            detailedPoApplicable: 'false',
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
                {/* 1. LD Section */}
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
                                options={YES_NO_OPTIONS as any}
                                placeholder="Select"
                            />

                            {watchLdApplicable === 'true' && (
                                <>
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
                                        {(field) => <DateInput {...field} />}
                                    </FieldWrapper>

                                    <FieldWrapper control={form.control} name="maxLdDate" label="Max LD Date">
                                        {(field) => <DateInput {...field} />}
                                    </FieldWrapper>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* 2. PBG Section */}
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
                                options={YES_NO_OPTIONS as any}
                                placeholder="Select"
                            />

                            {watchPbgApplicable === 'true' && (
                                <FieldWrapper control={form.control} name="filledBgFormat" label="BG Format Required">
                                    {(field) => (
                                        <Input {...field} placeholder="Enter BG format name or code" />
                                    )}
                                </FieldWrapper>
                            )}
                        </div>
                        {watchPbgApplicable === 'true' && (
                            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
                                <p className="text-sm text-orange-800">
                                    <strong>Note:</strong> Please fill the BG form (other than tender). This is compulsory for project compliance.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 3. Contract Agreement Section */}
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
                                options={YES_NO_OPTIONS as any}
                                placeholder="Select"
                            />

                            {watchContractAgreement === 'true' && (
                                <FieldWrapper
                                    control={form.control}
                                    name="contractAgreementFormat"
                                    label="Contract Agreement Format"
                                >
                                    {(field) => (
                                        <Input {...field} placeholder="Specify contract format" />
                                    )}
                                </FieldWrapper>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* 4. Detailed PO Section */}
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
                                options={YES_NO_OPTIONS as any}
                                placeholder="Select"
                            />
                        </div>

                        {watchDetailedPo === 'true' ? (
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
