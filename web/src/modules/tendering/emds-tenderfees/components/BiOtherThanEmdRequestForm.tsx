import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider, type Resolver } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCreatePaymentRequest, useUpdatePaymentRequest } from '@/hooks/api/usePaymentRequests';
import { PaymentSection } from './PaymentSection';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import DateInput from '@/components/form/DateInput';
import FieldWrapper from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { parseAllowedModes } from '../constants';
import { BiOtherThanTenderRequestSchema, type BiOtherThanTenderRequestFormValues } from '../helpers/payment-request.schema';

type FormValues = BiOtherThanTenderRequestFormValues;

interface BiOtherThanEmdRequestFormProps {
    tenderId?: number;
    requestIds?: {
        emd?: number;
        tenderFee?: number;
        processingFee?: number;
    };
    initialData?: FormValues;
    mode?: 'create' | 'edit';
}

export function BiOtherThanEmdRequestForm({ tenderId, requestIds, initialData, mode = 'create' }: BiOtherThanEmdRequestFormProps) {
    const navigate = useNavigate();
    const createRequest = useCreatePaymentRequest();
    const updateRequest = useUpdatePaymentRequest();
    const isEditMode = mode === 'edit';

    const form = useForm<FormValues>({
        resolver: zodResolver(BiOtherThanTenderRequestSchema) as Resolver<FormValues>,
        defaultValues: initialData || { tenderName: '', tenderNo: '', tenderDueDate: '', EMD: { mode: undefined, details: {} } },
    });

    useEffect(() => {
        if (initialData) {
            form.reset(initialData);
        }
    }, [initialData, form]);

    const handleSubmit = async (values: FormValues) => {
        if (isEditMode) {
            const updatePromises: Promise<any>[] = [];

            if (values.EMD?.mode && requestIds?.emd) {
                const payload = {
                    EMD: {
                        mode: values.EMD.mode,
                        details: values.EMD.details || {},
                    },
                };
                updatePromises.push(
                    updateRequest.mutateAsync({
                        id: requestIds.emd,
                        data: payload,
                    })
                );
            }

            if (updatePromises.length === 0) {
                toast.error('No payment requests to update');
                return;
            }

            try {
                await Promise.all(updatePromises);
                toast.success('Payment request(s) updated successfully');
                navigate(-1);
            } catch (error) {
                toast.error('Failed to update payment request(s)');
                console.error(error);
            }
        } else {
            const payload: any = {
                type: 'Other Than Tender',
                tenderNo: values.tenderNo || '',
                tenderName: values.tenderName || '',
                dueDate: values.tenderDueDate || '',
            };

            if (values.EMD?.mode) {
                payload.EMD = {
                    mode: values.EMD.mode,
                    details: values.EMD.details || {},
                };
            }

            if (!payload.EMD) {
                toast.error('Please select at least one payment mode');
                return;
            }

            try {
                await createRequest.mutateAsync({
                    tenderId: Number(tenderId) || 0,
                    data: payload,
                });
                toast.success('Payment request created successfully');
                navigate(-1);
            } catch (error) {
                toast.error('Failed to create payment request');
                console.error(error);
            }
        }
    };



    const allowedEmdModes = parseAllowedModes(['DD', 'FDR', 'BG', 'CHEQUE'].join(','));
    const hasEmd = true;
    const type = 'OTHER_THAN_TENDER';

    const isPending = isEditMode ? updateRequest.isPending : createRequest.isPending;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl">
                    {isEditMode ? 'Edit Payment Request' : 'Create Payment Request'}
                </CardTitle>
                <CardDescription>
                    <p className="text-muted-foreground">You are filling this request for BI other than EMD.</p>
                </CardDescription>
                <CardAction>
                    <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        <span className="hidden md:inline">Back to List</span>
                    </Button>
                </CardAction>
            </CardHeader>

            <CardContent>
                {(tenderId === 0 || !tenderId) && (
                    <Alert variant="warning" className="mb-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>Be Sure! The Request you are raising is not associated with any tender on TMS</AlertDescription>
                    </Alert>
                )}
                <FormProvider {...form}>
                    <form
                        onSubmit={form.handleSubmit(handleSubmit, (errors) => {
                            console.error('Form validation errors:', errors);
                            toast.error('Please fix the errors in the form before submitting');
                        })}
                        className="space-y-8"
                    >
                        {/* Tender Details */}
                        {
                            (type === 'OTHER_THAN_TENDER') && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start mb-4">
                                    <FieldWrapper control={form.control} name="tenderName" label="Tender/Project Name">
                                        {(field) => <Input {...field} />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="tenderNo" label="Tender/Work Order No.">
                                        {(field) => <Input {...field} />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="tenderDueDate" label="Tender/Work Order Due Date">
                                        {(field) => <DateInput value={field.value || null} onChange={field.onChange} />}
                                    </FieldWrapper>
                                </div>
                            )
                        }

                        {hasEmd && (
                            <PaymentSection
                                purpose="EMD"
                                allowedModes={allowedEmdModes}
                                amount={0}
                                type={type}
                                courierAddress={''}
                                defaultPurpose=""
                            />
                        )}

                        <div className="flex items-center justify-end gap-4 pt-6 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                size="lg"
                                onClick={() => navigate(-1)}
                                disabled={isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                size="lg"
                                disabled={isPending}
                                className="min-w-48"
                            >
                                {isPending ? (
                                    'Submitting...'
                                ) : (
                                    <>
                                        <Save className="mr-2 h-5 w-5" />
                                        {isEditMode ? 'Update Request' : 'Submit Request'}
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
