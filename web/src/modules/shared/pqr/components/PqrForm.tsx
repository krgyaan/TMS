import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { type SubmitHandler, useForm, type Resolver } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/form/SelectField';
import { DateInput } from '@/components/form/DateInput';
import { TenderFileUploader } from '@/components/tender-file-upload';
import { Textarea } from '@/components/ui/textarea';
import { NumberInput } from '@/components/form/NumberInput';
import { ArrowLeft, Save } from 'lucide-react';
import { paths } from '@/app/routes/paths';
import { PqrFormSchema } from '../helpers/pqr.schema';
import type { PqrFormValues, PqrResponse, PqrListRow } from '../helpers/pqr.types';
import { buildDefaultValues, mapResponseToForm, mapFormToCreatePayload, mapFormToUpdatePayload } from '../helpers/pqr.mappers';
import { useTeamOptions } from '@/hooks/useSelectOptions';
import { useCreatePqr, useUpdatePqr } from '@/hooks/api/usePqrs';

interface PqrFormProps {
    mode: 'create' | 'edit';
    existingData?: PqrResponse | PqrListRow;
}

export function PqrForm({ mode, existingData }: PqrFormProps) {
    const navigate = useNavigate();
    const teamOptions = useTeamOptions();

    const createMutation = useCreatePqr();
    const updateMutation = useUpdatePqr();

    // Compute initial values
    const initialValues = useMemo(() => {
        if (mode === 'edit' && existingData) {
            return mapResponseToForm(existingData);
        }
        return buildDefaultValues();
    }, [mode, existingData]);

    const form = useForm<PqrFormValues>({
        resolver: zodResolver(PqrFormSchema) as Resolver<PqrFormValues>,
        defaultValues: initialValues,
    });

    // Reset form when initial values change
    useEffect(() => {
        form.reset(initialValues);
    }, [form, initialValues]);

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    const handleSubmit: SubmitHandler<PqrFormValues> = async (values) => {
        try {
            if (mode === 'create') {
                const payload = mapFormToCreatePayload(values);
                await createMutation.mutateAsync(payload);
            } else if (existingData?.id) {
                const payload = mapFormToUpdatePayload(existingData.id, values);
                await updateMutation.mutateAsync({ id: existingData.id, data: payload });
            }
            navigate(paths.documentDashboard.pqr);
        } catch (error) {
            // Error handled by mutation onError (toast)
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>
                            {mode === 'create' ? 'Create' : 'Edit'} PQR
                        </CardTitle>
                        <CardDescription className="mt-2">
                            {mode === 'create'
                                ? 'Create a new PQR entry'
                                : 'Update PQR information'}
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
                        <div className="grid gap-4 md:grid-cols-3">
                            <SelectField
                                control={form.control}
                                name="teamName"
                                label="Team Name**"
                                options={teamOptions}
                                placeholder="Select Option"
                            />
                            <FieldWrapper
                                control={form.control}
                                name="projectName"
                                label="Project Name**"
                            >
                                {(field) => (
                                    <Input
                                        {...field}
                                        placeholder="Project Name"
                                    />
                                )}
                            </FieldWrapper>
                            <FieldWrapper
                                control={form.control}
                                name="value"
                                label="Value**"
                            >
                                {(field) => (
                                    <NumberInput
                                        {...field}
                                        placeholder="Value"
                                    />
                                )}
                            </FieldWrapper>
                            <FieldWrapper
                                control={form.control}
                                name="item"
                                label="Item**"
                            >
                                {(field) => (
                                    <Input
                                        {...field}
                                        placeholder="Item"
                                    />
                                )}
                            </FieldWrapper>
                            <FieldWrapper
                                control={form.control}
                                name="poDate"
                                label="PO date**"
                            >
                                {(field) => (
                                    <DateInput
                                        {...field}
                                        placeholder="dd-mm-yyyy"
                                    />
                                )}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="uploadPo" label="Upload PO**">
                                {(field) => (
                                    <TenderFileUploader
                                        context="pqr-po"
                                        value={field.value ?? []}
                                        onChange={(paths) => field.onChange(paths)}
                                        disabled={isSubmitting}
                                    />
                                )}
                            </FieldWrapper>
                            <FieldWrapper
                                control={form.control}
                                name="sapGemPoDate"
                                label="SAP/GEM PO date**"
                            >
                                {(field) => (
                                    <DateInput
                                        {...field}
                                        placeholder="dd-mm-yyyy"
                                    />
                                )}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="uploadSapGemPo" label="Upload SAP/GEM PO**">
                                {(field) => (
                                    <TenderFileUploader
                                        context="pqr-sap-gem-po"
                                        value={field.value ?? []}
                                        onChange={(paths) => field.onChange(paths)}
                                        disabled={isSubmitting}
                                    />
                                )}
                            </FieldWrapper>
                            <FieldWrapper
                                control={form.control}
                                name="completionDate"
                                label="Completion date**"
                            >
                                {(field) => (
                                    <DateInput
                                        {...field}
                                        placeholder="dd-mm-yyyy"
                                    />
                                )}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="uploadCompletion" label="Upload Completion**">
                                {(field) => (
                                    <TenderFileUploader
                                        context="pqr-completion"
                                        value={field.value ?? []}
                                        onChange={(paths) => field.onChange(paths)}
                                        disabled={isSubmitting}
                                    />
                                )}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="uploadPerformanceCertificate" label="Upload Performance Certificate**">
                                {(field) => (
                                    <TenderFileUploader
                                        context="pqr-performance-certificate"
                                        value={field.value ?? []}
                                        onChange={(paths) => field.onChange(paths)}
                                        disabled={isSubmitting}
                                    />
                                )}
                            </FieldWrapper>
                        </div>
                        <FieldWrapper
                            control={form.control}
                            name="remarks"
                            label="Remarks *"
                        >
                            {(field) => (
                                <Textarea
                                    {...field}
                                    placeholder="Enter remarks..."
                                    className="min-h-[100px]"
                                />
                            )}
                        </FieldWrapper>

                        {/* Form Actions */}
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

export default PqrForm;
