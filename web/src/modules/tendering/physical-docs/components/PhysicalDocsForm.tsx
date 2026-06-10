import { paths } from '@/app/routes/paths';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { MultiSelectField } from '@/components/form/MultiSelectField';
import { SelectField } from '@/components/form/SelectField';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useInfoSheet } from '@/hooks/api/useInfoSheets';
import { useCreatePhysicalDoc, useUpdatePhysicalDoc } from '@/hooks/api/usePhysicalDocs';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowLeft, Mail, MapPin, Phone, Plus, Save, Trash2, User } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useFieldArray, useForm, type Resolver, type SubmitHandler } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
// Import from helpers
import { Label } from '@/components/ui/label';
import { useUsers } from '@/hooks/api/useUsers';
import { useCreateCourier } from '@/modules/shared/courier/courier.hooks';
import { Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { buildDefaultValues, mapFormToCreatePayload, mapFormToUpdatePayload, mapResponseToForm } from '../helpers/physicalDocs.mappers';
import { PhysicalDocsFormSchema } from '../helpers/physicalDocs.schema';
import type { PhysicalDocsFormValues, PhysicalDocsResponse } from '../helpers/physicalDocs.types';
import { useDocumentSubmittedOptions } from '../helpers/physicalDocs.types';

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
    // Fetch info sheet to pre-fill clients
    const { data: infoSheet, isLoading: isInfoSheetLoading } = useInfoSheet(tenderId);

    const createMutation = useCreatePhysicalDoc();
    const updateMutation = useUpdatePhysicalDoc();
    const createCourierMutation = useCreateCourier();
    const { data: employees = [] } = useUsers();

    const [files, setFiles] = useState<File[]>([]);
    const hasSubmittedRef = useRef(false);

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

    const isSubmitting = createMutation.isPending || updateMutation.isPending || createCourierMutation.isPending;

    const handleAddPerson = () => {
        append({ name: '', email: '', phone: '' });
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(event.target.files || []);
        if (selectedFiles.length === 0) return;
        setFiles(prev => [...prev, ...selectedFiles]);
        event.target.value = '';
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit: SubmitHandler<PhysicalDocsFormValues> = async (values) => {
        console.log("Form Values: ", values);
        
        if (hasSubmittedRef.current) return;
        hasSubmittedRef.current = true;

        try {
            let courierId = values.courierNo;

            // Step 1: Create Courier Request if needed
            const courierData = {
                toOrg: values.toOrg!,
                toName: values.toName!,
                toAddr: values.toAddr!,
                toPin: values.toPin!,
                toMobile: values.toMobile!,
                empFrom: values.empFrom!,
                delDate: values.delDate!,
                urgency: values.urgency!,
            };
            const createdCourier = await createCourierMutation.mutateAsync({ data: courierData, files });
            courierId = createdCourier.id;


            // Step 2: Create/Update Physical Docs
            const finalValues = { ...values, courierNo: courierId };
            if (mode === 'create') {
                const payload = mapFormToCreatePayload(finalValues);
                console.log("Create Payload: ", payload);
                
                await createMutation.mutateAsync(payload);
            } else if (existingData?.id) {
                const payload = mapFormToUpdatePayload(existingData.id, finalValues);
                console.log("Update Payload: ", payload);
                await updateMutation.mutateAsync(payload);
            }
            toast.success('Physical documents submitted successfully');
            navigate(paths.tendering.physicalDocs);
        } catch (error) {
            console.error('Error submitting physical docs:', error);
            hasSubmittedRef.current = false;
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
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <FieldWrapper control={form.control} name="toOrg" label="Organization Name">
                                        {(fieldProps) => <Input {...fieldProps} placeholder="Enter organization name" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="toName" label="Name">
                                        {(fieldProps) => <Input {...fieldProps} placeholder="Enter name" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="toAddr" label="Address">
                                        {(fieldProps) => <Input {...fieldProps} placeholder="Enter complete address" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="toPin" label="Pin Code">
                                        {(fieldProps) => <Input {...fieldProps} placeholder="Enter 6-digit pin code" maxLength={6} />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="toMobile" label="Mobile Number">
                                        {(fieldProps) => <Input {...fieldProps} placeholder="Enter 10-digit mobile number" maxLength={10} />}
                                    </FieldWrapper>
                                    <SelectField
                                        control={form.control}
                                        name="empFrom"
                                        label="Courier From"
                                        options={employees.map(e => ({ value: String(e.id), label: e.name }))}
                                        placeholder="Select Employee"
                                    />
                                    <FieldWrapper control={form.control} name="delDate" label="Expected Delivery Date">
                                        {(fieldProps) => <Input {...fieldProps} type="date" min={new Date().toISOString().split('T')[0]} />}
                                    </FieldWrapper>
                                    <SelectField
                                        control={form.control}
                                        name="urgency"
                                        label="Dispatch Urgency"
                                        options={[
                                            { value: '1', label: 'Same Day (Urgent)' },
                                            { value: '2', label: 'Next Day' }
                                        ]}
                                        placeholder="Select Urgency"
                                    />
                                    <MultiSelectField
                                        control={form.control}
                                        name="submittedDocs"
                                        label="Submitted Documents"
                                        options={documentSubmittedOptions}
                                        placeholder="Select documents"
                                    />
                                </div>

                                {/* File Upload Section */}
                                <div className="space-y-2">
                                    <Label>Soft Copy of the documents</Label>
                                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:border-muted-foreground/50 transition-colors">
                                        <Input
                                            id="courier_docs"
                                            type="file"
                                            className="hidden"
                                            multiple
                                            onChange={handleFileChange}
                                            disabled={isSubmitting}
                                        />
                                        <Label htmlFor="courier_docs" className="cursor-pointer flex flex-col items-center justify-center space-y-1">
                                            <Upload className="h-6 w-6 text-muted-foreground" />
                                            <div className="text-sm text-muted-foreground">Click to upload or drag and drop</div>
                                        </Label>
                                    </div>
                                    {files.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {files.map((file, index) => (
                                                <div key={index} className="flex items-center gap-2 bg-muted px-2 py-1 rounded text-xs">
                                                    <span className="truncate max-w-[150px]">{file.name}</span>
                                                    <button type="button" onClick={() => removeFile(index)} className="text-destructive">
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

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
                            <Button type="submit">
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
