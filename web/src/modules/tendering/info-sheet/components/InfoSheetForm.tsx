import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { type SubmitHandler, useForm, useFieldArray } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { NumberInput } from '@/components/form/NumberInput';
import { SelectField } from '@/components/form/SelectField';
import { DateTimeInput } from '@/components/form/DateTimeInput';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
    ArrowLeft,
    ArrowRight,
    Check,
    Plus,
    Trash2,
    User,
    FileText,
    DollarSign,
    AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { paths } from '@/app/routes/paths';
import type { SaveTenderInfoSheetDto, TenderInfoSheet, TenderInfoWithNames } from '@/types/api.types';
import { useCreateInfoSheet } from '@/hooks/api/useInfoSheets';

// Zod Schema
const TenderInformationFormSchema = z.object({
    // Step 1: TE Evaluation & Financial Terms
    teRecommendation: z.enum(['YES', 'NO']).optional(),
    teRejectionReason: z.enum([
        '9', '10', '11', '12',
        '13', '14', '15', '29',
        '30', '35', '36'
    ]).optional(),
    teRejectionRemarks: z.string().max(500).optional(),
    teRemark: z.string().max(500).optional(),

    tenderFeeAmount: z.coerce.number().nonnegative().optional(),
    tenderFeeMode: z.enum(['DD', 'POP', 'BT']).optional(),

    emdRequired: z.enum(['YES', 'NO', 'EXEMPT']).optional(),
    emdMode: z.enum(['BT', 'POP', 'DD', 'FDR', 'PBG', 'SB']).optional(),

    reverseAuctionApplicable: z.enum(['YES', 'NO']).optional(),
    paymentTermsSupply: z.enum(['ADVANCE', 'AGAINST_DELIVERY', 'CREDIT']).optional(),
    paymentTermsInstallation: z.enum(['ADVANCE', 'AGAINST_DELIVERY', 'CREDIT']).optional(),

    pbgRequired: z.enum(['YES', 'NO']).optional(),
    pbgPercentage: z.coerce.number().min(0).max(100).optional(),
    pbgDurationMonths: z.coerce.number().int().positive().optional(),

    securityDepositMode: z.enum(['NA', 'DD', 'DEDUCTION', 'FDR', 'PBG', 'SB']).optional(),
    securityDepositPercentage: z.coerce.number().min(0).max(100).optional(),
    sdDurationMonths: z.coerce.number().int().positive().optional(),

    bidValidityDays: z.coerce.number().int().positive().optional(),
    commercialEvaluation: z.enum(['YES', 'NO']).optional(),
    mafRequired: z.enum(['YES', 'NO']).optional(),

    deliveryTimeSupply: z.coerce.number().int().positive().optional(),
    deliveryTimeInstallation: z.coerce.number().int().positive().optional(),

    ldPercentagePerWeek: z.coerce.number().min(0).max(100).optional(),
    maxLdPercentage: z.coerce.number().min(0).max(100).optional(),

    physicalDocsRequired: z.enum(['YES', 'NO']).optional(),
    physicalDocsDeadline: z.string().optional(),

    // Step 2: Technical & Financial Eligibility
    techEligibilityAgeYears: z.coerce.number().int().nonnegative().optional(),
    orderValue1: z.coerce.number().nonnegative().optional(),
    orderValue2: z.coerce.number().nonnegative().optional(),
    orderValue3: z.coerce.number().nonnegative().optional(),
    technicalEligible: z.boolean().default(false),

    avgAnnualTurnoverRequired: z.enum(['YES', 'NO']).optional(),
    avgAnnualTurnoverValue: z.coerce.number().nonnegative().optional(),

    workingCapitalRequired: z.enum(['YES', 'NO']).optional(),
    workingCapitalValue: z.coerce.number().nonnegative().optional(),

    solvencyCertificateRequired: z.enum(['YES', 'NO']).optional(),
    solvencyCertificateValue: z.coerce.number().nonnegative().optional(),

    netWorthRequired: z.enum(['YES', 'NO']).optional(),
    netWorthValue: z.coerce.number().nonnegative().optional(),

    financialEligible: z.boolean().default(false),

    // Step 3: Client Information & Documents
    clients: z.array(z.object({
        clientName: z.string().min(1, 'Client name is required'),
        clientDesignation: z.string().optional(),
        clientMobile: z.string().max(50).optional(),
        clientEmail: z.string().email('Invalid email').optional(),
    })).min(1, 'At least one client is required'),

    technicalDocuments: z.array(z.string()).optional(),
    financialDocuments: z.array(z.string()).optional(),
    pqcDocuments: z.array(z.string()).optional(),

    rejectionRemark: z.string().max(500).optional(),
}).superRefine((values, ctx) => {
    if (!values.teRecommendation) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'TE Recommendation is required',
            path: ['teRecommendation'],
        });
    }

    if (values.physicalDocsRequired === 'YES' && !values.physicalDocsDeadline) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Physical docs deadline is required',
            path: ['physicalDocsDeadline'],
        });
    }
});

