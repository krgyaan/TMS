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
import { FileUploader } from '@/components/file-upload';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft, Plus, Trash2, Save, AlertCircle } from 'lucide-react';
import { paths } from '@/app/routes/paths';
import { useCreateInfoSheet, useUpdateInfoSheet, useInfoSheet } from '@/hooks/api/useInfoSheets';
import { handleInfoSheetFormErrors } from '@/modules/tendering/info-sheet/helpers/tenderInfoSheet.errors';
import type { TenderInfoWithNames } from '@/modules/tendering/tenders/helpers/tenderInfo.types';
import {
    yesNoOptions,
    commercialEvaluationOptions,
    mafRequiredOptions,
    pbgFormOptions,
    pbgDurationOptions,
    physicalDocTypeOptions,
} from '@/modules/tendering/info-sheet/helpers/tenderInfoSheet.types';
import { useDnbStatusOptions } from '@/hooks/useSelectOptions';
import type { TenderInfoSheetFormValues, TenderInfoSheetResponse } from '@/modules/tendering/info-sheet/helpers/tenderInfoSheet.types';
import { TenderView } from '@/modules/tendering/tenders/components/TenderView';
import { TenderInformationFormSchema } from '@/modules/tendering/info-sheet/helpers/tenderInfoSheet.schema';
import { mapResponseToForm, mapFormToPayload } from '@/modules/tendering/info-sheet/helpers/tenderInfoSheet.mappers';

interface EnquiryInfoSheetFormProps {
    tenderId: number;
    tender?: TenderInfoWithNames | null;
    initialData?: TenderInfoSheetResponse | null;
    mode: 'create' | 'edit';
    isTenderLoading?: boolean;
    isInfoSheetLoading?: boolean;
}

// SD "in form of" options — enquiry adds an NA option (unlike tender)
const enquirySdFormOptions = [
    { value: 'NA', label: 'NA' },
    ...pbgFormOptions,
];

const buildEnquiryDefaults = (tender?: TenderInfoWithNames | null): TenderInfoSheetFormValues => {
    const defaults = {
        teRecommendation: 'YES' as const,
        teRejectionReason: null,
        teRejectionRemarks: '',
        teRejectionProof: [] as string[],

        processingFeeRequired: undefined,
        processingFeeModes: [] as string[],
        processingFeeAmount: 0,

        tenderFeeRequired: undefined,
        tenderFeeModes: [] as string[],
        tenderFeeAmount: tender?.tenderFees ? Number(tender.tenderFees) : 0,

        emdRequired: undefined,
        emdModes: [] as string[],
        emdAmount: tender?.emd ? Number(tender.emd) : 0,

        tenderValue: tender?.gstValues ? Number(tender.gstValues) : 0,
        oemExperience: null as 'YES' | 'NO' | null,

        bidValidityDays: 0,
        commercialEvaluation: undefined,
        mafRequired: undefined,
        reverseAuctionApplicable: undefined,

        paymentTermsSupply: 0,
        paymentTermsInstallation: 0,

        deliveryTimeSupply: 0,
        deliveryTimeInstallationInclusive: false,
        deliveryTimeInstallation: undefined,

        pbgRequired: undefined,
        pbgForm: undefined as string[] | undefined,
        pbgPercentage: 0,
        pbgDurationMonths: 0,

        sdRequired: undefined,
        sdForm: undefined as string[] | undefined,
        securityDepositPercentage: 0,
        sdDurationMonths: 0,

        ldRequired: undefined,
        ldPercentagePerWeek: 0,
        maxLdPercentage: 0,

        physicalDocsRequired: 'NO' as 'YES' | 'NO',
        physicalDocType: undefined,
        physicalDocsDeadline: '',

        techEligibilityAgeYears: 0,

        workValueType: undefined,
        orderValue1: 0,
        orderValue2: 0,
        orderValue3: 0,
        customEligibilityCriteria: '',

        technicalWorkOrders: [] as string[],
        commercialDocuments: [] as string[],

        avgAnnualTurnoverCriteria: undefined,
        avgAnnualTurnoverValue: 0,
        workingCapitalCriteria: undefined,
        workingCapitalValue: 0,
        solvencyCertificateCriteria: undefined,
        solvencyCertificateValue: 0,
        netWorthCriteria: undefined,
        netWorthValue: 0,

        courierAddress: '',
        courierName: '',
        courierPhone: '',
        courierAddressLine1: '',
        courierAddressLine2: '',
        courierCity: '',
        courierState: '',
        courierPincode: '',

        clientDetailsPresent: 'YES' as 'YES' | 'NO',
        customerInContact: 'YES' as 'YES' | 'NO',
        courierDetailsPresent: 'YES' as 'YES' | 'NO',

        clients: [
            {
                clientName: '',
                clientDesignation: '',
                clientMobile: '',
                clientEmail: '',
            },
        ],

        teRemark: '',
    };
    return defaults;
};

