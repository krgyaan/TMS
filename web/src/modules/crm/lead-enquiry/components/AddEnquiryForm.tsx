import { useEffect, useMemo, useRef, useState } from "react";
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { ContactPersonForm } from "@/components/form/contactpersonform";
import { FileUploader } from "@/components/file-upload";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Check, ChevronDown, Loader2, Plus } from "lucide-react";
import { paths } from "@/app/routes/paths";
import { cn } from "@/lib/utils";
import { useCreateEnquiryWithLead } from "@/hooks/api/useLeadEnquiry";
import { useLocations } from "@/hooks/api/useLocations";
import { OrganizationModal } from "@/modules/master/organization/components/OrganizationModal";
import { useOrganizations } from "@/hooks/api/useOrganizations";
import axiosInstance from "@/lib/axios";
import type { Location } from "@/types/api.types";
import type { EnquiryOrgOption } from "../helpers/lead-enquiry.type";

type Option = { value: string; label: string };

const useEnquiryOrganizationOptions = (): EnquiryOrgOption[] => {
    const { data: organizations = [] } = useOrganizations();

    return useMemo(
        () =>
            organizations
                .filter((o) => o.status === true)
                .map((o) => {
                    const fullName = (o.name ?? "").trim();
                    const acronym = (o.acronym ?? "").trim();
                    return {
                        id: String(o.id),
                        acronym,
                        orgName: fullName || acronym,
                        name: acronym || fullName,
                        keywords: fullName,
                    };
                })
                .sort((a, b) => (a.acronym || a.orgName).localeCompare(b.acronym || b.orgName)),
        [organizations]
    );
};

const COUNTRY_OPTIONS: Option[] = [
    { label: "India", value: "India" },
    { label: "Nepal", value: "Nepal" },
    { label: "Sri Lanka", value: "Sri Lanka" },
    { label: "UAE", value: "UAE" },
    { label: "United States", value: "United States" },
    { label: "United Kingdom", value: "United Kingdom" },
];

const AddEnquiryFormSchema = z.object({
    team: z.string().optional(),
    enqName: z.string().min(1, { message: "Enquiry name is required" }),
    organizationName: z.string().min(1, { message: "Organisation is required" }),
    orgAbbName: z.string().optional(),
    itemId: z.string().min(1, { message: "Item is required" }),
    locationCode: z.string().min(1, { message: "Location is required" }),
    approxValue: z
        .string()
        .trim()
        .min(1, { message: "Approx value is required" })
        .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, {
            message: "Approx value must be a number 0 or greater",
        }),
    dueDate: z.string().optional(),
    siteVisitRequired: z.enum(["yes", "no"]),
    enquiryType: z.string().optional(),
    enquiryFile: z.array(z.string()).default([]),
    notes: z.string().optional(),
    address: z.string().optional(),
    country: z.string().min(1, { message: "Country is required" }),
    state: z.string().min(1, { message: "State is required" }),
    contacts: z.array(z.object({
        name: z.string().min(1, { message: "Contact name is required" }),
        designation: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
    })).min(1, { message: "At least one contact person is required" }),
});

type AddEnquiryFormValues = z.infer<typeof AddEnquiryFormSchema>;

