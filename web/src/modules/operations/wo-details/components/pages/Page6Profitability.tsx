import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Link2, AlertCircle, Calculator } from "lucide-react";
import { Page6FormSchema } from "../../helpers/woDetail.schema";
import { WizardNavigation } from "../WizardNavigation";
import type { Page6FormValues, PageFormProps } from "../../helpers/woDetail.types";

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
            hasDiscrepancies: false,
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
        if (values.hasDiscrepancies) {
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
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Link2 className="h-5 w-5 text-orange-500" />
                            Tendering Costing Sheet
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FieldWrapper
                            control={form.control}
                            name="costingSheetLink"
                            label="Costing Sheet Link"
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
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-orange-500" />
                            PO/WO Comparison
                        </CardTitle>
                        <CardDescription>
                            Compare the costing sheet with the PO/WO. Are there any discrepancies?
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <FieldWrapper control={form.control} name="hasDiscrepancies" label="">
                                {(field) => (
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="hasDiscrepancies"
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                        <Label htmlFor="hasDiscrepancies">Discrepancies Found</Label>
                                    </div>
                                )}
                            </FieldWrapper>
                        </div>

                        {watchHasDiscrepancies && (
                            <div className="mt-4 p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800 space-y-4">
                                <p className="text-sm text-red-800 dark:text-red-200">
                                    Please describe the discrepancies. This will be sent to the TL and the
                                    respective TE.
                                </p>
                                <FieldWrapper
                                    control={form.control}
                                    name="discrepancyComments"
                                    label="Discrepancy Details"
                                >
                                    {(field) => (
                                        <Textarea
                                            {...field}
                                            placeholder="Describe the discrepancies found..."
                                            rows={4}
                                            className="border-red-300 focus:border-red-500"
                                        />
                                    )}
                                </FieldWrapper>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Budget Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calculator className="h-5 w-5 text-orange-500" />
                            Budget Breakdown (Pre-GST)
                        </CardTitle>
                        <CardDescription>
                            {costingSheetBudget
                                ? `Auto-filled from Pricing Module: ₹${parseFloat(
                                    costingSheetBudget
                                ).toLocaleString()}`
                                : "Enter the budget manually if not available from TMS."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FieldWrapper control={form.control} name="budgetPreGst" label="Total Budget (Pre-GST)">
                            {(field) => (
                                <Input
                                    {...field}
                                    placeholder="0.00"
                                    type="number"
                                    step="0.01"
                                    className="text-lg font-semibold"
                                />
                            )}
                        </FieldWrapper>

                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <FieldWrapper control={form.control} name="budgetSupply" label="Supply">
                                {(field) => (
                                    <Input {...field} placeholder="0.00" type="number" step="0.01" />
                                )}
                            </FieldWrapper>

                            <FieldWrapper control={form.control} name="budgetService" label="Service">
                                {(field) => (
                                    <Input {...field} placeholder="0.00" type="number" step="0.01" />
                                )}
                            </FieldWrapper>

                            <FieldWrapper control={form.control} name="budgetFreight" label="Freight">
                                {(field) => (
                                    <Input {...field} placeholder="0.00" type="number" step="0.01" />
                                )}
                            </FieldWrapper>

                            <FieldWrapper control={form.control} name="budgetAdmin" label="Admin">
                                {(field) => (
                                    <Input {...field} placeholder="0.00" type="number" step="0.01" />
                                )}
                            </FieldWrapper>

                            <FieldWrapper control={form.control} name="budgetBuybackSale" label="Buyback Sale">
                                {(field) => (
                                    <Input {...field} placeholder="0.00" type="number" step="0.01" />
                                )}
                            </FieldWrapper>
                        </div>

                        {/* Total Display */}
                        <div className="p-4 bg-muted rounded-lg border">
                            <div className="flex justify-between items-center">
                                <span className="font-medium">Calculated Total:</span>
                                <span
                                    className={`text-xl font-bold ${totalBudget < 0 ? "text-destructive" : "text-green-600"
                                        }`}
                                >
                                    ₹{totalBudget.toLocaleString()}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                (Supply + Service + Freight + Admin - Buyback Sale)
                            </p>
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
