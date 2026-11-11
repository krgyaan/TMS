import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider, type Resolver } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCreatePaymentRequest } from '@/hooks/api/usePaymentRequests';
import { PaymentSection } from '@/modules/tendering/emds-tenderfees/components/PaymentSection';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import DateInput from '@/components/form/DateInput';
import FieldWrapper from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { parseAllowedModes } from '@/modules/tendering/emds-tenderfees/constants';
import {
    BiOtherThanTenderRequestSchema,
    type BiOtherThanTenderRequestFormValues,
} from '@/modules/tendering/emds-tenderfees/helpers/payment-request.schema';

type FormValues = BiOtherThanTenderRequestFormValues;

// Stable reference — a new array each render makes PaymentSection's defaultMode effect loop.
const BG_ONLY_MODES = parseAllowedModes('BG');

interface BiBankGuaranteeRequestFormProps {
    projectId: number;
}

/**
 * Bank Guarantee request raised from a project dashboard ("Request BI").
 * Saves to the same payment_requests / payment_instruments tables as the
 * tendering EMD Bank Guarantee flow, with project_id set.
 */
export function BiBankGuaranteeRequestForm({ projectId }: BiBankGuaranteeRequestFormProps) {
    const navigate = useNavigate();
    const createRequest = useCreatePaymentRequest();

    const form = useForm<FormValues>({
        resolver: zodResolver(BiOtherThanTenderRequestSchema) as Resolver<FormValues>,
        defaultValues: {
            tenderName: '',
            tenderNo: '',
            tenderDueDate: '',
            EMD: { mode: 'BG', details: {} },
        },
    });

    const handleSubmit = async (values: FormValues) => {
        const details = values.EMD?.details || {};

        const payload: any = {
            type: 'Other Than Tender',
            tenderNo: values.tenderNo || '',
            tenderName: values.tenderName || '',
            dueDate: values.tenderDueDate || '',
            projectId,
            EMD: {
                mode: 'BG',
                details,
            },
        };

        try {
            await createRequest.mutateAsync({
                tenderId: 0,
                data: payload,
            });
            toast.success('Bank Guarantee request created successfully');
            navigate(-1);
        } catch (error) {
            console.error(error);
        }
    };

    const allowedModes = BG_ONLY_MODES;
    const type = 'OTHER_THAN_TENDER';

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl">Request Bank Guarantee</CardTitle>
                <CardDescription>
                    <p className="text-muted-foreground">
                        Raise a Bank Guarantee request for this project. It follows the same approval flow as an EMD Bank Guarantee.
                    </p>
                </CardDescription>
                <CardAction>
                    <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        <span className="hidden md:inline">Back</span>
                    </Button>
                </CardAction>
            </CardHeader>

            <CardContent>
                <Alert variant="warning" className="mb-6">
                    <AlertDescription>
                        This request is raised from the project dashboard and is not linked to a tender on TMS.
                    </AlertDescription>
                </Alert>

                <FormProvider {...form}>
                    <form
                        onSubmit={form.handleSubmit(handleSubmit, (errors) => {
                            console.error('Form validation errors:', errors);
                            toast.error('Please fix the errors in the form before submitting');
                        })}
                        className="space-y-8"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start mb-4">
                            <FieldWrapper control={form.control} name="tenderName" label="Project / Work Name">
                                {(field) => <Input {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="tenderNo" label="Work Order / Reference No.">
                                {(field) => <Input {...field} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="tenderDueDate" label="Bank Guarantee Due Date">
                                {(field) => <DateInput value={field.value || null} onChange={field.onChange} />}
                            </FieldWrapper>
                        </div>

                        <PaymentSection
                            purpose="EMD"
                            allowedModes={allowedModes}
                            amount={0}
                            type={type}
                            courierAddress={''}
                            defaultPurpose=""
                            defaultMode="BG"
                        />

                        <div className="flex items-center justify-end gap-4 pt-6 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                size="lg"
                                onClick={() => navigate(-1)}
                                disabled={createRequest.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                size="lg"
                                disabled={createRequest.isPending}
                                className="min-w-48"
                            >
                                {createRequest.isPending ? (
                                    'Submitting...'
                                ) : (
                                    <>
                                        <Save className="mr-2 h-5 w-5" />
                                        Submit Request
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </FormProvider>
            </CardContent>
        </Card>
    );
}
