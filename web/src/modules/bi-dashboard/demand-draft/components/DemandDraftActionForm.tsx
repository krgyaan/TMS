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
import { useCourierDashboard } from '@/modules/shared/courier/courier.hooks';
import { toast } from 'sonner';
import { useWatch } from 'react-hook-form';
import { useMemo } from 'react';

const ACTION_OPTIONS = [
    { value: 'accounts-form-1', label: 'Accounts Form (DD)' },
    { value: 'initiate-followup', label: 'Initiate Followup' },
    { value: 'returned-courier', label: 'Returned via courier' },
    { value: 'returned-bank-transfer', label: 'Returned via Bank Transfer' },
    { value: 'settled', label: 'Settled with Project Account' },
    { value: 'request-cancellation', label: 'Send DD Cancellation Request' },
    { value: 'dd-cancellation-confirmation', label: 'DD cancelled at Branch' },
];

const useCourierRequestOptions = () => {
    const { data: dashboardData } = useCourierDashboard();

    return useMemo(() => {
        if (!dashboardData) return [];

        const allCouriers = [
            ...(dashboardData.pending || []),
            ...(dashboardData.dispatched || []),
            ...(dashboardData.notDelivered || []),
            ...(dashboardData.delivered || []),
            ...(dashboardData.rejected || []),
        ];

        return allCouriers
            .filter(c => c.docketNo)
            .map(c => ({
                value: c.docketNo!,
                label: c.docketNo! + (c.toOrg ? ` - ${c.toOrg}` : ''),
            }));
    }, [dashboardData]);
};

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
    const courierRequestOptions = useCourierRequestOptions();

    const form = useForm<DemandDraftActionFormValues>({
        resolver: zodResolver(DemandDraftActionFormSchema) as Resolver<DemandDraftActionFormValues>,
        defaultValues: {
            action: '',
            contacts: [],
        },
    });

    const action = useWatch({ control: form.control, name: 'action' });
    const ddReq = useWatch({ control: form.control, name: 'dd_req' });

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

                        {/* Accounts Form (DD) */}
                        <ConditionalSection show={action === 'accounts-form-1'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Accounts Form (DD)</h4>

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
                                            <Input
                                                {...field}
                                                placeholder="Enter reason for rejection"
                                            />
                                        )}
                                    </FieldWrapper>
                                )}

                                {ddReq === 'Accepted' && (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FieldWrapper control={form.control} name="dd_date" label="DD Date">
                                                {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                                            </FieldWrapper>
                                            <FieldWrapper control={form.control} name="dd_no" label="DD No.">
                                                {(field) => <Input {...field} placeholder="Enter DD number" />}
                                            </FieldWrapper>
                                        </div>

                                        <FieldWrapper control={form.control} name="req_no" label="Courier request No.">
                                            {(field) => (
                                                <SelectField
                                                    control={form.control}
                                                    name="req_no"
                                                    options={courierRequestOptions}
                                                    placeholder="Select courier request number"
                                                />
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


                        {/* Returned via courier */}
                        <ConditionalSection show={action === 'returned-courier'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Returned via courier</h4>

                                <FieldWrapper control={form.control} name="docket_no" label="Docket No.">
                                    {(field) => <Input {...field} placeholder="Enter docket number" />}
                                </FieldWrapper>

                                <FieldWrapper control={form.control} name="docket_slip" label="Upload Docket Slip">
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

                        {/* Settled with Project Account */}
                        <ConditionalSection show={action === 'settled'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Settled with Project Account</h4>
                            </div>
                        </ConditionalSection>

                        {/* Send DD Cancellation Request */}
                        <ConditionalSection show={action === 'request-cancellation'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Send DD Cancellation Request</h4>
                            </div>
                        </ConditionalSection>

                        {/* DD cancelled at Branch */}
                        <ConditionalSection show={action === 'dd-cancellation-confirmation'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">DD cancelled at Branch</h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FieldWrapper control={form.control} name="dd_cancellation_date" label="Date">
                                        {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="dd_cancellation_amount" label="Amount credited">
                                        {(field) => <NumberInput {...field} placeholder="Enter amount" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="dd_cancellation_reference_no" label="Bank reference No">
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
