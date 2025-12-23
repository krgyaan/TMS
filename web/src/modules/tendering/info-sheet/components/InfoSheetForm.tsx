import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { type SubmitHandler, useForm, useFieldArray } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { NumberInput } from '@/components/form/NumberInput';
import { SelectField } from '@/components/form/SelectField';
import { MultiSelectField } from '@/components/form/MultiSelectField';
import { DateTimeInput } from '@/components/form/DateTimeInput';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTenderApproval } from '@/hooks/api/useTenderApprovals';
import { Badge } from '@/components/ui/badge';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { ArrowLeft, Plus, Trash2, Save, AlertCircle } from 'lucide-react';
import { paths } from '@/app/routes/paths';
import { useCreateInfoSheet, useUpdateInfoSheet } from '@/hooks/api/useInfoSheets';
import { handleInfoSheetFormErrors } from '@/modules/tendering/info-sheet/helpers/tenderInfoSheet.errors';
import type { TenderInfoWithNames } from '@/types/api.types';
import {
    yesNoOptions,
    emdRequiredOptions,
    paymentModeOptions,
    paymentTermsOptions,
    bidValidityOptions,
    commercialEvaluationOptions,
    mafRequiredOptions,
    pbgFormOptions,
    sdFormOptions,
    pbgDurationOptions,
    ldPerWeekOptions,
    maxLdOptions,
    financialCriteriaOptions,
    rejectionReasonOptions,
    dummyTechnicalDocuments,
    dummyFinancialDocuments,
} from '@/modules/tendering/info-sheet/helpers/tenderInfoSheet.types';
import type { TenderInfoSheetFormValues, TenderInfoSheetResponse } from '@/modules/tendering/info-sheet/helpers/tenderInfoSheet.types';
import { TenderView } from '@/modules/tendering/tenders/components/TenderView';
import { infoSheetFieldOptions } from '@/modules/tendering/tender-approval/helpers/tenderApproval.types';
import { TenderInformationFormSchema } from '@/modules/tendering/info-sheet/helpers/tenderInfoSheet.schema';
import { workValueTypeOptions } from '@/modules/tendering/info-sheet/helpers/tenderInfoSheet.types';
import { buildDefaultValues, mapResponseToForm, mapFormToPayload } from '@/modules/tendering/info-sheet/helpers/tenderInfoSheet.mappers';
import { toast } from 'sonner';

interface TenderInformationFormProps {
    tenderId: number;
    tender?: TenderInfoWithNames | null;
    initialData?: TenderInfoSheetResponse | null;
    mode: 'create' | 'edit';
    isTenderLoading?: boolean;
    isInfoSheetLoading?: boolean;
}

const IncompleteFieldAlert = ({ comment }: { comment: string }) => (
    <div className="mt-2 space-y-1">
        <p className="text-sm text-amber-600 dark:text-amber-400">
            <strong>TL Said:</strong> {comment}
        </p>
    </div>
);