export function EnquiryInfoSheetForm({
    tenderId,
    tender,
    initialData,
    mode,
    isTenderLoading,
    isInfoSheetLoading,
}: EnquiryInfoSheetFormProps) {
    const navigate = useNavigate();
    const { data: infoSheet } = useInfoSheet(tenderId);
    const rejectionReasonOptions = useDnbStatusOptions();

    const initialFormValues = useMemo(() => {
        if (mode === 'create') {
            return buildEnquiryDefaults(tender);
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

    // Watch for conditional fields
    const teRecommendation = form.watch('teRecommendation');
    const pbgRequired = form.watch('pbgRequired');
    const sdRequired = form.watch('sdRequired');
    const ldRequired = form.watch('ldRequired');
    const physicalDocsRequired = form.watch('physicalDocsRequired');
    const deliveryTimeInstallationInclusive = form.watch('deliveryTimeInstallationInclusive');

    const isRecommended = teRecommendation !== 'NO';
    const teRejectionProof = form.watch('teRejectionProof');

    // Clear rejection fields when switching to YES
    useEffect(() => {
        if (isRecommended) {
            form.setValue('teRejectionReason', undefined, { shouldValidate: false });
            form.setValue('teRejectionRemarks', undefined, { shouldValidate: false });
            form.setValue('teRejectionProof', [], { shouldValidate: false });
        }
    }, [isRecommended, form]);

    // Clear deliveryTimeInstallation when inclusive is true
    useEffect(() => {
        if (deliveryTimeInstallationInclusive) {
            form.setValue('deliveryTimeInstallation', undefined, { shouldValidate: false });
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
            console.error('Enquiry info sheet submission error:', error);
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

    return (
        <Card className="max-w-7xl mx-auto">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>
                            {mode === 'create' ? 'Create' : 'Edit'} Enquiry Information
                        </CardTitle>
                        <CardDescription className="mt-2">
                            {tender ? (
                                <>
                                    <span className="font-medium">{tender.tenderName}</span>{' '}
                                    • Tender No: {tender.tenderNo}
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

                {infoSheet && mode === 'create' && (
                    <Alert className="mb-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            This enquiry already has an info sheet — editing below.
                        </AlertDescription>
                    </Alert>
                )}

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit, handleInfoSheetFormErrors)}>
                        <div className="space-y-6 pt-4">
                            {/* Recommendation by TE */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <SelectField
                                        control={form.control}
                                        name="teRecommendation"
                                        label="Recommendation by TE"
                                        options={yesNoOptions}
                                        placeholder="Select recommendation"
                                    />
                                </div>
                            </div>

                            {/* Rejection section (only when NO) */}
                            {!isRecommended && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <SelectField
                                            control={form.control}
                                            name="teRejectionReason"
                                            label="Reason of Rejection *"
                                            options={rejectionReasonOptions}
                                            placeholder="Select rejection reason"
                                        />
                                    </div>
                                    <div>
                                        <FieldWrapper
                                            control={form.control}
                                            name="teRejectionRemarks"
                                            label="Rejection Remarks *"
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
                                    </div>
                                    <div>
                                        <FileUploader
                                            context="tender-rejection-proof"
                                            value={teRejectionProof}
                                            onChange={(paths) =>
                                                form.setValue('teRejectionProof', paths, {
                                                    shouldValidate: true,
                                                })
                                            }
                                            label="Proof of Rejection *"
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Full form section (only when YES) */}
                            {isRecommended && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Approx Enquiry Value */}
                                    <div>
                                        <FieldWrapper
                                            control={form.control}
                                            name="tenderValue"
                                            label="Approx Enquiry Value (GST Inclusive)"
                                        >
                                            {(field) => (
                                                <NumberInput
                                                    step={0.01}
                                                    placeholder="0.00"
                                                    value={
                                                        typeof field.value === 'number' ? field.value : null
                                                    }
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        </FieldWrapper>
                                    </div>

                                    {/* Commercial Evaluation */}
                                    <div>
                                        <SelectField
                                            control={form.control}
                                            name="commercialEvaluation"
                                            label="Commercial Evaluation"
                                            options={commercialEvaluationOptions.map((option) => ({
                                                value: String(option.value),
                                                label: option.label,
                                            }))}
                                            placeholder="Select evaluation type"
                                        />
                                    </div>

                                    {/* RA Applicable */}
                                    <div>
                                        <SelectField
                                            control={form.control}
                                            name="reverseAuctionApplicable"
                                            label="RA Applicable"
                                            options={yesNoOptions}
                                            placeholder="Select option"
                                        />
                                    </div>

                                    {/* MAF */}
                                    <div>
                                        <SelectField
                                            control={form.control}
                                            name="mafRequired"
                                            label="MAF Required"
                                            options={mafRequiredOptions.map((option) => ({
                                                value: String(option.value),
                                                label: option.label,
                                            }))}
                                            placeholder="Select option"
                                        />
                                    </div>

                                    {/* Delivery Time Supply */}
                                    <div>
                                        <FieldWrapper
                                            control={form.control}
                                            name="deliveryTimeSupply"
                                            label="Delivery Time (Supply/Total) - Days"
                                        >
                                            {(field) => (
                                                <NumberInput
                                                    step={1}
                                                    placeholder="Enter number of days"
                                                    value={
                                                        typeof field.value === 'number' ? field.value : null
                                                    }
                                                    onChange={(value) => {
                                                        field.onChange(value === 0 ? null : value);
                                                    }}
                                                />
                                            )}
                                        </FieldWrapper>
                                    </div>

                                    {/* Delivery Time Installation */}
                                    <div>
                                        <FieldWrapper
                                            control={form.control}
                                            name="deliveryTimeInstallationInclusive"
                                            label="Delivery Time for Installation"
                                        >
                                            {(field) => (
                                                <div className="flex items-center space-x-2 h-10">
                                                    <Checkbox
                                                        id="enq-deliveryTimeInstallationInclusive"
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                    <label
                                                        htmlFor="enq-deliveryTimeInstallationInclusive"
                                                        className="text-sm font-medium cursor-pointer"
                                                    >
                                                        Inclusive in Supply/Total time
                                                    </label>
                                                </div>
                                            )}
                                        </FieldWrapper>
                                    </div>
                                    {!deliveryTimeInstallationInclusive && (
                                        <div>
                                            <FieldWrapper
                                                control={form.control}
                                                name="deliveryTimeInstallation"
                                                label="Installation Days (if not inclusive)"
                                            >
                                                {(field) => (
                                                    <NumberInput
                                                        step={1}
                                                        placeholder="Enter number of days"
                                                        value={
                                                            typeof field.value === 'number' ? field.value : null
                                                        }
                                                        onChange={(value) => {
                                                            field.onChange(value === 0 ? null : value);
                                                        }}
                                                    />
                                                )}
                                            </FieldWrapper>
                                        </div>
                                    )}

                                    {/* Payment Terms Supply */}
                                    <div>
                                        <FieldWrapper
                                            control={form.control}
                                            name="paymentTermsSupply"
                                            label="Payment Terms on Supply (%)"
                                        >
                                            {(field) => (
                                                <NumberInput
                                                    step={0.01}
                                                    min={0}
                                                    max={100}
                                                    placeholder="Enter percentage (0-100)"
                                                    value={
                                                        typeof field.value === 'number' ? field.value : null
                                                    }
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        </FieldWrapper>
                                    </div>

                                    {/* Payment Terms Installation */}
                                    <div>
                                        <FieldWrapper
                                            control={form.control}
                                            name="paymentTermsInstallation"
                                            label="Payment Terms on Installation (%)"
                                        >
                                            {(field) => (
                                                <NumberInput
                                                    step={0.01}
                                                    min={0}
                                                    max={100}
                                                    placeholder="Enter percentage (0-100)"
                                                    value={
                                                        typeof field.value === 'number' ? field.value : null
                                                    }
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        </FieldWrapper>
                                    </div>

                                    {/* PBG */}
                                    <div>
                                        <SelectField
                                            control={form.control}
                                            name="pbgRequired"
                                            label="PBG Required"
                                            options={yesNoOptions}
                                            placeholder="Select option"
                                        />
                                    </div>
                                    {pbgRequired === 'YES' && (
                                        <>
                                            <div>
                                                <MultiSelectField
                                                    control={form.control}
                                                    name="pbgForm"
                                                    label="PBG (in form of)"
                                                    options={pbgFormOptions.map((option) => ({
                                                        value: String(option.value),
                                                        label: option.label,
                                                    }))}
                                                    placeholder="Select forms"
                                                />
                                            </div>
                                            <div>
                                                <FieldWrapper
                                                    control={form.control}
                                                    name="pbgPercentage"
                                                    label="PBG %age"
                                                >
                                                    {(field) => (
                                                        <NumberInput
                                                            step={0.01}
                                                            min={0}
                                                            max={100}
                                                            placeholder="Enter percentage (0-100)"
                                                            value={
                                                                typeof field.value === 'number'
                                                                    ? field.value
                                                                    : null
                                                            }
                                                            onChange={field.onChange}
                                                        />
                                                    )}
                                                </FieldWrapper>
                                            </div>
                                            <div>
                                                <SelectField
                                                    control={form.control}
                                                    name="pbgDurationMonths"
                                                    label="PBG Duration (Months)"
                                                    options={pbgDurationOptions.map((option) => ({
                                                        value: String(option.value),
                                                        label: option.label,
                                                    }))}
                                                    placeholder="Select duration"
                                                />
                                            </div>
                                        </>
                                    )}

                                    {/* SD */}
                                    <div>
                                        <SelectField
                                            control={form.control}
                                            name="sdRequired"
                                            label="SD Required"
                                            options={yesNoOptions}
                                            placeholder="Select option"
                                        />
                                    </div>
                                    {sdRequired === 'YES' && (
                                        <>
                                            <div>
                                                <MultiSelectField
                                                    control={form.control}
                                                    name="sdForm"
                                                    label="SD (in form of)"
                                                    options={enquirySdFormOptions.map((option) => ({
                                                        value: String(option.value),
                                                        label: option.label,
                                                    }))}
                                                    placeholder="Select forms"
                                                />
                                            </div>
                                            <div>
                                                <FieldWrapper
                                                    control={form.control}
                                                    name="securityDepositPercentage"
                                                    label="SD %age"
                                                >
                                                    {(field) => (
                                                        <NumberInput
                                                            step={0.01}
                                                            min={0}
                                                            max={100}
                                                            placeholder="Enter percentage (0-100)"
                                                            value={
                                                                typeof field.value === 'number'
                                                                    ? field.value
                                                                    : null
                                                            }
                                                            onChange={field.onChange}
                                                        />
                                                    )}
                                                </FieldWrapper>
                                            </div>
                                            <div>
                                                <FieldWrapper
                                                    control={form.control}
                                                    name="sdDurationMonths"
                                                    label="SD Duration (Months)"
                                                >
                                                    {(field) => (
                                                        <NumberInput
                                                            step={1}
                                                            placeholder="Enter months"
                                                            value={
                                                                typeof field.value === 'number'
                                                                    ? field.value
                                                                    : null
                                                            }
                                                            onChange={(value) => {
                                                                field.onChange(value === 0 ? null : value);
                                                            }}
                                                        />
                                                    )}
                                                </FieldWrapper>
                                            </div>
                                        </>
                                    )}

                                    {/* LD */}
                                    <div>
                                        <SelectField
                                            control={form.control}
                                            name="ldRequired"
                                            label="LD Applicable"
                                            options={yesNoOptions}
                                            placeholder="Select option"
                                        />
                                    </div>
                                    {ldRequired === 'YES' && (
                                        <>
                                            <div>
                                                <FieldWrapper
                                                    control={form.control}
                                                    name="ldPercentagePerWeek"
                                                    label="LD/PRS Percentage (per week)"
                                                >
                                                    {(field) => (
                                                        <NumberInput
                                                            step={0.01}
                                                            min={0}
                                                            max={5}
                                                            placeholder="Enter percentage (0-5)"
                                                            value={
                                                                typeof field.value === 'number'
                                                                    ? field.value
                                                                    : null
                                                            }
                                                            onChange={field.onChange}
                                                        />
                                                    )}
                                                </FieldWrapper>
                                            </div>
                                            <div>
                                                <FieldWrapper
                                                    control={form.control}
                                                    name="maxLdPercentage"
                                                    label="Maximum LD Percentage"
                                                >
                                                    {(field) => (
                                                        <NumberInput
                                                            step={0.01}
                                                            min={0}
                                                            max={100}
                                                            placeholder="Enter percentage (0-100)"
                                                            value={
                                                                typeof field.value === 'number'
                                                                    ? field.value
                                                                    : null
                                                            }
                                                            onChange={field.onChange}
                                                        />
                                                    )}
                                                </FieldWrapper>
                                            </div>
                                        </>
                                    )}

                                    {/* Physical Docs */}
                                    <div>
                                        <SelectField
                                            control={form.control}
                                            name="physicalDocsRequired"
                                            label="Physical Docs Submission Required"
                                            options={yesNoOptions}
                                            placeholder="Select option"
                                        />
                                    </div>
                                    {physicalDocsRequired === 'YES' && (
                                        <>
                                            <div>
                                                <SelectField
                                                    control={form.control}
                                                    name="physicalDocType"
                                                    label="Physical Document Type"
                                                    options={physicalDocTypeOptions}
                                                    placeholder="Select type"
                                                />
                                            </div>
                                            <div>
                                                <FieldWrapper
                                                    control={form.control}
                                                    name="physicalDocsDeadline"
                                                    label="Physical Docs Submission Deadline"
                                                >
                                                    {(field) => (
                                                        <DateTimeInput
                                                            value={
                                                                typeof field.value === 'string'
                                                                    ? field.value
                                                                    : null
                                                            }
                                                            onChange={field.onChange}
                                                            className="bg-background"
                                                        />
                                                    )}
                                                </FieldWrapper>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Client Details */}
                            <div className="space-y-4 mt-6">
                                <h4 className="font-medium text-sm text-primary border-b pb-2">
                                    Client Details
                                </h4>
                                <div className="flex justify-between items-center">
                                    <div className="flex align-center">
                                        <div className="p-3">
                                            <SelectField
                                                control={form.control}
                                                name="clientDetailsPresent"
                                                label="Client Details Present"
                                                options={yesNoOptions}
                                                placeholder="Select option"
                                            />
                                        </div>
                                        <div className="p-3">
                                            <SelectField
                                                control={form.control}
                                                name="customerInContact"
                                                label="Customer In Contact"
                                                options={yesNoOptions}
                                                placeholder="Select option"
                                            />
                                        </div>
                                    </div>
                                    <div className="p-3 pt-5">
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
                                </div>

                                {clientFields.map((field, index) => (
                                    <div
                                        key={field.id}
                                        className="p-4 border rounded-lg space-y-4 bg-muted/20"
                                    >
                                        <div className="flex items-center justify-between">
                                            <h5 className="font-medium text-sm">
                                                Client {index + 1}
                                            </h5>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeClient(index)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <FieldWrapper
                                                control={form.control}
                                                name={`clients.${index}.clientName`}
                                                label="Name"
                                            >
                                                {(f) => <Input placeholder="Enter name" {...f} />}
                                            </FieldWrapper>
                                            <FieldWrapper
                                                control={form.control}
                                                name={`clients.${index}.clientEmail`}
                                                label="Email"
                                            >
                                                {(f) => (
                                                    <Input
                                                        type="email"
                                                        placeholder="Enter email"
                                                        {...f}
                                                    />
                                                )}
                                            </FieldWrapper>
                                            <FieldWrapper
                                                control={form.control}
                                                name={`clients.${index}.clientMobile`}
                                                label="Mobile No."
                                            >
                                                {(f) => (
                                                    <Input
                                                        placeholder="Enter phone number(s), separated by comma"
                                                        {...f}
                                                    />
                                                )}
                                            </FieldWrapper>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Courier Delivery Address */}
                            <div className="space-y-4 mt-6">
                                <h3 className="text-lg font-semibold border-b pb-2">
                                    Courier Delivery Address
                                </h3>

                                <div className="w-1/5">
                                    <SelectField
                                        control={form.control}
                                        name="courierDetailsPresent"
                                        label="Courier Details Present"
                                        options={yesNoOptions}
                                        placeholder="Select option"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FieldWrapper control={form.control} name="courierName" label="Name">
                                            {(field) => <Input placeholder="Contact person name" {...field} value={field.value || ''} />}
                                        </FieldWrapper>
                                        <FieldWrapper control={form.control} name="courierPhone" label="Phone No">
                                            {(field) => <Input placeholder="Contact phone number" {...field} value={field.value || ''} />}
                                        </FieldWrapper>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FieldWrapper control={form.control} name="courierAddressLine1" label="Address Line 1">
                                            {(field) => <Input placeholder="Building, Street, etc." {...field} value={field.value || ''} />}
                                        </FieldWrapper>
                                        <FieldWrapper control={form.control} name="courierAddressLine2" label="Address Line 2">
                                            {(field) => <Input placeholder="Area, Landmark, etc." {...field} value={field.value || ''} />}
                                        </FieldWrapper>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:col-span-2">
                                        <FieldWrapper control={form.control} name="courierCity" label="City">
                                            {(field) => <Input placeholder="City" {...field} value={field.value || ''} />}
                                        </FieldWrapper>
                                        <FieldWrapper control={form.control} name="courierState" label="State">
                                            {(field) => <Input placeholder="State" {...field} value={field.value || ''} />}
                                        </FieldWrapper>
                                        <FieldWrapper control={form.control} name="courierPincode" label="Pin Code">
                                            {(field) => <Input placeholder="Pin Code" {...field} value={field.value || ''} />}
                                        </FieldWrapper>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-6 mt-2">
                                    <FieldWrapper
                                        control={form.control}
                                        name="teRemark"
                                        label="TE Final Remark"
                                    >
                                        {(field) => (
                                            <textarea
                                                className="border-input placeholder:text-muted-foreground h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                                placeholder="Enter final remarks..."
                                                maxLength={1000}
                                                {...field}
                                            />
                                        )}
                                    </FieldWrapper>
                                </div>
                            </div>
                        </div>

                        {/* Submit Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-6 border-t mt-6">
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
                                variant="outline"
                                onClick={() => form.reset(initialFormValues)}
                                disabled={isSubmitting}
                            >
                                Reset
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <span className="animate-spin mr-2">⏳</span>
                                        {mode === 'create' ? 'Creating...' : 'Updating...'}
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        {mode === 'create' ? 'Create' : 'Update'} Enquiry Information
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
