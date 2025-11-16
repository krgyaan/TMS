import { useEffect, useMemo } from 'react';
import { z } from 'zod';
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
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { ArrowLeft, Plus, Trash2, Save, AlertCircle } from 'lucide-react';
import { paths } from '@/app/routes/paths';
import { useCreateInfoSheet, useUpdateInfoSheet } from '@/hooks/api/useInfoSheets';
import type { SaveTenderInfoSheetDto, TenderInfoSheet, TenderInfoWithNames } from '@/types/api.types';
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
} from '@/constants/tenderInfoOptions';
import { TenderView } from '../../tenders/components/TenderView';

// Zod Schema
const TenderInformationFormSchema = z.object({
    teRecommendation: z.enum(['YES', 'NO']),
    teRejectionReason: z.coerce.number().int().min(1).nullable().optional(),
    teRejectionRemarks: z.string().max(1000).optional(),

    processingFeeAmount: z.coerce.number().nonnegative().optional(),
    processingFeeModes: z.array(z.string()).optional(),

    tenderFeeAmount: z.coerce.number().nonnegative().optional(),
    tenderFeeModes: z.array(z.string()).optional(),

    emdRequired: z.enum(['YES', 'NO', 'EXEMPT']).optional(),
    emdModes: z.array(z.string()).optional(),

    reverseAuctionApplicable: z.enum(['YES', 'NO']).optional(),
    paymentTermsSupply: z.coerce.number().min(0).max(100).optional(),
    paymentTermsInstallation: z.coerce.number().min(0).max(100).optional(),

    bidValidityDays: z.coerce.number().int().min(0).max(366).optional(),
    commercialEvaluation: z.enum([
        'ITEM_WISE_GST_INCLUSIVE',
        'ITEM_WISE_PRE_GST',
        'OVERALL_GST_INCLUSIVE',
        'OVERALL_PRE_GST'
    ]).optional(),
    mafRequired: z.enum(['YES_GENERAL', 'YES_PROJECT_SPECIFIC', 'NO']).optional(),

    deliveryTimeSupply: z.coerce.number().int().positive().optional(),
    deliveryTimeInstallationInclusive: z.boolean().default(false),
    deliveryTimeInstallation: z.coerce.number().int().positive().optional(),

    pbgForm: z.enum(['DD_DEDUCTION', 'FDR', 'PBG', 'SB', 'NA']).optional(),
    pbgPercentage: z.coerce.number().min(0).max(100).optional(),
    pbgDurationMonths: z.coerce.number().int().min(0).max(120).optional(),

    sdForm: z.enum(['DD_DEDUCTION', 'FDR', 'PBG', 'SB', 'NA']).optional(),
    securityDepositPercentage: z.coerce.number().min(0).max(100).optional(),
    sdDurationMonths: z.coerce.number().int().positive().optional(),

    ldPercentagePerWeek: z.coerce.number().min(0).max(5).optional(),
    maxLdPercentage: z.coerce.number().int().min(0).max(20).optional(),

    physicalDocsRequired: z.enum(['YES', 'NO']).optional(),
    physicalDocsDeadline: z.string().optional(),

    techEligibilityAgeYears: z.coerce.number().int().nonnegative().optional(),
    orderValue1: z.coerce.number().nonnegative().optional(),
    orderValue2: z.coerce.number().nonnegative().optional(),
    orderValue3: z.coerce.number().nonnegative().optional(),

    technicalWorkOrders: z.array(z.string()).optional(),
    commercialDocuments: z.array(z.string()).optional(),

    avgAnnualTurnoverCriteria: z.enum(['NOT_APPLICABLE', 'POSITIVE', 'AMOUNT']).optional(),
    avgAnnualTurnoverValue: z.coerce.number().nonnegative().optional(),

    workingCapitalCriteria: z.enum(['NOT_APPLICABLE', 'POSITIVE', 'AMOUNT']).optional(),
    workingCapitalValue: z.coerce.number().nonnegative().optional(),

    solvencyCertificateCriteria: z.enum(['NOT_APPLICABLE', 'POSITIVE', 'AMOUNT']).optional(),
    solvencyCertificateValue: z.coerce.number().nonnegative().optional(),

    netWorthCriteria: z.enum(['NOT_APPLICABLE', 'POSITIVE', 'AMOUNT']).optional(),
    netWorthValue: z.coerce.number().nonnegative().optional(),

    clientOrganization: z.string().max(255).optional(),

    clients: z.array(z.object({
        clientName: z.string().min(1, 'Client name is required'),
        clientDesignation: z.string().optional(),
        clientMobile: z.string().max(50).optional(),
        clientEmail: z.string().email('Invalid email').optional(),
    })).min(1, 'At least one client is required'),

    courierAddress: z.string().max(1000).optional(),
    teRemark: z.string().max(1000).optional(),
});

