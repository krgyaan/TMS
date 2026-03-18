import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, FileEdit, CheckCircle2, Pen, Truck, AlertTriangle } from "lucide-react";
import { Page7FormSchema } from "../../helpers/woDetail.schema";
import { WizardNavigation } from "../WizardNavigation";
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
            oeWoAmendmentNeeded: false,
            amendments: [],
            oeSignaturePrepared: false,
            courierRequestPrepared: false,
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
                {/* Amendment Decision */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileEdit className="h-5 w-5 text-orange-500" />
                            WO Amendment
                        </CardTitle>
                        <CardDescription>
                            Does this WO require any amendments before acceptance?
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <FieldWrapper control={form.control} name="oeWoAmendmentNeeded" label="">
                                {(field) => (
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="oeWoAmendmentNeeded"
                                            checked={field.value}
                                            onCheckedChange={(checked) => {
                                                field.onChange(checked);
                                                // Reset signature/courier if amendment needed
                                                if (checked) {
                                                    form.setValue("oeSignaturePrepared", false);
                                                    form.setValue("courierRequestPrepared", false);
                                                }
                                            }}
                                        />
                                        <Label htmlFor="oeWoAmendmentNeeded">WO Amendment Needed</Label>
                                    </div>
                                )}
                            </FieldWrapper>
                        </div>
                    </CardContent>
                </Card>

                {/* Amendments List (if needed) */}
                {watchAmendmentNeeded && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                                Amendment Details
                            </CardTitle>
                            <CardDescription>
                                List all amendments required in the WO
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {amendmentFields.map((field, index) => (
                                <div
                                    key={field.id}
                                    className="p-4 border rounded-lg space-y-4 bg-yellow-50 dark:bg-yellow-950"
                                >
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-medium">Amendment {index + 1}</h4>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            type="button"
                                            onClick={() => removeAmendment(index)}
                                            className="text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <FieldWrapper
                                            control={form.control}
                                            name={`amendments.${index}.pageNo`}
                                            label="Page No."
                                        >
                                            {(field) => <Input {...field} placeholder="e.g., 5" />}
                                        </FieldWrapper>

                                        <FieldWrapper
                                            control={form.control}
                                            name={`amendments.${index}.clauseNo`}
                                            label="Clause No."
                                        >
                                            {(field) => <Input {...field} placeholder="e.g., 3.2.1" />}
                                        </FieldWrapper>

                                        <div className="md:col-span-2">
                                            <FieldWrapper
                                                control={form.control}
                                                name={`amendments.${index}.currentStatement`}
                                                label="Current Statement"
                                            >
                                                {(field) => (
                                                    <Textarea
                                                        {...field}
                                                        placeholder="Current statement in the WO..."
                                                        rows={2}
                                                    />
                                                )}
                                            </FieldWrapper>
                                        </div>

                                        <div className="md:col-span-2">
                                            <FieldWrapper
                                                control={form.control}
                                                name={`amendments.${index}.correctedStatement`}
                                                label="Corrected Statement"
                                            >
                                                {(field) => (
                                                    <Textarea
                                                        {...field}
                                                        placeholder="Proposed corrected statement..."
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
                                onClick={() =>
                                    appendAmendment({
                                        pageNo: "",
                                        clauseNo: "",
                                        currentStatement: "",
                                        correctedStatement: "",
                                    })
                                }
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Amendment
                            </Button>

                            {form.formState.errors.amendments && (
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.amendments.message}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Acceptance Actions (if no amendments) */}
                {!watchAmendmentNeeded && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                WO Acceptance Actions
                            </CardTitle>
                            <CardDescription>
                                Complete the following steps to accept the WO
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Digital Signature */}
                            <div className="p-4 border rounded-lg space-y-4">
                                <div className="flex items-center gap-3">
                                    <Pen className="h-5 w-5 text-blue-500" />
                                    <div className="flex-1">
                                        <h4 className="font-medium">Digital Signature</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Put digital signature of OE on all pages of the PO/WO
                                        </p>
                                    </div>
                                    <FieldWrapper control={form.control} name="oeSignaturePrepared" label="">
                                        {(field) => (
                                            <Checkbox
                                                id="oeSignaturePrepared"
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        )}
                                    </FieldWrapper>
                                </div>
                                {form.formState.errors.oeSignaturePrepared && (
                                    <p className="text-sm text-destructive">
                                        {form.formState.errors.oeSignaturePrepared.message}
                                    </p>
                                )}
                            </div>

                            {/* Courier Request */}
                            <div className="p-4 border rounded-lg space-y-4">
                                <div className="flex items-center gap-3">
                                    <Truck className="h-5 w-5 text-purple-500" />
                                    <div className="flex-1">
                                        <h4 className="font-medium">Courier Request</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Initiate courier request for signed WO copy. The request will be
                                            processed after TL acceptance.
                                        </p>
                                    </div>
                                    <FieldWrapper control={form.control} name="courierRequestPrepared" label="">
                                        {(field) => (
                                            <Checkbox
                                                id="courierRequestPrepared"
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        )}
                                    </FieldWrapper>
                                </div>
                                {form.formState.errors.courierRequestPrepared && (
                                    <p className="text-sm text-destructive">
                                        {form.formState.errors.courierRequestPrepared.message}
                                    </p>
                                )}
                            </div>

                            {/* Info Box */}
                            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                    <strong>Note:</strong> After submission, the TL will review and sign the
                                    WO. An authority letter will be automatically generated authorizing the
                                    TL to sign on behalf of the company.
                                </p>
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
