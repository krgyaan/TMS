import { useEffect, useRef } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { type SubmitHandler, useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router-dom";
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
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { ArrowLeft, Loader2 } from "lucide-react";
import { paths } from "@/app/routes/paths";
import { useCreateLead } from "@/hooks/api/useLeads";
import axiosInstance from "@/lib/axios";

type Option = { value: string; label: string };

const COUNTRY_OPTIONS: Option[] = [
    { label: "India", value: "India" },
    { label: "Nepal", value: "Nepal" },
    { label: "Sri Lanka", value: "Sri Lanka" },
    { label: "UAE", value: "UAE" },
    { label: "United States", value: "United States" },
    { label: "United Kingdom", value: "United Kingdom" },
];

const LeadFormSchema = z.object({
    companyName: z.string().min(1, { message: "Company name is required" }),
    name: z.string().min(1, { message: "Person name is required" }),
    designation: z.string().min(1, { message: "Designation is required" }),
    phone: z.string().min(1, { message: "Phone is required" }),
    email: z.string().email({ message: "A valid email is required" }),
    address: z.string().min(1, { message: "Address is required" }),
    country: z.string().min(1, { message: "Country is required" }),
    state: z.string().min(1, { message: "State is required" }),
    type: z.string().optional(),
    industry: z.string().optional(),
    team: z.string().optional(),
    pointsDiscussed: z.string().max(2000).optional(),
    veResponsibility: z.string().max(2000).optional(),
});

type LeadFormValues = z.infer<typeof LeadFormSchema>;

interface LeadFormProps {
    mode: "create" | "edit";
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

const fetchTeams = async (): Promise<Option[]> => {
    const res = await axiosInstance.get('/teams');
    return res.data.map((t: { id: number; name: string }) => ({
        label: t.name,
        value: t.id.toString(),
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

export function LeadForm({ mode }: LeadFormProps) {
    const navigate = useNavigate();
    const createLead = useCreateLead();

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

    const { data: teamOptions = [] } = useQuery({
        queryKey: ["teams"],
        queryFn: fetchTeams,
    });

    const form = useForm<LeadFormValues>({
        resolver: zodResolver(LeadFormSchema) as any,
        defaultValues: {
            companyName: "",
            name: "",
            designation: "",
            phone: "",
            email: "",
            address: "",
            country: "",
            state: "",
            type: undefined,
            industry: undefined,
            team: undefined,
            pointsDiscussed: "",
            veResponsibility: "",
        },
    });

    const country = useWatch({ control: form.control, name: "country" });
    const isIndia = country === "India";

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
            await createLead.mutateAsync({
                companyName: values.companyName,
                name: values.name,
                designation: values.designation,
                phone: values.phone,
                email: values.email,
                address: values.address,
                country: values.country,
                state: values.state,
                type: values.type || null,
                industry: values.industry || null,
                team: values.team || null,
                pointsDiscussed: values.pointsDiscussed || null,
                veResponsibility: values.veResponsibility || null,
            });
        } catch (error) {
            console.error("Lead form submission error:", error);
        }
    };

    const saving = createLead.isPending;

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    {mode === "create" ? "Create New Lead" : "Edit Lead"}
                </CardTitle>
                <CardAction>
                    <Button
                        variant="outline"
                        onClick={() => navigate(paths.crm.leads)}
                    >
                        <ArrowLeft />
                        Return Back
                    </Button>
                </CardAction>
            </CardHeader>

            <CardContent>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(handleSubmit)}
                        className="space-y-6"
                    >
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

                            <SelectField<LeadFormValues, "team">
                                control={form.control}
                                name="team"
                                label="Team"
                                options={teamOptions}
                                placeholder="Select Team"
                            />

                            <SectionSeparator text="Additional Details" />

                            <div className="col-span-full">
                                <FieldWrapper<LeadFormValues, "pointsDiscussed">
                                    control={form.control}
                                    name="pointsDiscussed"
                                    label="Points Discussed"
                                >
                                    {(field) => (
                                        <textarea
                                            className="border-input placeholder:text-muted-foreground dark:bg-input/30 h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                            placeholder="Enter discussion points..."
                                            maxLength={2000}
                                            {...field}
                                        />
                                    )}
                                </FieldWrapper>
                            </div>

                            <div className="col-span-full">
                                <FieldWrapper<LeadFormValues, "veResponsibility">
                                    control={form.control}
                                    name="veResponsibility"
                                    label="VE Responsibility"
                                >
                                    {(field) => (
                                        <textarea
                                            className="border-input placeholder:text-muted-foreground dark:bg-input/30 h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                            placeholder="Enter VE responsibilities..."
                                            maxLength={2000}
                                            {...field}
                                        />
                                    )}
                                </FieldWrapper>
                            </div>

                        </div>

                        <div className="w-full flex items-center justify-center gap-2 pt-2">
                            <Button type="submit" disabled={saving}>
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : mode === "create" ? (
                                    "Create Lead"
                                ) : (
                                    "Update Lead"
                                )}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate(paths.crm.leads)}
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
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}