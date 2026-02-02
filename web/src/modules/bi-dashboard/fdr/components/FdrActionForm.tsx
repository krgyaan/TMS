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
    { value: 'accounts-form-1', label: 'Accounts Form (FDR) 1 - Request to Bank' },
    { value: 'accounts-form-2', label: 'Accounts Form (FDR) 2 - After FDR Creation' },
    { value: 'accounts-form-3', label: 'Accounts Form (FDR) 3 - Capture FDR Details' },
    { value: 'initiate-followup', label: 'Initiate Followup' },
    { value: 'request-extension', label: 'Request Extension' },
    { value: 'returned-courier', label: 'Returned via Courier' },
    { value: 'request-cancellation', label: 'Request Cancellation' },
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

export function FdrActionForm({
    instrumentId,
    instrumentData,
}: FdrActionFormProps) {
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

            // Append scalar fields
            Object.entries(values).forEach(([key, value]) => {
                if (key === 'contacts' || key.includes('proof_image')) {
                    return; // Handle separately
                }
                if (value === undefined || value === null || value === '') return;
                if (value instanceof Date) {
                    formData.append(key, value.toISOString());
                } else if (typeof value === 'object' && !Array.isArray(value)) {
                    formData.append(key, JSON.stringify(value));
                } else {
                    formData.append(key, String(value));
                }
            });

            // Append contact persons
            if (values.contacts && values.contacts.length > 0) {
                formData.append('contacts', JSON.stringify(values.contacts));
            }

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
                        <FieldWrapper control={form.control} name="action" label="Action *">
                            {(_field) => (
                                <SelectField
                                    label="Choose What to do"
                                    control={form.control}
                                    name="action"
                                    options={ACTION_OPTIONS}
                                    placeholder="Select an option"
                                />
                            )}
                        </FieldWrapper>

                        {/* Accounts Form (FDR) 1 - Request to Bank */}
                        <ConditionalSection show={action === 'accounts-form-1'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Accounts Form (FDR) 1 - Request to Bank</h4>

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

                        {/* Accounts Form (FDR) 2 - After FDR Creation */}
                        <ConditionalSection show={action === 'accounts-form-2'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Accounts Form (FDR) 2 - After FDR Creation</h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FieldWrapper control={form.control} name="fdr_no" label="FDR No.">
                                        {(field) => <Input {...field} placeholder="Enter FDR number" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="fdr_date" label="FDR Date">
                                        {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="fdr_validity" label="FDR Validity">
                                        {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                                    </FieldWrapper>
                                </div>

                                <FieldWrapper control={form.control} name="req_no" label="Courier Request No.">
                                    {(field) => <Input {...field} placeholder="Enter courier request number" />}
                                </FieldWrapper>

                                <FieldWrapper control={form.control} name="remarks" label="Remarks">
                                    {(field) => (
                                        <Textarea {...field} placeholder="Enter remarks" className="min-h-[80px]" />
                                    )}
                                </FieldWrapper>
                            </div>
                        </ConditionalSection>

                        {/* Accounts Form (FDR) 3 - Capture FDR Details */}
                        <ConditionalSection show={action === 'accounts-form-3'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Accounts Form (FDR) 3 - Capture FDR Details</h4>

                                <FieldWrapper control={form.control} name="sfms_confirmation" label="SFMS Confirmation">
                                    {(field) => (
                                        <CompactTenderFileUploader
                                            context="fdr-sfms-confirmation"
                                            value={field.value}
                                            onChange={field.onChange}
                                        />
                                    )}
                                </FieldWrapper>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FieldWrapper control={form.control} name="fdr_percentage" label="FDR Percentage">
                                        {(field) => <NumberInput {...field} placeholder="Enter percentage" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="fdr_amount" label="FDR Amount">
                                        {(field) => <NumberInput {...field} placeholder="Enter amount" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="fdr_roi" label="FDR ROI">
                                        {(field) => <NumberInput {...field} placeholder="Enter ROI" />}
                                    </FieldWrapper>
                                </div>

                                <h5 className="font-medium text-sm mt-4">Charges</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FieldWrapper control={form.control} name="fdr_charges" label="FDR Charges">
                                        {(field) => <NumberInput {...field} placeholder="Enter charges" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="sfms_charges" label="SFMS Charges">
                                        {(field) => <NumberInput {...field} placeholder="Enter charges" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="stamp_charges" label="Stamp Charges">
                                        {(field) => <NumberInput {...field} placeholder="Enter charges" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="other_charges" label="Other Charges">
                                        {(field) => <NumberInput {...field} placeholder="Enter charges" />}
                                    </FieldWrapper>
                                </div>
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

                                <FieldWrapper control={form.control} name="request_letter_email" label="Request Letter/Email">
                                    {(field) => (
                                        <CompactTenderFileUploader
                                            context="fdr-request-letter-email"
                                            value={field.value}
                                            onChange={field.onChange}
                                        />
                                    )}
                                </FieldWrapper>

                                {modificationRequired === 'Yes' && (
                                    <div className="space-y-2">
                                        <Label>Modification Fields</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Modification fields table can be added here
                                        </p>
                                    </div>
                                )}
                            </div>
                        </ConditionalSection>

                        {/* Returned via courier */}
                        <ConditionalSection show={action === 'returned-courier'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Returned via Courier</h4>

                                <FieldWrapper control={form.control} name="docket_no" label="Docket No.">
                                    {(field) => <Input {...field} placeholder="Enter docket number" />}
                                </FieldWrapper>

                                <FieldWrapper control={form.control} name="docket_slip" label="Docket Slip Upload">
                                    {(field) => (
                                        <CompactTenderFileUploader
                                            context="fdr-docket-slip"
                                            value={field.value}
                                            onChange={field.onChange}
                                        />
                                    )}
                                </FieldWrapper>
                            </div>
                        </ConditionalSection>

                        {/* Request Cancellation */}
                        <ConditionalSection show={action === 'request-cancellation'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Request Cancellation</h4>

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
