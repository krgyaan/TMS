import { forwardRef, useEffect, useImperativeHandle, useMemo, useState, type ChangeEvent } from "react";
import { X } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField, type SelectOption } from "@/components/form/SelectField";

const branchAddressSchema = z.object({
    value: z.string().optional().or(z.literal("")),
});

const companyFormSchema = z.object({
    name: z.string().min(1, { message: "Company name is required" }),
    entityType: z.string().min(1, { message: "Select entity type" }),
    registeredAddress: z.string().min(1, { message: "Registered address is required" }),
    branchAddresses: z.array(branchAddressSchema),
    about: z.string().optional().or(z.literal("")),
    website: z.string().url({ message: "Enter a valid URL" }).optional().or(z.literal("")),
    phone: z.string().optional().or(z.literal("")),
    email: z.string().email({ message: "Enter a valid email" }).optional().or(z.literal("")),
    fax: z.string().optional().or(z.literal("")),
    signatoryName: z.string().optional().or(z.literal("")),
    designation: z.string().optional().or(z.literal("")),
    tenderKeywords: z.array(z.string()).optional(),
});

export type CompanyFormValues = z.infer<typeof companyFormSchema>;

export type PreparedCompanyValues = {
    name: string;
    entityType: string;
    registeredAddress: string;
    branchAddresses: string[];
    about: string;
    website: string;
    phone: string;
    email: string;
    fax: string;
    signatoryName: string;
    designation: string;
    tenderKeywords: string[];
};

export type CompanyFormHandle = {
    submit: () => void;
};

type CompanyFormProps = {
    mode: "create" | "update";
    initialValues?: PreparedCompanyValues | null;
    onSubmit: (values: PreparedCompanyValues) => Promise<boolean>;
    onSuccess?: (values: PreparedCompanyValues) => void;
    onReset?: () => void;
    submitting: boolean;
    serverMessage: string | null;
    serverError: string | null;
};

const entityTypeOptions: SelectOption[] = [
    { id: "", name: "Select Entity Type" },
    { id: "private_limited", name: "Private Limited" },
    { id: "public_limited", name: "Public Limited" },
    { id: "partnership", name: "Partnership" },
    { id: "llp", name: "LLP" },
    { id: "proprietorship", name: "Proprietorship" },
    { id: "government", name: "Government" },
    { id: "psu", name: "PSU" },
    { id: "ngo", name: "NGO" },
    { id: "other", name: "Other" },
];

const textareaClass =
    "min-h-[110px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const defaultValues: CompanyFormValues = {
    name: "",
    entityType: "",
    registeredAddress: "",
    branchAddresses: [{ value: "" }],
    about: "",
    website: "",
    phone: "",
    email: "",
    fax: "",
    signatoryName: "",
    designation: "",
    tenderKeywords: [],
};

const normalizeWebsite = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
};

const sanitizeArray = (items: string[] | undefined) =>
    (items ?? [])
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

const toFormValues = (values?: PreparedCompanyValues | null): CompanyFormValues => {
    if (!values) {
        return {
            ...defaultValues,
            branchAddresses: defaultValues.branchAddresses.map((entry) => ({ ...entry })),
            tenderKeywords: [...(defaultValues.tenderKeywords ?? [])],
        };
    }

    const branchList = (values.branchAddresses ?? []).length > 0 ? values.branchAddresses : [""];

    return {
        name: values.name,
        entityType: values.entityType,
        registeredAddress: values.registeredAddress,
        branchAddresses: branchList.map((entry) => ({ value: entry })),
        about: values.about ?? "",
        website: values.website ?? "",
        phone: values.phone ?? "",
        email: values.email ?? "",
        fax: values.fax ?? "",
        signatoryName: values.signatoryName ?? "",
        designation: values.designation ?? "",
        tenderKeywords: [...(values.tenderKeywords ?? [])],
    };
};

