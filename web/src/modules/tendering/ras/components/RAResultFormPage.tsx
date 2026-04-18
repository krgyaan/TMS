import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { Save, ArrowLeft, IndianRupee } from 'lucide-react';
import { useUploadRaResult } from '@/hooks/api/useReverseAuctions';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';
import { SelectField } from '@/components/form/SelectField';
import { TenderFileUploader } from '@/components/tender-file-upload';
import DateTimeInput from '@/components/form/DateTimeInput';

const UploadRaResultSchema = z.object({
    raResult: z.enum(['Won', 'Lost', 'H1 Elimination']),
    veL1AtStart: z.enum(['Yes', 'No']),
    raStartPrice: z.string().optional(),
    raClosePrice: z.string().optional(),
    raCloseTime: z.string().optional(),
    screenshotQualifiedParties: z.array(z.string()).default([]),
    screenshotDecrements: z.array(z.string()).default([]),
    finalResultScreenshot: z.array(z.string()).default([]),
});

type FormValues = z.infer<typeof UploadRaResultSchema>;

interface RAResultFormPageProps {
    raId: number;
    tenderDetails: {
        tenderNo: string;
        tenderName: string;
    };
    onSuccess?: () => void;
}

export default function RAResultFormPage({
    raId,
    tenderDetails,
    onSuccess,
}: RAResultFormPageProps) {
    const navigate = useNavigate();
    const uploadResultMutation = useUploadRaResult();
    const form = useForm<FormValues>({
        resolver: zodResolver(UploadRaResultSchema) as Resolver<FormValues>,
        defaultValues: {
            raResult: 'Won',
            veL1AtStart: 'Yes',
            raStartPrice: '',
            raClosePrice: '',
            raCloseTime: '',
            screenshotQualifiedParties: [],
            screenshotDecrements: [],
            finalResultScreenshot: [],
        },
    });

    const screenshotQualifiedParties = useWatch({ control: form.control, name: 'screenshotQualifiedParties' });
    const screenshotDecrements = useWatch({ control: form.control, name: 'screenshotDecrements' });
    const finalResultScreenshot = useWatch({ control: form.control, name: 'finalResultScreenshot' });
    const isSubmitting = form.formState.isSubmitting;

    // Helper function to normalize empty strings to undefined for optional fields
    const normalizeOptionalString = (value: string | undefined): string | undefined => {
        return value && value.trim() ? value.trim() : undefined;
    };

    const onSubmit = async (data: FormValues) => {
        try {
            await uploadResultMutation.mutateAsync({
                raId: raId,
                data: {
                    raResult: data.raResult,
                    veL1AtStart: data.veL1AtStart,
                    raStartPrice: normalizeOptionalString(data.raStartPrice),
                    raClosePrice: normalizeOptionalString(data.raClosePrice),
                    raCloseTime: normalizeOptionalString(data.raCloseTime),
                    screenshotQualifiedParties: data.screenshotQualifiedParties[0] || undefined,
                    screenshotDecrements: data.screenshotDecrements[0] || undefined,
                    finalResultScreenshot: data.finalResultScreenshot[0] || undefined,
                },
            });
            if (onSuccess) {
                onSuccess();
            } else {
                navigate(paths.tendering.ras);
            }
        } catch (error) {
            console.error('Error uploading RA result:', error);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Upload RA Result</CardTitle>
                <CardDescription>
                    {tenderDetails.tenderNo} - {tenderDetails.tenderName}
                </CardDescription>
                <CardAction>
                    <Button variant="outline" onClick={() => navigate(paths.tendering.ras)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* RA Result */}
                        <div className="grid gap-4 md:grid-cols-3">
                            <SelectField
                                control={form.control}
                                name="raResult"
                                label="RA Result"
                                options={[
                                    { value: 'Won', label: 'Won' },
                                    { value: 'Lost', label: 'Lost' },
                                    { value: 'H1 Elimination', label: 'H1 Elimination' },
                                ]}
                                placeholder="Select result"
                            />

                            <SelectField
                                control={form.control}
                                name="veL1AtStart"
                                label="VE L1 at start of RA"
                                options={[
                                    { value: 'Yes', label: 'Yes' },
                                    { value: 'No', label: 'No' },
                                ]}
                                placeholder="Select"
                            />
                        </div>

                        {/* Pricing */}
                        <div className="grid gap-4 md:grid-cols-3">
                            <FieldWrapper
                                control={form.control}
                                name="raStartPrice"
                                label="RA Start Price"
                            >
                                {(field) => (
                                    <div className="relative">
                                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            {...field}
                                            type="number"
                                            step="0.01"
                                            className="pl-10"
                                            placeholder="Enter start price"
                                        />
                                    </div>
                                )}
                            </FieldWrapper>
                            <FieldWrapper
                                control={form.control}
                                name="raClosePrice"
                                label="RA Close Price"
                            >
                                {(field) => (
                                    <div className="relative">
                                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            {...field}
                                            type="number"
                                            step="0.01"
                                            className="pl-10"
                                            placeholder="Enter close price"
                                        />
                                    </div>
                                )}
                            </FieldWrapper>
                            <FieldWrapper
                                control={form.control}
                                name="raCloseTime"
                                label="RA Close Time"
                            >
                                {(field) => (
                                    <DateTimeInput {...field} placeholder="Select close time" />
                                )}
                            </FieldWrapper>
                        </div>


                        {/* Screenshots */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-sm text-primary border-b pb-2">
                                Upload Screenshots
                            </h4>
                            <div className="grid gap-4 md:grid-cols-3">
                                <TenderFileUploader
                                    context="screenshot_qualified_parties"
                                    value={screenshotQualifiedParties}
                                    onChange={(paths) => form.setValue('screenshotQualifiedParties', paths)}
                                    label="Screenshot of Qualified Parties"
                                    disabled={isSubmitting}
                                />
                                <TenderFileUploader
                                    context="screenshot_decrements"
                                    value={screenshotDecrements}
                                    onChange={(paths) => form.setValue('screenshotDecrements', paths)}
                                    label="Screenshot of Decrements"
                                    disabled={isSubmitting}
                                />
                                <TenderFileUploader
                                    context="final_result_screenshot"
                                    value={finalResultScreenshot}
                                    onChange={(paths) => form.setValue('finalResultScreenshot', paths)}
                                    label="Final Result Screenshot"
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate(paths.tendering.ras)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <span className="animate-spin mr-2">⏳</span>}
                                <Save className="mr-2 h-4 w-4" />
                                Upload Result
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
