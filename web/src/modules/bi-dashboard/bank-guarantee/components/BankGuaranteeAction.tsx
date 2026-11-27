import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, useWatch, type Resolver } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { SelectField } from '@/components/form/SelectField';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { fileUploadService } from '@/services/api/file-upload.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BankGuaranteeActionFormSchema, type BankGuaranteeActionFormValues } from '../helpers/bankGuaranteeActionForm.schema';
import { useUpdateBankGuaranteeAction, useBGActionFormData, useBGFollowupData, useGenerateBankGuaranteePrefilledFormat, useGenerateBankGuaranteeCoveringLetter, useGenerateBankGuaranteeAuthorizationLetter } from '@/hooks/api/useBankGuarantees';
import { useUsers } from '@/hooks/api/useUsers';
import type { Checkpoint } from '@/components/tendering/SubmissionChecklist';
import { CheckCircle2, XCircle, AlertTriangle, FileDown, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { AccountsForm1Fields } from './steps/AccountsForm1Fields';
import { AccountsForm2Fields } from './steps/AccountsForm2Fields';
import { AccountsForm3Fields } from './steps/AccountsForm3Fields';
import { MailAttachmentPreview } from './steps/MailAttachmentPreview';
import { FollowupReadOnlyView, InitiateFollowupFields } from './steps/InitiateFollowupFields';
import { RequestExtensionFields } from './steps/RequestExtensionFields';
import { ReturnedCourierFields } from './steps/ReturnedCourierFields';
import { RequestCancellationFields } from './steps/RequestCancellationFields';
import { BgCancellationConfirmationFields } from './steps/BgCancellationConfirmationFields';
import { FdrCancellationConfirmationFields } from './steps/FdrCancellationConfirmationFields';

const STEP_NAMES = {
    bgReq: 'bg_req',
    reasonReq: 'reason_req',
    approveBg: 'approve_bg',
    prefilledSignedBg: 'prefilled_signed_bg',
    bankMailIds: 'bank_mail_ids',
    bankMailIdsCc: 'bank_mail_ids_cc',
    authorizationPerson: 'authorization_person',
    bgApprovedFdrPer: 'bg_approved_fdr_per',
    bgFormatImran: 'bg_format_imran',
    bgNo: 'bg_no',
    bgDate: 'bg_date',
    bgValidity: 'bg_validity',
    bgClaimPeriod: 'bg_claim_period',
    bgUpload: 'bg_upload',
    bgSignedCoveringLetter: 'bg_signed_covering_letter',
    bg2Remark: 'bg2_remark',
    fdrPer: 'fdr_per',
    fdrAmt: 'fdr_amt',
    fdrNo: 'fdr_no',
    fdrDate: 'fdr_date',
    fdrRoi: 'fdr_roi',
    fdrValidity: 'fdr_validity',
    fdrCopy: 'fdr_copy',
    sfmsConf: 'sfms_conf',
    bgChargeDeducted: 'bg_charge_deducted',
    sfmsChargeDeducted: 'sfms_charge_deducted',
    stampChargeDeducted: 'stamp_charge_deducted',
    otherChargeDeducted: 'other_charge_deducted',
    organisationName: 'organisation_name',
    contacts: 'contacts',
    followupStartDate: 'followup_start_date',
    frequency: 'frequency',
    stopReason: 'stop_reason',
    proofText: 'proof_text',
    stopRemarks: 'stop_remarks',
    proofImage: 'proof_image',
    attachments: 'attachments',
    extLetter: 'ext_letter',
    newStampChargeDeducted: 'new_stamp_charge_deducted',
    newBgBankName: 'new_bg_bank_name',
    newBgAmt: 'new_bg_amt',
    newBgExpiry: 'new_bg_expiry',
    newBgClaim: 'new_bg_claim',
    modificationRequired: 'modification_required',
    docketNo: 'docket_no',
    docketSlip: 'docket_slip',
    stampCoveringLetter: 'stamp_covering_letter',
    cancelRemark: 'cancel_remark',
    cancellConfirm: 'cancell_confirm',
    bgFdrCancelDate: 'bg_fdr_cancel_date',
    bgFdrCancelAmount: 'bg_fdr_cancel_amount',
    bgFdrCancelRefNo: 'bg_fdr_cancel_ref_no',
} as const;

const ACTION_OPTIONS = [
    { value: 'accounts-form-1', label: 'Accounts Form (BG) 1 - Request to Bank' },
    { value: 'accounts-form-2', label: 'Accounts Form (BG) 2 - After BG Creation' },
    { value: 'accounts-form-3', label: 'Accounts Form (BG) 3 - Capture FDR Details' },
    { value: 'initiate-followup', label: 'Initiate Followup' },
    { value: 'request-extension', label: 'Request Extension' },
    { value: 'returned-courier', label: 'Returned via Courier' },
    { value: 'request-cancellation', label: 'Request Cancellation' },
    { value: 'bg-cancellation-confirmation', label: 'BG Cancellation Confirmation' },
    { value: 'fdr-cancellation-confirmation', label: 'FDR Cancellation Confirmation' },
];

const toDateString = (v: unknown): string | undefined =>
    v ? new Date(v as string).toISOString().slice(0, 10) : undefined;

const safeParseArray = (v: string | null | undefined): string[] => {
    if (!v) return [];
    try {
        const parsed = JSON.parse(v);
        return Array.isArray(parsed) ? parsed : [v];
    } catch {
        return [v];
    }
};

const toMailRows = (v?: string[] | null) =>
    v && v.length ? v.map((email) => ({ email })) : [{ email: '' }];

const toAuthorizationRows = (v: unknown) => {
    let arr: unknown = v;
    if (typeof v === 'string') {
        try {
            arr = JSON.parse(v);
        } catch {
            arr = [];
        }
    }
    if (!Array.isArray(arr)) return [];
    return arr.map((person: any) => ({
        name: String(person?.name ?? ''),
        aadhar_no: String(person?.aadharNo ?? person?.aadhar_no ?? ''),
    }));
};

const toFdrEnum = (v: unknown): '10' | '15' | '100' | undefined => {
    if (v == null) return undefined;
    const n = Number(v);
    if (!Number.isFinite(n)) return undefined;
    const s = String(n);
    return s === '10' || s === '15' || s === '100' ? s : undefined;
};

const APPROVE_BG_OPTIONS = ['Accept the BG given by TE', 'Upload by Imran'] as const;
type ApproveBg = (typeof APPROVE_BG_OPTIONS)[number];

const toApproveBg = (v: unknown): ApproveBg | undefined =>
    APPROVE_BG_OPTIONS.find((o) => o === v);

const SectionCard = ({ title, children }: { title: string; children: ReactNode }) => (
    <Card>
        <CardHeader>
            <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">{children}</CardContent>
    </Card>
);


interface BankGuaranteeActionFormProps {
    instrumentId: number;
}

export function BankGuaranteeAction({ instrumentId }: BankGuaranteeActionFormProps) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const updateMutation = useUpdateBankGuaranteeAction();
    const generatePrefilledMutation = useGenerateBankGuaranteePrefilledFormat();
    const generateCoveringLetterMutation = useGenerateBankGuaranteeCoveringLetter();
    const generateAuthorizationMutation = useGenerateBankGuaranteeAuthorizationLetter();
    const { data: formData } = useBGActionFormData(instrumentId);
    const { data: followupData } = useBGFollowupData(instrumentId);
    const { data: employees = [] } = useUsers();
    const [generatedDocs, setGeneratedDocs] = useState<{
        prefilled?: string;
        coverLetter?: string;
        envelope?: string;
        authorization?: string;
    }>({});

    // Deep links from the BG emails: ?section=accounts-form-1 / accounts-form-2
    const requestedSection = searchParams.get('section');
    const defaultSection =
        requestedSection && ACTION_OPTIONS.some((option) => option.value === requestedSection)
            ? requestedSection
            : '';

    const form = useForm<BankGuaranteeActionFormValues>({
        resolver: zodResolver(BankGuaranteeActionFormSchema) as Resolver<BankGuaranteeActionFormValues>,
        defaultValues: {
            action: defaultSection,
            contacts: [],
            bank_mail_ids: [{ email: '' }],
            bank_mail_ids_cc: [{ email: '' }],
        },
    });

    const action = useWatch({ control: form.control, name: 'action' });
    const modificationRequired = useWatch({ control: form.control, name: 'modification_required' });
    const stage1Prefilled = useWatch({ control: form.control, name: 'prefilled_signed_bg' });
    const stage1BgFormat = useWatch({ control: form.control, name: 'bg_format_imran' });
    const stage1FdrCopy = useWatch({ control: form.control, name: 'fdr_copy' });
    const stage2CoveringLetter = useWatch({ control: form.control, name: 'bg_signed_covering_letter' });
    const stage2BgUpload = useWatch({ control: form.control, name: 'bg_upload' });
    const stage3Sfms = useWatch({ control: form.control, name: 'sfms_conf' });
    const fdrNoValue = useWatch({ control: form.control, name: 'fdr_no' });
    const bgReqValue = useWatch({ control: form.control, name: 'bg_req' });
    const authorizationPersonValue = useWatch({ control: form.control, name: 'authorization_person' });

    const bankMailIds = useFieldArray({ control: form.control, name: 'bank_mail_ids' });
    const bankMailIdsCc = useFieldArray({ control: form.control, name: 'bank_mail_ids_cc' });

    const currentAction = formData?.action ?? 0;
    const accountsCheckpoints: Checkpoint[] = [
        { id: 'accounts-form-1', label: 'Accounts Form 1', status: currentAction >= 1 ? 'fulfilled' : 'pending' },
        { id: 'accounts-form-2', label: 'Accounts Form 2', status: currentAction >= 2 ? 'fulfilled' : 'pending' },
        { id: 'accounts-form-3', label: 'Accounts Form 3', status: currentAction >= 3 ? 'fulfilled' : 'pending' },
    ];

    const FILLED_FLAG: Record<string, string> = {
        'request-extension': 'hasExtensionData',
        'returned-courier': 'hasReturnedData',
        'request-cancellation': 'hasRequestCancellationData',
        'bg-cancellation-confirmation': 'hasBgCancellationData',
        'fdr-cancellation-confirmation': 'hasFdrCancellationData',
    };

    const ACCOUNTS_STEP_ACTION: Record<string, number> = {
        'accounts-form-1': 1,
        'accounts-form-2': 2,
        'accounts-form-3': 3,
    };

    const hasFollowupData = !!followupData;

    const isStepLocked = (step: string) => {
        if (step === 'initiate-followup') return hasFollowupData;
        const minAction = ACCOUNTS_STEP_ACTION[step];
        if (minAction !== undefined) return currentAction >= minAction;
        return !!(FILLED_FLAG[step] && formData?.[FILLED_FLAG[step]]);
    };

    const isReadOnly = isStepLocked(action);

    const prevStampCharges = formData?.stampCharges;
    const prevBeneficiaryName = formData?.beneficiaryName ?? formData?.favouring;
    const prevAmount = formData?.amount;
    const prevExpiryDate = toDateString(formData?.bgExpiryDate);
    const prevClaimDate = toDateString(formData?.bgClaim);

    const courierReqNo = formData?.reqNo ? String(formData.reqNo).trim() : '';
    const courierProvider = (formData?.courierDetails?.courierProvider || '').trim();
    const courierDocketNo = (formData?.courierDetails?.docketNo || formData?.docketNo || '').trim();
    const courierDocketSlip = (formData?.courierDetails?.docketSlip || formData?.docketSlip || '').trim();
    const missingCourierDetails = [
        courierProvider ? '' : 'Courier Provider',
        courierDocketNo ? '' : 'Docket No.',
        courierDocketSlip ? '' : 'Docket Slip',
    ].filter((item): item is string => item.length > 0);
    const courierDetailsIncomplete =
        action === 'accounts-form-3' && !isReadOnly && courierReqNo.length > 0 && missingCourierDetails.length > 0;

    useEffect(() => {
        if (!formData || !action) return;

        if (action === 'accounts-form-1') {
            if (currentAction >= 1) {
                form.setValue('bg_req', formData.reasonReq ? 'Rejected' : 'Accepted');
            }
            form.setValue('reason_req', formData.reasonReq ?? undefined);
            form.setValue('approve_bg', toApproveBg(formData.approveBg));
            form.setValue('bg_approved_fdr_per', toFdrEnum(formData.fdrPer));
            const prefilledFiles = safeParseArray(formData.prefilledSignedBg);
            form.setValue('prefilled_signed_bg', prefilledFiles);
            form.setValue('bg_format_imran', safeParseArray(formData.bgFormatTe));
            form.setValue('fdr_amt', formData.fdrAmt ?? undefined);
            form.setValue('fdr_no', formData.fdrNo ?? undefined);
            form.setValue('fdr_date', toDateString(formData.fdrDate));
            form.setValue('fdr_validity', toDateString(formData.fdrValidity));
            form.setValue('fdr_roi', formData.fdrRoi ?? undefined);
            form.setValue('fdr_copy', safeParseArray(formData.fdrCopy));
            bankMailIds.replace(toMailRows(formData.bankMailIds));
            bankMailIdsCc.replace(toMailRows(formData.bankMailIdsCc));
            const savedAuthorizationPerson = toAuthorizationRows(formData.authorizationPersons)[0];
            form.setValue('authorization_person', {
                name: savedAuthorizationPerson?.name ?? '',
                aadhar_no: savedAuthorizationPerson?.aadhar_no ?? '',
            });
        } else if (action === 'accounts-form-2') {
            // BG No. is a required field on this form, so it is only present once
            // Stage 2 has actually been saved. Some older instruments already
            // carry dates in instrument_bg_details (written by the legacy create
            // path), which must not pre-fill a Stage 2 that was never filled in.
            const stage2Saved = Boolean(formData.bgNo);
            form.setValue('bg_no', formData.bgNo ?? undefined);
            form.setValue('bg_date', stage2Saved ? toDateString(formData.bgDate) : undefined);
            form.setValue('bg_validity', stage2Saved ? toDateString(formData.validityDate) : undefined);
            form.setValue('bg_claim_period', stage2Saved ? toDateString(formData.claimExpiryDate) : undefined);
            form.setValue('bg_upload', safeParseArray(formData.bgUpload));
            form.setValue('bg_signed_covering_letter', safeParseArray(formData.bgSignedCoveringLetter));
            form.setValue('bg2_remark', formData.bg2Remark ?? undefined);
        } else if (action === 'accounts-form-3') {
            form.setValue('sfms_conf', safeParseArray(formData.sfmsConf));
            form.setValue('bg_charge_deducted', formData.bgChargeDeducted ?? undefined);
            form.setValue('sfms_charge_deducted', formData.sfmsChargesDeducted ?? undefined);
            form.setValue('stamp_charge_deducted', formData.stampChargesDeducted ?? undefined);
            form.setValue('other_charge_deducted', formData.otherChargesDeducted ?? undefined);
        } else if (action === 'request-extension') {
            if (formData.hasExtensionModification) {
                form.setValue('modification_required', 'Yes');
            }
            form.setValue('ext_letter', safeParseArray(formData.extensionLetterPath));
            form.setValue('new_stamp_charge_deducted', formData.newStampChargeDeducted ?? undefined);
            form.setValue('new_bg_bank_name', formData.extendedBankName ?? undefined);
            form.setValue('new_bg_amt', formData.extendedAmount ?? undefined);
            form.setValue('new_bg_expiry', toDateString(formData.extendedValidityDate));
            form.setValue('new_bg_claim', toDateString(formData.extendedClaimExpiryDate));
        } else if (action === 'returned-courier') {
            form.setValue('docket_no', formData.courierNo ?? undefined);
            form.setValue('docket_slip', safeParseArray(formData.docketSlip));
        } else if (action === 'request-cancellation') {
            form.setValue('stamp_covering_letter', safeParseArray(formData.stampCoveringLetter));
            form.setValue('cancel_remark', formData.cancelRemark ?? undefined);
        } else if (action === 'bg-cancellation-confirmation') {
            form.setValue('cancell_confirm', safeParseArray(formData.cancellConfirm));
        } else if (action === 'fdr-cancellation-confirmation') {
            form.setValue('bg_fdr_cancel_date', toDateString(formData.bgFdrCancelDate));
            form.setValue('bg_fdr_cancel_amount', formData.bgFdrCancelAmount ?? undefined);
            form.setValue('bg_fdr_cancel_ref_no', formData.bgFdrCancelRefNo ?? undefined);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [action, formData]);

    const isSubmitting = form.formState.isSubmitting || updateMutation.isPending;

    const handleGeneratePrefilled = async () => {
        const fdrNo = String(form.getValues('fdr_no') ?? '').trim();
        if (!fdrNo) {
            toast.error('Enter FDR No. first');
            return;
        }

        try {
            const result = await generatePrefilledMutation.mutateAsync({ id: instrumentId, fdrNo });
            setGeneratedDocs((prev) => ({ ...prev, prefilled: result.pdfPath }));
            toast.success('Prefilled BG format generated');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to generate prefilled BG format');
        }
    };

    const handleGenerateAuthorizationLetter = async () => {
        const person = form.getValues('authorization_person');
        const name = String(person?.name ?? '').trim();
        const aadharNo = String(person?.aadhar_no ?? '').trim();

        if (!name || !/^\d{12}$/.test(aadharNo)) {
            toast.error('Select a user and enter a 12-digit Aadhar No.');
            return;
        }

        try {
            const result = await generateAuthorizationMutation.mutateAsync({
                id: instrumentId,
                persons: [{ name, aadharNo }],
            });
            setGeneratedDocs((prev) => ({ ...prev, authorization: result.pdfPath }));
            toast.success('Authorization letter generated');
        } catch (error: any) {
            toast.error(error?.message || 'Failed to generate authorization letter');
        }
    };

    const handleGenerateCoveringLetter = async () => {
        const bgNo = String(form.getValues('bg_no') ?? '').trim();
        const bgDate = toDateString(form.getValues('bg_date'));
        if (!bgNo || !bgDate) {
            toast.error('Enter BG No. and BG Creation Date first');
            return;
        }

        try {
            const result = await generateCoveringLetterMutation.mutateAsync({
                id: instrumentId,
                bgNo,
                bgDate,
            });
            setGeneratedDocs((prev) => ({
                ...prev,
                coverLetter: result.pdfPath,
                envelope: result.envelopePdfPath,
            }));
            toast.success(
                result.envelopePdfPath
                    ? 'Covering letter and envelope slip generated'
                    : 'Covering letter generated',
            );
        } catch (error: any) {
            toast.error(error?.message || 'Failed to generate covering letter');
        }
    };

    const handleSubmit = async (values: BankGuaranteeActionFormValues) => {
        if (isReadOnly) return;
        try {
            const payload: Record<string, unknown> = {};

            Object.entries(values).forEach(([key, value]) => {
                if (
                    key === 'bank_mail_ids'
                    || key === 'bank_mail_ids_cc'
                    || key === 'authorization_person'
                    || key === 'contacts'
                    || key === 'attachments'
                ) {
                    return;
                }

                if (value instanceof File) return;

                if (Array.isArray(value) && value.length > 0 && value[0] instanceof File) return;

                if (Array.isArray(value) && value.length === 0) return;

                if (value === undefined || value === null || value === '') return;
                if (value instanceof Date) {
                    payload[key] = value.toISOString();
                } else if (typeof value === 'object') {
                    payload[key] = JSON.stringify(value);
                } else {
                    payload[key] = String(value);
                }
            });

            payload.bank_mail_ids = JSON.stringify(
                (values.bank_mail_ids ?? []).map((r) => r.email).filter(Boolean),
            );
            payload.bank_mail_ids_cc = JSON.stringify(
                (values.bank_mail_ids_cc ?? []).map((r) => r.email).filter(Boolean),
            );
            const authorizationName = values.authorization_person?.name?.trim() || '';
            payload.authorization_persons = JSON.stringify(
                authorizationName
                    ? [{ name: authorizationName, aadharNo: values.authorization_person?.aadhar_no?.trim() || '' }]
                    : [],
            );
            payload.contacts = JSON.stringify(
                (values.contacts ?? []).map((c) => ({
                    name: c.name?.trim() || '',
                    phone: c.phone || null,
                    email: c.email || null,
                })),
            );
            payload.attachments = values.attachments ?? [];

            await updateMutation.mutateAsync({ id: instrumentId, payload });
            toast.success('Action submitted successfully');
            navigate(-1);
            form.reset();
        } catch (error: any) {
            toast.error(error?.message || 'Failed to submit action');
            console.error('Error submitting action:', error);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {accountsCheckpoints.map((cp) => (
                        <div
                            key={cp.id}
                            className={cn(
                                "flex items-start gap-3 p-3 rounded-md border transition-colors",
                                cp.status === 'fulfilled' && "border-green-100",
                                cp.status === 'pending' && "border-red-100"
                            )}
                        >
                            <div className="mt-0.5">
                                {cp.status === 'fulfilled'
                                    ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    : <XCircle className="h-5 w-5 text-red-600" />}
                            </div>
                            <div>
                                <p className={cn(
                                    "text-sm font-semibold",
                                    cp.status === 'fulfilled' ? "text-green-900" : "text-red-900"
                                )}>
                                    {cp.label}
                                </p>
                                <p className={cn(
                                    "text-[10px] font-medium uppercase tracking-wider",
                                    cp.status === 'fulfilled' ? "text-green-600" : "text-red-500"
                                )}>
                                    {cp.status === 'fulfilled' ? 'Completed' : 'Pending'}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                    <SelectField
                        label="Choose What to do"
                        control={form.control}
                        name="action"
                        options={ACTION_OPTIONS}
                        placeholder="Select an action"
                        valueType="string"
                    />
                </div>

                <fieldset disabled={isStepLocked(action)} className="border-0 p-0 m-0 min-w-0">
                    {action === 'accounts-form-1' && (
                        <SectionCard title="Accounts Form (BG) 1 - Request to Bank">
                            <AccountsForm1Fields
                                control={form.control}
                                names={STEP_NAMES}
                                bankMailIds={bankMailIds}
                                bankMailIdsCc={bankMailIdsCc}
                                disabled={isStepLocked('accounts-form-1')}
                                fdrValueType="string"
                                onGeneratePrefilled={handleGeneratePrefilled}
                                isGeneratingPrefilled={generatePrefilledMutation.isPending}
                                canGeneratePrefilled={Boolean(String(fdrNoValue ?? '').trim())}
                                prefilledPath={generatedDocs.prefilled ?? formData?.prefilledAppDocx}
                            />
                            <MailAttachmentPreview
                                instrumentId={instrumentId}
                                stage={1}
                                files={{
                                    prefilledSignedBg: stage1Prefilled ?? [],
                                    bgFormatImran: stage1BgFormat ?? [],
                                    fdrCopy: stage1FdrCopy ?? [],
                                }}
                            />
                        </SectionCard>
                    )}

                    {action === 'accounts-form-2' && (
                        <SectionCard title="Accounts Form (BG) 2 - After BG Creation">
                            <AccountsForm2Fields
                                control={form.control}
                                names={STEP_NAMES}
                                onGenerateCoveringLetter={handleGenerateCoveringLetter}
                                isGeneratingCoveringLetter={generateCoveringLetterMutation.isPending}
                                coverLetterPath={generatedDocs.coverLetter ?? formData?.coverLetterDocx}
                                envelopeSlipPath={generatedDocs.envelope ?? formData?.envelopeSlip}
                            />
                            <MailAttachmentPreview
                                instrumentId={instrumentId}
                                stage={2}
                                files={{
                                    bgSignedCoveringLetter: stage2CoveringLetter ?? [],
                                    bgUpload: stage2BgUpload ?? [],
                                }}
                            />
                        </SectionCard>
                    )}

                    {action === 'accounts-form-3' && (
                        <SectionCard title="Accounts Form (BG) 3 - Charges & SFMS Confirmation">
                            {courierDetailsIncomplete && (
                                <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <div className="space-y-1">
                                        <div className="font-medium">Courier details incomplete</div>
                                        <div>
                                            Missing: {missingCourierDetails.join(', ')}. These are required for the
                                            client mail sent from this stage.
                                        </div>
                                    </div>
                                </div>
                            )}
                            <AccountsForm3Fields
                                control={form.control}
                                names={STEP_NAMES}
                                disabled={isStepLocked('accounts-form-3')}
                            />
                            <MailAttachmentPreview
                                instrumentId={instrumentId}
                                stage={3}
                                files={{ sfmsConf: stage3Sfms ?? [] }}
                            />
                        </SectionCard>
                    )}

                    {action === 'initiate-followup' && (
                        <SectionCard title="Initiate Followup">
                            {hasFollowupData ? (
                                <FollowupReadOnlyView data={followupData} />
                            ) : (
                                <InitiateFollowupFields
                                    control={form.control}
                                    names={STEP_NAMES}
                                    disabled={isStepLocked('initiate-followup')}
                                />
                            )}
                        </SectionCard>
                    )}

                    {action === 'request-extension' && (
                        <SectionCard title="Request Extension">
                            <RequestExtensionFields
                                control={form.control}
                                names={STEP_NAMES}
                                modificationRequired={modificationRequired}
                                prevValues={{
                                    stampCharges: prevStampCharges,
                                    beneficiaryName: prevBeneficiaryName,
                                    amount: prevAmount,
                                    expiryDate: prevExpiryDate,
                                    claimDate: prevClaimDate,
                                }}
                                disabled={isStepLocked('request-extension')}
                            />
                        </SectionCard>
                    )}

                    {action === 'returned-courier' && (
                        <SectionCard title="Returned via Courier">
                            <ReturnedCourierFields
                                control={form.control}
                                names={STEP_NAMES}
                                disabled={isStepLocked('returned-courier')}
                            />
                        </SectionCard>
                    )}

                    {action === 'request-cancellation' && (
                        <SectionCard title="Request Cancellation">
                            <RequestCancellationFields
                                control={form.control}
                                names={STEP_NAMES}
                                disabled={isStepLocked('request-cancellation')}
                            />
                        </SectionCard>
                    )}

                    {action === 'bg-cancellation-confirmation' && (
                        <SectionCard title="BG Cancellation Confirmation">
                            <BgCancellationConfirmationFields
                                control={form.control}
                                names={STEP_NAMES}
                                disabled={isStepLocked('bg-cancellation-confirmation')}
                            />
                        </SectionCard>
                    )}

                    {action === 'fdr-cancellation-confirmation' && (
                        <SectionCard title="FDR Cancellation Confirmation">
                            <FdrCancellationConfirmationFields
                                control={form.control}
                                names={STEP_NAMES}
                            />
                        </SectionCard>
                    )}
                </fieldset>

                {action === 'accounts-form-1' && bgReqValue === 'Accepted' && (
                    <SectionCard title="Authorization">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                                <div className="md:col-span-4">
                                    <SelectField
                                        control={form.control}
                                        name="authorization_person.name"
                                        label="Name"
                                        options={employees.map((employee) => ({
                                            value: employee.name,
                                            label: employee.name,
                                        }))}
                                        placeholder="Select user"
                                        valueType="string"
                                    />
                                </div>
                                <div className="md:col-span-4">
                                    <FieldWrapper
                                        control={form.control}
                                        name="authorization_person.aadhar_no"
                                        label="Aadhar No."
                                    >
                                        {(field) => (
                                            <Input
                                                {...field}
                                                value={(field.value as string | undefined) ?? ''}
                                                placeholder="Enter 12-digit Aadhar number"
                                                inputMode="numeric"
                                                maxLength={12}
                                                onChange={(event) =>
                                                    field.onChange(event.target.value.replace(/\D/g, '').slice(0, 12))
                                                }
                                            />
                                        )}
                                    </FieldWrapper>
                                </div>
                                <div className="md:col-span-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleGenerateAuthorizationLetter}
                                        disabled={
                                            generateAuthorizationMutation.isPending
                                            || !String(authorizationPersonValue?.name ?? '').trim()
                                            || !/^\d{12}$/.test(String(authorizationPersonValue?.aadhar_no ?? '').trim())
                                        }
                                    >
                                        {generateAuthorizationMutation.isPending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <FileDown className="h-4 w-4" />
                                        )}
                                        <span className="ml-1">Generate</span>
                                    </Button>
                                </div>
                            </div>
                            {(generatedDocs.authorization ?? formData?.authorizationLetterDocx) && (
                                <a
                                    href={fileUploadService.getFileUrl(
                                        (generatedDocs.authorization ?? formData?.authorizationLetterDocx) as string,
                                    )}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download
                                    className="inline-flex items-center gap-1 text-sm font-medium text-primary underline"
                                >
                                    <FileText className="h-4 w-4" />
                                    Authorization Letter
                                </a>
                            )}
                        </div>
                    </SectionCard>
                )}

                <div className="flex justify-end gap-4 pt-4">
                    {courierDetailsIncomplete && (
                        <p className="mr-auto self-center text-sm text-amber-700">
                            Complete the courier details before submitting.
                        </p>
                    )}
                    <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    {!isReadOnly && (
                        <Button type="submit" disabled={isSubmitting || courierDetailsIncomplete}>
                            {isSubmitting ? 'Submitting...' : 'Submit'}
                        </Button>
                    )}
                </div>
            </form>
        </Form>
    );
}
