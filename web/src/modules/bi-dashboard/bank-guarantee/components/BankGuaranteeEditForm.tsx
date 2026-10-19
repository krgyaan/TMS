import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useFieldArray, useForm, type Resolver } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { SelectField } from '@/components/form/SelectField';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FileUploader } from '@/components/file-upload';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/form/NumberInput';
import DateInput from '@/components/form/DateInput';
import { BankGuaranteeEditFormSchema, type BankGuaranteeEditFormValues } from '../helpers/bankGuaranteeEditForm.schema';
import { useUpdateBankGuarantee, useBGFollowupData } from '@/hooks/api/useBankGuarantees';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BG_PURPOSE_OPTIONS, BG_NEEDED_IN_OPTIONS, BANKS } from '@/modules/tendering/emds-tenderfees/constants';
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
    bgNo: 'bgNo',
    bgDate: 'bgDate',
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
    docketNo: 'docketNo',
    docketSlip: 'docket_slip',
    stampCoveringLetter: 'stamp_covering_letter',
    cancelRemark: 'cancelRemark',
    cancellationLetterPath: 'cancellation_letter_path',
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

const ReadOnlyField = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div className="grid gap-2">
        <Label>{label}</Label>
        <Input value={value == null ? '' : String(value)} readOnly tabIndex={-1} className="bg-muted" />
    </div>
);

interface BankGuaranteeEditFormProps {
    instrumentId: number;
    initialData: any;
}

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

