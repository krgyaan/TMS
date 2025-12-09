import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { type SubmitHandler, useForm, useFieldArray } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Plus, Trash2, Upload, AlertCircle } from 'lucide-react';
import { paths } from '@/app/routes/paths';
import { useEffect } from 'react';
import { useCreateTqReceived, useUpdateTqReceived, useTqItems } from '@/hooks/api/useTqManagement';
import { useTqTypes } from '@/hooks/api/useTqTypes';
import type { TenderQuery } from '@/types/api.types';
import { formatDateTime } from '@/hooks/useFormatedDate';
import SelectField from '@/components/form/SelectField';

const TqReceivedFormSchema = z.object({
    tenderId: z.number(),
    tqSubmissionDeadline: z.string().min(1, 'TQ submission deadline is required'),
    tqDocumentReceived: z.string().optional(),
    tqItems: z.array(z.object({
        tqTypeId: z.number().min(1, 'TQ type is required'),
        queryDescription: z.string().min(1, 'Query description is required'),
    })).min(1, 'At least one TQ item is required'),
});

type FormValues = z.infer<typeof TqReceivedFormSchema>;

interface TqReceivedFormProps {
    tenderId: number;
    tenderDetails: {
        tenderNo: string;
        tenderName: string;
        dueDate: Date | null;
        teamMemberName: string | null;
    };
    mode: 'create' | 'edit';
    existingData?: TenderQuery;
}

export default function TqReceivedForm({
    tenderId,
    tenderDetails,
    mode,
    existingData
}: TqReceivedFormProps) {
    const navigate = useNavigate();
    const createMutation = useCreateTqReceived();
    const updateMutation = useUpdateTqReceived();
    const { data: tqTypes } = useTqTypes();
    const { data: existingItems } = useTqItems(existingData?.id || 0);

    const tqTypeOptions = tqTypes?.map(t => ({
        value: t.id.toString(),
        label: t.name,
    })) || [];

    const form = useForm<FormValues>({
        resolver: zodResolver(TqReceivedFormSchema),
        defaultValues: {
            tenderId: tenderId,
            tqSubmissionDeadline: '',
            tqDocumentReceived: '',
            tqItems: [{ tqTypeId: 0, queryDescription: '' }],
        },
    });

    useEffect(() => {
        if (existingData && mode === 'edit' && existingItems) {
            form.reset({
                tenderId: tenderId,
                tqSubmissionDeadline: existingData.tqSubmissionDeadline
                    ? new Date(existingData.tqSubmissionDeadline).toISOString().slice(0, 16)
                    : '',
                tqDocumentReceived: existingData.tqDocumentReceived || '',
                tqItems: existingItems.map(item => ({
                    tqTypeId: item.tqTypeId,
                    queryDescription: item.queryDescription,
                })),
            });
        }
    }, [existingData, existingItems, form, tenderId, mode]);

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'tqItems',
    });

    const isSubmitting = form.formState.isSubmitting;

    const onSubmit: SubmitHandler<FormValues> = async (data) => {
        try {
            if (mode === 'create') {
                await createMutation.mutateAsync({
                    tenderId: data.tenderId,
                    tqSubmissionDeadline: data.tqSubmissionDeadline,
                    tqDocumentReceived: data.tqDocumentReceived || null,
                    tqItems: data.tqItems,
                });
            } else if (existingData?.id) {
                await updateMutation.mutateAsync({
                    id: existingData.id,
                    data: {
                        tenderId: data.tenderId,
                        tqSubmissionDeadline: data.tqSubmissionDeadline,
                        tqDocumentReceived: data.tqDocumentReceived || null,
                        tqItems: data.tqItems,
                    },
                });
            }
            navigate(paths.tendering.tqManagement);
        } catch (error) {
            console.error('Error submitting TQ received:', error);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>{mode === 'create' ? 'TQ Received' : 'Edit TQ Received'}</CardTitle>
                        <CardDescription className="mt-2">
                            {mode === 'create'
                                ? 'Record received technical query details'
                                : 'Update TQ received information'}
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
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        {/* Tender Information */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-base text-primary border-b pb-2">
                                Tender Information
                            </h4>
                            <div className="grid gap-4 md:grid-cols-2 bg-muted/30 p-4 rounded-lg">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Tender No</p>
                                    <p className="text-base font-semibold">{tenderDetails.tenderNo}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Team Member</p>
                                    <p className="text-base font-semibold">{tenderDetails.teamMemberName || '—'}</p>
                                </div>
                                <div className="md:col-span-2">
                                    <p className="text-sm font-medium text-muted-foreground">Tender Name</p>
                                    <p className="text-base font-semibold">{tenderDetails.tenderName}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Due Date</p>
                                    <p className="text-base font-semibold">
                                        {tenderDetails.dueDate ? formatDateTime(tenderDetails.dueDate) : '—'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* TQ Details */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-base text-primary border-b pb-2">
                                TQ Details
                            </h4>

                            <FieldWrapper
                                control={form.control}
                                name="tqSubmissionDeadline"
                                label="TQ Submission Deadline"
                                description="TODO: This will be added to employee calendar"
                            >
                                {(field) => (
                                    <Input
                                        {...field}
                                        type="datetime-local"
                                        placeholder="Select deadline"
                                    />
                                )}
                            </FieldWrapper>

                            <FieldWrapper
                                control={form.control}
                                name="tqDocumentReceived"
                                label="TQ Document (Optional)"
                                description="Upload functionality will be implemented later. Enter file path for now."
                            >
                                {(field) => (
                                    <div className="relative">
                                        <Upload className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            {...field}
                                            className="pl-10"
                                            placeholder="Enter file path or URL"
                                        />
                                    </div>
                                )}
                            </FieldWrapper>
                        </div>

                        {/* TQ Items Table */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h4 className="font-semibold text-base text-primary">
                                    Technical Queries
                                </h4>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => append({ tqTypeId: 0, queryDescription: '' })}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add TQ
                                </Button>
                            </div>

                            {fields.length === 0 && (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        Please add at least one technical query.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {fields.length > 0 && (
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-muted">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm font-semibold w-20">Sr. No.</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold">TQ Type</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold">Query Description</th>
                                                <th className="px-4 py-3 text-center text-sm font-semibold w-20">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {fields.map((field, index) => (
                                                <tr key={field.id} className="hover:bg-muted/30">
                                                    <td className="px-4 py-3 text-sm font-medium">
                                                        {index + 1}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <SelectField
                                                            control={form.control}
                                                            name={`tqItems.${index}.tqTypeId`}
                                                            label=""
                                                            options={tqTypeOptions}
                                                            placeholder="Select TQ type"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <FieldWrapper
                                                            control={form.control}
                                                            name={`tqItems.${index}.queryDescription`}
                                                            label=""
                                                        >
                                                            {(field) => (
                                                                <Textarea
                                                                    {...field}
                                                                    rows={2}
                                                                    placeholder="Enter query description"
                                                                />
                                                            )}
                                                        </FieldWrapper>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {fields.length > 1 && (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => remove(index)}
                                                                className="text-destructive hover:text-destructive"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
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
                                onClick={() => form.reset()}
                                disabled={isSubmitting}
                            >
                                Reset
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting || fields.length === 0}
                            >
                                {isSubmitting && <span className="animate-spin mr-2">⏳</span>}
                                <Save className="mr-2 h-4 w-4" />
                                {mode === 'create' ? 'Submit TQ Received' : 'Update TQ'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