type FormValues = z.infer<typeof TenderInformationFormSchema>;

interface TenderInformationFormProps {
    tenderId: number;
    tender?: TenderInfoWithNames | null;
    initialData?: TenderInfoSheet | null;
    mode: 'create' | 'edit';
    isTenderLoading?: boolean;
    isInfoSheetLoading?: boolean;
}

// Options for dropdowns
const yesNoOptions = [
    { value: 'YES', label: 'Yes' },
    { value: 'NO', label: 'No' },
];

const emdRequiredOptions = [
    { value: 'YES', label: 'Yes' },
    { value: 'NO', label: 'No' },
    { value: 'EXEMPT', label: 'Exempt' },
];

const feeModeOptions = [
    { value: 'DD', label: 'DD (Demand Draft)' },
    { value: 'POP', label: 'POP' },
    { value: 'BT', label: 'BT (Bank Transfer)' },
];

const emdModeOptions = [
    { value: 'BT', label: 'BT (Bank Transfer)' },
    { value: 'POP', label: 'POP' },
    { value: 'DD', label: 'DD (Demand Draft)' },
    { value: 'FDR', label: 'FDR (Fixed Deposit Receipt)' },
    { value: 'PBG', label: 'PBG (Performance Bank Guarantee)' },
    { value: 'SB', label: 'SB (Surety Bond)' },
];

const paymentTermsOptions = [
    { value: 'ADVANCE', label: 'Advance' },
    { value: 'AGAINST_DELIVERY', label: 'Against Delivery' },
    { value: 'CREDIT', label: 'Credit' },
];

const sdModeOptions = [
    { value: 'NA', label: 'NA (Not Applicable)' },
    { value: 'DD', label: 'DD (Demand Draft)' },
    { value: 'DEDUCTION', label: 'Deduction' },
    { value: 'FDR', label: 'FDR' },
    { value: 'PBG', label: 'PBG' },
    { value: 'SB', label: 'SB' },
];

const rejectionReasonOptions = [
    { value: '9', label: 'Status 9' },
    { value: '10', label: 'Status 10' },
    { value: '11', label: 'Status 11' },
    { value: '12', label: 'Status 12' },
    { value: '13', label: 'Status 13' },
    { value: '14', label: 'Status 14' },
    { value: '15', label: 'Status 15' },
    { value: '29', label: 'Status 29' },
    { value: '30', label: 'Status 30' },
    { value: '35', label: 'Status 35' },
    { value: '36', label: 'Status 36' },
];

type FormValues = z.infer<typeof TenderInformationFormSchema>;

const buildDefaultValues = (): FormValues => ({
    teRecommendation: undefined,
    teRejectionReason: undefined,
    teRejectionRemarks: '',
    teRemark: '',
    tenderFeeAmount: 0,
    tenderFeeMode: undefined,
    emdRequired: undefined,
    emdMode: undefined,
    reverseAuctionApplicable: undefined,
    paymentTermsSupply: undefined,
    paymentTermsInstallation: undefined,
    pbgRequired: undefined,
    pbgPercentage: 0,
    pbgDurationMonths: 0,
    securityDepositMode: undefined,
    securityDepositPercentage: 0,
    sdDurationMonths: 0,
    bidValidityDays: 0,
    commercialEvaluation: undefined,
    mafRequired: undefined,
    deliveryTimeSupply: 0,
    deliveryTimeInstallation: 0,
    ldPercentagePerWeek: 0,
    maxLdPercentage: 0,
    physicalDocsRequired: undefined,
    physicalDocsDeadline: '',
    techEligibilityAgeYears: 0,
    orderValue1: 0,
    orderValue2: 0,
    orderValue3: 0,
    technicalEligible: false,
    avgAnnualTurnoverRequired: undefined,
    avgAnnualTurnoverValue: 0,
    workingCapitalRequired: undefined,
    workingCapitalValue: 0,
    solvencyCertificateRequired: undefined,
    solvencyCertificateValue: 0,
    netWorthRequired: undefined,
    netWorthValue: 0,
    financialEligible: false,
    clients: [{ clientName: '', clientDesignation: '', clientMobile: '', clientEmail: '' }],
    technicalDocuments: [],
    financialDocuments: [],
    pqcDocuments: [],
    rejectionRemark: '',
});

