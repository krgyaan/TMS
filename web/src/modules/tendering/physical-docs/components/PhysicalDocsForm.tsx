import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { type SubmitHandler, useForm, useFieldArray, type Resolver } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { MultiSelectField } from '@/components/form/MultiSelectField';
import { SelectField } from '@/components/form/SelectField';
import { ArrowLeft, Save, AlertCircle, Plus, Trash2, User, Mail, Phone, MapPin } from 'lucide-react';
import { paths } from '@/app/routes/paths';
import { useCreatePhysicalDoc, useUpdatePhysicalDoc } from '@/hooks/api/usePhysicalDocs';
import { useInfoSheet } from '@/hooks/api/useInfoSheets';
// Import from helpers
import { PhysicalDocsFormSchema } from '../helpers/physicalDocs.schema';
import type { PhysicalDocsFormValues, PhysicalDocsResponse } from '../helpers/physicalDocs.types';
import { useDocumentSubmittedOptions } from '../helpers/physicalDocs.types';
import { buildDefaultValues, mapResponseToForm, mapFormToCreatePayload, mapFormToUpdatePayload } from '../helpers/physicalDocs.mappers';
import { useCourierOptions } from '@/modules/shared/courier/courier.hooks';

interface PhysicalDocsFormProps {
    tenderId: number;
    mode: 'create' | 'edit';
    existingData?: PhysicalDocsResponse;
}

const FormLoadingSkeleton = () => (
    <Card>
        <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
            <Skeleton className="h-[400px] w-full" />
        </CardContent>
    </Card>
);

export function PhysicalDocsForm({ tenderId, mode, existingData }: PhysicalDocsFormProps) {
    const navigate = useNavigate();

    const documentSubmittedOptions = useDocumentSubmittedOptions();
    const courierOptions = useCourierOptions();
    // Fetch info sheet to pre-fill clients
    const { data: infoSheet, isLoading: isInfoSheetLoading } = useInfoSheet(tenderId);

    const createMutation = useCreatePhysicalDoc();
    const updateMutation = useUpdatePhysicalDoc();

    // Compute initial values
    const initialValues = useMemo(() => {
        if (mode === 'edit' && existingData) {
            return mapResponseToForm(tenderId, existingData, infoSheet);
        }
        return buildDefaultValues(tenderId, infoSheet);
    }, [tenderId, mode, existingData, infoSheet]);

    const form = useForm<PhysicalDocsFormValues>({
        resolver: zodResolver(PhysicalDocsFormSchema) as Resolver<PhysicalDocsFormValues>,
        defaultValues: initialValues,
    });

    // Reset form when initial values change (after info sheet loads)
    useEffect(() => {
        form.reset(initialValues);
    }, [form, initialValues]);

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'physicalDocsPersons',
    });

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    const handleAddPerson = () => {
        append({ name: '', email: '', phone: '' });
    };

    const handleSubmit: SubmitHandler<PhysicalDocsFormValues> = async (values) => {
        try {
            if (mode === 'create') {
                const payload = mapFormToCreatePayload(values);
                await createMutation.mutateAsync(payload);
            } else if (existingData?.id) {
                const payload = mapFormToUpdatePayload(existingData.id, values);
                await updateMutation.mutateAsync(payload);
            }
            navigate(paths.tendering.physicalDocs);
        } catch (error) {
            console.error('Error submitting physical docs:', error);
        }
    };

    // Show loading while fetching info sheet (for pre-filling clients)
    if (mode === 'create' && isInfoSheetLoading) {
        return <FormLoadingSkeleton />;
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>
                            {mode === 'create' ? 'Submit' : 'Edit'} Physical Documents
                        </CardTitle>
                        <CardDescription className="mt-2">
                            {mode === 'create'
                                ? 'Submit physical documents for this tender'
                                : 'Update physical document information'}
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
                        {/* Courier Information */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-base text-primary border-b pb-2">
                                Courier Information
                            </h4>
                            <div className="grid gap-4 md:grid-cols-3">
                                <SelectField
                                    control={form.control}
                                    name="courierNo"
                                    label="Courier/Tracking Number"
                                    options={courierOptions}
                                    placeholder="Select courier number"
                                />
                                <MultiSelectField
                                    control={form.control}
                                    name="submittedDocs"
                                    label="Submitted Documents"
                                    options={documentSubmittedOptions}
                                    placeholder="Select documents"
                                />
                                {/* Courier Address from Info Sheet */}
                                {infoSheet?.courierAddress && (
                                    <div className="space-y-4">
                                        <div className="border rounded-lg p-4 bg-muted/30">
                                            <div className="flex items-start gap-3">
                                                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                                <div className="flex-1">
                                                    <p className="text-sm text-muted-foreground mb-1">From Info Sheet</p>
                                                    <p className="text-sm whitespace-pre-wrap">{infoSheet.courierAddress}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>


                        {/* Persons Submitting Documents */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h4 className="font-semibold text-base text-primary">
                                    Person(s) Submitting Documents
                                </h4>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddPerson}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Person
                                </Button>
                            </div>

                            {fields.length === 0 && (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        Please add at least one person who is submitting the documents.
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-4">
                                {fields.map((field, index) => (
                                    <div
                                        key={field.id}
                                        className="border rounded-lg p-4 space-y-4 bg-muted/30"
                                    >
                                        <div className="flex items-center justify-between">
                                            <h5 className="font-medium text-sm">Person {index + 1}</h5>
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

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <FieldWrapper
                                                control={form.control}
                                                name={`physicalDocsPersons.${index}.name`}
                                                label="Full Name"
                                            >
                                                {(fieldProps) => (
                                                    <div className="relative">
                                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                        <Input
                                                            {...fieldProps}
                                                            className="pl-10"
                                                            placeholder="Enter full name"
                                                        />
                                                    </div>
                                                )}
                                            </FieldWrapper>

                                            <FieldWrapper
                                                control={form.control}
                                                name={`physicalDocsPersons.${index}.email`}
                                                label="Email Address"
                                            >
                                                {(fieldProps) => (
                                                    <div className="relative">
                                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                        <Input
                                                            {...fieldProps}
                                                            type="email"
                                                            className="pl-10"
                                                            placeholder="email@example.com"
                                                        />
                                                    </div>
                                                )}
                                            </FieldWrapper>

                                            <FieldWrapper
                                                control={form.control}
                                                name={`physicalDocsPersons.${index}.phone`}
                                                label="Phone Number"
                                            >
                                                {(fieldProps) => (
                                                    <div className="relative">
                                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                        <Input
                                                            {...fieldProps}
                                                            className="pl-10"
                                                            placeholder="Enter phone number"
                                                        />
                                                    </div>
                                                )}
                                            </FieldWrapper>
                                        </div>
                                    </div>
                                ))}
                            </div>
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
                                disabled={isSubmitting || fields.length === 0}
                            >
                                {isSubmitting && <span className="animate-spin mr-2">⏳</span>}
                                <Save className="mr-2 h-4 w-4" />
                                {mode === 'create' ? 'Submit' : 'Update'} Physical Docs
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

export default PhysicalDocsForm;
