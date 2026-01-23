import { z } from 'zod';
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
import { DELIVERY_OPTIONS } from '../constants';

const DELIVERY_OPTION_VALUES = DELIVERY_OPTIONS.map(option => option.value) as ['TENDER_DUE', '24', '48', '72', '96', '120'];

const deliveryEnumField = () =>
    z.preprocess(
        (val) => {
            if (val === '' || val === null || val === undefined) {
                return undefined;
            }
            if (typeof val === 'number') {
                return String(val);
            }
            return val;
        },
        z.enum(DELIVERY_OPTION_VALUES).optional()
    );

const PaymentDetailsSchema = z.object({
    ddFavouring: z.string().optional(),
    ddPayableAt: z.string().optional(),
    ddDeliverBy: deliveryEnumField(),
    ddPurpose: z.string().optional(),
    ddCourierAddress: z.string().optional(),
    ddCourierHours: z.coerce.number().optional(),
    ddDate: z.string().optional(),
    ddRemarks: z.string().optional(),

    fdrFavouring: z.string().optional(),
    fdrExpiryDate: z.string().optional(),
    fdrDeliverBy: deliveryEnumField(),
    fdrPurpose: z.string().optional(),
    fdrCourierAddress: z.string().optional(),
    fdrCourierHours: z.coerce.number().optional(),
    fdrDate: z.string().optional(),

    bgNeededIn: z.string().optional(),
    bgPurpose: z.string().optional(),
    bgFavouring: z.string().optional(),
    bgAddress: z.string().optional(),
    bgExpiryDate: z.string().optional(),
    bgClaimPeriod: z.string().optional(),
    bgStampValue: z.coerce.number().optional(),
    bgFormatFiles: z.array(z.string()).optional(),
    bgPoFiles: z.array(z.string()).optional(),
    bgClientUserEmail: z.string().email().optional().or(z.literal('')),
    bgClientCpEmail: z.string().email().optional().or(z.literal('')),
    bgClientFinanceEmail: z.string().email().optional().or(z.literal('')),
    bgCourierAddress: z.string().optional(),
    bgCourierDays: z.coerce.number().min(1).max(10).optional(),
    bgBank: z.string().optional(),

    chequeFavouring: z.string().optional(),
    chequeDate: z.string().optional(),
    chequeNeededIn: deliveryEnumField(),
    chequePurpose: z.string().optional(),
    chequeAccount: z.string().optional(),
});

const BiOtherThanEmdRequestSchema = z.object({
    // EMD
    emd: z.object({
        mode: z.enum(['DD', 'FDR', 'BG', 'CHEQUE']).optional(),
        details: PaymentDetailsSchema.optional(),
    }).optional(),
});

type FormValues = z.infer<typeof BiOtherThanEmdRequestSchema>;

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
        resolver: zodResolver(BiOtherThanEmdRequestSchema) as any,
        defaultValues: initialData || { emd: { mode: undefined, details: {} } },
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
                            <span className="text-muted-foreground">You are filling this request for BI other than EMD.</span>
                        </p>
                        <p>
                            <span className="text-muted-foreground">Please fill the details below.</span>
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
                                amount={0}
                                defaultPurpose="EMD"
                                type="BI_OTHER_THAN_EMD"
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