const mapInfoSheetToForm = (info?: TenderInfoSheet | null): FormValues => {
    if (!info) {
        return buildDefaultValues();
    }

    return {
        teRecommendation: info.teRecommendation ?? undefined,
        teRejectionReason: info.teRejectionReason ? String(info.teRejectionReason) : undefined,
        teRejectionRemarks: info.teRejectionRemarks ?? '',
        teRemark: info.teRemark ?? '',
        tenderFeeAmount: info.tenderFeeAmount ?? 0,
        tenderFeeMode: info.tenderFeeMode ?? undefined,
        emdRequired: info.emdRequired ?? undefined,
        emdMode: info.emdMode ?? undefined,
        reverseAuctionApplicable: info.reverseAuctionApplicable ?? undefined,
        paymentTermsSupply: info.paymentTermsSupply ?? undefined,
        paymentTermsInstallation: info.paymentTermsInstallation ?? undefined,
        pbgRequired: info.pbgRequired ?? undefined,
        pbgPercentage: info.pbgPercentage ?? 0,
        pbgDurationMonths: info.pbgDurationMonths ?? 0,
        securityDepositMode: info.securityDepositMode ?? undefined,
        securityDepositPercentage: info.securityDepositPercentage ?? 0,
        sdDurationMonths: info.sdDurationMonths ?? 0,
        bidValidityDays: info.bidValidityDays ?? 0,
        commercialEvaluation: info.commercialEvaluation ?? undefined,
        mafRequired: info.mafRequired ?? undefined,
        deliveryTimeSupply: info.deliveryTimeSupply ?? 0,
        deliveryTimeInstallation: info.deliveryTimeInstallation ?? 0,
        ldPercentagePerWeek: info.ldPercentagePerWeek ?? 0,
        maxLdPercentage: info.maxLdPercentage ?? 0,
        physicalDocsRequired: info.physicalDocsRequired ?? undefined,
        physicalDocsDeadline: info.physicalDocsDeadline ?? '',
        techEligibilityAgeYears: info.techEligibilityAgeYears ?? 0,
        orderValue1: info.orderValue1 ?? 0,
        orderValue2: info.orderValue2 ?? 0,
        orderValue3: info.orderValue3 ?? 0,
        technicalEligible: info.technicalEligible ?? false,
        avgAnnualTurnoverRequired: info.avgAnnualTurnoverRequired ?? undefined,
        avgAnnualTurnoverValue: info.avgAnnualTurnoverValue ?? 0,
        workingCapitalRequired: info.workingCapitalRequired ?? undefined,
        workingCapitalValue: info.workingCapitalValue ?? 0,
        solvencyCertificateRequired: info.solvencyCertificateRequired ?? undefined,
        solvencyCertificateValue: info.solvencyCertificateValue ?? 0,
        netWorthRequired: info.netWorthRequired ?? undefined,
        netWorthValue: info.netWorthValue ?? 0,
        financialEligible: info.financialEligible ?? false,
        clients: info.clients.length
            ? info.clients.map((client) => ({
                clientName: client.clientName ?? '',
                clientDesignation: client.clientDesignation ?? '',
                clientMobile: client.clientMobile ?? '',
                clientEmail: client.clientEmail ?? '',
            }))
            : [{ clientName: '', clientDesignation: '', clientMobile: '', clientEmail: '' }],
        technicalDocuments: info.technicalDocuments ?? [],
        financialDocuments: info.financialDocuments ?? [],
        pqcDocuments: info.pqcDocuments ?? [],
        rejectionRemark: info.rejectionRemark ?? '',
    };
};

const mapFormToPayload = (values: FormValues): SaveTenderInfoSheetDto => {
    if (!values.teRecommendation) {
        throw new Error('TE Recommendation is required');
    }

    return {
        teRecommendation: values.teRecommendation,
        teRejectionReason: values.teRejectionReason ? Number(values.teRejectionReason) : null,
        teRejectionRemarks: values.teRejectionRemarks?.trim() || null,
        teRemark: values.teRemark?.trim() || null,
        tenderFeeAmount: values.tenderFeeAmount ?? 0,
        tenderFeeMode: values.tenderFeeMode ?? null,
        emdRequired: values.emdRequired ?? null,
        emdMode: values.emdMode ?? null,
        reverseAuctionApplicable: values.reverseAuctionApplicable ?? null,
        paymentTermsSupply: values.paymentTermsSupply ?? null,
        paymentTermsInstallation: values.paymentTermsInstallation ?? null,
        pbgRequired: values.pbgRequired ?? null,
        pbgPercentage: values.pbgPercentage ?? null,
        pbgDurationMonths: values.pbgDurationMonths ?? null,
        securityDepositMode: values.securityDepositMode ?? null,
        securityDepositPercentage: values.securityDepositPercentage ?? null,
        sdDurationMonths: values.sdDurationMonths ?? null,
        bidValidityDays: values.bidValidityDays ?? null,
        commercialEvaluation: values.commercialEvaluation ?? null,
        mafRequired: values.mafRequired ?? null,
        deliveryTimeSupply: values.deliveryTimeSupply ?? null,
        deliveryTimeInstallation: values.deliveryTimeInstallation ?? null,
        ldPercentagePerWeek: values.ldPercentagePerWeek ?? null,
        maxLdPercentage: values.maxLdPercentage ?? null,
        physicalDocsRequired: values.physicalDocsRequired ?? null,
        physicalDocsDeadline: values.physicalDocsDeadline || null,
        techEligibilityAgeYears: values.techEligibilityAgeYears ?? null,
        orderValue1: values.orderValue1 ?? null,
        orderValue2: values.orderValue2 ?? null,
        orderValue3: values.orderValue3 ?? null,
        technicalEligible: values.technicalEligible ?? false,
        avgAnnualTurnoverRequired: values.avgAnnualTurnoverRequired ?? null,
        avgAnnualTurnoverValue: values.avgAnnualTurnoverValue ?? null,
        workingCapitalRequired: values.workingCapitalRequired ?? null,
        workingCapitalValue: values.workingCapitalValue ?? null,
        solvencyCertificateRequired: values.solvencyCertificateRequired ?? null,
        solvencyCertificateValue: values.solvencyCertificateValue ?? null,
        netWorthRequired: values.netWorthRequired ?? null,
        netWorthValue: values.netWorthValue ?? null,
        financialEligible: values.financialEligible ?? false,
        rejectionRemark: values.rejectionRemark?.trim() || null,
        clients: values.clients.map((client) => ({
            clientName: client.clientName.trim(),
            clientDesignation: client.clientDesignation?.trim() || null,
            clientMobile: client.clientMobile?.trim() || null,
            clientEmail: client.clientEmail?.trim() || null,
        })),
        technicalDocuments: values.technicalDocuments ?? [],
        financialDocuments: values.financialDocuments ?? [],
        pqcDocuments: values.pqcDocuments ?? [],
    };
};

