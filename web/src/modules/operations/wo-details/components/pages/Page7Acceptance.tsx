import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/form/SelectField";
import { Plus, Trash2, FileEdit, CheckCircle2, Pen, Truck, AlertTriangle, ShieldCheck } from "lucide-react";
import { Page7FormSchema } from "../../helpers/woDetail.schema";
import { WizardNavigation } from "../WizardNavigation";
import { YES_NO_OPTIONS } from "../../helpers/constants";
import type { Page7FormValues, PageFormProps } from "../../helpers/woDetail.types";

interface Page7AcceptanceProps extends PageFormProps {
    initialData?: Partial<Page7FormValues>;
}

export function Page7Acceptance({
    initialData,
    onSubmit,
    onSkip,
    onBack,
    isLoading,
}: Page7AcceptanceProps) {
    const form = useForm<Page7FormValues>({
        resolver: zodResolver(Page7FormSchema) as Resolver<Page7FormValues>,
        defaultValues: {
            oeWoAmendmentNeeded: 'false',
            amendments: [],
            oeSignaturePrepared: 'false',
            courierRequestPrepared: 'false',
            ...initialData,
        },
    });

    const {
        fields: amendmentFields,
        append: appendAmendment,
        remove: removeAmendment,
    } = useFieldArray({ control: form.control, name: "amendments" });

    const watchAmendmentNeeded = form.watch("oeWoAmendmentNeeded");

    const handleFormSubmit = async (values: Page7FormValues) => {
        console.log("Page 7 data:", values);
        onSubmit();
    };

    const handleSaveDraft = async () => {
        const values = form.getValues();
        console.log("Save draft:", values);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
                {/* 1. Amendment Decision */}
                <Card>
                    <CardHeader className="border-b bg-muted/10">
                        <CardTitle className="flex items-center gap-2">
                            <FileEdit className="h-5 w-5 text-orange-500" />
                            WO Amendment Decision
                        </CardTitle>
                        <CardDescription>
                            Does this WO require any amendments before acceptance?
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="max-w-xs">
                            <SelectField
                                control={form.control}
                                name="oeWoAmendmentNeeded"
                                label="Amendment Needed?"
                                options={YES_NO_OPTIONS as any}
                                placeholder="Select"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Amendments List (if needed) */}
                {watchAmendmentNeeded === 'true' && (
                    <Card>
                        <CardHeader className="border-b bg-muted/10">
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-orange-500" />
                                Amendment Details
                            </CardTitle>
                            <CardDescription>
                                Specify all required corrections for the Work Order.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            {amendmentFields.map((field, index) => (
                                <div
                                    key={field.id}
                                    className="p-6 border rounded-2xl bg-orange-50/50 space-y-6 relative"
                                >
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-bold text-sm uppercase tracking-wider text-orange-800">Amendment #{index + 1}</h4>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            type="button"
                                            onClick={() => removeAmendment(index)}
                                            className="text-destructive h-8 w-8 hover:bg-red-100"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <div className="grid gap-6 md:grid-cols-2">
                                        <FieldWrapper
                                            control={form.control}
                                            name={`amendments.${index}.pageNo`}
                                            label="Page Number"
                                        >
                                            {(field) => <Input {...field} placeholder="e.g., 12" />}
                                        </FieldWrapper>

                                        <FieldWrapper
                                            control={form.control}
                                            name={`amendments.${index}.clauseNo`}
                                            label="Clause Number"
                                        >
                                            {(field) => <Input {...field} placeholder="e.g., 5.1.a" />}
                                        </FieldWrapper>

                                        <div className="md:col-span-2 space-y-4">
                                            <FieldWrapper
                                                control={form.control}
                                                name={`amendments.${index}.currentStatement`}
                                                label="Current Statement in WO"
                                            >
                                                {(field) => (
                                                    <Textarea
                                                        {...field}
                                                        placeholder="Copy the exact text from the PO/WO..."
                                                        rows={2}
                                                        className="bg-white"
                                                    />
                                                )}
                                            </FieldWrapper>

                                            <FieldWrapper
                                                control={form.control}
                                                name={`amendments.${index}.correctedStatement`}
                                                label="Proposed Corrected Statement"
                                            >
                                                {(field) => (
                                                    <Textarea
                                                        {...field}
                                                        placeholder="How it should read after amendment..."
                                                        rows={2}
                                                        className="bg-white border-green-200 focus:border-green-500"
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
                                onClick={() =>
                                    appendAmendment({
                                        pageNo: "",
                                        clauseNo: "",
                                        currentStatement: "",
                                        correctedStatement: "",
                                    })
                                }
                                className="w-full border-dashed border-2 py-6 hover:bg-orange-50 hover:border-orange-200"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Another Amendment
                            </Button>

                            {form.formState.errors.amendments && (
                                <p className="text-sm text-destructive font-medium">
                                    {form.formState.errors.amendments.message as string}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* 3. Acceptance Actions (if no amendments) */}
                {watchAmendmentNeeded === 'false' && (
                    <Card>
                        <CardHeader className="border-b bg-muted/10">
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                Final Acceptance Checklist
                            </CardTitle>
                            <CardDescription>
                                Complete these steps to finalize Work Order acceptance.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="p-6 border rounded-2xl space-y-4 bg-muted/5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            <Pen className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <h4 className="font-semibold text-sm">Digital Signature</h4>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Apply digital signature of authorized signatory on all pages of the PO/WO PDF.
                                    </p>
                                    <SelectField
                                        control={form.control}
                                        name="oeSignaturePrepared"
                                        label="Signature Applied?"
                                        options={YES_NO_OPTIONS as any}
                                        placeholder="Select"
                                    />
                                </div>

                                <div className="p-6 border rounded-2xl space-y-4 bg-muted/5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-100 rounded-lg">
                                            <Truck className="h-5 w-5 text-purple-600" />
                                        </div>
                                        <h4 className="font-semibold text-sm">Courier Preparation</h4>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Initiate courier request for physical signed copies. Processed after TL approval.
                                    </p>
                                    <SelectField
                                        control={form.control}
                                        name="courierRequestPrepared"
                                        label="Courier Initiated?"
                                        options={YES_NO_OPTIONS as any}
                                        placeholder="Select"
                                    />
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 p-6 rounded-2xl flex gap-4 items-start">
                                <ShieldCheck className="h-6 w-6 text-blue-600 shrink-0 mt-1" />
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-blue-900">Signatory Authorization</p>
                                    <p className="text-sm text-blue-800 leading-relaxed">
                                        Upon submission, an authority letter will be automatically generated authorizing the TL to sign on behalf of the company for this specific project.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Navigation */}
                <WizardNavigation
                    currentPage={7}
                    totalPages={7}
                    canSkip={false}
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
