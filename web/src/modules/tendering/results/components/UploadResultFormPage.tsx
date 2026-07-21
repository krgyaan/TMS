import { useEffect, useState } from "react";
import { useForm, useWatch, useFieldArray, FormProvider } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { paths } from "@/app/routes/paths";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { NumberInput } from "@/components/form/NumberInput";
import { SelectField } from "@/components/form/SelectField";
import { TenderFileUploader } from "@/components/tender-file-upload";
import { Checkbox } from "@/components/ui/checkbox";
import { useUploadResult, useTenderResultByTenderId } from "@/hooks/api/useTenderResults";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

interface UploadResultFormPageProps {
    tenderId: number;
    tenderDetails: {
        tenderNo: string;
        tenderName: string;
        partiesCount: string;
        partiesNames: string[];
    };
    isEditMode?: boolean;
    isItemWise?: boolean;
    onSuccess?: () => void;
}

interface DetailFormEntry {
    result: string;
    resultReason: string;
    l1Price: number | null;
    l2Price: number | null;
    ourPrice: number | null;
    qualifiedPartiesScreenshot: string[];
    finalResultScreenshot: string[];
}

const yesNoOptions = [
    { label: "No", value: "No" },
    { label: "Yes", value: "Yes" },
];

const resultOptions = [
    { label: "Won", value: "Won" },
    { label: "Lost", value: "Lost" },
    { label: "Cancelled", value: "Cancelled" },
];

const defaultDetail: DetailFormEntry = {
    result: '',
    resultReason: '',
    l1Price: null,
    l2Price: null,
    ourPrice: null,
    qualifiedPartiesScreenshot: [],
    finalResultScreenshot: [],
};

