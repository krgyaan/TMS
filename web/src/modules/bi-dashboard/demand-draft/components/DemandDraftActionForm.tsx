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
import { DemandDraftActionFormSchema, type DemandDraftActionFormValues } from '../helpers/demandDraftActionForm.schema';
import { useUpdateDemandDraftAction } from '@/hooks/api/useDemandDrafts';
import { toast } from 'sonner';
import { useWatch } from 'react-hook-form';

const ACTION_OPTIONS = [
    { value: 'accounts-form-1', label: 'Accounts Form (DD) 1 - Request to Bank' },
    { value: 'accounts-form-2', label: 'Accounts Form (DD) 2 - After DD Creation' },
    { value: 'accounts-form-3', label: 'Accounts Form (DD) 3 - Capture DD Details' },
    { value: 'initiate-followup', label: 'Initiate Followup' },
    { value: 'request-extension', label: 'Request Extension' },
    { value: 'returned-courier', label: 'Returned via Courier' },
    { value: 'returned-bank-transfer', label: 'Returned via Bank Transfer' },
    { value: 'request-cancellation', label: 'Request Cancellation' },
    { value: 'dd-cancellation-confirmation', label: 'DD Cancellation Confirmation' },
];

interface DemandDraftActionFormProps {
    instrumentId: number;
    instrumentData?: {
        ddNo?: string;
        ddDate?: Date;
        amount?: number;
        tenderName?: string;
        tenderNo?: string;
    };
}

export function DemandDraftActionForm({
    instrumentId,
    instrumentData,
}: DemandDraftActionFormProps) {
    const navigate = useNavigate();
    const updateMutation = useUpdateDemandDraftAction();

    const form = useForm<DemandDraftActionFormValues>({
        resolver: zodResolver(DemandDraftActionFormSchema) as Resolver<DemandDraftActionFormValues>,
        defaultValues: {
            action: '',
            contacts: [],
        },
    });

    const action = useWatch({ control: form.control, name: 'action' });
    const ddReq = useWatch({ control: form.control, name: 'dd_req' });
    const modificationRequired = useWatch({ control: form.control, name: 'modification_required' });

    const isSubmitting = form.formState.isSubmitting || updateMutation.isPending;

    const handleSubmit = async (values: DemandDraftActionFormValues) => {
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

                        {/* Accounts Form (DD) 1 */}
                        <ConditionalSection show={action === 'accounts-form-1'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Accounts Form (DD) 1 - Request to Bank</h4>

                                <FieldWrapper control={form.control} name="dd_req" label="DD Request">
                                    {(field) => (
                                        <RadioGroup
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            className="flex gap-6"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="Accepted" id="dd_req_accepted" />
                                                <Label htmlFor="dd_req_accepted">Accepted</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="Rejected" id="dd_req_rejected" />
                                                <Label htmlFor="dd_req_rejected">Rejected</Label>
                                            </div>
                                        </RadioGroup>
                                    )}
                                </FieldWrapper>

                                {ddReq === 'Rejected' && (
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

                                <FieldWrapper control={form.control} name="dd_format_imran" label="DD Format (Upload by Imran)">
                                    {(field) => (
                                        <CompactTenderFileUploader
                                            context="dd-format-imran"
                                            value={field.value}
                                            onChange={field.onChange}
                                        />
                                    )}
                                </FieldWrapper>

                                <FieldWrapper control={form.control} name="prefilled_signed_dd" label="Prefilled Bank Formats">
                                    {(field) => (
                                        <TenderFileUploader
                                            context="dd-prefilled-signed"
                                            value={field.value || []}
                                            onChange={field.onChange}
                                        />
                                    )}
                                </FieldWrapper>
                            </div>
                        </ConditionalSection>

                        {/* Accounts Form (DD) 2 */}
                        <ConditionalSection show={action === 'accounts-form-2'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Accounts Form (DD) 2 - After DD Creation</h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FieldWrapper control={form.control} name="dd_no" label="DD No.">
                                        {(field) => <Input {...field} placeholder="Enter DD number" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="dd_date" label="DD Date">
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

                        {/* Accounts Form (DD) 3 */}
                        <ConditionalSection show={action === 'accounts-form-3'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Accounts Form (DD) 3 - Capture DD Details</h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FieldWrapper control={form.control} name="dd_amount" label="DD Amount">
                                        {(field) => <NumberInput {...field} placeholder="Enter amount" />}
                                    </FieldWrapper>
                                </div>

                                <h5 className="font-medium text-sm mt-4">Charges</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FieldWrapper control={form.control} name="dd_charges" label="DD Charges">
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
                                            context="dd-request-letter-email"
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
                                            context="dd-docket-slip"
                                            value={field.value}
                                            onChange={field.onChange}
                                        />
                                    )}
                                </FieldWrapper>
                            </div>
                        </ConditionalSection>

                        {/* Returned via Bank Transfer */}
                        <ConditionalSection show={action === 'returned-bank-transfer'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Returned via Bank Transfer</h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FieldWrapper control={form.control} name="transfer_date" label="Transfer Date">
                                        {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="utr" label="UTR Number">
                                        {(field) => <Input {...field} placeholder="Enter UTR number" />}
                                    </FieldWrapper>
                                </div>
                            </div>
                        </ConditionalSection>

                        {/* Request Cancellation */}
                        <ConditionalSection show={action === 'request-cancellation'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Request Cancellation</h4>

                                <FieldWrapper control={form.control} name="covering_letter" label="Covering Letter Upload">
                                    {(field) => (
                                        <CompactTenderFileUploader
                                            context="dd-covering-letter"
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

                        {/* DD Cancellation Confirmation */}
                        <ConditionalSection show={action === 'dd-cancellation-confirmation'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">DD Cancellation Confirmation</h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FieldWrapper control={form.control} name="dd_cancellation_date" label="Date">
                                        {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="dd_cancellation_amount" label="Amount">
                                        {(field) => <NumberInput {...field} placeholder="Enter amount" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="dd_cancellation_reference_no" label="Reference No.">
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
