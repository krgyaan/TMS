import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, type Resolver } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import { Form } from '@/components/ui/form';
import { SelectField } from '@/components/form/SelectField';
import { ConditionalSection } from '@/components/form/ConditionalSection';
import { BankGuaranteeActionFormSchema, type BankGuaranteeActionFormValues } from '../helpers/bankGuaranteeActionForm.schema';
import { useUpdateBankGuaranteeAction, useBGActionFormData, useBGFollowupData } from '@/hooks/api/useBankGuarantees';
import type { Checkpoint } from '@/components/tendering/SubmissionChecklist';
import { useCourierOptions } from '@/modules/shared/courier/courier.hooks';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useWatch } from 'react-hook-form';
import { AccountsForm1Fields } from './steps/AccountsForm1Fields';
import { AccountsForm2Fields } from './steps/AccountsForm2Fields';
import { AccountsForm3Fields } from './steps/AccountsForm3Fields';
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
    bgApprovedFdrPer: 'bg_approved_fdr_per',
    bgFormatImran: 'bg_format_imran',
    bgNo: 'bg_no',
    bgDate: 'bg_date',
    bgValidity: 'bg_validity',
    bgClaimPeriod: 'bg_claim_period',
    courierNo: 'courier_no',
    bg2Remark: 'bg2_remark',
    fdrPer: 'fdr_per',
    fdrAmt: 'fdr_amt',
    fdrNo: 'fdr_no',
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

/**
 * DateInput is an <input type="date"> that expects a 'yyyy-MM-dd' string, while
 * the API returns ISO timestamps (e.g. 2026-10-17T00:00:00.000Z).
 */
const toDateString = (v: unknown): string | undefined =>
    v ? new Date(v as string).toISOString().slice(0, 10) : undefined;

/**
 * `prefilled_signed_bg` is persisted as a JSON-stringified array of paths. Tolerate
 * a bare string too, mirroring the defensive parse in the service's updateAction.
 */
const safeParseArray = (v: string | null | undefined): string[] => {
    if (!v) return [];
    try {
        const parsed = JSON.parse(v);
        return Array.isArray(parsed) ? parsed : [v];
    } catch {
        return [v];
    }
};

/** Bank mail ids are stored as string[]; useFieldArray needs row objects. */
const toMailRows = (v?: string[] | null) =>
    v && v.length ? v.map((email) => ({ email })) : [{ email: '' }];


const toFdrEnum = (v: unknown): '10' | '15' | '100' | undefined => {
    if (v == null) return undefined;
    const n = Number(v);
    if (!Number.isFinite(n)) return undefined;
    const s = String(n);
    return s === '10' || s === '15' || s === '100' ? s : undefined;
};

const APPROVE_BG_OPTIONS = ['Accept the BG given by TE', 'Upload by Imran'] as const;
type ApproveBg = (typeof APPROVE_BG_OPTIONS)[number];

/**
 * Ignore stored values that aren't a known option. Some rows hold a stray file
 * path (e.g. "bg-prefilled-signed/2") in approve_bg; feeding that to SelectField
 * matches no option and leaves the dropdown on its placeholder.
 */
const toApproveBg = (v: unknown): ApproveBg | undefined =>
    APPROVE_BG_OPTIONS.find((o) => o === v);

interface BankGuaranteeActionFormProps {
    instrumentId: number;
}