const fetchItems = async (): Promise<Option[]> => {
    const res = await axiosInstance.get('/items');
    return res.data
        .filter((i: { status: boolean }) => i.status === true)
        .map((i: { id: number; name: string }) => ({ label: i.name, value: i.id.toString() }))
        .sort((a: Option, b: Option) => a.label.localeCompare(b.label));
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

const fetchStates = async (): Promise<Option[]> => {
    const res = await axiosInstance.get('/states');
    return res.data.map((s: { id: number; name: string }) => ({
        label: s.name,
        value: s.name,
    }));
};

const SectionSeparator = ({ text }: { text: string }) => (
    <div className="col-span-full flex items-center gap-4 py-1">
        <span className="text-sm font-semibold text-muted-foreground whitespace-nowrap">
            {text}
        </span>
        <Separator className="flex-1" />
    </div>
);

export function AddEnquiryForm() {
    const navigate = useNavigate();
    const createEnquiryWithLead = useCreateEnquiryWithLead();
    const [orgModalOpen, setOrgModalOpen] = useState(false);

    const { data: itemOptions = [] } = useQuery({ queryKey: ["items"], queryFn: fetchItems });
    const orgOptions = useEnquiryOrganizationOptions();
    const { data: teamOptions = [] } = useQuery({ queryKey: ["teams"], queryFn: fetchTeams });
    const { data: stateOptions = [] } = useQuery({ queryKey: ["states"], queryFn: fetchStates });
    const { data: locations = [] } = useLocations();

    const locationOptions = locations.map((l: Location) => ({
        id: String(l.id),
        name: l.name,
    }));

    const form = useForm<AddEnquiryFormValues>({
        resolver: zodResolver(AddEnquiryFormSchema) as unknown as Resolver<AddEnquiryFormValues>,
        defaultValues: {
            team: "",
            enqName: "",
            organizationName: "",
            orgAbbName: "",
            itemId: "",
            locationCode: "",
            approxValue: "",
            dueDate: "",
            siteVisitRequired: "no",
            enquiryType: "",
            enquiryFile: [],
            notes: "",
            address: "",
            country: "",
            state: "",
            contacts: [],
        },
    });

    const orgAbb = useWatch({ control: form.control, name: "orgAbbName" });
    const organizationVal = useWatch({ control: form.control, name: "organizationName" });
    const selectedOrg = orgOptions.find((o) => o.id === organizationVal);
    const itemIdVal = useWatch({ control: form.control, name: "itemId" });
    const locationVal = useWatch({ control: form.control, name: "locationCode" });
    const country = useWatch({ control: form.control, name: "country" });
    const isIndia = country === "India";

    const [orgQuery, setOrgQuery] = useState("");
    const [orgOpen, setOrgOpen] = useState(false);

    const filteredOrgs = useMemo(() => {
        const q = orgQuery.trim().toLowerCase();
        if (!q) return orgOptions;
        return orgOptions.filter(
            (o) => o.acronym.toLowerCase().includes(q) || o.orgName.toLowerCase().includes(q)
        );
    }, [orgOptions, orgQuery]);

    useEffect(() => {
        if (!selectedOrg) {
            form.setValue("orgAbbName", "", { shouldValidate: false });
            return;
        }
        form.setValue("orgAbbName", selectedOrg.acronym || selectedOrg.orgName);
    }, [selectedOrg, form]);

    const isInitialLoad = useRef(true);
    const previousCountry = useRef<string>("");

    useEffect(() => {
        setTimeout(() => {
            isInitialLoad.current = false;
        }, 0);
    }, []);

    useEffect(() => {
        if (isInitialLoad.current) return;
        if (previousCountry.current === country) return;
        form.setValue("state", "", { shouldValidate: false });
        previousCountry.current = country;
    }, [country, form]);

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

    const handleSubmit: SubmitHandler<AddEnquiryFormValues> = async (values) => {
        try {
            // The dropdown stores the organization id, so send it: the server
            // links by id and copies the canonical name from the master instead
            // of re-matching on a name string (which could create a new org).
            const selected = orgOptions.find((o) => o.id === (values.organizationName ?? ""));
            const organizationName = selected?.orgName ?? "";
            if (!selected || !organizationName) {
                form.setError("organizationName", { message: "Please select an organisation" });
                return;
            }

            const payload = {
                ...values,
                organisationId: Number(selected.id),
                organizationName,
                approxValue: Number(values.approxValue),
                itemId: Number(values.itemId),
                siteVisitRequired: values.siteVisitRequired === "yes",
                dueDate: values.dueDate || null,
                enquiryType: values.enquiryType || null,
                enquiryFile: values.enquiryFile.length > 0 ? JSON.stringify(values.enquiryFile) : null,
                contacts: values.contacts,
                address: values.address || null,
                state: values.state || null,
            };

            await createEnquiryWithLead.mutateAsync(payload);
            navigate(paths.crm.enquiries);
        } catch (error) {
            console.error("Add enquiry form submission error:", error);
        }
    };

    const saving = createEnquiryWithLead.isPending;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Create New Enquiry</CardTitle>
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
                                    <DropdownMenu open={orgOpen} onOpenChange={setOrgOpen}>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={orgOpen}
                                                className="w-full justify-between min-w-0"
                                            >
                                                <span className="truncate">
                                                    {selectedOrg
                                                        ? selectedOrg.acronym || selectedOrg.orgName
                                                        : "-- Select Organisation --"}
                                                </span>
                                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            className="w-(--radix-popper-anchor-width) p-0"
                                            align="start"
                                        >
                                            <div className="p-2 border-b" onMouseDown={(e) => e.preventDefault()}>
                                                <Input
                                                    autoFocus
                                                    placeholder="Search..."
                                                    value={orgQuery}
                                                    onChange={(e) => setOrgQuery(e.target.value)}
                                                    onKeyDown={(e) => e.stopPropagation()}
                                                    className="h-8"
                                                />
                                            </div>
                                            <div className="max-h-64 overflow-auto py-1">
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        setOrgModalOpen(true);
                                                        setOrgOpen(false);
                                                        setOrgQuery("");
                                                    }}
                                                    className="bg-primary/10 font-semibold text-primary hover:bg-primary/15 focus:text-primary"
                                                >
                                                    <Plus className="mr-1 h-4 w-4" />
                                                    Add new organization
                                                </DropdownMenuItem>

                                                {filteredOrgs.length > 0 && (
                                                    <div className="my-1 border-t" />
                                                )}

                                                {filteredOrgs.map((o) => {
                                                    const isSelected = String(field.value ?? "") === o.id;
                                                    return (
                                                        <DropdownMenuItem
                                                            key={o.id}
                                                            onClick={() => {
                                                                field.onChange(o.id);
                                                                setOrgOpen(false);
                                                                setOrgQuery("");
                                                            }}
                                                            className={cn(
                                                                "flex items-center justify-between gap-2",
                                                                isSelected && "bg-accent"
                                                            )}
                                                        >
                                                            <span className="truncate text-foreground">
                                                                {o.acronym || o.orgName}
                                                            </span>
                                                            <Check
                                                                className={cn(
                                                                    "h-4 w-4 shrink-0",
                                                                    isSelected ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                        </DropdownMenuItem>
                                                    );
                                                })}

                                                {filteredOrgs.length === 0 && (
                                                    <div className="px-2 py-2 text-sm text-muted-foreground">
                                                        No organizations match
                                                    </div>
                                                )}
                                            </div>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </FieldWrapper>

                            {/* Row 2: Item + Location */}
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
                                {(field) => (
                                    <Input
                                        type="number"
                                        inputMode="decimal"
                                        min={0}
                                        step="0.01"
                                        placeholder="Enter approx value"
                                        {...field}
                                        value={field.value ?? ""}
                                    />
                                )}
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

                            {/* Location Details Section */}
                            <SectionSeparator text="Location Details" />

                            <SelectField
                                control={form.control}
                                name="country"
                                label="Country"
                                options={COUNTRY_OPTIONS}
                                placeholder="Select Country"
                            />

                            {isIndia ? (
                                <SelectField
                                    control={form.control}
                                    name="state"
                                    label="State"
                                    options={stateOptions}
                                    placeholder="Select State"
                                />
                            ) : (
                                <FieldWrapper control={form.control} name="state" label="State">
                                    {(field) => (
                                        <Input
                                            placeholder="Enter state name"
                                            disabled={!country}
                                            {...field}
                                        />
                                    )}
                                </FieldWrapper>
                            )}

                            <FieldWrapper control={form.control} name="address" label="Address">
                                {(field) => <Input placeholder="Enter address" {...field} />}
                            </FieldWrapper>

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
                                ) : (
                                    "Create Enquiry"
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

            <OrganizationModal open={orgModalOpen} onOpenChange={setOrgModalOpen} />
        </Card>
    );
}