import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, type Resolver, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, FileText, Hash, Loader2, MapPin, PackageCheck, Save, Truck } from "lucide-react";

import { paths } from "@/app/routes/paths";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { FileUploader } from "@/components/file-upload";

import { useUsers } from "@/hooks/api/useUsers";
import {
    useCreateCourier,
    useUpdateCourier,
} from "@/hooks/api/useCourier";
import {
    CourierFormSchema,
    type CourierFormValues,
} from "@/modules/shared/courier/helpers/courier.schema";
import {
    buildCourierDefaultValues,
    mapCourierFormToCreate,
    mapCourierFormToUpdate,
    mapCourierToForm,
} from "@/modules/shared/courier/helpers/courier.mappers";
import { COURIER_STATUS_OPTIONS, isCourierPrivileged } from "@/modules/shared/courier/helpers/courier.constants";
import type { Courier } from "@/modules/shared/courier/helpers/courier.types";
import { fileUploadService } from "@/services/api/file-upload.service";

const docUrl = (doc: string): string =>
    doc.includes("/") ? fileUploadService.getFileUrl(doc) : `/uploads/courier/${doc}`;

const ExistingDocLink = ({ path, label }: { path: string | null | undefined; label: string }) => {
    if (!path) return null;

    return (
        <a
            href={docUrl(path)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
            <FileText className="h-3 w-3" />
            {label}
        </a>
    );
};

interface CourierFormProps {
    mode: "create" | "edit";
    courierId?: number;
    existingData?: Courier | null;
    title?: string;
    description?: React.ReactNode;
    onBack?: () => void;
}

export function CourierForm({ mode, courierId, existingData, title, description, onBack }: CourierFormProps) {
    const navigate = useNavigate();
    const { role, teamId } = useAuth();
    const isPrivileged = isCourierPrivileged(role, teamId);
    const canUploadDocs = mode === "create" || isPrivileged;
    const { data: employees = [], isLoading: employeesLoading } = useUsers();

    const createMutation = useCreateCourier();
    const updateMutation = useUpdateCourier();

    const [files, setFiles] = useState<string[]>([]);
    const hasSubmittedRef = useRef(false);

    const initialValues = useMemo(
        () => (mode === "edit" ? mapCourierToForm(existingData) : buildCourierDefaultValues()),
        [mode, existingData]
    );

    const form = useForm<CourierFormValues>({
        resolver: zodResolver(CourierFormSchema) as Resolver<CourierFormValues>,
        defaultValues: initialValues,
    });

    useEffect(() => {
        form.reset(initialValues);
    }, [form, initialValues]);

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    const handleSubmit: SubmitHandler<CourierFormValues> = async values => {
        if (hasSubmittedRef.current) return;
        hasSubmittedRef.current = true;

        try {
            if (mode === "create") {
                await createMutation.mutateAsync({
                    data: mapCourierFormToCreate(values),
                    filenames: files,
                });
                navigate(paths.shared.couriers);
                return;
            }

            if (!courierId) {
                toast.error("Invalid courier ID");
                hasSubmittedRef.current = false;
                return;
            }

            await updateMutation.mutateAsync({
                id: courierId,
                data: mapCourierFormToUpdate(values),
            });

            toast.success("Courier updated successfully");
            navigate(paths.shared.courierView(courierId));
        } catch (error) {
            hasSubmittedRef.current = false;
            console.error("Failed to save courier:", error);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>
                            {title ?? (mode === "create" ? "New Courier Request" : "Edit Courier")}
                        </CardTitle>
                        <CardDescription className="mt-2">
                            {description ??
                                (mode === "create"
                                    ? "Fill in the details below to create a new courier dispatch request"
                                    : "Update the courier request details")}
                        </CardDescription>
                    </div>
                    <CardAction>
                        <Button variant="outline" onClick={onBack ?? (() => navigate(-1))}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                    </CardAction>
                </div>
            </CardHeader>

            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
                        <div className="space-y-4">
                            <h4 className="flex items-center gap-2 border-b pb-2 text-base font-semibold text-primary">
                                <MapPin className="h-4 w-4" />
                                Courier to
                            </h4>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                <FieldWrapper control={form.control} name="toOrg" label="Organization Name">
                                    {field => <Input {...field} placeholder="Enter organization name" disabled={isSubmitting} />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="toName" label="Name">
                                    {field => <Input {...field} placeholder="Enter recipient name" disabled={isSubmitting} />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="toAddr" label="Address">
                                    {field => <Input {...field} placeholder="Enter complete address" disabled={isSubmitting} />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="toPin" label="Pin Code">
                                    {field => <Input {...field} placeholder="Enter 6-digit pin code" maxLength={6} disabled={isSubmitting} />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="toMobile" label="Mobile Number">
                                    {field => <Input {...field} placeholder="Enter 10-digit mobile number" maxLength={10} disabled={isSubmitting} />}
                                </FieldWrapper>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="flex items-center gap-2 border-b pb-2 text-base font-semibold text-primary">
                                <Truck className="h-4 w-4" />
                                Courier Details
                            </h4>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                <SelectField
                                    control={form.control}
                                    name="empFrom"
                                    label="Courier from"
                                    options={employees.map(e => ({
                                        value: String(e.id),
                                        label: e.name,
                                        description: e.email ?? undefined,
                                    }))}
                                    placeholder={employeesLoading ? "Loading employees..." : "Select Employee"}
                                    disabled={isSubmitting || employeesLoading}
                                    valueType="number"
                                />

                                <FieldWrapper control={form.control} name="delDate" label="Expected Delivery Date">
                                    {field => (
                                        <Input
                                            {...field}
                                            type="date"
                                            min={mode === "create" ? new Date().toISOString().split("T")[0] : undefined}
                                            disabled={isSubmitting}
                                        />
                                    )}
                                </FieldWrapper>

                                <SelectField
                                    control={form.control}
                                    name="urgency"
                                    label="Dispatch Urgency"
                                    options={[
                                        { value: "1", label: "Same Day (Urgent)" },
                                        { value: "2", label: "Next Day" },
                                    ]}
                                    placeholder="Select Urgency"
                                    disabled={isSubmitting}
                                    valueType="number"
                                />
                            </div>
                        </div>

                        {mode === "edit" && (
                            <>
                                <div className="space-y-4">
                                    <h4 className="flex items-center gap-2 border-b pb-2 text-base font-semibold text-primary">
                                        <Hash className="h-4 w-4" />
                                        Status & Tracking
                                    </h4>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                        <SelectField
                                            control={form.control}
                                            name="status"
                                            label="Status"
                                            options={COURIER_STATUS_OPTIONS}
                                            placeholder="Select Status"
                                            disabled={isSubmitting}
                                            valueType="number"
                                        />
                                        <FieldWrapper control={form.control} name="trackingNumber" label="Tracking Number">
                                            {field => (
                                                <Input {...field} value={field.value ?? ""} placeholder="Enter tracking number" disabled={isSubmitting} />
                                            )}
                                        </FieldWrapper>
                                        <SelectField
                                            control={form.control}
                                            name="userId"
                                            label="Created By"
                                            options={employees.map(e => ({
                                                value: String(e.id),
                                                label: e.name,
                                                description: e.email ?? undefined,
                                            }))}
                                            placeholder={employeesLoading ? "Loading employees..." : "Select Employee"}
                                            disabled={isSubmitting || employeesLoading}
                                            valueType="number"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="flex items-center gap-2 border-b pb-2 text-base font-semibold text-primary">
                                        <PackageCheck className="h-4 w-4" />
                                        Dispatch Details
                                    </h4>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                        <FieldWrapper control={form.control} name="courierProvider" label="Courier Provider">
                                            {field => (
                                                <Input {...field} value={field.value ?? ""} placeholder="e.g., BlueDart, DTDC, FedEx" disabled={isSubmitting} />
                                            )}
                                        </FieldWrapper>
                                        <FieldWrapper control={form.control} name="pickupDate" label="Pickup Date & Time">
                                            {field => (
                                                <Input {...field} value={field.value ?? ""} type="datetime-local" disabled={isSubmitting} />
                                            )}
                                        </FieldWrapper>
                                        <FieldWrapper control={form.control} name="docketNo" label="Docket No">
                                            {field => (
                                                <Input {...field} value={field.value ?? ""} placeholder="Enter docket/AWB number" disabled={isSubmitting} />
                                            )}
                                        </FieldWrapper>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">
                                            Docket Slip <span className="text-muted-foreground">(upload to replace)</span>
                                        </p>
                                        <ExistingDocLink path={existingData?.docketSlip} label="View current docket slip" />
                                        <FieldWrapper control={form.control} name="docketSlip" label="">
                                            {field => (
                                                <FileUploader
                                                    context="courier"
                                                    value={field.value ?? []}
                                                    onChange={field.onChange}
                                                    disabled={isSubmitting}
                                                    maxFiles={1}
                                                />
                                            )}
                                        </FieldWrapper>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="flex items-center gap-2 border-b pb-2 text-base font-semibold text-primary">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Delivery Details
                                    </h4>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                        <FieldWrapper control={form.control} name="deliveryDate" label="Delivery Date & Time">
                                            {field => (
                                                <Input {...field} value={field.value ?? ""} type="datetime-local" disabled={isSubmitting} />
                                            )}
                                        </FieldWrapper>
                                        <SelectField
                                            control={form.control}
                                            name="withinTime"
                                            label="Delivered within Expected Time?"
                                            options={[
                                                { value: "1", label: "Yes" },
                                                { value: "0", label: "No" },
                                            ]}
                                            placeholder="Select"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">
                                            Proof of Delivery <span className="text-muted-foreground">(upload to replace)</span>
                                        </p>
                                        <ExistingDocLink path={existingData?.deliveryPod} label="View current POD" />
                                        <FieldWrapper control={form.control} name="deliveryPod" label="">
                                            {field => (
                                                <FileUploader
                                                    context="courier"
                                                    value={field.value ?? []}
                                                    onChange={field.onChange}
                                                    disabled={isSubmitting}
                                                    maxFiles={1}
                                                />
                                            )}
                                        </FieldWrapper>
                                    </div>
                                </div>
                            </>
                        )}

                        {canUploadDocs && (
                            <div className="space-y-2">
                                <p className="flex items-center gap-2 text-sm font-medium">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    Soft Copy of the documents
                                </p>
                                {mode === "edit" ? (
                                    <FieldWrapper control={form.control} name="courierDocs" label="">
                                        {field => (
                                            <FileUploader
                                                context="courier"
                                                value={field.value ?? []}
                                                onChange={field.onChange}
                                                disabled={isSubmitting}
                                            />
                                        )}
                                    </FieldWrapper>
                                ) : (
                                    <FileUploader
                                        context="courier"
                                        value={files}
                                        onChange={setFiles}
                                        disabled={isSubmitting}
                                    />
                                )}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 border-t pt-6">
                            <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => form.reset(initialValues)}
                                disabled={isSubmitting}
                            >
                                Reset
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        {mode === "create" ? "Create Courier" : "Save Changes"}
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

export default CourierForm;
