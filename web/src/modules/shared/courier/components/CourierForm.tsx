import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, type Resolver, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save } from "lucide-react";

import { paths } from "@/app/routes/paths";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { FileUploader } from "@/components/file-upload";

import { useUsers } from "@/hooks/api/useUsers";
import {
    useCreateCourier,
    useUpdateCourier,
    useUploadCourierDocs,
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
import type { Courier } from "@/modules/shared/courier/helpers/courier.types";

interface CourierFormProps {
    mode: "create" | "edit";
    courierId?: number;
    existingData?: Courier | null;
}

export function CourierForm({ mode, courierId, existingData }: CourierFormProps) {
    const navigate = useNavigate();
    const { data: employees = [], isLoading: employeesLoading } = useUsers();

    const createMutation = useCreateCourier();
    const updateMutation = useUpdateCourier();
    const uploadDocsMutation = useUploadCourierDocs();

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

    const isSubmitting =
        createMutation.isPending || updateMutation.isPending || uploadDocsMutation.isPending;

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

            if (files.length > 0) {
                await uploadDocsMutation.mutateAsync({ id: courierId, files });
            }

            toast.success("Courier updated successfully");
            navigate(paths.shared.courierView(courierId));
        } catch (error) {
            hasSubmittedRef.current = false;
            console.error("Failed to save courier:", error);
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>{mode === "create" ? "New Courier Request" : "Edit Courier"}</CardTitle>
                    <CardDescription className="mt-2">
                        {mode === "create"
                            ? "Fill in the details below to create a new courier dispatch request"
                            : "Update the courier request details"}
                    </CardDescription>
                </div>
                <Button variant="outline" onClick={() => navigate(-1)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
            </CardHeader>

            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
                        <div className="space-y-4">
                            <h4 className="border-b pb-2 text-base font-semibold text-primary">Courier to</h4>
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
                            <h4 className="border-b pb-2 text-base font-semibold text-primary">Courier Details</h4>
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
                                            min={new Date().toISOString().split("T")[0]}
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

                        <div className="space-y-2">
                            <p className="text-sm font-medium">Soft Copy of the documents</p>
                            <FileUploader
                                context="courier"
                                value={files}
                                onChange={setFiles}
                                disabled={isSubmitting}
                            />
                        </div>

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
