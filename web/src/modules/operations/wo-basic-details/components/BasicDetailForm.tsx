import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { type SubmitHandler, useForm, type Resolver } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/form/DateInput";
import { TenderFileUploader } from "@/components/tender-file-upload";
import { ArrowLeft, Save } from "lucide-react";
import { paths } from "@/app/routes/paths";
import { WoBasicDetailFormSchema } from "../helpers/basiDetail.schema";
import type { WoBasicDetailFormValues, WoBasicDetail } from "../helpers/basiDetail.types";
import { buildDefaultValues, mapResponseToForm, mapFormToCreatePayload, mapFormToUpdatePayload } from "../helpers/basiDetail.mapper";
import { useCreateWoBasicDetail, useUpdateWoBasicDetail } from "@/hooks/api/useWoBasicDetails";
import { useTender } from "@/hooks/api/useTenders";
import { useCostingSheetByTender } from "@/hooks/api/useCostingSheets";
import { toast } from "sonner";

interface BasicDetailFormProps {
    mode: "create" | "edit";
    existingData?: WoBasicDetail;
}

export function BasicDetailForm({ mode, existingData }: BasicDetailFormProps) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const urlTenderId = searchParams.get("tenderId");
    const createMutation = useCreateWoBasicDetail();
    const updateMutation = useUpdateWoBasicDetail();

    const initialValues = useMemo(() => {
        if (mode === "edit" && existingData) {
            return mapResponseToForm(existingData);
        }
        const defaults = buildDefaultValues();
        if (mode === "create" && urlTenderId) {
            defaults.tenderId = Number(urlTenderId);
        }
        return defaults;
    }, [mode, existingData, urlTenderId]);

    const form = useForm<WoBasicDetailFormValues>({
        resolver: zodResolver(WoBasicDetailFormSchema) as Resolver<WoBasicDetailFormValues>,
        defaultValues: initialValues,
    });

    const watchTenderId = form.watch("tenderId");
    const watchWoNumber = form.watch("woNumber");
    const watchBudget = form.watch("budgetPreGst");
    const watchReceipt = form.watch("receiptPreGst");

    const tenderId = watchTenderId ? Number(watchTenderId) : null;
    const { data: tenderData } = useTender(tenderId);
    const { data: costingData } = useCostingSheetByTender(tenderId || 0);

    // Auto-fill from Costing Sheet
    useEffect(() => {
        if (mode === "create" && costingData) {
            const c = costingData as any;
            if (c.budget && !form.getValues("budgetPreGst")) {
                form.setValue("budgetPreGst", Number(c.budget));
            }
            if (c.receipt && !form.getValues("receiptPreGst")) {
                form.setValue("receiptPreGst", Number(c.receipt));
            }
            if (c.grossMargin && !form.getValues("grossMargin")) {
                form.setValue("grossMargin", Number(c.grossMargin));
            }
        }
    }, [mode, costingData, form]);

    // Background Project Code/Name Generation
    useEffect(() => {
        if (tenderData) {
            const t = tenderData as any;
            const orgName = t.organizationName || "";
            const itemName = t.itemName || "";
            const locName = t.locationName || "";
            const teamName = t.teamName || "";

            const suffix = watchWoNumber ? String(watchWoNumber).slice(-4) : "";

            const code = `${teamName}/${orgName}/${locName}/${itemName}/${suffix}`.replace(/\/+/g, '/');
            const name = `${orgName} ${locName} ${itemName}`.trim();

            form.setValue("projectCode", code);
            form.setValue("projectName", name);
        }
    }, [tenderData, watchWoNumber, form]);

    // Auto-calculate Margin if manually edited
    useEffect(() => {
        if (watchBudget && watchReceipt) {
            const b = Number(watchBudget);
            const r = Number(watchReceipt);
            if (!isNaN(b) && !isNaN(r) && r !== 0) {
                const margin = ((r - b) / r) * 100;
                form.setValue("grossMargin", Number(margin.toFixed(2)));
            }
        }
    }, [watchBudget, watchReceipt, form]);

    useEffect(() => {
        form.reset(initialValues);
    }, [form, initialValues]);

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    const handleSubmit: SubmitHandler<WoBasicDetailFormValues> = async values => {
        try {
            if (mode === "create") {
                const payload = mapFormToCreatePayload(values);
                await createMutation.mutateAsync(payload);
            } else if (existingData?.id) {
                const payload = mapFormToUpdatePayload(values);
                await updateMutation.mutateAsync({ id: existingData.id, data: payload });
            }
            navigate(paths.operations.woBasicDetailListPage);
        } catch (error: any) {
            toast.error(error?.message || "Failed to save basic detail");
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>
                            {mode === "create" ? "Create" : "Edit"} Basic Details
                        </CardTitle>
                        <CardDescription className="mt-2">
                            {mode === "create"
                                ? "Create a new basic detail entry for WO"
                                : "Update basic detailed information"}
                        </CardDescription>
                    </div>
                    <CardAction>
                        <Button variant="outline" onClick={() => navigate(-1)}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                    </CardAction>
                </div>
            </CardHeader>
            <CardContent>

                {/* Display Section for Auto-generated/Fetched Data */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 p-6 bg-muted/30 rounded-lg border border-border mb-6">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Project Code</p>
                        <p className="text-lg font-mono font-semibold text-primary">
                            {form.watch("projectCode") || "---"}
                        </p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Project Name</p>
                        <p className="text-lg font-semibold text-primary">
                            {form.watch("projectName") || "---"}
                        </p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Gross Margin %age</p>
                        <p className={`text-lg font-bold ${Number(form.watch("grossMargin")) < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                            {form.watch("grossMargin") ? `${form.watch("grossMargin")}%` : "---"}
                        </p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Budget (Pre GST)</p>
                        <p className="text-lg font-semibold">
                            {form.watch("budgetPreGst") ? `₹${Number(form.watch("budgetPreGst")).toLocaleString()}` : "---"}
                        </p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Receipt (Pre GST)</p>
                        <p className="text-lg font-semibold">
                            {form.watch("receiptPreGst") ? `₹${Number(form.watch("receiptPreGst")).toLocaleString()}` : "---"}
                        </p>
                    </div>
                </div>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
                        <div className="grid gap-4 md:grid-cols-3 items-start">
                            <FieldWrapper control={form.control} name="woNumber" label="WO Number">
                                {field => <Input {...field} placeholder="WO Number" type="number" value={field.value || ""} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : 0)} />}
                            </FieldWrapper>

                            <FieldWrapper control={form.control} name="woDate" label="WO Date">
                                {field => (
                                    <DateInput
                                        {...field}
                                        value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value}
                                        onChange={(val) => field.onChange(val ? new Date(val) : null)}
                                    />
                                )}
                            </FieldWrapper>


                            <FieldWrapper control={form.control} name="woValuePreGst" label="WO Value (Pre-GST)">
                                {field => <Input {...field} placeholder="0.00" type="number" step="0.01" value={field.value || ""} />}
                            </FieldWrapper>

                            <FieldWrapper control={form.control} name="woValueGstAmt" label="WO Value (GST Amt.)">
                                {field => <Input {...field} placeholder="0.00" type="number" step="0.01" value={field.value || ""} />}
                            </FieldWrapper>
                        </div>

                        <FieldWrapper control={form.control} name="wo_draft" label="Upload LOA/GEM PO/LOI/Draft WO">
                            {field => (
                                <TenderFileUploader
                                    context="wo-draft"
                                    value={field.value ?? []}
                                    onChange={paths => field.onChange(paths)}
                                    disabled={isSubmitting}
                                />
                            )}
                        </FieldWrapper>

                        <div className="flex justify-end gap-2 pt-6 border-t">
                            <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => form.reset(initialValues)} disabled={isSubmitting}>
                                Reset
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="bg-orange-500 hover:bg-orange-600 text-white">
                                {isSubmitting && <span className="animate-spin mr-2">⏳</span>}
                                <Save className="mr-2 h-4 w-4" />
                                Submit
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

export default BasicDetailForm;
