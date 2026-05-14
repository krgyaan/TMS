import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/form/SelectField';
import { ContactPersonFields } from '@/components/form/ContactPersonFields';
import { FollowUpFrequencySelect } from '@/components/form/FollowUpFrequencySelect';
import { ConditionalSection } from '@/components/form/ConditionalSection';
import DateInput from '@/components/form/DateInput';
import { DemandDraftActionFormSchema, type DemandDraftActionFormValues } from '../helpers/demandDraftActionForm.schema';
import { useUpdateDemandDraftAction } from '@/hooks/api/useDemandDrafts';
import { toast } from 'sonner';
import { useWatch } from 'react-hook-form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Users, Package, Banknote, CheckCircle2, XCircle, CheckSquare, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ALL_DD_ACTION_OPTIONS, type DDActionFormProps, type DDFormHistory } from '../helpers/demandDraft.types';
import { useCourierOptions } from '@/modules/shared/courier/courier.hooks';

export function DemandDraftActionForm({ instrumentId, action: propAction, formHistory }: DDActionFormProps) {
    const navigate = useNavigate();
    const updateMutation = useUpdateDemandDraftAction();
    const courierOptions = useCourierOptions();

    const hasAccountsFormData = !!(formHistory?.accountsForm?.ddReq);
    const hasFollowupData = !!(formHistory?.initiateFollowup?.organisationName);
    const hasReturnedCourierData = !!(formHistory?.returnedCourier?.docketNo);
    const hasReturnedBankTransferData = !!(formHistory?.returnedBankTransfer?.utr);
    const hasSettledData = !!(formHistory?.settled);
    const hasRequestCancellationData = !!(formHistory?.requestCancellation);
    const hasCancellationConfirmationData = !!(formHistory?.cancellationConfirmation?.cancellationDate);

    const getSubmittedBadge = (hasData: boolean) => {
        if (!hasData) return <Badge variant={'secondary'} className="rounded-full p-2">
            <Info className="h-3 w-3" />
        </Badge>;
        return (
            <Badge variant={'success'} className="rounded-full p-2">
                <CheckCircle2 className="h-3 w-3" />
            </Badge>
        );
    };

    const availableActions = propAction === 0
        ? ALL_DD_ACTION_OPTIONS.filter(opt => opt.value === 'accounts-form')
        : ALL_DD_ACTION_OPTIONS;

    const defaultValues: DemandDraftActionFormValues = {
        action: '',
        contacts: [],
    };

    if (formHistory?.accountsForm) {
        defaultValues.dd_req = formHistory.accountsForm.ddReq;
        defaultValues.reason_req = formHistory.accountsForm.reasonReq;
        defaultValues.dd_no = formHistory.accountsForm.ddNo;
        defaultValues.dd_date = formHistory.accountsForm.ddDate;
        defaultValues.req_no = formHistory.accountsForm.reqNo ? Number(formHistory.accountsForm.reqNo) : undefined;
        defaultValues.remarks_dd = formHistory.accountsForm.remarks;
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

    if (formHistory?.returnedCourier) {
        defaultValues.docket_no = formHistory.returnedCourier.docketNo;
    }

    if (formHistory?.returnedBankTransfer) {
        defaultValues.transfer_date = formHistory.returnedBankTransfer.transferDate;
        defaultValues.utr = formHistory.returnedBankTransfer.utr;
    }

    if (formHistory?.cancellationConfirmation) {
        defaultValues.cancellation_date = formHistory.cancellationConfirmation.cancellationDate;
        defaultValues.cancellation_amount = formHistory.cancellationConfirmation.cancellationAmount ? Number(formHistory.cancellationConfirmation.cancellationAmount) : undefined;
        defaultValues.cancellation_reference_no = formHistory.cancellationConfirmation.cancellationReferenceNo;
    }

    const form = useForm<DemandDraftActionFormValues>({
        resolver: zodResolver(DemandDraftActionFormSchema) as Resolver<DemandDraftActionFormValues>,
        defaultValues,
    });

    const selectedAction = useWatch({ control: form.control, name: 'action' });
    const ddReq = useWatch({ control: form.control, name: 'dd_req' });

    useEffect(() => {
        if (formHistory?.accountsForm?.ddReq) {
            form.setValue('dd_req', formHistory.accountsForm.ddReq, { shouldValidate: false });
        }
        if (formHistory?.accountsForm?.reasonReq) {
            form.setValue('reason_req', formHistory.accountsForm.reasonReq, { shouldValidate: false });
        }
        if (formHistory?.accountsForm?.ddNo) {
            form.setValue('dd_no', formHistory.accountsForm.ddNo, { shouldValidate: false });
        }
        if (formHistory?.accountsForm?.ddDate) {
            form.setValue('dd_date', formHistory.accountsForm.ddDate, { shouldValidate: false });
        }
        if (formHistory?.accountsForm?.reqNo) {
            form.setValue('req_no', Number(formHistory.accountsForm.reqNo), { shouldValidate: false });
        }
        if (formHistory?.accountsForm?.remarks) {
            form.setValue('remarks_dd', formHistory.accountsForm.remarks, { shouldValidate: false });
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

        if (formHistory?.returnedCourier?.docketNo) {
            form.setValue('docket_no', formHistory.returnedCourier.docketNo, { shouldValidate: false });
        }

        if (formHistory?.returnedBankTransfer?.transferDate) {
            form.setValue('transfer_date', formHistory.returnedBankTransfer.transferDate, { shouldValidate: false });
        }
        if (formHistory?.returnedBankTransfer?.utr) {
            form.setValue('utr', formHistory.returnedBankTransfer.utr, { shouldValidate: false });
        }

        if (formHistory?.cancellationConfirmation?.cancellationDate) {
            form.setValue('cancellation_date', formHistory.cancellationConfirmation.cancellationDate, { shouldValidate: false });
        }
        if (formHistory?.cancellationConfirmation?.cancellationAmount) {
            form.setValue('cancellation_amount', Number(formHistory.cancellationConfirmation.cancellationAmount), { shouldValidate: false });
        }
        if (formHistory?.cancellationConfirmation?.cancellationReferenceNo) {
            form.setValue('cancellation_reference_no', formHistory.cancellationConfirmation.cancellationReferenceNo, { shouldValidate: false });
        }
    }, [formHistory, form]);

    const isSubmitting = form.formState.isSubmitting || updateMutation.isPending;

    const handleSubmit = async (values: DemandDraftActionFormValues) => {
        try {
            const payload: Record<string, any> = {
                action: values.action,
            };
            if (values.dd_req) payload.dd_req = values.dd_req;
            if (values.reason_req) payload.reason_req = values.reason_req;
            if (values.dd_no) payload.dd_no = values.dd_no;
            if (values.dd_date) payload.dd_date = values.dd_date;
            if (values.req_no) payload.req_no = values.req_no;
            if (values.remarks_dd) payload.remarks = values.remarks_dd;
            if (values.organisation_name) payload.organisation_name = values.organisation_name;
            if (values.contacts) payload.contacts = values.contacts;
            if (values.followup_start_date) payload.followup_start_date = values.followup_start_date;
            if (values.frequency) payload.frequency = values.frequency;
            if (values.stop_reason) payload.stop_reason = values.stop_reason;
            if (values.proof_text) payload.proof_text = values.proof_text;
            if (values.stop_remarks) payload.stop_remarks = values.stop_remarks;
            if (values.docket_no) payload.docket_no = values.docket_no;
            if (values.transfer_date) payload.transfer_date = values.transfer_date;
            if (values.utr) payload.utr = values.utr;
            if (values.cancellation_date) payload.dd_cancellation_date = values.cancellation_date;
            if (values.cancellation_amount) payload.dd_cancellation_amount = values.cancellation_amount;
            if (values.cancellation_reference_no) payload.dd_cancellation_reference_no = values.cancellation_reference_no;

            await updateMutation.mutateAsync({ id: instrumentId, data: payload });
            toast.success('Action updated successfully');
            localStorage.removeItem('dd_action_data');
            navigate(-1);
            form.reset();
        } catch (error: any) {
            toast.error(error?.message || 'Failed to update action');
            console.error('Error updating action:', error);
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
                                (option.value === 'returned-courier' && hasReturnedCourierData) ||
                                (option.value === 'returned-bank-transfer' && hasReturnedBankTransferData) ||
                                (option.value === 'settled' && hasSettledData) ||
                                (option.value === 'request-cancellation' && hasRequestCancellationData) ||
                                (option.value === 'cancellation-confirmation' && hasCancellationConfirmationData);

                            return (
                                <div
                                    key={option.value}
                                    className={`relative flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all hover:bg-muted/50 ${selectedAction === option.value ? 'border-primary' : ''}`}
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
                            Process the DD request through accounts department
                        </p>

                        <FieldWrapper control={form.control} name="dd_req" label="DD Request">
                            {(field) => (
                                <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-6">
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
                                {(field) => <Textarea {...field} placeholder="Enter reason for rejection" className="min-h-[80px]" />}
                            </FieldWrapper>
                        )}

                        {ddReq === 'Accepted' && (
                            <div className="space-y-4 pt-3">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FieldWrapper control={form.control} name="dd_date" label="DD Date">
                                        {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="dd_no" label="DD No.">
                                        {(field) => <Input {...field} placeholder="Enter DD number" />}
                                    </FieldWrapper>
                                    <SelectField
                                        control={form.control}
                                        name="req_no"
                                        label="Courier request No."
                                        options={courierOptions}
                                        placeholder="Select courier request number"
                                    />
                                </div>
                                <FieldWrapper control={form.control} name="remarks_dd" label="Remarks (if any)">
                                    {(field) => <Textarea {...field} placeholder="Enter remarks" className="min-h-[80px]" />}
                                </FieldWrapper>
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

                <ConditionalSection show={selectedAction === 'returned-courier'}>
                    <div className="space-y-4 border rounded-lg p-4 bg-background">
                        <div className="flex items-center gap-2 pb-3 border-b">
                            <Package className="h-5 w-5 text-primary" />
                            <h4 className="font-semibold text-base">Returned via Courier</h4>
                        </div>
                        <p className="text-sm text-muted-foreground -mt-2">
                            Record return of DD through courier
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FieldWrapper control={form.control} name="docket_no" label="Docket No.">
                                {(field) => <Input {...field} placeholder="Enter docket number" />}
                            </FieldWrapper>
                        </div>
                    </div>
                </ConditionalSection>

                <ConditionalSection show={selectedAction === 'returned-bank-transfer'}>
                    <div className="space-y-4 border rounded-lg p-4 bg-background">
                        <div className="flex items-center gap-2 pb-3 border-b">
                            <Banknote className="h-5 w-5 text-primary" />
                            <h4 className="font-semibold text-base">Returned via Bank Transfer</h4>
                        </div>
                        <p className="text-sm text-muted-foreground -mt-2">
                            Record return of DD through bank transfer
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FieldWrapper control={form.control} name="transfer_date" label="Transfer Date">
                                {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="utr" label="UTR Number">
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
                            Mark DD as settled with project account
                        </p>
                    </div>
                </ConditionalSection>

                <ConditionalSection show={selectedAction === 'request-cancellation'}>
                    <div className="space-y-4 border rounded-lg p-4 bg-background">
                        <div className="flex items-center gap-2 pb-3 border-b">
                            <XCircle className="h-5 w-5 text-primary" />
                            <h4 className="font-semibold text-base">Send DD Cancellation Request</h4>
                        </div>
                        <p className="text-sm text-muted-foreground -mt-2">
                            Request cancellation of the DD
                        </p>
                    </div>
                </ConditionalSection>

                <ConditionalSection show={selectedAction === 'cancellation-confirmation'}>
                    <div className="space-y-4 border rounded-lg p-4 bg-background">
                        <div className="flex items-center gap-2 pb-3 border-b">
                            <CheckSquare className="h-5 w-5 text-primary" />
                            <h4 className="font-semibold text-base">DD cancelled at Branch</h4>
                        </div>
                        <p className="text-sm text-muted-foreground -mt-2">
                            Confirm cancellation details received from bank
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FieldWrapper control={form.control} name="cancellation_date" label="Date">
                                {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="cancellation_amount" label="Amount credited">
                                {(field) => <Input {...field} placeholder="Enter amount" type="number" />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="cancellation_reference_no" label="Bank reference No.">
                                {(field) => <Input {...field} placeholder="Enter bank reference number" />}
                            </FieldWrapper>
                        </div>
                    </div>
                </ConditionalSection>

                <div className="flex justify-end gap-4 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Submitting...' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
