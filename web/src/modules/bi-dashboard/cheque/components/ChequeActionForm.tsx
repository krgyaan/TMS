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
import { ChequeActionFormSchema, type ChequeActionFormValues } from '../helpers/chequeActionForm.schema';
import { useUpdateChequeAction } from '@/hooks/api/useCheques';
import { toast } from 'sonner';
import { useWatch } from 'react-hook-form';

const ACTION_OPTIONS = [
    { value: 'accounts-form-1', label: 'Accounts Form (CHQ) 1 - Request to Bank' },
    { value: 'accounts-form-2', label: 'Accounts Form (CHQ) 2 - After Cheque Creation' },
    { value: 'accounts-form-3', label: 'Accounts Form (CHQ) 3 - Capture Cheque Details' },
    { value: 'initiate-followup', label: 'Initiate Followup' },
    { value: 'stop-cheque', label: 'Stop the cheque from the bank' },
    { value: 'paid-via-bank-transfer', label: 'Paid via Bank Transfer' },
    { value: 'deposited-in-bank', label: 'Deposited in Bank' },
    { value: 'cancelled-torn', label: 'Cancelled/Torn' },
    { value: 'returned-courier', label: 'Returned via Courier' },
    { value: 'request-cancellation', label: 'Request Cancellation' },
];

interface ChequeActionFormProps {
    instrumentId: number;
    instrumentData?: {
        chequeNo?: string;
        chequeDate?: Date;
        amount?: number;
        tenderName?: string;
        tenderNo?: string;
    };
}

