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
import { StopReasonFields } from '@/components/form/StopReasonFields';
import { ConditionalSection } from '@/components/form/ConditionalSection';
import DateInput from '@/components/form/DateInput';
import DateTimeInput from '@/components/form/DateTimeInput';
import { PayOnPortalActionFormSchema, type PayOnPortalActionFormValues } from '../helpers/payOnPortalActionForm.schema';
import { useUpdatePayOnPortalAction } from '@/hooks/api/usePayOnPortals';
import { toast } from 'sonner';
import { useWatch } from 'react-hook-form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Users, Banknote, CheckCircle, CheckCircle2, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ActionOption {
    value: string;
    label: string;
}

const ALL_ACTION_OPTIONS: ActionOption[] = [
    { value: 'accounts-form', label: 'Accounts Form' },
    { value: 'initiate-followup', label: 'Initiate Followup' },
    { value: 'returned', label: 'Returned via Bank Transfer' },
    { value: 'settled', label: 'Settled with Project Account' },
];

interface AccountsFormHistory {
    popReq?: 'Accepted' | 'Rejected';
    reasonReq?: string;
    paymentDatetime?: string;
    utrNo?: string;
    utrMessage?: string;
}

interface FollowupHistory {
    organisationName?: string;
    contacts?: Array<{
        name: string;
        email: string | null;
        phone: string | null;
        org: string | null;
    }>;
    followupStartDate?: string;
    frequency?: number;
    stopReason?: number;
    proofText?: string;
    stopRemarks?: string;
}

interface ReturnedHistory {
    transferDate?: string;
    utrNo?: string;
}

interface FormHistory {
    accountsForm?: AccountsFormHistory;
    initiateFollowup?: FollowupHistory;
    returned?: ReturnedHistory;
}

interface PayOnPortalActionFormProps {
    instrumentId: number;
    action?: number | null;
    instrumentData?: {
        utrNo?: string;
        portalName?: string;
        amount?: number;
        tenderName?: string;
        tenderNo?: string;
    };
    formHistory?: FormHistory;
}

export function PayOnPortalActionForm({ instrumentId, action, formHistory }: PayOnPortalActionFormProps) {
    const navigate = useNavigate();
    const updateMutation = useUpdatePayOnPortalAction();

    const hasAccountsFormData = !!(formHistory?.accountsForm?.popReq);
    const hasFollowupData = !!(formHistory?.initiateFollowup?.organisationName);
    const hasReturnedData = !!(formHistory?.returned?.transferDate);

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

    const availableActions = action === 0
        ? ALL_ACTION_OPTIONS.filter(opt => opt.value === 'accounts-form')
        : ALL_ACTION_OPTIONS;

    const defaultValues: PayOnPortalActionFormValues = {
        action: '',
        contacts: [],
    };

    if (formHistory?.accountsForm) {
        defaultValues.pop_req = formHistory.accountsForm.popReq;
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
        defaultValues.stop_reason = formHistory.initiateFollowup.stopReason;
        defaultValues.proof_text = formHistory.initiateFollowup.proofText;
        defaultValues.stop_remarks = formHistory.initiateFollowup.stopRemarks;
    }

    if (formHistory?.returned) {
        defaultValues.transfer_date = formHistory.returned.transferDate;
        defaultValues.utr_no = formHistory.returned.utrNo;
    }

    const form = useForm<PayOnPortalActionFormValues>({
        resolver: zodResolver(PayOnPortalActionFormSchema) as Resolver<PayOnPortalActionFormValues>,
        defaultValues,
    });

    const selectedAction = useWatch({ control: form.control, name: 'action' });
    const popReq = useWatch({ control: form.control, name: 'pop_req' });

    useEffect(() => {
        if (formHistory?.accountsForm?.popReq) {
            form.setValue('pop_req', formHistory.accountsForm.popReq, { shouldValidate: false });
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
        if (formHistory?.initiateFollowup?.stopReason) {
            form.setValue('stop_reason', formHistory.initiateFollowup.stopReason, { shouldValidate: false });
        }
        if (formHistory?.initiateFollowup?.proofText) {
            form.setValue('proof_text', formHistory.initiateFollowup.proofText, { shouldValidate: false });
        }
        if (formHistory?.initiateFollowup?.stopRemarks) {
            form.setValue('stop_remarks', formHistory.initiateFollowup.stopRemarks, { shouldValidate: false });
        }

        if (formHistory?.returned?.transferDate) {
            form.setValue('transfer_date', formHistory.returned.transferDate, { shouldValidate: false });
        }
        if (formHistory?.returned?.utrNo) {
            form.setValue('utr_no', formHistory.returned.utrNo, { shouldValidate: false });
        }
    }, [formHistory, form]);

    const isSubmitting = form.formState.isSubmitting || updateMutation.isPending;

    const handleSubmit = async (values: PayOnPortalActionFormValues) => {
        try {
            const formData = new FormData();

            Object.entries(values).forEach(([key, value]) => {
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

                if (value instanceof File) {
                    formData.append(key, value);
                    return;
                }

                if (Array.isArray(value) && value.length > 0 && value[0] instanceof File) {
                    value.forEach((file) => formData.append(key, file));
                    return;
                }

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
            localStorage.removeItem('pay_on_portal_action_data');
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
                <div className="space-y-3">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Choose What to do
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {availableActions.map((option) => {
                            const hasHistory =
                                (option.value === 'accounts-form' && hasAccountsFormData) ||
                                (option.value === 'initiate-followup' && hasFollowupData) ||
                                (option.value === 'returned' && hasReturnedData);

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

                        <FieldWrapper control={form.control} name="pop_req" label="Pay On Portal Request">
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
                                    <Textarea
                                        {...field}
                                        placeholder="Enter reason for rejection"
                                        className="min-h-[80px]"
                                    />
                                )}
                            </FieldWrapper>
                        )}

                        {popReq === 'Accepted' && (
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

                        <div>
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
                            <FieldWrapper control={form.control} name="utr_no" label="UTR Number">
                                {(field) => <Input {...field} placeholder="Enter UTR number" />}
                            </FieldWrapper>
                        </div>
                    </div>
                </ConditionalSection>

                <ConditionalSection show={selectedAction === 'settled'}>
                    <div className="space-y-4 border rounded-lg p-4 bg-background">
                        <div className="flex items-center gap-2 pb-3 border-b">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                            <h4 className="font-semibold text-base">Settled with Project Account</h4>
                        </div>
                        <p className="text-sm text-muted-foreground -mt-2">
                            Mark payment as settled with project account
                        </p>
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