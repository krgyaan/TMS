import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider, type Resolver } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTender } from '@/hooks/api/useTenders';
import { useCreatePaymentRequest, useUpdatePaymentRequest } from '@/hooks/api/useEmds';
import { EmdSection } from './EmdSection';
import { TenderFeeSection } from './TenderFeeSection';
import { ProcessingFeeSection } from './ProcessingFeeSection';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { Button } from '@/components/ui/button';
import { useInfoSheet } from '@/hooks/api/useInfoSheets';
import { toast } from 'sonner';
import { formatINR } from '@/hooks/useINRFormatter';
import { parseAllowedModes } from '../constants';
import { Skeleton } from '@/components/ui/skeleton';
import { EmdRequestSchema, type EmdRequestFormValues } from '../helpers/emdTenderFee.schema';

type FormValues = EmdRequestFormValues;

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
    const { data: tender, isLoading: isTenderLoading } = useTender(tenderId ? Number(tenderId) : null);
    const { data: infoSheet, isLoading: isInfoSheetLoading } = useInfoSheet(tenderId ? Number(tenderId) : null);
    const createRequest = useCreatePaymentRequest();
    const updateRequest = useUpdatePaymentRequest();
    const isEditMode = mode === 'edit';

    const form = useForm<FormValues>({
        resolver: zodResolver(EmdRequestSchema) as Resolver<FormValues>,
        defaultValues: initialData || {
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

    if (isTenderLoading || isInfoSheetLoading) {
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

    if (!tender) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Tender not found</AlertDescription>
            </Alert>
        );
    }

    const emdAmount = Number(tender.emd) || 0;
    const tenderFeeAmount = Number(tender.tenderFees) || 0;
    const processingFeeAmount = Number(infoSheet?.processingFeeAmount) || 0;

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

    const allowedEmdModes = parseAllowedModes(tender.emdMode);
    const allowedTenderFeeModes = parseAllowedModes(tender.tenderFeeMode);
    const allowedProcessingFeeModes = parseAllowedModes(infoSheet?.processingFeeMode);

    const isPending = isEditMode ? updateRequest.isPending : createRequest.isPending;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl">
                    {isEditMode ? 'Edit Payment Request' : 'Create Payment Request'}
                </CardTitle>
                <CardDescription>
                    <div className="space-y-1">
                        <p>
                            <span className="text-muted-foreground">Tender:</span>{' '}
                            <strong>{tender.tenderNo}</strong> - {tender.tenderName}
                        </p>
                        <p>
                            <span className="text-muted-foreground">Assigned to:</span>{' '}
                            <strong>{tender.teamMemberName || 'Unassigned'}</strong>
                            {tender.dueDate && (
                                <>
                                    {' | '}
                                    <span className="text-muted-foreground">Due:</span>{' '}
                                    <strong>{formatDateTime(tender.dueDate)}</strong>
                                </>
                            )}
                        </p>
                        <p className="text-sm">
                            {hasEmd && <span className="mr-4">EMD: <strong>{formatINR(emdAmount)}</strong></span>}
                            {hasTenderFee && <span className="mr-4">Tender Fee: <strong>{formatINR(tenderFeeAmount)}</strong></span>}
                            {hasProcessingFee && <span>Processing Fee: <strong>{formatINR(processingFeeAmount)}</strong></span>}
                        </p>
                    </div>
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

                        {hasEmd && (
                            <EmdSection
                                allowedModes={allowedEmdModes}
                                amount={emdAmount}
                                defaultPurpose="EMD"
                                courierAddress={infoSheet?.courierAddress || undefined}
                            />
                        )}

                        {hasTenderFee && (
                            <TenderFeeSection
                                prefix="tenderFee"
                                title="Tender Fee"
                                allowedModes={allowedTenderFeeModes}
                                amount={tenderFeeAmount}
                                defaultPurpose="TENDER_FEES"
                                courierAddress={infoSheet?.courierAddress || undefined}
                            />
                        )}

                        {hasProcessingFee && (
                            <ProcessingFeeSection
                                amount={processingFeeAmount}
                                allowedModes={allowedProcessingFeeModes}
                                courierAddress={infoSheet?.courierAddress || undefined}
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
