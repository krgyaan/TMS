import { useEffect, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { type Resolver, type SubmitHandler, useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { paths } from "@/app/routes/paths";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { TenderFileUploader } from "@/components/tender-file-upload";
import { useUploadResult, useTenderResultByTenderId } from "@/hooks/api/useTenderResults";
import { ArrowLeft, IndianRupee, Plus, X, Save } from "lucide-react";

const UploadResultSchema = z.object({
    technicallyQualified: z.enum(['Yes', 'No']),
    disqualificationReason: z.string().optional(),
    qualifiedPartiesCount: z.string().optional(),
    qualifiedPartiesNames: z.array(z.string()).optional(),
    result: z.enum(['Won', 'Lost']).optional(),
    l1Price: z.string().optional(),
    l2Price: z.string().optional(),
    ourPrice: z.string().optional(),
    qualifiedPartiesScreenshot: z.array(z.string()).default([]),
    finalResultScreenshot: z.array(z.string()).default([]),
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
    tenderId: number;
    tenderDetails: {
        tenderNo: string;
        tenderName: string;
        partiesCount: string;
        partiesNames: string[];
    };
    isEditMode?: boolean;
    onSuccess?: () => void;
}

const yesNoOptions = [
    { label: "No", value: "No" },
    { label: "Yes", value: "Yes" },
];

const resultOptions = [
    { label: "Won", value: "Won" },
    { label: "Lost", value: "Lost" },
];

export default function UploadResultFormPage({
    tenderId,
    tenderDetails,
    isEditMode = false,
    onSuccess,
}: UploadResultFormPageProps) {
    const navigate = useNavigate();
    const uploadResultMutation = useUploadResult();
    const { data: existingResult } = useTenderResultByTenderId(tenderId);
    const [newPartyName, setNewPartyName] = useState('');
    const [showResultDetails, setShowResultDetails] = useState(isEditMode);

    const form = useForm<FormValues>({
        resolver: zodResolver(UploadResultSchema) as Resolver<FormValues>,
        defaultValues: {
            technicallyQualified: 'Yes',
            disqualificationReason: '',
            qualifiedPartiesCount: tenderDetails.partiesCount || '',
            qualifiedPartiesNames: tenderDetails.partiesNames || [],
            result: 'Won',
            l1Price: '',
            l2Price: '',
            ourPrice: '',
            qualifiedPartiesScreenshot: [],
            finalResultScreenshot: [],
        },
    });

    // Watch file values for display
    const qualifiedPartiesScreenshot = useWatch({ control: form.control, name: 'qualifiedPartiesScreenshot' });
    const finalResultScreenshot = useWatch({ control: form.control, name: 'finalResultScreenshot' });

    // Pre-populate form in edit mode when data loads
    useEffect(() => {
        if (isEditMode && existingResult) {
            const result = existingResult;
            // Ensure technicallyQualified is 'Yes' or 'No', defaulting to 'Yes' if null
            const technicallyQualifiedValue = (result.technicallyQualified === 'Yes' || result.technicallyQualified === 'No')
                ? result.technicallyQualified
                : 'Yes';

            form.reset({
                technicallyQualified: technicallyQualifiedValue,
                disqualificationReason: result.disqualificationReason ?? '',
                qualifiedPartiesCount: result.qualifiedPartiesCount ?? '',
                qualifiedPartiesNames: result.qualifiedPartiesNames ?? [],
                result: (result.result === 'Won' || result.result === 'Lost') ? result.result : undefined,
                l1Price: result.l1Price ?? '',
                l2Price: result.l2Price ?? '',
                ourPrice: result.ourPrice ?? '',
                qualifiedPartiesScreenshot: result.qualifiedPartiesScreenshot ? [result.qualifiedPartiesScreenshot] : [],
                finalResultScreenshot: result.finalResultScreenshot ? [result.finalResultScreenshot] : [],
            });

            // If result fields exist, show Form 2
            if (result.result || result.l1Price || result.l2Price || result.ourPrice) {
                setShowResultDetails(true);
            }
        }
    }, [isEditMode, existingResult]);

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

    const onSubmit: SubmitHandler<FormValues> = async (data) => {
        try {
            const submitData: any = {
                technicallyQualified: data.technicallyQualified,
            };

            if (data.technicallyQualified === 'No') {
                // Disqualified: Only send disqualification reason
                submitData.disqualificationReason = data.disqualificationReason;
            } else {
                // Qualified: Always include qualified parties data
                submitData.qualifiedPartiesCount = data.qualifiedPartiesCount;
                submitData.qualifiedPartiesNames = data.qualifiedPartiesNames;
                submitData.qualifiedPartiesScreenshot = data.qualifiedPartiesScreenshot.length > 0 ? data.qualifiedPartiesScreenshot[0] : null;

                // Only include result details if checkbox is checked (or in edit mode with result details visible)
                // Check if result details should be included based on checkbox state or if result data exists
                const shouldIncludeResultDetails = showResultDetails || (isEditMode && data.result);
                if (shouldIncludeResultDetails && data.result) {
                    submitData.result = data.result;
                    submitData.l1Price = data.l1Price;
                    submitData.l2Price = data.l2Price;
                    submitData.ourPrice = data.ourPrice;
                    submitData.finalResultScreenshot = data.finalResultScreenshot.length > 0 ? data.finalResultScreenshot[0] : null;
                }
            }

            await uploadResultMutation.mutateAsync({
                tenderId: tenderId,
                data: submitData,
            });
            if (onSuccess) {
                onSuccess();
            } else {
                navigate(paths.tendering.results);
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
                    <Button variant="outline" onClick={() => navigate(paths.tendering.results)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                            {/* Technically Qualified */}
                            <SelectField
                                control={form.control}
                                name="technicallyQualified"
                                label="Technically Qualified"
                                options={yesNoOptions}
                                placeholder="Select qualification status"
                            />

                            {/* Disqualification Reason */}
                            {technicallyQualified === 'No' && (
                                <FieldWrapper
                                    control={form.control}
                                    name="disqualificationReason"
                                    label="Reason for Disqualification"
                                    className="md:col-span-2"
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

                            {/* Qualified Details */}
                            {technicallyQualified === 'Yes' && (
                                <>
                                    {/* No. of Qualified Parties */}
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

                                    {/* Name of Qualified Parties */}
                                    <div className="flex gap-2 items-center">
                                        <div className="flex gap-2 items-center">
                                            <FieldWrapper
                                                control={form.control}
                                                name="qualifiedPartiesNames"
                                                label="Name of Qualified Parties"
                                                description="Add party names or enter 'not known' if unknown"
                                            >
                                                {(_field) => (
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
                                                )}
                                            </FieldWrapper>
                                            <Button type="button" onClick={addPartyName} size="icon">
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
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

                                    {/* Checkbox to show Result Details */}
                                    {!isEditMode && (
                                        <div className="flex items-center space-x-2 pt-4 md:col-span-3">
                                            <Checkbox
                                                id="showResultDetails"
                                                checked={showResultDetails}
                                                onCheckedChange={(checked) => setShowResultDetails(checked === true)}
                                            />
                                            <Label htmlFor="showResultDetails" className="text-sm font-medium cursor-pointer">
                                                Add Result Details Right Away (Optional)
                                            </Label>
                                        </div>
                                    )}

                                    {/* Result Details */}
                                    {(showResultDetails || isEditMode) && (
                                        <>
                                            {/* Result */}
                                            <SelectField
                                                control={form.control}
                                                name="result"
                                                label="Result"
                                                options={resultOptions.map(option => ({
                                                    value: String(option.value),
                                                    label: option.label
                                                }))}
                                                placeholder="Select result status"
                                            />

                                            {/* L1 Price */}
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

                                            {/* L2 Price */}
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

                                            {/* Our Price */}
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
                                            <div className="space-y-4 md:col-span-3">
                                                <h4 className="font-semibold text-sm text-primary border-b pb-2">
                                                    Upload Screenshots
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <TenderFileUploader
                                                        context="result-screenshots"
                                                        value={qualifiedPartiesScreenshot}
                                                        onChange={(paths) => form.setValue('qualifiedPartiesScreenshot', paths)}
                                                        label="Screenshot of Qualified Parties"
                                                        disabled={isSubmitting}
                                                    />
                                                    <TenderFileUploader
                                                        context="result-screenshots"
                                                        value={finalResultScreenshot}
                                                        onChange={(paths) => form.setValue('finalResultScreenshot', paths)}
                                                        label="Final Result Screenshot"
                                                        disabled={isSubmitting}
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate(paths.tendering.results)}
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
