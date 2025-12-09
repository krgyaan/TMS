import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Save, Plus, X, ArrowLeft, IndianRupee } from 'lucide-react';
import { useUploadResult } from '@/hooks/api/useTenderResults';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { FileUploadField } from '@/components/form/FileUploadField';
import { useNavigate } from 'react-router-dom';

const UploadResultSchema = z.object({
    technicallyQualified: z.enum(['Yes', 'No']),
    disqualificationReason: z.string().optional(),
    qualifiedPartiesCount: z.string().optional(),
    qualifiedPartiesNames: z.array(z.string()).optional(),
    result: z.enum(['Won', 'Lost']).optional(),
    l1Price: z.string().optional(),
    l2Price: z.string().optional(),
    ourPrice: z.string().optional(),
    qualifiedPartiesScreenshot: z.string().optional(),
    finalResultScreenshot: z.string().optional(),
}).refine((data) => {
    if (data.technicallyQualified === 'No' && !data.disqualificationReason) {
        return false;
    }
    return true;
}, {
    message: 'Disqualification reason is required when not qualified',
    path: ['disqualificationReason'],
});

type FormValues = z.infer<typeof UploadResultSchema>;

interface UploadResultFormPageProps {
    resultId: number;
    tenderDetails: {
        tenderNo: string;
        tenderName: string;
    };
    onSuccess?: () => void;
}

export default function UploadResultFormPage({
    resultId,
    tenderDetails,
    onSuccess,
}: UploadResultFormPageProps) {
    const navigate = useNavigate();
    const uploadResultMutation = useUploadResult();
    const [newPartyName, setNewPartyName] = useState('');

    const form = useForm<FormValues>({
        resolver: zodResolver(UploadResultSchema),
        defaultValues: {
            technicallyQualified: 'Yes',
            disqualificationReason: '',
            qualifiedPartiesCount: '',
            qualifiedPartiesNames: [],
            result: 'Won',
            l1Price: '',
            l2Price: '',
            ourPrice: '',
            qualifiedPartiesScreenshot: '',
            finalResultScreenshot: '',
        },
    });

    const technicallyQualified = useWatch({
        control: form.control,
        name: 'technicallyQualified',
    });

    const qualifiedPartiesNames = useWatch({
        control: form.control,
        name: 'qualifiedPartiesNames',
    }) || [];

    const isSubmitting = form.formState.isSubmitting;

    const addPartyName = () => {
        if (newPartyName.trim()) {
            const current = form.getValues('qualifiedPartiesNames') || [];
            form.setValue('qualifiedPartiesNames', [...current, newPartyName.trim()]);
            setNewPartyName('');
        }
    };

    const removePartyName = (index: number) => {
        const current = form.getValues('qualifiedPartiesNames') || [];
        form.setValue('qualifiedPartiesNames', current.filter((_, i) => i !== index));
    };

    const onSubmit = async (data: FormValues) => {
        try {
            await uploadResultMutation.mutateAsync({
                id: resultId,
                data: {
                    technicallyQualified: data.technicallyQualified,
                    disqualificationReason: data.disqualificationReason,
                    qualifiedPartiesCount: data.qualifiedPartiesCount,
                    qualifiedPartiesNames: data.qualifiedPartiesNames,
                    result: data.result,
                    l1Price: data.l1Price,
                    l2Price: data.l2Price,
                    ourPrice: data.ourPrice,
                    qualifiedPartiesScreenshot: data.qualifiedPartiesScreenshot,
                    finalResultScreenshot: data.finalResultScreenshot,
                },
            });
            if (onSuccess) {
                onSuccess();
            } else {
                navigate(`/tendering/results/${resultId}`);
            }
        } catch (error) {
            console.error('Error uploading result:', error);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Upload Tender Result</CardTitle>
                <CardDescription>
                    {tenderDetails.tenderNo} - {tenderDetails.tenderName}
                </CardDescription>
                <CardAction>
                    <Button variant="outline" onClick={() => navigate(`/tendering/results/${resultId}`)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Technical Qualification */}
                        <FieldWrapper
                            control={form.control}
                            name="technicallyQualified"
                            label="Technically Qualified"
                        >
                            {(field) => (
                                <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select qualification status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Yes">Yes</SelectItem>
                                        <SelectItem value="No">No</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        </FieldWrapper>

                        {/* Disqualification Reason (if No) */}
                        {technicallyQualified === 'No' && (
                            <FieldWrapper
                                control={form.control}
                                name="disqualificationReason"
                                label="Reason for Disqualification"
                            >
                                {(field) => (
                                    <Textarea
                                        {...field}
                                        placeholder="Enter reason for disqualification"
                                        rows={3}
                                    />
                                )}
                            </FieldWrapper>
                        )}

                        {/* Qualified Details (if Yes) */}
                        {technicallyQualified === 'Yes' && (
                            <>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <FieldWrapper
                                        control={form.control}
                                        name="qualifiedPartiesCount"
                                        label="No. of Qualified Parties"
                                        description="Enter number or 'not known'"
                                    >
                                        {(field) => (
                                            <Input
                                                {...field}
                                                placeholder="e.g., 5 or 'not known'"
                                            />
                                        )}
                                    </FieldWrapper>
                                </div>

                                {/* Qualified Parties Names */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        Name of Qualified Parties
                                    </label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={newPartyName}
                                            onChange={(e) => setNewPartyName(e.target.value)}
                                            placeholder="Enter party name"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    addPartyName();
                                                }
                                            }}
                                        />
                                        <Button type="button" onClick={addPartyName} size="icon">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    {qualifiedPartiesNames.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {qualifiedPartiesNames.map((name, index) => (
                                                <Badge key={index} variant="secondary" className="gap-1">
                                                    {name}
                                                    <X
                                                        className="h-3 w-3 cursor-pointer"
                                                        onClick={() => removePartyName(index)}
                                                    />
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                        Add party names or enter "not known" if unknown
                                    </p>
                                </div>

                                {/* Result */}
                                <FieldWrapper
                                    control={form.control}
                                    name="result"
                                    label="Result"
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
                                            </SelectContent>
                                        </Select>
                                    )}
                                </FieldWrapper>

                                {/* Pricing */}
                                <div className="grid gap-4 md:grid-cols-2">
                                    <FieldWrapper
                                        control={form.control}
                                        name="l1Price"
                                        label="L1 Price"
                                    >
                                        {(field) => (
                                            <div className="relative">
                                                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    {...field}
                                                    type="number"
                                                    step="0.01"
                                                    className="pl-10"
                                                    placeholder="Enter L1 price"
                                                />
                                            </div>
                                        )}
                                    </FieldWrapper>
                                    <FieldWrapper
                                        control={form.control}
                                        name="l2Price"
                                        label="L2 Price"
                                    >
                                        {(field) => (
                                            <div className="relative">
                                                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    {...field}
                                                    type="number"
                                                    step="0.01"
                                                    className="pl-10"
                                                    placeholder="Enter L2 price"
                                                />
                                            </div>
                                        )}
                                    </FieldWrapper>
                                </div>
                                <FieldWrapper
                                    control={form.control}
                                    name="ourPrice"
                                    label="Our Price"
                                >
                                    {(field) => (
                                        <div className="relative">
                                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                {...field}
                                                type="number"
                                                step="0.01"
                                                className="pl-10"
                                                placeholder="Enter our price"
                                            />
                                        </div>
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
                                            name="qualifiedPartiesScreenshot"
                                            label="Screenshot of Qualified Parties"
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
                            </>
                        )}

                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate(`/tendering/results/${resultId}`)}
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