export const CompanyDetailsForm = forwardRef<CompanyFormHandle, CompanyFormProps>(
    ({ mode, initialValues, onSubmit, onSuccess, onReset, submitting, serverMessage, serverError }, ref) => {
        const form = useForm<CompanyFormValues>({
            resolver: zodResolver(companyFormSchema),
            defaultValues,
        });

        const { control, handleSubmit, reset, setValue, getValues, watch } = form;
        const branchFields = useFieldArray({ control, name: "branchAddresses" });
        const tenderKeywords = watch("tenderKeywords") ?? [];
        const [tagInput, setTagInput] = useState("");

        const initialFormValues = useMemo(() => toFormValues(initialValues), [initialValues]);

        useEffect(() => {
            reset(initialFormValues);
            setTagInput("");
        }, [initialFormValues, reset]);

        const entityOptions = useMemo(
            () => entityTypeOptions.filter((option) => option.id !== ""),
            []
        );

        const preparePayload = (values: CompanyFormValues): PreparedCompanyValues => {
            const branchAddresses = sanitizeArray(
                (values.branchAddresses ?? []).map((entry) => entry?.value ?? "")
            );
            const tenderTags = sanitizeArray(values.tenderKeywords);

            return {
                name: values.name.trim(),
                entityType: values.entityType,
                registeredAddress: values.registeredAddress.trim(),
                branchAddresses,
                about: values.about?.trim() ?? "",
                website: values.website ? normalizeWebsite(values.website) : "",
                phone: values.phone?.trim() ?? "",
                email: values.email?.trim() ?? "",
                fax: values.fax?.trim() ?? "",
                signatoryName: values.signatoryName?.trim() ?? "",
                designation: values.designation?.trim() ?? "",
                tenderKeywords: tenderTags,
            };
        };

        const executeSubmit = handleSubmit(async (values) => {
            const prepared = preparePayload(values);
            const ok = await onSubmit(prepared);
            if (ok) {
                reset(toFormValues(prepared));
                setTagInput("");
                onSuccess?.(prepared);
            }
        });

        useImperativeHandle(ref, () => ({ submit: () => void executeSubmit() }));

        const handleReset = () => {
            reset(initialFormValues);
            setTagInput("");
            onReset?.();
        };

        const handleTagAdd = () => {
            const tag = tagInput.trim();
            if (!tag) return;
            const existing = getValues("tenderKeywords") ?? [];
            if (existing.includes(tag)) {
                setTagInput("");
                return;
            }
            setValue("tenderKeywords", [...existing, tag], {
                shouldDirty: true,
                shouldValidate: true,
            });
            setTagInput("");
        };

        const handleTagRemove = (tag: string) => {
            const next = tenderKeywords.filter((item) => item !== tag);
            setValue("tenderKeywords", next, { shouldDirty: true, shouldValidate: true });
        };

        const isUpdate = mode === "update";
        const cardTitle = isUpdate ? "Company Details" : "Create Company";
        const cardDescription = isUpdate
            ? "Review the saved company information and update it whenever needed."
            : "Capture master information for a new company profile.";
        const submitButtonLabel = submitting
            ? isUpdate
                ? "Saving..."
                : "Submitting..."
            : isUpdate
                ? "Update Company"
                : "Create Company";
        const resetLabel = isUpdate ? "Revert Changes" : "Reset";

        return (
            <Card>
                <CardHeader>
                    <CardTitle>{cardTitle}</CardTitle>
                    <CardDescription>{cardDescription}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={(event) => { event.preventDefault(); void executeSubmit(); }} className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <FieldWrapper control={control} name="name" label="Company Name">
                                    {(field) => <Input placeholder="Volks Energie Pvt. Ltd." {...field} />}
                                </FieldWrapper>
                                <SelectField
                                    control={control}
                                    name="entityType"
                                    label="Entity Type"
                                    options={[{ id: "", name: "Select Entity Type" }, ...entityOptions]}
                                    placeholder="Select Entity Type"
                                />
                                <FieldWrapper control={control} name="registeredAddress" label="Registered Address">
                                    {(field) => (
                                        <textarea
                                            {...field}
                                            className={textareaClass}
                                            placeholder="Street, City, State, Zip"
                                        />
                                    )}
                                </FieldWrapper>
                                <FieldWrapper control={control} name="about" label="About Company">
                                    {(field) => (
                                        <textarea
                                            {...field}
                                            className={textareaClass}
                                            placeholder="Brief overview about the organization"
                                        />
                                    )}
                                </FieldWrapper>
                                <FieldWrapper control={control} name="website" label="Company Website">
                                    {(field) => (
                                        <div className="flex items-center rounded-md border border-input bg-background text-sm shadow-xs focus-within:ring-2 focus-within:ring-ring/50 focus-within:ring-offset-2">
                                            <span className="px-3 text-muted-foreground">https://</span>
                                            <input
                                                type="text"
                                                className="h-9 w-full bg-transparent px-3 text-sm outline-none"
                                                placeholder="example.com"
                                                value={field.value?.replace(/^https?:\/\//i, "") ?? ""}
                                                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                                    field.onChange(normalizeWebsite(event.target.value))
                                                }
                                            />
                                        </div>
                                    )}
                                </FieldWrapper>
                                <FieldWrapper control={control} name="phone" label="Office Phone Number">
                                    {(field) => <Input placeholder="+91 90000 00000" {...field} />}
                                </FieldWrapper>
                                <FieldWrapper control={control} name="email" label="Office Email ID">
                                    {(field) => <Input type="email" placeholder="info@company.com" {...field} />}
                                </FieldWrapper>
                                <FieldWrapper control={control} name="fax" label="Office Fax">
                                    {(field) => <Input placeholder="011-23456789" {...field} />}
                                </FieldWrapper>
                                <FieldWrapper control={control} name="signatoryName" label="Authorized Signatory Name">
                                    {(field) => <Input placeholder="Authorized Person" {...field} />}
                                </FieldWrapper>
                                <FieldWrapper control={control} name="designation" label="Designation">
                                    {(field) => <Input placeholder="Director" {...field} />}
                                </FieldWrapper>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-medium">Branch Office Addresses</h3>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => branchFields.append({ value: "" })}
                                    >
                                        Add Branch
                                    </Button>
                                </div>
                                <div className="space-y-4">
                                    {branchFields.fields.map((fieldItem, index) => (
                                        <div key={fieldItem.id} className="space-y-2">
                                            <textarea
                                                className={textareaClass}
                                                placeholder="Branch address"
                                                {...form.register(`branchAddresses.${index}.value` as const)}
                                            />
                                            <div className="flex justify-end">
                                                {branchFields.fields.length > 1 ? (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => branchFields.remove(index)}
                                                    >
                                                        Remove
                                                    </Button>
                                                ) : null}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-sm font-medium">Company Tender Preferences / Keywords</h3>
                                <div className="flex flex-wrap gap-2">
                                    {tenderKeywords.map((tag) => (
                                        <span
                                            key={tag}
                                            className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
                                        >
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => handleTagRemove(tag)}
                                                className="ml-1 inline-flex rounded-full p-0.5 text-secondary-foreground/70 transition hover:bg-secondary-foreground/10 hover:text-secondary-foreground"
                                            ><X className="size-3" /></button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <Input
                                        placeholder="Add keyword and press enter"
                                        value={tagInput}
                                        onChange={(event) => setTagInput(event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter") {
                                                event.preventDefault();
                                                handleTagAdd();
                                            }
                                        }}
                                    />
                                    <Button type="button" onClick={handleTagAdd}>
                                        Add Tag
                                    </Button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button type="submit" disabled={submitting}>
                                    {submitButtonLabel}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={submitting}
                                    onClick={handleReset}
                                >
                                    {resetLabel}
                                </Button>
                            </div>
                            {serverError ? (
                                <FeedbackMessage tone="error" description={serverError} />
                            ) : null}
                            {serverMessage && !serverError ? (
                                <FeedbackMessage tone="success" description={serverMessage} />
                            ) : null}
                        </form>
                    </Form>
                </CardContent>
            </Card>
        );
    }
);

CompanyDetailsForm.displayName = "CompanyDetailsForm";

export default CompanyDetailsForm;