export function BankGuaranteeActionForm({ instrumentId }: BankGuaranteeActionFormProps) {
    const navigate = useNavigate();
    const updateMutation = useUpdateBankGuaranteeAction();
    const courierOptions = useCourierOptions();
    const { data: formData } = useBGActionFormData(instrumentId);
    const { data: followupData } = useBGFollowupData(instrumentId);

    const form = useForm<BankGuaranteeActionFormValues>({
        resolver: zodResolver(BankGuaranteeActionFormSchema) as Resolver<BankGuaranteeActionFormValues>,
        defaultValues: {
            action: '',
            contacts: [],
            // One blank row each so the user always has a visible input to type
            // into. Delete removes the row entirely, so the list can go to zero.
            bank_mail_ids: [{ email: '' }],
            bank_mail_ids_cc: [{ email: '' }],
        },
    });

    const action = useWatch({ control: form.control, name: 'action' });
    const modificationRequired = useWatch({ control: form.control, name: 'modification_required' });

    const bankMailIds = useFieldArray({ control: form.control, name: 'bank_mail_ids' });
    const bankMailIdsCc = useFieldArray({ control: form.control, name: 'bank_mail_ids_cc' });

    // `payment_instruments.action` advances 0 -> 9 as each step is actioned, so it
    // tells us how far the accounts forms have progressed.
    const currentAction = formData?.action ?? 0;
    const accountsCheckpoints: Checkpoint[] = [
        { id: 'accounts-form-1', label: 'Accounts Form 1', status: currentAction >= 1 ? 'fulfilled' : 'pending' },
        { id: 'accounts-form-2', label: 'Accounts Form 2', status: currentAction >= 2 ? 'fulfilled' : 'pending' },
        { id: 'accounts-form-3', label: 'Accounts Form 3', status: currentAction >= 3 ? 'fulfilled' : 'pending' },
    ];

    const FILLED_FLAG: Record<string, string> = {
        'accounts-form-1': 'hasAccountsForm1Data',
        'accounts-form-2': 'hasAccountsForm2Data',
        'accounts-form-3': 'hasAccountsForm3Data',
        'request-extension': 'hasExtensionData',
        'returned-courier': 'hasReturnedData',
        'request-cancellation': 'hasRequestCancellationData',
        'bg-cancellation-confirmation': 'hasBgCancellationData',
        'fdr-cancellation-confirmation': 'hasFdrCancellationData',
    };
    const filledFlag = action ? FILLED_FLAG[action] : undefined;
    const hasFollowupData = !!followupData;
    const isReadOnly = action === 'initiate-followup'
        ? hasFollowupData
        : !!(filledFlag && formData?.[filledFlag]);

    const prevStampCharges = formData?.stampCharges;
    const prevBeneficiaryName = formData?.beneficiaryName ?? formData?.favouring;
    const prevAmount = formData?.amount;
    const prevExpiryDate = toDateString(formData?.bgExpiryDate);
    const prevClaimDate = toDateString(formData?.bgClaim);

    // Pre-fill the selected step from whatever was saved previously, so revisiting
    // a completed accounts form shows the stored values instead of a blank form.
    useEffect(() => {
        if (!formData || !action) return;

        if (action === 'accounts-form-1') {
            // The API only exposes the mapped status label, which stops
            // distinguishing accepted/rejected once a later step runs. reasonReq is
            // written only on rejection, so its presence tells us which it was.
            if (currentAction >= 1) {
                form.setValue('bg_req', formData.reasonReq ? 'Rejected' : 'Accepted');
            }
            form.setValue('reason_req', formData.reasonReq ?? undefined);
            form.setValue('approve_bg', toApproveBg(formData.approveBg));
            // Forms 1 and 3 share the single fdr_per column.
            form.setValue('bg_approved_fdr_per', toFdrEnum(formData.fdrPer));
            // Prefilled Bank Formats normally lives in prefilled_signed_bg, but older rows
// only have the creation form's bg_soft_copy (a single path, not JSON).
const prefilledFiles = safeParseArray(formData.prefilledSignedBg);
if (prefilledFiles.length === 0 && formData.bgSoftCopy) {
    prefilledFiles.push(formData.bgSoftCopy);
}
form.setValue('prefilled_signed_bg', prefilledFiles);
            form.setValue('bg_format_imran', formData.bgFormatTe ?? undefined);
            // Field arrays must use replace(), not setValue.
            bankMailIds.replace(toMailRows(formData.bankMailIds));
            bankMailIdsCc.replace(toMailRows(formData.bankMailIdsCc));
        } else if (action === 'accounts-form-2') {
            form.setValue('bg_no', formData.bgNo ?? undefined);
            form.setValue('bg_date', toDateString(formData.bgDate));
            form.setValue('bg_validity', toDateString(formData.validityDate));
            form.setValue('bg_claim_period', toDateString(formData.claimExpiryDate));
            form.setValue('courier_no', formData.courierNo ?? undefined);
            form.setValue('bg2_remark', formData.bg2Remark ?? undefined);
        } else if (action === 'accounts-form-3') {
            // API returns fdrPer as a string; the field is a narrow enum.
            form.setValue('fdr_per', toFdrEnum(formData.fdrPer));
            form.setValue('fdr_amt', formData.fdrAmt ?? undefined);
            form.setValue('fdr_copy', formData.fdrCopy ?? undefined);
            form.setValue('sfms_conf', formData.sfmsConf ?? undefined);
            form.setValue('fdr_no', formData.fdrNo ?? undefined);
            form.setValue('fdr_validity', toDateString(formData.fdrValidity));
            form.setValue('fdr_roi', formData.fdrRoi ?? undefined);
            form.setValue('bg_charge_deducted', formData.bgChargeDeducted ?? undefined);
            form.setValue('sfms_charge_deducted', formData.sfmsChargesDeducted ?? undefined);
            form.setValue('stamp_charge_deducted', formData.stampChargesDeducted ?? undefined);
            form.setValue('other_charge_deducted', formData.otherChargesDeducted ?? undefined);
        } else if (action === 'request-extension') {
            if (formData.hasExtensionModification) {
                form.setValue('modification_required', 'Yes');
            }
            form.setValue('ext_letter', formData.extensionLetterPath ?? undefined);
            form.setValue('new_stamp_charge_deducted', formData.newStampChargeDeducted ?? undefined);
            form.setValue('new_bg_bank_name', formData.extendedBankName ?? undefined);
            form.setValue('new_bg_amt', formData.extendedAmount ?? undefined);
            form.setValue('new_bg_expiry', toDateString(formData.extendedValidityDate));
            form.setValue('new_bg_claim', toDateString(formData.extendedClaimExpiryDate));
        } else if (action === 'returned-courier') {
            form.setValue('docket_no', formData.courierNo ?? undefined);
            form.setValue('docket_slip', formData.docketSlip ?? undefined);
        } else if (action === 'request-cancellation') {
            form.setValue('stamp_covering_letter', formData.stampCoveringLetter ?? undefined);
            form.setValue('cancel_remark', formData.cancelRemark ?? undefined);
        } else if (action === 'bg-cancellation-confirmation') {
            form.setValue('cancell_confirm', formData.cancellConfirm ?? undefined);
        } else if (action === 'fdr-cancellation-confirmation') {
            form.setValue('bg_fdr_cancel_date', toDateString(formData.bgFdrCancelDate));
            form.setValue('bg_fdr_cancel_amount', formData.bgFdrCancelAmount ?? undefined);
            form.setValue('bg_fdr_cancel_ref_no', formData.bgFdrCancelRefNo ?? undefined);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [action, formData]);

    const isSubmitting = form.formState.isSubmitting || updateMutation.isPending;

    const handleSubmit = async (values: BankGuaranteeActionFormValues) => {
        if (isReadOnly) return;
        try {
            const payload: Record<string, unknown> = {};

            Object.entries(values).forEach(([key, value]) => {
                // Repeated/multi-value fields are handled explicitly below so the
                // generic loop doesn't JSON-stringify them into single strings.
                if (key === 'bank_mail_ids' || key === 'bank_mail_ids_cc' || key === 'contacts' || key === 'attachments') {
                    return;
                }

                // Handle File objects (shouldn't happen - FileUploader returns paths)
                if (value instanceof File) return;

                // Handle arrays of Files
                if (Array.isArray(value) && value.length > 0 && value[0] instanceof File) return;

                // Handle all other values (strings, numbers, dates, file paths, etc.)
                if (value === undefined || value === null || value === '') return;
                if (value instanceof Date) {
                    payload[key] = value.toISOString();
                } else if (typeof value === 'object') {
                    payload[key] = JSON.stringify(value);
                } else {
                    payload[key] = String(value);
                }
            });

            // Flatten the repeatable bank mail rows to plain address lists. Blank
            // rows are dropped, and an emptied list is sent as [] (rather than
            // being omitted) so clearing the fields actually persists.
            payload.bank_mail_ids = JSON.stringify(
                (values.bank_mail_ids ?? []).map((r) => r.email).filter(Boolean),
            );
            payload.bank_mail_ids_cc = JSON.stringify(
                (values.bank_mail_ids_cc ?? []).map((r) => r.email).filter(Boolean),
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
                {/* Accounts forms progress. Tiles mirror the shared SubmissionChecklist
                    markup, rendered bare (no Card/title/"Action Required" pill)
                    so the shared component stays untouched for its other pages. */}
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

                {/* Action Selection */}
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

                

                <fieldset disabled={isReadOnly} className={cn('border-0 p-0 m-0 min-w-0', !action && 'hidden')}>
                {/* Accounts Form (BG) 1 - Request to Bank */}
                <ConditionalSection show={action === 'accounts-form-1'}>
                    <div className="space-y-4 border rounded-lg p-4">
                        <h4 className="font-semibold text-base">BG Request to Bank</h4>
                        <AccountsForm1Fields
                            control={form.control}
                            names={STEP_NAMES}
                            bankMailIds={bankMailIds}
                            bankMailIdsCc={bankMailIdsCc}
                            disabled={isReadOnly}
                            fdrValueType="string"
                        />
                    </div>
                </ConditionalSection>

                {/* Accounts Form (BG) 2 - After BG Creation */}
                <ConditionalSection show={action === 'accounts-form-2'}>
                    <div className="space-y-4 border rounded-lg p-4">
                        <h4 className="font-semibold text-base">Accounts Form (BG) 2 - After BG Creation</h4>
                        <AccountsForm2Fields
                            control={form.control}
                            names={STEP_NAMES}
                            courierOptions={courierOptions}
                        />
                    </div>
                </ConditionalSection>

                {/* Accounts Form (BG) 3 - Capture FDR Details */}
                <ConditionalSection show={action === 'accounts-form-3'}>
                    <div className="space-y-4 border rounded-lg p-4">
                        <h4 className="font-semibold text-base">Accounts Form (BG) 3 - Capture FDR Details</h4>
                        <AccountsForm3Fields
                            control={form.control}
                            names={STEP_NAMES}
                            disabled={isReadOnly}
                            fdrValueType="string"
                        />
                    </div>
                </ConditionalSection>

                {/* Initiate Followup */}
                <ConditionalSection show={action === 'initiate-followup'}>
                    <div className="space-y-4 border rounded-lg p-4">
                        <h4 className="font-semibold text-base">Initiate Followup</h4>
                        {hasFollowupData ? (
                            <FollowupReadOnlyView data={followupData} />
                        ) : (
                            <InitiateFollowupFields
                                control={form.control}
                                names={STEP_NAMES}
                                disabled={isReadOnly}
                            />
                        )}
                    </div>
                </ConditionalSection>

                {/* Request Extension */}
                <ConditionalSection show={action === 'request-extension'}>
                    <div className="space-y-4 border rounded-lg p-4">
                        <h4 className="font-semibold text-base">Request Extension</h4>
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
                            disabled={isReadOnly}
                        />
                    </div>
                </ConditionalSection>

                {/* Returned via courier */}
                <ConditionalSection show={action === 'returned-courier'}>
                    <div className="space-y-4 border rounded-lg p-4">
                        <h4 className="font-semibold text-base">Returned via Courier</h4>
                        <ReturnedCourierFields
                            control={form.control}
                            names={STEP_NAMES}
                            disabled={isReadOnly}
                        />
                    </div>
                </ConditionalSection>

                {/* Request Cancellation */}
                <ConditionalSection show={action === 'request-cancellation'}>
                    <div className="space-y-4 border rounded-lg p-4">
                        <h4 className="font-semibold text-base">Request Cancellation</h4>
                        <RequestCancellationFields
                            control={form.control}
                            names={STEP_NAMES}
                            disabled={isReadOnly}
                        />
                    </div>
                </ConditionalSection>

                {/* BG Cancellation Confirmation */}
                <ConditionalSection show={action === 'bg-cancellation-confirmation'}>
                    <div className="space-y-4 border rounded-lg p-4">
                        <h4 className="font-semibold text-base">BG Cancellation Confirmation</h4>
                        <BgCancellationConfirmationFields
                            control={form.control}
                            names={STEP_NAMES}
                            disabled={isReadOnly}
                        />
                    </div>
                </ConditionalSection>

                {/* FDR Cancellation Confirmation */}
                <ConditionalSection show={action === 'fdr-cancellation-confirmation'}>
                    <div className="space-y-4 border rounded-lg p-4">
                        <h4 className="font-semibold text-base">FDR Cancellation Confirmation</h4>
                        <FdrCancellationConfirmationFields
                            control={form.control}
                            names={STEP_NAMES}
                        />
                    </div>
                </ConditionalSection>
                </fieldset>

                <div className="flex justify-end gap-4 pt-4">
                    <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    {!isReadOnly && (
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Submitting...' : 'Submit'}
                        </Button>
                    )}
                </div>
            </form>
        </Form>
    );
}
