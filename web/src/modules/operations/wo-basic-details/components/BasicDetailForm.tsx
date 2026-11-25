import { paths } from "@/app/routes/paths";
import { FileUploader } from "@/components/file-upload";
import { DateInput } from "@/components/form/DateInput";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useCreateWoBasicDetail, useUpdateWoBasicDetail, useWoBasicDetailPrefill, useWoBasicDetailsByTender } from "@/hooks/api/useWoBasicDetails";
import { useCreateBulkWoContacts, useDeleteAllContactsByBasicDetail, useWoContactsByBasicDetail } from "@/hooks/api/useWoContacts";
import { useItemOptions, useLocationOptions, useOrganizationOptions, useTeamOptions } from "@/hooks/useSelectOptions";
import { formatINR } from "@/hooks/useINRFormatter";
import type { CreateWoBasicDetailDto } from "@/modules/operations/types/wo.types";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Calculator, Check, Info, Plus, Save, SkipForward, Trash2, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, type Resolver, type SubmitHandler } from "react-hook-form";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { YES_NO_OPTIONS } from "../../wo-details/helpers/constants";
import { buildDefaultValues, mapFormToCreatePayload, mapFormToUpdatePayload, mapResponseToForm } from "../helpers/basiDetail.mapper";
import { computeGemChargesBreakdown, GEM_GST_RATE, GEM_TDS_RATE } from "../helpers/gemCharges";
import { WoBasicDetailFormSchema } from "../helpers/basiDetail.schema";
import type { WoBasicDetail, WoBasicDetailFormValues } from "../helpers/basiDetail.types";

interface BasicDetailFormProps {
    mode: "create" | "edit";
    existingData?: WoBasicDetail;
}

const teamArray = [
    { id: 1, name: "AC" },
    { id: 2, name: "DC" },
];

