import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useFieldArray, useForm, useWatch, type Resolver } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { SelectField } from '@/components/form/SelectField';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FileUploader } from '@/components/file-upload';
import { NumberInput } from '@/components/form/NumberInput';
import DateInput from '@/components/form/DateInput';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BG_PURPOSE_OPTIONS, BG_NEEDED_IN_OPTIONS, BANKS } from '@/modules/tendering/emds-tenderfees/constants';
import { BankGuaranteeEditFormSchema, type BankGuaranteeEditFormValues } from '../helpers/bankGuaranteeEditForm.schema';
import { useUpdateBankGuarantee, useBGFollowupData } from '@/hooks/api/useBankGuarantees';
import { toast } from 'sonner';
import { AccountsForm1Fields } from './steps/AccountsForm1Fields';
import { AccountsForm2Fields } from './steps/AccountsForm2Fields';
import { AccountsForm3Fields } from './steps/AccountsForm3Fields';
import { FollowupReadOnlyView } from './steps/InitiateFollowupFields';
import { RequestExtensionFields } from './steps/RequestExtensionFields';
import { ReturnedCourierFields } from './steps/ReturnedCourierFields';
import { RequestCancellationFields } from './steps/RequestCancellationFields';
import { BgCancellationConfirmationFields } from './steps/BgCancellationConfirmationFields';
import { FdrCancellationConfirmationFields } from './steps/FdrCancellationConfirmationFields';

const STEP_NAMES = {
    bgReq: 'bg_req',
    reasonReq: 'reasonReq',
    approveBg: 'approveBg',
    prefilledSignedBg: 'prefilled_signed_bg',
    bankMailIds: 'bankMailIds',
    bankMailIdsCc: 'bankMailIdsCc',
    bgApprovedFdrPer: 'fdrPer',
    bgFormatImran: 'bg_format_te',
    bgNo: 'bgNo',
    bgDate: 'bgDate',
    bgValidity: 'validityDate',
    bgClaimPeriod: 'claimExpiryDate',
    courierNo: 'courierNo',
    bg2Remark: 'bg2Remark',
    fdrPer: 'fdrPer',
    fdrAmt: 'fdrAmt',
    fdrNo: 'fdrNo',
    fdrRoi: 'fdrRoi',
    fdrValidity: 'fdrValidity',
    fdrCopy: 'fdr_copy',
    sfmsConf: 'sfms_conf',
    bgChargeDeducted: 'bgChargeDeducted',
    sfmsChargeDeducted: 'sfmsChargesDeducted',
    stampChargeDeducted: 'stampChargesDeducted',
    otherChargeDeducted: 'otherChargesDeducted',
    extLetter: 'extension_letter_path',
    newStampChargeDeducted: 'newStampChargeDeducted',
    newBgBankName: 'extendedBankName',
    newBgAmt: 'extendedAmount',
    newBgExpiry: 'extendedValidityDate',
    newBgClaim: 'extendedClaimExpiryDate',
    modificationRequired: 'modification_required',
    docketNo: 'courierNo',
    docketSlip: 'docket_slip',
    stampCoveringLetter: 'stamp_covering_letter',
    cancelRemark: 'cancelRemark',
    cancellConfirm: 'cancell_confirm',
    bgFdrCancelDate: 'bgFdrCancelDate',
    bgFdrCancelAmount: 'bgFdrCancelAmount',
    bgFdrCancelRefNo: 'bgFdrCancelRefNo',
} as const;

const SectionCard = ({ title, children }: { title: string; children: ReactNode }) => (
    <Card>
        <CardHeader>
            <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">{children}</CardContent>
    </Card>
);

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

const parseFileValue = (value: any): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [value];
        } catch {
            return [value];
        }
    }
    return [];
};

interface BankGuaranteeEditProps {
    instrumentId: number;
    initialData: any;
}

