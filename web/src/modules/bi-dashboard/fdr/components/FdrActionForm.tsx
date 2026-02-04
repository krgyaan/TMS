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
import { ContactPersonFields } from '@/components/form/ContactPersonFields';
import { FollowUpFrequencySelect } from '@/components/form/FollowUpFrequencySelect';
import { StopReasonFields } from '@/components/form/StopReasonFields';
import { ConditionalSection } from '@/components/form/ConditionalSection';
import { NumberInput } from '@/components/form/NumberInput';
import DateInput from '@/components/form/DateInput';
import { FdrActionFormSchema, type FdrActionFormValues } from '../helpers/fdrActionForm.schema';
import { useUpdateFdrAction } from '@/hooks/api/useFdrs';
import { toast } from 'sonner';
import { useWatch } from 'react-hook-form';

const ACTION_OPTIONS = [
    { value: 'accounts-form-1', label: 'Accounts Form (FDR)' },
    { value: 'initiate-followup', label: 'Initiate Followup' },
    { value: 'returned-courier', label: 'Returned via courier' },
    { value: 'returned-bank-transfer', label: 'Returned via Bank Transfer' },
    { value: 'settled', label: 'Settled with Project Account' },
    { value: 'request-cancellation', label: 'Send FDR Cancellation Request' },
    { value: 'fdr-cancellation-confirmation', label: 'FDR cancelled at Branch' },
];

interface FdrActionFormProps {
    instrumentId: number;
    instrumentData?: {
        fdrNo?: string;
        fdrDate?: Date;
        amount?: number;
        tenderName?: string;
        tenderNo?: string;
    };
}

