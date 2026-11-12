import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { ArrowLeft, FileText, Loader2, Save, Trash2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { ContactPersonFields } from "@/components/form/ContactPersonFields";
import DateInput from "@/components/form/DateInput";
import { TiptapEditor } from "@/components/tiptapeditor";
import { FileUploader } from "@/components/file-upload";

import { paths } from "@/app/routes/paths";
import { useUsers } from "@/hooks/api/useUsers";
import { useFollowupCategories } from "@/hooks/api/useFollowupCategories";
import { useCreateFollowUp, useUpdateFollowUp } from "@/hooks/api/useFollowUps";
import { AREA_OPTIONS, FREQUENCY_OPTIONS, STOP_REASON_OPTIONS } from "../helpers/followUp.constants";
import {
    followUpCreateFormSchema,
    followUpEditFormSchema,
    type FollowUpCreateFormValues,
    type FollowUpEditFormValues,
} from "../helpers/followUp.schema";
import {
    buildCreateDefaults,
    mapCreateFormToPayload,
    mapDetailsToEditForm,
    mapEditFormToPayload,
} from "../helpers/followUp.mappers";
import type { FollowUpDetails } from "../helpers/followUp.types";
import { buildFileUrl, getFileName } from "../helpers/followUp.utils";

type FollowUpFormProps = { mode: "create" } | { mode: "edit"; existingData: FollowUpDetails };

export function FollowUpForm(props: FollowUpFormProps) {
    if (props.mode === "create") {
        return <FollowUpCreateForm />;
    }
    return <FollowUpEditForm existingData={props.existingData} />;
}

function FollowUpCreateForm() {
    const navigate = useNavigate();
    const createMutation = useCreateFollowUp();
    const { data: users = [] } = useUsers();
    const { data: categories = [] } = useFollowupCategories();

    const form = useForm<FollowUpCreateFormValues>({
        resolver: zodResolver(followUpCreateFormSchema) as Resolver<FollowUpCreateFormValues>,
        defaultValues: buildCreateDefaults(),
    });

    const userOptions = users.map(user => ({ value: String(user.id), label: user.name }));
    const categoryOptions = categories.map(category => ({ value: String(category.name), label: String(category.name) }));
    const isSubmitting = createMutation.isPending || form.formState.isSubmitting;

    const onSubmit = form.handleSubmit(async values => {
        try {
            await createMutation.mutateAsync(mapCreateFormToPayload(values));
            navigate(paths.shared.followUp);
        } catch {
            return;
        }
    });

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Assign Follow-up</CardTitle>
                        <CardDescription className="mt-2">
                            Create a new follow-up and assign it to a team member.
                        </CardDescription>
                    </div>
                    <CardAction>
                        <Button variant="outline" onClick={() => navigate(-1)}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                    </CardAction>
                </div>
            </CardHeader>

            <CardContent>
                <Form {...form}>
                    <form onSubmit={onSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <SelectField
                                control={form.control}
                                name="area"
                                label="Area"
                                options={AREA_OPTIONS}
                                placeholder="Choose area"
                                valueType="string"
                            />
                            <SelectField
                                control={form.control}
                                name="followupFor"
                                label="Followup For"
                                options={categoryOptions}
                                placeholder="Choose reason"
                                valueType="string"
                            />
                            <FieldWrapper
                                control={form.control}
                                name="partyName"
                                label="Organisation"
                            >
                                {field => <Input {...field} placeholder="Enter organisation name" />}
                            </FieldWrapper>
                            
                            <FieldWrapper control={form.control} name="amount" label="Amount">
                                {field => <Input {...field} type="number" placeholder="0" />}
                            </FieldWrapper>
                            <SelectField
                                control={form.control}
                                name="assignedToId"
                                label="Assign To"
                                options={userOptions}
                                placeholder="Choose assignee"
                                valueType="number"
                            />
                        </div>

                        <ContactPersonFields control={form.control} name="contacts" label="Contact Details" />


                        <FieldWrapper control={form.control} name="comment" label="Comment">
                            {field => <Textarea {...field} placeholder="Add a comment" rows={3} className="resize-none" />}
                        </FieldWrapper>

                        <div className="flex justify-end gap-2 border-t pt-6">
                            <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Submit
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

function FollowUpEditForm({ existingData }: { existingData: FollowUpDetails }) {
    const navigate = useNavigate();
    const updateMutation = useUpdateFollowUp();
    const { data: users = [] } = useUsers();

    const [newAttachments, setNewAttachments] = useState<string[]>([]);
    const [existingAttachments, setExistingAttachments] = useState<string[]>(existingData.attachments ?? []);

    const form = useForm<FollowUpEditFormValues>({
        resolver: zodResolver(followUpEditFormSchema) as Resolver<FollowUpEditFormValues>,
        defaultValues: mapDetailsToEditForm(existingData),
    });

    const frequency = form.watch("frequency");
    const stopReason = form.watch("stopReason");

    useEffect(() => {
        form.reset(mapDetailsToEditForm(existingData));
        setExistingAttachments(existingData.attachments ?? []);
        setNewAttachments([]);
    }, [existingData, form]);

    useEffect(() => {
        if (frequency !== 6) {
            form.setValue("stopReason", null);
            form.setValue("proofText", null);
            form.setValue("stopRemarks", null);
            form.setValue("proofImage", null);
        }
    }, [frequency, form]);

    const userOptions = users.map(user => ({ value: String(user.id), label: user.name }));
    const isSubmitting = updateMutation.isPending || form.formState.isSubmitting;

    const removeExistingAttachment = (file: string) => {
        setExistingAttachments(previous => previous.filter(attachment => attachment !== file));
    };

    const onSubmit = form.handleSubmit(async values => {
        const removedAttachments = (existingData.attachments ?? []).filter(
            attachment => !existingAttachments.includes(attachment)
        );

        try {
            await updateMutation.mutateAsync({
                id: existingData.id,
                data: mapEditFormToPayload(values, newAttachments, removedAttachments),
            });
            navigate(paths.shared.followUp);
        } catch {
            return;
        }
    });

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Edit Follow-up</CardTitle>
                        <CardDescription className="mt-2">
                            Update follow-up details, scheduling and contact information.
                        </CardDescription>
                    </div>
                    <CardAction>
                        <Button variant="outline" onClick={() => navigate(-1)}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                    </CardAction>
                </div>
            </CardHeader>

            <CardContent>
                <Form {...form}>
                    <form onSubmit={onSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                            <div className="rounded-md border bg-muted/40 p-3">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Area</p>
                                <p className="text-sm font-medium">{existingData.area || "—"}</p>
                            </div>
                            <div className="rounded-md border bg-muted/40 p-3">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Organisation</p>
                                <p className="text-sm font-medium">{existingData.partyName || "—"}</p>
                            </div>
                            <div className="rounded-md border bg-muted/40 p-3">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Amount</p>
                                <p className="text-sm font-medium">{existingData.amount ?? "—"}</p>
                            </div>
                            <div className="rounded-md border bg-muted/40 p-3">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Followup For</p>
                                <p className="text-sm font-medium">{existingData.followupFor || "—"}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <SelectField
                                control={form.control}
                                name="assignedToId"
                                label="Assigned To"
                                options={userOptions}
                                placeholder="Select employee"
                                valueType="number"
                            />
                            <FieldWrapper control={form.control} name="startFrom" label="Next Follow-up Date">
                                {field => <DateInput value={field.value} onChange={field.onChange} />}
                            </FieldWrapper>
                            <SelectField
                                control={form.control}
                                name="frequency"
                                label="Followup Frequency"
                                options={FREQUENCY_OPTIONS}
                                placeholder="Choose frequency"
                                valueType="number"
                            />
                        </div>

                        {frequency === 6 && (
                            <div className="space-y-4 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                                <SelectField
                                    control={form.control}
                                    name="stopReason"
                                    label="Stop Reason"
                                    options={STOP_REASON_OPTIONS}
                                    placeholder="Select reason"
                                    valueType="number"
                                />

                                {stopReason === 2 && (
                                    <>
                                        <FieldWrapper control={form.control} name="proofText" label="Proof Details">
                                            {field => (
                                                <Textarea
                                                    {...field}
                                                    value={field.value ?? ""}
                                                    placeholder="Provide proof of objective achievement..."
                                                    className="min-h-[80px]"
                                                />
                                            )}
                                        </FieldWrapper>
                                        <FieldWrapper control={form.control} name="proofImage" label="Proof Image">
                                            {field => (
                                                <FileUploader
                                                    context="follow-ups"
                                                    value={field.value ? [field.value] : []}
                                                    onChange={files => field.onChange(files[0] ?? "")}
                                                />
                                            )}
                                        </FieldWrapper>
                                    </>
                                )}

                                {[1, 3, 4].includes(stopReason ?? 0) && (
                                    <FieldWrapper control={form.control} name="stopRemarks" label="Remarks">
                                        {field => (
                                            <Textarea
                                                {...field}
                                                value={field.value ?? ""}
                                                placeholder="Enter remarks..."
                                                className="min-h-[80px]"
                                            />
                                        )}
                                    </FieldWrapper>
                                )}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-muted-foreground" />
                                <h3 className="text-lg font-medium">Contact Details</h3>
                            </div>
                            <ContactPersonFields control={form.control} name="contacts" label="Contacts" />
                        </div>

                        <FieldWrapper control={form.control} name="details" label="Detailed Request">
                            {field => <TiptapEditor value={field.value ?? ""} onChange={value => field.onChange(value)} />}
                        </FieldWrapper>

                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                                <h3 className="text-lg font-medium">Attachments</h3>
                            </div>

                            {existingAttachments.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Existing Attachments</p>
                                    {existingAttachments.map(file => (
                                        <div key={file} className="flex items-center justify-between rounded-md border p-2">
                                            <a
                                                href={buildFileUrl(file)}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex-1 truncate text-sm text-primary hover:underline"
                                            >
                                                {getFileName(file)}
                                            </a>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                className="text-destructive"
                                                onClick={() => removeExistingAttachment(file)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="space-y-2">
                                <p className="text-sm font-medium">Add New Attachments</p>
                                <FileUploader context="follow-ups" value={newAttachments} onChange={setNewAttachments} />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 border-t pt-6">
                            <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Update Follow-up
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
