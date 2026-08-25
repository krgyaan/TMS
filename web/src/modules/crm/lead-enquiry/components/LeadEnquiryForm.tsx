import { useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { type SubmitHandler, useForm, useWatch, type Resolver } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { ContactPersonForm } from "@/components/form/contactpersonform";
import { FileUploader } from "@/components/file-upload";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
import { paths } from "@/app/routes/paths";
import { useCreateLeadEnquiry, useUpdateLeadEnquiry } from "@/hooks/api/useLeadEnquiry";
import { useLocations } from "@/hooks/api/useLocations";
import { useLead } from "@/hooks/api/useLeads";
import { useHappyCalling } from "@/hooks/api/useHappyCalling";
import axiosInstance from "@/lib/axios";
import type { Location } from "@/types/api.types";
import type { LeadEnquiryWithNames } from "../helpers/lead-enquiry.type";

type Option = { value: string; label: string };

const LeadEnquiryFormSchema = z.object({
    leadId: z.string().optional(),
    team: z.string().optional(),
    enqName: z.string().min(1, { message: "Enquiry name is required" }),
    organizationName: z.string().min(1, { message: "Organisation is required" }),
    orgAbbName: z.string().min(1, { message: "Organisation abbreviation is required" }),
    itemId: z.string().min(1, { message: "Item is required" }),
    locationCode: z.string().min(1, { message: "Location is required" }),
    approxValue: z.string().min(1, { message: "Approx value is required" }),
    dueDate: z.string().optional(),
    siteVisitRequired: z.enum(["yes", "no"]),
    enquiryType: z.string().optional(),
    enquiryFile: z.array(z.string()).default([]),
    notes: z.string().optional(),
    contacts: z.array(z.object({
        name: z.string().min(1, { message: "Contact name is required" }),
        designation: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
    })).optional(),
});

type LeadEnquiryFormValues = z.infer<typeof LeadEnquiryFormSchema>;

const toDatetimeLocal = (iso: string): string => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

interface LeadEnquiryFormProps {
    mode: "create" | "edit";
    enquiry?: LeadEnquiryWithNames;
    defaultLeadId?: number | null;
    defaultHappyCallingId?: number | null;
    prefillOrganizationName?: string;
}

const fetchItems = async (): Promise<Option[]> => {
    const res = await axiosInstance.get('/items');
    return res.data.map((i: { id: number; name: string }) => ({ label: i.name, value: i.id.toString() }));
};

const fetchTeams = async (): Promise<Option[]> => {
    const res = await axiosInstance.get("/teams");
    return res.data
        .filter((team: { id: number }) => [1, 2, 6].includes(team.id))
        .map((team: { id: number; name: string }) => ({
            label: team.name,
            value: team.id.toString(),
        }));
};

export function LeadEnquiryForm({ mode, enquiry, defaultLeadId, defaultHappyCallingId, prefillOrganizationName }: LeadEnquiryFormProps) {
    const navigate = useNavigate();
    const createEnquiry = useCreateLeadEnquiry();
    const updateEnquiry = useUpdateLeadEnquiry();

    const { data: itemOptions = [] } = useQuery({ queryKey: ["items"], queryFn: fetchItems });
    const { data: teamOptions = [] } = useQuery({ queryKey: ["teams"], queryFn: fetchTeams });
    const { data: locations = [] } = useLocations();
    const { data: leadData } = useLead(defaultLeadId ?? null);
    const { data: happyCallingRecord } = useHappyCalling(defaultHappyCallingId ?? null);

    const locationOptions = locations.map((l: Location) => ({
        id: String(l.id),
        name: l.name,
    }));

    const form = useForm<LeadEnquiryFormValues>({
        resolver: zodResolver(LeadEnquiryFormSchema) as unknown as Resolver<LeadEnquiryFormValues>,
        defaultValues: {
            leadId: enquiry?.leadId?.toString() || (defaultLeadId ? String(defaultLeadId) : ""),
            team: enquiry?.team || "",
            enqName: enquiry?.enqName || "",
            organizationName: enquiry?.organizationName || "",
            orgAbbName: enquiry?.orgAbbName || "",
            itemId: enquiry?.itemId?.toString() || "",
            locationCode: enquiry?.locationCode || "",
            approxValue: enquiry?.approxValue || "",
            dueDate: enquiry?.dueDate ? toDatetimeLocal(enquiry.dueDate) : "",
            siteVisitRequired: enquiry?.siteVisitRequired ? "yes" : "no",
            enquiryType: enquiry?.enquiryType || "",
            enquiryFile: enquiry?.enquiryFile ? JSON.parse(enquiry.enquiryFile) : [],
            notes: enquiry?.notes || "",
            contacts: enquiry?.contacts?.length
                ? enquiry.contacts.map((c) => ({
                    name: c.name,
                    designation: c.designation ?? "",
                    phone: c.phone ?? "",
                    email: c.email ?? "",
                }))
                : [],
        },
    });

    const orgAbb = useWatch({ control: form.control, name: "orgAbbName" });
    const itemIdVal = useWatch({ control: form.control, name: "itemId" });
    const locationVal = useWatch({ control: form.control, name: "locationCode" });

    useEffect(() => {
        if (leadData) {
            form.setValue("organizationName", leadData.companyName || "");
            form.setValue("team", leadData.team || "");
            if (mode === "create") {
                const contact = {
                    name: leadData.name || "",
                    designation: leadData.designation || "",
                    phone: leadData.phone || "",
                    email: leadData.email || "",
                };
                const hasAny = contact.name || contact.designation || contact.phone || contact.email;
                if (hasAny) {
                    form.setValue("contacts", [contact]);
                }
            }
        }
    }, [leadData, form, mode]);

    useEffect(() => {
        if (happyCallingRecord && mode === "create") {
            if (happyCallingRecord.organization) {
                form.setValue("organizationName", happyCallingRecord.organization);
            }
            const contact = {
                name: happyCallingRecord.name || "",
                designation: happyCallingRecord.designation || "",
                phone: happyCallingRecord.phone || "",
                email: happyCallingRecord.email || "",
            };
            const hasAny = contact.name || contact.designation || contact.phone || contact.email;
            if (hasAny) {
                form.setValue("contacts", [contact]);
            }
        }
    }, [happyCallingRecord, form, mode]);

    useEffect(() => {
        const itemName = itemIdVal ? itemOptions.find((o) => o.value === itemIdVal)?.label : "";
        const locationName = locationVal
            ? locationOptions.find((o) => o.id === locationVal)?.name
            : "";
        if (orgAbb && itemName && locationName) {
            form.setValue("enqName", `${orgAbb} ${locationName} ${itemName}`);
        } else if (orgAbb && itemName) {
            form.setValue("enqName", `${orgAbb} ${itemName}`);
        } else {
            form.setValue("enqName", "");
        }
    }, [orgAbb, itemIdVal, locationVal, itemOptions, locationOptions, form]);

    useEffect(() => {
        if (mode === "edit" && enquiry?.locationCode && locations.length > 0) {
            const loc = (locations as Location[]).find(
                (l) => String(l.id) === enquiry.locationCode
            );
            if (loc) {
                form.setValue("locationCode", String(loc.id));
            }
        }
    }, [mode, enquiry, locations, form]);

    const handleSubmit: SubmitHandler<LeadEnquiryFormValues> = async (values) => {
        try {
            const payload = {
                ...values,
                leadId: values.leadId ? Number(values.leadId) : null,
                happyCallingId: defaultHappyCallingId ? Number(defaultHappyCallingId) : null,
                itemId: Number(values.itemId),
                siteVisitRequired: values.siteVisitRequired === "yes",
                dueDate: values.dueDate || null,
                enquiryType: values.enquiryType || null,
                enquiryFile: values.enquiryFile.length > 0 ? JSON.stringify(values.enquiryFile) : null,
                contacts: values.contacts?.length ? values.contacts : null,
            };

            if (mode === "create") {
                await createEnquiry.mutateAsync(payload);
            } else if (mode === "edit" && enquiry) {
                await updateEnquiry.mutateAsync({ id: enquiry.id, data: payload });
            }
            navigate(paths.crm.enquiries);
        } catch (error) {
            console.error("Enquiry form submission error:", error);
        }
    };

    const saving = createEnquiry.isPending || updateEnquiry.isPending;

    return (
        <Card>
            <CardHeader>
                <CardTitle>{mode === "create" ? "Create New Enquiry" : "Edit Enquiry"}</CardTitle>
                <CardAction>
                    <Button variant="outline" onClick={() => navigate(paths.crm.enquiries)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Return Back
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                            {/* Row 1: Enquiry Name + Team + Organisation */}
                            <FieldWrapper control={form.control} name="enqName" label="Enquiry Name">
                                {(field) => (
                                    <Input
                                        placeholder="Auto-generated from org, item & location"
                                        {...field}
                                        readOnly
                                        className="bg-muted/30"
                                    />
                                )}
                            </FieldWrapper>

                            <SelectField
                                control={form.control}
                                name="team"
                                label="Team"
                                options={teamOptions}
                                placeholder="-- Select Team --"
                            />

                            <FieldWrapper control={form.control} name="organizationName" label="Organisation (End user)">
                                {(field) => (
                                    <Input
                                        placeholder="Enter organisation name"
                                        {...field}
                                        readOnly={!!defaultLeadId || !!prefillOrganizationName}
                                        className={defaultLeadId || prefillOrganizationName ? "bg-muted/30" : ""}
                                    />
                                )}
                            </FieldWrapper>

                            {/* Row 2: Org Abbreviation + Item + Location */}
                            <FieldWrapper control={form.control} name="orgAbbName" label="Organisation Abbreviation">
                                {(field) => <Input placeholder="Enter abbreviation" {...field} />}
                            </FieldWrapper>

                            <SelectField
                                control={form.control}
                                name="itemId"
                                label="Item"
                                options={itemOptions}
                                placeholder="-- Select Item --"
                            />

                            <SelectField
                                control={form.control}
                                name="locationCode"
                                label="Location"
                                options={locationOptions}
                                placeholder="-- Select Location --"
                            />

                            {/* Row 3: Approx Value + Due Date + Enquiry Type + Site Visit */}
                            <FieldWrapper control={form.control} name="approxValue" label="Approx Value (₹)">
                                {(field) => <Input placeholder="Enter approx value" {...field} />}
                            </FieldWrapper>

                            <FieldWrapper control={form.control} name="dueDate" label="Due Date">
                                {(field) => <Input type="datetime-local" {...field} />}
                            </FieldWrapper>

                            <SelectField
                                control={form.control}
                                name="enquiryType"
                                label="Enquiry Type"
                                options={[
                                    { label: "Budgetary Quotation", value: "Budgetary Quotation" },
                                    { label: "RFQ Received", value: "RFQ Received" },
                                ]}
                                placeholder="-- Select Enquiry Type --"
                            />

                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Site Visit Required</Label>
                                <RadioGroup
                                    value={form.watch("siteVisitRequired")}
                                    onValueChange={(val) => form.setValue("siteVisitRequired", val as "yes" | "no")}
                                    className="flex gap-6"
                                >
                                    <div className="flex items-center gap-2">
                                        <RadioGroupItem value="yes" id="sv-yes" />
                                        <Label htmlFor="sv-yes" className="cursor-pointer">Yes</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <RadioGroupItem value="no" id="sv-no" />
                                        <Label htmlFor="sv-no" className="cursor-pointer">No</Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            {/* Contact Persons */}
                            <div className="col-span-full">
                                <ContactPersonForm
                                    control={form.control}
                                    name="contacts"
                                    label="Contact Person(s)"
                                />
                            </div>

                            {/* Upload Documents */}
                            <div className="col-span-full">
                                <FieldWrapper control={form.control} name="enquiryFile" label="Upload Documents">
                                    {(field) => (
                                        <FileUploader
                                            context="tender-documents"
                                            value={field.value}
                                            onChange={(paths) => form.setValue("enquiryFile", paths)}
                                        />
                                    )}
                                </FieldWrapper>
                            </div>

                            {/* Notes */}
                            <div className="col-span-full">
                                <FieldWrapper control={form.control} name="notes" label="Add Notes">
                                    {(field) => <Textarea placeholder="Enter notes..." className="min-h-[100px]" {...field} />}
                                </FieldWrapper>
                            </div>
                        </div>

                        <Separator />

                        <div className="w-full flex items-center justify-center gap-2">
                            <Button type="submit" disabled={saving}>
                                {saving ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                                ) : mode === "create" ? (
                                    "Create Enquiry"
                                ) : (
                                    "Update Enquiry"
                                )}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => navigate(paths.crm.enquiries)} disabled={saving}>
                                Cancel
                            </Button>
                            <Button type="button" variant="outline" onClick={() => form.reset()} disabled={saving}>
                                Reset
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}