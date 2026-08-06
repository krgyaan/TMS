import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { Users } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { ContactPersonForm } from '@/components/form/contactpersonform';
import { FollowUpFrequencySelect } from '@/components/form/FollowUpFrequencySelect';
import { FollowupEmailEditor } from '@/components/form/FollowupEmailEditor';
import DateInput from '@/components/form/DateInput';
import { useEnquiryResult, useCreateEnquiryResultFollowup } from '@/hooks/api/useEnquiryResult';

const ContactSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    designation: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    email: z.string().email().optional().nullable(),
});

const QuotationFollowupSchema = z.object({
    organisation_name: z.string().min(1, 'Organisation name is required'),
    contacts: z.array(ContactSchema).min(1, 'At least one contact is required'),
    followup_start_date: z.string().optional(),
    frequency: z.number().int().min(1).max(8).optional(),
    emailBody: z.string().optional(),
});

type QuotationFollowupForm = z.infer<typeof QuotationFollowupSchema>;

const QuotationFollowupPage = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const resultId = id ? Number(id) : null;

    const { data: result, isLoading, error } = useEnquiryResult(resultId);
    const createFollowup = useCreateEnquiryResultFollowup();

    const form = useForm<QuotationFollowupForm>({
        resolver: zodResolver(QuotationFollowupSchema) as Resolver<QuotationFollowupForm>,
        defaultValues: {
            organisation_name: '',
            contacts: [],
            followup_start_date: '',
            frequency: 1,
        },
    });

    useEffect(() => {
        if (result) {
            const orgName = result.organizationName || result.enqName || '';
            if (orgName && !form.getValues('organisation_name')) {
                form.setValue('organisation_name', orgName);
            }
            if (result.contacts && result.contacts.length > 0 && form.getValues('contacts').length === 0) {
                form.setValue('contacts', result.contacts.map(c => ({
                    name: c.name,
                    designation: c.designation || '',
                    phone: c.phone || '',
                    email: c.email || '',
                })));
            }
        }
    }, [result, form]);

    const isSubmitting = form.formState.isSubmitting || createFollowup.isPending;

    const handleSubmit = async (values: QuotationFollowupForm) => {
        if (!resultId) return;

        try {
            await createFollowup.mutateAsync({
                id: resultId,
                data: {
                    organisation_name: values.organisation_name,
                    contacts: values.contacts?.map(c => ({
                        name: c.name,
                        designation: c.designation || null,
                        phone: c.phone || null,
                        email: c.email || null,
                    })) || [],
                    followup_start_date: values.followup_start_date,
                    frequency: values.frequency,
                    emailBody: values.emailBody || undefined,
                },
            });
            toast.success('Follow-up initiated successfully');
            navigate(-1);
            form.reset();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } }; message?: string };
            const message = err?.response?.data?.message || err?.message || 'Failed to initiate follow-up';
            toast.error(message);
            console.error('Error initiating follow-up:', error);
        }
    };

    if (!id) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Enquiry result ID is required</AlertDescription>
            </Alert>
        );
    }

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                </CardHeader>
            </Card>
        );
    }

    if (error || !result) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Failed to load enquiry result</AlertDescription>
            </Alert>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Initiate Followup</h3>
                </div>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FieldWrapper control={form.control} name="organisation_name" label="Organisation Name">
                                    {(field) => <Input {...field} placeholder="Enter organisation name" />}
                                </FieldWrapper>
                            </div>

                            <div>
                                <ContactPersonForm control={form.control} name="contacts" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FieldWrapper control={form.control} name="followup_start_date" label="Follow-up Start Date">
                                    {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                                </FieldWrapper>
                                <FollowUpFrequencySelect control={form.control} name="frequency" />
                            </div>

                            <div className="pt-4 border-t">
                                <FollowupEmailEditor
                                    instrumentType="Quotation"
                                    templateData={{
                                        tenderNo: result.enquiryNumber,
                                        projectName: result.enqName,
                                        amount: result.finalPrice,
                                        status: result.status,
                                        transactionDate: result.quoteSubmissionDatetime || undefined,
                                    }}
                                    onEmailBodyChange={(html) => form.setValue('emailBody', html, { shouldValidate: false })}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 pt-4 border-t">
                            <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Submitting...' : 'Initiate Followup'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
};

export default QuotationFollowupPage;
