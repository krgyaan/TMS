import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { Save, Loader2, Upload, FileText } from "lucide-react";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { FileUploader } from "@/components/file-upload/FileUploader";
import { paths } from "@/app/routes/paths";
import { useCustomer, useCreateCustomer, useUpdateCustomer } from "@/hooks/api/useCustomer";
import {
    CustomerFormSchema,
    customerFormDefaultValues,
    customerAttachmentUrl,
    type CustomerFormValues,
    type CreateCustomerComplaintDto,
} from "../helpers/customer.types";

const inputCls =
    "border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent " +
    "px-3 py-1 text-sm outline-none focus-visible:border-ring " +
    "focus-visible:ring-ring/50 focus-visible:ring-[3px]";

const sectionCls = "py-6 px-6 border-b last:border-b-0";

export function CustomerCreateForm({ complaintId }: { complaintId?: number }) {
    const navigate = useNavigate();
    const isEdit = !!complaintId;

    const createCustomer = useCreateCustomer();
    const updateCustomer = useUpdateCustomer();
    const { data: complaint } = useCustomer(complaintId ?? 0);

    const [attachmentPaths, setAttachmentPaths] = useState<string[]>([]);

    const form = useForm<CustomerFormValues>({
        resolver: zodResolver(CustomerFormSchema) as Resolver<CustomerFormValues>,
        defaultValues: customerFormDefaultValues,
    });

    useEffect(() => {
        if (!isEdit || !complaint) return;
        form.reset({
            name: complaint.name,
            organization: complaint.organization ?? "",
            designation: complaint.designation ?? "",
            email: complaint.email,
            phone: complaint.phone,
            siteProjectName: complaint.siteProjectName,
            poNo: complaint.poNo ?? "",
            siteLocation: complaint.siteLocation,
            issueFaced: complaint.issueFaced ?? "",
        });
        setAttachmentPaths(complaint.attachment ? [complaint.attachment] : []);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEdit, complaint]);

    const saving = createCustomer.isPending || updateCustomer.isPending;

    const onSubmit = async (values: CustomerFormValues) => {
        const payload: CreateCustomerComplaintDto = {
            name: values.name,
            organization: values.organization?.trim() ? values.organization : null,
            designation: values.designation?.trim() ? values.designation : null,
            email: values.email,
            phone: values.phone,
            siteProjectName: values.siteProjectName,
            poNo: values.poNo?.trim() ? values.poNo : null,
            siteLocation: values.siteLocation,
            issueFaced: values.issueFaced?.trim() ? values.issueFaced : null,
            attachment: attachmentPaths[0] ?? null,
            engineers: [],
        };

        try {
            if (isEdit && complaintId) {
                await updateCustomer.mutateAsync({ id: complaintId, data: payload });
            } else {
                await createCustomer.mutateAsync(payload);
            }
            navigate(paths.services.customer);
        } catch {
            // handled by hooks
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card className="overflow-hidden">
                    {/* Header */}
                    <div className="px-6 py-4 border-b bg-muted/30">
                        <h2 className="text-base font-semibold">
                            {isEdit ? "Edit Customer Complaint" : "Create New Customer Complaint"}
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Fill in the details below and save.
                        </p>
                    </div>

                    {/* Ticket no hint */}
                    <div className={sectionCls}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                            Ticket Number
                        </p>
                        {isEdit && complaint?.ticketNo ? (
                            <p className="text-sm font-medium text-foreground">
                                {complaint.ticketNo}
                            </p>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                Auto-generated on save in format CC/mmyy/001
                            </p>
                        )}
                    </div>

                    {/* Complaint details */}
                    <div className={sectionCls}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FieldWrapper<CustomerFormValues, "name">
                                control={form.control}
                                name="name"
                                label="Name *"
                            >
                                {field => (
                                    <Input
                                        className={inputCls}
                                        placeholder="Customer Name"
                                        value={field.value ?? ""}
                                        onChange={field.onChange}
                                        disabled={saving}
                                    />
                                )}
                            </FieldWrapper>
                            <FieldWrapper<CustomerFormValues, "organization">
                                control={form.control}
                                name="organization"
                                label="Organization"
                            >
                                {field => (
                                    <Input
                                        className={inputCls}
                                        placeholder="Organization"
                                        value={field.value ?? ""}
                                        onChange={field.onChange}
                                        disabled={saving}
                                    />
                                )}
                            </FieldWrapper>
                            <FieldWrapper<CustomerFormValues, "designation">
                                control={form.control}
                                name="designation"
                                label="Designation"
                            >
                                {field => (
                                    <Input
                                        className={inputCls}
                                        placeholder="Designation"
                                        value={field.value ?? ""}
                                        onChange={field.onChange}
                                        disabled={saving}
                                    />
                                )}
                            </FieldWrapper>
                            <FieldWrapper<CustomerFormValues, "email">
                                control={form.control}
                                name="email"
                                label="Email *"
                            >
                                {field => (
                                    <Input
                                        type="email"
                                        className={inputCls}
                                        placeholder="Email"
                                        value={field.value ?? ""}
                                        onChange={field.onChange}
                                        disabled={saving}
                                    />
                                )}
                            </FieldWrapper>
                            <FieldWrapper<CustomerFormValues, "phone">
                                control={form.control}
                                name="phone"
                                label="Phone No. *"
                            >
                                {field => (
                                    <Input
                                        className={inputCls}
                                        placeholder="Phone No."
                                        value={field.value ?? ""}
                                        onChange={field.onChange}
                                        disabled={saving}
                                    />
                                )}
                            </FieldWrapper>
                            <FieldWrapper<CustomerFormValues, "siteProjectName">
                                control={form.control}
                                name="siteProjectName"
                                label="Site/Project Name *"
                            >
                                {field => (
                                    <Input
                                        className={inputCls}
                                        placeholder="Site / Project Name"
                                        value={field.value ?? ""}
                                        onChange={field.onChange}
                                        disabled={saving}
                                    />
                                )}
                            </FieldWrapper>
                            <FieldWrapper<CustomerFormValues, "poNo">
                                control={form.control}
                                name="poNo"
                                label="PO No."
                            >
                                {field => (
                                    <Input
                                        className={inputCls}
                                        placeholder="PO No."
                                        value={field.value ?? ""}
                                        onChange={field.onChange}
                                        disabled={saving}
                                    />
                                )}
                            </FieldWrapper>
                            <FieldWrapper<CustomerFormValues, "siteLocation">
                                control={form.control}
                                name="siteLocation"
                                label="Site Location *"
                            >
                                {field => (
                                    <Input
                                        className={inputCls}
                                        placeholder="Site Location"
                                        value={field.value ?? ""}
                                        onChange={field.onChange}
                                        disabled={saving}
                                    />
                                )}
                            </FieldWrapper>
                        </div>
                    </div>

                    {/* Issue faced */}
                    <div className={sectionCls}>
                        <FieldWrapper<CustomerFormValues, "issueFaced">
                            control={form.control}
                            name="issueFaced"
                            label="Issue Faced"
                        >
                            {field => (
                                <Textarea
                                    className="border-input dark:bg-input/30 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                    placeholder="Describe the issue faced"
                                    rows={4}
                                    value={field.value ?? ""}
                                    onChange={field.onChange}
                                    disabled={saving}
                                />
                            )}
                        </FieldWrapper>
                    </div>

                    {/* Attachment */}
                    <div className={sectionCls}>
                        <p className="text-sm font-semibold flex items-center gap-2 text-foreground mb-2">
                            <Upload className="h-4 w-4" />
                            Upload Photo/Video
                        </p>
                        {isEdit && complaint?.attachment && (
                            <a
                                href={customerAttachmentUrl(complaint.attachment)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mb-3"
                            >
                                <FileText className="h-3.5 w-3.5" /> Current attachment
                            </a>
                        )}
                        <FileUploader
                            context="customer-attachments"
                            value={attachmentPaths}
                            onChange={setAttachmentPaths}
                            label=""
                        />
                    </div>

                    {/* Actions */}
                    <div className="px-6 py-4 border-t bg-muted/20 flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate(paths.services.customer)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4 mr-1" />
                            )}
                            {isEdit ? "Update Complaint" : "Submit"}
                        </Button>
                    </div>
                </Card>
            </form>
        </Form>
    );
}
