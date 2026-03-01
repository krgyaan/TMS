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
    { value: 'accounts-form-1', label: 'Accounts Form' },
    { value: 'initiate-followup', label: 'Initiate Followup' },
    { value: 'stop-cheque', label: 'Stop the cheque from the bank' },
    { value: 'paid-via-bank-transfer', label: 'Paid via Bank Transfer' },
    { value: 'deposited-in-bank', label: 'Deposited in Bank' },
    { value: 'cancelled-torn', label: 'Cancelled/Torn' },
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

export function ChequeActionForm({ instrumentId, instrumentData }: ChequeActionFormProps) {
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
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                    <SelectField
                        label="Choose What to do"
                        control={form.control}
                        name="action"
                        options={ACTION_OPTIONS}
                        placeholder="Select an option"
                    />
                </div>

                {/* Accounts Form */}
                <ConditionalSection show={action === 'accounts-form-1'}>
                    <div className="space-y-4 border rounded-lg p-4">
                        <h4 className="font-semibold text-base">Accounts Form</h4>

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

                        {chequeReq === 'Accepted' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start pt-3 gap-y-4">
                                <FieldWrapper control={form.control} name="cheque_no" label="Cheque No.">
                                    {(field) => <Input {...field} placeholder="Enter cheque number" />}
                                </FieldWrapper>

                                <FieldWrapper control={form.control} name="due_date" label="Due date (if payable)">
                                    {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                                </FieldWrapper>

                                <FieldWrapper control={form.control} name="receiving_cheque_handed_over" label="Receiving of the cheque handed over">
                                    {(field) => (
                                        <CompactTenderFileUploader
                                            context="cheque-receiving-handed-over"
                                            value={field.value}
                                            onChange={field.onChange}
                                        />
                                    )}
                                </FieldWrapper>

                                <FieldWrapper control={form.control} name="cheque_images" label="Upload soft copy of Cheque (both sides)">
                                    {(field) => (
                                        <TenderFileUploader
                                            context="cheque-images"
                                            value={field.value || []}
                                            onChange={field.onChange}
                                        />
                                    )}
                                </FieldWrapper>

                                <FieldWrapper control={form.control} name="positive_pay_confirmation" label="Upload Positive pay confirmation copy">
                                    {(field) => (
                                        <CompactTenderFileUploader
                                            context="cheque-positive-pay-confirmation"
                                            value={field.value}
                                            onChange={field.onChange}
                                        />
                                    )}
                                </FieldWrapper>

                                <FieldWrapper control={form.control} name="remarks" label="Remarks">
                                    {(field) => (
                                        <Input {...field} placeholder="Enter remarks" />
                                    )}
                                </FieldWrapper>
                            </div>
                        )}
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

                {/* Stop the cheque from the bank */}
                <ConditionalSection show={action === 'stop-cheque'}>
                    <div className="space-y-4 border rounded-lg p-4">
                        <h4 className="font-semibold text-base">Stop the cheque from the bank</h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start pt-3 gap-y-4">
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
                    </div>
                </ConditionalSection>

                {/* Paid via Bank Transfer */}
                <ConditionalSection show={action === 'paid-via-bank-transfer'}>
                    <div className="space-y-4 border rounded-lg p-4">
                        <h4 className="font-semibold text-base">Paid via Bank Transfer</h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start pt-3 gap-y-4">
                            <FieldWrapper control={form.control} name="transfer_date" label="Transfer Date">
                                {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="amount" label="UTR Amount">
                                {(field) => <NumberInput {...field} placeholder="Enter amount" />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="utr" label="UTR Number">
                                {(field) => <Input {...field} placeholder="Enter UTR number" />}
                            </FieldWrapper>
                        </div>
                    </div>
                </ConditionalSection>

                {/* Deposited in Bank */}
                <ConditionalSection show={action === 'deposited-in-bank'}>
                    <div className="space-y-4 border rounded-lg p-4">
                        <h4 className="font-semibold text-base">Deposited in Bank</h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 items-start pt-3 gap-y-4 gap-4">
                            <FieldWrapper control={form.control} name="transfer_date" label="Transfer Date">
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

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start pt-3 gap-y-4">
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