const mapInitialDataToForm = (data: TenderInfoSheet | null): FormValues => {
    if (!data) {
        return buildDefaultValues();
    }

    return {
        teRecommendation: data.teRecommendation ?? 'YES',
        teRejectionReason: data.teRejectionReason ?? null,
        teRejectionRemarks: data.teRejectionRemarks ?? '',

        processingFeeAmount: data.processingFeeAmount ?? 0,
        processingFeeModes: data.processingFeeModes ?? [],

        tenderFeeAmount: data.tenderFeeAmount ?? 0,
        tenderFeeModes: data.tenderFeeModes ?? [],

        emdRequired: data.emdRequired ?? undefined,
        emdModes: data.emdModes ?? [],

        reverseAuctionApplicable: data.reverseAuctionApplicable ?? undefined,
        paymentTermsSupply: data.paymentTermsSupply ?? 0,
        paymentTermsInstallation: data.paymentTermsInstallation ?? 0,

        bidValidityDays: data.bidValidityDays ?? 0,
        commercialEvaluation: data.commercialEvaluation ?? undefined,
        mafRequired: data.mafRequired ?? undefined,

        deliveryTimeSupply: data.deliveryTimeSupply ?? 0,
        deliveryTimeInstallationInclusive: data.deliveryTimeInstallationInclusive ?? false,
        deliveryTimeInstallation: data.deliveryTimeInstallation ?? 0,

        pbgForm: data.pbgForm ?? undefined,
        pbgPercentage: data.pbgPercentage ?? 0,
        pbgDurationMonths: data.pbgDurationMonths ?? 0,

        sdForm: data.sdForm ?? undefined,
        securityDepositPercentage: data.securityDepositPercentage ?? 0,
        sdDurationMonths: data.sdDurationMonths ?? 0,

        ldPercentagePerWeek: data.ldPercentagePerWeek ?? 0,
        maxLdPercentage: data.maxLdPercentage ?? 0,

        physicalDocsRequired: data.physicalDocsRequired ?? undefined,
        physicalDocsDeadline: data.physicalDocsDeadline ?? '',

        techEligibilityAgeYears: data.techEligibilityAgeYears ?? 0,
        orderValue1: data.orderValue1 ?? 0,
        orderValue2: data.orderValue2 ?? 0,
        orderValue3: data.orderValue3 ?? 0,

        technicalWorkOrders: data.technicalWorkOrders ?? [],
        commercialDocuments: data.commercialDocuments ?? [],

        avgAnnualTurnoverCriteria: data.avgAnnualTurnoverCriteria ?? undefined,
        avgAnnualTurnoverValue: data.avgAnnualTurnoverValue ?? 0,

        workingCapitalCriteria: data.workingCapitalCriteria ?? undefined,
        workingCapitalValue: data.workingCapitalValue ?? 0,

        solvencyCertificateCriteria: data.solvencyCertificateCriteria ?? undefined,
        solvencyCertificateValue: data.solvencyCertificateValue ?? 0,

        netWorthCriteria: data.netWorthCriteria ?? undefined,
        netWorthValue: data.netWorthValue ?? 0,

        clientOrganization: data.clientOrganization ?? '',
        courierAddress: data.courierAddress ?? '',

        clients: data.clients && data.clients.length > 0
            ? data.clients.map(client => ({
                clientName: client.clientName ?? '',
                clientDesignation: client.clientDesignation ?? '',
                clientMobile: client.clientMobile ?? '',
                clientEmail: client.clientEmail ?? '',
            }))
            : [{ clientName: '', clientDesignation: '', clientMobile: '', clientEmail: '' }],

        teRemark: data.teRemark ?? '',
    };
};

