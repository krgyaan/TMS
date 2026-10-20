import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, useWatch, type Resolver } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useEffect, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { SelectField } from '@/components/form/SelectField';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BankGuaranteeActionFormSchema, type BankGuaranteeActionFormValues } from '../helpers/bankGuaranteeActionForm.schema';
import { useUpdateBankGuaranteeAction, useBGActionFormData, useBGFollowupData } from '@/hooks/api/useBankGuarantees';
import type { Checkpoint } from '@/components/tendering/SubmissionChecklist';
import { useCreateCourier } from '@/modules/shared/courier/courier.hooks';
import { useUsers } from '@/hooks/api/useUsers';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
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
    const updateMutation = useUpdateBankGuaranteeAction();
    const createCourierMutation = useCreateCourier();
    const { data: employees = [] } = useUsers();
    const { data: formData } = useBGActionFormData(instrumentId);
    const { data: followupData } = useBGFollowupData(instrumentId);

    const form = useForm<BankGuaranteeActionFormValues>({
        resolver: zodResolver(BankGuaranteeActionFormSchema) as Resolver<BankGuaranteeActionFormValues>,
        defaultValues: {
            action: '',
            contacts: [],
            bank_mail_ids: [{ email: '' }],
            bank_mail_ids_cc: [{ email: '' }],
        },
    });

    const action = useWatch({ control: form.control, name: 'action' });
    const modificationRequired = useWatch({ control: form.control, name: 'modification_required' });

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
            if (prefilledFiles.length === 0 && formData.bgSoftCopy) {
                prefilledFiles.push(formData.bgSoftCopy);
            }
            form.setValue('prefilled_signed_bg', prefilledFiles);
            form.setValue('bg_format_imran', safeParseArray(formData.bgFormatTe));
            bankMailIds.replace(toMailRows(formData.bankMailIds));
            bankMailIdsCc.replace(toMailRows(formData.bankMailIdsCc));
        } else if (action === 'accounts-form-2') {
            form.setValue('bg_no', formData.bgNo ?? undefined);
            form.setValue('bg_date', toDateString(formData.bgDate));
            form.setValue('bg_validity', toDateString(formData.validityDate));
            form.setValue('bg_claim_period', toDateString(formData.claimExpiryDate));
            form.setValue('bg2_remark', formData.bg2Remark ?? undefined);
            const courier = formData.courierDetails;
            const courierAddr = formData.courierAddressJson;
            if (courier || courierAddr) {
                form.setValue('courierOrg', courierAddr?.org ?? courier?.toOrg ?? undefined);
                form.setValue('courierName', courierAddr?.name ?? courier?.toName ?? undefined);
                form.setValue('courierPhone', courierAddr?.phone ?? courier?.toMobile ?? undefined);
                form.setValue('courierAddrLine1', courierAddr?.line1 ?? undefined);
                form.setValue('courierAddrLine2', courierAddr?.line2 ?? undefined);
                form.setValue('courierCity', courierAddr?.city ?? undefined);
                form.setValue('courierState', courierAddr?.state ?? undefined);
                form.setValue('courierPincode', courierAddr?.pincode ?? courier?.toPin ?? undefined);
                form.setValue('empFrom', courierAddr?.empFrom ?? (courier?.empFrom ? Number(courier.empFrom) : undefined));
                form.setValue('delDate', toDateString(courierAddr?.delDate ?? courier?.delDate));
                form.setValue('urgency', courierAddr?.urgency ?? (courier?.urgency ? Number(courier.urgency) : undefined));
                const jsonDocs = courierAddr?.docs;
                const courierDocs = courier?.courierDocs;
                form.setValue('courier_docs',
                    Array.isArray(jsonDocs)
                        ? jsonDocs
                        : Array.isArray(courierDocs)
                            ? courierDocs
                            : safeParseArray(courierDocs));
            }
        } else if (action === 'accounts-form-3') {
            form.setValue('fdr_per', toFdrEnum(formData.fdrPer));
            form.setValue('fdr_amt', formData.fdrAmt ?? undefined);
            form.setValue('fdr_copy', safeParseArray(formData.fdrCopy));
            form.setValue('sfms_conf', safeParseArray(formData.sfmsConf));
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

    const isSubmitting = form.formState.isSubmitting || updateMutation.isPending || createCourierMutation.isPending;

    const handleSubmit = async (values: BankGuaranteeActionFormValues) => {
        if (isReadOnly) return;
        try {
            const payload: Record<string, unknown> = {};

            Object.entries(values).forEach(([key, value]) => {
                if (key === 'bank_mail_ids' || key === 'bank_mail_ids_cc' || key === 'contacts' || key === 'attachments') {
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
            payload.contacts = JSON.stringify(
                (values.contacts ?? []).map((c) => ({
                    name: c.name?.trim() || '',
                    phone: c.phone || null,
                    email: c.email || null,
                })),
            );
            payload.attachments = values.attachments ?? [];

            if (values.action === 'accounts-form-2' && values.courierOrg) {
                if (!formData?.courierDetails?.id) {
                    const toAddr = [values.courierAddrLine1, values.courierAddrLine2, values.courierCity, values.courierState]
                        .filter(Boolean).join(', ');
                    const createdCourier = await createCourierMutation.mutateAsync({
                        data: {
                            toOrg: values.courierOrg,
                            toName: values.courierName || '',
                            toAddr: toAddr || '',
                            toPin: values.courierPincode || '',
                            toMobile: values.courierPhone || '',
                            empFrom: values.empFrom || 0,
                            delDate: values.delDate || '',
                            urgency: values.urgency || 1,
                        },
                        filenames: values.courier_docs,
                    });
                    payload.req_no = String(createdCourier.id);
                }
                payload.courier_address_json = JSON.stringify({
                    org: values.courierOrg || null,
                    name: values.courierName || null,
                    phone: values.courierPhone || null,
                    line1: values.courierAddrLine1 || null,
                    line2: values.courierAddrLine2 || null,
                    city: values.courierCity || null,
                    state: values.courierState || null,
                    pincode: values.courierPincode || null,
                    empFrom: values.empFrom ?? null,
                    delDate: values.delDate || null,
                    urgency: values.urgency ?? null,
                    docs: values.courier_docs ?? [],
                });
            }

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
                            />
                        </SectionCard>
                    )}

                    {action === 'accounts-form-2' && (
                        <SectionCard title="Accounts Form (BG) 2 - After BG Creation">
                            <AccountsForm2Fields
                                control={form.control}
                                names={STEP_NAMES}
                                employees={employees}
                            />
                        </SectionCard>
                    )}

                    {action === 'accounts-form-3' && (
                        <SectionCard title="Accounts Form (BG) 3 - Capture FDR Details">
                            <AccountsForm3Fields
                                control={form.control}
                                names={STEP_NAMES}
                                disabled={isStepLocked('accounts-form-3')}
                                fdrValueType="string"
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