export function BankGuaranteeEditForm({ instrumentId, initialData }: BankGuaranteeEditFormProps) {
    const navigate = useNavigate();
    const updateMutation = useUpdateBankGuarantee();
    const { data: followupData } = useBGFollowupData(instrumentId);

    const form = useForm<BankGuaranteeEditFormValues>({
        resolver: zodResolver(BankGuaranteeEditFormSchema) as Resolver<BankGuaranteeEditFormValues>,
        defaultValues: {
            ...initialData,
            amount: initialData.amount ? Number(initialData.amount) : 0,
            bg_req: (initialData.approveBg || initialData.reasonReq)
                ? (initialData.reasonReq ? 'Rejected' : 'Accepted')
                : undefined,
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
            // Normalize multi-file fields to arrays
            bg_format_te: parseFileValue(initialData.bg_format_te),
            bgPo: parseFileValue(initialData.bgPo),
            // Normalize single-file fields to strings (CompactFileUploader expects string)
            prefilled_signed_bg: initialData.prefilled_signed_bg || null,
            fdr_copy: initialData.fdr_copy || null,
            sfms_conf: initialData.sfms_conf || null,
            docket_slip: initialData.docket_slip || null,
            extension_letter_path: initialData.extension_letter_path || null,
            stamp_covering_letter: initialData.stamp_covering_letter || null,
            cancell_confirm: initialData.cancell_confirm || null,
            // Bank mail ids arrive as string[] from the API; useFieldArray needs
            // row objects. Fall back to one blank row when nothing is stored.
            bankMailIds: initialData.bankMailIds?.length
                ? initialData.bankMailIds.map((email: string) => ({ email }))
                : [{ email: '' }],
            bankMailIdsCc: initialData.bankMailIdsCc?.length
                ? initialData.bankMailIdsCc.map((email: string) => ({ email }))
                : [{ email: '' }],
        },
    });

    const bankMailIds = useFieldArray({ control: form.control, name: 'bankMailIds' });
    const bankMailIdsCc = useFieldArray({ control: form.control, name: 'bankMailIdsCc' });

    const isSubmitting = form.formState.isSubmitting || updateMutation.isPending;

    const handleSubmit = async (values: BankGuaranteeEditFormValues) => {
        try {
            const payload: Record<string, unknown> = {};

            Object.entries(values).forEach(([key, value]) => {
                // Handle File objects (shouldn't happen - FileUploader returns paths)
                if (value instanceof File) return;

                // Handle arrays of Files
                if (Array.isArray(value) && value.length > 0 && value[0] instanceof File) return;

                // Handle all other values
                if (value === undefined || value === null) return;

                // Repeatable bank mail id rows -- serialized explicitly below so
                // the generic loop doesn't stringify the raw row objects.
                if (key === 'bankMailIds' || key === 'bankMailIdsCc') return;

                if (value instanceof Date) {
                    payload[key] = value.toISOString();
                } else if (typeof value === 'object' && !Array.isArray(value)) {
                    // For single file paths that are already strings, don't stringify
                    payload[key] = String(value);
                } else if (Array.isArray(value)) {
                    payload[key] = JSON.stringify(value);
                } else {
                    payload[key] = String(value);
                }
            });

            // `payment_instruments.favouring` (the "BG in Favour of" input above) and
            // `instrument_bg_details.beneficiary_name` are two mirrors of the same
            // value -- create writes both from bgFavouring (payment-requests
            // command.service.ts :580 and :635), as does update (:862 / :923).
            // There is deliberately no separate Beneficiary Name input here, so
            // mirror the value across to keep the BG dashboard's "Beneficiary
            // name" column populated from this single field.
            const finalPayload: Record<string, unknown> = { ...payload };
            if (finalPayload.favouring !== undefined) {
                finalPayload.beneficiaryName = finalPayload.favouring;
            }

            if (values.bg_req === 'Accepted') {
                finalPayload.reasonReq = '';
            }

            // Flatten the bank mail rows to plain address lists. Blank rows are
            // dropped; an emptied list serializes to [] so it actually clears.
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

                {/* Section 1: EMD request Bank Guarantee form */}
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

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <FieldWrapper control={form.control} name="bg_format_te" label="BG Format (Max 5 files)">
                                {(field) => (
                                    <FileUploader
                                        context="bg-format-files"
                                        value={parseFileValue(field.value)}
                                        onChange={field.onChange}
                                    />
                                )}
                            </FieldWrapper>
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

                {/* Section 2: Accounts Form (BG) 1 - Request to Bank */}
                <SectionCard title="Accounts Form (BG) 1 - Request to Bank">
                    <AccountsForm1Fields
                        control={form.control}
                        names={STEP_NAMES}
                        bankMailIds={bankMailIds}
                        bankMailIdsCc={bankMailIdsCc}
                        prefilledMode="single"
                    />
                </SectionCard>

                {/* Section 3: Accounts Form (BG) 2 - After BG Creation */}
                <SectionCard title="Accounts Form (BG) 2 - After BG Creation">
                    <AccountsForm2Fields
                        control={form.control}
                        names={STEP_NAMES}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ReadOnlyField label="Validity Date" value={initialData.validityDate} />
                        <ReadOnlyField label="Claim Expiry Date" value={initialData.claimExpiryDate} />
                    </div>
                </SectionCard>

                {/* Section 4: Accounts Form (BG) 3 - Capture FDR Details */}
                <SectionCard title="Accounts Form (BG) 3 - Capture FDR Details">
                    <AccountsForm3Fields
                        control={form.control}
                        names={STEP_NAMES}
                    />
                </SectionCard>

                {/* Section 5: Initiate Followup */}
                <SectionCard title="Initiate Followup">
                    {followupData ? (
                        <FollowupReadOnlyView data={followupData} />
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            No follow-up has been initiated for this instrument yet. Use the action form to start one.
                        </p>
                    )}
                </SectionCard>

                {/* Section 6: Request Extension */}
                <SectionCard title="Request Extension">
                    <RequestExtensionFields
                        control={form.control}
                        names={STEP_NAMES}
                    />
                </SectionCard>

                {/* Section 7: Returned via Courier */}
                <SectionCard title="Returned via Courier">
                    <ReturnedCourierFields
                        control={form.control}
                        names={STEP_NAMES}
                    />
                </SectionCard>

                {/* Section 8: Request Cancellation */}
                <SectionCard title="Request Cancellation">
                    <RequestCancellationFields
                        control={form.control}
                        names={STEP_NAMES}
                    />
                </SectionCard>

                {/* Section 9: BG Cancellation Confirmation */}
                <SectionCard title="BG Cancellation Confirmation">
                    <BgCancellationConfirmationFields
                        control={form.control}
                        names={STEP_NAMES}
                    />
                </SectionCard>

                {/* Section 10: FDR Cancellation Confirmation */}
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
