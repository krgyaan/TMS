import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Save, ArrowLeft, IndianRupee } from 'lucide-react';
import { useUploadRaResult } from '@/hooks/api/useReverseAuctions';
import { FileUploadField } from '@/components/form/FileUploadField';
import { useNavigate } from 'react-router-dom';

const UploadRaResultSchema = z.object({
    raResult: z.enum(['Won', 'Lost', 'H1 Elimination']),
    veL1AtStart: z.enum(['Yes', 'No']),
    raStartPrice: z.string().optional(),
    raClosePrice: z.string().optional(),
    raCloseTime: z.string().optional(),
    screenshotQualifiedParties: z.string().optional(),
    screenshotDecrements: z.string().optional(),
    finalResultScreenshot: z.string().optional(),
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
        resolver: zodResolver(UploadRaResultSchema),
        defaultValues: {
            raResult: 'Won',
            veL1AtStart: 'Yes',
            raStartPrice: '',
            raClosePrice: '',
            raCloseTime: '',
            screenshotQualifiedParties: '',
            screenshotDecrements: '',
            finalResultScreenshot: '',
        },
    });

    const isSubmitting = form.formState.isSubmitting;

    const onSubmit = async (data: FormValues) => {
        try {
            await uploadResultMutation.mutateAsync({
                id: raId,
                data: {
                    raResult: data.raResult,
                    veL1AtStart: data.veL1AtStart,
                    raStartPrice: data.raStartPrice,
                    raClosePrice: data.raClosePrice,
                    raCloseTime: data.raCloseTime,
                    screenshotQualifiedParties: data.screenshotQualifiedParties,
                    screenshotDecrements: data.screenshotDecrements,
                    finalResultScreenshot: data.finalResultScreenshot,
                },
            });
            if (onSuccess) {
                onSuccess();
            } else {
                navigate(`/tendering/ras/${raId}`);
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
                    <Button variant="outline" onClick={() => navigate(`/tendering/ras/${raId}`)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* RA Result */}
                        <div className="grid gap-4 md:grid-cols-2">
                            <FieldWrapper
                                control={form.control}
                                name="raResult"
                                label="RA Result"
                            >
                                {(field) => (
                                    <Select
                                        value={field.value}
                                        onValueChange={field.onChange}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select result" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Won">Won</SelectItem>
                                            <SelectItem value="Lost">Lost</SelectItem>
                                            <SelectItem value="H1 Elimination">H1 Elimination</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            </FieldWrapper>

                            <FieldWrapper
                                control={form.control}
                                name="veL1AtStart"
                                label="VE L1 at start of RA"
                            >
                                {(field) => (
                                    <Select
                                        value={field.value}
                                        onValueChange={field.onChange}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Yes">Yes</SelectItem>
                                            <SelectItem value="No">No</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            </FieldWrapper>
                        </div>

                        {/* Pricing */}
                        <div className="grid gap-4 md:grid-cols-2">
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
                        </div>

                        <FieldWrapper
                            control={form.control}
                            name="raCloseTime"
                            label="RA Close Time"
                        >
                            {(field) => (
                                <Input
                                    {...field}
                                    type="datetime-local"
                                />
                            )}
                        </FieldWrapper>

                        {/* Screenshots */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-sm text-primary border-b pb-2">
                                Upload Screenshots
                            </h4>
                            <div className="grid gap-4 md:grid-cols-2">
                                <FileUploadField
                                    control={form.control}
                                    name="screenshotQualifiedParties"
                                    label="Screenshot of Qualified Parties"
                                    acceptedFileTypes={['image/*', 'application/pdf']}
                                />
                                <FileUploadField
                                    control={form.control}
                                    name="screenshotDecrements"
                                    label="Screenshot of Decrements"
                                    acceptedFileTypes={['image/*', 'application/pdf']}
                                />
                                <FileUploadField
                                    control={form.control}
                                    name="finalResultScreenshot"
                                    label="Final Result Screenshot"
                                    acceptedFileTypes={['image/*', 'application/pdf']}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate(`/tendering/ras/${raId}`)}
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