export function BankGuaranteeEdit({ instrumentId, initialData }: BankGuaranteeEditProps) {
    const navigate = useNavigate();
    const updateMutation = useUpdateBankGuarantee();
    const { data: followupData } = useBGFollowupData(instrumentId);

    const hasExtensionModification = !!(initialData.extendedAmount || initialData.extendedValidityDate
        || initialData.extendedClaimExpiryDate || initialData.extendedBankName || initialData.newStampChargeDeducted);

    const form1Submitted = Number(initialData.action ?? 0) >= 1
        || !!initialData.approveBg
        || !!initialData.reasonReq
        || initialData.status === 'ACCOUNTS_FORM_ACCEPTED'
        || initialData.status === 'ACCOUNTS_FORM_REJECTED';

    const prefilledFiles = (() => {
        const files = safeParseArray(initialData.prefilledSignedBg);
        if (files.length === 0 && initialData.bgSoftCopy) files.push(initialData.bgSoftCopy);
        return files;
    })();

    const form = useForm<BankGuaranteeEditFormValues>({
        resolver: zodResolver(BankGuaranteeEditFormSchema) as Resolver<BankGuaranteeEditFormValues>,
        defaultValues: {
            ...initialData,
            amount: initialData.amount ? Number(initialData.amount) : 0,
            bg_req: form1Submitted
                ? (initialData.reasonReq ? 'Rejected' : 'Accepted')
                : undefined,
            modification_required: hasExtensionModification ? 'Yes' : undefined,
            cashMarginPercent: initialData.cashMarginPercent ? Number(initialData.cashMarginPercent) : null,
            fdrMarginPercent: initialData.fdrMarginPercent ? Number(initialData.fdrMarginPercent) : null,
            stampCharges: initialData.stampCharges ? Number(initialData.stampCharges) : null,
            sfmsCharges: initialData.sfmsCharges ? Number(initialData.sfmsCharges) : null,
            fdrAmt: initialData.fdrAmt ? Number(initialData.fdrAmt) : null,
            fdrPer: initialData.fdrPer ? Number(initialData.fdrPer) : null,
            fdrRoi: initialData.fdrRoi ? Number(initialData.fdrRoi) : null,
            bgChargeDeducted: initialData.bgChargeDeducted ? Number(initialData.bgChargeDeducted) : null,
            stampChargesDeducted: initialData.stampChargesDeducted ? Number(initialData.stampChargesDeducted) : null,
            sfmsChargesDeducted: initialData.sfmsChargesDeducted ? Number(initialData.sfmsChargesDeducted) : null,
            otherChargesDeducted: initialData.otherChargesDeducted ? Number(initialData.otherChargesDeducted) : null,
            extendedAmount: initialData.extendedAmount ? Number(initialData.extendedAmount) : null,
            newStampChargeDeducted: initialData.newStampChargeDeducted ? Number(initialData.newStampChargeDeducted) : null,
            bgFdrCancelAmount: initialData.bgFdrCancelAmount ? Number(initialData.bgFdrCancelAmount) : null,
            issueDate: toDateString(initialData.issueDate) ?? null,
            expiryDate: toDateString(initialData.expiryDate) ?? null,
            bgDate: toDateString(initialData.bgDate) ?? null,
            validityDate: toDateString(initialData.validityDate) ?? null,
            claimExpiryDate: toDateString(initialData.claimExpiryDate) ?? null,
            bgExpiryDate: toDateString(initialData.bgExpiryDate) ?? null,
            bgClaim: toDateString(initialData.bgClaim) ?? null,
            fdrValidity: toDateString(initialData.fdrValidity) ?? null,
            extendedValidityDate: toDateString(initialData.extendedValidityDate) ?? null,
            extendedClaimExpiryDate: toDateString(initialData.extendedClaimExpiryDate) ?? null,
            bgFdrCancelDate: toDateString(initialData.bgFdrCancelDate) ?? null,
            bg_format_te: parseFileValue(initialData.bgFormatTe),
            bgPo: parseFileValue(initialData.bgPo),
            prefilled_signed_bg: prefilledFiles,
            fdr_copy: parseFileValue(initialData.fdrCopy),
            sfms_conf: parseFileValue(initialData.sfmsConf),
            docket_slip: parseFileValue(initialData.docketSlip),
            extension_letter_path: parseFileValue(initialData.extensionLetterPath),
            stamp_covering_letter: parseFileValue(initialData.stampCoveringLetter),
            cancell_confirm: parseFileValue(initialData.cancellConfirm),
            bankMailIds: initialData.bankMailIds?.length
                ? initialData.bankMailIds.map((email: string) => ({ email }))
                : [{ email: '' }],
            bankMailIdsCc: initialData.bankMailIdsCc?.length
                ? initialData.bankMailIdsCc.map((email: string) => ({ email }))
                : [{ email: '' }],
        },
    });

    const modificationRequired = useWatch({ control: form.control, name: 'modification_required' });

    const bankMailIds = useFieldArray({ control: form.control, name: 'bankMailIds' });
    const bankMailIdsCc = useFieldArray({ control: form.control, name: 'bankMailIdsCc' });

    const isStepLocked = (step: string) => {
        void step;
        return false;
    };

    const isSubmitting = form.formState.isSubmitting || updateMutation.isPending;

    const prevValues = {
        stampCharges: initialData.stampCharges,
        beneficiaryName: initialData.beneficiaryName ?? initialData.favouring,
        amount: initialData.amount,
        expiryDate: toDateString(initialData.bgExpiryDate),
        claimDate: toDateString(initialData.bgClaim),
    };

    const handleSubmit = async (values: BankGuaranteeEditFormValues) => {
        try {
            const payload: Record<string, unknown> = {};

            Object.entries(values).forEach(([key, value]) => {
                if (value instanceof File) return;

                if (Array.isArray(value) && value.length > 0 && value[0] instanceof File) return;

                if (value === undefined || value === null) return;

                if (key === 'bankMailIds' || key === 'bankMailIdsCc') return;

                if (value instanceof Date) {
                    payload[key] = value.toISOString();
                } else if (typeof value === 'object' && !Array.isArray(value)) {
                    payload[key] = String(value);
                } else if (Array.isArray(value)) {
                    payload[key] = JSON.stringify(value);
                } else {
                    payload[key] = String(value);
                }
            });

            const finalPayload: Record<string, unknown> = { ...payload };
            if (finalPayload.favouring !== undefined) {
                finalPayload.beneficiaryName = finalPayload.favouring;
            }

            if (values.bg_req === 'Accepted') {
                finalPayload.reasonReq = '';
            }

            finalPayload.bankMailIds = JSON.stringify(
                (values.bankMailIds ?? []).map((r) => r.email).filter(Boolean),
            );
            finalPayload.bankMailIdsCc = JSON.stringify(
                (values.bankMailIdsCc ?? []).map((r) => r.email).filter(Boolean),
            );

            await updateMutation.mutateAsync({ id: instrumentId, payload: finalPayload });
            toast.success('Bank Guarantee updated successfully');
            navigate(-1);
        } catch (error: any) {
            toast.error(error?.message || 'Failed to update Bank Guarantee');
            console.error('Error updating Bank Guarantee:', error);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
                <SectionCard title="EMD Request - Bank Guarantee">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <SelectField
                            control={form.control}
                            name="bgPurpose"
                            label="Purpose *"
                            options={BG_PURPOSE_OPTIONS}
                            placeholder="Select Purpose"
                        />
                        <FieldWrapper control={form.control} name="amount" label="Amount *">
                            {(field) => <NumberInput {...field} placeholder="Enter total amount" />}
                        </FieldWrapper>
                        <SelectField
                            control={form.control}
                            name="bgNeeds"
                            label="BG Needed In *"
                            options={BG_NEEDED_IN_OPTIONS}
                            placeholder="Select Timeframe"
                        />
                        <FieldWrapper control={form.control} name="favouring" label="BG in Favour of *">
                            {(field) => <Input {...field} value={field.value || ''} placeholder="e.g., Individual or Company Name" />}
                        </FieldWrapper>
                        <FieldWrapper control={form.control} name="beneficiaryAddress" label="BG Address *">
                            {(field) => <Textarea rows={2} {...field} value={field.value || ''} placeholder="e.g., Bank Name or Address" />}
                        </FieldWrapper>
                        <FieldWrapper control={form.control} name="bgExpiryDate" label="BG Expiry Date *">
                            {(field) => <DateInput value={field.value || undefined} onChange={field.onChange} />}
                        </FieldWrapper>
                        <FieldWrapper control={form.control} name="bgClaim" label="BG Claim Period *">
                            {(field) => <DateInput value={field.value || undefined} onChange={field.onChange} />}
                        </FieldWrapper>
                        <FieldWrapper control={form.control} name="stampCharges" label="Stamp Paper Value">
                            {(field) => <NumberInput min={0} {...field} value={field.value ?? 0} placeholder="0.00" />}
                        </FieldWrapper>
                        <SelectField
                            control={form.control}
                            name="bankName"
                            label="Bank *"
                            options={BANKS}
                            placeholder="Select Bank"
                        />
                        <FieldWrapper control={form.control} name="courierAddress" label="Courier Address *">
                            {(field) => <Textarea rows={2} {...field} value={field.value || ''} placeholder="e.g., Bank Name or Address" />}
                        </FieldWrapper>
                        <FieldWrapper control={form.control} name="courierDeadline" label="Courier Time (Days)" description="Enter the number of days required for the courier to deliver the BG.">
                            {(field) => <NumberInput min={1} max={10} {...field} />}
                        </FieldWrapper>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FieldWrapper control={form.control} name="bgBankAccName" label="Bank Account Name">
                            {(field) => <Input {...field} value={field.value || ''} placeholder="e.g., Individual or Company Name" />}
                        </FieldWrapper>
                        <FieldWrapper control={form.control} name="bgBankAcc" label="Bank Account Number">
                            {(field) => <Input {...field} value={field.value || ''} placeholder="e.g., 1234567890" />}
                        </FieldWrapper>
                        <FieldWrapper control={form.control} name="bgBankIfsc" label="Bank IFSC Code">
                            {(field) => <Input {...field} value={field.value || ''} placeholder="e.g., SBIN0001234" />}
                        </FieldWrapper>
                        <FieldWrapper control={form.control} name="bgClientUser" label="User Dept. Email">
                            {(field) => <Input type="email" {...field} value={field.value || ''} placeholder="e.g., user@company.com" />}
                        </FieldWrapper>
                        <FieldWrapper control={form.control} name="bgClientCp" label="C&P Dept. Email">
                            {(field) => <Input type="email" {...field} value={field.value || ''} placeholder="e.g., cp@company.com" />}
                        </FieldWrapper>
                        <FieldWrapper control={form.control} name="bgClientFin" label="Finance Dept. Email">
                            {(field) => <Input type="email" {...field} value={field.value || ''} placeholder="e.g., finance@company.com" />}
                        </FieldWrapper>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <FieldWrapper control={form.control} name="bgPo" label="PO/Tender/Request Letter">
                            {(field) => (
                                <FileUploader
                                    context="bg-po-files"
                                    value={parseFileValue(field.value)}
                                    onChange={field.onChange}
                                />
                            )}
                        </FieldWrapper>
                    </div>
                </SectionCard>

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

                <SectionCard title="Accounts Form (BG) 2 - After BG Creation">
                    <AccountsForm2Fields
                        control={form.control}
                        names={STEP_NAMES}
                    />
                </SectionCard>

                <SectionCard title="Accounts Form (BG) 3 - Capture FDR Details">
                    <AccountsForm3Fields
                        control={form.control}
                        names={STEP_NAMES}
                        disabled={isStepLocked('accounts-form-3')}
                        fdrValueType="string"
                    />
                </SectionCard>

                <SectionCard title="Initiate Followup">
                    {followupData ? (
                        <FollowupReadOnlyView data={followupData} />
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            No follow-up has been initiated for this instrument yet. Use the action form to start one.
                        </p>
                    )}
                </SectionCard>

                <SectionCard title="Request Extension">
                    <RequestExtensionFields
                        control={form.control}
                        names={STEP_NAMES}
                        modificationRequired={modificationRequired}
                        prevValues={prevValues}
                        disabled={isStepLocked('request-extension')}
                    />
                </SectionCard>

                <SectionCard title="Returned via Courier">
                    <ReturnedCourierFields
                        control={form.control}
                        names={STEP_NAMES}
                        disabled={isStepLocked('returned-courier')}
                    />
                </SectionCard>

                <SectionCard title="Request Cancellation">
                    <RequestCancellationFields
                        control={form.control}
                        names={STEP_NAMES}
                        disabled={isStepLocked('request-cancellation')}
                    />
                </SectionCard>

                <SectionCard title="BG Cancellation Confirmation">
                    <BgCancellationConfirmationFields
                        control={form.control}
                        names={STEP_NAMES}
                        disabled={isStepLocked('bg-cancellation-confirmation')}
                    />
                </SectionCard>

                <SectionCard title="FDR Cancellation Confirmation">
                    <FdrCancellationConfirmationFields
                        control={form.control}
                        names={STEP_NAMES}
                    />
                </SectionCard>

                <SectionCard title="Instrument Status">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FieldWrapper control={form.control} name="status" label="Instrument Status">
                            {(field) => <Input {...field} value={field.value || ''} placeholder="Current lifecycle status" />}
                        </FieldWrapper>
                    </div>
                </SectionCard>

                <div className="flex justify-end gap-4 pb-10">
                    <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Updating...' : 'Update Bank Guarantee'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