// Helper function to map form values to API payload
const mapFormToPayload = (values: FormValues): SaveTenderInfoSheetDto => {
    return {
        teRecommendation: values.teRecommendation,
        teRejectionReason: values.teRejectionReason ?? null,
        teRejectionRemarks: values.teRejectionRemarks || null,

        processingFeeAmount: values.processingFeeAmount ?? null,
        processingFeeModes: values.processingFeeModes && values.processingFeeModes.length > 0
            ? values.processingFeeModes
            : null,

        tenderFeeAmount: values.tenderFeeAmount ?? null,
        tenderFeeModes: values.tenderFeeModes && values.tenderFeeModes.length > 0
            ? values.tenderFeeModes
            : null,

        emdRequired: values.emdRequired ?? null,
        emdModes: values.emdModes && values.emdModes.length > 0
            ? values.emdModes
            : null,

        reverseAuctionApplicable: values.reverseAuctionApplicable ?? null,
        paymentTermsSupply: values.paymentTermsSupply ?? null,
        paymentTermsInstallation: values.paymentTermsInstallation ?? null,

        bidValidityDays: values.bidValidityDays ?? null,
        commercialEvaluation: values.commercialEvaluation ?? null,
        mafRequired: values.mafRequired ?? null,

        deliveryTimeSupply: values.deliveryTimeSupply ?? null,
        deliveryTimeInstallationInclusive: values.deliveryTimeInstallationInclusive ?? false,
        deliveryTimeInstallation: values.deliveryTimeInstallation ?? null,

        pbgForm: values.pbgForm ?? null,
        pbgPercentage: values.pbgPercentage ?? null,
        pbgDurationMonths: values.pbgDurationMonths ?? null,

        sdForm: values.sdForm ?? null,
        securityDepositPercentage: values.securityDepositPercentage ?? null,
        sdDurationMonths: values.sdDurationMonths ?? null,

        ldPercentagePerWeek: values.ldPercentagePerWeek ?? null,
        maxLdPercentage: values.maxLdPercentage ?? null,

        physicalDocsRequired: values.physicalDocsRequired ?? null,
        physicalDocsDeadline: values.physicalDocsDeadline || null,

        techEligibilityAgeYears: values.techEligibilityAgeYears ?? null,
        orderValue1: values.orderValue1 ?? null,
        orderValue2: values.orderValue2 ?? null,
        orderValue3: values.orderValue3 ?? null,

        technicalWorkOrders: values.technicalWorkOrders && values.technicalWorkOrders.length > 0
            ? values.technicalWorkOrders
            : null,
        commercialDocuments: values.commercialDocuments && values.commercialDocuments.length > 0
            ? values.commercialDocuments
            : null,

        avgAnnualTurnoverCriteria: values.avgAnnualTurnoverCriteria ?? null,
        avgAnnualTurnoverValue: values.avgAnnualTurnoverValue ?? null,

        workingCapitalCriteria: values.workingCapitalCriteria ?? null,
        workingCapitalValue: values.workingCapitalValue ?? null,

        solvencyCertificateCriteria: values.solvencyCertificateCriteria ?? null,
        solvencyCertificateValue: values.solvencyCertificateValue ?? null,

        netWorthCriteria: values.netWorthCriteria ?? null,
        netWorthValue: values.netWorthValue ?? null,

        clientOrganization: values.clientOrganization || null,
        courierAddress: values.courierAddress || null,

        clients: values.clients.map(client => ({
            clientName: client.clientName,
            clientDesignation: client.clientDesignation || null,
            clientMobile: client.clientMobile || null,
            clientEmail: client.clientEmail || null,
        })),

        teRemark: values.teRemark || null,
    };
};

