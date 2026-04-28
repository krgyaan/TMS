import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { type Resolver, type SubmitHandler, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { SelectField } from '@/components/form/SelectField';
import { MultiSelectField } from '@/components/form/MultiSelectField';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { paths } from '@/app/routes/paths';
import { useCreateTenderApproval, useUpdateTenderApproval } from '@/hooks/api/useTenderApprovals';
import { useVendorOrganizations } from '@/hooks/api/useVendorOrganizations';
import { useStatuses } from '@/hooks/api/useStatuses';
import { tlDecisionOptions, documentApprovalOptions, infoSheetFieldOptions } from '@/modules/tendering/tender-approval/helpers/tenderApproval.types';
import type { TenderWithRelations } from '@/modules/tendering/tenders/helpers/tenderInfo.types';
import { TenderApprovalFormSchema } from '../helpers/tenderApproval.schema';
import type { TenderApprovalFormValues } from '../helpers/tenderApproval.types';
import { getInitialValues, mapFormToPayload } from '../helpers/tenderApproval.mappers';
import { usePqrOptions, useFinanceDocumentOptions } from '@/hooks/useSelectOptions';
import { TenderFileUploader } from '@/components/tender-file-upload/TenderFileUploader';
import { tenderFilesService } from '@/services/api/tender-files.service';

interface TenderApprovalFormProps {
    tenderId: number;
    relationships: TenderWithRelations | undefined;
    isLoading?: boolean;
}

const FormLoadingSkeleton = () => (
    <Card className="max-w-5xl mx-auto">
        <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
            <Skeleton className="h-[600px] w-full" />
        </CardContent>
    </Card>
);

const InfoSheetMissingAlert = ({ tenderId, onBack }: { tenderId: number, onBack: () => void }) => {
    const navigate = useNavigate();
    return (
        <Card>
            <CardHeader>
                <CardTitle>Info Sheet Required</CardTitle>
                <CardDescription>Tender information sheet must be completed before approval.</CardDescription>
            </CardHeader>
            <CardContent>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Please complete the tender information sheet first.</AlertDescription>
                </Alert>
                <div className="mt-6 flex gap-3">
                    <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                    <Button onClick={() => navigate(paths.tendering.infoSheetCreate(tenderId))}>Fill Info Sheet</Button>
                </div>
            </CardContent>
        </Card>
    );
};

export function TenderApprovalForm({ tenderId, relationships, isLoading: isParentLoading }: TenderApprovalFormProps) {
    const navigate = useNavigate();
    const { data: vendorOrganizations, isLoading: isVendorOrgsLoading } = useVendorOrganizations();
    const { data: statuses, isLoading: isStatusesLoading } = useStatuses();
    const createApproval = useCreateTenderApproval();
    const updateApproval = useUpdateTenderApproval();
    const pqrOptions = usePqrOptions();
    const financeDocumentOptions = useFinanceDocumentOptions();

    const isSubmitting = createApproval.isPending || updateApproval.isPending;
    const isPageLoading = isParentLoading || isVendorOrgsLoading || isStatusesLoading;

    // Safe derived state (after hooks)
    const safeRelationships = relationships;
    const infoSheet = safeRelationships?.infoSheet ?? null;
    const approval = safeRelationships?.approval ?? null;
    const mode = approval ? 'edit' : 'create';

    // Form hooks (now safe - always called)
    const form = useForm<TenderApprovalFormValues>({
        resolver: zodResolver(TenderApprovalFormSchema) as Resolver<TenderApprovalFormValues>,
        defaultValues: getInitialValues(approval),
    });

    useEffect(() => {
        const initialValues = getInitialValues(approval);
        form.reset(initialValues, {
            keepDefaultValues: false,
            keepValues: false
        });

        // Also explicitly set processingFeeMode to ensure it updates
        if (initialValues.processingFeeMode) {
            form.setValue('processingFeeMode', initialValues.processingFeeMode, { shouldDirty: false });
        }
    }, [approval, form]);

    // Add this after line 153 (after form declaration) for debugging
    useEffect(() => {
        const errors = form.formState.errors;
        if (Object.keys(errors).length > 0) {
            console.log('❌ Form validation errors:', errors);
        }
    }, [form.formState.errors]);

    const tlDecision = form.watch('tlDecision');
    const rfqRequired = form.watch('rfqRequired');
    const tenderStatus = form.watch('tenderStatus');
    const techDocs = form.watch('approvePqrSelection');
    const finDocs = form.watch('approveFinanceDocSelection');

    // Clear irrelevant fields when tlDecision changes
    useEffect(() => {
        if (tlDecision === '1') {
            // Clear rejection and incomplete fields
            form.setValue('tenderStatus', undefined);
            form.setValue('oemNotAllowed', undefined);
            form.setValue('remarks', undefined);
            form.setValue('incompleteFields', []);
        } else if (tlDecision === '2') {
            // Clear approval and incomplete fields
            form.setValue('rfqRequired', undefined);
            form.setValue('quotationFiles', []);
            form.setValue('rfqTo', []);
            form.setValue('processingFeeMode', undefined);
            form.setValue('tenderFeeMode', undefined);
            form.setValue('emdMode', undefined);
            form.setValue('approvePqrSelection', undefined);
            form.setValue('approveFinanceDocSelection', undefined);
            form.setValue('alternativeTechnicalDocs', []);
            form.setValue('alternativeFinancialDocs', []);
            form.setValue('incompleteFields', []);
        } else if (tlDecision === '3') {
            // Clear approval and rejection fields
            form.setValue('rfqRequired', undefined);
            form.setValue('quotationFiles', []);
            form.setValue('rfqTo', []);
            form.setValue('processingFeeMode', undefined);
            form.setValue('tenderFeeMode', undefined);
            form.setValue('emdMode', undefined);
            form.setValue('approvePqrSelection', undefined);
            form.setValue('approveFinanceDocSelection', undefined);
            form.setValue('alternativeTechnicalDocs', []);
            form.setValue('alternativeFinancialDocs', []);
            form.setValue('tenderStatus', undefined);
            form.setValue('oemNotAllowed', undefined);
        } else if (tlDecision === '0') {
            // Clear all conditional fields
            form.setValue('rfqRequired', undefined);
            form.setValue('quotationFiles', []);
            form.setValue('rfqTo', []);
            form.setValue('processingFeeMode', undefined);
            form.setValue('tenderFeeMode', undefined);
            form.setValue('emdMode', undefined);
            form.setValue('approvePqrSelection', undefined);
            form.setValue('approveFinanceDocSelection', undefined);
            form.setValue('alternativeTechnicalDocs', []);
            form.setValue('alternativeFinancialDocs', []);
            form.setValue('tenderStatus', undefined);
            form.setValue('oemNotAllowed', undefined);
            form.setValue('remarks', undefined);
            form.setValue('incompleteFields', []);
        }
    }, [tlDecision, form]);

    // Clear fields when rfqRequired changes
    useEffect(() => {
        if (tlDecision === '1') {
            if (rfqRequired === 'yes') {
                // Clear quotation files when switching to RFQ required
                form.setValue('quotationFiles', []);
            } else if (rfqRequired === 'no') {
                // Clear vendor selection when switching to quotation files
                form.setValue('rfqTo', []);
            }
        }
    }, [rfqRequired, tlDecision, form]);

    const vendorOrgOptions = useMemo(() =>
        vendorOrganizations?.map(org => ({ value: String(org.id), label: org.name })) ?? [],
        [vendorOrganizations]
    );

    const tenderStatusOptions = useMemo(() =>
        statuses?.filter(s => s.tenderCategory === 'dnb').map(s => ({ value: String(s.id), label: s.name })) ?? [],
        [statuses]
    );

    const rfqRequiredOptions = useMemo(() => [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' },
    ], []);

    const processingFeeModeOptions = useMemo(() =>
        infoSheet?.processingFeeMode?.map(mode => ({ value: mode, label: mode })) ?? [],
        [infoSheet]
    );

    const tenderFeeModeOptions = useMemo(() =>
        infoSheet?.tenderFeeMode?.map(mode => ({ value: mode, label: mode })) ?? [],
        [infoSheet]
    );

    const emdModeOptions = useMemo(() =>
        infoSheet?.emdMode?.map(mode => ({ value: mode, label: mode })) ?? [],
        [infoSheet]
    );

    const isNotAllowedByOem = useMemo(() => {
        if (!tenderStatus || !statuses) return false;
        const statusName = statuses.find(s => s.id === Number(tenderStatus))?.name.toLowerCase();
        return statusName?.includes('not allowed by oem');
    }, [statuses, tenderStatus]);

    const getStatusName = (id: number | null | undefined) => {
        if (!id || !statuses) return 'N/A';
        return statuses.find(s => s.id === id)?.name || 'N/A';
    };

    const getFieldValueFromSheet = (fieldName: string) => {
        if (!infoSheet) return 'N/A';

        const safeJoin = (val: any) => {
            if (!val) return 'N/A';
            if (Array.isArray(val)) return val.join(', ');
            if (typeof val === 'string') {
                try {
                    const parsed = JSON.parse(val);
                    if (Array.isArray(parsed)) return parsed.join(', ');
                } catch (e) {
                    return val;
                }
                return val;
            }
            return 'N/A';
        };

        switch (fieldName) {
            case 'teRecommendation': return infoSheet.teRecommendation || 'N/A';
            case 'teRejectionReason': return getStatusName(infoSheet.teRejectionReason);
            case 'teRejectionRemarks': return infoSheet.teRejectionRemarks || 'N/A';

            case 'processingFeeRequired': return infoSheet.processingFeeRequired || 'N/A';
            case 'processingFeeModes': return safeJoin(infoSheet.processingFeeMode);
            case 'processingFeeAmount': return infoSheet.processingFeeAmount ? `₹${parseFloat(String(infoSheet.processingFeeAmount)).toLocaleString('en-IN')}` : 'N/A';

            case 'tenderFeeRequired': return infoSheet.tenderFeeRequired || 'N/A';
            case 'tenderFeeModes': return safeJoin(infoSheet.tenderFeeMode);
            case 'tenderFeeAmount': return infoSheet.tenderFeeAmount ? `₹${parseFloat(String(infoSheet.tenderFeeAmount)).toLocaleString('en-IN')}` : 'N/A';

            case 'emdRequired': return infoSheet.emdRequired || 'N/A';
            case 'emdModes': return safeJoin(infoSheet.emdMode);
            case 'emdAmount': return infoSheet.emdAmount ? `₹${parseFloat(String(infoSheet.emdAmount)).toLocaleString('en-IN')}` : 'N/A';

            case 'tenderValueGstInclusive': return infoSheet.tenderValue ? `₹${parseFloat(String(infoSheet.tenderValue)).toLocaleString('en-IN')}` : 'N/A';
            case 'bidValidityDays': return infoSheet.bidValidityDays ? `${infoSheet.bidValidityDays} days` : 'N/A';
            case 'mafRequired': return infoSheet.mafRequired || 'N/A';
            case 'commercialEvaluation': return infoSheet.commercialEvaluation || 'N/A';
            case 'reverseAuctionApplicable': return infoSheet.reverseAuctionApplicable || 'N/A';

            case 'paymentTermsSupply': return infoSheet.paymentTermsSupply ? `${infoSheet.paymentTermsSupply}%` : 'N/A';
            case 'paymentTermsInstallation': return infoSheet.paymentTermsInstallation ? `${infoSheet.paymentTermsInstallation}%` : 'N/A';

            case 'deliveryTimeSupply': return infoSheet.deliveryTimeSupply ? `${infoSheet.deliveryTimeSupply} days` : 'N/A';
            case 'deliveryTimeInstallation': return infoSheet.deliveryTimeInstallationDays ? `${infoSheet.deliveryTimeInstallationDays} days` : 'N/A';
            case 'deliveryTimeInstallationInclusive': return infoSheet.deliveryTimeInstallationInclusive ? 'Yes' : 'No';

            case 'pbgRequired': return infoSheet.pbgRequired || 'N/A';
            case 'pbgForm': return safeJoin(infoSheet.pbgMode);
            case 'pbgPercentage': return infoSheet.pbgPercentage ? `${infoSheet.pbgPercentage}%` : 'N/A';
            case 'pbgDurationMonths': return infoSheet.pbgDurationMonths ? `${infoSheet.pbgDurationMonths} months` : 'N/A';

            case 'sdRequired': return infoSheet.sdRequired || 'N/A';
            case 'sdForm': return safeJoin(infoSheet.sdMode);
            case 'securityDepositPercentage': return infoSheet.sdPercentage ? `${infoSheet.sdPercentage}%` : 'N/A';
            case 'sdDurationMonths': return infoSheet.sdDurationMonths ? `${infoSheet.sdDurationMonths} months` : 'N/A';

            case 'ldRequired': return infoSheet.ldRequired || 'N/A';
            case 'ldPercentagePerWeek': return infoSheet.ldPercentagePerWeek ? `${infoSheet.ldPercentagePerWeek}%` : 'N/A';
            case 'maxLdPercentage': return infoSheet.maxLdPercentage ? `${infoSheet.maxLdPercentage}%` : 'N/A';

            case 'physicalDocsRequired': return infoSheet.physicalDocsRequired || 'N/A';
            case 'physicalDocsDeadline': return infoSheet.physicalDocsDeadline ? new Date(infoSheet.physicalDocsDeadline).toLocaleDateString() : 'N/A';

            case 'techEligibilityAgeYears': return infoSheet.techEligibilityAge ? `${infoSheet.techEligibilityAge} years` : 'N/A';
            case 'workValueType': return infoSheet.workValueType || 'N/A';
            case 'orderValue1': return infoSheet.orderValue1 ? `₹${parseFloat(String(infoSheet.orderValue1)).toLocaleString('en-IN')}` : 'N/A';
            case 'orderValue2': return infoSheet.orderValue2 ? `₹${parseFloat(String(infoSheet.orderValue2)).toLocaleString('en-IN')}` : 'N/A';
            case 'orderValue3': return infoSheet.orderValue3 ? `₹${parseFloat(String(infoSheet.orderValue3)).toLocaleString('en-IN')}` : 'N/A';
            case 'customEligibilityCriteria': return infoSheet.customEligibilityCriteria || 'N/A';

            case 'technicalWorkOrders': return infoSheet.technicalWorkOrders?.map(wo => wo.projectName).join(', ') || 'N/A';
            case 'commercialDocuments': return infoSheet.commercialDocuments?.map(cd => cd.documentName).join(', ') || 'N/A';

            case 'avgAnnualTurnoverCriteria': return infoSheet.avgAnnualTurnoverType || 'N/A';
            case 'avgAnnualTurnoverValue': return infoSheet.avgAnnualTurnoverValue ? `₹${parseFloat(String(infoSheet.avgAnnualTurnoverValue)).toLocaleString('en-IN')}` : 'N/A';
            case 'workingCapitalCriteria': return infoSheet.workingCapitalType || 'N/A';
            case 'workingCapitalValue': return infoSheet.workingCapitalValue ? `₹${parseFloat(String(infoSheet.workingCapitalValue)).toLocaleString('en-IN')}` : 'N/A';
            case 'solvencyCertificateCriteria': return infoSheet.solvencyCertificateType || 'N/A';
            case 'solvencyCertificateValue': return infoSheet.solvencyCertificateValue ? `₹${parseFloat(String(infoSheet.solvencyCertificateValue)).toLocaleString('en-IN')}` : 'N/A';
            case 'netWorthCriteria': return infoSheet.netWorthType || 'N/A';
            case 'netWorthValue': return infoSheet.netWorthValue ? `₹${parseFloat(String(infoSheet.netWorthValue)).toLocaleString('en-IN')}` : 'N/A';

            case 'clientOrganization': return safeRelationships?.organizationName || 'N/A';
            case 'clients': return infoSheet.clients?.map(c => c.clientName).join(', ') || 'N/A';

            case 'courierAddress': return infoSheet.courierAddress || 'N/A';
            case 'teRemark': return infoSheet.teFinalRemark || 'N/A';

            default: return 'N/A';
        }
    };

    const handleSubmit: SubmitHandler<TenderApprovalFormValues> = async (values) => {
        // Trigger validation
        const isValid = await form.trigger();
        if (!isValid) {
            const errors = form.formState.errors;
            const errorMessages = Object.values(errors)
                .map(err => err?.message)
                .filter(Boolean);
            if (errorMessages.length > 0) {
                toast.error(`Validation errors: ${errorMessages.join(', ')}`);
            } else {
                toast.error('Please fix the form errors before submitting');
            }
            return;
        }

        try {
            const payload = mapFormToPayload(values);
            const mutation = mode === 'create' ? createApproval : updateApproval;
            await mutation.mutateAsync({ tenderId, data: payload });
            toast.success(mode === 'create' ? 'Approval submitted successfully' : 'Approval updated successfully');
            if(window.history.length > 0){
                navigate(-1);
            } else {
                navigate(paths.tendering.tenderApproval);
            }
        } catch (error: any) {
            console.error('❌ Submission error', error);
            if (error?.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error('Failed to save approval. Please try again.');
            }
        }
    };

    // ✅ GUARDS AFTER ALL HOOKS
    if (!safeRelationships || isPageLoading) {
        return <FormLoadingSkeleton />;
    }

    if (!infoSheet) {
        return <InfoSheetMissingAlert tenderId={tenderId} onBack={() => navigate(-1)} />;
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>{mode === 'create' ? 'Submit' : 'Edit'} Tender Approval</CardTitle>
                        <CardDescription className="mt-2">
                            <span className="font-medium">{safeRelationships.tenderName ?? 'N/A'}</span> • Tender No: {safeRelationships.tenderNo ?? 'N/A'}
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
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
                        {/* TE Recommendation */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-base text-primary border-b pb-2">TE Recommendation</h4>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        {infoSheet.teRecommendation === 'YES' ? (
                                            <>
                                                <CheckCircle className="h-5 w-5 text-green-600" />
                                                <Badge className="bg-green-600">Recommended</Badge>
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="h-5 w-5 text-red-600" />
                                                <Badge variant="destructive">Not Recommended</Badge>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {infoSheet.teFinalRemark && (
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-muted-foreground">Remarks</p>
                                        <p className="text-sm mt-1">{infoSheet.teFinalRemark}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <SelectField
                            control={form.control}
                            name="tlDecision"
                            label="TL's Decision to Bid"
                            options={tlDecisionOptions}
                            placeholder="Select decision"
                        />
                        {form.formState.errors.tlDecision && (
                            <p className="text-sm text-destructive mt-1">{form.formState.errors.tlDecision.message}</p>
                        )}

                        {tlDecision === '1' && (
                            <div className="space-y-8 animate-in fade-in-50 duration-300">
                                <div className="grid gap-2 md:grid-cols-2 items-start">
                                    <SelectField
                                        control={form.control}
                                        name="rfqRequired"
                                        label="RFQ Required"
                                        options={rfqRequiredOptions}
                                        placeholder="Select if RFQ is required"
                                    />
                                    {form.formState.errors.rfqRequired && (
                                        <p className="text-sm text-destructive mt-1">{form.formState.errors.rfqRequired.message}</p>
                                    )}

                                    {rfqRequired === 'yes' && (
                                        <MultiSelectField
                                            control={form.control}
                                            name="rfqTo"
                                            label="Send RFQ to"
                                            options={vendorOrgOptions}
                                            placeholder="Select vendors"
                                        />
                                    )}

                                    {rfqRequired === 'no' && (
                                        <div className="space-y-2">
                                            <TenderFileUploader
                                                context="rfq-response-quotation"
                                                value={form.watch('quotationFiles') || []}
                                                onChange={(paths) => form.setValue('quotationFiles', paths)}
                                                label="Upload quotation files"
                                            />
                                            {form.formState.errors.quotationFiles && (
                                                <p className="text-sm text-destructive mt-1">{form.formState.errors.quotationFiles.message}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <SelectField
                                                key={`processing-fee-mode-${approval?.processingFeeMode || 'new'}`}
                                                control={form.control}
                                                name="processingFeeMode"
                                                label="Processing Fee Mode"
                                                options={processingFeeModeOptions}
                                                placeholder="Select processing fee mode"
                                            />
                                            {infoSheet && (infoSheet.processingFeeAmount || (infoSheet.processingFeeMode && infoSheet.processingFeeMode.length > 0)) && (
                                                <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded space-y-1">
                                                    {infoSheet.processingFeeAmount && (
                                                        <div>
                                                            <strong>Amount:</strong> ₹{(() => {
                                                                const amount = typeof infoSheet.processingFeeAmount === 'number'
                                                                    ? infoSheet.processingFeeAmount
                                                                    : parseFloat(String(infoSheet.processingFeeAmount));
                                                                return isNaN(amount) ? '0.00' : amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                                            })()}
                                                        </div>
                                                    )}
                                                    {infoSheet.processingFeeMode && infoSheet.processingFeeMode.length > 0 && (
                                                        <div>
                                                            <strong>Available Modes:</strong> {infoSheet.processingFeeMode.join(', ')}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <SelectField
                                                control={form.control}
                                                name="tenderFeeMode"
                                                label="Tender Fee Mode"
                                                options={tenderFeeModeOptions}
                                                placeholder="Select tender fee mode"
                                            />
                                            {infoSheet && (infoSheet.tenderFeeAmount || (infoSheet.tenderFeeMode && infoSheet.tenderFeeMode.length > 0)) && (
                                                <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded space-y-1">
                                                    {infoSheet.tenderFeeAmount && (
                                                        <div>
                                                            <strong>Amount:</strong> ₹{(() => {
                                                                const amount = typeof infoSheet.tenderFeeAmount === 'number'
                                                                    ? infoSheet.tenderFeeAmount
                                                                    : parseFloat(String(infoSheet.tenderFeeAmount));
                                                                return isNaN(amount) ? '0.00' : amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                                            })()}
                                                        </div>
                                                    )}
                                                    {infoSheet.tenderFeeMode && infoSheet.tenderFeeMode.length > 0 && (
                                                        <div>
                                                            <strong>Available Modes:</strong> {infoSheet.tenderFeeMode.join(', ')}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <SelectField
                                                control={form.control}
                                                name="emdMode"
                                                label="EMD Mode"
                                                options={emdModeOptions}
                                                placeholder="Select EMD mode"
                                            />
                                            {infoSheet && (infoSheet.emdAmount || (infoSheet.emdMode && infoSheet.emdMode.length > 0)) && (
                                                <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded space-y-1">
                                                    {infoSheet.emdAmount && (
                                                        <div>
                                                            <strong>Amount:</strong> ₹{(() => {
                                                                const amount = typeof infoSheet.emdAmount === 'number'
                                                                    ? infoSheet.emdAmount
                                                                    : parseFloat(String(infoSheet.emdAmount));
                                                                return isNaN(amount) ? '0.00' : amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                                            })()}
                                                        </div>
                                                    )}
                                                    {infoSheet.emdMode && infoSheet.emdMode.length > 0 && (
                                                        <div>
                                                            <strong>Available Modes:</strong> {infoSheet.emdMode.join(', ')}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <SelectField
                                                control={form.control}
                                                name="approvePqrSelection"
                                                label="Approve PQR/Technical Docs"
                                                options={documentApprovalOptions}
                                                placeholder="Select PQR/Technical Docs approval"
                                            />
                                            <div className="flex flex-wrap gap-1">
                                                {infoSheet.technicalWorkOrders?.map((order) => {
                                                    const filePath = order.poDocument?.[0];
                                                    return (
                                                        <Badge key={order.id} variant="outline" className="text-xs hover:bg-primary/10">
                                                            <a href={tenderFilesService.getFileUrl(filePath!)} target="_blank" rel="noopener noreferrer">
                                                                {order.projectName}
                                                            </a>
                                                        </Badge>
                                                    )
                                                })}
                                            </div>
                                            {
                                                techDocs === '2' && (
                                                    <>
                                                        <MultiSelectField
                                                            control={form.control}
                                                            name="alternativeTechnicalDocs"
                                                            label="Alternative Technical Docs"
                                                            options={pqrOptions}
                                                            placeholder="Select documents"
                                                        />
                                                        {form.formState.errors.alternativeTechnicalDocs && (
                                                            <p className="text-sm text-destructive mt-1">{form.formState.errors.alternativeTechnicalDocs.message}</p>
                                                        )}
                                                    </>
                                                )
                                            }
                                        </div>
                                        <div className="space-y-2">
                                            <SelectField
                                                control={form.control}
                                                name="approveFinanceDocSelection"
                                                label="Approve Finance Docs"
                                                options={documentApprovalOptions}
                                                placeholder="Select Finance Docs approval"
                                            />
                                            <div className="flex flex-wrap gap-1">
                                                {infoSheet.commercialDocuments?.map((doc) => {
                                                    const filePath = doc.documentPath?.[0];
                                                    return (
                                                        <Badge key={doc.id} variant="outline" className="text-xs hover:bg-primary/10">
                                                            <a href={tenderFilesService.getFileUrl(filePath!)} target="_blank" rel="noopener noreferrer">
                                                                {doc.documentName}
                                                            </a>
                                                        </Badge>
                                                    );
                                                })}
                                            </div>
                                            {
                                                finDocs === '2' && (
                                                    <>
                                                        <MultiSelectField
                                                            control={form.control}
                                                            name="alternativeFinancialDocs"
                                                            label="Alternative Financial Docs"
                                                            options={financeDocumentOptions}
                                                            placeholder="Select documents"
                                                        />
                                                        {form.formState.errors.alternativeFinancialDocs && (
                                                            <p className="text-sm text-destructive mt-1">{form.formState.errors.alternativeFinancialDocs.message}</p>
                                                        )}
                                                    </>
                                                )
                                            }
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {tlDecision === '2' && (
                            <div className="space-y-8 animate-in fade-in-50 duration-300">
                                <h4 className="font-semibold text-base text-primary border-b pb-2">Rejection Details</h4>
                                <SelectField
                                    control={form.control}
                                    name="tenderStatus"
                                    label="Tender Status"
                                    options={tenderStatusOptions}
                                    placeholder="Select tender status"
                                />
                                {isNotAllowedByOem && (
                                    <SelectField
                                        control={form.control}
                                        name="oemNotAllowed"
                                        label="OEM who didn't allow"
                                        options={vendorOrgOptions}
                                        placeholder="Select OEM who didn't allow"
                                    />
                                )}
                                <FieldWrapper control={form.control} name="remarks" label="Remarks">
                                    {(field) => (
                                        <textarea
                                            {...field}
                                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                            placeholder="Enter rejection remarks..."
                                            maxLength={1000}
                                        />
                                    )}
                                </FieldWrapper>
                            </div>
                        )}

                        {tlDecision === '3' && (
                            <div className="space-y-6 animate-in fade-in-50 duration-300">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <h4 className="font-semibold text-base text-primary">Mark Incomplete Fields</h4>
                                        {(form.watch('incompleteFields')?.length ?? 0) > 0 && (
                                            <Badge variant="secondary">
                                                {form.watch('incompleteFields')?.length ?? 0} field(s) marked
                                            </Badge>
                                        )}
                                    </div>
                                    <Alert>
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>
                                            Select the fields that need correction and provide specific comments for each field.
                                        </AlertDescription>
                                    </Alert>
                                    {form.formState.errors.incompleteFields && (
                                        <Alert variant="destructive">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>{form.formState.errors.incompleteFields.message}</AlertDescription>
                                        </Alert>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {infoSheetFieldOptions.map((field) => {
                                        const incompleteFields = form.watch('incompleteFields') || [];
                                        const isChecked = incompleteFields.some(f => f.fieldName === field.value);
                                        const fieldComment = incompleteFields.find(f => f.fieldName === field.value)?.comment || '';

                                        const handleCheckboxChange = (checked: boolean) => {
                                            const currentFields = form.getValues('incompleteFields') || [];
                                            if (checked) {
                                                // Add field
                                                form.setValue('incompleteFields', [
                                                    ...currentFields,
                                                    { fieldName: field.value, comment: '' }
                                                ]);
                                            } else {
                                                // Remove field
                                                form.setValue('incompleteFields',
                                                    currentFields.filter(f => f.fieldName !== field.value)
                                                );
                                            }
                                        };

                                        const handleCommentChange = (comment: string) => {
                                            const currentFields = form.getValues('incompleteFields') || [];
                                            form.setValue('incompleteFields',
                                                currentFields.map(f =>
                                                    f.fieldName === field.value
                                                        ? { ...f, comment }
                                                        : f
                                                )
                                            );
                                        };

                                        return (
                                            <div key={field.value} className="space-y-2 border p-3 rounded-lg bg-card/50 hover:bg-card transition-all duration-200">
                                                <div className="flex items-start space-x-3">
                                                    <Checkbox
                                                        id={field.value}
                                                        checked={isChecked}
                                                        onCheckedChange={handleCheckboxChange}
                                                        className="mt-1"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <Label
                                                            htmlFor={field.value}
                                                            className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer block mb-1"
                                                        >
                                                            {field.label}
                                                        </Label>
                                                        <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-1.5">
                                                            <span className="font-medium px-1 bg-muted rounded text-[8px] uppercase tracking-wider shrink-0">Sheet Value</span>
                                                            <span className="text-primary/70 font-medium break-words" title={String(getFieldValueFromSheet(field.value))}>
                                                                {getFieldValueFromSheet(field.value)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {isChecked && (
                                                    <div className="space-y-1 pt-3 border-t mt-2">
                                                        <textarea
                                                            value={fieldComment}
                                                            onChange={(e) => handleCommentChange(e.target.value)}
                                                            className={`flex min-h-[70px] w-full rounded-md border ${fieldComment.trim() === '' ? 'border-red-500' : 'border-input'
                                                                } bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-colors`}
                                                            placeholder={`Comment on ${field.label}...`}
                                                        />
                                                        {fieldComment.trim() === '' && (
                                                            <p className="text-[11px] text-red-500 font-medium px-1">Correction comment is required</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Final Remark Box */}
                                <div className="pt-6 border-t space-y-4">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-primary" />
                                        <h4 className="font-semibold text-base text-primary">Final Review Summary</h4>
                                    </div>
                                    <FieldWrapper control={form.control} name="remarks" label="Overall TL Remarks">
                                        {(field) => (
                                            <textarea
                                                {...field}
                                                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm"
                                                placeholder="Provide a final summary or additional instructions for the TE..."
                                                maxLength={2000}
                                            />
                                        )}
                                    </FieldWrapper>

                                </div>
                            </div>
                        )}

                        {(createApproval.error || updateApproval.error) && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    {(createApproval.error || updateApproval.error)?.message || 'An error occurred while saving. Please try again.'}
                                </AlertDescription>
                            </Alert>
                        )}
                        <div className="flex justify-end gap-2 pt-6 border-t">
                            <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => form.reset(getInitialValues(approval))}
                                disabled={isSubmitting}
                            >
                                Reset
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <span className="animate-spin mr-2">⏳</span>}
                                <Save className="mr-2 h-4 w-4" />
                                {mode === 'create' ? 'Submit' : 'Update'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
