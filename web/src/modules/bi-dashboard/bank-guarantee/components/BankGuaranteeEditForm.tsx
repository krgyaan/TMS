import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, type Resolver } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { SelectField } from '@/components/form/SelectField';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CompactFileUploader, FileUploader } from '@/components/file-upload';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/form/NumberInput';
import DateInput from '@/components/form/DateInput';
import { BankGuaranteeEditFormSchema, type BankGuaranteeEditFormValues } from '../helpers/bankGuaranteeEditForm.schema';
import { useUpdateBankGuarantee } from '@/hooks/api/useBankGuarantees';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BG_PURPOSE_OPTIONS, BG_NEEDED_IN_OPTIONS, BANKS } from '@/modules/tendering/emds-tenderfees/constants';
import { Plus, Trash2 } from 'lucide-react';

const FDR_PERCENTAGE_OPTIONS = [
    { value: '10', label: '10%' },
    { value: '15', label: '15%' },
    { value: '100', label: '100%' },
];

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

    const form = useForm<BankGuaranteeEditFormValues>({
        resolver: zodResolver(BankGuaranteeEditFormSchema) as Resolver<BankGuaranteeEditFormValues>,
        defaultValues: {
            ...initialData,
            amount: initialData.amount ? Number(initialData.amount) : 0,
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

                {/* Section 1: Request Form (Based on EmdSection.tsx) */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Request Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
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

                        {/* Bank Mail Ids / CC -- capture only for now; the
                            notification service does not read these yet. */}
                        <div className="space-y-6">
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
                                    No mail ids stored. Click &quot;Add&quot; to add one.
                                </p>
                            )}
                            <div className="flex flex-wrap items-end gap-2">
                                {bankMailIds.fields.map((field, index) => (
                                    <div key={field.id} className="flex items-center gap-1 w-full sm:w-72">
                                        <FieldWrapper control={form.control} name={`bankMailIds.${index}.email`} label="">
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

                        <div className="space-y-6">
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
                                    No CC mail ids stored. Click &quot;Add&quot; to add one.
                                </p>
                            )}
                            <div className="flex flex-wrap items-end gap-2">
                                {bankMailIdsCc.fields.map((field, index) => (
                                    <div key={field.id} className="flex items-center gap-1 w-full sm:w-72">
                                        <FieldWrapper control={form.control} name={`bankMailIdsCc.${index}.email`} label="">
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
                    </CardContent>
                </Card>

                {/* Section 2: Action Forms (Post-Request Info) */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Action Information (Accounts & Post-Creation)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        {/* Status Group */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                            <FieldWrapper control={form.control} name="bg_req" label="BG Request (Initial Approval)">
                                {(field) => (
                                    <RadioGroup
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        className="flex gap-6 pt-2 pb-1"
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
                            <FieldWrapper control={form.control} name="reasonReq" label="Rejection Reason">
                                {(field) => <Input {...field} value={field.value || ''} placeholder="If rejected, enter reason" />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="status" label="Instrument Status">
                                {(field) => <Input {...field} value={field.value || ''} placeholder="Current lifecycle status" />}
                            </FieldWrapper>
                        </div>

                        <Separator />

                        {/* BG Details after creation */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <FieldWrapper control={form.control} name="bgNo" label="BG Number">
                                {(field) => <Input {...field} value={field.value || ''} placeholder="Post-creation number" />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="bgDate" label="BG Creation Date">
                                {(field) => <DateInput value={field.value || undefined} onChange={field.onChange} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="utr" label="UTR / Reference No.">
                                {(field) => <Input {...field} value={field.value || ''} placeholder="Bank transaction ref" />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="courierNo" label="Courier Request No.">
                                {(field) => <Input {...field} value={field.value || ''} placeholder="Internal courier reference" />}
                            </FieldWrapper>
                        </div>

                        <Separator />

                        {/* FDR & Charges Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <SelectField
                                control={form.control}
                                name="fdrPer"
                                label="FDR Percentage"
                                options={FDR_PERCENTAGE_OPTIONS}
                                placeholder="Select %"
                            />
                            <FieldWrapper control={form.control} name="fdrAmt" label="FDR Amount">
                                {(field) => <NumberInput {...field} placeholder="0.00" />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="fdrNo" label="FDR Number">
                                {(field) => <Input {...field} value={field.value || ''} placeholder="Enter FDR No" />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="fdrRoi" label="FDR ROI %">
                                {(field) => <NumberInput {...field} placeholder="0.00" />}
                            </FieldWrapper>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <FieldWrapper control={form.control} name="bgChargeDeducted" label="BG Charges Deducted">
                                {(field) => <NumberInput {...field} placeholder="0.00" />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="stampChargesDeducted" label="Stamp Paper Deducted">
                                {(field) => <NumberInput {...field} placeholder="0.00" />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="sfmsChargesDeducted" label="SFMS Charges Deducted">
                                {(field) => <NumberInput {...field} placeholder="0.00" />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="otherChargesDeducted" label="Other Charges Deducted">
                                {(field) => <NumberInput {...field} placeholder="0.00" />}
                            </FieldWrapper>
                        </div>

                        <Separator />

                        {/* Extension Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <FieldWrapper control={form.control} name="modification_required" label="Extension Modification Needed">
                                {(field) => (
                                    <RadioGroup
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        className="flex gap-6 pt-2 pb-1"
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
                            <FieldWrapper control={form.control} name="extendedAmount" label="New Extended Amount">
                                {(field) => <NumberInput {...field} placeholder="0.00" />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="extendedValidityDate" label="New Expiry Date">
                                {(field) => <DateInput value={field.value || undefined} onChange={field.onChange} />}
                            </FieldWrapper>
                        </div>

                        <Separator />

                        {/* Return & Cancellation */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <FieldWrapper control={form.control} name="docketNo" label="Docket No. (Return)">
                                {(field) => <Input {...field} value={field.value || ''} placeholder="Return tracking number" />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="bgFdrCancelDate" label="FDR Cancellation Date">
                                {(field) => <Input {...field} value={field.value || ''} placeholder="YYYY-MM-DD" />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="bgFdrCancelAmount" label="FDR Credited Amount">
                                {(field) => <NumberInput {...field} value={field.value ?? 0} placeholder="0.00" />}
                            </FieldWrapper>
                            <div className="col-span-1 md:col-span-3">
                                <FieldWrapper control={form.control} name="cancelRemark" label="Cancellation / General Remarks">
                                    {(field) => <Textarea {...field} value={field.value || ''} placeholder="Any additional notes..." className="min-h-[80px]" />}
                                </FieldWrapper>
                            </div>
                        </div>

                        <Separator />

                        {/* Action Documents */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            <FieldWrapper control={form.control} name="prefilled_signed_bg" label="Signed Bank Formats">
                                {(field) => (
                                    <CompactFileUploader
                                        context="bg-prefilled-signed"
                                        value={field.value || undefined}
                                        onChange={field.onChange}
                                    />
                                )}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="fdr_copy" label="FDR Copy">
                                {(field) => (
                                    <CompactFileUploader
                                        context="bg-fdr-copy"
                                        value={field.value || undefined}
                                        onChange={field.onChange}
                                    />
                                )}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="sfms_conf" label="SFMS Confirmation">
                                {(field) => (
                                    <CompactFileUploader
                                        context="bg-sfms-conf"
                                        value={field.value || undefined}
                                        onChange={field.onChange}
                                    />
                                )}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="docket_slip" label="Docket Slip">
                                {(field) => (
                                    <CompactFileUploader
                                        context="bg-docket-slip"
                                        value={field.value || undefined}
                                        onChange={field.onChange}
                                    />
                                )}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="extension_letter_path" label="Extension Letter">
                                {(field) => (
                                    <CompactFileUploader
                                        context="bg-ext-letter"
                                        value={field.value || undefined}
                                        onChange={field.onChange}
                                    />
                                )}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="stamp_covering_letter" label="Cancellation Letter">
                                {(field) => (
                                    <CompactFileUploader
                                        context="bg-stamp-covering-letter"
                                        value={field.value || undefined}
                                        onChange={field.onChange}
                                    />
                                )}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="cancell_confirm" label="Bank Cancellation Confirmation">
                                {(field) => (
                                    <CompactFileUploader
                                        context="bg-cancell-confirm"
                                        value={field.value || undefined}
                                        onChange={field.onChange}
                                    />
                                )}
                            </FieldWrapper>
                        </div>
                    </CardContent>
                </Card>

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
