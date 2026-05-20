import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SelectField } from '@/components/form/SelectField';
import { CompactTenderFileUploader, TenderFileUploader } from '@/components/tender-file-upload';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ContactPersonFields } from '@/components/form/ContactPersonFields';
import { FollowUpFrequencySelect } from '@/components/form/FollowUpFrequencySelect';
import { FollowupEmailEditor } from '@/components/form/FollowupEmailEditor';
import { ConditionalSection } from '@/components/form/ConditionalSection';
import { NumberInput } from '@/components/form/NumberInput';
import DateInput from '@/components/form/DateInput';
import { ChequeActionFormSchema, type ChequeActionFormValues } from '../helpers/chequeActionForm.schema';
import { useUpdateChequeAction } from '@/hooks/api/useCheques';
import { toast } from 'sonner';
import { useWatch } from 'react-hook-form';
import { FileText, Users, Ban, Banknote, Landmark, XCircle, Info, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ALL_CHEQUE_ACTION_OPTIONS, type ChequeActionFormProps } from '../helpers/cheque.types';
import { infoSheetsService } from '@/services/api/info-sheet.service';

export function ChequeActionForm({ instrumentId, action: propAction, tenderId, formHistory, instrumentData }: ChequeActionFormProps) {
    const navigate = useNavigate();
    const updateMutation = useUpdateChequeAction();

    const hasAccountsFormData = !!(formHistory?.accountsForm?.chequeReq);
    const hasFollowupData = !!(formHistory?.initiateFollowup?.organisationName);
    const hasStopChequeData = !!(formHistory?.stopCheque?.stopReasonText);
    const hasPaidViaBankTransferData = !!(formHistory?.paidViaBankTransfer?.utr);
    const hasDepositedInBankData = !!(formHistory?.depositedInBank?.reference);
    const hasCancelledTornData = !!(formHistory?.cancelledTorn?.cancelledImagePath);

    const getSubmittedBadge = (hasData: boolean) => {
        if (!hasData) return (
            <Badge variant="secondary" className="rounded-full p-2">
                <Info className="h-3 w-3" />
            </Badge>
        );
        return (
            <Badge variant="success" className="rounded-full p-2">
                <CheckCircle2 className="h-3 w-3" />
            </Badge>
        );
    };

    const availableActions = propAction === 0
        ? ALL_CHEQUE_ACTION_OPTIONS.filter(opt => opt.value === 'accounts-form')
        : ALL_CHEQUE_ACTION_OPTIONS;

    const defaultValues: ChequeActionFormValues = {
        action: '',
        contacts: [],
    };

    if (formHistory?.accountsForm) {
        defaultValues.cheque_req = formHistory.accountsForm.chequeReq;
        defaultValues.reason_req = formHistory.accountsForm.reasonReq;
        defaultValues.cheque_no = formHistory.accountsForm.chequeNo;
        defaultValues.due_date = formHistory.accountsForm.dueDate;
        defaultValues.remarks = formHistory.accountsForm.remarks;
        defaultValues.cheque_given_from_account = formHistory.accountsForm.chequeGivenFromAccount;
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

    if (formHistory?.stopCheque) {
        defaultValues.stop_reason_text = formHistory.stopCheque.stopReasonText;
    }

    if (formHistory?.paidViaBankTransfer) {
        defaultValues.transfer_date = formHistory.paidViaBankTransfer.transferDate;
        defaultValues.utr = formHistory.paidViaBankTransfer.utr;
        defaultValues.amount = formHistory.paidViaBankTransfer.amount;
    }

    if (formHistory?.depositedInBank) {
        defaultValues.transfer_date = formHistory.depositedInBank.transferDate;
        defaultValues.reference = formHistory.depositedInBank.reference;
    }

    const form = useForm<ChequeActionFormValues>({
        resolver: zodResolver(ChequeActionFormSchema) as Resolver<ChequeActionFormValues>,
        defaultValues,
    });

    const selectedAction = useWatch({ control: form.control, name: 'action' });
    const chequeReq = useWatch({ control: form.control, name: 'cheque_req' });
    const emailBody = useWatch({ control: form.control, name: 'emailBody' });

    useEffect(() => {
        if (formHistory?.accountsForm?.chequeReq) {
            form.setValue('cheque_req', formHistory.accountsForm.chequeReq, { shouldValidate: false });
        }
        if (formHistory?.accountsForm?.reasonReq) {
            form.setValue('reason_req', formHistory.accountsForm.reasonReq, { shouldValidate: false });
        }
        if (formHistory?.accountsForm?.chequeNo) {
            form.setValue('cheque_no', formHistory.accountsForm.chequeNo, { shouldValidate: false });
        }
        if (formHistory?.accountsForm?.dueDate) {
            form.setValue('due_date', formHistory.accountsForm.dueDate, { shouldValidate: false });
        }
        if (formHistory?.accountsForm?.remarks) {
            form.setValue('remarks', formHistory.accountsForm.remarks, { shouldValidate: false });
        }
        if (formHistory?.accountsForm?.chequeGivenFromAccount) {
            form.setValue('cheque_given_from_account', formHistory.accountsForm.chequeGivenFromAccount, { shouldValidate: false });
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

        if (formHistory?.stopCheque?.stopReasonText) {
            form.setValue('stop_reason_text', formHistory.stopCheque.stopReasonText, { shouldValidate: false });
        }

        if (formHistory?.paidViaBankTransfer?.transferDate) {
            form.setValue('transfer_date', formHistory.paidViaBankTransfer.transferDate, { shouldValidate: false });
        }
        if (formHistory?.paidViaBankTransfer?.utr) {
            form.setValue('utr', formHistory.paidViaBankTransfer.utr, { shouldValidate: false });
        }
        if (formHistory?.paidViaBankTransfer?.amount) {
            form.setValue('amount', formHistory.paidViaBankTransfer.amount, { shouldValidate: false });
        }

        if (formHistory?.depositedInBank?.transferDate) {
            form.setValue('transfer_date', formHistory.depositedInBank.transferDate, { shouldValidate: false });
        }
        if (formHistory?.depositedInBank?.reference) {
            form.setValue('reference', formHistory.depositedInBank.reference, { shouldValidate: false });
        }
    }, [formHistory, form]);

    useEffect(() => {
        if (selectedAction === 'initiate-followup' && tenderId && tenderId > 0) {
            (async () => {
                try {
                    const result = await infoSheetsService.getTenderContacts(tenderId);
                    if (result?.organisationName) {
                        const currentOrg = form.getValues('organisation_name');
                        if (!currentOrg) {
                            form.setValue('organisation_name', result.organisationName, { shouldValidate: false });
                        }
                    }
                    if (result?.contacts?.length > 0) {
                        const currentContacts = form.getValues('contacts');
                        if (!currentContacts || currentContacts.length === 0) {
                            form.setValue('contacts', result.contacts.map(c => ({
                                name: c.name,
                                phone: c.phone ?? '',
                                email: c.email ?? '',
                            })), { shouldValidate: false });
                        }
                    }
                } catch (err) {
                    console.error('Failed to load tender contacts:', err);
                }
            })();
        }
    }, [selectedAction, tenderId, form]);

    const isSubmitting = form.formState.isSubmitting || updateMutation.isPending;

    const handleSubmit = async (values: ChequeActionFormValues) => {
        try {
            const data: Record<string, unknown> = {
                action: values.action,
            };

            if (values.cheque_req) data.cheque_req = values.cheque_req;
            if (values.reason_req) data.reason_req = values.reason_req;
            if (values.cheque_no) data.cheque_no = values.cheque_no;
            if (values.due_date) data.due_date = values.due_date;
            if (values.receiving_cheque_handed_over) data.receiving_cheque_handed_over = values.receiving_cheque_handed_over;
            if (values.cheque_images && values.cheque_images.length > 0) {
                data.cheque_images = values.cheque_images;
            }
            if (values.positive_pay_confirmation) data.positive_pay_confirmation = values.positive_pay_confirmation;
            if (values.remarks) data.remarks = values.remarks;
            if (values.cheque_given_from_account) data.cheque_given_from_account = values.cheque_given_from_account;
            if (values.organisation_name) data.organisation_name = values.organisation_name;
            if (values.contacts) data.contacts = values.contacts;
            if (values.followup_start_date) data.followup_start_date = values.followup_start_date;
            if (values.frequency) data.frequency = values.frequency;
            if (values.stop_reason_text) data.stop_reason_text = values.stop_reason_text;
            if (values.proof_image) data.proof_image = values.proof_image;
            if (values.transfer_date) {
                data[values.action === 'deposited-in-bank' ? 'bt_transfer_date' : 'transfer_date'] = values.transfer_date;
            }
            if (values.utr) data.utr = values.utr;
            if (values.amount) data.amount = values.amount;
            if (values.reference) data.reference = values.reference;
            if (values.cancelled_image_path) data.cancelled_image_path = values.cancelled_image_path;
            if (values.emailBody) data.emailBody = values.emailBody;

            await updateMutation.mutateAsync({ id: instrumentId, data });
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
                <div className="space-y-3">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Choose What to do
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {availableActions.map((option) => {
                            const hasHistory =
                                (option.value === 'accounts-form' && hasAccountsFormData) ||
                                (option.value === 'initiate-followup' && hasFollowupData) ||
                                (option.value === 'stop-cheque' && hasStopChequeData) ||
                                (option.value === 'paid-via-bank-transfer' && hasPaidViaBankTransferData) ||
                                (option.value === 'deposited-in-bank' && hasDepositedInBankData) ||
                                (option.value === 'cancelled-torn' && hasCancelledTornData);

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

                {/* Accounts Form */}
                <ConditionalSection show={selectedAction === 'accounts-form'}>
                    <div className="space-y-4 border rounded-lg p-4 bg-background">
                        <div className="flex items-center gap-2 pb-3 border-b">
                            <FileText className="h-5 w-5 text-primary" />
                            <h4 className="font-semibold text-base">Accounts Form</h4>
                        </div>
                        <p className="text-sm text-muted-foreground -mt-2">
                            Process the Cheque request through accounts department
                        </p>

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
                            <div className="space-y-4 pt-3">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FieldWrapper control={form.control} name="cheque_no" label="Cheque No.">
                                        {(field) => <Input {...field} placeholder="Enter cheque number" />}
                                    </FieldWrapper>

                                    <FieldWrapper control={form.control} name="due_date" label="Due date (if payable)">
                                        {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                                    </FieldWrapper>

                                    <FieldWrapper control={form.control} name="cheque_given_from_account" label="Cheque given from Account">
                                        {(field) => <Input {...field} placeholder="Enter account name" />}
                                    </FieldWrapper>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                </div>

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

                        <div className="pt-4 border-t">
                            <FollowupEmailEditor
                                instrumentType="CHEQUE"
                                templateData={{
                                    tenderNo: instrumentData?.tenderNo,
                                    projectName: instrumentData?.tenderName,
                                    amount: instrumentData?.amount,
                                    date: instrumentData?.chequeDate ? new Date(instrumentData.chequeDate).toISOString() : undefined,
                                    status: instrumentData?.tenderStatusName,
                                }}
                                onEmailBodyChange={(html) => form.setValue('emailBody', html, { shouldValidate: false })}
                                initialEmailBody={formHistory?.initiateFollowup ? undefined : emailBody}
                            />
                        </div>
                    </div>
                </ConditionalSection>

                {/* Stop the cheque from the bank */}
                <ConditionalSection show={selectedAction === 'stop-cheque'}>
                    <div className="space-y-4 border rounded-lg p-4 bg-background">
                        <div className="flex items-center gap-2 pb-3 border-b">
                            <Ban className="h-5 w-5 text-primary" />
                            <h4 className="font-semibold text-base">Stop the cheque from the bank</h4>
                        </div>
                        <p className="text-sm text-muted-foreground -mt-2">
                            Request to stop payment of the cheque
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FieldWrapper control={form.control} name="stop_reason_text" label="Reason for Stopping of Cheque *">
                                {(field) => (
                                    <Textarea
                                        {...field}
                                        placeholder="Enter reason for stopping the cheque"
                                        className="min-h-[80px]"
                                    />
                                )}
                            </FieldWrapper>

                            <FieldWrapper control={form.control} name="proof_image" label="Upload Proof Image *">
                                {(field) => (
                                    <CompactTenderFileUploader
                                        context="cheque-stop-proof-image"
                                        value={field.value}
                                        onChange={field.onChange}
                                    />
                                )}
                            </FieldWrapper>
                        </div>
                    </div>
                </ConditionalSection>

                {/* Paid via Bank Transfer */}
                <ConditionalSection show={selectedAction === 'paid-via-bank-transfer'}>
                    <div className="space-y-4 border rounded-lg p-4 bg-background">
                        <div className="flex items-center gap-2 pb-3 border-b">
                            <Banknote className="h-5 w-5 text-primary" />
                            <h4 className="font-semibold text-base">Paid via Bank Transfer</h4>
                        </div>
                        <p className="text-sm text-muted-foreground -mt-2">
                            Record payment made through bank transfer
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FieldWrapper control={form.control} name="transfer_date" label="Transfer Date *">
                                {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="amount" label="UTR Amount *">
                                {(field) => <NumberInput {...field} placeholder="Enter amount" />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="utr" label="UTR Number *">
                                {(field) => <Input {...field} placeholder="Enter UTR number" />}
                            </FieldWrapper>
                        </div>
                    </div>
                </ConditionalSection>

                {/* Deposited in Bank */}
                <ConditionalSection show={selectedAction === 'deposited-in-bank'}>
                    <div className="space-y-4 border rounded-lg p-4 bg-background">
                        <div className="flex items-center gap-2 pb-3 border-b">
                            <Landmark className="h-5 w-5 text-primary" />
                            <h4 className="font-semibold text-base">Deposited in Bank</h4>
                        </div>
                        <p className="text-sm text-muted-foreground -mt-2">
                            Record cheque deposit details
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FieldWrapper control={form.control} name="transfer_date" label="Transfer Date *">
                                {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="reference" label="Bank Reference No *">
                                {(field) => <Input {...field} placeholder="Enter reference number" />}
                            </FieldWrapper>
                        </div>
                    </div>
                </ConditionalSection>

                {/* Cancelled/Torn */}
                <ConditionalSection show={selectedAction === 'cancelled-torn'}>
                    <div className="space-y-4 border rounded-lg p-4 bg-background">
                        <div className="flex items-center gap-2 pb-3 border-b">
                            <XCircle className="h-5 w-5 text-primary" />
                            <h4 className="font-semibold text-base">Cancelled/Torn</h4>
                        </div>
                        <p className="text-sm text-muted-foreground -mt-2">
                            Mark cheque as cancelled or torn
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FieldWrapper control={form.control} name="cancelled_image_path" label="Upload Photo/confirmation from Beneficiary *">
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