type FormValues = z.infer<typeof TenderInformationFormSchema>;

interface TenderInformationFormProps {
    tenderId: number;
    tender?: TenderInfoWithNames | null;
    initialData?: TenderInfoSheet | null;
    mode: 'create' | 'edit';
    isTenderLoading?: boolean;
    isInfoSheetLoading?: boolean;
}

const buildDefaultValues = (): FormValues => ({
    teRecommendation: 'YES',
    teRejectionReason: null,
    teRejectionRemarks: '',
    processingFeeAmount: 0,
    processingFeeModes: [],
    tenderFeeAmount: 0,
    tenderFeeModes: [],
    emdRequired: undefined,
    emdModes: [],
    reverseAuctionApplicable: undefined,
    paymentTermsSupply: 0,
    paymentTermsInstallation: 0,
    bidValidityDays: 0,
    commercialEvaluation: undefined,
    mafRequired: undefined,
    deliveryTimeSupply: 0,
    deliveryTimeInstallationInclusive: false,
    deliveryTimeInstallation: 0,
    pbgForm: undefined,
    pbgPercentage: 0,
    pbgDurationMonths: 0,
    sdForm: undefined,
    securityDepositPercentage: 0,
    sdDurationMonths: 0,
    ldPercentagePerWeek: 0,
    maxLdPercentage: 0,
    physicalDocsRequired: undefined,
    physicalDocsDeadline: '',
    techEligibilityAgeYears: 0,
    orderValue1: 0,
    orderValue2: 0,
    orderValue3: 0,
    technicalWorkOrders: [],
    commercialDocuments: [],
    avgAnnualTurnoverCriteria: undefined,
    avgAnnualTurnoverValue: 0,
    workingCapitalCriteria: undefined,
    workingCapitalValue: 0,
    solvencyCertificateCriteria: undefined,
    solvencyCertificateValue: 0,
    netWorthCriteria: undefined,
    netWorthValue: 0,
    clientOrganization: '',
    courierAddress: '',
    clients: [{ clientName: '', clientDesignation: '', clientMobile: '', clientEmail: '' }],
    teRemark: '',
});

