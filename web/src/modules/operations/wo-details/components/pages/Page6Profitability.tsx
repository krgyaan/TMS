import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Link2, AlertCircle, Calculator } from "lucide-react";

import { Page6FormSchema } from "@/modules/operations/wo-details/helpers/woDetail.schema";
import { WizardNavigation } from "@/modules/operations/wo-details/components/WizardNavigation";
import { YES_NO_OPTIONS, WIZARD_CONFIG } from "@/modules/operations/wo-details/helpers/constants";
import { SelectField } from "@/components/form/SelectField";
import { useAutoSave } from "@/hooks/api/useWoDetails";

import type { Page6FormValues, PageFormProps } from "@/modules/operations/wo-details/helpers/woDetail.types";

interface Page6ProfitabilityProps extends PageFormProps {
    initialData?: Partial<Page6FormValues>;
    costingSheetBudget?: string;
}

const defaultValues: Page6FormValues = {
    costingSheetLink: "",
    hasDiscrepancies: "false",
    discrepancyComments: "",
    budgetPreGst: "",
    budgetSupply: "",
    budgetService: "",
    budgetFreight: "",
    budgetAdmin: "",
    budgetBuybackSale: "",
};

export function Page6Profitability({
    woDetailId,
    initialData,
    costingSheetBudget,
    onSubmit,
    onSkip,
    onBack,
    onSaveDraft,
    isLoading,
    isSaving,
}: Page6ProfitabilityProps) {
    const form = useForm<Page6FormValues>({
        resolver: zodResolver(Page6FormSchema),
        defaultValues: {
            ...defaultValues,
            budgetPreGst: costingSheetBudget || "",
            ...initialData,
        },
    });

    const { autoSave, isSaving: isAutoSaving } = useAutoSave(woDetailId, 6);

    const watchHasDiscrepancies = form.watch("hasDiscrepancies");
    const watchBudgetSupply = form.watch("budgetSupply");
    const watchBudgetService = form.watch("budgetService");
    const watchBudgetFreight = form.watch("budgetFreight");
    const watchBudgetAdmin = form.watch("budgetAdmin");
    const watchBudgetBuybackSale = form.watch("budgetBuybackSale");

    const totalBudget = useMemo(() => {
        return (
            (parseFloat(watchBudgetSupply || "0") || 0) +
            (parseFloat(watchBudgetService || "0") || 0) +
            (parseFloat(watchBudgetFreight || "0") || 0) +
            (parseFloat(watchBudgetAdmin || "0") || 0) -
            (parseFloat(watchBudgetBuybackSale || "0") || 0)
        );
    }, [watchBudgetSupply, watchBudgetService, watchBudgetFreight, watchBudgetAdmin, watchBudgetBuybackSale]);

    useEffect(() => {
        const subscription = form.watch((values) => {
            if (values) autoSave(values);
        });
        return () => subscription.unsubscribe();
    }, [form, autoSave]);

    useEffect(() => {
        if (initialData) {
            form.reset({
                ...defaultValues,
                budgetPreGst: costingSheetBudget || "",
                ...initialData,
            });
        }
    }, [initialData, costingSheetBudget, form]);

    const handleFormSubmit = async (values: Page6FormValues) => {
        await onSubmit(values);
    };

    const handleSaveDraft = async () => {
        await onSaveDraft(form.getValues());
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
                        <FormField
                            control={form.control}
                            name="costingSheetLink"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Costing Sheet URL</FormLabel>
                                    <FormControl>
                                        <Input {...field} type="url" placeholder="https://docs.google.com/spreadsheets/..." />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                {/* Discrepancy Check */}
                <Card>
                    <CardHeader className="border-b bg-muted/10">
                        <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-orange-500" />
                            PO/WO Comparison & Discrepancies
                        </CardTitle>
                        <CardDescription>Compare the costing sheet with the received PO/WO.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="max-w-xs">
                            <SelectField
                                control={form.control}
                                name="hasDiscrepancies"
                                label="Discrepancies Found?"
                                options={YES_NO_OPTIONS}
                                placeholder="Select"
                            />
                        </div>

                        {watchHasDiscrepancies === "true" && (
                            <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="discrepancyComments"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Discrepancy Details</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    {...field}
                                                    placeholder="Describe the discrepancies found between costing and PO..."
                                                    rows={4}
                                                    className="bg-white"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex items-center gap-2 text-red-800">
                                    <AlertCircle className="h-5 w-5 text-red-500" />
                                    <p className="text-sm font-semibold">TL and TE will be notified of these discrepancies.</p>
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
                                ? `Validated with Pricing Module: ₹${parseFloat(costingSheetBudget).toLocaleString()}`
                                : "Enter the budget breakdown manually."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-8">
                        <div className="max-w-md">
                            <FormField
                                control={form.control}
                                name="budgetPreGst"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Total Value (Pre-GST)</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="0.00" type="number" step="0.01" className="text-xl font-bold h-12" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            <FormField
                                control={form.control}
                                name="budgetSupply"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Supply Component</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="0.00" type="number" step="0.01" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="budgetService"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Service Component</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="0.00" type="number" step="0.01" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="budgetFreight"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Freight/Logistics</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="0.00" type="number" step="0.01" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="budgetAdmin"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Admin/Misc.</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="0.00" type="number" step="0.01" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="budgetBuybackSale"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Buyback Adjustment</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="0.00" type="number" step="0.01" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="p-6 bg-muted/50 rounded-2xl border border-dashed flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="space-y-1">
                                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                    Calculated Reconciliation
                                </span>
                                <p className="text-xs text-muted-foreground">
                                    (Supply + Service + Freight + Admin - Buyback Sale)
                                </p>
                            </div>
                            <div className="text-right">
                                <span className={`text-3xl font-black ${totalBudget < 0 ? "text-destructive" : "text-primary"}`}>
                                    ₹{totalBudget.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <WizardNavigation
                    currentPage={6}
                    totalPages={WIZARD_CONFIG.TOTAL_PAGES}
                    canSkip={true}
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
