import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { type SubmitHandler, useForm, useFieldArray } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, AlertCircle, Plus, Trash2, User, Mail, Phone } from 'lucide-react';
import { paths } from '@/app/routes/paths';
import { useCreatePhysicalDoc, useUpdatePhysicalDoc } from '@/hooks/api/usePhysicalDocs';
import type { PhysicalDocs } from '@/types/api.types';
import { MultiSelectField } from '@/components/form/MultiSelectField';
import SelectField from '@/components/form/SelectField';
import { useEffect } from 'react';

const PhysicalDocsFormSchema = z.object({
    tenderId: z.number().min(1, 'Tender ID is required'),
    courierNo: z.number().min(1, 'Courier number is required'),
    submittedDocs: z.array(z.string()).min(1, 'At least one document must be selected'),
    physicalDocsPersons: z.array(z.object({
        name: z.string().min(1, 'Name is required'),
        email: z.string().email('Invalid email address'),
        phone: z.string().min(10, 'Phone number must be at least 10 digits'),
    })).min(1, 'At least one person must be added'),
});

type FormValues = z.infer<typeof PhysicalDocsFormSchema>;

interface PhysicalDocsFormProps {
    tenderId: number;
    mode: 'create' | 'edit';
    existingData?: PhysicalDocs;
}

const submittedDocsOptions = [
    { value: 'technicalBid', label: 'Technical Bid' },
    { value: 'financialBid', label: 'Financial Bid' },
    { value: 'emd', label: 'EMD' },
    { value: 'other', label: 'Other' },
];

const courierOptions = [
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '4', label: '4' },
    { value: '5', label: '5' },
];

export default function PhysicalDocsForm({ tenderId, mode, existingData }: PhysicalDocsFormProps) {
    const navigate = useNavigate();
    const createMutation = useCreatePhysicalDoc();
    const updateMutation = useUpdatePhysicalDoc();

    const form = useForm<FormValues>({
        resolver: zodResolver(PhysicalDocsFormSchema),
        defaultValues: {
            tenderId: tenderId,
            courierNo: undefined!,
            submittedDocs: [],
            physicalDocsPersons: [],
        },
    });

    useEffect(() => {
        if (existingData) {
            form.reset({
                tenderId: tenderId,
                courierNo: existingData.courierNo || undefined!,
                submittedDocs: existingData.submittedDocs?.split(',') || [],
                physicalDocsPersons: existingData.persons?.map((person) => ({
                    name: person.name,
                    email: person.email,
                    phone: person.phone,
                })) || [],
            });
        }
    }, [existingData, form, tenderId]);

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'physicalDocsPersons',
    });

    const isSubmitting = form.formState.isSubmitting;

    const onSubmit: SubmitHandler<FormValues> = async (data) => {
        try {
            if (mode === 'create') {
                await createMutation.mutateAsync({
                    tenderId: data.tenderId,
                    courierNo: data.courierNo,
                    submittedDocs: data.submittedDocs.join(','),
                    physicalDocsPersons: data.physicalDocsPersons,
                });
            } else if (existingData?.id) {
                await updateMutation.mutateAsync({
                    id: existingData.id,
                    courierNo: data.courierNo,
                    submittedDocs: data.submittedDocs.join(','),
                    physicalDocsPersons: data.physicalDocsPersons,
                });
            }
            navigate(paths.tendering.physicalDocs);
        } catch (error) {
            console.error('Error submitting physical docs:', error);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>{mode === 'create' ? 'Submit' : 'Edit'} Physical Documents</CardTitle>
                        <CardDescription className="mt-2">
                            {mode === 'create' ? 'Submit physical documents for this tender' : 'Update physical document information'}
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
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        {/* Courier Information */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-base text-primary border-b pb-2">
                                Courier Information
                            </h4>

                            <div className='grid gap-4 md:grid-cols-2'>
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
                                    options={submittedDocsOptions}
                                    placeholder="Select documents"
                                />
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
                                    onClick={() => append({ name: '', email: '', phone: '' })}
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
                                    <div key={field.id} className="border rounded-lg p-4 space-y-4 bg-muted/30">
                                        <div className="flex items-center justify-between">
                                            <h5 className="font-medium text-sm">Person {index + 1}</h5>
                                            {fields.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => remove(index)}
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <FieldWrapper
                                                control={form.control}
                                                name={`physicalDocsPersons.${index}.name`}
                                                label="Full Name"
                                            >
                                                {(field) => (
                                                    <div className="relative">
                                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                        <Input
                                                            {...field}
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
                                                {(field) => (
                                                    <div className="relative">
                                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                        <Input
                                                            {...field}
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
                                                {(field) => (
                                                    <div className="relative">
                                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                        <Input
                                                            {...field}
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
                                onClick={() => form.reset()}
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