export function TenderInformationForm({
    tenderId,
    tender,
    initialData,
    mode,
    isTenderLoading,
    isInfoSheetLoading,
}: TenderInformationFormProps) {
    const navigate = useNavigate();
    const { data: approvalData } = useTenderApproval(tenderId);

    const initialFormValues = useMemo(() => {
        if (mode === 'create') {
            return buildDefaultValues(tender);
        }
        return mapResponseToForm(initialData ?? null, tender);
    }, [initialData, tender, mode]);

    const form = useForm<TenderInfoSheetFormValues>({
        resolver: zodResolver(TenderInformationFormSchema) as any,
        defaultValues: initialFormValues,
    });

    useEffect(() => {
        form.reset(initialFormValues);
    }, [form, initialFormValues]);

    const { fields: clientFields, append: appendClient, remove: removeClient } = useFieldArray({
        control: form.control,
        name: 'clients',
    });

    const isIncomplete = approvalData?.tlDecision === '3';
    const incompleteFields = approvalData?.incompleteFields || [];

    const getIncompleteFieldComment = (fieldName: string): string | null => {
        const field = incompleteFields.find((f: { fieldName: string; comment?: string }) => f.fieldName === fieldName);
        return field?.comment || null;
    };

    // Watch for conditional fields
    const teRecommendation = form.watch('teRecommendation');
    const processingFeeRequired = form.watch('processingFeeRequired');
    const tenderFeeRequired = form.watch('tenderFeeRequired');
    const emdRequired = form.watch('emdRequired');
    const pbgRequired = form.watch('pbgRequired');
    const sdRequired = form.watch('sdRequired');
    const physicalDocsRequired = form.watch('physicalDocsRequired');
    const deliveryTimeInstallationInclusive = form.watch('deliveryTimeInstallationInclusive');
    const workValueType = form.watch('workValueType');
    const avgAnnualTurnoverCriteria = form.watch('avgAnnualTurnoverCriteria');
    const workingCapitalCriteria = form.watch('workingCapitalCriteria');
    const solvencyCertificateCriteria = form.watch('solvencyCertificateCriteria');
    const netWorthCriteria = form.watch('netWorthCriteria');

    // Clear deliveryTimeInstallation when inclusive is true
    useEffect(() => {
        if (deliveryTimeInstallationInclusive) {
            form.setValue('deliveryTimeInstallation', null, { shouldValidate: false });
        }
    }, [deliveryTimeInstallationInclusive, form]);

    const isLoading = isTenderLoading || (mode === 'edit' && isInfoSheetLoading);
    const createInfoSheet = useCreateInfoSheet();
    const updateInfoSheet = useUpdateInfoSheet();
    const isSubmitting = createInfoSheet.isPending || updateInfoSheet.isPending;

    const handleSubmit: SubmitHandler<TenderInfoSheetFormValues> = async (values) => {
        try {
            const payload = mapFormToPayload(values);

            if (mode === 'create') {
                await createInfoSheet.mutateAsync({ tenderId, data: payload });
            } else {
                await updateInfoSheet.mutateAsync({ tenderId, data: payload });
            }

            navigate(paths.tendering.tenders);
        } catch (error) {
            toast.error("Failed to submit info sheet");
        }
    };

    if (isLoading) {
        return (
            <Card className="max-w-7xl mx-auto">
                <CardHeader>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48 mt-2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[800px] w-full" />
                </CardContent>
            </Card>
        );
    }

    if (mode === 'edit' && !initialData && !isInfoSheetLoading) {
        return (
            <Card className="max-w-3xl mx-auto">
                <CardHeader>
                    <CardTitle>Info Sheet Not Found</CardTitle>
                    <CardDescription>The selected tender does not have an info sheet yet.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>Create a new info sheet to continue.</AlertDescription>
                    </Alert>
                    <div className="mt-6 flex gap-3">
                        <Button variant="outline" onClick={() => navigate(-1)}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                        <Button onClick={() => navigate(paths.tendering.infoSheetCreate(tenderId))}>
                            Fill Info Sheet
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="max-w-7xl mx-auto">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>{mode === 'create' ? 'Create' : 'Edit'} Tender Information</CardTitle>
                        <CardDescription className="mt-2">
                            {tender ? (
                                <>
                                    <span className="font-medium">{tender.tenderName}</span> • Tender No: {tender.tenderNo}
                                </>
                            ) : (
                                'Linked tender details'
                            )}
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
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="tender-details">
                        <AccordionTrigger className="text-lg font-semibold bg-accent p-4 rounded-md cursor-pointer">
                            Tender Basic Details
                        </AccordionTrigger>
                        <AccordionContent>
                            <TenderView tender={tender as TenderInfoWithNames} />
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>

                {isIncomplete && incompleteFields.length > 0 && (
                    <Alert className="mb-6 border-amber-500 bg-amber-50 dark:bg-amber-950">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-800 dark:text-amber-200">
                            <div className="space-y-2">
                                <p className="font-semibold">
                                    This info sheet has been marked as incomplete by the TL.
                                </p>
                                <p className="text-sm">
                                    Please review and correct the following {incompleteFields.length} field(s) marked below:
                                </p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {incompleteFields.map((field: { fieldName: string; comment?: string }, idx: number) => (
                                        <Badge key={idx} variant="outline" className="border-amber-600">
                                            {infoSheetFieldOptions.find((opt: { value: string }) => opt.value === field.fieldName)?.label || field.fieldName}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit, handleInfoSheetFormErrors)}>
                        <div className="space-y-6 pt-4">
                            {/* TE Recommendation */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <SelectField
                                    control={form.control}
                                    name="teRecommendation"
                                    label="Recommendation by TE"
                                    options={yesNoOptions}
                                    placeholder="Select recommendation"
                                />
                                {teRecommendation === 'NO' && (
                                    <>
                                        <SelectField
                                            control={form.control}
                                            name="teRejectionReason"
                                            label="Reason of Rejection"
                                            options={rejectionReasonOptions.map(option => ({
                                                value: String(option.value),
                                                label: option.label
                                            }))}
                                            placeholder="Select rejection reason"
                                        />
                                        <FieldWrapper
                                            control={form.control}
                                            name="teRejectionRemarks"
                                            label="Rejection Remarks"
                                        >
                                            {(field) => (
                                                <textarea
                                                    className="border-input placeholder:text-muted-foreground h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                                    placeholder="Enter rejection remarks..."
                                                    maxLength={1000}
                                                    {...field}
                                                />
                                            )}
                                        </FieldWrapper>
                                    </>
                                )}
                            </div>

                            {/* Processing Fee */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <SelectField
                                    control={form.control}
                                    name="processingFeeRequired"
                                    label="Processing Fees Required"
                                    options={yesNoOptions}
                                    placeholder="Select option"
                                />
                                {processingFeeRequired === 'YES' && (
                                    <>
                                        <MultiSelectField
                                            control={form.control}
                                            name="processingFeeModes"
                                            label="Processing Fees Mode"
                                            options={paymentModeOptions.map(option => ({
                                                value: String(option.value),
                                                label: option.label
                                            }))}
                                            placeholder="Select payment modes"
                                        />
                                        <FieldWrapper
                                            control={form.control}
                                            name="processingFeeAmount"
                                            label="Processing Fees Amount"
                                        >
                                            {(field) => (
                                                <NumberInput
                                                    step={0.01}
                                                    placeholder="0.00"
                                                    value={typeof field.value === "number" ? field.value : null}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        </FieldWrapper>
                                    </>
                                )}
                            </div>

                            {/* Tender Fee */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <SelectField
                                    control={form.control}
                                    name="tenderFeeRequired"
                                    label="Tender Fees Required"
                                    options={yesNoOptions}
                                    placeholder="Select option"
                                />
                                {tenderFeeRequired === 'YES' && (
                                    <>
                                        <MultiSelectField
                                            control={form.control}
                                            name="tenderFeeModes"
                                            label="Tender Fees Mode"
                                            options={paymentModeOptions.map(option => ({
                                                value: String(option.value),
                                                label: option.label
                                            }))}
                                            placeholder="Select payment modes"
                                        />
                                        <FieldWrapper
                                            control={form.control}
                                            name="tenderFeeAmount"
                                            label="Tender Fees Amount"
                                        >
                                            {(field) => (
                                                <NumberInput
                                                    step={0.01}
                                                    placeholder="0.00"
                                                    value={typeof field.value === "number" ? field.value : null}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        </FieldWrapper>
                                    </>
                                )}
                            </div>

                            {/* EMD */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <SelectField
                                    control={form.control}
                                    name="emdRequired"
                                    label="EMD Required"
                                    options={emdRequiredOptions}
                                    placeholder="Select option"
                                />
                                {emdRequired === 'YES' && (
                                    <>
                                        <MultiSelectField
                                            control={form.control}
                                            name="emdModes"
                                            label="EMD Mode"
                                            options={paymentModeOptions.map(option => ({
                                                value: String(option.value),
                                                label: option.label
                                            }))}
                                            placeholder="Select payment modes"
                                        />
                                        <FieldWrapper
                                            control={form.control}
                                            name="emdAmount"
                                            label="EMD Amount"
                                        >
                                            {(field) => (
                                                <NumberInput
                                                    step={0.01}
                                                    placeholder="0.00"
                                                    value={typeof field.value === "number" ? field.value : null}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        </FieldWrapper>
                                    </>
                                )}
                            </div>

                            {/* Tender Value & Bid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FieldWrapper
                                    control={form.control}
                                    name="tenderValueGstInclusive"
                                    label="Tender Value (GST Inclusive)"
                                >
                                    {(field) => (
                                        <NumberInput
                                            step={0.01}
                                            placeholder="0.00"
                                            value={typeof field.value === "number" ? field.value : null}
                                            onChange={field.onChange}
                                            disabled
                                        />
                                    )}
                                </FieldWrapper>
                                <SelectField
                                    control={form.control}
                                    name="bidValidityDays"
                                    label="Bid Validity (Days)"
                                    options={bidValidityOptions.map(option => ({
                                        value: String(option.value),
                                        label: option.label
                                    }))}
                                    placeholder="Select days"
                                />
                                <SelectField
                                    control={form.control}
                                    name="mafRequired"
                                    label="MAF Required"
                                    options={mafRequiredOptions.map(option => ({
                                        value: String(option.value),
                                        label: option.label
                                    }))}
                                    placeholder="Select option"
                                />
                            </div>

                            {/* PBG */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <SelectField
                                    control={form.control}
                                    name="pbgRequired"
                                    label="PBG Required"
                                    options={yesNoOptions}
                                    placeholder="Select option"
                                />
                                {pbgRequired === 'YES' && (
                                    <>
                                        <SelectField
                                            control={form.control}
                                            name="pbgForm"
                                            label="PBG (in form of)"
                                            options={pbgFormOptions.map(option => ({
                                                value: String(option.value),
                                                label: option.label
                                            }))}
                                            placeholder="Select form"
                                        />
                                        <FieldWrapper
                                            control={form.control}
                                            name="pbgPercentage"
                                            label="PBG %age"
                                        >
                                            {(field) => (
                                                <NumberInput
                                                    step={0.01}
                                                    placeholder="0.00"
                                                    value={typeof field.value === "number" ? field.value : null}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        </FieldWrapper>
                                        <SelectField
                                            control={form.control}
                                            name="pbgDurationMonths"
                                            label="PBG Duration (Months)"
                                            options={pbgDurationOptions.map(option => ({
                                                value: String(option.value),
                                                label: option.label
                                            }))}
                                            placeholder="Select duration"
                                        />
                                    </>
                                )}
                            </div>

                            {/* SD */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <SelectField
                                    control={form.control}
                                    name="sdRequired"
                                    label="SD Required"
                                    options={yesNoOptions}
                                    placeholder="Select option"
                                />
                                {sdRequired === 'YES' && (
                                    <>
                                        <SelectField
                                            control={form.control}
                                            name="sdForm"
                                            label="SD (in form of)"
                                            options={sdFormOptions.map(option => ({
                                                value: String(option.value),
                                                label: option.label
                                            }))}
                                            placeholder="Select form"
                                        />
                                        <FieldWrapper
                                            control={form.control}
                                            name="securityDepositPercentage"
                                            label="SD %age"
                                        >
                                            {(field) => (
                                                <NumberInput
                                                    step={0.01}
                                                    placeholder="0.00"
                                                    value={typeof field.value === "number" ? field.value : null}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        </FieldWrapper>
                                        <FieldWrapper
                                            control={form.control}
                                            name="sdDurationMonths"
                                            label="SD Duration (Months)"
                                        >
                                            {(field) => (
                                                <NumberInput
                                                    step={1}
                                                    placeholder="Enter months"
                                                    value={typeof field.value === "number" ? field.value : null}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        </FieldWrapper>
                                    </>
                                )}
                            </div>

                            {/* Commercial & Auction */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <SelectField
                                    control={form.control}
                                    name="commercialEvaluation"
                                    label="Commercial Evaluation"
                                    options={commercialEvaluationOptions.map(option => ({
                                        value: String(option.value),
                                        label: option.label
                                    }))}
                                    placeholder="Select evaluation type"
                                />
                                <SelectField
                                    control={form.control}
                                    name="reverseAuctionApplicable"
                                    label="Reverse Auction Applicable"
                                    options={yesNoOptions}
                                    placeholder="Select option"
                                />
                            </div>

                            {/* Payment Terms */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <SelectField
                                    control={form.control}
                                    name="paymentTermsSupply"
                                    label="Payment Terms on Supply (%)"
                                    options={paymentTermsOptions.map(option => ({
                                        value: String(option.value),
                                        label: option.label
                                    }))}
                                    placeholder="Select percentage"
                                />
                                <SelectField
                                    control={form.control}
                                    name="paymentTermsInstallation"
                                    label="Payment Terms on Installation (%)"
                                    options={paymentTermsOptions.map(option => ({
                                        value: String(option.value),
                                        label: option.label
                                    }))}
                                    placeholder="Select percentage"
                                />
                            </div>

                            {/* Delivery Time */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FieldWrapper
                                    control={form.control}
                                    name="deliveryTimeSupply"
                                    label="Delivery Time (Supply/Total) - Days"
                                >
                                    {(field) => (
                                        <NumberInput
                                            step={1}
                                            placeholder="Enter number of days"
                                            value={typeof field.value === "number" ? field.value : null}
                                            onChange={field.onChange}
                                        />
                                    )}
                                </FieldWrapper>
                                <FieldWrapper
                                    control={form.control}
                                    name="deliveryTimeInstallationInclusive"
                                    label="Delivery Time for Installation"
                                >
                                    {(field) => (
                                        <div className="flex items-center space-x-2 h-10">
                                            <Checkbox
                                                id="deliveryTimeInstallationInclusive"
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                            <label
                                                htmlFor="deliveryTimeInstallationInclusive"
                                                className="text-sm font-medium cursor-pointer"
                                            >
                                                Inclusive in Supply/Total time
                                            </label>
                                        </div>
                                    )}
                                </FieldWrapper>
                                {!deliveryTimeInstallationInclusive && (
                                    <FieldWrapper
                                        control={form.control}
                                        name="deliveryTimeInstallation"
                                        label="Installation Days (if not inclusive)"
                                    >
                                        {(field) => (
                                            <NumberInput
                                                step={1}
                                                placeholder="Enter number of days"
                                                value={typeof field.value === "number" ? field.value : null}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    </FieldWrapper>
                                )}
                            </div>

                            {/* LD */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <SelectField
                                    control={form.control}
                                    name="ldRequired"
                                    label="LD Required"
                                    options={yesNoOptions}
                                    placeholder="Select option"
                                />
                                <SelectField
                                    control={form.control}
                                    name="ldPercentagePerWeek"
                                    label="LD/PRS Percentage (per week)"
                                    options={ldPerWeekOptions.map(option => ({
                                        value: String(option.value),
                                        label: option.label
                                    }))}
                                    placeholder="Select percentage"
                                />
                                <SelectField
                                    control={form.control}
                                    name="maxLdPercentage"
                                    label="Maximum LD Percentage"
                                    options={maxLdOptions.map(option => ({
                                        value: String(option.value),
                                        label: option.label
                                    }))}
                                    placeholder="Select percentage"
                                />
                            </div>

                            {/* Physical Docs */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <SelectField
                                    control={form.control}
                                    name="physicalDocsRequired"
                                    label="Physical Docs Submission Required"
                                    options={yesNoOptions}
                                    placeholder="Select option"
                                />
                                {physicalDocsRequired === 'YES' && (
                                    <FieldWrapper
                                        control={form.control}
                                        name="physicalDocsDeadline"
                                        label="Physical Docs Submission Deadline"
                                    >
                                        {(field) => (
                                            <DateTimeInput
                                                value={typeof field.value === "string" ? field.value : null}
                                                onChange={field.onChange}
                                                className="bg-background"
                                            />
                                        )}
                                    </FieldWrapper>
                                )}
                            </div>

                            {/* Technical Eligibility */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FieldWrapper
                                    control={form.control}
                                    name="techEligibilityAgeYears"
                                    label="Eligibility Criterion (Years)"
                                >
                                    {(field) => (
                                        <NumberInput
                                            step={1}
                                            placeholder="Enter number of years"
                                            value={typeof field.value === "number" ? field.value : null}
                                            onChange={field.onChange}
                                        />
                                    )}
                                </FieldWrapper>
                                <SelectField
                                    control={form.control}
                                    name="workValueType"
                                    label="Work Value Type"
                                    options={workValueTypeOptions.map(option => ({
                                        value: option.value,
                                        label: option.label
                                    }))}
                                    placeholder="Select type"
                                />
                            </div>

                            {/* Work Values */}
                            {workValueType === 'WORKS_VALUES' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <FieldWrapper control={form.control} name="orderValue1" label="1 Work Value">
                                        {(field) => (
                                            <NumberInput
                                                step={0.01}
                                                placeholder="0.00"
                                                value={typeof field.value === "number" ? field.value : null}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="orderValue2" label="2 Works Value">
                                        {(field) => (
                                            <NumberInput
                                                step={0.01}
                                                placeholder="0.00"
                                                value={typeof field.value === "number" ? field.value : null}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="orderValue3" label="3 Works Value">
                                        {(field) => (
                                            <NumberInput
                                                step={0.01}
                                                placeholder="0.00"
                                                value={typeof field.value === "number" ? field.value : null}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    </FieldWrapper>
                                </div>
                            )}

                            {/* Custom Eligibility */}
                            {workValueType === 'CUSTOM' && (
                                <div className="grid grid-cols-1 gap-6">
                                    <FieldWrapper
                                        control={form.control}
                                        name="customEligibilityCriteria"
                                        label="Custom Eligibility Criteria"
                                    >
                                        {(field) => (
                                            <textarea
                                                className="border-input placeholder:text-muted-foreground h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                                placeholder="Enter custom eligibility criteria..."
                                                maxLength={1000}
                                                {...field}
                                            />
                                        )}
                                    </FieldWrapper>
                                </div>
                            )}

                            {/* Documents */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <MultiSelectField
                                    control={form.control}
                                    name="technicalWorkOrders"
                                    label="PO Selected for Technical Eligibility"
                                    options={dummyTechnicalDocuments}
                                    placeholder="Select documents"
                                />
                                <MultiSelectField
                                    control={form.control}
                                    name="commercialDocuments"
                                    label="PQC Documents"
                                    options={dummyFinancialDocuments}
                                    placeholder="Select documents"
                                />
                            </div>

                            {/* Financial - Average Annual Turnover */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <SelectField
                                    control={form.control}
                                    name="avgAnnualTurnoverCriteria"
                                    label="Average Annual Turnover"
                                    options={financialCriteriaOptions}
                                    placeholder="Select criteria"
                                />
                                {avgAnnualTurnoverCriteria === 'AMOUNT' && (
                                    <FieldWrapper control={form.control} name="avgAnnualTurnoverValue" label="Amount">
                                        {(field) => (
                                            <NumberInput
                                                step={0.01}
                                                placeholder="0.00"
                                                value={typeof field.value === "number" ? field.value : null}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    </FieldWrapper>
                                )}
                            </div>

                            {/* Financial - Working Capital */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <SelectField
                                    control={form.control}
                                    name="workingCapitalCriteria"
                                    label="Working Capital"
                                    options={financialCriteriaOptions}
                                    placeholder="Select criteria"
                                />
                                {workingCapitalCriteria === 'AMOUNT' && (
                                    <FieldWrapper control={form.control} name="workingCapitalValue" label="Amount">
                                        {(field) => (
                                            <NumberInput
                                                step={0.01}
                                                placeholder="0.00"
                                                value={typeof field.value === "number" ? field.value : null}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    </FieldWrapper>
                                )}
                            </div>

                            {/* Financial - Solvency */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <SelectField
                                    control={form.control}
                                    name="solvencyCertificateCriteria"
                                    label="Solvency Certificate"
                                    options={financialCriteriaOptions}
                                    placeholder="Select criteria"
                                />
                                {solvencyCertificateCriteria === 'AMOUNT' && (
                                    <FieldWrapper control={form.control} name="solvencyCertificateValue" label="Amount">
                                        {(field) => (
                                            <NumberInput
                                                step={0.01}
                                                placeholder="0.00"
                                                value={typeof field.value === "number" ? field.value : null}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    </FieldWrapper>
                                )}
                            </div>

                            {/* Financial - Net Worth */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <SelectField
                                    control={form.control}
                                    name="netWorthCriteria"
                                    label="Net Worth"
                                    options={financialCriteriaOptions}
                                    placeholder="Select criteria"
                                />
                                {netWorthCriteria === 'AMOUNT' && (
                                    <FieldWrapper control={form.control} name="netWorthValue" label="Amount">
                                        {(field) => (
                                            <NumberInput
                                                step={0.01}
                                                placeholder="0.00"
                                                value={typeof field.value === "number" ? field.value : null}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    </FieldWrapper>
                                )}
                            </div>

                            {/* Client Organization */}
                            <div className="grid grid-cols-1 gap-6">
                                <FieldWrapper control={form.control} name="clientOrganization" label="Client Organisation">
                                    {(field) => <Input placeholder="Enter client organisation" {...field} />}
                                </FieldWrapper>
                            </div>

                            {/* Client Details */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-sm text-primary border-b pb-2">Client Details</h4>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            appendClient({
                                                clientName: '',
                                                clientDesignation: '',
                                                clientMobile: '',
                                                clientEmail: '',
                                            })
                                        }
                                    >
                                        <Plus className="mr-2 h-4 w-4" /> Add Client
                                    </Button>
                                </div>

                                {clientFields.map((field, index) => (
                                    <div key={field.id} className="p-4 border rounded-lg space-y-4 bg-muted/20">
                                        <div className="flex items-center justify-between">
                                            <h5 className="font-medium text-sm">Client {index + 1}</h5>
                                            {clientFields.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeClient(index)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <FieldWrapper
                                                control={form.control}
                                                name={`clients.${index}.clientName`}
                                                label="Name"
                                            >
                                                {(field) => <Input placeholder="Enter name" {...field} />}
                                            </FieldWrapper>
                                            <FieldWrapper
                                                control={form.control}
                                                name={`clients.${index}.clientDesignation`}
                                                label="Designation"
                                            >
                                                {(field) => <Input placeholder="Enter designation" {...field} />}
                                            </FieldWrapper>
                                            <FieldWrapper
                                                control={form.control}
                                                name={`clients.${index}.clientEmail`}
                                                label="Email"
                                            >
                                                {(field) => <Input type="email" placeholder="Enter email" {...field} />}
                                            </FieldWrapper>
                                            <FieldWrapper
                                                control={form.control}
                                                name={`clients.${index}.clientMobile`}
                                                label="Number"
                                            >
                                                {(field) => <Input placeholder="Enter number" {...field} />}
                                            </FieldWrapper>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Courier & TE Remark */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FieldWrapper control={form.control} name="courierAddress" label="Courier Delivery Address">
                                    {(field) => (
                                        <textarea
                                            className="border-input placeholder:text-muted-foreground h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                            placeholder="Enter courier delivery address..."
                                            maxLength={1000}
                                            {...field}
                                        />
                                    )}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name="teRemark" label="TE Final Remark">
                                    {(field) => (
                                        <textarea
                                            className="border-input placeholder:text-muted-foreground h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                            placeholder="Enter final remarks..."
                                            maxLength={1000}
                                            {...field}
                                        />
                                    )}
                                </FieldWrapper>
                                {getIncompleteFieldComment('teRemark') && (
                                    <IncompleteFieldAlert comment={getIncompleteFieldComment('teRemark')!} />
                                )}
                                {getIncompleteFieldComment('courierAddress') && (
                                    <IncompleteFieldAlert comment={getIncompleteFieldComment('courierAddress')!} />
                                )}
                            </div>
                        </div>

                        {/* Submit Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-6 border-t mt-6">
                            <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => form.reset(initialFormValues)}
                                disabled={isSubmitting}
                            >
                                Reset
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="animate-spin mr-2">⏳</span>
                                        {mode === 'create' ? 'Creating...' : 'Updating...'}
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        {mode === 'create' ? 'Create' : 'Update'} Tender Information
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
