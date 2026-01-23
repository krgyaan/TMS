import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider, type Resolver } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCreatePaymentRequest, useUpdatePaymentRequest } from '@/hooks/api/useEmds';
import { EmdSection } from './EmdSection';
import { TenderFeeSection } from './TenderFeeSection';
import { ProcessingFeeSection } from './ProcessingFeeSection';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { DateInput } from '@/components/form/DateInput';
import FieldWrapper from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { OldEmdRequestSchema, type OldEmdRequestFormValues } from '../helpers/emdTenderFee.schema';

type FormValues = OldEmdRequestFormValues;

interface OldEmdRequestFormProps {
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

export function OldEmdRequestForm({ tenderId, requestIds, initialData, mode = 'create' }: OldEmdRequestFormProps) {
    const navigate = useNavigate();
    const createRequest = useCreatePaymentRequest();
    const updateRequest = useUpdatePaymentRequest();
    const isEditMode = mode === 'edit';

    const form = useForm<FormValues>({
        resolver: zodResolver(OldEmdRequestSchema) as Resolver<FormValues>,
        defaultValues: initialData || {
            tenderName: '',
            tenderNo: '',
            tenderDueDate: '',
            emd: { mode: undefined, details: {} },
            tenderFee: { mode: undefined, details: {} },
            processingFee: { mode: undefined, details: {} },
        },
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
                        mode: transformModeForBackend(values.emd.mode),
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

            if (values.tenderFee?.mode && requestIds?.tenderFee) {
                const payload = {
                    tenderFee: {
                        mode: transformModeForBackend(values.tenderFee.mode),
                        details: values.tenderFee.details || {},
                    },
                };
                updatePromises.push(
                    updateRequest.mutateAsync({
                        id: requestIds.tenderFee,
                        data: payload,
                    })
                );
            }

            if (values.processingFee?.mode && requestIds?.processingFee) {
                const payload = {
                    processingFee: {
                        mode: transformModeForBackend(values.processingFee.mode),
                        details: values.processingFee.details || {},
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

            if (values.emd?.mode) {
                payload.emd = {
                    mode: transformModeForBackend(values.emd.mode),
                    details: values.emd.details || {},
                };
            }

            if (values.tenderFee?.mode) {
                payload.tenderFee = {
                    mode: transformModeForBackend(values.tenderFee.mode),
                    details: values.tenderFee.details || {},
                };
            }

            if (values.processingFee?.mode) {
                payload.processingFee = {
                    mode: transformModeForBackend(values.processingFee.mode),
                    details: values.processingFee.details || {},
                };
            }

            if (!payload.emd && !payload.tenderFee && !payload.processingFee) {
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

    const allowedEmdModes = ['DD', 'FDR', 'CHEQUE', 'BG', 'BT', 'POP'];;
    const allowedTenderFeeModes = ['POP', 'BT', 'DD'];
    const allowedProcessingFeeModes = ['POP', 'BT', 'DD'];

    const hasEmd = true;
    const hasTenderFee = true;
    const hasProcessingFee = true;
    const type = 'OLD_EMD';

    const isPending = isEditMode ? updateRequest.isPending : createRequest.isPending;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl">
                    {isEditMode ? 'Edit Payment Request' : 'Create Payment Request'}
                </CardTitle>
                <CardDescription>
                    <p className="text-muted-foreground">You are filling this request for old EMD.</p>
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
                            (type === 'OLD_EMD') && (
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

                        {hasTenderFee && (
                            <TenderFeeSection
                                prefix="tenderFee"
                                title="Tender Fee"
                                allowedModes={allowedTenderFeeModes}
                                amount={0}
                                defaultPurpose="TENDER_FEES"
                                type={type}
                                courierAddress={''}
                            />
                        )}

                        {hasProcessingFee && (
                            <ProcessingFeeSection
                                amount={0}
                                allowedModes={allowedProcessingFeeModes}
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
