import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Calculator, Info, Link2 } from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";

import { ConditionalSection } from "@/components/form/ConditionalSection";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { formToApi } from "@/modules/operations/wo-details/helpers/woDetail.mapper";
import { useAutoSave } from "@/hooks/api/useWoDetails";
import { WizardNavigation } from "@/modules/operations/wo-details/components/WizardNavigation";
import { WIZARD_CONFIG, YES_NO_OPTIONS } from "@/modules/operations/wo-details/helpers/constants";
import { Page6FormSchema } from "@/modules/operations/wo-details/helpers/woDetail.schema";

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
    onSaveDraft,
    onSaveDraftOnly,
    onSkip,
    onBack,
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

    const { autoSave, isSaving: isAutoSaving } = useAutoSave(woDetailId, 6, true, 4000, formToApi.page6);

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
                            <Calculator className="h-5 w-5 text-muted-foreground" />
                            Profitability
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div>
                            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                                <Link2 className="h-4 w-4 text-muted-foreground" />
                                Tendering Costing Sheet
                            </h3>
                            <p className="text-xs text-muted-foreground mb-4">Reference the original costing sheet for this project.</p>
                            <div className="max-w-md">
                                <FieldWrapper control={form.control} name="costingSheetLink" label="Costing Sheet URL">
                                    {(field) => <Input {...field} type="url" placeholder="https://docs.google.com/spreadsheets/..." />}
                                </FieldWrapper>
                            </div>
                        </div>

                        <Separator />

                        <div>
                            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                                PO/WO Comparison & Discrepancies
                            </h3>
                            <p className="text-xs text-muted-foreground mb-4">Compare the costing sheet with the received PO/WO.</p>
                            <div className="max-w-xs mb-4">
                                <SelectField
                                    control={form.control}
                                    name="hasDiscrepancies"
                                    label="Discrepancies Found?"
                                    options={YES_NO_OPTIONS}
                                    placeholder="Select"
                                />
                            </div>

                            <ConditionalSection show={watchHasDiscrepancies === "true"}>
                                <FieldWrapper control={form.control} name="discrepancyComments" label="Discrepancy Details">
                                    {(field) => (
                                        <Textarea
                                            {...field}
                                            placeholder="Describe the discrepancies found between costing and PO..."
                                            rows={4}
                                        />
                                    )}
                                </FieldWrapper>
                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertDescription>
                                        TL and TE will be notified of these discrepancies.
                                    </AlertDescription>
                                </Alert>
                            </ConditionalSection>
                        </div>

                        <Separator />

                        <div>
                            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                                <Calculator className="h-4 w-4 text-muted-foreground" />
                                Budget Breakdown (Pre-GST)
                            </h3>
                            <p className="text-xs text-muted-foreground mb-4">
                                {costingSheetBudget
                                    ? `Validated with Pricing Module: ₹${parseFloat(costingSheetBudget).toLocaleString()}`
                                    : "Enter the budget breakdown manually."}
                            </p>

                            <div className="max-w-md mb-6">
                                <FieldWrapper control={form.control} name="budgetPreGst" label="Total Value (Pre-GST)">
                                    {(field) => <Input {...field} placeholder="0.00" type="number" step="0.01" />}
                                </FieldWrapper>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                <FieldWrapper control={form.control} name="budgetSupply" label="Supply Component">
                                    {(field) => <Input {...field} placeholder="0.00" type="number" step="0.01" />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="budgetService" label="Service Component">
                                    {(field) => <Input {...field} placeholder="0.00" type="number" step="0.01" />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="budgetFreight" label="Freight/Logistics">
                                    {(field) => <Input {...field} placeholder="0.00" type="number" step="0.01" />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="budgetAdmin" label="Admin/Misc.">
                                    {(field) => <Input {...field} placeholder="0.00" type="number" step="0.01" />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="budgetBuybackSale" label="Buyback Adjustment">
                                    {(field) => <Input {...field} placeholder="0.00" type="number" step="0.01" />}
                                </FieldWrapper>
                            </div>

                            <div className="p-4 bg-muted/50 rounded-lg border border-dashed flex flex-col md:flex-row justify-between items-center gap-4 mt-6">
                                <div className="space-y-1">
                                    <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                        Calculated Reconciliation
                                    </span>
                                    <p className="text-xs text-muted-foreground">
                                        (Supply + Service + Freight + Admin - Buyback Sale)
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className={`text-2xl font-bold ${totalBudget < 0 ? "text-destructive" : "text-primary"}`}>
                                        ₹{totalBudget.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <WizardNavigation
                    currentPage={6}
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
