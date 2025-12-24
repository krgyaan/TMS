import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { type Resolver, useForm, useWatch } from 'react-hook-form';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import { Save, IndianRupee } from 'lucide-react';
import { useUploadRaResult } from '@/hooks/api/useReverseAuctions';
import { TenderFileUploader } from '@/components/tender-file-upload';

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

interface RAResultFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    raId: number;
    tenderDetails: {
        tenderNo: string;
        tenderName: string;
    };
}

export default function RAResultForm({
    open,
    onOpenChange,
    raId,
    tenderDetails,
}: RAResultFormProps) {
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

    // Watch file values for display
    const screenshotQualifiedParties = useWatch({ control: form.control, name: 'screenshotQualifiedParties' });
    const screenshotDecrements = useWatch({ control: form.control, name: 'screenshotDecrements' });
    const finalResultScreenshot = useWatch({ control: form.control, name: 'finalResultScreenshot' });

    const isSubmitting = form.formState.isSubmitting;

    const onSubmit = async (data: FormValues) => {
        try {
            const screenshotQualifiedPartiesPath = data.screenshotQualifiedParties.length > 0 ? data.screenshotQualifiedParties[0] : null;
            const screenshotDecrementsPath = data.screenshotDecrements.length > 0 ? data.screenshotDecrements[0] : null;
            const finalResultScreenshotPath = data.finalResultScreenshot.length > 0 ? data.finalResultScreenshot[0] : null;

            await uploadResultMutation.mutateAsync({
                id: raId,
                data: {
                    raResult: data.raResult,
                    veL1AtStart: data.veL1AtStart,
                    raStartPrice: data.raStartPrice,
                    raClosePrice: data.raClosePrice,
                    raCloseTime: data.raCloseTime,
                    screenshotQualifiedParties: screenshotQualifiedPartiesPath,
                    screenshotDecrements: screenshotDecrementsPath,
                    finalResultScreenshot: finalResultScreenshotPath,
                },
            });
            onOpenChange(false);
            form.reset();
        } catch (error) {
            console.error('Error uploading RA result:', error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Upload RA Result</DialogTitle>
                    <DialogDescription>
                        {tenderDetails.tenderNo} - {tenderDetails.tenderName}
                    </DialogDescription>
                </DialogHeader>

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
                                <TenderFileUploader
                                    context="ra-screenshots"
                                    value={screenshotQualifiedParties}
                                    onChange={(paths) => form.setValue('screenshotQualifiedParties', paths)}
                                    label="Screenshot of Qualified Parties"
                                    disabled={isSubmitting}
                                />
                                <TenderFileUploader
                                    context="ra-screenshots"
                                    value={screenshotDecrements}
                                    onChange={(paths) => form.setValue('screenshotDecrements', paths)}
                                    label="Screenshot of Decrements"
                                    disabled={isSubmitting}
                                />
                                <TenderFileUploader
                                    context="ra-screenshots"
                                    value={finalResultScreenshot}
                                    onChange={(paths) => form.setValue('finalResultScreenshot', paths)}
                                    label="Final Result Screenshot"
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <span className="animate-spin mr-2">⏳</span>}
                                <Save className="mr-2 h-4 w-4" />
                                Upload Result
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
