import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import { BankTransferActionFormSchema, type BankTransferActionFormValues } from '../helpers/bankTransferActionForm.schema';
import { useUpdateBankTransferAction } from '@/hooks/api/useBankTransfers';
import { toast } from 'sonner';
import { useWatch } from 'react-hook-form';
import { DatePicker } from '@/components/ui/date-picker';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

const ACTION_OPTIONS = [
    { value: 'accounts-form-1', label: 'Accounts Form' },
    { value: 'initiate-followup', label: 'Initiate Followup' },
    { value: 'returned', label: 'Returned' },
    { value: 'settled', label: 'Settled' },
];

interface BankTransferActionFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    instrumentId: number;
    instrumentData?: {
        utrNo?: string;
        accountName?: string;
        amount?: number;
        tenderName?: string;
        tenderNo?: string;
    };
}

export function BankTransferActionForm({
    open,
    onOpenChange,
    instrumentId,
    instrumentData,
}: BankTransferActionFormProps) {
    const updateMutation = useUpdateBankTransferAction();

    const form = useForm<BankTransferActionFormValues>({
        resolver: zodResolver(BankTransferActionFormSchema) as Resolver<BankTransferActionFormValues>,
        defaultValues: {
            action: '',
            contacts: [],
        },
    });

    const action = useWatch({ control: form.control, name: 'action' });
    const btReq = useWatch({ control: form.control, name: 'bt_req' });

    const isSubmitting = form.formState.isSubmitting || updateMutation.isPending;

    const handleSubmit = async (values: BankTransferActionFormValues) => {
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
            onOpenChange(false);
            form.reset();
        } catch (error: any) {
            toast.error(error?.message || 'Failed to submit action');
            console.error('Error submitting action:', error);
        }
    };

    useEffect(() => {
        if (!open) {
            form.reset();
        }
    }, [open, form]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="!max-w-1/2 w-full max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Bank Transfer Action Form</DialogTitle>
                    <DialogDescription>
                        {instrumentData?.tenderNo && instrumentData?.tenderName
                            ? `${instrumentData.tenderNo} - ${instrumentData.tenderName}`
                            : `Instrument ID: ${instrumentId}`}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                        <SelectField
                            label="Choose What to do"
                            control={form.control}
                            name="action"
                            options={ACTION_OPTIONS}
                            placeholder="Select an action"
                        />

                        {/* Accounts Form (BT) 1 */}
                        <ConditionalSection show={action === 'accounts-form-1'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Accounts Form</h4>

                                <FieldWrapper control={form.control} name="bt_req" label="Bank Transfer Request">
                                    {(field) => (
                                        <RadioGroup
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            className="flex gap-6"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="Accepted" id="bt_req_accepted" />
                                                <Label htmlFor="bt_req_accepted">Accepted</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="Rejected" id="bt_req_rejected" />
                                                <Label htmlFor="bt_req_rejected">Rejected</Label>
                                            </div>
                                        </RadioGroup>
                                    )}
                                </FieldWrapper>

                                {btReq === 'Rejected' && (
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
                                {btReq === 'Accepted' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FieldWrapper control={form.control} name="utr_no" label="UTR No.">
                                            {(field) => <Input {...field} placeholder="Enter UTR number" />}
                                        </FieldWrapper>
                                        <FieldWrapper control={form.control} name="utr_mgs" label="UTR Message">
                                            {(field) => <Input {...field} placeholder="Enter UTR message" />}
                                        </FieldWrapper>
                                        <FieldWrapper control={form.control} name="payment_date" label="Payment Date">
                                            {(field) => (
                                                <DatePicker
                                                    date={field.value ? new Date(field.value) : undefined}
                                                    onChange={(date) => field.onChange(date?.toISOString().split('T')[0])}
                                                />
                                            )}
                                        </FieldWrapper>
                                        <FieldWrapper control={form.control} name="remarks" label="Remarks">
                                            {(field) => (
                                                <Textarea {...field} placeholder="Enter remarks" className="min-h-[80px]" />
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

                                <FieldWrapper control={form.control} name="organisation_name" label="Organisation Name">
                                    {(field) => <Input {...field} placeholder="Enter organisation name" />}
                                </FieldWrapper>

                                <ContactPersonFields control={form.control} name="contacts" />

                                <FieldWrapper control={form.control} name="followup_start_date" label="Follow-up Start Date">
                                    {(field) => (
                                        <DatePicker
                                            date={field.value ? new Date(field.value) : undefined}
                                            onChange={(date) => field.onChange(date?.toISOString().split('T')[0])}
                                        />
                                    )}
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

                        {/* Returned */}
                        <ConditionalSection show={action === 'returned'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Returned via Bank Transfer</h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FieldWrapper control={form.control} name="return_date" label="Return Date">
                                        {(field) => (
                                            <DatePicker
                                                date={field.value ? new Date(field.value) : undefined}
                                                onChange={(date) => field.onChange(date?.toISOString().split('T')[0])}
                                            />
                                        )}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="utr_num" label="UTR Number">
                                        {(field) => <Input {...field} placeholder="Enter UTR number" />}
                                    </FieldWrapper>
                                </div>
                            </div>
                        </ConditionalSection>

                        {/* Settled */}
                        <ConditionalSection show={action === 'settled'}>
                            <div className="space-y-4 border rounded-lg p-4">
                                <h4 className="font-semibold text-base">Settled with Project</h4>
                            </div>
                        </ConditionalSection>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Submitting...' : 'Submit'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
