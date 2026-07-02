import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { type SubmitHandler, useForm, type Resolver } from "react-hook-form";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/form/DateInput";
import { TenderFileUploader } from "@/components/tender-file-upload";
import { ArrowLeft, Save, Plus, Trash2, Check, HashIcon, TrendingUp, Calculator } from "lucide-react";
import { paths } from "@/app/routes/paths";
import { WoBasicDetailFormSchema } from "../helpers/basiDetail.schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ConditionalSection } from "@/components/form/ConditionalSection";
import { YES_NO_OPTIONS } from "../../wo-details/helpers/constants";
import { useWoContactsByBasicDetail, useCreateBulkWoContacts, useDeleteAllContactsByBasicDetail } from "@/hooks/api/useWoContacts";
import type { WoBasicDetailFormValues, WoBasicDetail } from "../helpers/basiDetail.types";
import { buildDefaultValues, mapResponseToForm, mapFormToCreatePayload, mapFormToUpdatePayload } from "../helpers/basiDetail.mapper";
import { useCreateWoBasicDetail, useUpdateWoBasicDetail, useWoBasicDetailPrefill } from "@/hooks/api/useWoBasicDetails";
import { useOrganizationOptions, useItemOptions, useLocationOptions, useTeamOptions } from "@/hooks/useSelectOptions";
import type { CreateWoBasicDetailDto } from "@/modules/operations/types/wo.types";
import { toast } from "sonner";

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
    const isNonTender = !urlTenderId;
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
        if (mode === "create" && !isNonTender && urlTenderId) {
            defaults.tenderId = Number(urlTenderId);
        }
        return defaults;
    }, [mode, existingData, urlTenderId, isNonTender]);

    const form = useForm<WoBasicDetailFormValues>({
        resolver: zodResolver(WoBasicDetailFormSchema) as Resolver<WoBasicDetailFormValues>,
        defaultValues: initialValues,
    });

    const watchTenderId = form.watch("tenderId");
    const watchWoNumber = form.watch("woNumber");
    const watchWoDate = form.watch("woDate");
    const watchBudget = form.watch("budgetPreGst");
    const watchReceipt = form.watch("receiptPreGst");
    const watchPricesChanged = form.watch("pricesChanged");

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
        if (!isNonTender) {
            if (!prefillData) return { projectCode: "", projectName: "" };
            const teamName = teamArray.find((team) => team.id === prefillData.team)?.name || "";
            const orgName = prefillData.organizationAcronym || "";
            const itemName = prefillData.itemName || "";
            const locName = prefillData.locationName || "";
            const suffix = watchWoNumber ? String(watchWoNumber).slice(-4) : "";
            const yearSegment = watchWoDate ? getFinancialYear(watchWoDate instanceof Date ? watchWoDate : new Date(watchWoDate)) : "";
            const hasAllCore = !!teamName && !!orgName && !!itemName && !!locName && !!yearSegment && !!suffix;
            if (!hasAllCore) return { projectCode: "", projectName: "" };
            return {
                projectCode: `${teamName}/${yearSegment}/${orgName}/${locName}/${itemName}/${suffix}`,
                projectName: `${orgName} ${locName} ${itemName}`.trim(),
            };
        }

        const teamName = teamOptions.find(t => Number(t.id) === Number(watchTeamId))?.name || "";
        const orgName = organizationOptions.find(o => Number(o.id) === Number(watchOrganizationId))?.name || "";
        const itemName = itemOptions.find(i => Number(i.id) === Number(watchItemId))?.name || "";
        const locName = locationOptions.find(l => Number(l.id) === Number(watchLocationId))?.name || "";
        const suffix = watchWoNumber ? String(watchWoNumber).slice(-4) : "";
        const yearSegment = watchWoDate ? getFinancialYear(watchWoDate instanceof Date ? watchWoDate : new Date(watchWoDate)) : "";
        const hasAllCore = !!teamName && !!orgName && !!itemName && !!locName && !!yearSegment && !!suffix;
        if (!hasAllCore) return { projectCode: "", projectName: "" };
        return {
            projectCode: `${teamName}/${yearSegment}/${orgName}/${locName}/${itemName}/${suffix}`,
            projectName: `${orgName} ${locName} ${itemName}`.trim(),
        };
    }, [isNonTender, prefillData, watchWoNumber, watchWoDate, watchTeamId, watchOrganizationId, watchItemId, watchLocationId, teamOptions, organizationOptions, itemOptions, locationOptions]);

    useEffect(() => {
        if (derivedCode) form.setValue("projectCode", derivedCode);
        if (derivedName) form.setValue("projectName", derivedName);
    }, [derivedCode, derivedName, form]);

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
        try {
            if (mode === "create") {
                const payload = mapFormToCreatePayload(values) as Record<string, unknown>;
                if (isNonTender) {
                    payload.teamId = Number(values.teamId);
                    payload.organizationId = Number(values.organizationId);
                    payload.itemId = Number(values.itemId);
                    payload.locationId = Number(values.locationId);
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

    const budgetTotal = useMemo(() => {
        const s = Number(form.watch("budgetSupply") || 0);
        const sv = Number(form.watch("budgetService") || 0);
        const f = Number(form.watch("budgetFreight") || 0);
        const a = Number(form.watch("budgetAdmin") || 0);
        const b = Number(form.watch("budgetBuybackSale") || 0);
        const g = Number(form.watch("budgetGemCharges") || 0);
        return s + sv + f + a + g - b;
    }, [form.watch("budgetSupply"), form.watch("budgetService"), form.watch("budgetFreight"), form.watch("budgetAdmin"), form.watch("budgetBuybackSale"), form.watch("budgetGemCharges")]);

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
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
                        {/* Non-tender: Team/Org/Item/Location selects */}
                        {isNonTender && (
                            <>
                                <div>
                                    <h3 className="text-lg font-semibold mb-4">Team & Client Details</h3>
                                    <div className="grid gap-4 md:grid-cols-4">
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
                        <div className="grid gap-4 md:grid-cols-3 items-start">
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
                                    <TenderFileUploader
                                        context="wo-draft"
                                        value={field.value ?? []}
                                        onChange={paths => field.onChange(paths)}
                                        disabled={isSubmitting}
                                    />
                                )}
                            </FieldWrapper>
                        </div>

                        {/* Project Code & Project Name */}
                        <Separator />
                        <div className="flex gap-8 text-sm">
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
                        <Separator />

                        {/* Checklist - only for tender mode */}
                        {!isNonTender && (
                            <>
                                <div>
                                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                                        <Check className="h-5 w-5 text-orange-500" />
                                        Checklist confirmation from TE
                                    </h3>
                                    <p className="mb-4 text-sm flex items-center gap-2 text-muted-foreground">
                                        <HashIcon className="h-4 w-4 text-orange-500" />
                                        All Documents are complete in the TMS
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg border">
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
                                </div>
                                <Separator />
                            </>
                        )}

                        {/* Pricing */}
                        <div>
                            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                                <TrendingUp className="h-5 w-5 text-orange-500" />
                                Pricing Details
                            </h3>
                            {!isNonTender && (
                                <div className="max-w-xs mb-4">
                                    <SelectField
                                        control={form.control}
                                        name="pricesChanged"
                                        label="Is costing prices changed?"
                                        options={YES_NO_OPTIONS}
                                        placeholder="Select..."
                                    />
                                </div>
                            )}
                            {isNonTender ? (
                                <div className="grid gap-4 md:grid-cols-4">
                                    <FieldWrapper control={form.control} name="budgetPreGst" label="Budget Price">
                                        {field => <Input {...field} placeholder="0.00" type="number" step="0.01" value={field.value || ""} />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="receiptPreGst" label="Receipt Price">
                                        {field => <Input {...field} placeholder="0.00" type="number" step="0.01" value={field.value || ""} />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="finalPrice" label="Final Price">
                                        {field => <Input {...field} placeholder="0.00" type="number" step="0.01" value={field.value || ""} />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="grossMargin" label="Gross Margin %">
                                        {field => <Input {...field} placeholder="0.00" type="number" step="0.01" value={field.value || ""} />}
                                    </FieldWrapper>
                                </div>
                            ) : (
                                <>
                                    <ConditionalSection show={watchPricesChanged === "true"}>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <FieldWrapper control={form.control} name="budgetPreGst" label="Budget Price">
                                                {field => <Input {...field} placeholder="0.00" type="number" step="0.01" value={field.value || ""} />}
                                            </FieldWrapper>
                                            <FieldWrapper control={form.control} name="receiptPreGst" label="Receipt Price">
                                                {field => <Input {...field} placeholder="0.00" type="number" step="0.01" value={field.value || ""} />}
                                            </FieldWrapper>
                                            <FieldWrapper control={form.control} name="finalPrice" label="Final Price">
                                                {field => <Input {...field} placeholder="0.00" type="number" step="0.01" value={field.value || ""} />}
                                            </FieldWrapper>
                                            <FieldWrapper control={form.control} name="grossMargin" label="Gross Margin %">
                                                {field => <Input {...field} placeholder="0.00" type="number" step="0.01" value={field.value || ""} />}
                                            </FieldWrapper>
                                        </div>
                                    </ConditionalSection>
                                    <ConditionalSection show={watchPricesChanged !== "true"}>
                                        <div className="grid gap-4 md:grid-cols-4 p-4 bg-muted/30 rounded-lg border">
                                            <div className="space-y-1">
                                                <p className="text-sm text-muted-foreground">Budget Price</p>
                                                <p className="font-semibold">₹{Number(form.watch("budgetPreGst") || 0).toLocaleString()}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm text-muted-foreground">Receipt Price</p>
                                                <p className="font-semibold">₹{Number(form.watch("receiptPreGst") || 0).toLocaleString()}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm text-muted-foreground">Final Price</p>
                                                <p className="font-semibold">₹{Number(form.watch("finalPrice") || 0).toLocaleString()}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm text-muted-foreground">Gross Margin</p>
                                                <p className={`font-bold ${Number(form.watch("grossMargin")) < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                                                    {form.watch("grossMargin") ? `${Number(form.watch("grossMargin")).toFixed(2)}%` : "---"}
                                                </p>
                                            </div>
                                        </div>
                                    </ConditionalSection>
                                </>
                            )}
                        </div>

                        <Separator />

                        {/* Contact Details */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Plus className="h-5 w-5 text-orange-500" />
                                Contact Details
                            </h3>
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
                        </div>

                        <Separator />

                        {/* Budget Breakdown */}
                        <div>
                            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                                <Calculator className="h-5 w-5 text-orange-500" />
                                Budget Breakdown
                            </h3>
                            <div className="grid gap-4 md:grid-cols-3">
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
                                <FieldWrapper control={form.control} name="budgetGemCharges" label="GEM Charges (pre GST)">
                                    {field => <Input {...field} placeholder="0.00" type="number" step="0.01" value={field.value || ""} />}
                                </FieldWrapper>
                            </div>
                            <div className="flex justify-end mt-4 p-3 bg-muted/30 rounded-lg border">
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground">Total Budget</p>
                                    <p className="text-lg font-bold">₹{budgetTotal.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

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
