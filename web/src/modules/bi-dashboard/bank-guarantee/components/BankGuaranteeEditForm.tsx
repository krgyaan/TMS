import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { SelectField } from '@/components/form/SelectField';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CompactTenderFileUploader, TenderFileUploader } from '@/components/tender-file-upload';
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
            // Normalize single-file fields to strings (CompactTenderFileUploader expects string)
            prefilled_signed_bg: initialData.prefilled_signed_bg || null,
            fdr_copy: initialData.fdr_copy || null,
            sfms_conf: initialData.sfms_conf || null,
            docket_slip: initialData.docket_slip || null,
            extension_letter_path: initialData.extension_letter_path || null,
            stamp_covering_letter: initialData.stamp_covering_letter || null,
            cancell_confirm: initialData.cancell_confirm || null,
        },
    });

    const isSubmitting = form.formState.isSubmitting || updateMutation.isPending;

    const handleSubmit = async (values: BankGuaranteeEditFormValues) => {
        try {
            const formData = new FormData();

            Object.entries(values).forEach(([key, value]) => {
                // Handle File objects
                if (value instanceof File) {
                    formData.append(key, value);
                    return;
                }

                // Handle arrays of Files
                if (Array.isArray(value) && value.length > 0 && value[0] instanceof File) {
                    value.forEach((file) => formData.append(key, file));
                    return;
                }

                // Handle all other values
                if (value === undefined || value === null) return;

                if (value instanceof Date) {
                    formData.append(key, value.toISOString());
                } else if (typeof value === 'object' && !Array.isArray(value)) {
                    // For single file paths that are already strings, don't stringify
                    formData.append(key, String(value));
                } else if (Array.isArray(value)) {
                    formData.append(key, JSON.stringify(value));
                } else {
                    formData.append(key, String(value));
                }
            });

            await updateMutation.mutateAsync({ id: instrumentId, formData });
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
                            <FieldWrapper control={form.control} name="validityDate" label="BG Expiry Date *">
                                {(field) => <DateInput value={field.value || undefined} onChange={field.onChange} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="claimExpiryDate" label="BG Claim Period *">
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
                            <FieldWrapper control={form.control} name="beneficiaryName" label="Bank Account Name">
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
                                    <TenderFileUploader
                                        context="bg-format-files"
                                        value={parseFileValue(field.value)}
                                        onChange={field.onChange}
                                    />
                                )}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="bgPo" label="PO/Tender/Request Letter">
                                {(field) => (
                                    <TenderFileUploader
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
                                    <CompactTenderFileUploader
                                        context="bg-prefilled-signed"
                                        value={field.value || undefined}
                                        onChange={field.onChange}
                                    />
                                )}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="fdr_copy" label="FDR Copy">
                                {(field) => (
                                    <CompactTenderFileUploader
                                        context="bg-fdr-copy"
                                        value={field.value || undefined}
                                        onChange={field.onChange}
                                    />
                                )}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="sfms_conf" label="SFMS Confirmation">
                                {(field) => (
                                    <CompactTenderFileUploader
                                        context="bg-sfms-conf"
                                        value={field.value || undefined}
                                        onChange={field.onChange}
                                    />
                                )}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="docket_slip" label="Docket Slip">
                                {(field) => (
                                    <CompactTenderFileUploader
                                        context="bg-docket-slip"
                                        value={field.value || undefined}
                                        onChange={field.onChange}
                                    />
                                )}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="extension_letter_path" label="Extension Letter">
                                {(field) => (
                                    <CompactTenderFileUploader
                                        context="bg-ext-letter"
                                        value={field.value || undefined}
                                        onChange={field.onChange}
                                    />
                                )}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="stamp_covering_letter" label="Cancellation Letter">
                                {(field) => (
                                    <CompactTenderFileUploader
                                        context="bg-stamp-covering-letter"
                                        value={field.value || undefined}
                                        onChange={field.onChange}
                                    />
                                )}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="cancell_confirm" label="Bank Cancellation Confirmation">
                                {(field) => (
                                    <CompactTenderFileUploader
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
