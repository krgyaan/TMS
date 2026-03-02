import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { type SubmitHandler, useForm, type Resolver } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Textarea } from '@/components/ui/textarea';
import { NumberInput } from '@/components/form/NumberInput';
import { ArrowLeft, Save } from 'lucide-react';
import { paths } from '@/app/routes/paths';
import { useCreatePqr, useUpdatePqr } from '@/hooks/api/usePqrs';
import { RequestExtensionFormSchema, type RequestExtensionFormValues } from '../helpers/requestExtension.schema';
import type { RequestExtensionListRow, RequestExtensionResponse } from '../helpers/requestExtension.types';
import { mapResponseToForm } from '@/modules/shared/finance-document/helpers/financeDocument.mappers';
import { buildDefaultValues, mapFormToCreatePayload, mapFormToUpdatePayload } from '../helpers/requestExtension.mappers';

interface RequestExtensionFormProps {
    mode: 'create' | 'edit';
    existingData?: RequestExtensionResponse | RequestExtensionListRow;
}

export function RequestExtensionForm({ mode, existingData }: RequestExtensionFormProps) {
    const navigate = useNavigate();

    const createMutation = useCreatePqr();
    const updateMutation = useUpdatePqr();

    // Compute initial values
    const initialValues = useMemo(() => {
        if (mode === 'edit' && existingData) {
            return mapResponseToForm(existingData);
        }
        return buildDefaultValues();
    }, [mode, existingData]);

    const form = useForm<RequestExtensionFormValues>({
        resolver: zodResolver(RequestExtensionFormSchema) as Resolver<RequestExtensionFormValues>,
        defaultValues: initialValues,
    });

    // Reset form when initial values change
    useEffect(() => {
        form.reset(initialValues);
    }, [form, initialValues]);

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    const handleSubmit: SubmitHandler<RequestExtensionFormValues> = async (values) => {
        console.log('Form values on submit:', values);
        try {
            if (mode === 'create') {
                const payload = mapFormToCreatePayload(values);
                await createMutation.mutateAsync(payload);
            } else if (existingData?.id) {
                const payload = mapFormToUpdatePayload(existingData.id, values);
                await updateMutation.mutateAsync({ id: existingData.id, data: payload });
            }
            navigate(paths.tendering.requestExtension);
        } catch (error) {
            console.error('Error submitting form:', error);
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
                                ? 'Request a new extension'
                                : 'Update extension information'}
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
                            <FieldWrapper
                                control={form.control}
                                name="days"
                                label="Days of Extension"
                            >
                                {(field) => (
                                    <NumberInput {...field} />
                                )}
                            </FieldWrapper>

                            <FieldWrapper
                                control={form.control}
                                name="reason"
                                label="Reason for Extension"
                            >
                                {(field) => (
                                    <Textarea
                                        {...field}
                                        placeholder="Reason for Extension"
                                    />
                                )}
                            </FieldWrapper>
                        </div>

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

export default RequestExtensionForm;
