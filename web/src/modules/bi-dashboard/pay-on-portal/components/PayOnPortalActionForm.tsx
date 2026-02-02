import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { SelectField } from '@/components/form/SelectField';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ContactPersonFields } from '@/components/form/ContactPersonFields';
import { FollowUpFrequencySelect } from '@/components/form/FollowUpFrequencySelect';
import { StopReasonFields } from '@/components/form/StopReasonFields';
import { ConditionalSection } from '@/components/form/ConditionalSection';
import { NumberInput } from '@/components/form/NumberInput';
import DateInput from '@/components/form/DateInput';
import DateTimeInput from '@/components/form/DateTimeInput';
import { PayOnPortalActionFormSchema, type PayOnPortalActionFormValues } from '../helpers/payOnPortalActionForm.schema';
import { useUpdatePayOnPortalAction } from '@/hooks/api/usePayOnPortals';
import { toast } from 'sonner';
import { useWatch } from 'react-hook-form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

const ACTION_OPTIONS = [
    { value: 'accounts-form-1', label: 'Accounts Form' },
    { value: 'initiate-followup', label: 'Initiate Followup' },
    { value: 'returned', label: 'Returned via Bank Transfer' },
    { value: 'settled', label: 'Settled with Project Account' },
];

interface PayOnPortalActionFormProps {
    instrumentId: number;
    instrumentData?: {
        utrNo?: string;
        portalName?: string;
        amount?: number;
        tenderName?: string;
        tenderNo?: string;
    };
}

export function PayOnPortalActionForm({
    instrumentId,
    instrumentData,
}: PayOnPortalActionFormProps) {
    const navigate = useNavigate();
    const updateMutation = useUpdatePayOnPortalAction();

    const form = useForm<PayOnPortalActionFormValues>({
        resolver: zodResolver(PayOnPortalActionFormSchema) as Resolver<PayOnPortalActionFormValues>,
        defaultValues: {
            action: '',
            contacts: [],
        },
    });

    const action = useWatch({ control: form.control, name: 'action' });
    const popReq = useWatch({ control: form.control, name: 'pop_req' });

    const isSubmitting = form.formState.isSubmitting || updateMutation.isPending;

    const handleSubmit = async (values: PayOnPortalActionFormValues) => {
        try {
            const formData = new FormData();

            Object.entries(values).forEach(([key, value]) => {
                if (key === 'contacts' || key.includes('proof_image')) {
                    return;
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
                        <SelectField
                            label="Choose What to do"
                            control={form.control}
                            name="action"
                            options={ACTION_OPTIONS}
                            placeholder="Select an option"
                        />

                        {/* Accounts Form (POP) 1 */}
                        <ConditionalSection show={action === 'accounts-form-1'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Accounts Form (POP) 1 - Request to Portal</h4>

                                <FieldWrapper control={form.control} name="pop_req" label="POP Request">
                                    {(field) => (
                                        <RadioGroup
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            className="flex gap-6"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="Accepted" id="pop_req_accepted" />
                                                <Label htmlFor="pop_req_accepted">Accepted</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="Rejected" id="pop_req_rejected" />
                                                <Label htmlFor="pop_req_rejected">Rejected</Label>
                                            </div>
                                        </RadioGroup>
                                    )}
                                </FieldWrapper>

                                {popReq === 'Rejected' && (
                                    <FieldWrapper control={form.control} name="reason_req" label="Reason for Rejection *">
                                        {(field) => (
                                            <Input
                                                {...field}
                                                placeholder="Enter reason for rejection"
                                            />
                                        )}
                                    </FieldWrapper>
                                )}

                                {popReq === 'Accepted' && (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FieldWrapper control={form.control} name="payment_datetime" label="Date and Time of Payment">
                                                {(field) => (
                                                    <DateTimeInput
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        placeholder="Select date and time"
                                                    />
                                                )}
                                            </FieldWrapper>
                                            <FieldWrapper control={form.control} name="utr_no" label="UTR for the transaction">
                                                {(field) => <Input {...field} placeholder="Enter UTR number" />}
                                            </FieldWrapper>
                                            <FieldWrapper control={form.control} name="utr_message" label="UTR Message">
                                                {(field) => <Input {...field} placeholder="Enter UTR message" />}
                                            </FieldWrapper>
                                        </div>

                                        <FieldWrapper control={form.control} name="remarks" label="Remarks">
                                            {(field) => (
                                                <Input {...field} placeholder="Enter remarks" />
                                            )}
                                        </FieldWrapper>
                                    </>
                                )}
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

                        {/* Returned via Bank Transfer */}
                        <ConditionalSection show={action === 'returned'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Returned via Bank Transfer</h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FieldWrapper control={form.control} name="transfer_date" label="Transfer Date">
                                        {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="utr_no" label="UTR Number">
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
