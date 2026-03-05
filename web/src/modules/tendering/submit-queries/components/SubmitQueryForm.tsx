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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Plus, Trash2, Users, FileQuestion, Mail, X } from 'lucide-react';
import { paths } from '@/app/routes/paths';
import { SubmitQueryFormSchema, type SubmitQueryFormValues, queryTypeOptions } from '../helpers/submitQueries.schema';
import type { SubmitQueryListRow, SubmitQueryResponse } from '../helpers/submitQueries.types';
import { buildDefaultValues, mapFormToCreatePayload, mapFormToUpdatePayload, mapResponseToForm, defaultQueryItem, defaultClientContact } from '../helpers/submitQueries.mappers';
import { useCreateSubmitQuery, useUpdateSubmitQuery } from '@/hooks/api/useSubmitQuery';
import { useTender } from '@/hooks/api/useTenders';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface SubmitQueryFormProps {
    mode: 'create' | 'edit';
    tenderId?: number;
    existingData?: SubmitQueryResponse | SubmitQueryListRow;
}

export function SubmitQueryForm({ mode, tenderId, existingData }: SubmitQueryFormProps) {
    const navigate = useNavigate();

    const createMutation = useCreateSubmitQuery();
    const updateMutation = useUpdateSubmitQuery();

    // Fetch tender data
    const { data: tender, error: tenderError, isLoading: tenderLoading } = useTender(tenderId!);

    // Compute initial values based on mode
    const initialValues = useMemo(() => {
        if (mode === 'edit' && existingData) {
            return mapResponseToForm(existingData);
        }
        return buildDefaultValues(tenderId);
    }, [mode, existingData, tenderId]);

    const form = useForm<SubmitQueryFormValues>({
        resolver: zodResolver(SubmitQueryFormSchema) as Resolver<SubmitQueryFormValues>,
        defaultValues: initialValues,
    });

    // Field array for queries
    const {
        fields: queryFields,
        append: appendQuery,
        remove: removeQuery
    } = useFieldArray({
        control: form.control,
        name: 'queries',
    });

    // Field array for client contacts
    const {
        fields: contactFields,
        append: appendContact,
        remove: removeContact
    } = useFieldArray({
        control: form.control,
        name: 'clientContacts',
    });

    // Reset form when initial values change
    useEffect(() => {
        form.reset(initialValues);
    }, [form, initialValues]);

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    const handleSubmit: SubmitHandler<SubmitQueryFormValues> = async (values) => {
        console.log('Form values on submit:', values);
        try {
            if (mode === 'create') {
                const payload = mapFormToCreatePayload(values);
                await createMutation.mutateAsync(payload);
            } else if (existingData?.id) {
                const payload = mapFormToUpdatePayload(existingData.id, values);
                await updateMutation.mutateAsync({ id: existingData.id, data: payload });
            }
            navigate(paths.tendering.submitQuery);
        } catch (error) {
            console.error('Error submitting form:', error);
        }
    };

    const handleAddQuery = () => {
        appendQuery({ ...defaultQueryItem });
    };

    const handleAddContact = () => {
        appendContact({ ...defaultClientContact });
    };

    // Handle CC Emails for a specific contact
    const handleAddCcEmail = (contactIndex: number) => {
        const currentCcEmails = form.getValues(`clientContacts.${contactIndex}.cc_emails`) || [];
        form.setValue(`clientContacts.${contactIndex}.cc_emails`, [...currentCcEmails, '']);
    };

    const handleRemoveCcEmail = (contactIndex: number, emailIndex: number) => {
        const currentCcEmails = form.getValues(`clientContacts.${contactIndex}.cc_emails`) || [];
        const updatedCcEmails = currentCcEmails.filter((_, idx) => idx !== emailIndex);
        form.setValue(`clientContacts.${contactIndex}.cc_emails`, updatedCcEmails);
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
                            {mode === 'create' ? 'Submit' : 'Edit'} Query
                        </CardTitle>
                        <CardDescription className="mt-2">
                            {mode === 'create'
                                ? 'Submit a new query for the tender'
                                : 'Update query information'}
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
                {/* Tender Info */}
                {tender && (
                    <div className="mb-6 p-4 bg-muted rounded-lg">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <span className="font-semibold">Tender No:</span>
                                <span className="ml-2">{tender.tenderNo}</span>
                            </div>
                            <div className="col-span-3">
                                <span className="font-semibold">Tender Name:</span>
                                <span className="ml-2">{tender.tenderName}</span>
                            </div>
                        </div>
                    </div>
                )}

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit, (errors) => console.log(errors))} className="space-y-8">

                        {/* Queries Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileQuestion className="h-5 w-5 text-muted-foreground" />
                                    <h3 className="text-lg font-medium">Queries</h3>
                                    <span className="text-sm text-muted-foreground">
                                        ({queryFields.length} {queryFields.length === 1 ? 'query' : 'queries'})
                                    </span>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddQuery}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Query
                                </Button>
                            </div>

                            {queryFields.length === 0 && (
                                <Alert>
                                    <AlertDescription>
                                        No queries added. Click "Add Query" to add a query.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {queryFields.length > 0 && (
                                <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[100px]">Page No.</TableHead>
                                                <TableHead className="w-[100px]">Clause No.</TableHead>
                                                <TableHead className="w-[150px]">Type of Query</TableHead>
                                                <TableHead>Current Statement</TableHead>
                                                <TableHead>Requested Statement</TableHead>
                                                <TableHead className="w-[60px]">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {queryFields.map((field, index) => (
                                                <TableRow key={field.id}>
                                                    <TableCell>
                                                        <FieldWrapper
                                                            control={form.control}
                                                            name={`queries.${index}.pageNo`}
                                                            label=""
                                                        >
                                                            {(fieldProps) => (
                                                                <Input
                                                                    {...fieldProps}
                                                                    placeholder="Page"
                                                                    className="h-8"
                                                                />
                                                            )}
                                                        </FieldWrapper>
                                                    </TableCell>
                                                    <TableCell>
                                                        <FieldWrapper
                                                            control={form.control}
                                                            name={`queries.${index}.clauseNo`}
                                                            label=""
                                                        >
                                                            {(fieldProps) => (
                                                                <Input
                                                                    {...fieldProps}
                                                                    placeholder="Clause"
                                                                    className="h-8"
                                                                />
                                                            )}
                                                        </FieldWrapper>
                                                    </TableCell>
                                                    <TableCell>
                                                        <FieldWrapper
                                                            control={form.control}
                                                            name={`queries.${index}.queryType`}
                                                            label=""
                                                        >
                                                            {(fieldProps) => (
                                                                <Select
                                                                    value={fieldProps.value}
                                                                    onValueChange={fieldProps.onChange}
                                                                >
                                                                    <SelectTrigger className="h-8">
                                                                        <SelectValue placeholder="Select Type" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {queryTypeOptions.map((option) => (
                                                                            <SelectItem key={option.value} value={option.value}>
                                                                                {option.label}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            )}
                                                        </FieldWrapper>
                                                    </TableCell>
                                                    <TableCell>
                                                        <FieldWrapper
                                                            control={form.control}
                                                            name={`queries.${index}.currentStatement`}
                                                            label=""
                                                        >
                                                            {(fieldProps) => (
                                                                <Textarea
                                                                    {...fieldProps}
                                                                    placeholder="Current statement..."
                                                                    rows={2}
                                                                    className="min-h-[60px]"
                                                                />
                                                            )}
                                                        </FieldWrapper>
                                                    </TableCell>
                                                    <TableCell>
                                                        <FieldWrapper
                                                            control={form.control}
                                                            name={`queries.${index}.requestedStatement`}
                                                            label=""
                                                        >
                                                            {(fieldProps) => (
                                                                <Textarea
                                                                    {...fieldProps}
                                                                    placeholder="Requested statement..."
                                                                    rows={2}
                                                                    className="min-h-[60px]"
                                                                />
                                                            )}
                                                        </FieldWrapper>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removeQuery(index)}
                                                            className="text-destructive hover:text-destructive"
                                                            disabled={queryFields.length === 1}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* Client Contact Details Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Users className="h-5 w-5 text-muted-foreground" />
                                    <h3 className="text-lg font-medium">Client Contact Details</h3>
                                    <span className="text-sm text-muted-foreground">
                                        ({contactFields.length} {contactFields.length === 1 ? 'contact' : 'contacts'})
                                    </span>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddContact}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Contact
                                </Button>
                            </div>

                            {contactFields.length === 0 && (
                                <Alert>
                                    <AlertDescription>
                                        No contacts added. Click "Add Contact" to add client contact details.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {contactFields.map((field, index) => (
                                <Card key={field.id} className="border-dashed">
                                    <CardContent className="pt-4">
                                        <div className="flex items-start justify-between mb-4">
                                            <span className="text-sm font-medium text-muted-foreground">
                                                Contact {index + 1}
                                            </span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeContact(index)}
                                                className="text-destructive hover:text-destructive"
                                                disabled={contactFields.length === 1}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                            <FieldWrapper
                                                control={form.control}
                                                name={`clientContacts.${index}.client_org`}
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
                                                name={`clientContacts.${index}.client_name`}
                                                label="Contact Person"
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
                                                name={`clientContacts.${index}.client_email`}
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
                                                name={`clientContacts.${index}.client_phone`}
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

                                        {/* CC Emails Section */}
                                        <div className="mt-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm font-medium">CC Emails</span>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleAddCcEmail(index)}
                                                >
                                                    Add CC Mail<Plus className="h-3 w-3" />
                                                </Button>
                                            </div>

                                            <div className="grid gap-2 grid-cols-6">
                                                {(form.watch(`clientContacts.${index}.cc_emails`) || []).map((_, emailIndex) => (
                                                    <div key={emailIndex} className="flex items-center gap-2">
                                                        <FieldWrapper
                                                            control={form.control}
                                                            name={`clientContacts.${index}.cc_emails.${emailIndex}`}
                                                            label=""
                                                            className="flex-1"
                                                        >
                                                            {(fieldProps) => (
                                                                <Input
                                                                    {...fieldProps}
                                                                    type="email"
                                                                    placeholder="cc@example.com"
                                                                />
                                                            )}
                                                        </FieldWrapper>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleRemoveCcEmail(index, emailIndex)}
                                                            className="text-destructive hover:text-destructive"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
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
                                Submit Query
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

export default SubmitQueryForm;