export function TenderInformationForm({
    tenderId,
    tender,
    initialData,
    mode,
    isTenderLoading,
    isInfoSheetLoading,
}: TenderInformationFormProps) {
    const navigate = useNavigate();

    const initialFormValues = useMemo(() => {
        return mapInitialDataToForm(initialData ?? null);
    }, [initialData]);

    const form = useForm({
        resolver: zodResolver(TenderInformationFormSchema),
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
    const physicalDocsRequired = form.watch('physicalDocsRequired');
    const deliveryTimeInstallationInclusive = form.watch('deliveryTimeInstallationInclusive');
    const avgAnnualTurnoverCriteria = form.watch('avgAnnualTurnoverCriteria');
    const workingCapitalCriteria = form.watch('workingCapitalCriteria');
    const solvencyCertificateCriteria = form.watch('solvencyCertificateCriteria');
    const netWorthCriteria = form.watch('netWorthCriteria');

    const isLoading = isTenderLoading || (mode === 'edit' && isInfoSheetLoading);
    const createInfoSheet = useCreateInfoSheet();
    const updateInfoSheet = useUpdateInfoSheet();
    const isSubmitting = createInfoSheet.isPending || updateInfoSheet.isPending;

    const handleSubmit: SubmitHandler<FormValues> = async (values) => {
        try {
            const payload = mapFormToPayload(values);

            if (mode === 'create') {
                await createInfoSheet.mutateAsync({ tenderId, data: payload });
            } else {
                await updateInfoSheet.mutateAsync({ tenderId, data: payload });
            }

            navigate(paths.tendering.tenderView(tenderId));
        } catch (error) {
            console.error('Form submission error:', error);
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
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)}>
                        <div className="space-y-8 pt-4">
                            {/* TE Recommendation */}
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <SelectField
                                        control={form.control}
                                        name="teRecommendation"
                                        label="TE Recommendation"
                                        options={yesNoOptions.map(option => ({
                                            value: String(option.value),
                                            label: option.label
                                        }))}
                                        placeholder="Select recommendation"
                                    />

                                    {teRecommendation === 'NO' && (
                                        <>
                                            <SelectField
                                                control={form.control}
                                                name="teRejectionReason"
                                                label="TE Reason of Rejection"
                                                options={rejectionReasonOptions.map(option => ({
                                                    value: String(option.value),
                                                    label: option.label
                                                }))}
                                                placeholder="Select reason"
                                            />
                                            <FieldWrapper
                                                control={form.control}
                                                name="teRejectionRemarks"
                                                label="TE Rejection Remarks"
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
                            </div>
                            {/* Processing Fee & Tender Fee */}
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 space-y-2">
                                    <FieldWrapper
                                        control={form.control}
                                        name="processingFeeAmount"
                                        label="Processing Fee - Amount"
                                    >
                                        {(field) => (
                                            <NumberInput
                                                step={0.01}
                                                placeholder="0.00"
                                                value={typeof field.value === "number" ? field.value : field.value === "" ? null : Number(field.value) as number | null}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    </FieldWrapper>

                                    <MultiSelectField
                                        control={form.control}
                                        name="processingFeeModes"
                                        label="Processing Fee (Mode of Payment)"
                                        options={paymentModeOptions.map(option => ({
                                            value: String(option.value),
                                            label: option.label
                                        }))}
                                        placeholder="Select payment modes"
                                    />

                                    <FieldWrapper
                                        control={form.control}
                                        name="tenderFeeAmount"
                                        label="Tender Fee - Amount"
                                    >
                                        {(field) => (
                                            <NumberInput
                                                step={0.01}
                                                placeholder="0.00"
                                                value={typeof field.value === "number" ? field.value : field.value === "" ? null : Number(field.value) as number | null}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    </FieldWrapper>

                                    <MultiSelectField
                                        control={form.control}
                                        name="tenderFeeModes"
                                        label="Tender Fee (Mode of Payment)"
                                        options={paymentModeOptions.map(option => ({
                                            value: String(option.value),
                                            label: option.label
                                        }))}
                                        placeholder="Select payment modes"
                                    />
                                    {/* EMD */}
                                    <SelectField
                                        control={form.control}
                                        name="emdRequired"
                                        label="EMD Required"
                                        options={emdRequiredOptions}
                                        placeholder="Select option"
                                    />

                                    <MultiSelectField
                                        control={form.control}
                                        name="emdModes"
                                        label="EMD (Mode of Payment)"
                                        options={paymentModeOptions.map(option => ({
                                            value: String(option.value),
                                            label: option.label
                                        }))}
                                        placeholder="Select payment modes"
                                    />
                                    {/* Payment Terms */}
                                    <SelectField
                                        control={form.control}
                                        name="reverseAuctionApplicable"
                                        label="Reverse Auction Applicable"
                                        options={yesNoOptions}
                                        placeholder="Select option"
                                    />

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
                                    {/* Bid & Evaluation */}
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
                                        name="mafRequired"
                                        label="MAF Required"
                                        options={mafRequiredOptions.map(option => ({
                                            value: String(option.value),
                                            label: option.label
                                        }))}
                                        placeholder="Select option"
                                    />
                                    {/* Delivery Time */}
                                    <FieldWrapper
                                        control={form.control}
                                        name="deliveryTimeSupply"
                                        label="Delivery Time (Supply/Total) - Days"
                                    >
                                        {(field) => (
                                            <NumberInput
                                                step={1}
                                                placeholder="Enter number of days"
                                                value={typeof field.value === "number" ? field.value : field.value === "" ? null : Number(field.value)}
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
                                                    value={typeof field.value === "number" ? field.value : field.value === "" ? null : Number(field.value)}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        </FieldWrapper>
                                    )}
                                    {/* PBG & SD */}
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
                                        label="PBG Percentage (%)"
                                    >
                                        {(field) => (
                                            <NumberInput
                                                step={0.01}
                                                placeholder="0.00"
                                                value={typeof field.value === "number" ? field.value : field.value === "" ? null : Number(field.value) as number | null}
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
                                        label="Security Deposit Percentage (%)"
                                    >
                                        {(field) => (
                                            <NumberInput
                                                step={0.01}
                                                placeholder="0.00"
                                                value={typeof field.value === "number" ? field.value : field.value === "" ? null : Number(field.value)}
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
                                                value={typeof field.value === "number" ? field.value : field.value === "" ? null : Number(field.value)}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    </FieldWrapper>
                                    {/* LD & Physical Docs */}
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

                                    <SelectField
                                        control={form.control}
                                        name="physicalDocsRequired"
                                        label="Physical Documents Submission Required"
                                        options={yesNoOptions}
                                        placeholder="Select option"
                                    />

                                    {physicalDocsRequired === 'YES' && (
                                        <FieldWrapper
                                            control={form.control}
                                            name="physicalDocsDeadline"
                                            label="Physical Documents Submission Deadline"
                                        >
                                            {(field) => (
                                                <DateTimeInput
                                                    value={typeof field.value === "string" ? field.value : field.value === "" ? null : field.value}
                                                    onChange={field.onChange}
                                                    className="bg-background"
                                                />
                                            )}
                                        </FieldWrapper>
                                    )}
                                    {/* Technical Eligibility */}
                                    <FieldWrapper
                                        control={form.control}
                                        name="techEligibilityAgeYears"
                                        label="Technical Eligibility Criterion Age (Years)"
                                    >
                                        {(field) => (
                                            <NumberInput
                                                step={1}
                                                placeholder="Enter number of years"
                                                value={typeof field.value === "number" ? field.value : field.value === "" ? null : Number(field.value)}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    </FieldWrapper>
                                </div>

                                <div className="space-y-2">
                                    {/* Average Annual Turnover */}
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 space-y-2">
                                            <div>
                                                <label className="text-sm font-medium">Technical Eligibility Criterion Value</label>
                                                <FieldWrapper control={form.control} name="orderValue1" label="1 Order Of">
                                                    {(field) => (
                                                        <NumberInput
                                                            step={0.01}
                                                            placeholder="0.00"
                                                            value={typeof field.value === "number" ? field.value : field.value === "" ? null : Number(field.value)}
                                                            onChange={field.onChange}
                                                        />
                                                    )}
                                                </FieldWrapper>
                                            </div>
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
                                                            value={typeof field.value === "number" ? field.value : field.value === "" ? null : Number(field.value)}
                                                            onChange={field.onChange}
                                                        />
                                                    )}
                                                </FieldWrapper>
                                            )}
                                        </div>
                                    </div>

                                    {/* Working Capital */}
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 space-y-2">
                                            <FieldWrapper control={form.control} name="orderValue2" label="2 Order Of">
                                                {(field) => (
                                                    <NumberInput
                                                        step={0.01}
                                                        placeholder="0.00"
                                                        value={typeof field.value === "number" ? field.value : field.value === "" ? null : Number(field.value)}
                                                        onChange={field.onChange}
                                                    />
                                                )}
                                            </FieldWrapper>
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
                                                            value={typeof field.value === "number" ? field.value : field.value === "" ? null : Number(field.value)}
                                                            onChange={field.onChange}
                                                        />
                                                    )}
                                                </FieldWrapper>
                                            )}
                                        </div>
                                    </div>

                                    {/* Solvency Certificate */}
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 space-y-2">
                                            <FieldWrapper control={form.control} name="orderValue3" label="3 Order Of">
                                                {(field) => (
                                                    <NumberInput
                                                        step={0.01}
                                                        placeholder="0.00"
                                                        value={typeof field.value === "number" ? field.value : field.value === "" ? null : Number(field.value)}
                                                        onChange={field.onChange}
                                                    />
                                                )}
                                            </FieldWrapper>
                                            <SelectField
                                                control={form.control}
                                                name="solvencyCertificateCriteria"
                                                label="Solvency Certificate"
                                                options={financialCriteriaOptions}
                                                placeholder="Select criteria"
                                            />

                                            {solvencyCertificateCriteria === 'AMOUNT' && (
                                                <FieldWrapper
                                                    control={form.control}
                                                    name="solvencyCertificateValue"
                                                    label="Amount"
                                                >
                                                    {(field) => (
                                                        <NumberInput
                                                            step={0.01}
                                                            placeholder="0.00"
                                                            value={typeof field.value === "number" ? field.value : field.value === "" ? null : Number(field.value)}
                                                            onChange={field.onChange}
                                                        />
                                                    )}
                                                </FieldWrapper>
                                            )}
                                        </div>
                                    </div>

                                    {/* Net Worth */}
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 space-y-2">
                                            <div></div>
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
                                                            value={typeof field.value === "number" ? field.value : field.value === "" ? null : Number(field.value)}
                                                            onChange={field.onChange}
                                                        />
                                                    )}
                                                </FieldWrapper>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 space-y-2">
                                        <MultiSelectField
                                            control={form.control}
                                            name="technicalWorkOrders"
                                            label="Work Orders to be submitted to meet technical eligibility criteria"
                                            options={dummyTechnicalDocuments}
                                            placeholder="Select documents"
                                        />
                                        <MultiSelectField
                                            control={form.control}
                                            name="commercialDocuments"
                                            label="Documents to be submitted to meet commercial eligibility criteria"
                                            options={dummyFinancialDocuments}
                                            placeholder="Select documents"
                                        />
                                    </div>
                                </div>
                            </div>
                            {/* Client Organization */}
                            <div className="space-y-4">
                                <FieldWrapper control={form.control} name="clientOrganization" label="Client Organisation">
                                    {(field) => <Input placeholder="Enter client organisation" {...field} />}
                                </FieldWrapper>
                            </div>
                            {/* Client Details */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-sm text-primary border-b pb-2">Add Client Details</h4>
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

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FieldWrapper
                                                control={form.control}
                                                name={`clients.${index}.clientName`}
                                                label="Client Name"
                                            >
                                                {(field) => <Input placeholder="Enter client name" {...field} />}
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
                                                name={`clients.${index}.clientMobile`}
                                                label="Mobile"
                                            >
                                                {(field) => <Input placeholder="Enter mobile number" {...field} />}
                                            </FieldWrapper>

                                            <FieldWrapper
                                                control={form.control}
                                                name={`clients.${index}.clientEmail`}
                                                label="Email"
                                            >
                                                {(field) => <Input type="email" placeholder="Enter email" {...field} />}
                                            </FieldWrapper>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* Courier Address */}
                            <div className="space-y-4">
                                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                                    <FieldWrapper control={form.control} name="courierAddress" label="Courier Address">
                                        {(field) => (
                                            <textarea
                                                className="border-input placeholder:text-muted-foreground h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                                placeholder="Enter courier address..."
                                                maxLength={1000}
                                                {...field}
                                            />
                                        )}
                                    </FieldWrapper>
                                    {/* TE Final Remark */}
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
                                </div>
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
                            <Button type="submit" disabled={isSubmitting}>
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
        </Card >
    );
}
