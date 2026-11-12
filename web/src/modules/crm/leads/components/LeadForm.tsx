import { useEffect, useRef, useState, useCallback } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { type SubmitHandler, useForm, useWatch } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
    Card,
    CardAction,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { ArrowLeft, Loader2, MapPin, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { paths } from "@/app/routes/paths";
import { useCreateLead, useUpdateLead } from "@/hooks/api/useLeads";
import { useGetTeamMembers } from "@/hooks/api/useUsers";
import { useAuth } from "@/contexts/AuthContext";
import axiosInstance from "@/lib/axios";
import type { LeadWithNames, LiveLocation } from "../helpers/leads.type";
import { LocationPickerModal } from "./LocationPickerModal";

type Option = { value: string; label: string };

const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en`,
            {
                headers: {
                    'User-Agent': 'tms-web/1.0',
                },
            }
        );
        if (!res.ok) return null;
        const data = await res.json();
        return data?.display_name || null;
    } catch {
        return null;
    }
};

const COUNTRY_OPTIONS: Option[] = [
    { label: "India", value: "India" },
    { label: "Nepal", value: "Nepal" },
    { label: "Sri Lanka", value: "Sri Lanka" },
    { label: "UAE", value: "UAE" },
    { label: "United States", value: "United States" },
    { label: "United Kingdom", value: "United Kingdom" },
];

const FIRST_INTERACTION_OPTIONS = [
    { value: "call", label: "Call" },
    { value: "mail", label: "Mail" },
    { value: "visit", label: "Visit" },
    { value: "letter", label: "Letter" },
    { value: "whatsapp", label: "WhatsApp" },
];

const LeadFormSchema = z.object({
    companyName: z.string().min(1, { message: "Company name is required" }),
    name: z.string().min(1, { message: "Person name is required" }),
    designation: z.string().optional(),
    phone: z.string().min(1, { message: "Phone is required" }),
    email: z.string().email({ message: "A valid email is required" }).optional().or(z.literal("")),
    address: z.string().min(1, { message: "Address is required" }),
    country: z.string().min(1, { message: "Country is required" }),
    state: z.string().min(1, { message: "State is required" }),
    type: z.string().optional(),
    industry: z.string().optional(),
    allocatedTe: z.string().optional(),
    addFirstInteraction: z.boolean().optional(),
    firstInteractionType: z.enum(["call", "mail", "visit", "letter", "whatsapp"]).optional(),
});

type LeadFormValues = z.infer<typeof LeadFormSchema>;

interface LeadFormProps {
    mode: "create" | "edit";
    lead?: LeadWithNames;
}

const fetchStates = async (): Promise<Option[]> => {
    const res = await axiosInstance.get('/states');
    return res.data.map((s: { id: number; name: string }) => ({
        label: s.name,
        value: s.name,
    }));
};

const fetchLeadTypes = async (): Promise<Option[]> => {
    const res = await axiosInstance.get('/lead-types');
    return res.data.map((t: { id: number; name: string }) => ({
        label: t.name,
        value: t.id.toString(),
    }));
};

const fetchIndustries = async (): Promise<Option[]> => {
    const res = await axiosInstance.get('/lead-industries');
    return res.data.map((i: { id: number; name: string }) => ({
        label: i.name,
        value: i.id.toString(),
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

export function LeadForm({ mode, lead }: LeadFormProps) {
    const navigate = useNavigate();
    const location = useLocation();
    // Return to whichever list page the user came from (Leads or Happy Calling).
    const returnTo =
        (location.state as { from?: string } | null)?.from ?? paths.crm.happyCalling;
    const createLead = useCreateLead();
    const updateLead = useUpdateLead();
    const { user, roleId, effectiveTeamId } = useAuth();

    const isInitialLoad = useRef(true);
    const previousCountry = useRef<string>("");

    const { data: stateOptions = [] } = useQuery({
        queryKey: ["states"],
        queryFn: fetchStates,
    });

    const { data: typeOptions = [] } = useQuery({
        queryKey: ["lead-types"],
        queryFn: fetchLeadTypes,
    });

    const { data: industryOptions = [] } = useQuery({
        queryKey: ["lead-industries"],
        queryFn: fetchIndustries,
    });

    const { data: teamMembers = [], isLoading: teamMembersLoading } = useGetTeamMembers(
        effectiveTeamId ?? 0
    );

    const teamMemberOptions = teamMembers.map((member) => ({
        value: member.id.toString(),
        label: member.name ?? "",
    }));

    const canChangeTE = roleId != null && [1, 2, 4].includes(roleId);

    const form = useForm<LeadFormValues>({
        resolver: zodResolver(LeadFormSchema) as any,
        defaultValues: {
            companyName: lead?.companyName || "",
            name: lead?.name || "",
            designation: lead?.designation || "Not Available",
            phone: lead?.phone || "",
            email: lead?.email || "",
            address: lead?.address || "",
            country: lead?.country || "",
            state: lead?.state || "",
            type: lead?.type || "",
            industry: lead?.industry || "",
            allocatedTe: mode === "create" ? (user?.id?.toString() ?? "") : (lead?.allocatedTe?.toString() ?? ""),
            addFirstInteraction: false,
            firstInteractionType: "call",
        },
    });

    const country = useWatch({ control: form.control, name: "country" });
    const isIndia = country === "India";
    const addFirstInteraction = form.watch("addFirstInteraction") ?? false;

    const [locationBlocked, setLocationBlocked] = useState(false);
    const [locationModal, setLocationModal] = useState<{ open: boolean; lat?: number; lng?: number }>({ open: false });
    const [liveLocation, setLiveLocation] = useState<LiveLocation | null>(
        mode === "edit" && lead?.liveLocation ? lead.liveLocation : null
    );

    const requestLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setLocationBlocked(true);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocationBlocked(false);
                reverseGeocode(pos.coords.latitude, pos.coords.longitude).then((address) => {
                    setLiveLocation({
                        address,
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                        capturedAt: new Date().toISOString(),
                    });
                });
            },
            () => setLocationBlocked(true),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }, []);

    useEffect(() => {
        if (mode !== "create") return;
        if (!addFirstInteraction) return;
        if (liveLocation) return;
        requestLocation();
    }, [mode, addFirstInteraction, liveLocation, requestLocation]);

    useEffect(() => {
        if (mode !== "create") return;
        if (addFirstInteraction) return;
        setLocationBlocked(false);
    }, [mode, addFirstInteraction]);

    // Auto-select current user as TE in create mode (until the async user loads)
    useEffect(() => {
        if (mode !== "create") return;
        if (!user?.id) return;
        form.setValue("allocatedTe", user.id.toString(), { shouldValidate: false });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, user?.id]);

    const handleLocationConfirm = useCallback((loc: LiveLocation) => {
        setLiveLocation(loc);
        setLocationModal({ open: false });
    }, []);

    const isLocationRequired = mode === "create";
    const formDisabled = isLocationRequired && locationBlocked;

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

    const handleSubmit: SubmitHandler<LeadFormValues> = async (values) => {
        try {
            const payload = {
                companyName: values.companyName,
                name: values.name,
                designation: values.designation || "Not Available",
                phone: values.phone,
                email: values.email || null,
                address: values.address,
                country: values.country,
                state: values.state,
                type: values.type || null,
                industry: values.industry || null,
                team: null,
                allocatedTe: values.allocatedTe ? Number(values.allocatedTe) : null,
                liveLocation,
            };

            if (mode === "create") {
                const created = await createLead.mutateAsync(payload);
                if (values.addFirstInteraction && created?.id) {
                    const tab = values.firstInteractionType ?? "call";
                    navigate(`${paths.crm.leadFollowup(created.id)}?tab=${tab}&step=2`);
                    return;
                }
            } else if (mode === "edit" && lead) {
                await updateLead.mutateAsync({
                    id: lead.id,
                    data: payload,
                });
            }

            navigate(returnTo);
        } catch (error) {
            console.error("Lead form submission error:", error);
        }
    };

    const saving = createLead.isPending || updateLead.isPending;

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    {mode === "create" ? "Create New Lead" : "Edit Lead"}
                </CardTitle>
                <CardAction>
                    <Button
                        variant="outline"
                        onClick={() => navigate(returnTo)}
                    >
                        <ArrowLeft />
                        Return Back
                    </Button>
                </CardAction>
            </CardHeader>

            <CardContent>
                {mode === "create" && (
                    <div className="mb-6 flex items-center gap-3 text-sm">
                        <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                                1
                            </span>
                            <span className="font-medium">Basic Details</span>
                        </div>
                        <div className="h-px w-10 bg-border" />
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold">
                                2
                            </span>
                            <span>First Interaction</span>
                        </div>
                    </div>
                )}

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(handleSubmit)}
                        className="space-y-6"
                    >
                        {/* Location permission blocked (create only) */}
                        {isLocationRequired && locationBlocked && (
                            <Alert variant="destructive" className="mb-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1">
                                            <p>
                                                Location access is required to create a lead. Please allow
                                                location access to continue.
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                To allow location: click the lock icon in the browser
                                                address bar → Site Settings → Location → Allow, then
                                                click Reload below.
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="shrink-0"
                                            onClick={() => window.location.reload()}
                                        >
                                            <MapPin className="mr-1 h-4 w-4" />
                                            Reload Page
                                        </Button>
                                    </div>
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Live location display */}
                        {!locationBlocked && liveLocation && (
                            <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
                                <MapPin className="h-4 w-4 text-red-600 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium">Live Location (creator)</p>
                                    <p className="text-sm text-muted-foreground">
                                        {liveLocation.address || "Address not resolved"}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Lat: {liveLocation.latitude?.toFixed(6) ?? "—"} · Lng:{" "}
                                        {liveLocation.longitude?.toFixed(6) ?? "—"}
                                    </p>
                                </div>
                                {isLocationRequired && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                            setLocationModal({
                                                open: true,
                                                lat: liveLocation.latitude ?? undefined,
                                                lng: liveLocation.longitude ?? undefined,
                                            })
                                        }
                                    >
                                        <MapPin className="mr-1 h-4 w-4" />
                                        Change Location
                                    </Button>
                                )}
                            </div>
                        )}

                        <fieldset disabled={formDisabled} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                                <SectionSeparator text="Basic Information" />

                                <FieldWrapper<LeadFormValues, "companyName">
                                    control={form.control}
                                    name="companyName"
                                    label="Company Name"
                                >
                                    {(field) => (
                                        <Input placeholder="Enter company name" {...field} />
                                    )}
                                </FieldWrapper>

                                <FieldWrapper<LeadFormValues, "name">
                                    control={form.control}
                                    name="name"
                                    label="Person Name"
                                >
                                    {(field) => (
                                        <Input placeholder="Enter person name" {...field} />
                                    )}
                                </FieldWrapper>

                                <FieldWrapper<LeadFormValues, "designation">
                                    control={form.control}
                                    name="designation"
                                    label="Designation"
                                >
                                    {(field) => (
                                        <Input placeholder="Enter designation" {...field} />
                                    )}
                                </FieldWrapper>

                                <FieldWrapper<LeadFormValues, "phone">
                                    control={form.control}
                                    name="phone"
                                    label="Phone"
                                >
                                    {(field) => (
                                        <Input
                                            type="tel"
                                            placeholder="Enter phone number"
                                            {...field}
                                        />
                                    )}
                                </FieldWrapper>

                                <FieldWrapper<LeadFormValues, "email">
                                    control={form.control}
                                    name="email"
                                    label="Email"
                                >
                                    {(field) => (
                                        <Input
                                            type="email"
                                            placeholder="Enter email address"
                                            {...field}
                                        />
                                    )}
                                </FieldWrapper>

                                <FieldWrapper<LeadFormValues, "address">
                                    control={form.control}
                                    name="address"
                                    label="Address"
                                >
                                    {(field) => (
                                        <Input placeholder="Enter address" {...field} />
                                    )}
                                </FieldWrapper>

                                <SectionSeparator text="Location Details" />

                                <SelectField<LeadFormValues, "country">
                                    control={form.control}
                                    name="country"
                                    label="Country"
                                    options={COUNTRY_OPTIONS}
                                    placeholder="Select Country"
                                />

                                {isIndia ? (
                                    <SelectField<LeadFormValues, "state">
                                        control={form.control}
                                        name="state"
                                        label="State"
                                        options={stateOptions}
                                        placeholder="Select State"
                                    />
                                ) : (
                                    <FieldWrapper<LeadFormValues, "state">
                                        control={form.control}
                                        name="state"
                                        label="State"
                                    >
                                        {(field) => (
                                            <Input
                                                placeholder="Enter state name"
                                                disabled={!country}
                                                {...field}
                                            />
                                        )}
                                    </FieldWrapper>
                                )}

                                <SectionSeparator text="Lead Details" />

                                <SelectField<LeadFormValues, "type">
                                    control={form.control}
                                    name="type"
                                    label="Type"
                                    options={typeOptions}
                                    placeholder="Select Type"
                                />

                                <SelectField<LeadFormValues, "industry">
                                    control={form.control}
                                    name="industry"
                                    label="Industry"
                                    options={industryOptions}
                                    placeholder="Select Industry"
                                />

                                <SelectField<LeadFormValues, "allocatedTe">
                                    control={form.control}
                                    name="allocatedTe"
                                    label="Allocate Team Member"
                                    options={teamMemberOptions}
                                    placeholder={
                                        teamMembersLoading
                                            ? "Loading team members..."
                                            : "-- Select Team Member --"
                                    }
                                    disabled={!canChangeTE}
                                />

                            </div>

                            {mode === "create" && (
                                <div className="rounded-lg border bg-muted/30 p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h3 className="text-sm font-medium">First Interaction</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Want to add first interaction details?
                                            </p>
                                        </div>
                                        <Switch
                                            checked={form.watch("addFirstInteraction") ?? false}
                                            onCheckedChange={(checked) =>
                                                form.setValue("addFirstInteraction", checked)
                                            }
                                            disabled={saving || formDisabled}
                                        />
                                    </div>

                                    {form.watch("addFirstInteraction") && (
                                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <SelectField<LeadFormValues, "firstInteractionType">
                                                control={form.control}
                                                name="firstInteractionType"
                                                label="Interaction Type"
                                                options={FIRST_INTERACTION_OPTIONS}
                                                placeholder="Select Interaction Type"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="w-full flex items-center justify-center gap-2 pt-2">
                                <Button type="submit" disabled={saving || formDisabled}>
                                    {saving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : mode === "create" ? (
                                        form.watch("addFirstInteraction")
                                            ? "Save & Add First Interaction"
                                            : "Create Lead"
                                    ) : (
                                        "Update Lead"
                                    )}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => navigate(returnTo)}
                                    disabled={saving}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => form.reset()}
                                    disabled={saving}
                                >
                                    Reset
                                </Button>
                            </div>
                        </fieldset>
                    </form>
                </Form>

                <LocationPickerModal
                    open={locationModal.open}
                    onOpenChange={(open) => setLocationModal((m) => ({ ...m, open }))}
                    initialLat={locationModal.lat}
                    initialLng={locationModal.lng}
                    onConfirm={handleLocationConfirm}
                />
            </CardContent>
        </Card>
    );
}