export function FdrActionForm({ instrumentId, instrumentData }: FdrActionFormProps) {
    const navigate = useNavigate();
    const updateMutation = useUpdateFdrAction();

    const form = useForm<FdrActionFormValues>({
        resolver: zodResolver(FdrActionFormSchema) as Resolver<FdrActionFormValues>,
        defaultValues: {
            action: '',
            contacts: [],
        },
    });

    const action = useWatch({ control: form.control, name: 'action' });
    const fdrReq = useWatch({ control: form.control, name: 'fdr_req' });
    const modificationRequired = useWatch({ control: form.control, name: 'modification_required' });

    const isSubmitting = form.formState.isSubmitting || updateMutation.isPending;

    const handleSubmit = async (values: FdrActionFormValues) => {
        try {
            const formData = new FormData();

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

                // Handle File objects (non-followup files)
                if (value instanceof File) {
                    formData.append(key, value);
                    return;
                }

                // Handle arrays of Files
                if (Array.isArray(value) && value.length > 0 && value[0] instanceof File) {
                    value.forEach((file) => formData.append(key, file));
                    return;
                }

                // Handle all other values (strings, numbers, dates, file paths, etc.)
                if (value === undefined || value === null || value === '') return;
                if (value instanceof Date) {
                    formData.append(key, value.toISOString());
                } else if (typeof value === 'object') {
                    formData.append(key, JSON.stringify(value));
                } else {
                    formData.append(key, String(value));
                }
            });

            await updateMutation.mutateAsync({ id: instrumentId, formData });
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
                {/* Action Selection */}
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                    <SelectField
                        label="Choose What to do"
                        control={form.control}
                        name="action"
                        options={ACTION_OPTIONS}
                        placeholder="Select an option"
                    />
                </div>

                {/* Accounts Form (FDR) */}
                <ConditionalSection show={action === 'accounts-form-1'}>
                    <div className="space-y-4 border rounded-lg p-4">
                        <h4 className="font-semibold text-base">Accounts Form (FDR)</h4>

                        <FieldWrapper control={form.control} name="fdr_req" label="FDR Request">
                            {(field) => (
                                <RadioGroup
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    className="flex gap-6"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Accepted" id="fdr_req_accepted" />
                                        <Label htmlFor="fdr_req_accepted">Accepted</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Rejected" id="fdr_req_rejected" />
                                        <Label htmlFor="fdr_req_rejected">Rejected</Label>
                                    </div>
                                </RadioGroup>
                            )}
                        </FieldWrapper>

                        {fdrReq === 'Rejected' && (
                            <FieldWrapper control={form.control} name="reason_req" label="Reason for Rejection *">
                                {(field) => (
                                    <Textarea
                                        {...field}
                                        placeholder="Enter reason for rejection"
                                        className="min-h-[80px]"
                                    />
                                )}
                            </FieldWrapper>
                        )}

                        <FieldWrapper control={form.control} name="fdr_format_imran" label="FDR Format (Upload by Imran)">
                            {(field) => (
                                <CompactTenderFileUploader
                                    context="fdr-format-imran"
                                    value={field.value}
                                    onChange={field.onChange}
                                />
                            )}
                        </FieldWrapper>

                        <FieldWrapper control={form.control} name="prefilled_signed_fdr" label="Prefilled Bank Formats">
                            {(field) => (
                                <TenderFileUploader
                                    context="fdr-prefilled-signed"
                                    value={field.value || []}
                                    onChange={field.onChange}
                                />
                            )}
                        </FieldWrapper>
                    </div>
                </ConditionalSection>


                {/* Initiate Followup */}
                <ConditionalSection show={action === 'initiate-followup'}>
                    <div className="space-y-4 border rounded-lg p-4">
                        <h4 className="font-semibold text-base">Initiate Followup</h4>

                        <FieldWrapper control={form.control} name="organisation_name" label="Organisation Name">
                            {(field) => <Input {...field} placeholder="Enter organisation name" />}
                        </FieldWrapper>

                        <ContactPersonFields control={form.control} name="contacts" />

                        <FieldWrapper control={form.control} name="followup_start_date" label="Follow-up Start Date">
                            {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                        </FieldWrapper>

                        <FollowUpFrequencySelect control={form.control} name="frequency" />

                        <StopReasonFields
                            control={form.control}
                            frequencyFieldName="frequency"
                            stopReasonFieldName="stop_reason"
                            proofTextFieldName="proof_text"
                            stopRemarksFieldName="stop_remarks"
                            proofImageFieldName="proof_image"
                        />
                    </div>
                </ConditionalSection>

                {/* Returned via courier */}
                <ConditionalSection show={action === 'returned-courier'}>
                    <div className="space-y-4 border rounded-lg p-4">
                        <h4 className="font-semibold text-base">Returned via courier</h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start pt-3 gap-y-4">
                            <FieldWrapper control={form.control} name="docket_no" label="Docket No.">
                                {(field) => <Input {...field} placeholder="Enter docket number" />}
                            </FieldWrapper>

                            <FieldWrapper control={form.control} name="docket_slip" label="Upload Docket Slip">
                                {(field) => (
                                    <CompactTenderFileUploader
                                        context="fdr-docket-slip"
                                        value={field.value}
                                        onChange={field.onChange}
                                    />
                                )}
                            </FieldWrapper>
                        </div>
                    </div>
                </ConditionalSection>

                {/* Returned via Bank Transfer */}
                <ConditionalSection show={action === 'returned-bank-transfer'}>
                    <div className="space-y-4 border rounded-lg p-4">
                        <h4 className="font-semibold text-base">Returned via Bank Transfer</h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start pt-3 gap-y-4">
                            <FieldWrapper control={form.control} name="transfer_date" label="Transfer Date">
                                {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="utr" label="UTR Number">
                                {(field) => <Input {...field} placeholder="Enter UTR number" />}
                            </FieldWrapper>
                        </div>
                    </div>
                </ConditionalSection>

                {/* Settled with Project Account */}
                <ConditionalSection show={action === 'settled'}>
                    <div className="space-y-4 border rounded-lg p-4">
                        <h4 className="font-semibold text-base">Settled with Project Account</h4>
                    </div>
                </ConditionalSection>

                {/* Send FDR Cancellation Request */}
                <ConditionalSection show={action === 'request-cancellation'}>
                    <div className="space-y-4 border rounded-lg p-4">
                        <h4 className="font-semibold text-base">Send FDR Cancellation Request</h4>

                        <FieldWrapper control={form.control} name="covering_letter" label="Upload Signed Stamped Covering Letter">
                            {(field) => (
                                <CompactTenderFileUploader
                                    context="fdr-covering-letter"
                                    value={field.value}
                                    onChange={field.onChange}
                                />
                            )}
                        </FieldWrapper>

                        <FieldWrapper control={form.control} name="req_receive" label="Upload the Bank FDR cancellation request">
                            {(field) => (
                                <CompactTenderFileUploader
                                    context="fdr-req-receive"
                                    value={field.value}
                                    onChange={field.onChange}
                                />
                            )}
                        </FieldWrapper>

                        <FieldWrapper control={form.control} name="cancellation_remarks" label="Remarks">
                            {(field) => (
                                <Textarea {...field} placeholder="Enter remarks" className="min-h-[80px]" />
                            )}
                        </FieldWrapper>
                    </div>
                </ConditionalSection>

                {/* FDR Cancellation Confirmation */}
                <ConditionalSection show={action === 'fdr-cancellation-confirmation'}>
                    <div className="space-y-4 border rounded-lg p-4">
                        <h4 className="font-semibold text-base">FDR Cancellation Confirmation</h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FieldWrapper control={form.control} name="fdr_cancellation_date" label="Date">
                                {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="fdr_cancellation_amount" label="Amount">
                                {(field) => <NumberInput {...field} placeholder="Enter amount" />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="fdr_cancellation_reference_no" label="Reference No.">
                                {(field) => <Input {...field} placeholder="Enter reference number" />}
                            </FieldWrapper>
                        </div>
                    </div>
                </ConditionalSection>

                <div className="flex justify-end gap-4 pt-4">
                    <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Submitting...' : 'Submit'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
