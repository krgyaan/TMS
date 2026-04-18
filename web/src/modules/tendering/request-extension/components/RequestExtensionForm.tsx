import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { type SubmitHandler, useForm, useFieldArray, type Resolver } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/form/NumberInput';
import { ArrowLeft, Save, Plus, Trash2, Users } from 'lucide-react';
import { paths } from '@/app/routes/paths';
import { RequestExtensionFormSchema, type RequestExtensionFormValues } from '../helpers/requestExtension.schema';
import type { RequestExtensionListRow, RequestExtensionResponse } from '../helpers/requestExtension.types';
import {
    buildDefaultValues,
    mapFormToCreatePayload,
    mapFormToUpdatePayload,
    mapResponseToForm,
} from '../helpers/requestExtension.mappers';
import { useCreateRequestExtension, useUpdateRequestExtension } from '@/hooks/api/useRequestExtension';
import { useTender } from '@/hooks/api/useTenders';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { Separator } from '@/components/ui/separator';

interface RequestExtensionFormProps {
    mode: 'create' | 'edit';
    tenderId?: number;
    existingData?: RequestExtensionResponse | RequestExtensionListRow;
}

export function RequestExtensionForm({ mode, tenderId, existingData }: RequestExtensionFormProps) {
    const navigate = useNavigate();

    const createMutation = useCreateRequestExtension();
    const updateMutation = useUpdateRequestExtension();

    // Fetch tender data (includes clients for create mode)
    const { data: tender, error: tenderError, isLoading: tenderLoading } = useTender(tenderId!);

    // Compute initial values based on mode
    const initialValues = useMemo(() => {
        if (mode === 'edit' && existingData) {
            // Edit mode: extract clients from JSON in existingData
            return mapResponseToForm(existingData);
        }

        // Create mode: will be populated when tender data loads
        return buildDefaultValues(tenderId);
    }, [mode, existingData]);

    const form = useForm<RequestExtensionFormValues>({
        resolver: zodResolver(RequestExtensionFormSchema) as Resolver<RequestExtensionFormValues>,
        defaultValues: initialValues,
    });

    // Field array for managing clients
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'clients',
    });

    // Reset form when initial values change
    useEffect(() => {
        form.reset(initialValues);
    }, [form, initialValues]);

    // For create mode: populate clients from tender when tender data loads
    // useEffect(() => {
    //     if (mode === 'create' && tender) {
    //         form.setValue('tenderId', tender.id);

    //         // Map tender clients to form clients
    //         if (tender.clients && tender.clients.length > 0) {
    //             const mappedClients = mapTenderClientsToFormClients(tender.clients);
    //             form.setValue('clients', mappedClients);
    //         }
    //     }
    // }, [mode, tender, form]);

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

    const handleAddClient = () => {
        append({ org: '', name: '', email: '', phone: '' });
    };

    if (tenderError) {
        return (
            <Alert variant="destructive">
                <AlertTitle>Error loading tender data</AlertTitle>
                <AlertDescription>{tenderError.message}</AlertDescription>
            </Alert>
        );
    }

    if (tenderLoading) {
        return (
            <Card>
                <CardContent className="p-8">
                    <div className="flex items-center justify-center">
                        <span className="animate-spin mr-2">⏳</span>
                        Loading tender data...
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>
                            {mode === 'create' ? 'Create' : 'Edit'} Request Extension
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
                {/* Tender Info Alert */}
                <div className="mb-6">
                    <Alert variant="default">
                        <AlertTitle>Requesting Extension for</AlertTitle>
                        {tender && (
                            <AlertDescription className="flex">
                                Tender No. <i>{tender.tenderNo}</i>, tender name <i>{tender.tenderName}</i> which is due on <i>{formatDateTime(tender.dueDate)}</i>.
                            </AlertDescription>
                        )}
                    </Alert>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit, (errors) => console.log(errors))} className="space-y-8">
                        {/* Extension Details */}
                        <div className="grid gap-4 md:grid-cols-6 items-start">
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
                                className="md:col-span-5"
                            >
                                {(field) => (
                                    <Textarea
                                        {...field}
                                        placeholder="Reason for Extension"
                                    />
                                )}
                            </FieldWrapper>
                        </div>

                        <Separator />

                        {/* Client Details Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Users className="h-5 w-5 text-muted-foreground" />
                                    <h3 className="text-lg font-medium">Client Details</h3>
                                    <span className="text-sm text-muted-foreground">
                                        ({fields.length} {fields.length === 1 ? 'client' : 'clients'})
                                    </span>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddClient}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Client
                                </Button>
                            </div>

                            {fields.length === 0 && (
                                <Alert>
                                    <AlertDescription>
                                        No clients added. Click "Add Client" to add client details.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {fields.map((field, index) => (
                                <Card key={field.id} className="border-dashed">
                                    <CardContent className="pt-4">
                                        <div className="flex items-start justify-between mb-4">
                                            <span className="text-sm font-medium text-muted-foreground">
                                                Client {index + 1}
                                            </span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => remove(index)}
                                                className="text-destructive hover:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                            <FieldWrapper
                                                control={form.control}
                                                name={`clients.${index}.org`}
                                                label="Organization"
                                            >
                                                {(fieldProps) => (
                                                    <Input
                                                        {...fieldProps}
                                                        placeholder="Organization name"
                                                    />
                                                )}
                                            </FieldWrapper>

                                            <FieldWrapper
                                                control={form.control}
                                                name={`clients.${index}.name`}
                                                label="Contact Name"
                                            >
                                                {(fieldProps) => (
                                                    <Input
                                                        {...fieldProps}
                                                        placeholder="Contact name"
                                                    />
                                                )}
                                            </FieldWrapper>

                                            <FieldWrapper
                                                control={form.control}
                                                name={`clients.${index}.email`}
                                                label="Email"
                                            >
                                                {(fieldProps) => (
                                                    <Input
                                                        {...fieldProps}
                                                        type="email"
                                                        placeholder="email@example.com"
                                                    />
                                                )}
                                            </FieldWrapper>

                                            <FieldWrapper
                                                control={form.control}
                                                name={`clients.${index}.phone`}
                                                label="Phone"
                                            >
                                                {(fieldProps) => (
                                                    <Input
                                                        {...fieldProps}
                                                        type="tel"
                                                        placeholder="+1234567890"
                                                    />
                                                )}
                                            </FieldWrapper>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Form Actions */}
                        <div className="flex justify-end gap-2 pt-6 border-t">
                            <Button
                                type="submit"
                                variant="outline"
                                onClick={() => navigate(-1)}
                                disabled={isSubmitting}
                                onSubmit={form.handleSubmit(
                                    handleSubmit,
                                    (errors) => {
                                        console.log('❌ Validation errors:', errors);
                                    }
                                )}
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
