import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCreatePaymentRequest, useUpdatePaymentRequest } from '@/hooks/api/useEmds';
import { EmdSection } from './EmdSection';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import DateInput from '@/components/form/DateInput';
import FieldWrapper from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { BiOtherThanEmdRequestSchema, type BiOtherThanEmdRequestFormValues } from '../helpers/emdTenderFee.schema';

type FormValues = BiOtherThanEmdRequestFormValues;

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
        resolver: zodResolver(BiOtherThanEmdRequestSchema),
        defaultValues: initialData || { tenderName: '', tenderNo: '', tenderDueDate: '', emd: { mode: undefined, details: {} } },
    });

    useEffect(() => {
        if (initialData) {
            form.reset(initialData);
        }
    }, [initialData, form]);

    const handleSubmit = async (values: FormValues) => {
        if (isEditMode) {
            const updatePromises: Promise<any>[] = [];

            if (values.emd?.mode && requestIds?.emd) {
                const payload = {
                    emd: {
                        mode: values.emd.mode,
                        details: values.emd.details || {},
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
            const payload: any = {};

            if (values.emd?.mode) {
                payload.emd = {
                    mode: values.emd.mode,
                    details: values.emd.details || {},
                };
            }

            if (!payload.emd) {
                toast.error('Please select at least one payment mode');
                return;
            }

            try {
                await createRequest.mutateAsync({
                    tenderId: Number(tenderId),
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

    if (tenderId === 0 || !tenderId) {
        <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Be Sure! The Request you are raising is not associated with any tender on TMS</AlertDescription>
        </Alert>
    }

    const allowedEmdModes = ['DD', 'FDR', 'CHEQUE', 'BG'];
    const hasEmd = true;
    const type = 'BI_OTHER_THAN_EMD';

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
                <FormProvider {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
                        {/* Tender Details */}
                        {
                            (type === 'BI_OTHER_THAN_EMD') && (
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
                            <EmdSection
                                allowedModes={allowedEmdModes}
                                amount={0}
                                defaultPurpose="EMD"
                                type={type}
                                courierAddress={''}
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