export default function UploadResultFormPage({ tenderId, tenderDetails, isEditMode = false, isItemWise = false, onSuccess }: UploadResultFormPageProps) {
    const navigate = useNavigate();
    const uploadResultMutation = useUploadResult();
    const { data: existingResult } = useTenderResultByTenderId(tenderId);

    const form = useForm({
        defaultValues: {
            technicallyQualified: 'Yes',
            disqualificationReason: '',
            qualifiedPartiesCount: '',
            uploadLineItemsNow: false,
            details: isItemWise ? ([] as DetailFormEntry[]) : [{ ...defaultDetail }],
        },
    });
    const { control, handleSubmit, reset, setValue, watch } = form;

    const { fields, append, remove } = useFieldArray({ control, name: 'details' });

    const technicallyQualified = useWatch({ control, name: 'technicallyQualified' });
    const detailsValues = useWatch({ control, name: 'details' });

    const [qualifiedPartiesNames, setQualifiedPartiesNames] = useState<string[]>([]);
    const [newPartyName, setNewPartyName] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (existingResult) {
            const hasDetails = isEditMode && existingResult.details && existingResult.details.length > 0;
            reset({
                technicallyQualified: ['Yes', 'No'].includes(existingResult.technicallyQualified ?? '')
                    ? (existingResult.technicallyQualified ?? 'Yes') : 'Yes',
                disqualificationReason: existingResult.disqualificationReason ?? '',
                qualifiedPartiesCount: existingResult.qualifiedPartiesCount ?? '',
                uploadLineItemsNow: hasDetails,
                details: hasDetails
                    ? existingResult.details.map((d: any) => ({
                        result: d.result ?? '',
                        resultReason: d.resultReason ?? '',
                        l1Price: d.l1Price ? Number(d.l1Price) : null,
                        l2Price: d.l2Price ? Number(d.l2Price) : null,
                        ourPrice: d.ourPrice ? Number(d.ourPrice) : null,
                        qualifiedPartiesScreenshot: Array.isArray(d.qualifiedPartiesScreenshot) ? d.qualifiedPartiesScreenshot : d.qualifiedPartiesScreenshot ? [d.qualifiedPartiesScreenshot] : [],
                        finalResultScreenshot: Array.isArray(d.finalResultScreenshot) ? d.finalResultScreenshot : d.finalResultScreenshot ? [d.finalResultScreenshot] : [],
                    }))
                    : (isItemWise ? [] : [{ ...defaultDetail }]),
            });
            setQualifiedPartiesNames(existingResult.qualifiedPartiesNames ?? []);
        }
    }, [existingResult, isEditMode, reset]);

    const addDetail = () => append({ ...defaultDetail });

    const removeDetail = (index: number) => remove(index);

    const addPartyName = () => {
        if (newPartyName.trim()) {
            setQualifiedPartiesNames(prev => [...prev, newPartyName.trim()]);
            setNewPartyName('');
        }
    };

    const removePartyName = (index: number) => {
        setQualifiedPartiesNames(prev => prev.filter((_, i) => i !== index));
    };

    const onSubmit = handleSubmit(async (data) => {
        setSubmitting(true);
        try {
            if (data.uploadLineItemsNow) {
                if (!data.details || data.details.length === 0) {
                    toast.error('Please add at least one line item result');
                    setSubmitting(false);
                    return;
                }
                for (let i = 0; i < data.details.length; i++) {
                    const detail = data.details[i];
                    if (!detail.result) {
                        toast.error(`Line item ${i + 1}: Result is required`);
                        setSubmitting(false);
                        return;
                    }
                    if (!detail.resultReason?.trim()) {
                        toast.error(`Line item ${i + 1}: Result reason is required`);
                        setSubmitting(false);
                        return;
                    }
                    if (detail.result !== 'Cancelled') {
                        if (detail.l1Price == null || isNaN(Number(detail.l1Price))) {
                            toast.error(`Line item ${i + 1}: L1 Price is required`);
                            setSubmitting(false);
                            return;
                        }
                        if (detail.ourPrice == null || isNaN(Number(detail.ourPrice))) {
                            toast.error(`Line item ${i + 1}: Our Price is required`);
                            setSubmitting(false);
                            return;
                        }
                    }
                }
            }

            const submitData: any = {
                technicallyQualified: data.technicallyQualified,
            };

            if (data.technicallyQualified === 'No') {
                submitData.disqualificationReason = data.disqualificationReason;
            } else {
                submitData.qualifiedPartiesCount = data.qualifiedPartiesCount;
                submitData.qualifiedPartiesNames = qualifiedPartiesNames;

                if (data.details.length > 0) {
                    submitData.details = data.details.map(d => ({
                        result: d.result || undefined,
                        resultReason: d.resultReason || undefined,
                        l1Price: d.l1Price != null ? d.l1Price.toString() : undefined,
                        l2Price: d.l2Price != null ? d.l2Price.toString() : undefined,
                        ourPrice: d.ourPrice != null ? d.ourPrice.toString() : undefined,
                        qualifiedPartiesScreenshot: Array.isArray(d.qualifiedPartiesScreenshot) && d.qualifiedPartiesScreenshot.length > 0 ? d.qualifiedPartiesScreenshot : d.qualifiedPartiesScreenshot ? [d.qualifiedPartiesScreenshot] : undefined,
                        finalResultScreenshot: Array.isArray(d.finalResultScreenshot) && d.finalResultScreenshot.length > 0 ? d.finalResultScreenshot : d.finalResultScreenshot ? [d.finalResultScreenshot] : undefined,
                    }));
                }
            }

            await uploadResultMutation.mutateAsync({
                tenderId,
                data: submitData,
            });
            if (onSuccess) {
                onSuccess();
            } else {
                navigate(paths.tendering.results);
            }
        } catch (error) {
            console.error('Error uploading result:', error);
        } finally {
            setSubmitting(false);
        }
    });

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
                <FormProvider {...form}>
                    <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-start">
                        <SelectField
                            control={control}
                            name="technicallyQualified"
                            label="Technically Qualified"
                            options={yesNoOptions}
                            placeholder="Select qualification status"
                        />

                        {technicallyQualified === 'No' && (
                            <div className="md:col-span-2">
                                <FieldWrapper
                                    control={control}
                                    name="disqualificationReason"
                                    label="Reason for Disqualification"
                                >
                                    {field => (
                                        <textarea
                                            className="border-input placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                            placeholder="Enter reason for disqualification"
                                            {...field}
                                        />
                                    )}
                                </FieldWrapper>
                            </div>
                        )}

                        {technicallyQualified === 'Yes' && (
                            <div className="col-span-4">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="text-sm font-medium mb-1 block">No. of Qualified Parties</label>
                                        <Input
                                            value={watch('qualifiedPartiesCount')}
                                            onChange={(e) => setValue('qualifiedPartiesCount', e.target.value)}
                                            placeholder="e.g., 5 or 'not known'"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex gap-2 items-end">
                                            <div className="flex-1">
                                                <label className="text-sm font-medium mb-1 block">Name of Qualified Parties</label>
                                                <Input
                                                    value={newPartyName}
                                                    onChange={(e) => setNewPartyName(e.target.value)}
                                                    placeholder="Enter party name"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') { e.preventDefault(); addPartyName(); }
                                                    }}
                                                />
                                            </div>
                                            <Button type="button" onClick={addPartyName} size="icon">
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    {qualifiedPartiesNames.length > 0 && (
                                        <div className="">
                                            {qualifiedPartiesNames.map((name, index) => (
                                                <Badge key={index} variant="secondary" className="gap-1">
                                                    {name}
                                                    <button onClick={() => removePartyName(index)} className="ml-1">&times;</button>
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="mt-4 flex items-center gap-2">
                                    <Checkbox
                                        id="uploadLineItemsNow"
                                        checked={watch('uploadLineItemsNow')}
                                        onCheckedChange={(checked) => setValue('uploadLineItemsNow', checked === true)}
                                    />
                                    <label htmlFor="uploadLineItemsNow" className="text-sm font-medium cursor-pointer select-none">
                                        Upload line item results now?
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    {technicallyQualified === 'Yes' && watch('uploadLineItemsNow') && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-base text-primary border-b pb-2">
                                    {isItemWise ? `Line Item Results (${fields.length})` : 'Result Details'}
                                </h4>
                                {isItemWise && (
                                    <Button type="button" variant="outline" size="sm" onClick={addDetail}>
                                        <Plus className="mr-2 h-4 w-4" /> Add Line Item
                                    </Button>
                                )}
                            </div>

                            {fields.map((field, index) => {
                                const detailValues = detailsValues?.[index];
                                const isCancelled = detailValues?.result === 'Cancelled';

                                return (
                                    <div key={field.id} className="border rounded-lg p-4 space-y-4 bg-white dark:bg-gray-950">
                                        <div className="flex items-center justify-between">
                                            <h5 className="font-semibold text-sm">Line Item</h5>
                                            {isItemWise && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeDetail(index)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 space-y-4">
                                            <SelectField
                                                control={control}
                                                name={`details.${index}.result`}
                                                label="Result"
                                                options={resultOptions}
                                                placeholder="Select result"
                                            />

                                            {!isCancelled && (
                                                <>
                                                    <FieldWrapper
                                                        control={control}
                                                        name={`details.${index}.l1Price`}
                                                        label="L1 Price"
                                                    >
                                                        {field => (
                                                            <NumberInput
                                                                step={0.01}
                                                                placeholder="L1 Price"
                                                                value={field.value}
                                                                onChange={field.onChange}
                                                            />
                                                        )}
                                                    </FieldWrapper>
                                                    <FieldWrapper
                                                        control={control}
                                                        name={`details.${index}.l2Price`}
                                                        label="L2 Price"
                                                    >
                                                        {field => (
                                                            <NumberInput
                                                                step={0.01}
                                                                placeholder="L2 Price"
                                                                value={field.value}
                                                                onChange={field.onChange}
                                                            />
                                                        )}
                                                    </FieldWrapper>
                                                    <FieldWrapper
                                                        control={control}
                                                        name={`details.${index}.ourPrice`}
                                                        label="Our Price"
                                                    >
                                                        {field => (
                                                            <NumberInput
                                                                step={0.01}
                                                                placeholder="Our Price"
                                                                value={field.value}
                                                                onChange={field.onChange}
                                                            />
                                                        )}
                                                    </FieldWrapper>
                                                </>
                                            )}

                                            <div>
                                                <FieldWrapper
                                                    control={control}
                                                    name={`details.${index}.resultReason`}
                                                    label="Result Reason"
                                                >
                                                    {field => (
                                                        <textarea
                                                            className="border-input placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                                            placeholder={isCancelled ? "Reason for cancellation" : "Reason for Win/Loss"}
                                                            {...field}
                                                        />
                                                    )}
                                                </FieldWrapper>
                                            </div>
                                            {!isCancelled && (
                                                <>
                                                    <TenderFileUploader
                                                        context="result-screenshots"
                                                        value={detailValues?.qualifiedPartiesScreenshot || []}
                                                        onChange={(paths) => setValue(`details.${index}.qualifiedPartiesScreenshot`, paths)}
                                                        label="Screenshot of Qualified Parties"
                                                        disabled={submitting}
                                                    />
                                                    <TenderFileUploader
                                                        context="result-screenshots"
                                                        value={detailValues?.finalResultScreenshot || []}
                                                        onChange={(paths) => setValue(`details.${index}.finalResultScreenshot`, paths)}
                                                        label="Final Result Screenshot"
                                                        disabled={submitting}
                                                    />
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate(paths.tendering.results)}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button onClick={onSubmit} disabled={submitting}>
                            <Save className="mr-2 h-4 w-4" />
                            Upload Result
                        </Button>
                    </div>
                </div>
                </FormProvider>
            </CardContent>
        </Card>
    );
}
