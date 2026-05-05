import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider, type Resolver } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCreatePaymentRequest, useUpdatePaymentRequest, useEmdTenderFeeDetails } from '@/hooks/api/usePaymentRequests';
import { PaymentSection } from './PaymentSection';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { parseAllowedModes } from '../constants';
import { Skeleton } from '@/components/ui/skeleton';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { PaymentRequestSchema, type PaymentRequestFormValues } from '../helpers/payment-request.schema';

type FormValues = PaymentRequestFormValues;

interface EmdTenderFeeRequestFormProps {
    tenderId?: number;
    requestIds?: {
        emd?: number;
        tenderFee?: number;
        processingFee?: number;
    };
    initialData?: FormValues;
    mode?: 'create' | 'edit';
}

function transformModeForBackend(mode: string): string {
    const mapping: Record<string, string> = {
        BT: 'BANK_TRANSFER',
        POP: 'PORTAL',
    };
    return mapping[mode] || mode;
}

export function EmdTenderFeeRequestForm({ tenderId, requestIds, initialData, mode = 'create' }: EmdTenderFeeRequestFormProps) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data, isLoading: isDataLoading } = useEmdTenderFeeDetails(tenderId ? Number(tenderId) : null);
    const createRequest = useCreatePaymentRequest();
    const updateRequest = useUpdatePaymentRequest();
    const isEditMode = mode === 'edit';

    const form = useForm<FormValues>({
        resolver: zodResolver(PaymentRequestSchema) as Resolver<FormValues>,
        defaultValues: initialData || {
            EMD: { mode: undefined, details: {} },
            TENDER_FEES: { mode: undefined, details: {} },
            PROCESSING_FEES: { mode: undefined, details: {} },
        },
    });

    useEffect(() => {
        if (initialData) {
            form.reset(initialData);
        }
    }, [initialData, form]);

    const handleSubmit = async (values: FormValues) => {
        console.log("Initial Form Values", initialData);
        console.log("Updated Form Values", values);

        if (isEditMode) {
            const updatePromises: Promise<any>[] = [];

            if (values.EMD?.mode && requestIds?.emd) {
                const payload = {
                    EMD: {
                        mode: transformModeForBackend(values.EMD.mode),
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

            if (values.TENDER_FEES?.mode && requestIds?.tenderFee) {
                const payload = {
                    TENDER_FEES: {
                        mode: transformModeForBackend(values.TENDER_FEES.mode),
                        details: values.TENDER_FEES.details || {},
                    },
                };
                updatePromises.push(
                    updateRequest.mutateAsync({
                        id: requestIds.tenderFee,
                        data: payload,
                    })
                );
            }

            if (values.PROCESSING_FEES?.mode && requestIds?.processingFee) {
                const payload = {
                    PROCESSING_FEES: {
                        mode: transformModeForBackend(values.PROCESSING_FEES.mode),
                        details: values.PROCESSING_FEES.details || {},
                    },
                };
                updatePromises.push(
                    updateRequest.mutateAsync({
                        id: requestIds.processingFee,
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

            if (values.EMD?.mode) {
                payload.EMD = {
                    mode: transformModeForBackend(values.EMD.mode),
                    details: values.EMD.details || {},
                };
            }

            if (values.TENDER_FEES?.mode) {
                payload.TENDER_FEES = {
                    mode: transformModeForBackend(values.TENDER_FEES.mode),
                    details: values.TENDER_FEES.details || {},
                };
            }

            if (values.PROCESSING_FEES?.mode) {
                payload.PROCESSING_FEES = {
                    mode: transformModeForBackend(values.PROCESSING_FEES.mode),
                    details: values.PROCESSING_FEES.details || {},
                };
            }

            if (!payload.EMD && !payload.TENDER_FEES && !payload.PROCESSING_FEES) {
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

    if (isDataLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-96 mt-2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-64 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (!data) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Tender not found</AlertDescription>
            </Alert>
        );
    }

    const emdAmount = data?.emd || 0;
    const tenderFeeAmount = data?.tenderFees || 0;
    const processingFeeAmount = data?.processingFeeAmount || 0;

    const hasEmd = emdAmount > 0;
    const hasTenderFee = tenderFeeAmount > 0;
    const hasProcessingFee = processingFeeAmount > 0;

    if (!hasEmd && !hasTenderFee && !hasProcessingFee) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>No Payment Required</CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            No EMD, Tender Fee, or Processing Fee is required for this tender.
                        </AlertDescription>
                    </Alert>
                    <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const allowedEmdModes = parseAllowedModes(data?.emdMode);
    const allowedTenderFeeModes = parseAllowedModes(data?.tenderFeeMode);
    const allowedProcessingFeeModes = parseAllowedModes(data?.processingFeeMode);

    const isPending = isEditMode ? updateRequest.isPending : createRequest.isPending;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl">
                    {isEditMode ? 'Edit Payment Request' : 'Create Payment Request'}
                </CardTitle>
                <CardAction>
                    <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        <span className="hidden md:inline">Back to List</span>
                    </Button>
                </CardAction>
            </CardHeader>

            <CardContent>
                <FormProvider {...form}>
                    <form
                        onSubmit={form.handleSubmit(handleSubmit, (errors) => {
                            console.error('Form validation errors:', errors);
                            toast.error('Please fix the errors in the form before submitting');
                        })}
                        className="space-y-8"
                    >
                        {/* Tender Related FormFields */}
                        {tenderId && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg border">
                                <FieldWrapper control={form.control} name="tenderNo" label="Tender Number">
                                    {(field) => <Input {...field} value={data?.tenderNo || ''} readOnly className="bg-background" />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="tenderName" label="Tender Name">
                                    {(field) => <Input {...field} value={data?.tenderName || ''} readOnly className="bg-background" />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="tenderDueDate" label="Due Date">
                                    {(field) => <Input {...field} value={data?.dueDate ? new Date(data.dueDate).toLocaleDateString('en-IN') : ''} readOnly className="bg-background" />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="requestedBy" label="Requested By">
                                    {(field) => <Input {...field} value={user?.name || ''} readOnly className="bg-background" />}
                                </FieldWrapper>
                            </div>
                        )}

                        {hasEmd && (
                            <PaymentSection
                                purpose="EMD"
                                allowedModes={allowedEmdModes}
                                amount={emdAmount}
                                type="TMS"
                                courierAddress={data?.courierAddress || undefined}
                                defaultPurpose="EMD"
                            />
                        )}

                        {hasTenderFee && (
                            <PaymentSection
                                purpose="TENDER_FEES"
                                allowedModes={allowedTenderFeeModes}
                                amount={tenderFeeAmount}
                                type="TMS"
                                courierAddress={data?.courierAddress || undefined}
                                defaultPurpose="TENDER_FEES"
                            />
                        )}

                        {hasProcessingFee && (
                            <PaymentSection
                                purpose="PROCESSING_FEES"
                                allowedModes={allowedProcessingFeeModes}
                                amount={processingFeeAmount}
                                type="TMS"
                                courierAddress={data?.courierAddress || undefined}
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
