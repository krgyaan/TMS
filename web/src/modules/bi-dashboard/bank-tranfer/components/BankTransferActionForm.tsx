import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { ContactPersonFields } from '@/components/form/ContactPersonFields';
import { FollowUpFrequencySelect } from '@/components/form/FollowUpFrequencySelect';
import { ConditionalSection } from '@/components/form/ConditionalSection';
import DateInput from '@/components/form/DateInput';
import DateTimeInput from '@/components/form/DateTimeInput';
import { BankTransferActionFormSchema, type BankTransferActionFormValues, type BankTransferActionPayload } from '../helpers/bankTransferActionForm.schema';
import { useUpdateBankTransferAction } from '@/hooks/api/useBankTransfers';
import { toast } from 'sonner';
import { useWatch } from 'react-hook-form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Users, Banknote, CheckCircle, CheckCircle2, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ALL_ACTION_OPTIONS, type BankTransferActionFormProps } from '../helpers/bankTransfer.types';

export function BankTransferActionForm({ instrumentId, action: propAction, formHistory }: BankTransferActionFormProps) {
    const navigate = useNavigate();
    const updateMutation = useUpdateBankTransferAction();

    const hasAccountsFormData = !!(formHistory?.accountsForm?.btReq);
    const hasFollowupData = !!(formHistory?.initiateFollowup?.organisationName);
    const hasReturnedData = !!(formHistory?.returned?.transferDate);
    const hasSettledData = !!(formHistory?.settled?.remarks);

    const getSubmittedBadge = (hasData: boolean) => {
        if (!hasData) return <Badge variant={'secondary'} className="rounded-full p-2">
            <Info className="h-3 w-3" />
        </Badge>;
        return (
            <Badge variant={'success'} className="rounded-full p-2">
                <CheckCircle className="h-3 w-3" />
            </Badge>
        );
    };

    const availableActions = propAction === 0
        ? ALL_ACTION_OPTIONS.filter(opt => opt.value === 'accounts-form')
        : ALL_ACTION_OPTIONS;

    const defaultValues: BankTransferActionFormValues = {
        action: '',
        contacts: [],
    };

    if (formHistory?.accountsForm) {
        defaultValues.bt_req = formHistory.accountsForm.btReq;
        defaultValues.reason_req = formHistory.accountsForm.reasonReq;
        defaultValues.payment_datetime = formHistory.accountsForm.paymentDatetime;
        defaultValues.utr_no = formHistory.accountsForm.utrNo;
        defaultValues.utr_message = formHistory.accountsForm.utrMessage;
    }

    if (formHistory?.initiateFollowup) {
        defaultValues.organisation_name = formHistory.initiateFollowup.organisationName;
        defaultValues.contacts = formHistory.initiateFollowup.contacts?.map(c => ({
            name: c.name,
            phone: c.phone ?? '',
            email: c.email ?? '',
        })) || [];
        defaultValues.followup_start_date = formHistory.initiateFollowup.followupStartDate;
        defaultValues.frequency = formHistory.initiateFollowup.frequency;
    }

    if (formHistory?.returned) {
        defaultValues.transfer_date = formHistory.returned.transferDate;
        defaultValues.return_utr = formHistory.returned.returnUtr;
    }

    if (formHistory?.settled) {
        defaultValues.settle_remarks = formHistory.settled.remarks;
    }

    const form = useForm<BankTransferActionFormValues>({
        resolver: zodResolver(BankTransferActionFormSchema) as Resolver<BankTransferActionFormValues>,
        defaultValues,
    });

    const selectedAction = useWatch({ control: form.control, name: 'action' });
    const btReq = useWatch({ control: form.control, name: 'bt_req' });

    useEffect(() => {
        if (formHistory?.accountsForm?.btReq) {
            form.setValue('bt_req', formHistory.accountsForm.btReq, { shouldValidate: false });
        }
        if (formHistory?.accountsForm?.reasonReq) {
            form.setValue('reason_req', formHistory.accountsForm.reasonReq, { shouldValidate: false });
        }
        if (formHistory?.accountsForm?.paymentDatetime) {
            form.setValue('payment_datetime', formHistory.accountsForm.paymentDatetime, { shouldValidate: false });
        }
        if (formHistory?.accountsForm?.utrNo) {
            form.setValue('utr_no', formHistory.accountsForm.utrNo, { shouldValidate: false });
        }
        if (formHistory?.accountsForm?.utrMessage) {
            form.setValue('utr_message', formHistory.accountsForm.utrMessage, { shouldValidate: false });
        }

        if (formHistory?.initiateFollowup?.organisationName) {
            form.setValue('organisation_name', formHistory.initiateFollowup.organisationName, { shouldValidate: false });
        }
        if (formHistory?.initiateFollowup?.contacts) {
            form.setValue('contacts', formHistory.initiateFollowup.contacts.map(c => ({
                name: c.name,
                phone: c.phone ?? '',
                email: c.email ?? '',
            })), { shouldValidate: false });
        }
        if (formHistory?.initiateFollowup?.followupStartDate) {
            form.setValue('followup_start_date', formHistory.initiateFollowup.followupStartDate, { shouldValidate: false });
        }
        if (formHistory?.initiateFollowup?.frequency) {
            form.setValue('frequency', formHistory.initiateFollowup.frequency, { shouldValidate: false });
        }

        if (formHistory?.returned?.transferDate) {
            form.setValue('transfer_date', formHistory.returned.transferDate, { shouldValidate: false });
        }
        if (formHistory?.returned?.returnUtr) {
            form.setValue('return_utr', formHistory.returned.returnUtr, { shouldValidate: false });
        }

        if (formHistory?.settled?.remarks) {
            form.setValue('settle_remarks', formHistory.settled.remarks, { shouldValidate: false });
        }
    }, [formHistory, form]);

    const isSubmitting = form.formState.isSubmitting || updateMutation.isPending;

    const handleSubmit = async (values: BankTransferActionFormValues) => {
        try {
            const payload: BankTransferActionPayload = {
                action: values.action,
                ...(values.bt_req && { bt_req: values.bt_req }),
                ...(values.reason_req && { reason_req: values.reason_req }),
                ...(values.payment_datetime && { payment_datetime: values.payment_datetime }),
                ...(values.utr_no && { utr_no: values.utr_no }),
                ...(values.utr_message && { utr_message: values.utr_message }),
                ...(values.organisation_name && { organisation_name: values.organisation_name }),
                ...(values.contacts && { contacts: values.contacts }),
                ...(values.followup_start_date && { followup_start_date: values.followup_start_date }),
                ...(values.frequency && { frequency: values.frequency }),
                ...(values.transfer_date && { transfer_date: values.transfer_date }),
                ...(values.return_utr && { return_utr: values.return_utr }),
                ...(values.settle_remarks && { settle_remarks: values.settle_remarks }),
            };

            await updateMutation.mutateAsync({ id: instrumentId, data: payload });
            toast.success('Payment data updated successfully');
            localStorage.removeItem('bank_transfer_action_data');
            navigate(-1);
            form.reset();
        } catch (error: any) {
            toast.error(error?.message || 'Failed to update payment data');
            console.error('Error updating payment data:', error);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="space-y-3">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Choose What to do
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {availableActions.map((option) => {
                            const hasHistory =
                                (option.value === 'accounts-form' && hasAccountsFormData) ||
                                (option.value === 'initiate-followup' && hasFollowupData) ||
                                (option.value === 'returned' && hasReturnedData) ||
                                (option.value === 'settled' && hasSettledData);

                            return (
                                <div
                                    key={option.value}
                                    className={`relative flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all hover:bg-muted/50 ${selectedAction === option.value ? 'border-primary' : '' }`}
                                    onClick={() => form.setValue('action', option.value, { shouldValidate: true })}
                                >
                                    <div className="flex items-center gap-2">
                                        {getSubmittedBadge(hasHistory)}
                                        <div className="font-medium text-sm flex items-center">
                                            {option.label}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {form.formState.errors.action && (
                        <p className="text-sm text-destructive mt-1">{form.formState.errors.action.message}</p>
                    )}
                </div>

                <ConditionalSection show={selectedAction === 'accounts-form'}>
                    <div className="space-y-4 border rounded-lg p-4 bg-background">
                        <div className="flex items-center gap-2 pb-3 border-b">
                            <FileText className="h-5 w-5 text-primary" />
                            <h4 className="font-semibold text-base">Accounts Form</h4>
                        </div>
                        <p className="text-sm text-muted-foreground -mt-2">
                            Process the payment request through accounts department
                        </p>

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
                            <div className="space-y-4 pt-3">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            </div>
                        )}
                    </div>
                </ConditionalSection>

                <ConditionalSection show={selectedAction === 'initiate-followup'}>
                    <div className="space-y-4 border rounded-lg p-4 bg-background">
                        <div className="flex items-center gap-2 pb-3 border-b">
                            <Users className="h-5 w-5 text-primary" />
                            <h4 className="font-semibold text-base">Initiate Followup</h4>
                        </div>
                        <p className="text-sm text-muted-foreground -mt-2">
                            Start a follow-up process with organisation contacts
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FieldWrapper control={form.control} name="organisation_name" label="Organisation Name">
                                {(field) => <Input {...field} placeholder="Enter organisation name" />}
                            </FieldWrapper>
                        </div>

                        <div>
                            <ContactPersonFields control={form.control} name="contacts" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FieldWrapper control={form.control} name="followup_start_date" label="Follow-up Start Date">
                                {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                            </FieldWrapper>
                            <FollowUpFrequencySelect control={form.control} name="frequency" />
                        </div>
                    </div>
                </ConditionalSection>

                <ConditionalSection show={selectedAction === 'returned'}>
                    <div className="space-y-4 border rounded-lg p-4 bg-background">
                        <div className="flex items-center gap-2 pb-3 border-b">
                            <Banknote className="h-5 w-5 text-primary" />
                            <h4 className="font-semibold text-base">Returned via Bank Transfer</h4>
                        </div>
                        <p className="text-sm text-muted-foreground -mt-2">
                            Record return of payment through bank transfer
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FieldWrapper control={form.control} name="transfer_date" label="Transfer Date">
                                {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="return_utr" label="Return UTR">
                                {(field) => <Input {...field} placeholder="Enter Return UTR number" />}
                            </FieldWrapper>
                        </div>
                    </div>
                </ConditionalSection>

                <ConditionalSection show={selectedAction === 'settled'}>
                    <div className="space-y-4 border rounded-lg p-4 bg-background">
                        <div className="flex items-center gap-2 pb-3 border-b">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                            <h4 className="font-semibold text-base">Settled with Project Account</h4>
                            {getSubmittedBadge(hasSettledData)}
                        </div>
                        <p className="text-sm text-muted-foreground -mt-2">
                            Mark payment as settled with project account
                        </p>
                        <FieldWrapper control={form.control} name="settle_remarks" label="Remarks">
                            {(field) => (
                                <Textarea
                                    {...field}
                                    placeholder="Enter settlement remarks"
                                    className="min-h-[80px]"
                                />
                            )}
                        </FieldWrapper>
                    </div>
                </ConditionalSection>

                <div className="flex justify-end gap-4 pt-4 border-t">
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