export function ChequeActionForm({
    instrumentId,
    instrumentData,
}: ChequeActionFormProps) {
    const navigate = useNavigate();
    const updateMutation = useUpdateChequeAction();

    const form = useForm<ChequeActionFormValues>({
        resolver: zodResolver(ChequeActionFormSchema) as Resolver<ChequeActionFormValues>,
        defaultValues: {
            action: '',
            contacts: [],
            cheque_images: [],
        },
    });

    const action = useWatch({ control: form.control, name: 'action' });
    const chequeReq = useWatch({ control: form.control, name: 'cheque_req' });

    const isSubmitting = form.formState.isSubmitting || updateMutation.isPending;

    const handleSubmit = async (values: ChequeActionFormValues) => {
        try {
            const formData = new FormData();

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

                        {/* Accounts Form (CHQ) 1 */}
                        <ConditionalSection show={action === 'accounts-form-1'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Accounts Form (CHQ) 1 - Request to Bank</h4>

                                <FieldWrapper control={form.control} name="cheque_req" label="Cheque Request">
                                    {(field) => (
                                        <RadioGroup
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            className="flex gap-6"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="Accepted" id="chq_req_accepted" />
                                                <Label htmlFor="chq_req_accepted">Accepted</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="Rejected" id="chq_req_rejected" />
                                                <Label htmlFor="chq_req_rejected">Rejected</Label>
                                            </div>
                                        </RadioGroup>
                                    )}
                                </FieldWrapper>

                                {chequeReq === 'Rejected' && (
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

                                <FieldWrapper control={form.control} name="cheque_format_imran" label="Cheque Format (Upload by Imran)">
                                    {(field) => (
                                        <CompactTenderFileUploader
                                            context="cheque-format-imran"
                                            value={field.value}
                                            onChange={field.onChange}
                                        />
                                    )}
                                </FieldWrapper>

                                <FieldWrapper control={form.control} name="prefilled_signed_cheque" label="Prefilled Bank Formats">
                                    {(field) => (
                                        <TenderFileUploader
                                            context="cheque-prefilled-signed"
                                            value={field.value || []}
                                            onChange={field.onChange}
                                        />
                                    )}
                                </FieldWrapper>
                            </div>
                        </ConditionalSection>

                        {/* Accounts Form (CHQ) 2 */}
                        <ConditionalSection show={action === 'accounts-form-2'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Accounts Form (CHQ) 2 - After Cheque Creation</h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FieldWrapper control={form.control} name="cheque_no" label="Cheque No.">
                                        {(field) => <Input {...field} placeholder="Enter cheque number" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="cheque_date" label="Cheque Date">
                                        {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="cheque_amount" label="Cheque Amount">
                                        {(field) => <NumberInput {...field} placeholder="Enter amount" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="cheque_type" label="Cheque Type">
                                        {(field) => <Input {...field} placeholder="Enter cheque type" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="cheque_reason" label="Cheque Reason">
                                        {(field) => <Input {...field} placeholder="Enter reason" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="due_date" label="Due Date">
                                        {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                                    </FieldWrapper>
                                </div>

                                <FieldWrapper control={form.control} name="courier_request_no" label="Courier Request No.">
                                    {(field) => <Input {...field} placeholder="Enter courier request number" />}
                                </FieldWrapper>

                                <FieldWrapper control={form.control} name="remarks" label="Remarks">
                                    {(field) => (
                                        <Textarea {...field} placeholder="Enter remarks" className="min-h-[80px]" />
                                    )}
                                </FieldWrapper>
                            </div>
                        </ConditionalSection>

                        {/* Accounts Form (CHQ) 3 */}
                        <ConditionalSection show={action === 'accounts-form-3'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Accounts Form (CHQ) 3 - Capture Cheque Details</h4>

                                <FieldWrapper control={form.control} name="cheque_images" label="Cheque Images (Max 2)">
                                    {(field) => (
                                        <TenderFileUploader
                                            context="cheque-images"
                                            value={field.value || []}
                                            onChange={field.onChange}
                                        />
                                    )}
                                </FieldWrapper>

                                <h5 className="font-medium text-sm mt-4">Charges</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FieldWrapper control={form.control} name="cheque_charges" label="Cheque Charges">
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

                        {/* Stop the cheque from the bank */}
                        <ConditionalSection show={action === 'stop-cheque'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Stop the cheque from the bank</h4>

                                <FieldWrapper control={form.control} name="stop_reason_text" label="Reason for Stopping of Cheque">
                                    {(field) => (
                                        <Textarea
                                            {...field}
                                            placeholder="Enter reason for stopping the cheque"
                                            className="min-h-[80px]"
                                        />
                                    )}
                                </FieldWrapper>
                            </div>
                        </ConditionalSection>

                        {/* Paid via Bank Transfer */}
                        <ConditionalSection show={action === 'paid-via-bank-transfer'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Paid via Bank Transfer</h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FieldWrapper control={form.control} name="transfer_date" label="Transfer Date">
                                        {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="utr" label="UTR Number">
                                        {(field) => <Input {...field} placeholder="Enter UTR number" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="amount" label="UTR Amount">
                                        {(field) => <NumberInput {...field} placeholder="Enter amount" />}
                                    </FieldWrapper>
                                </div>
                            </div>
                        </ConditionalSection>

                        {/* Deposited in Bank */}
                        <ConditionalSection show={action === 'deposited-in-bank'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Deposited in Bank</h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FieldWrapper control={form.control} name="bt_transfer_date" label="Transfer Date">
                                        {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="reference" label="Bank Reference No">
                                        {(field) => <Input {...field} placeholder="Enter reference number" />}
                                    </FieldWrapper>
                                </div>
                            </div>
                        </ConditionalSection>

                        {/* Cancelled/Torn */}
                        <ConditionalSection show={action === 'cancelled-torn'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Cancelled/Torn</h4>

                                <FieldWrapper control={form.control} name="cancelled_image_path" label="Upload Photo/confirmation from Beneficiary">
                                    {(field) => (
                                        <CompactTenderFileUploader
                                            context="cheque-cancelled-image"
                                            value={field.value}
                                            onChange={field.onChange}
                                        />
                                    )}
                                </FieldWrapper>
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
                                            context="cheque-docket-slip"
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

                                <FieldWrapper control={form.control} name="covering_letter" label="Covering Letter Upload">
                                    {(field) => (
                                        <CompactTenderFileUploader
                                            context="cheque-covering-letter"
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

                        {/* Cheque Cancellation Confirmation */}
                        <ConditionalSection show={action === 'cheque-cancellation-confirmation'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Cheque Cancellation Confirmation</h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FieldWrapper control={form.control} name="cheque_cancellation_date" label="Date">
                                        {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="cheque_cancellation_amount" label="Amount">
                                        {(field) => <NumberInput {...field} placeholder="Enter amount" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="cheque_cancellation_reference_no" label="Reference No.">
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
