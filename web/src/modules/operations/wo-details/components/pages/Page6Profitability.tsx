import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/form/SelectField";
import { Link2, AlertCircle, Calculator } from "lucide-react";
import { Page6FormSchema } from "@/modules/operations/wo-details/helpers/woDetail.schema";
import { WizardNavigation } from "@/modules/operations/wo-details/components/WizardNavigation";
import { YES_NO_OPTIONS } from "@/modules/operations/wo-details/helpers/constants";
import type { Page6FormValues, PageFormProps } from "@/modules/operations/wo-details/helpers/woDetail.types";

interface Page6ProfitabilityProps extends PageFormProps {
    initialData?: Partial<Page6FormValues>;
    costingSheetBudget?: string; // From pricing module
}

export function Page6Profitability({
    initialData,
    costingSheetBudget,
    onSubmit,
    onSkip,
    onBack,
    isLoading,
}: Page6ProfitabilityProps) {
    const form = useForm<Page6FormValues>({
        resolver: zodResolver(Page6FormSchema) as Resolver<Page6FormValues>,
        defaultValues: {
            costingSheetLink: "",
            hasDiscrepancies: 'false',
            discrepancyComments: "",
            budgetPreGst: costingSheetBudget || "",
            budgetSupply: "",
            budgetService: "",
            budgetFreight: "",
            budgetAdmin: "",
            budgetBuybackSale: "",
            ...initialData,
        },
    });

    const watchHasDiscrepancies = form.watch("hasDiscrepancies");
    const watchBudgetSupply = form.watch("budgetSupply");
    const watchBudgetService = form.watch("budgetService");
    const watchBudgetFreight = form.watch("budgetFreight");
    const watchBudgetAdmin = form.watch("budgetAdmin");
    const watchBudgetBuybackSale = form.watch("budgetBuybackSale");

    // Calculate total budget
    const totalBudget =
        (parseFloat(watchBudgetSupply || "0") || 0) +
        (parseFloat(watchBudgetService || "0") || 0) +
        (parseFloat(watchBudgetFreight || "0") || 0) +
        (parseFloat(watchBudgetAdmin || "0") || 0) -
        (parseFloat(watchBudgetBuybackSale || "0") || 0);

    const handleFormSubmit = async (values: Page6FormValues) => {
        // If discrepancies exist, notify TL and TE
        if (values.hasDiscrepancies === 'true') {
            // TODO: Trigger email notification
            console.log("Discrepancy notification to TL and TE:", values.discrepancyComments);
        }

        console.log("Page 6 data:", values);
        onSubmit();
    };

    const handleSaveDraft = async () => {
        const values = form.getValues();
        console.log("Save draft:", values);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
                {/* Costing Sheet Link */}
                <Card>
                    <CardHeader className="border-b bg-muted/10">
                        <CardTitle className="flex items-center gap-2">
                            <Link2 className="h-5 w-5 text-orange-500" />
                            Tendering Costing Sheet
                        </CardTitle>
                        <CardDescription>Reference the original costing sheet for this project.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <FieldWrapper
                            control={form.control}
                            name="costingSheetLink"
                            label="Costing Sheet URL"
                        >
                            {(field) => (
                                <Input
                                    {...field}
                                    type="url"
                                    placeholder="https://docs.google.com/spreadsheets/..."
                                />
                            )}
                        </FieldWrapper>
                    </CardContent>
                </Card>

                {/* Discrepancy Check */}
                <Card>
                    <CardHeader className="border-b bg-muted/10">
                        <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-orange-500" />
                            PO/WO Comparison & Discrepancies
                        </CardTitle>
                        <CardDescription>
                            Compare the costing sheet with the received PO/WO.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="max-w-xs">
                            <SelectField
                                control={form.control}
                                name="hasDiscrepancies"
                                label="Discrepancies Found?"
                                options={YES_NO_OPTIONS as any}
                                placeholder="Select"
                            />
                        </div>

                        {watchHasDiscrepancies === 'true' && (
                            <div className="space-y-4">
                                <FieldWrapper
                                    control={form.control}
                                    name="discrepancyComments"
                                    label="Discrepancy Details"
                                >
                                    {(field) => (
                                        <Textarea
                                            {...field}
                                            placeholder="Describe the discrepancies found between costing and PO..."
                                            rows={4}
                                            className="bg-white"
                                        />
                                    )}
                                </FieldWrapper>
                                <div className="flex items-center gap-2 text-red-800">
                                    <AlertCircle className="h-5 w-5 text-red-500" />
                                    <p className="text-sm font-semibold">
                                        Please describe the discrepancies. TL and TE will be notified.
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Budget Breakdown */}
                <Card>
                    <CardHeader className="border-b bg-muted/10">
                        <CardTitle className="flex items-center gap-2">
                            <Calculator className="h-5 w-5 text-orange-500" />
                            Budget Breakdown (Pre-GST)
                        </CardTitle>
                        <CardDescription>
                            {costingSheetBudget
                                ? `Validated with Pricing Module: ₹${parseFloat(
                                    costingSheetBudget
                                ).toLocaleString()}`
                                : "Enter the budget breakdown manually."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-8">
                        <div className="max-w-md">
                            <FieldWrapper control={form.control} name="budgetPreGst" label="Total Value (Pre-GST)">
                                {(field) => (
                                    <Input
                                        {...field}
                                        placeholder="0.00"
                                        type="number"
                                        step="0.01"
                                        className="text-xl font-bold h-12"
                                    />
                                )}
                            </FieldWrapper>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            <FieldWrapper control={form.control} name="budgetSupply" label="Supply Component">
                                {(field) => (
                                    <Input {...field} placeholder="0.00" type="number" step="0.01" />
                                )}
                            </FieldWrapper>

                            <FieldWrapper control={form.control} name="budgetService" label="Service Component">
                                {(field) => (
                                    <Input {...field} placeholder="0.00" type="number" step="0.01" />
                                )}
                            </FieldWrapper>

                            <FieldWrapper control={form.control} name="budgetFreight" label="Freight/Logistics">
                                {(field) => (
                                    <Input {...field} placeholder="0.00" type="number" step="0.01" />
                                )}
                            </FieldWrapper>

                            <FieldWrapper control={form.control} name="budgetAdmin" label="Admin/Misc.">
                                {(field) => (
                                    <Input {...field} placeholder="0.00" type="number" step="0.01" />
                                )}
                            </FieldWrapper>

                            <FieldWrapper control={form.control} name="budgetBuybackSale" label="Buyback Adjustment">
                                {(field) => (
                                    <Input {...field} placeholder="0.00" type="number" step="0.01" />
                                )}
                            </FieldWrapper>
                        </div>

                        <div className="p-6 bg-muted/50 rounded-2xl border border-dashed flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="space-y-1">
                                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Calculated Reconciliation</span>
                                <p className="text-xs text-muted-foreground">
                                    (Supply + Service + Freight + Admin - Buyback Sale)
                                </p>
                            </div>
                            <div className="text-right">
                                <span
                                    className={`text-3xl font-black ${totalBudget < 0 ? "text-destructive" : "text-primary"
                                        }`}
                                >
                                    ₹{totalBudget.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Navigation */}
                <WizardNavigation
                    currentPage={6}
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
