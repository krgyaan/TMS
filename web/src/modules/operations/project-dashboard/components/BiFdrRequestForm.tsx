import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider, type Resolver } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save } from 'lucide-react';
import { useCreatePaymentRequest } from '@/hooks/api/usePaymentRequests';
import { useProjectOverview } from '@/hooks/api/useProjectDashboard';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import FieldWrapper from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { FdrForm } from '@/modules/tendering/emds-tenderfees/components/FdrForm';
import { PROJECT_FDR_PURPOSE_OPTIONS } from '@/modules/tendering/emds-tenderfees/constants';
import {
    ProjectFdrRequestSchema,
    type ProjectFdrRequestFormValues,
} from '@/modules/tendering/emds-tenderfees/helpers/payment-request.schema';

type FormValues = ProjectFdrRequestFormValues;

const FDR_PREFIX = 'EMD.details';

interface BiFdrRequestFormProps {
    projectId: number;
}

export function BiFdrRequestForm({ projectId }: BiFdrRequestFormProps) {
    const navigate = useNavigate();
    const createRequest = useCreatePaymentRequest();
    const { data: overview } = useProjectOverview(projectId);

    const projectName = overview?.project?.projectName ?? '';
    const poNo = overview?.project?.poNo ?? '';

    const form = useForm<FormValues>({
        resolver: zodResolver(ProjectFdrRequestSchema) as Resolver<FormValues>,
        defaultValues: {
            tenderName: '',
            tenderNo: '',
            EMD: { mode: 'FDR', details: {} },
        },
    });

    // Prefill project name + work no. once, when the overview loads.
    const prefilledRef = useRef(false);
    useEffect(() => {
        if (prefilledRef.current) return;
        if (!projectName && !poNo) return;
        prefilledRef.current = true;
        form.setValue('tenderName', projectName);
        form.setValue('tenderNo', poNo);
    }, [projectName, poNo, form]);

    const handleSubmit = async (values: FormValues) => {
        const payload: any = {
            type: 'Other Than Tender',
            tenderNo: poNo || values.tenderNo || '',
            tenderName: projectName || values.tenderName || '',
            dueDate: values.tenderDueDate || '',
            projectId,
            EMD: {
                mode: 'FDR',
                details: values.EMD?.details || {},
            },
        };

        try {
            await createRequest.mutateAsync({
                tenderId: 0,
                data: payload,
            });
            toast.success('FDR request created successfully');
            navigate(-1);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl">Request Fixed Deposit Receipt (FDR)</CardTitle>
                <CardDescription>
                    <p className="text-muted-foreground">
                        Raise an FDR request for this project. It follows the same approval flow as an EMD FDR.
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
                <FormProvider {...form}>
                    <form
                        onSubmit={form.handleSubmit(handleSubmit, (errors) => {
                            console.error('Form validation errors:', errors);
                            toast.error('Please fix the errors in the form before submitting');
                        })}
                        className="space-y-8"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start mb-4">
                            <FieldWrapper control={form.control} name="tenderName" label="Project Name">
                                {(field) => <Input {...field} disabled className="bg-muted text-muted-foreground disabled:opacity-100 disabled:cursor-not-allowed" />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="tenderNo" label="Work No.">
                                {(field) => <Input {...field} disabled className="bg-muted text-muted-foreground disabled:opacity-100 disabled:cursor-not-allowed" />}
                            </FieldWrapper>
                        </div>

                        <div className="border rounded-lg p-6 bg-muted/20">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">FDR Details</h3>
                            </div>

                            <FdrForm
                                prefix={FDR_PREFIX}
                                purposeOptions={PROJECT_FDR_PURPOSE_OPTIONS}
                            />
                        </div>

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
