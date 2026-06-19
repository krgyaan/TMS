import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, XCircle, FileText } from 'lucide-react';
import { paths } from '@/app/routes/paths';
import { useEffect } from 'react';
import { useUpdateTqMissed, useTqItems } from '@/hooks/api/useTqManagement';
import { useTqTypes } from '@/hooks/api/useTqTypes';
import { Badge } from '@/components/ui/badge';
import type { TenderQuery } from '../helpers/tqManagement.types';

const TqMissedFormSchema = z.object({
    missedReason: z.string().min(10, 'Reason must be at least 10 characters'),
    preventionMeasures: z.string().min(10, 'Prevention measures must be at least 10 characters'),
    tmsImprovements: z.string().min(10, 'TMS improvements must be at least 10 characters'),
});

type FormValues = z.infer<typeof TqMissedFormSchema>;

interface TqMissedFormProps {
    tqData: TenderQuery;
    mode: 'missed' | 'edit';
}

export default function TqMissedForm({ tqData, mode }: TqMissedFormProps) {
    const navigate = useNavigate();
    const updateMutation = useUpdateTqMissed();
    const { data: tqItems } = useTqItems(tqData.id);
    const { data: tqTypes } = useTqTypes();

    const getTqTypeName = (tqTypeId: number) => {
        return tqTypes?.find((t: any) => t.id === tqTypeId)?.name || 'Unknown';
    };

    const form = useForm<FormValues>({
        resolver: zodResolver(TqMissedFormSchema),
        defaultValues: {
            missedReason: '',
            preventionMeasures: '',
            tmsImprovements: '',
        },
    });

    useEffect(() => {
        if (mode === 'edit' && tqData) {
            form.reset({
                missedReason: tqData.missedReason || '',
                preventionMeasures: tqData.preventionMeasures || '',
                tmsImprovements: tqData.tmsImprovements || '',
            });
        }
    }, [tqData, form, mode]);

    const isSubmitting = form.formState.isSubmitting;

    const onSubmit: SubmitHandler<FormValues> = async (data) => {
        try {
            await updateMutation.mutateAsync({
                id: tqData.id,
                data: {
                    missedReason: data.missedReason,
                    preventionMeasures: data.preventionMeasures,
                    tmsImprovements: data.tmsImprovements,
                },
            });
            navigate(paths.tendering.tqManagement);
        } catch (error) {
            console.error('Error marking TQ as missed:', error);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-destructive">
                            {mode === 'missed' ? 'Mark TQ as Missed' : 'Edit TQ Missed Details'}
                        </CardTitle>
                        <CardDescription className="mt-2">
                            {mode === 'missed'
                                ? 'Provide details about why this TQ was missed'
                                : 'Update TQ missed information'}
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
                        {/* TQ Items Context */}
                        {tqItems && tqItems.length > 0 && (
                            <div className="space-y-4">
                                <h4 className="font-semibold text-base text-primary border-b pb-2 flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    TQ Items ({tqItems.length})
                                </h4>
                                <div className="border rounded-lg overflow-hidden bg-muted/30">
                                    <table className="w-full">
                                        <thead className="bg-muted">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-semibold w-16">Sr.</th>
                                                <th className="px-4 py-2 text-left text-xs font-semibold">Type</th>
                                                <th className="px-4 py-2 text-left text-xs font-semibold">Query Description</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {tqItems.map((item) => (
                                                <tr key={item.id} className="hover:bg-muted/50">
                                                    <td className="px-4 py-2 text-xs font-medium">{item.srNo}</td>
                                                    <td className="px-4 py-2 text-xs">
                                                        <Badge variant="outline" className="text-[10px]">
                                                            {getTqTypeName(item.tqTypeId)}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-2 text-xs whitespace-pre-wrap break-words">
                                                        {item.queryDescription}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Missed TQ Analysis */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-base text-destructive border-b pb-2">
                                Missed TQ Analysis
                            </h4>

                            <FieldWrapper
                                control={form.control}
                                name="missedReason"
                                label="Reason for Missing the TQ"
                            >
                                {(field) => (
                                    <Textarea
                                        {...field}
                                        rows={4}
                                        placeholder="Explain in detail why this TQ was missed..."
                                        className="border-destructive/50 focus:ring-destructive/50"
                                    />
                                )}
                            </FieldWrapper>

                            <FieldWrapper
                                control={form.control}
                                name="preventionMeasures"
                                label="What Would You Do to Ensure This is Not Repeated?"
                            >
                                {(field) => (
                                    <Textarea
                                        {...field}
                                        rows={4}
                                        placeholder="Describe the steps you will take to prevent this from happening again..."
                                        className="border-destructive/50 focus:ring-destructive/50"
                                    />
                                )}
                            </FieldWrapper>

                            <FieldWrapper
                                control={form.control}
                                name="tmsImprovements"
                                label="Any Improvements Needed in the TMS System?"
                            >
                                {(field) => (
                                    <Textarea
                                        {...field}
                                        rows={4}
                                        placeholder="Suggest improvements to the TMS system to help avoid repeating this mistake..."
                                        className="border-destructive/50 focus:ring-destructive/50"
                                    />
                                )}
                            </FieldWrapper>
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
                                disabled={isSubmitting}
                                variant="destructive"
                            >
                                {isSubmitting && <span className="animate-spin mr-2">⏳</span>}
                                <XCircle className="mr-2 h-4 w-4" />
                                {mode === 'missed' ? 'Mark as Missed' : 'Update'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