export function TenderInformationForm({
    tenderId,
    tender,
    initialData,
    mode,
    isTenderLoading,
    isInfoSheetLoading,
}: TenderInformationFormProps) {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 3;

    const initialFormValues = useMemo(() => mapInfoSheetToForm(initialData), [initialData]);

    const form = useForm<FormValues>({
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
    const emdRequired = form.watch('emdRequired');
    const pbgRequired = form.watch('pbgRequired');
    const physicalDocsRequired = form.watch('physicalDocsRequired');
    const avgAnnualTurnoverRequired = form.watch('avgAnnualTurnoverRequired');
    const workingCapitalRequired = form.watch('workingCapitalRequired');
    const solvencyCertificateRequired = form.watch('solvencyCertificateRequired');
    const netWorthRequired = form.watch('netWorthRequired');

    const createInfoSheet = useCreateInfoSheet();
    const isSubmitting = createInfoSheet.isPending;
    const isLoading = isTenderLoading || (mode === 'edit' && isInfoSheetLoading);

    const handleSubmit: SubmitHandler<FormValues> = async (values) => {
        if (!values.teRecommendation) {
            form.setError('teRecommendation', {
                type: 'manual',
                message: 'TE Recommendation is required',
            });
            return;
        }

        const payload = mapFormToPayload(values);

        try {
            await createInfoSheet.mutateAsync({ tenderId, data: payload });
            navigate(paths.tendering.tenderView(tenderId));
        } catch {
            // handled by react-query onError
        }
    };

    const nextStep = async () => {
        let fieldsToValidate: (keyof FormValues)[] = [];

        if (currentStep === 1) {
            fieldsToValidate = [
                'teRecommendation',
                'teRejectionReason',
                'teRejectionRemarks',
                'teRemark',
                'tenderFeeAmount',
                'tenderFeeMode',
                'emdRequired',
                'emdMode',
                'reverseAuctionApplicable',
                'paymentTermsSupply',
                'paymentTermsInstallation',
                'pbgRequired',
                'pbgPercentage',
                'pbgDurationMonths',
                'securityDepositMode',
                'securityDepositPercentage',
                'sdDurationMonths',
                'bidValidityDays',
                'commercialEvaluation',
                'mafRequired',
                'deliveryTimeSupply',
                'deliveryTimeInstallation',
                'ldPercentagePerWeek',
                'maxLdPercentage',
                'physicalDocsRequired',
                'physicalDocsDeadline',
            ];
        } else if (currentStep === 2) {
            fieldsToValidate = [
                'techEligibilityAgeYears',
                'orderValue1',
                'orderValue2',
                'orderValue3',
                'technicalEligible',
                'avgAnnualTurnoverRequired',
                'avgAnnualTurnoverValue',
                'workingCapitalRequired',
                'workingCapitalValue',
                'solvencyCertificateRequired',
                'solvencyCertificateValue',
                'netWorthRequired',
                'netWorthValue',
                'financialEligible',
            ];
        }

        const isValid = await form.trigger(fieldsToValidate as any);
        if (isValid && currentStep < totalSteps) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const progress = (currentStep / totalSteps) * 100;

    if (isLoading) {
        return (
            <Card className="max-w-6xl mx-auto">
                <CardHeader>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48 mt-2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-6 w-full mb-4" />
                    <Skeleton className="h-[500px] w-full" />
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
                        <AlertDescription>
                            Create a new info sheet to continue.
                        </AlertDescription>
                    </Alert>
                    <div className="mt-6 flex gap-3">
                        <Button variant="outline" onClick={() => navigate(-1)}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
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
        <Card className="max-w-6xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>{mode === 'create' ? 'Create' : 'Edit'} Tender Information</span>
                    <Button variant="outline" onClick={() => navigate(-1)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                </CardTitle>
                <CardDescription>
                    {tender ? (
                        <>
                            <span className="font-medium">{tender.tenderName}</span> • Tender No: {tender.tenderNo}
                        </>
                    ) : (
                        'Linked tender details'
                    )}
                </CardDescription>

                {/* Progress Bar */}
                <div className="mt-6">
                    <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Step {currentStep} of {totalSteps}</span>
                        <span className="text-sm text-muted-foreground">{Math.round(progress)}% Complete</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>

                {/* Step Indicators */}
                <div className="flex items-center justify-between mt-6">
                    <StepIndicator
                        number={1}
                        title="Financial Terms"
                        active={currentStep === 1}
                        completed={currentStep > 1}
                        icon={<DollarSign className="h-5 w-5" />}
                    />
                    <Separator className="flex-1 mx-2" />
                    <StepIndicator
                        number={2}
                        title="Eligibility"
                        active={currentStep === 2}
                        completed={currentStep > 2}
                        icon={<FileText className="h-5 w-5" />}
                    />
                    <Separator className="flex-1 mx-2" />
                    <StepIndicator
                        number={3}
                        title="Client & Documents"
                        active={currentStep === 3}
                        completed={currentStep > 3}
                        icon={<User className="h-5 w-5" />}
                    />
                </div>
            </CardHeader>

            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
                        {/* STEP 1: TE Evaluation & Financial Terms */}
                        {currentStep === 1 && (
                            <div className="space-y-8 animate-in fade-in-50 duration-500">
                                {/* TE Evaluation Section */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold border-b pb-2">TE Evaluation</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <SelectField
                                            control={form.control}
                                            name="teRecommendation"
                                            label="TE Recommendation"
                                            options={yesNoOptions}
                                            placeholder="Select recommendation"
                                            required
                                        />

                                        {teRecommendation === 'NO' && (
                                            <>
                                                <SelectField
                                                    control={form.control}
                                                    name="teRejectionReason"
                                                    label="Rejection Reason"
                                                    options={rejectionReasonOptions}
                                                    placeholder="Select reason"
                                                />
                                                <FieldWrapper
                                                    control={form.control}
                                                    name="teRejectionRemarks"
                                                    label="TE Rejection Remarks"
                                                    className="md:col-span-2"
                                                >
                                                    {(field) => (
                                                        <textarea
                                                            className="border-input placeholder:text-muted-foreground h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                                            placeholder="Enter rejection remarks..."
                                                            maxLength={500}
                                                            {...field}
                                                        />
                                                    )}
                                                </FieldWrapper>
                                            </>
                                        )}

                                        <FieldWrapper
                                            control={form.control}
                                            name="teRemark"
                                            label="TE Final Remark"
                                            className="md:col-span-2"
                                        >
                                            {(field) => (
                                                <textarea
                                                    className="border-input placeholder:text-muted-foreground h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                                    placeholder="Enter final remarks..."
                                                    maxLength={500}
                                                    {...field}
                                                />
                                            )}
                                        </FieldWrapper>
                                    </div>
                                </div>

                                <Separator />

                                {/* Tender Fee & EMD Section */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold border-b pb-2">Tender Fee & EMD</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <FieldWrapper
                                            control={form.control}
                                            name="tenderFeeAmount"
                                            label="Tender Fee Amount"
                                        >
                                            {(field) => (
                                                <NumberInput
                                                    step={0.01}
                                                    placeholder="0.00"
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        </FieldWrapper>

                                        <SelectField
                                            control={form.control}
                                            name="tenderFeeMode"
                                            label="Tender Fee Mode"
                                            options={feeModeOptions}
                                            placeholder="Select mode"
                                        />

                                        <SelectField
                                            control={form.control}
                                            name="emdRequired"
                                            label="EMD Required"
                                            options={emdRequiredOptions}
                                            placeholder="Select option"
                                        />

                                        {emdRequired === 'YES' && (
                                            <SelectField
                                                control={form.control}
                                                name="emdMode"
                                                label="EMD Mode"
                                                options={emdModeOptions}
                                                placeholder="Select mode"
                                            />
                                        )}
                                    </div>
                                </div>

                                <Separator />

                                {/* Payment Terms Section */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold border-b pb-2">Payment & Auction Terms</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                                            label="Payment Terms - Supply"
                                            options={paymentTermsOptions}
                                            placeholder="Select terms"
                                        />

                                        <SelectField
                                            control={form.control}
                                            name="paymentTermsInstallation"
                                            label="Payment Terms - Installation"
                                            options={paymentTermsOptions}
                                            placeholder="Select terms"
                                        />
                                    </div>
                                </div>

                                <Separator />

                                {/* PBG & Security Deposit Section */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold border-b pb-2">Performance Bank Guarantee & Security Deposit</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <SelectField
                                            control={form.control}
                                            name="pbgRequired"
                                            label="PBG Required"
                                            options={yesNoOptions}
                                            placeholder="Select option"
                                        />

                                        {pbgRequired === 'YES' && (
                                            <>
                                                <FieldWrapper
                                                    control={form.control}
                                                    name="pbgPercentage"
                                                    label="PBG Percentage (%)"
                                                >
                                                    {(field) => (
                                                        <NumberInput
                                                            step={0.01}
                                                            placeholder="0.00"
                                                            value={field.value}
                                                            onChange={field.onChange}
                                                        />
                                                    )}
                                                </FieldWrapper>

                                                <FieldWrapper
                                                    control={form.control}
                                                    name="pbgDurationMonths"
                                                    label="PBG Duration (Months)"
                                                >
                                                    {(field) => (
                                                        <NumberInput
                                                            step={1}
                                                            placeholder="0"
                                                            value={field.value}
                                                            onChange={field.onChange}
                                                        />
                                                    )}
                                                </FieldWrapper>
                                            </>
                                        )}

                                        <SelectField
                                            control={form.control}
                                            name="securityDepositMode"
                                            label="Security Deposit Mode"
                                            options={sdModeOptions}
                                            placeholder="Select mode"
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
                                                    value={field.value}
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
                                                    placeholder="0"
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        </FieldWrapper>
                                    </div>
                                </div>

                                <Separator />

                                {/* Bid & Delivery Terms Section */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold border-b pb-2">Bid & Delivery Terms</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <FieldWrapper
                                            control={form.control}
                                            name="bidValidityDays"
                                            label="Bid Validity (Days)"
                                        >
                                            {(field) => (
                                                <NumberInput
                                                    step={1}
                                                    placeholder="0"
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        </FieldWrapper>

                                        <SelectField
                                            control={form.control}
                                            name="commercialEvaluation"
                                            label="Commercial Evaluation Required"
                                            options={yesNoOptions}
                                            placeholder="Select option"
                                        />

                                        <SelectField
                                            control={form.control}
                                            name="mafRequired"
                                            label="MAF Required"
                                            options={yesNoOptions}
                                            placeholder="Select option"
                                        />

                                        <FieldWrapper
                                            control={form.control}
                                            name="deliveryTimeSupply"
                                            label="Delivery Time - Supply (Days)"
                                        >
                                            {(field) => (
                                                <NumberInput
                                                    step={1}
                                                    placeholder="0"
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        </FieldWrapper>

                                        <FieldWrapper
                                            control={form.control}
                                            name="deliveryTimeInstallation"
                                            label="Delivery Time - Installation (Days)"
                                        >
                                            {(field) => (
                                                <NumberInput
                                                    step={1}
                                                    placeholder="0"
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        </FieldWrapper>
                                    </div>
                                </div>

                                <Separator />

                                {/* LD & Physical Docs Section */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold border-b pb-2">Liquidated Damages & Documentation</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <FieldWrapper
                                            control={form.control}
                                            name="ldPercentagePerWeek"
                                            label="LD % Per Week"
                                        >
                                            {(field) => (
                                                <NumberInput
                                                    step={0.01}
                                                    placeholder="0.00"
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        </FieldWrapper>

                                        <FieldWrapper
                                            control={form.control}
                                            name="maxLdPercentage"
                                            label="Maximum LD %"
                                        >
                                            {(field) => (
                                                <NumberInput
                                                    step={0.01}
                                                    placeholder="0.00"
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        </FieldWrapper>

                                        <SelectField
                                            control={form.control}
                                            name="physicalDocsRequired"
                                            label="Physical Documents Required"
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
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        className="bg-background"
                                                    />
                                                )}
                                            </FieldWrapper>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: Technical & Financial Eligibility */}
                        {currentStep === 2 && (
                            <div className="space-y-8 animate-in fade-in-50 duration-500">
                                {/* Technical Eligibility Section */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold border-b pb-2">Technical Eligibility Criteria</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <FieldWrapper
                                            control={form.control}
                                            name="techEligibilityAgeYears"
                                            label="Company Age (Years)"
                                        >
                                            {(field) => (
                                                <NumberInput
                                                    step={1}
                                                    placeholder="0"
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        </FieldWrapper>

                                        <FieldWrapper
                                            control={form.control}
                                            name="orderValue1"
                                            label="Order Value 1"
                                        >
                                            {(field) => (
                                                <NumberInput
                                                    step={0.01}
                                                    placeholder="0.00"
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        </FieldWrapper>

                                        <FieldWrapper
                                            control={form.control}
                                            name="orderValue2"
                                            label="Order Value 2"
                                        >
                                            {(field) => (
                                                <NumberInput
                                                    step={0.01}
                                                    placeholder="0.00"
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        </FieldWrapper>

                                        <FieldWrapper
                                            control={form.control}
                                            name="orderValue3"
                                            label="Order Value 3"
                                        >
                                            {(field) => (
                                                <NumberInput
                                                    step={0.01}
                                                    placeholder="0.00"
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        </FieldWrapper>

                                        <FieldWrapper
                                            control={form.control}
                                            name="technicalEligible"
                                            label="Is Technically Eligible"
                                        >
                                            {(field) => (
                                                <div className="flex items-center space-x-2 h-10">
                                                    <input
                                                        type="checkbox"
                                                        id="technicalEligible"
                                                        checked={field.value}
                                                        onChange={(e) => field.onChange(e.target.checked)}
                                                        className="h-4 w-4 rounded border-gray-300"
                                                    />
                                                    <label htmlFor="technicalEligible" className="text-sm font-medium">
                                                        Mark as technically eligible
                                                    </label>
                                                </div>
                                            )}
                                        </FieldWrapper>
                                    </div>
                                </div>

                                <Separator />

                                {/* Financial Eligibility Section */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold border-b pb-2">Financial Eligibility Criteria</h3>

                                    {/* Avg Annual Turnover */}
                                    <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                                        <h4 className="font-medium text-sm">Average Annual Turnover</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <SelectField
                                                control={form.control}
                                                name="avgAnnualTurnoverRequired"
                                                label="Required"
                                                options={yesNoOptions}
                                                placeholder="Select option"
                                            />

                                            {avgAnnualTurnoverRequired === 'YES' && (
                                                <FieldWrapper
                                                    control={form.control}
                                                    name="avgAnnualTurnoverValue"
                                                    label="Value"
                                                >
                                                    {(field) => (
                                                        <NumberInput
                                                            step={0.01}
                                                            placeholder="0.00"
                                                            value={field.value}
                                                            onChange={field.onChange}
                                                        />
                                                    )}
                                                </FieldWrapper>
                                            )}
                                        </div>
                                    </div>

                                    {/* Working Capital */}
                                    <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                                        <h4 className="font-medium text-sm">Working Capital</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <SelectField
                                                control={form.control}
                                                name="workingCapitalRequired"
                                                label="Required"
                                                options={yesNoOptions}
                                                placeholder="Select option"
                                            />

                                            {workingCapitalRequired === 'YES' && (
                                                <FieldWrapper
                                                    control={form.control}
                                                    name="workingCapitalValue"
                                                    label="Value"
                                                >
                                                    {(field) => (
                                                        <NumberInput
                                                            step={0.01}
                                                            placeholder="0.00"
                                                            value={field.value}
                                                            onChange={field.onChange}
                                                        />
                                                    )}
                                                </FieldWrapper>
                                            )}
                                        </div>
                                    </div>

                                    {/* Solvency Certificate */}
                                    <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                                        <h4 className="font-medium text-sm">Solvency Certificate</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <SelectField
                                                control={form.control}
                                                name="solvencyCertificateRequired"
                                                label="Required"
                                                options={yesNoOptions}
                                                placeholder="Select option"
                                            />

                                            {solvencyCertificateRequired === 'YES' && (
                                                <FieldWrapper
                                                    control={form.control}
                                                    name="solvencyCertificateValue"
                                                    label="Value"
                                                >
                                                    {(field) => (
                                                        <NumberInput
                                                            step={0.01}
                                                            placeholder="0.00"
                                                            value={field.value}
                                                            onChange={field.onChange}
                                                        />
                                                    )}
                                                </FieldWrapper>
                                            )}
                                        </div>
                                    </div>

                                    {/* Net Worth */}
                                    <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                                        <h4 className="font-medium text-sm">Net Worth</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <SelectField
                                                control={form.control}
                                                name="netWorthRequired"
                                                label="Required"
                                                options={yesNoOptions}
                                                placeholder="Select option"
                                            />

                                            {netWorthRequired === 'YES' && (
                                                <FieldWrapper
                                                    control={form.control}
                                                    name="netWorthValue"
                                                    label="Value"
                                                >
                                                    {(field) => (
                                                        <NumberInput
                                                            step={0.01}
                                                            placeholder="0.00"
                                                            value={field.value}
                                                            onChange={field.onChange}
                                                        />
                                                    )}
                                                </FieldWrapper>
                                            )}
                                        </div>
                                    </div>

                                    {/* Financial Eligible Checkbox */}
                                    <FieldWrapper
                                        control={form.control}
                                        name="financialEligible"
                                        label="Is Financially Eligible"
                                    >
                                        {(field) => (
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    id="financialEligible"
                                                    checked={field.value}
                                                    onChange={(e) => field.onChange(e.target.checked)}
                                                    className="h-4 w-4 rounded border-gray-300"
                                                />
                                                <label htmlFor="financialEligible" className="text-sm font-medium">
                                                    Mark as financially eligible
                                                </label>
                                            </div>
                                        )}
                                    </FieldWrapper>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: Client Information & Documents */}
                        {currentStep === 3 && (
                            <div className="space-y-8 animate-in fade-in-50 duration-500">
                                {/* Client Information Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <h3 className="text-lg font-semibold">Client Information</h3>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => appendClient({
                                                clientName: '',
                                                clientDesignation: '',
                                                clientMobile: '',
                                                clientEmail: ''
                                            })}
                                        >
                                            <Plus className="mr-2 h-4 w-4" /> Add Client
                                        </Button>
                                    </div>

                                    {clientFields.map((field, index) => (
                                        <div key={field.id} className="p-4 border rounded-lg space-y-4 bg-muted/30">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-medium text-sm">Client {index + 1}</h4>
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
                                                    {(field) => (
                                                        <Input placeholder="Enter client name" {...field} />
                                                    )}
                                                </FieldWrapper>

                                                <FieldWrapper
                                                    control={form.control}
                                                    name={`clients.${index}.clientDesignation`}
                                                    label="Designation"
                                                >
                                                    {(field) => (
                                                        <Input placeholder="Enter designation" {...field} />
                                                    )}
                                                </FieldWrapper>

                                                <FieldWrapper
                                                    control={form.control}
                                                    name={`clients.${index}.clientMobile`}
                                                    label="Mobile Number"
                                                >
                                                    {(field) => (
                                                        <Input placeholder="Enter mobile number" {...field} />
                                                    )}
                                                </FieldWrapper>

                                                <FieldWrapper
                                                    control={form.control}
                                                    name={`clients.${index}.clientEmail`}
                                                    label="Email"
                                                >
                                                    {(field) => (
                                                        <Input type="email" placeholder="Enter email" {...field} />
                                                    )}
                                                </FieldWrapper>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <Separator />

                                {/* Documents Section */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold border-b pb-2">Required Documents</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <FieldWrapper
                                            control={form.control}
                                            name="technicalDocuments"
                                            label="Technical Documents"
                                        >
                                            {(field) => (
                                                <textarea
                                                    className="border-input placeholder:text-muted-foreground h-32 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                                    placeholder="Enter one document per line"
                                                    value={(field.value ?? []).join('\n')}
                                                    onChange={(event) => {
                                                        const lines = event.target.value
                                                            .split('\n')
                                                            .map((line) => line.trim())
                                                            .filter((line) => line.length);
                                                        field.onChange(lines);
                                                    }}
                                                />
                                            )}
                                        </FieldWrapper>

                                        <FieldWrapper
                                            control={form.control}
                                            name="financialDocuments"
                                            label="Financial Documents"
                                        >
                                            {(field) => (
                                                <textarea
                                                    className="border-input placeholder:text-muted-foreground h-32 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                                    placeholder="Enter one document per line"
                                                    value={(field.value ?? []).join('\n')}
                                                    onChange={(event) => {
                                                        const lines = event.target.value
                                                            .split('\n')
                                                            .map((line) => line.trim())
                                                            .filter((line) => line.length);
                                                        field.onChange(lines);
                                                    }}
                                                />
                                            )}
                                        </FieldWrapper>

                                        <FieldWrapper
                                            control={form.control}
                                            name="pqcDocuments"
                                            label="PQC / Company Documents"
                                        >
                                            {(field) => (
                                                <textarea
                                                    className="border-input placeholder:text-muted-foreground h-32 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                                    placeholder="Enter one document per line"
                                                    value={(field.value ?? []).join('\n')}
                                                    onChange={(event) => {
                                                        const lines = event.target.value
                                                            .split('\n')
                                                            .map((line) => line.trim())
                                                            .filter((line) => line.length);
                                                        field.onChange(lines);
                                                    }}
                                                />
                                            )}
                                        </FieldWrapper>
                                    </div>
                                </div>

                                <Separator />

                                {/* Final Rejection Remark */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold border-b pb-2">Final Remarks</h3>
                                    <FieldWrapper
                                        control={form.control}
                                        name="rejectionRemark"
                                        label="Final Rejection Remark (if applicable)"
                                    >
                                        {(field) => (
                                            <textarea
                                                className="border-input placeholder:text-muted-foreground h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                                placeholder="Enter final rejection remarks if needed..."
                                                maxLength={500}
                                                {...field}
                                            />
                                        )}
                                    </FieldWrapper>
                                </div>
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex items-center justify-between pt-6 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={prevStep}
                                disabled={currentStep === 1 || isSubmitting}
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Previous
                            </Button>

                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => form.reset(initialFormValues)}
                                    disabled={isSubmitting}
                                >
                                    Reset
                                </Button>

                                {currentStep < totalSteps ? (
                                    <Button type="button" onClick={nextStep} disabled={isSubmitting}>
                                        Next
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                ) : (
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting ? (
                                            'Saving...'
                                        ) : (
                                            <>
                                                <Check className="mr-2 h-4 w-4" />
                                                {mode === 'create' ? 'Create' : 'Update'} Tender
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

// Step Indicator Component
interface StepIndicatorProps {
    number: number;
    title: string;
    active: boolean;
    completed: boolean;
    icon: React.ReactNode;
}

function StepIndicator({ number, title, active, completed, icon }: StepIndicatorProps) {
    return (
        <div className="flex flex-col items-center gap-2">
            <div
                className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all',
                    {
                        'border-primary bg-primary text-primary-foreground': active,
                        'border-primary bg-primary/10 text-primary': completed && !active,
                        'border-muted-foreground/30 bg-background text-muted-foreground': !active && !completed,
                    }
                )}
            >
                {completed && !active ? <Check className="h-6 w-6" /> : icon}
            </div>
            <div className="text-center">
                <p className={cn('text-sm font-medium', {
                    'text-primary': active || completed,
                    'text-muted-foreground': !active && !completed,
                })}>
                    {title}
                </p>
                <p className="text-xs text-muted-foreground">Step {number}</p>
            </div>
        </div>
    );
}
