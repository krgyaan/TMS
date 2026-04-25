import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { type SubmitHandler, useForm, type Resolver } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/form/DateInput";
import { TenderFileUploader } from "@/components/tender-file-upload";
import { ArrowLeft, Save } from "lucide-react";
import { paths } from "@/app/routes/paths";
import { ProjectMasterFormSchema } from "../helpers/projectMaster.schema";
import type { ProjectMasterFormValues, ProjectMasterResponse, ProjectMasterListRow } from "../helpers/projectMaster.types";
import { buildDefaultValues, mapResponseToForm, mapFormToCreatePayload, mapFormToUpdatePayload } from "../helpers/projectMaster.mappers";
import { useOrganizationOptions, useItemOptions, useLocationOptions } from "@/hooks/useSelectOptions";
import { useCreateProjectMaster, useUpdateProjectMaster } from "@/hooks/api/useProjectMaster";

interface MasterProjectFormProps {
    mode: "create" | "edit";
    existingData?: ProjectMasterResponse | ProjectMasterListRow;
}

export function MasterProjectForm({ mode, existingData }: MasterProjectFormProps) {
    const navigate = useNavigate();

    const teamOptions = [
        { id: "AC", name: "AC", isActive: true },
        { id: "DC", name: "DC", isActive: true },
        { id: "BD", name: "BD", isActive: true },
        { id: "IT", name: "IT", isActive: true },
    ];
    const organizationOptions = useOrganizationOptions();
    const itemOptions = useItemOptions();
    const locationOptions = useLocationOptions();

    const createMutation = useCreateProjectMaster();
    const updateMutation = useUpdateProjectMaster();

    const initialValues = useMemo(() => {
        if (mode === "edit" && existingData) {
            return mapResponseToForm(existingData);
        }
        return buildDefaultValues();
    }, [mode, existingData]);

    const form = useForm<ProjectMasterFormValues>({
        resolver: zodResolver(ProjectMasterFormSchema) as Resolver<ProjectMasterFormValues>,
        defaultValues: initialValues,
    });

    const watchTeamName = form.watch("teamName");
    const watchOrganisationId = form.watch("organisationId");
    const watchItemId = form.watch("itemId");
    const watchLocationId = form.watch("locationId");
    const watchPoNo = form.watch("poNo");
    const watchPoDate = form.watch("poDate");

    useEffect(() => {
        form.reset(initialValues);
    }, [form, initialValues]);

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    const getFinancialYear = (date: Date): string => {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const f =
            month >= 4
                ? year.toString().slice(-2)
                : (year - 1).toString().slice(-2);
        const next = (parseInt(f, 10) + 1).toString().padStart(2, "0");
        return `${f}${next}`;
    };

    const parseDmy = (value: string): Date | null => {
        if (!value) return null;

        if (value.includes("-") && value.split("-")[0].length === 4) {
            const date = new Date(value);
            return Number.isNaN(date.getTime()) ? null : date;
        }

        const [dd, mm, yyyy] = value.split("-");
        if (!dd || !mm || !yyyy) return null;

        const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
        return Number.isNaN(date.getTime()) ? null : date;
    };

    const { projectCodePreview, projectNamePreview } = useMemo(() => {
        try {
            const teamName = watchTeamName;

            // Use String() for consistent comparison
            const organisationName =
                organizationOptions.find(o => String(o.id) === String(watchOrganisationId))?.name ?? "";
            const itemName =
                itemOptions.find(i => String(i.id) === String(watchItemId))?.name ?? "";
            const locationOption = locationOptions.find(l => String(l.id) === String(watchLocationId));
            const locationCode = locationOption?.name ?? "";
            const locationName = locationOption?.name ?? "";

            let yearSegment = "";
            if (watchPoDate) {
                const parsed = parseDmy(watchPoDate);
                if (parsed) {
                    yearSegment = getFinancialYear(parsed);
                }
            }

            const poSuffix = (watchPoNo ?? "").toString().slice(-4);

            const hasAllCore =
                !!teamName &&
                !!organisationName &&
                !!itemName &&
                !!locationCode &&
                !!yearSegment &&
                !!poSuffix;

            if (!hasAllCore) {
                return { projectCodePreview: "", projectNamePreview: "" };
            }

            const code = `${teamName}/${yearSegment}/${organisationName}/${locationCode}/${itemName}/${poSuffix}`;
            const name = `${organisationName} ${locationName} ${itemName}`;

            return { projectCodePreview: code, projectNamePreview: name };
        } catch {
            return { projectCodePreview: "", projectNamePreview: "" };
        }
    }, [
        organizationOptions,
        itemOptions,
        locationOptions,
        watchTeamName,
        watchOrganisationId,
        watchItemId,
        watchLocationId,
        watchPoNo,
        watchPoDate,
    ]);

    // ✅ FIX: Sync preview values to form
    useEffect(() => {
        if (projectCodePreview) {
            form.setValue("projectCode", projectCodePreview, { shouldValidate: true });
        }
    }, [projectCodePreview, form]);

    useEffect(() => {
        if (projectNamePreview) {
            form.setValue("projectName", projectNamePreview, { shouldValidate: true });
        }
    }, [projectNamePreview, form]);

    const handleSubmit: SubmitHandler<ProjectMasterFormValues> = async values => {
        const teamName = values.teamName;
        try {
            if (mode === "create") {
                const payload = mapFormToCreatePayload(values, teamName);
                await createMutation.mutateAsync(payload);
            } else if (existingData?.id) {
                const payload = mapFormToUpdatePayload(existingData.id, values, teamName);
                await updateMutation.mutateAsync({ id: existingData.id, data: payload });
            }
            navigate(paths.documentDashboard.projects);
        } catch {
            // errors handled via toast
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>
                            {mode === "create" ? "Create" : "Edit"} Project
                        </CardTitle>
                        <CardDescription className="mt-2">
                            {mode === "create"
                                ? "Create a new project entry"
                                : "Update project information"}
                        </CardDescription>
                    </div>
                    <CardAction>
                        <Button variant="outline" onClick={() => navigate(-1)}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                    </CardAction>
                </div>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
                        <div className="grid gap-4 md:grid-cols-3 items-start">
                            <SelectField
                                control={form.control}
                                name="teamName"
                                label="Team"
                                options={teamOptions}
                                placeholder="Select Team"
                            />
                            <SelectField
                                control={form.control}
                                name="organisationId"
                                label="Organization"
                                options={organizationOptions}
                                placeholder="Select Organization"
                            />
                            <SelectField
                                control={form.control}
                                name="itemId"
                                label="Item"
                                options={itemOptions}
                                placeholder="Select Item"
                            />
                            <SelectField
                                control={form.control}
                                name="locationId"
                                label="Location"
                                options={locationOptions}
                                placeholder="Select Location"
                            />

                            <FieldWrapper
                                control={form.control}
                                name="poNo"
                                label="PO Number"
                            >
                                {field => (
                                    <Input
                                        {...field}
                                        placeholder="PO Number"
                                    />
                                )}
                            </FieldWrapper>

                            <FieldWrapper
                                control={form.control}
                                name="poDate"
                                label="PO Date"
                            >
                                {field => (
                                    <DateInput
                                        {...field}
                                        placeholder="dd-mm-yyyy"
                                    />
                                )}
                            </FieldWrapper>

                            <FieldWrapper
                                control={form.control}
                                name="performanceDate"
                                label="Performance Date"
                            >
                                {field => (
                                    <DateInput
                                        {...field}
                                        placeholder="dd-mm-yyyy"
                                    />
                                )}
                            </FieldWrapper>

                            <FieldWrapper
                                control={form.control}
                                name="completionDate"
                                label="Completion Date"
                            >
                                {field => (
                                    <DateInput
                                        {...field}
                                        placeholder="dd-mm-yyyy"
                                    />
                                )}
                            </FieldWrapper>

                            <FieldWrapper
                                control={form.control}
                                name="sapPoDate"
                                label="SAP PO Date"
                            >
                                {field => (
                                    <DateInput
                                        {...field}
                                        placeholder="dd-mm-yyyy"
                                    />
                                )}
                            </FieldWrapper>

                            <FieldWrapper
                                control={form.control}
                                name="sapPoNo"
                                label="SAP PO Number"
                            >
                                {field => (
                                    <Input
                                        {...field}
                                        placeholder="SAP PO number"
                                    />
                                )}
                            </FieldWrapper>

                            {/* ✅ FIX: Make these read-only and use form values */}
                            <FieldWrapper
                                control={form.control}
                                name="projectCode"
                                label="Project Code"
                                description="Auto-generated from team, PO, organization, item, and location"
                            >
                                {field => (
                                    <Input
                                        {...field}
                                        placeholder="Project Code"
                                        readOnly
                                        className="bg-muted"
                                    />
                                )}
                            </FieldWrapper>

                            <FieldWrapper
                                control={form.control}
                                name="projectName"
                                label="Project Name"
                                description="Auto-generated from organization, item, and location"
                            >
                                {field => (
                                    <Input
                                        {...field}
                                        placeholder="Project Name"
                                        readOnly
                                        className="bg-muted"
                                    />
                                )}
                            </FieldWrapper>

                            <FieldWrapper
                                control={form.control}
                                name="poUpload"
                                label="Upload PO"
                            >
                                {field => (
                                    <TenderFileUploader
                                        context="pqr-po"
                                        value={field.value ?? []}
                                        onChange={paths => field.onChange(paths)}
                                        disabled={isSubmitting}
                                    />
                                )}
                            </FieldWrapper>

                            <FieldWrapper
                                control={form.control}
                                name="performanceProof"
                                label="Performance Certificate"
                            >
                                {field => (
                                    <TenderFileUploader
                                        context="pqr-performance-certificate"
                                        value={field.value ?? []}
                                        onChange={paths => field.onChange(paths)}
                                        disabled={isSubmitting}
                                    />
                                )}
                            </FieldWrapper>

                            <FieldWrapper
                                control={form.control}
                                name="completionProof"
                                label="Completion Document"
                            >
                                {field => (
                                    <TenderFileUploader
                                        context="pqr-completion"
                                        value={field.value ?? []}
                                        onChange={paths => field.onChange(paths)}
                                        disabled={isSubmitting}
                                    />
                                )}
                            </FieldWrapper>
                        </div>

                        <div className="flex justify-end gap-2 pt-6 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate(-1)}
                                disabled={isSubmitting}
                            >
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
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-orange-500 hover:bg-orange-600 text-white"
                            >
                                {isSubmitting && <span className="animate-spin mr-2">⏳</span>}
                                <Save className="mr-2 h-4 w-4" />
                                Submit
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

export default MasterProjectForm;
