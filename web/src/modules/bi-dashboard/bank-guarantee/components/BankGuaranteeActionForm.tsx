import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, type Resolver } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { SelectField } from '@/components/form/SelectField';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CompactFileUploader, FileUploader } from '@/components/file-upload';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ContactPersonFields } from '@/components/form/ContactPersonFields';
import { FollowUpFrequencySelect } from '@/components/form/FollowUpFrequencySelect';
import { StopReasonFields } from '@/components/form/StopReasonFields';
import { ConditionalSection } from '@/components/form/ConditionalSection';
import { NumberInput } from '@/components/form/NumberInput';
import DateInput from '@/components/form/DateInput';
import { BankGuaranteeActionFormSchema, type BankGuaranteeActionFormValues } from '../helpers/bankGuaranteeActionForm.schema';
import { useUpdateBankGuaranteeAction, useBGActionFormData } from '@/hooks/api/useBankGuarantees';
import type { Checkpoint } from '@/components/tendering/SubmissionChecklist';
import { useCourierOptions } from '@/modules/shared/courier/courier.hooks';
import { CheckCircle2, Plus, Trash2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useWatch } from 'react-hook-form';

const FDR_PERCENTAGE_OPTIONS = [
    { value: '10', label: '10%' },
    { value: '15', label: '15%' },
    { value: '100', label: '100%' },
];

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
    const bgReq = useWatch({ control: form.control, name: 'bg_req' });
    const approveBg = useWatch({ control: form.control, name: 'approve_bg' });
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
    const isReadOnly = !!(filledFlag && formData?.[filledFlag]);

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
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [action, formData]);

    const isSubmitting = form.formState.isSubmitting || updateMutation.isPending;

    const handleSubmit = async (values: BankGuaranteeActionFormValues) => {
        if (isReadOnly) return;
        try {
            const payload: Record<string, unknown> = {};

            Object.entries(values).forEach(([key, value]) => {
                // Skip follow-up fields - handled by different service
                if (key === 'contacts' ||
                    key === 'organisation_name' ||
                    key === 'followup_start_date' ||
                    key === 'frequency' ||
                    key === 'stop_reason' ||
                    key === 'proof_text' ||
                    key === 'stop_remarks' ||
                    key === 'proof_image') {
                    return;
                }

                // Repeatable bank mail id rows -- handled explicitly below so the
                // generic loop doesn't JSON-stringify the raw row objects.
                if (key === 'bank_mail_ids' || key === 'bank_mail_ids_cc') {
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

                        <FieldWrapper control={form.control} name="bg_req" label="BG Request">
                            {(field) => (
                                <RadioGroup
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    className="flex gap-6"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Accepted" id="bg_req_accepted" />
                                        <Label htmlFor="bg_req_accepted">Accepted</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Rejected" id="bg_req_rejected" />
                                        <Label htmlFor="bg_req_rejected">Rejected</Label>
                                    </div>
                                </RadioGroup>
                            )}
                        </FieldWrapper>

                        {/* Row 1 — FDR % and Approved BG Format */}
                        {bgReq === 'Accepted' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start pt-3">
                                <SelectField
                                    label="FDR %"
                                    control={form.control}
                                    name="bg_approved_fdr_per"
                                    options={FDR_PERCENTAGE_OPTIONS}
                                    placeholder="Select percentage"
                                    valueType="string"
                                />
                                <SelectField
                                    label="Approved BG Format"
                                    control={form.control}
                                    name="approve_bg"
                                    options={[{ value: 'Accept the BG given by TE', label: 'Accept the BG given by TE' }, { value: 'Upload by Imran', label: 'Upload by Imran' }]}
                                    placeholder="Select an option"
                                />
                            </div>
                        )}

                        {/* Row 2 — rejection reason, or the file uploaders */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start pt-3">
                            {bgReq === 'Rejected' && (
                                <FieldWrapper
                                    control={form.control}
                                    name="reason_req"
                                    label="Reason for Rejection *"
                                    className="md:col-span-2"
                                >
                                    {(field) => (
                                        <Textarea
                                            {...field}
                                            placeholder="Enter reason for rejection"
                                            className="min-h-[80px]"
                                        />
                                    )}
                                </FieldWrapper>
                            )}
                            {bgReq === 'Accepted' && (
                                <FieldWrapper control={form.control} name="prefilled_signed_bg" label="Prefilled Bank Formats">
                                    {(field) => (
                                        <FileUploader
                                            context="bg-prefilled-signed"
                                            value={field.value || []}
                                            onChange={field.onChange}
                                        />
                                    )}
                                </FieldWrapper>
                            )}
                            {approveBg === 'Upload by Imran' && (
                                <FieldWrapper control={form.control} name="bg_format_imran" label="Upload Documents *">
                                    {(field) => (
                                        <FileUploader
                                            context="bg-format-imran"
                                            value={field.value}
                                            onChange={field.onChange}
                                        />
                                    )}
                                </FieldWrapper>
                            )}

                        </div>

                        {/* Bank Mail Ids / CC -- capture only for now; the
                            notification service does not read these yet. */}
                        <div className="space-y-6 pt-4">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h4 className="font-semibold text-base text-primary">Bank Mail Ids</h4>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => bankMailIds.append({ email: '' })}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add
                                </Button>
                            </div>
                            {bankMailIds.fields.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    No mail ids added. Click &quot;Add&quot; to add one.
                                </p>
                            )}
                            <div className="flex flex-wrap items-end gap-2">
                                {bankMailIds.fields.map((field, index) => (
                                    <div key={field.id} className="flex items-center gap-1 w-full sm:w-72">
                                        <FieldWrapper
                                            control={form.control}
                                            name={`bank_mail_ids.${index}.email`}
                                            label=""
                                        >
                                            {(f) => (
                                                <Input
                                                    {...f}
                                                    value={f.value ?? ''}
                                                    type="email"
                                                    placeholder="e.g., bank.manager@bank.com"
                                                />
                                            )}
                                        </FieldWrapper>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => bankMailIds.remove(index)}
                                            className="text-destructive hover:text-destructive shrink-0"
                                            aria-label="Remove mail id"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-6 pt-4">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h4 className="font-semibold text-base text-primary">Bank Mail Ids CC</h4>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => bankMailIdsCc.append({ email: '' })}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add
                                </Button>
                            </div>
                            {bankMailIdsCc.fields.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    No CC mail ids added. Click &quot;Add&quot; to add one.
                                </p>
                            )}
                            <div className="flex flex-wrap items-end gap-2">
                                {bankMailIdsCc.fields.map((field, index) => (
                                    <div key={field.id} className="flex items-center gap-1 w-full sm:w-72">
                                        <FieldWrapper
                                            control={form.control}
                                            name={`bank_mail_ids_cc.${index}.email`}
                                            label=""
                                        >
                                            {(f) => (
                                                <Input
                                                    {...f}
                                                    value={f.value ?? ''}
                                                    type="email"
                                                    placeholder="e.g., branch@bank.com"
                                                />
                                            )}
                                        </FieldWrapper>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => bankMailIdsCc.remove(index)}
                                            className="text-destructive hover:text-destructive shrink-0"
                                            aria-label="Remove CC mail id"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </ConditionalSection>

                {/* Accounts Form (BG) 2 - After BG Creation */}
                <ConditionalSection show={action === 'accounts-form-2'}>
                    <div className="space-y-4 border rounded-lg p-4">
                        <h4 className="font-semibold text-base">Accounts Form (BG) 2 - After BG Creation</h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <FieldWrapper control={form.control} name="bg_no" label="BG No.">
                                {(field) => <Input {...field} placeholder="Enter BG number" />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="bg_date" label="BG Creation Date">
                                {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="bg_validity" label="BG Validity">
                                {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="bg_claim_period" label="BG Claim Period Expiry">
                                {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                            </FieldWrapper>
                            <SelectField
                                label="Courier Request No."
                                control={form.control}
                                name="courier_no"
                                options={courierOptions}
                                placeholder="Select courier request number"
                                valueType="string"
                            />

                            <FieldWrapper control={form.control} name="bg2_remark" label="Remarks">
                                {(field) => (
                                    <Textarea {...field} placeholder="Enter remarks" className="min-h-[80px]" />
                                )}
                            </FieldWrapper>
                        </div>

                    </div>
                </ConditionalSection>

                {/* Accounts Form (BG) 3 - Capture FDR Details */}
                <ConditionalSection show={action === 'accounts-form-3'}>
                    <div className="space-y-4 border rounded-lg p-4">
                        <h4 className="font-semibold text-base">Accounts Form (BG) 3 - Capture FDR Details</h4>


                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 gap-y-4 items-start">
                            <SelectField
                                label="FDR Percentage"
                                control={form.control}
                                name="fdr_per"
                                options={FDR_PERCENTAGE_OPTIONS}
                                placeholder="Select percentage"
                                valueType="string"
                            />
                            <FieldWrapper control={form.control} name="fdr_amt" label="FDR Amount">
                                {(field) => <NumberInput {...field} placeholder="Enter amount" />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="fdr_copy" label="FDR Copy">
                                {(field) => (
                                    <CompactFileUploader
                                        context="bg-fdr-copy"
                                        value={field.value}
                                        onChange={field.onChange}
                                    />
                                )}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="sfms_conf" label="SFMS Confirmation">
                                {(field) => (
                                    <CompactFileUploader
                                        context="bg-sfms-conf"
                                        value={field.value}
                                        onChange={field.onChange}
                                    />
                                )}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="fdr_no" label="FDR No.">
                                {(field) => <Input {...field} placeholder="Enter FDR number" />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="fdr_validity" label="FDR Validity">
                                {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="fdr_roi" label="FDR ROI%">
                                {(field) => <NumberInput {...field} placeholder="Enter ROI" />}
                            </FieldWrapper>
                        </div>

                        <h5 className="font-medium text-sm mt-4">Charges</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FieldWrapper control={form.control} name="bg_charge_deducted" label="BG Charges Deducted">
                                {(field) => <NumberInput {...field} placeholder="Enter charges" />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="sfms_charge_deducted" label="SFMS Charges Deducted">
                                {(field) => <NumberInput {...field} placeholder="Enter charges" />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="stamp_charge_deducted" label="Stamp Paper Charges Deducted">
                                {(field) => <NumberInput {...field} placeholder="Enter charges" />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="other_charge_deducted" label="Other Charges Deducted">
                                {(field) => <NumberInput {...field} placeholder="Enter charges" />}
                            </FieldWrapper>
                        </div>
                    </div>
                </ConditionalSection>

                {/* Initiate Followup */}
                <ConditionalSection show={action === 'initiate-followup'}>
                    <div className="space-y-4 border rounded-lg p-4">
                        <h4 className="font-semibold text-base">Initiate Followup</h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start pt-3 gap-y-4">
                            <FieldWrapper control={form.control} name="organisation_name" label="Organisation Name">
                                {(field) => <Input {...field} placeholder="Enter organisation name" />}
                            </FieldWrapper>
                            <div className="col-span-3">
                                <ContactPersonFields control={form.control} name="contacts" />
                            </div>
                            <FieldWrapper control={form.control} name="followup_start_date" label="Follow-up Start Date">
                                {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                            </FieldWrapper>
                            <FollowUpFrequencySelect control={form.control} name="frequency" />
                            <div className="col-span-3">
                                <StopReasonFields
                                    control={form.control}
                                    frequencyFieldName="frequency"
                                    stopReasonFieldName="stop_reason"
                                    proofTextFieldName="proof_text"
                                    stopRemarksFieldName="stop_remarks"
                                    proofImageFieldName="proof_image"
                                />
                            </div>
                        </div>
                    </div>
                </ConditionalSection>

                {/* Request Extension */}
                <ConditionalSection show={action === 'request-extension'}>
                    <div className="space-y-4 border rounded-lg p-4">
                        <h4 className="font-semibold text-base">Request Extension</h4>

                        <FieldWrapper control={form.control} name="modification_required" label="Modification Required">
                            {(field) => (
                                <RadioGroup
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    className="flex gap-6"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Yes" id="mod_yes" />
                                        <Label htmlFor="mod_yes">Yes</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="No" id="mod_no" />
                                        <Label htmlFor="mod_no">No</Label>
                                    </div>
                                </RadioGroup>
                            )}
                        </FieldWrapper>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start pt-3 gap-y-4">
                            <FieldWrapper control={form.control} name="ext_letter" label="Request Letter/email from Client">
                                {(field) => (
                                    <CompactFileUploader
                                        context="bg-ext-letter"
                                        value={field.value}
                                        onChange={field.onChange}
                                    />
                                )}
                            </FieldWrapper>

                            {modificationRequired === 'Yes' && (
                                <>
                                    <div className='space-y-4 border rounded-lg p-4 bg-red-200/10'>
                                        <Label className="text-base font-semibold">Previous Values</Label>
                                        <div className="grid grid-cols-1 gap-4">
                                            <FieldWrapper control={form.control} name="stamp_charge_deducted" label="Stamp Paper Amount">
                                                {(field) => <NumberInput {...field} placeholder="Enter amount" />}
                                            </FieldWrapper>
                                            <FieldWrapper control={form.control} name="bg_favouring" label="Beneficiary Name">
                                                {(field) => <Input {...field} placeholder="Enter beneficiary name" />}
                                            </FieldWrapper>
                                            <FieldWrapper control={form.control} name="amount" label="Amount">
                                                {(field) => <NumberInput {...field} placeholder="Enter amount" />}
                                            </FieldWrapper>
                                            <FieldWrapper control={form.control} name="bg_validity" label="Expiry Date">
                                                {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                                            </FieldWrapper>
                                            <FieldWrapper control={form.control} name="bg_claim_period" label="Claim Date">
                                                {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                                            </FieldWrapper>
                                        </div>
                                    </div>
                                    <div className="space-y-4 border rounded-lg p-4 bg-green-200/10">
                                        <Label className="text-base font-semibold">New Values</Label>
                                        <div className="grid grid-cols-1 gap-4">
                                            <FieldWrapper control={form.control} name="new_stamp_charge_deducted" label="Stamp Paper Amount">
                                                {(field) => <NumberInput {...field} placeholder="Enter amount" />}
                                            </FieldWrapper>
                                            <FieldWrapper control={form.control} name="new_bg_bank_name" label="Beneficiary Name">
                                                {(field) => <Input {...field} placeholder="Enter beneficiary name" />}
                                            </FieldWrapper>
                                            <FieldWrapper control={form.control} name="new_bg_amt" label="Amount">
                                                {(field) => <NumberInput {...field} placeholder="Enter amount" />}
                                            </FieldWrapper>
                                            <FieldWrapper control={form.control} name="new_bg_expiry" label="Expiry Date">
                                                {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                                            </FieldWrapper>
                                            <FieldWrapper control={form.control} name="new_bg_claim" label="Claim Date">
                                                {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                                            </FieldWrapper>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </ConditionalSection>

                {/* Returned via courier */}
                <ConditionalSection show={action === 'returned-courier'}>
                    <div className="space-y-4 border rounded-lg p-4">
                        <h4 className="font-semibold text-base">Returned via Courier</h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start pt-3 gap-y-4">
                            <FieldWrapper control={form.control} name="docket_no" label="Docket No.">
                                {(field) => <Input {...field} placeholder="Enter docket number" />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="docket_slip" label="Upload Docket Slip">
                                {(field) => (
                                    <CompactFileUploader
                                        context="bg-docket-slip"
                                        value={field.value}
                                        onChange={field.onChange}
                                    />
                                )}
                            </FieldWrapper>
                        </div>
                    </div>
                </ConditionalSection>

                {/* Request Cancellation */}
                <ConditionalSection show={action === 'request-cancellation'}>
                    <div className="space-y-4 border rounded-lg p-4">
                        <h4 className="font-semibold text-base">Request Cancellation</h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start pt-3 gap-y-4">
                            <FieldWrapper control={form.control} name="stamp_covering_letter" label="Upload a Signed, Stamped Covering Letter">
                                {(field) => (
                                    <CompactFileUploader
                                        context="bg-stamp-covering-letter"
                                        value={field.value}
                                        onChange={field.onChange}
                                    />
                                )}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="cancel_remark" label="Remarks">
                                {(field) => (
                                    <Textarea {...field} placeholder="Enter remarks" className="min-h-[80px]" />
                                )}
                            </FieldWrapper>
                        </div>
                    </div>
                </ConditionalSection>

                {/* BG Cancellation Confirmation */}
                <ConditionalSection show={action === 'bg-cancellation-confirmation'}>
                    <div className="space-y-4 border rounded-lg p-4">
                        <h4 className="font-semibold text-base">BG Cancellation Confirmation</h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start pt-3 gap-y-4">
                            <FieldWrapper control={form.control} name="cancell_confirm" label="Upload the Bank BG cancellation request">
                                {(field) => (
                                    <CompactFileUploader
                                        context="bg-cancell-confirm"
                                        value={field.value}
                                        onChange={field.onChange}
                                    />
                                )}
                            </FieldWrapper>
                        </div>
                    </div>
                </ConditionalSection>

                {/* FDR Cancellation Confirmation */}
                <ConditionalSection show={action === 'fdr-cancellation-confirmation'}>
                    <div className="space-y-4 border rounded-lg p-4">
                        <h4 className="font-semibold text-base">FDR Cancellation Confirmation</h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start pt-3 gap-y-4">
                            <FieldWrapper control={form.control} name="bg_fdr_cancel_date" label="Date">
                                {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="bg_fdr_cancel_amount" label="Amount credited">
                                {(field) => <NumberInput {...field} placeholder="Enter amount" />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="bg_fdr_cancel_ref_no" label="Bank reference No">
                                {(field) => <Input {...field} placeholder="Enter reference number" />}
                            </FieldWrapper>
                        </div>
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
