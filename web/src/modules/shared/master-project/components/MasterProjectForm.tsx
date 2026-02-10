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
import { MasterProjectFormSchema } from "../helpers/masterProject.schema";
import type {
    MasterProjectFormValues,
    MasterProjectResponse,
    MasterProjectListRow,
} from "../helpers/masterProject.types";
import {
    buildDefaultValues,
    mapResponseToForm,
    mapFormToCreatePayload,
    mapFormToUpdatePayload,
} from "../helpers/masterProject.mappers";
import {
    useTeamOptions,
    useOrganizationOptions,
    useItemOptions,
    useLocationOptions,
} from "@/hooks/useSelectOptions";
import {
    useCreateMasterProject,
    useUpdateMasterProject,
} from "@/hooks/api/useMasterProjects";

interface MasterProjectFormProps {
    mode: "create" | "edit";
    existingData?: MasterProjectResponse | MasterProjectListRow;
}

export function MasterProjectForm({ mode, existingData }: MasterProjectFormProps) {
    const navigate = useNavigate();

    const teamOptions = useTeamOptions([1, 2, 7]);
    const organizationOptions = useOrganizationOptions();
    const itemOptions = useItemOptions();
    const locationOptions = useLocationOptions();

    const createMutation = useCreateMasterProject();
    const updateMutation = useUpdateMasterProject();

    const initialValues = useMemo(() => {
        if (mode === "edit" && existingData) {
            return mapResponseToForm(existingData);
        }
        return buildDefaultValues();
    }, [mode, existingData]);

    const form = useForm<MasterProjectFormValues>({
        resolver: zodResolver(MasterProjectFormSchema) as Resolver<MasterProjectFormValues>,
        defaultValues: initialValues,
    });

    const watchTeamId = form.watch("teamId");
    const watchOrganisationId = form.watch("organisationId");
    const watchItemId = form.watch("itemId");
    const watchLocationId = form.watch("locationId");
    const watchPoNo = form.watch("poNo");
    const watchPoDate = form.watch("poDate");

    useEffect(() => {
        form.reset(initialValues);
    }, [form, initialValues]);

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    const getSelectedTeamName = (teamId?: number): string => {
        const option = teamOptions.find(t => Number(t.id) === teamId);
        return option?.name ?? "";
    };

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
        const [dd, mm, yyyy] = value.split("-");
        const day = Number(dd);
        const month = Number(mm);
        const year = Number(yyyy);
        if (!day || !month || !year) return null;
        const d = new Date(year, month - 1, day);
        return Number.isNaN(d.getTime()) ? null : d;
    };

    const { projectCodePreview, projectNamePreview } = useMemo(() => {
        try {
            const teamName =
                teamOptions.find(t => t.id === String(watchTeamId))?.name ?? "";
            const organisationName =
                organizationOptions.find(o => Number(o.id) === watchOrganisationId)?.name ?? "";
            const itemName =
                itemOptions.find(i => Number(i.id) === watchItemId)?.name ?? "";
            const locationOption = locationOptions.find(l => Number(l.id) === watchLocationId);
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
        teamOptions,
        organizationOptions,
        itemOptions,
        locationOptions,
        watchTeamId,
        watchOrganisationId,
        watchItemId,
        watchLocationId,
        watchPoNo,
        watchPoDate,
    ]);

    const handleSubmit: SubmitHandler<MasterProjectFormValues> = async values => {
        const teamName = getSelectedTeamName(values.teamId);
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
                                name="teamId"
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

                            <FieldWrapper
                                control={form.control}
                                name="poDocument"
                                label="PO Document"
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
                                name="performanceCertificate"
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
                                name="completionDocument"
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

                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="flex flex-col space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">
                                    Project Code (auto-generated)
                                </label>
                                <Input
                                    value={projectCodePreview}
                                    readOnly
                                    disabled
                                    placeholder="Will be generated from team, PO, organization, item, and location"
                                />
                            </div>
                            <div className="flex flex-col space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">
                                    Project Name (auto-generated)
                                </label>
                                <Input
                                    value={projectNamePreview}
                                    readOnly
                                    disabled
                                    placeholder="Will be generated from organization, item, and location"
                                />
                            </div>
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