export function BasicDetailForm({ mode, existingData }: BasicDetailFormProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const urlTenderId = searchParams.get("tenderId");
    // Edit routes do not carry ?tenderId, so the tender reference must come
    // from the loaded record. Without this, every edit was treated as a
    // non-tender WO and exposed Team/Org/Item/Location fields.
    const existingTenderId = mode === "edit" ? existingData?.tenderId ?? null : null;
    const isNonTender = mode === "edit" ? !existingTenderId : !urlTenderId;
    const effectiveTenderId = mode === "edit"
        ? existingTenderId
        : urlTenderId ? Number(urlTenderId) : null;
    const returnTo = (location.state as { from?: string } | null)?.from;
    const createMutation = useCreateWoBasicDetail();
    const updateMutation = useUpdateWoBasicDetail();

    const teamOptions = useTeamOptions([1, 2]);
    const organizationOptions = useOrganizationOptions();
    const itemOptions = useItemOptions();
    const locationOptions = useLocationOptions();

    const initialValues = useMemo(() => {
        if (mode === "edit" && existingData) {
            return mapResponseToForm(existingData);
        }
        const defaults = buildDefaultValues();
        if (mode === "create" && !isNonTender && effectiveTenderId) {
            defaults.tenderId = effectiveTenderId;
        }
        return defaults;
    }, [mode, existingData, isNonTender, effectiveTenderId]);

    const form = useForm<WoBasicDetailFormValues>({
        resolver: zodResolver(WoBasicDetailFormSchema) as Resolver<WoBasicDetailFormValues>,
        defaultValues: initialValues,
    });

    const [currentStep, setCurrentStep] = useState<1 | 2>(1);
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [showChecklist, setShowChecklist] = useState(false);
    const [showContacts, setShowContacts] = useState(false);

    const watchTenderId = form.watch("tenderId");
    const watchWoNumber = form.watch("woNumber");
    const watchWoDate = form.watch("woDate");
    const watchBudget = form.watch("budgetPreGst");
    const watchReceipt = form.watch("receiptPreGst");
    const watchOrderType = form.watch("orderType");
    const watchPoReceivedStatus = form.watch("poReceivedStatus");

    const { data: existingOrders = [] } = useWoBasicDetailsByTender(
        mode === "create" && !isNonTender ? effectiveTenderId ?? 0 : 0,
    );
    const hasExistingOrders =
        mode === "create" && !isNonTender && existingOrders.length > 0;
    const nextOrderSequence =
        existingOrders.reduce((max, order) => Math.max(max, order.orderSequence ?? 0), 0) + 1;

    useEffect(() => {
        if (hasExistingOrders && form.getValues("orderType") === "single") {
            form.setValue("orderType", "repeat", { shouldValidate: true });
        }
    }, [hasExistingOrders, form]);

    const watchPaymentConsent = form.watch("requestGemCharges");
    const watchGemChargesAmount = form.watch("gemChargesAmount");
    const watchBudgetSupply = form.watch("budgetSupply");
    const watchBudgetService = form.watch("budgetService");
    const watchBudgetFreight = form.watch("budgetFreight");
    const watchBudgetAdmin = form.watch("budgetAdmin");
    const watchBudgetBuybackSale = form.watch("budgetBuybackSale");
    const gemChargesBreakdown = useMemo(
        () => computeGemChargesBreakdown(watchGemChargesAmount),
        [watchGemChargesAmount],
    );

    const tenderId = watchTenderId ? Number(watchTenderId) : null;
    const { data: prefillData } = useWoBasicDetailPrefill(isNonTender ? null : tenderId);

    // Auto-fill from Costing Sheet
    useEffect(() => {
        if (mode === "create" && !isNonTender && prefillData) {
            if (prefillData.budgetPrice && !form.getValues("budgetPreGst")) {
                form.setValue("budgetPreGst", Number(prefillData.budgetPrice));
            }
            if (prefillData.receiptPrice && !form.getValues("receiptPreGst")) {
                form.setValue("receiptPreGst", Number(prefillData.receiptPrice));
            }
            if (prefillData.grossMargin && !form.getValues("grossMargin")) {
                form.setValue("grossMargin", Number(prefillData.grossMargin));
            }
            if (prefillData.finalPrice && !form.getValues("finalPrice")) {
                form.setValue("finalPrice", Number(prefillData.finalPrice));
            }
        }
    }, [mode, isNonTender, prefillData, form]);

    useEffect(() => {
        if (!isNonTender && prefillData) {
            form.setValue("gemChargesRequired", prefillData.isGemTender);
        }
    }, [isNonTender, prefillData, form]);
    useEffect(() => {
        if (watchPoReceivedStatus && watchPoReceivedStatus !== "received" && form.getValues("sapPoUpload").length > 0) {
            form.setValue("sapPoUpload", [], { shouldValidate: true });
        }
    }, [watchPoReceivedStatus, form]);

    // Background Project Code/Name Generation
    const getFinancialYear = (date: Date): string => {
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        const fy = month >= 4 ? year : year - 1;
        const fyShort = fy.toString().slice(-2);
        const nextShort = (parseInt(fyShort, 10) + 1).toString().padStart(2, "0");
        return `${fyShort}${nextShort}`;
    };

    // Non-tender: watch manual select values for project code derivation
    const watchTeamId = form.watch("teamId");
    const watchOrganizationId = form.watch("organizationId");
    const watchItemId = form.watch("itemId");
    const watchLocationId = form.watch("locationId");

    const { projectCode: derivedCode, projectName: derivedName } = useMemo(() => {
        const orderType = watchOrderType ?? "single";
        const sequence = hasExistingOrders ? nextOrderSequence : 1;
        const orderSuffix =
            orderType === "repeat" ? `R${sequence}` :
            orderType === "multiple" ? `P${sequence}` : "";
        const woSuffix = watchWoNumber ? String(watchWoNumber).slice(-4) : "";
        const yearSegment = watchWoDate ? getFinancialYear(watchWoDate instanceof Date ? watchWoDate : new Date(watchWoDate)) : "";

        if (!isNonTender) {
            if (!prefillData) return { projectCode: "", projectName: "" };
            const teamName = teamArray.find((team) => team.id === prefillData.team)?.name || "";
            const orgName = prefillData.organizationAcronym || "";
            const itemName = prefillData.itemName || "";
            const locName = prefillData.locationName || "";
            const hasAllCore = !!teamName && !!orgName && !!itemName && !!locName && !!yearSegment && !!woSuffix;
            if (!hasAllCore) return { projectCode: "", projectName: "" };
            const baseCode = `${teamName}/${yearSegment}/${orgName}/${locName}/${itemName}/${woSuffix}`;
            const baseName = `${orgName} ${locName} ${itemName}`.trim();
            return {
                projectCode: orderSuffix ? `${baseCode}/${orderSuffix}` : baseCode,
                projectName: orderSuffix ? `${baseName} ${orderSuffix}` : baseName,
            };
        }

        const teamName = teamOptions.find(t => Number(t.id) === Number(watchTeamId))?.name || "";
        const orgName = organizationOptions.find(o => Number(o.id) === Number(watchOrganizationId))?.name || "";
        const itemName = itemOptions.find(i => Number(i.id) === Number(watchItemId))?.name || "";
        const locName = locationOptions.find(l => Number(l.id) === Number(watchLocationId))?.name || "";
        const hasAllCore = !!teamName && !!orgName && !!itemName && !!locName && !!yearSegment && !!woSuffix;
        if (!hasAllCore) return { projectCode: "", projectName: "" };
        const baseCode = `${teamName}/${yearSegment}/${orgName}/${locName}/${itemName}/${woSuffix}`;
        const baseName = `${orgName} ${locName} ${itemName}`.trim();
        return {
            projectCode: orderSuffix ? `${baseCode}/${orderSuffix}` : baseCode,
            projectName: orderSuffix ? `${baseName} ${orderSuffix}` : baseName,
        };
    }, [isNonTender, prefillData, watchWoNumber, watchWoDate, watchTeamId, watchOrganizationId, watchItemId, watchLocationId, teamOptions, organizationOptions, itemOptions, locationOptions, watchOrderType, hasExistingOrders, nextOrderSequence]);

    useEffect(() => {
        // Only auto-derive project identifiers for new records; edits keep the
        // stored code/name so historical values are not silently rewritten.
        if (mode !== "create") return;
        if (derivedCode) form.setValue("projectCode", derivedCode);
        if (derivedName) form.setValue("projectName", derivedName);
    }, [mode, derivedCode, derivedName, form]);

    // Auto-calculate Margin if manually edited
    useEffect(() => {
        if (watchReceipt && watchBudget) {
            const b = Number(watchBudget);
            const r = Number(watchReceipt);
            if (!isNaN(b) && !isNaN(r) && r !== 0) {
                const margin = ((r - b) / r) * 100;
                form.setValue("grossMargin", Number(margin.toFixed(2)));
            }
        }
    }, [watchBudget, watchReceipt, form]);

    const tenderClients = prefillData?.clients || [];

    // WO Contacts (if in edit mode)
    const { data: woContactsData } = useWoContactsByBasicDetail(existingData?.id || 0);
    const bulkCreateContacts = useCreateBulkWoContacts();
    const deleteAllContacts = useDeleteAllContactsByBasicDetail();

    const tmsDocList = [
        "Complete Tender Documents",
        "Tender Info",
        "EMD Information",
        "Physical documents submission",
        "RFQ and Quotation",
        "Document Checklist",
        "Costing Sheet",
        "TQ",
        "RA and Result details",
        "Corrigendum"
    ];

    useEffect(() => {
        form.reset(initialValues);
    }, [form, initialValues]);

    const [contacts, setContacts] = useState<any[]>([]);

    useEffect(() => {
        if (mode === "create" && !isNonTender && tenderClients.length > 0 && contacts.length === 0) {
            setContacts(tenderClients.map((c: any) => ({
                name: c.clientName,
                designation: c.clientDesignation,
                phone: c.clientMobile,
                email: c.clientEmail,
                organization: "",
                departments: "",
            })));
        }
    }, [mode, isNonTender, tenderClients, contacts.length]);

    useEffect(() => {
        if (mode === "edit" && woContactsData && Array.isArray(woContactsData)) {
            setContacts(woContactsData);
        }
    }, [mode, woContactsData]);

    const handleUpdateContact = (idx: number, field: string, value: string) => {
        const newContacts = [...contacts];
        newContacts[idx] = { ...newContacts[idx], [field]: value };
        setContacts(newContacts);
    };

    const handleAddContact = () => {
        setContacts([...contacts, { name: "", designation: "", phone: "", email: "", organization: "", departments: "" }]);
    };

    const handleRemoveContact = (idx: number) => {
        setContacts(contacts.filter((_, i) => i !== idx));
    };

    const isSubmitting =
        createMutation.isPending ||
        updateMutation.isPending ||
        bulkCreateContacts.isPending ||
        deleteAllContacts.isPending;

    const handleSubmit: SubmitHandler<WoBasicDetailFormValues> = async values => {
        if (isNonTender && !values.teamId) {
            form.setError("teamId", { message: "Team is required" });
            return;
        }
        try {
            if (mode === "create") {
                const payload = mapFormToCreatePayload(values) as Record<string, unknown>;
                if (isNonTender) {
                    payload.teamId = values.teamId;
                    if (values.organizationId != null) payload.organizationId = values.organizationId;
                    if (values.itemId != null) payload.itemId = values.itemId;
                    if (values.locationId != null) payload.locationId = values.locationId;
                }
                const result = await createMutation.mutateAsync(payload as CreateWoBasicDetailDto);

                if (contacts.length > 0) {
                    await bulkCreateContacts.mutateAsync({
                        woBasicDetailId: result.id,
                        contacts: contacts.map(c => ({
                            name: c.name,
                            designation: c.designation || undefined,
                            phone: c.phone || undefined,
                            email: c.email || undefined,
                            organization: c.organization || undefined,
                            departments: c.departments || undefined,
                        }))
                    });
                }
            } else if (existingData?.id) {
                const payload = mapFormToUpdatePayload(values);
                await updateMutation.mutateAsync({ id: existingData.id, data: payload });

                await deleteAllContacts.mutateAsync(existingData.id);
                if (contacts.length > 0) {
                    await bulkCreateContacts.mutateAsync({
                        woBasicDetailId: existingData.id,
                        contacts: contacts.map(c => ({
                            name: c.name,
                            designation: c.designation || undefined,
                            phone: c.phone || undefined,
                            email: c.email || undefined,
                            organization: c.organization || undefined,
                            departments: c.departments || undefined,
                        }))
                    });
                }
            }

            navigate(returnTo || paths.operations.woBasicDetailListPage);
        } catch (error: any) {
            toast.error(error?.message || "Failed to save basic detail");
        }
    };

    const breakdownTotal = useMemo(() => {
        const s = Number(watchBudgetSupply || 0);
        const sv = Number(watchBudgetService || 0);
        const f = Number(watchBudgetFreight || 0);
        const a = Number(watchBudgetAdmin || 0);
        const b = Number(watchBudgetBuybackSale || 0);
        const g = Number(watchGemChargesAmount || 0);
        return s + sv + f + a + g - b;
    }, [watchBudgetSupply, watchBudgetService, watchBudgetFreight, watchBudgetAdmin, watchBudgetBuybackSale, watchGemChargesAmount]);

    const hasBreakdownValues = useMemo(() => {
        return [watchBudgetSupply, watchBudgetService, watchBudgetFreight, watchBudgetAdmin, watchBudgetBuybackSale]
            .some(value => Number(value || 0) > 0);
    }, [watchBudgetSupply, watchBudgetService, watchBudgetFreight, watchBudgetAdmin, watchBudgetBuybackSale]);

    useEffect(() => {
        if (showBreakdown && hasBreakdownValues) {
            form.setValue("budgetPreGst", Number(breakdownTotal.toFixed(2)), { shouldDirty: true });
        }
    }, [showBreakdown, hasBreakdownValues, breakdownTotal, form]);

    const step1Fields = useMemo<Array<keyof WoBasicDetailFormValues>>(() => {
        const fields: Array<keyof WoBasicDetailFormValues> = [
            "woNumber",
            "woDate",
            "woValuePreGst",
            "woValueGstAmt",
            "woDraft",
        ];
        if (isNonTender) {
            fields.push("teamId", "organizationId", "itemId", "locationId");
        }
        return fields;
    }, [isNonTender]);

    const goToStep = async (step: 1 | 2, skipValidation = false) => {
        if (step === 2 && !skipValidation) {
            const valid = await form.trigger(step1Fields, { shouldFocus: true });
            if (!valid) return;
        }
        setCurrentStep(step);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleInvalidSubmit = () => {
        const hasStep1Error = step1Fields.some(field =>
            Boolean((form.formState.errors as Record<string, unknown>)[field as string]),
        );
        if (hasStep1Error) setCurrentStep(1);
    };

    const submitForm = form.handleSubmit(handleSubmit, handleInvalidSubmit);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>
                            {mode === "create"
                                ? isNonTender ? "Create Non-Tender Basic Details" : "Create Basic Details"
                                : "Edit Basic Details"}
                        </CardTitle>
                        <CardDescription className="mt-2">
                            {mode === "create"
                                ? isNonTender
                                    ? "Create a new direct work order basic detail entry (no tender reference)"
                                    : "Create a new basic detail entry for WO"
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
                <div className="mb-6 grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => goToStep(1, true)}
                        className={`rounded-lg border p-3 text-left transition-colors ${currentStep === 1 ? "border-primary bg-primary/5" : "border-border bg-muted/30"}`}
                    >
                        <span className="block text-xs text-muted-foreground">Step 1</span>
                        <span className="text-sm font-semibold">Order & Document</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => goToStep(2, true)}
                        className={`rounded-lg border p-3 text-left transition-colors ${currentStep === 2 ? "border-primary bg-primary/5" : "border-border bg-muted/30"}`}
                    >
                        <span className="block text-xs text-muted-foreground">Step 2</span>
                        <span className="text-sm font-semibold">Costs & Review</span>
                    </button>
                </div>
                <Form {...form}>
                    <form onSubmit={submitForm} className="space-y-8">
                        {currentStep === 1 && (
                        <>
                        {/* Non-tender: Team/Org/Item/Location selects */}
                        {isNonTender && (
                            <>
                                <div>
                                    <h3 className="text-lg font-semibold mb-4">Team & Client Details</h3>
                                    <div className="grid gap-4 grid-cols-1 md:grid-cols-3 lg:grid-cols-4 items-start">
                                        <SelectField
                                            control={form.control}
                                            name="teamId"
                                            label="Team"
                                            options={teamOptions}
                                            placeholder="Select Team"
                                        />
                                        <SelectField
                                            control={form.control}
                                            name="organizationId"
                                            label="Organization"
                                            options={organizationOptions}
                                            placeholder="Select Organization"
                                        />
                                        <SelectField
                                            control={form.control}
                                            name="itemId"
                                            label="Item"
                                            options={itemOptions}
                                            placeholder="Select Item"
                                        />
                                        <SelectField
                                            control={form.control}
                                            name="locationId"
                                            label="Location"
                                            options={locationOptions}
                                            placeholder="Select Location"
                                        />
                                    </div>
                                </div>
                                <Separator />
                            </>
                        )}

                        {/* WO Basic Info */}
                        <div className="grid gap-4 grid-cols-1 md:grid-cols-3 lg:grid-cols-4 items-start">
                            {/* Order Type: only eligible when linked to a tender */}
                            {!isNonTender && (
                                <div className="space-y-1">
                                    <SelectField
                                        control={form.control}
                                        name="orderType"
                                        label="Order Type"
                                        options={
                                            hasExistingOrders
                                                ? [
                                                    { value: "repeat", label: `Repeat (R${nextOrderSequence})` },
                                                    { value: "multiple", label: `Multiple — separate (P${nextOrderSequence})` },
                                                ]
                                                : [
                                                    { value: "single", label: "Single" },
                                                    { value: "repeat", label: "Repeat (R1)" },
                                                    { value: "multiple", label: "Multiple — separate (P1)" },
                                                ]
                                        }
                                        placeholder={hasExistingOrders ? "Select type" : "Single"}
                                        disabled={mode === "edit"}
                                    />
                                    <p className="px-1 text-xs text-muted-foreground">
                                        {hasExistingOrders
                                            ? `This tender already has ${existingOrders.length} order(s). New order: #${nextOrderSequence}.`
                                            : "Choose how this won tender will be tracked."}
                                    </p>
                                </div>
                            )}

                            <SelectField
                                control={form.control}
                                name="orderNature"
                                label="Order Nature *"
                                options={[
                                    { value: "supply", label: "Supply" },
                                    { value: "service", label: "Service" },
                                    { value: "sitc", label: "SITC" },
                                ]}
                                placeholder="Select order nature"
                            />

                            <SelectField
                                control={form.control}
                                name="poReceivedStatus"
                                label="PO Received *"
                                options={[
                                    { value: "received", label: "Received" },
                                    { value: "not_received", label: "Not Received" },
                                    { value: "not_applicable", label: "Not Applicable" },
                                ]}
                                placeholder="Select PO status"
                            />

                            {watchPoReceivedStatus === "received" && (
                                <FieldWrapper control={form.control} name="sapPoUpload" label="Upload SAP PO *">
                                    {field => (
                                        <FileUploader
                                            context="sap-po"
                                            value={field.value ?? []}
                                            onChange={paths => field.onChange(paths)}
                                            disabled={isSubmitting}
                                        />
                                    )}
                                </FieldWrapper>
                            )}

                            <FieldWrapper control={form.control} name="woNumber" label="WO Number">
                                {field => <Input {...field} placeholder="WO Number" value={field.value || ""} onChange={e => field.onChange(e.target.value)} />}
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

                            <FieldWrapper control={form.control} name="woDraft" label="Upload LOA/GEM PO/LOI/Draft WO">
                                {field => (
                                    <FileUploader
                                        context="wo-draft"
                                        value={field.value ?? []}
                                        onChange={paths => field.onChange(paths)}
                                        disabled={isSubmitting}
                                    />
                                )}
                            </FieldWrapper>
                            <div className="md:col-span-2 p-2">
                                <div className="space-y-1">
                                    <span className="text-muted-foreground">Project Code</span>
                                    <p className="font-mono font-semibold text-primary">
                                        {form.watch("projectCode") || "---"}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-muted-foreground">Project Name</span>
                                    <p className="font-semibold text-primary">
                                        {form.watch("projectName") || "---"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2 pt-6 border-t">
                            <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => goToStep(2, true)} disabled={isSubmitting}>
                                <SkipForward className="mr-2 h-4 w-4" />
                                Skip to costs
                            </Button>
                            <Button type="button" onClick={() => goToStep(2)} disabled={isSubmitting}>
                                Next: Costs
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                        </>
                        )}

                        {currentStep === 2 && (
                        <>
                        {/* Checklist - optional, collapsed */}
                        {!isNonTender && (
                            <>
                                <div>
                                    <button
                                        type="button"
                                        onClick={() => setShowChecklist((value) => !value)}
                                        className="flex w-full items-center justify-between rounded-lg border bg-muted/30 px-4 py-3 text-left"
                                    >
                                        <span className="flex items-center gap-2 text-sm font-semibold">
                                            <Check className="h-4 w-4 text-orange-500" />
                                            Checklist confirmation from TE
                                        </span>
                                        <Badge variant="secondary">
                                            {Object.values(form.watch("tmsDocuments") || {}).filter(Boolean).length}/{tmsDocList.length}
                                        </Badge>
                                    </button>
                                    {showChecklist && (
                                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg border">
                                            {tmsDocList.map((doc) => (
                                                <div key={doc} className="flex items-center space-x-2">
                                                    <FieldWrapper control={form.control} name={`tmsDocuments.${doc}`} label="">
                                                        {field => (
                                                            <div className="flex items-center space-x-2">
                                                                <Checkbox
                                                                    id={doc}
                                                                    checked={field.value || false}
                                                                    onCheckedChange={field.onChange}
                                                                />
                                                                <Label htmlFor={doc} className="text-sm cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis">
                                                                    {doc}
                                                                </Label>
                                                            </div>
                                                        )}
                                                    </FieldWrapper>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <Separator />
                            </>
                        )}

                        {/* Pricing */}
                        <div>
                            <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
                                <TrendingUp className="h-5 w-5 text-orange-500" />
                                Pricing Details
                            </h3>
                            <p className="mb-4 text-sm text-muted-foreground">
                                Prefilled from the costing sheet when available. Adjust only if needed.
                            </p>
                            <div className="grid gap-4 grid-cols-1 md:grid-cols-3 lg:grid-cols-4 items-start">
                                <FieldWrapper control={form.control} name="budgetPreGst" label="Budget (Pre-GST)">
                                    {field => <Input {...field} placeholder="0.00" type="number" step="0.01" value={field.value || ""} />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="receiptPreGst" label="Receipt (Pre-GST)">
                                    {field => <Input {...field} placeholder="0.00" type="number" step="0.01" value={field.value || ""} />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="finalPrice" label="Final Price">
                                    {field => <Input {...field} placeholder="0.00" type="number" step="0.01" value={field.value || ""} />}
                                </FieldWrapper>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">Gross Margin</p>
                                    <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm font-semibold">
                                        {Number(watchBudget) > 0 && Number(watchReceipt) > 0
                                            ? `${(((Number(watchReceipt) - Number(watchBudget)) / Number(watchReceipt)) * 100).toFixed(2)}%`
                                            : "—"}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">Auto-calculated from receipt and budget</p>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Contact Details */}
                        <div>
                            <button
                                type="button"
                                onClick={() => setShowContacts((value) => !value)}
                                className="mb-3 flex w-full items-center justify-between rounded-lg border bg-muted/30 px-4 py-3 text-left"
                            >
                                <span className="flex items-center gap-2 text-sm font-semibold">
                                    <Plus className="h-4 w-4 text-orange-500" />
                                    Contact Details
                                </span>
                                <Badge variant="secondary">{contacts.length} contact(s)</Badge>
                            </button>
                            {showContacts && (
                            <>
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted">
                                        <tr>
                                            <th className="p-3 text-left">Name</th>
                                            <th className="p-3 text-left">Designation</th>
                                            <th className="p-3 text-left">Phone</th>
                                            <th className="p-3 text-left">Email</th>
                                            <th className="p-3 text-left w-10">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {contacts.map((contact: any, idx: number) => (
                                            <tr key={idx}>
                                                <td className="p-2">
                                                    <Input
                                                        value={contact.name || ""}
                                                        onChange={(e) => handleUpdateContact(idx, "name", e.target.value)}
                                                        placeholder="Name"
                                                        className="h-8 text-xs"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        value={contact.designation || ""}
                                                        onChange={(e) => handleUpdateContact(idx, "designation", e.target.value)}
                                                        placeholder="Designation"
                                                        className="h-8 text-xs"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        value={contact.phone || ""}
                                                        onChange={(e) => handleUpdateContact(idx, "phone", e.target.value)}
                                                        placeholder="Phone"
                                                        className="h-8 text-xs"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        value={contact.email || ""}
                                                        onChange={(e) => handleUpdateContact(idx, "email", e.target.value)}
                                                        placeholder="Email"
                                                        className="h-8 text-xs"
                                                        type="email"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        type="button"
                                                        onClick={() => handleRemoveContact(idx)}
                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                        {contacts.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-4 text-center text-muted-foreground">
                                                    No contacts available. Add one using the button below.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-4"
                                onClick={handleAddContact}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Custom Contact
                            </Button>
                            </>
                            )}
                        </div>

                        <Separator />

                        {/* Budget & GeM charges */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Calculator className="h-5 w-5 text-orange-500" />
                                Budget & GeM Charges
                            </h3>

                            <div className="grid gap-4 grid-cols-1 md:grid-cols-3 lg:grid-cols-4 items-start">
                                <SelectField
                                    control={form.control}
                                    name="requestGemCharges"
                                    label="Request GeM charges payment"
                                    options={YES_NO_OPTIONS}
                                    placeholder=""
                                />
                                <FieldWrapper
                                    control={form.control}
                                    name="gemChargesAmount"
                                    label={prefillData?.isGemTender ? "GeM Charges (Pre-GST) *" : "GeM Charges (Pre-GST)"}
                                >
                                    {field => <Input {...field} placeholder="0.00" type="number" step="0.01" value={field.value ?? ""} />}
                                </FieldWrapper>
                            </div>

                            {prefillData?.isGemTender && (
                                <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                                    <Info className="h-4 w-4" />
                                    <AlertTitle>This tender was bid on GeM</AlertTitle>
                                    <AlertDescription>
                                        GeM charges are required. Enter 0 if there were no GeM charges.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {watchPaymentConsent === "true" && (
                                <div className="space-y-3 rounded-lg border p-4">
                                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-start">
                                        <FieldWrapper control={form.control} name="gemChargesPortalLink" label="Portal Link">
                                            {field => <Input {...field} placeholder="Enter portal payment link..." value={field.value || ""} />}
                                        </FieldWrapper>
                                        <FieldWrapper control={form.control} name="gemChargesInvoice" label="Invoice" className="col-span-2">
                                            {field => (
                                                <FileUploader
                                                    context="wo-draft"
                                                    value={field.value ?? []}
                                                    onChange={paths => field.onChange(paths)}
                                                />
                                            )}
                                        </FieldWrapper>
                                    </div>
                                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 p-4 rounded-lg border">
                                        <div className="space-y-1">
                                            <p className="text-sm text-muted-foreground">GST @ {GEM_GST_RATE}%</p>
                                            <p>{formatINR(gemChargesBreakdown.gstAmount)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm text-muted-foreground">Total Payable</p>
                                            <p>{formatINR(gemChargesBreakdown.totalPayable)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm text-muted-foreground">TDS @ {GEM_TDS_RATE}%</p>
                                            <p className="text-destructive">-{formatINR(gemChargesBreakdown.tdsAmount)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm text-muted-foreground">Net Payable</p>
                                            <p className="text-emerald-600">{formatINR(gemChargesBreakdown.netPayable)}</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        The maker request will be auto-created for the Net Payable amount ({formatINR(gemChargesBreakdown.netPayable)}).
                                    </p>
                                </div>
                            )}

                            <Button type="button" variant="ghost" size="sm" onClick={() => setShowBreakdown((value) => !value)}>
                                {showBreakdown ? "Hide" : "Show"} detailed budget breakdown
                            </Button>

                            {showBreakdown && (
                                <div className="space-y-3 rounded-lg border p-4">
                                    <div className="grid gap-4 grid-cols-1 md:grid-cols-3 lg:grid-cols-4 items-start">
                                        <FieldWrapper control={form.control} name="budgetSupply" label="Supply (pre GST)">
                                            {field => <Input {...field} placeholder="0.00" type="number" step="0.01" value={field.value || ""} />}
                                        </FieldWrapper>
                                        <FieldWrapper control={form.control} name="budgetService" label="Service (pre GST)">
                                            {field => <Input {...field} placeholder="0.00" type="number" step="0.01" value={field.value || ""} />}
                                        </FieldWrapper>
                                        <FieldWrapper control={form.control} name="budgetFreight" label="Freight (pre GST)">
                                            {field => <Input {...field} placeholder="0.00" type="number" step="0.01" value={field.value || ""} />}
                                        </FieldWrapper>
                                        <FieldWrapper control={form.control} name="budgetAdmin" label="Admin/Misc. (pre GST)">
                                            {field => <Input {...field} placeholder="0.00" type="number" step="0.01" value={field.value || ""} />}
                                        </FieldWrapper>
                                        <FieldWrapper control={form.control} name="budgetBuybackSale" label="Buyback Sale (pre GST)">
                                            {field => <Input {...field} placeholder="0.00" type="number" step="0.01" value={field.value || ""} />}
                                        </FieldWrapper>
                                    </div>
                                    <div className="flex justify-end">
                                        <div className="rounded-lg border bg-muted/30 p-3">
                                            <p className="text-sm text-muted-foreground">Calculated budget</p>
                                            <p className="text-lg font-bold">₹{breakdownTotal.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        When breakdown values are entered, the Budget (Pre-GST) field is updated automatically.
                                    </p>
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* Review */}
                        <div className="space-y-1 rounded-lg border bg-muted/30 p-4 text-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Review</p>
                            <p><span className="text-muted-foreground">Project:</span> {form.watch("projectCode") || "—"} · {form.watch("projectName") || "—"}</p>
                            <p><span className="text-muted-foreground">Work order:</span> {form.watch("woNumber") || "—"}</p>
                            <p><span className="text-muted-foreground">Order type:</span> {watchOrderType || "single"}</p>
                            <p><span className="text-muted-foreground">GeM charges:</span> {watchGemChargesAmount ?? 0}{watchPaymentConsent === "true" ? " (payment request)" : ""}</p>
                        </div>

                        <div className="flex flex-wrap justify-end gap-2 pt-6 border-t">
                            <Button type="button" variant="outline" onClick={() => goToStep(1, true)} disabled={isSubmitting}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back
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
                        </>
                        )}
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

export default BasicDetailForm;
