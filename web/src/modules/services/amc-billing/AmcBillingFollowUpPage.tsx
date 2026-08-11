"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Users, AlertCircle } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form } from "@/components/ui/form";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { ContactPersonForm } from "@/components/form/contactpersonform";
import { FollowUpFrequencySelect } from "@/components/form/FollowUpFrequencySelect";
import { FollowupEmailEditor } from "@/components/form/FollowupEmailEditor";
import DateInput from "@/components/form/DateInput";

import { paths } from "@/app/routes/paths";
import { useAmcBilling } from "@/hooks/api/useAmcBilling";
import { useCreateFollowUp } from "@/modules/shared/follow-up/follow-up.hooks";
import type { CreateFollowUpDto } from "@/modules/shared/follow-up/follow-up.types";

const AREAS = [
    { id: 1, name: "PG Personal" },
    { id: 2, name: "Accounts" },
    { id: 3, name: "AC Team" },
    { id: 4, name: "DC team" },
];

const ContactSchema = z.object({
    name: z.string().min(1, "Name is required"),
    designation: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    email: z.string().email().optional().nullable(),
});

const AmcFollowupSchema = z.object({
    organisation_name: z.string().min(1, "Organisation name is required"),
    contacts: z.array(ContactSchema).min(1, "At least one contact is required"),
    followup_start_date: z.string().optional(),
    frequency: z.number().int().min(1).max(8).optional(),
    emailBody: z.string().optional(),
});

type AmcFollowupForm = z.infer<typeof AmcFollowupSchema>;

const AmcBillingFollowUpPage = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const billId = id ? Number(id) : null;

    const { data: billing, isLoading, error } = useAmcBilling(billId ?? 0);
    const createFollowup = useCreateFollowUp();

    const form = useForm<AmcFollowupForm>({
        resolver: zodResolver(AmcFollowupSchema) as Resolver<AmcFollowupForm>,
        defaultValues: {
            organisation_name: "",
            contacts: [],
            followup_start_date: "",
            frequency: 1,
        },
    });

    useEffect(() => {
        if (!billing) return;

        // Priority: orgAcronym → orgName → projectName
        const orgName =
            billing.amc?.orgAcronym ||
            billing.amc?.orgName ||
            billing.amc?.projectName ||
            "";

        if (orgName && !form.getValues("organisation_name")) {
            form.setValue("organisation_name", orgName);
        }

        const siteContacts = billing.site?.contacts ?? [];
        if (siteContacts.length > 0 && form.getValues("contacts").length === 0) {
            form.setValue(
                "contacts",
                siteContacts.map(c => ({
                    name: c.name ?? "",
                    designation: "",
                    phone: c.mobile ?? "",
                    email: c.email ?? "",
                })),
            );
        }
    }, [billing, form]);

    const isSubmitting = form.formState.isSubmitting || createFollowup.isPending;

    const handleSubmit = async (values: AmcFollowupForm) => {
        if (!billing) return;

        const teamArea =
            AREAS.find(
                a =>
                    a.name.toLowerCase().replace(/\s+/g, "") ===
                    (billing.amc?.teamName ?? "").toLowerCase().replace(/\s+/g, ""),
            )?.name ?? billing.amc?.teamName ?? "";

        const payload: CreateFollowUpDto = {
            area: teamArea,
            partyName: values.organisation_name,
            amount: billing.amount != null ? Number(billing.amount) || 0 : 0,
            followupFor: "AMC Billing",
            assignedToId: null,
            details: values.emailBody ?? null,
            contacts:
                values.contacts?.map(c => ({
                    name: c.name ?? null,
                    designation: c.designation || null,
                    email: c.email || null,
                    phone: c.phone || null,
                    org: values.organisation_name ?? null,
                })) || [],
            frequency: values.frequency ?? null,
            startFrom: values.followup_start_date || undefined,
        };

        try {
            await createFollowup.mutateAsync(payload);
            toast.success("Follow-up initiated successfully");
            navigate(paths.services.amcBilling);
            form.reset();
        } catch (error: unknown) {
            const err = error as {
                response?: { data?: { message?: string } };
                message?: string;
            };
            const message =
                err?.response?.data?.message ||
                err?.message ||
                "Failed to initiate follow-up";
            toast.error(message);
            console.error("Error initiating follow-up:", error);
        }
    };

    if (!billId) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Billing ID is required</AlertDescription>
            </Alert>
        );
    }

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                </CardHeader>
            </Card>
        );
    }

    if (error || !billing) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Failed to load billing details</AlertDescription>
            </Alert>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Initiate Followup</h3>
                </div>

                {/* Info strip showing what was resolved */}
                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                    {billing.amc?.orgAcronym && (
                        <span>
                            <span className="font-medium text-foreground">Acronym:</span>{" "}
                            {billing.amc.orgAcronym}
                        </span>
                    )}
                    {billing.amc?.orgName && (
                        <span>
                            <span className="font-medium text-foreground">Organisation:</span>{" "}
                            {billing.amc.orgName}
                        </span>
                    )}
                    {billing.amc?.projectName && (
                        <span>
                            <span className="font-medium text-foreground">Project:</span>{" "}
                            {billing.amc.projectName}
                        </span>
                    )}
                </div>
            </CardHeader>

            <CardContent>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(handleSubmit)}
                        className="space-y-6"
                    >
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FieldWrapper
                                    control={form.control}
                                    name="organisation_name"
                                    label="Organisation Name"
                                >
                                    {field => (
                                        <Input
                                            {...field}
                                            placeholder="Enter organisation name"
                                        />
                                    )}
                                </FieldWrapper>
                            </div>

                            <div>
                                <ContactPersonForm
                                    control={form.control}
                                    name="contacts"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FieldWrapper
                                    control={form.control}
                                    name="followup_start_date"
                                    label="Follow-up Start Date"
                                >
                                    {field => (
                                        <DateInput
                                            value={field.value}
                                            onChange={field.onChange}
                                        />
                                    )}
                                </FieldWrapper>
                                <FollowUpFrequencySelect
                                    control={form.control}
                                    name="frequency"
                                />
                            </div>

                            <div className="pt-4 border-t">
                                <FollowupEmailEditor
                                    instrumentType="Quotation"
                                    templateData={{
                                        projectName: billing.amc?.projectName,
                                        amount: billing.amount,
                                    }}
                                    onEmailBodyChange={html =>
                                        form.setValue("emailBody", html, {
                                            shouldValidate: false,
                                        })
                                    }
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 pt-4 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate(-1)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Submitting..." : "Initiate Followup"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
};

export default AmcBillingFollowUpPage;