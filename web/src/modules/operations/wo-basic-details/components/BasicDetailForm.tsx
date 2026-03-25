import { useEffect, useMemo, useState } from "react";
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
import { ArrowLeft, Save, Plus, Trash2, Check, HashIcon } from "lucide-react";
import { paths } from "@/app/routes/paths";
import { WoBasicDetailFormSchema } from "../helpers/basiDetail.schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useInfoSheet } from "@/hooks/api/useInfoSheets";
import { useWoContactsByBasicDetail, useCreateBulkWoContacts, useDeleteAllContactsByBasicDetail } from "@/hooks/api/useWoContacts";
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

const teamArray = [
    { id: 1, name: "AC" },
    { id: 2, name: "DC" },
];

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
    const watchWoDate = form.watch("woDate");
    const watchBudget = form.watch("budgetPreGst");
    const watchReceipt = form.watch("receiptPreGst");

    const tenderId = watchTenderId ? Number(watchTenderId) : null;
    const { data: tenderData } = useTender(tenderId);
    const { data: costingData } = useCostingSheetByTender(tenderId || 0);

    // Auto-fill from Costing Sheet
    useEffect(() => {
        if (mode === "create" && costingData) {
            if (costingData.budgetPrice && !form.getValues("budgetPreGst")) {
                form.setValue("budgetPreGst", Number(costingData.budgetPrice));
            }
            if (costingData.receiptPrice && !form.getValues("receiptPreGst")) {
                form.setValue("receiptPreGst", Number(costingData.receiptPrice));
            }
            if (costingData.grossMargin && !form.getValues("grossMargin")) {
                form.setValue("grossMargin", Number(costingData.grossMargin));
            }
        }
    }, [mode, costingData, form]);

    // Background Project Code/Name Generation
    // Format: teamName/FY/orgAcronym/location/item/last4WoNumber
    const getFinancialYear = (date: Date): string => {
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        const fy = month >= 4 ? year : year - 1;
        const fyShort = fy.toString().slice(-2);
        const nextShort = (parseInt(fyShort, 10) + 1).toString().padStart(2, "0");
        return `${fyShort}${nextShort}`;
    };

    const { projectCode: derivedCode, projectName: derivedName } = useMemo(() => {
        if (!tenderData) return { projectCode: "", projectName: "" };
        const t = tenderData as any;

        const teamName = teamArray.find((team) => team.id === t.team)?.name || "";
        const orgName = t.organizationAcronym || "";
        const itemName = t.itemName || "";
        const locName = t.locationName || "";
        const suffix = watchWoNumber ? String(watchWoNumber).slice(-4) : "";
        const yearSegment = watchWoDate ? getFinancialYear(watchWoDate instanceof Date ? watchWoDate : new Date(watchWoDate)) : "";

        const hasAllCore = !!teamName && !!orgName && !!itemName && !!locName && !!yearSegment && !!suffix;
        if (!hasAllCore) return { projectCode: "", projectName: "" };

        return {
            projectCode: `${teamName}/${yearSegment}/${orgName}/${locName}/${itemName}/${suffix}`,
            projectName: `${orgName} ${locName} ${itemName}`.trim(),
        };
    }, [tenderData, watchWoNumber, watchWoDate]);

    useEffect(() => {
        if (derivedCode) form.setValue("projectCode", derivedCode);
        if (derivedName) form.setValue("projectName", derivedName);
    }, [derivedCode, derivedName, form]);

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

    // Fetch Tender Info for Clients
    const { data: infoSheetData } = useInfoSheet(tenderId);
    const tenderClients = infoSheetData?.clients || [];

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
        if (mode === "create" && tenderClients.length > 0 && contacts.length === 0) {
            setContacts(tenderClients.map((c: any) => ({
                name: c.clientName,
                designation: c.clientDesignation,
                phone: c.clientMobile,
                email: c.clientEmail,
                organization: "",
                departments: "",
            })));
        }
    }, [mode, tenderClients, contacts.length]);

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
                const payload = mapFormToCreatePayload(values);
                const result = await createMutation.mutateAsync(payload);

                // Save contacts if any
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

                // Sync contacts: delete all then bulk-insert updated list
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
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
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

                        {/* TE Checklist and TMS Documents Section */}
                        <div className="grid gap-8 border rounded-xl p-6 shadow-sm bg-card mt-8">
                            <div>
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <Check className="h-5 w-5 text-orange-500" />
                                    Checklist confirmation from TE
                                </h3>
                                <p className="mb-4 text-sm flex items-center gap-2">
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
                            {/* Contact Details Section */}
                            <div className="mt-8">
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
                            {/* Display Section for Auto-generated/Fetched Data */}
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 p-6 bg-muted/30 rounded-lg border border-border mt-6">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Project Code</p>
                                    <p className="font-mono font-semibold text-primary">
                                        {form.watch("projectCode") || "---"}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Project Name</p>
                                    <p className="font-semibold text-primary">
                                        {form.watch("projectName") || "---"}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Gross Margin %age</p>
                                    <p className={`font-bold ${Number(form.watch("grossMargin")) < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                                        {form.watch("grossMargin") ? `${form.watch("grossMargin")}%` : "---"}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Budget (Pre GST)</p>
                                    <p className="font-semibold">
                                        {form.watch("budgetPreGst") ? `₹${Number(form.watch("budgetPreGst")).toLocaleString()}` : "---"}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Receipt (Pre GST)</p>
                                    <p className="font-semibold">
                                        {form.watch("receiptPreGst") ? `₹${Number(form.watch("receiptPreGst")).toLocaleString()}` : "---"}
                                    </p>
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
