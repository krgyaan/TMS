import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { FollowupEmailEditor } from '@/components/form/FollowupEmailEditor';
import { infoSheetsService } from '@/services/api/info-sheet.service';
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
import { useCreateCourier } from '@/modules/shared/courier/courier.hooks';
import { useUsers } from '@/hooks/api/useUsers';
import { toast } from 'sonner';
import { useWatch } from 'react-hook-form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Users, Package, Banknote, CheckCircle2, XCircle, CheckSquare, Info, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ALL_DD_ACTION_OPTIONS, type DDActionFormProps } from '../helpers/demandDraft.types';

export function DemandDraftActionForm({ instrumentId, action: propAction, tenderId, formHistory, instrumentData, linkedCheque }: DDActionFormProps) {
    const navigate = useNavigate();
    const updateMutation = useUpdateDemandDraftAction();
    const createCourierMutation = useCreateCourier();
    const { data: employees = [] } = useUsers();

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
        defaultValues.remarks_dd = formHistory.accountsForm.remarks;
        defaultValues.courierOrg = formHistory.accountsForm.courierOrg;
        defaultValues.courierName = formHistory.accountsForm.courierName;
        defaultValues.courierPhone = formHistory.accountsForm.courierPhone;
        defaultValues.courierAddrLine1 = formHistory.accountsForm.courierAddrLine1;
        defaultValues.courierAddrLine2 = formHistory.accountsForm.courierAddrLine2;
        defaultValues.courierCity = formHistory.accountsForm.courierCity;
        defaultValues.courierState = formHistory.accountsForm.courierState;
        defaultValues.courierPincode = formHistory.accountsForm.courierPincode;
        defaultValues.empFrom = formHistory.accountsForm.empFrom ? Number(formHistory.accountsForm.empFrom) : undefined;
        defaultValues.delDate = formHistory.accountsForm.delDate;
        defaultValues.urgency = formHistory.accountsForm.urgency ? Number(formHistory.accountsForm.urgency) : undefined;
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
    const emailBody = useWatch({ control: form.control, name: 'emailBody' });

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
        if (formHistory?.accountsForm?.remarks) {
            form.setValue('remarks_dd', formHistory.accountsForm.remarks, { shouldValidate: false });
        }
        if (formHistory?.accountsForm?.courierOrg) form.setValue('courierOrg', formHistory.accountsForm.courierOrg, { shouldValidate: false });
        if (formHistory?.accountsForm?.courierName) form.setValue('courierName', formHistory.accountsForm.courierName, { shouldValidate: false });
        if (formHistory?.accountsForm?.courierPhone) form.setValue('courierPhone', formHistory.accountsForm.courierPhone, { shouldValidate: false });
        if (formHistory?.accountsForm?.courierAddrLine1) form.setValue('courierAddrLine1', formHistory.accountsForm.courierAddrLine1, { shouldValidate: false });
        if (formHistory?.accountsForm?.courierAddrLine2) form.setValue('courierAddrLine2', formHistory.accountsForm.courierAddrLine2, { shouldValidate: false });
        if (formHistory?.accountsForm?.courierCity) form.setValue('courierCity', formHistory.accountsForm.courierCity, { shouldValidate: false });
        if (formHistory?.accountsForm?.courierState) form.setValue('courierState', formHistory.accountsForm.courierState, { shouldValidate: false });
        if (formHistory?.accountsForm?.courierPincode) form.setValue('courierPincode', formHistory.accountsForm.courierPincode, { shouldValidate: false });
        if (formHistory?.accountsForm?.empFrom) form.setValue('empFrom', Number(formHistory.accountsForm.empFrom), { shouldValidate: false });
        if (formHistory?.accountsForm?.delDate) form.setValue('delDate', formHistory.accountsForm.delDate, { shouldValidate: false });
        if (formHistory?.accountsForm?.urgency) form.setValue('urgency', Number(formHistory.accountsForm.urgency), { shouldValidate: false });

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

    useEffect(() => {
        if (tenderId && tenderId > 0) {
            (async () => {
                try {
                    const result = await infoSheetsService.getTenderContacts(tenderId);
                    if (result?.organisationName) {
                        if (selectedAction === 'accounts-form') {
                            const currentOrg = form.getValues('courierOrg');
                            if (!currentOrg) {
                                form.setValue('courierOrg', result.organisationName, { shouldValidate: false });
                            }
                        }
                        if (selectedAction === 'initiate-followup') {
                            const currentOrg = form.getValues('organisation_name');
                            if (!currentOrg) {
                                form.setValue('organisation_name', result.organisationName, { shouldValidate: false });
                            }
                        }
                    }
                    if (selectedAction === 'initiate-followup' && result?.contacts?.length > 0) {
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

    const handleSubmit = async (values: DemandDraftActionFormValues) => {
        try {
            const payload: Record<string, any> = {
                action: values.action,
            };
            if (values.dd_req) payload.dd_req = values.dd_req;
            if (values.reason_req) payload.reason_req = values.reason_req;
            if (values.dd_no) payload.dd_no = values.dd_no;
            if (values.dd_date) payload.dd_date = values.dd_date;
            if (values.remarks_dd) payload.remarks = values.remarks_dd;

            // Create courier dispatch if this is a fresh accounts-form accept
            if (values.action === 'accounts-form' && values.dd_req === 'Accepted' && values.courierOrg && !formHistory?.accountsForm?.reqNo) {
                const toAddr = [values.courierAddrLine1, values.courierAddrLine2, values.courierCity, values.courierState]
                    .filter(Boolean).join(', ');
                const createdCourier = await createCourierMutation.mutateAsync({
                    data: {
                        toOrg: values.courierOrg,
                        toName: values.courierName || '',
                        toAddr: toAddr || '',
                        toPin: values.courierPincode || '',
                        toMobile: values.courierPhone || '',
                        empFrom: values.empFrom || 0,
                        delDate: values.delDate || '',
                        urgency: values.urgency || 1,
                    },
                    files: [],
                });
                payload.req_no = createdCourier.id;
                payload.courier_address_json = JSON.stringify({
                    name: values.courierName || null,
                    phone: values.courierPhone || null,
                    line1: values.courierAddrLine1 || null,
                    line2: values.courierAddrLine2 || null,
                    city: values.courierCity || null,
                    state: values.courierState || null,
                    pincode: values.courierPincode || null,
                });
            }

            if (values.organisation_name) payload.organisation_name = values.organisation_name;
            if (values.contacts) payload.contacts = values.contacts;
            if (values.followup_start_date) payload.followup_start_date = values.followup_start_date;
            if (values.frequency) payload.frequency = Number(values.frequency);
            if (values.docket_no) payload.docket_no = values.docket_no;
            if (values.transfer_date) payload.transfer_date = values.transfer_date;
            if (values.utr) payload.utr = values.utr;
            if (values.cancellation_date) payload.dd_cancellation_date = values.cancellation_date;
            if (values.cancellation_amount) payload.dd_cancellation_amount = values.cancellation_amount;
            if (values.cancellation_reference_no) payload.dd_cancellation_reference_no = values.cancellation_reference_no;
            if (values.emailBody) payload.emailBody = values.emailBody;

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

    const isChequePending = linkedCheque?.status === 'PENDING';

    if (linkedCheque && isChequePending) {
        return (
            <div className="space-y-4">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                        <div className="space-y-2">
                            <p className="font-medium text-amber-800">Linked Cheque is Pending</p>
                            <p className="text-sm text-amber-700">
                                This Demand Draft is linked to{' '}
                                <button
                                    type="button"
                                    className="underline font-medium hover:text-amber-900 cursor-pointer"
                                    onClick={() => navigate(`/bi-dashboard/cheque/action/${linkedCheque.requestId}`)}
                                >
                                    #{linkedCheque.chequeNo || 'View Request'}
                                </button>
                                , which is still <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">{linkedCheque.status}</Badge>.
                                Please process the cheque before filling this DD form.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            {linkedCheque && (
                <div className="rounded-lg border bg-card p-3 text-sm space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="font-medium">Linked Cheque:</span>
                        {linkedCheque.requestId ? (
                            <button
                                type="button"
                                className="underline font-mono hover:text-blue-600 cursor-pointer"
                                onClick={() => navigate(`/bi-dashboard/cheque/action/${linkedCheque.requestId}`)}
                            >
                                #{linkedCheque.chequeNo || 'View Request'}
                            </button>
                        ) : (
                            <span className="font-mono">#{linkedCheque.chequeNo || 'View Request'}</span>
                        )}
                        <Badge variant="outline">{linkedCheque.status}</Badge>
                    </div>
                </div>
            )}
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
                            <div className="space-y-4 pt-3 border-t">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FieldWrapper control={form.control} name="dd_date" label="DD Date">
                                        {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name="dd_no" label="DD No.">
                                        {(field) => <Input {...field} placeholder="Enter DD number" />}
                                    </FieldWrapper>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 pt-2 border-t">
                                        <Truck className="h-4 w-4 text-primary" />
                                        <h5 className="font-medium text-sm">Courier Dispatch</h5>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <FieldWrapper control={form.control} name="courierOrg" label="Organization Name">
                                            {(field) => <Input {...field} placeholder="Enter organization name" />}
                                        </FieldWrapper>
                                        <FieldWrapper control={form.control} name="courierName" label="Recipient Name">
                                            {(field) => <Input {...field} placeholder="Enter recipient name" />}
                                        </FieldWrapper>
                                        <FieldWrapper control={form.control} name="courierPhone" label="Phone">
                                            {(field) => <Input {...field} placeholder="Enter phone number" maxLength={10} />}
                                        </FieldWrapper>
                                        <FieldWrapper control={form.control} name="courierAddrLine1" label="Address Line 1">
                                            {(field) => <Input {...field} placeholder="Building, Street" />}
                                        </FieldWrapper>
                                        <FieldWrapper control={form.control} name="courierAddrLine2" label="Address Line 2">
                                            {(field) => <Input {...field} placeholder="Area, Locality" />}
                                        </FieldWrapper>
                                        <FieldWrapper control={form.control} name="courierCity" label="City">
                                            {(field) => <Input {...field} placeholder="Enter city" />}
                                        </FieldWrapper>
                                        <FieldWrapper control={form.control} name="courierState" label="State">
                                            {(field) => <Input {...field} placeholder="Enter state" />}
                                        </FieldWrapper>
                                        <FieldWrapper control={form.control} name="courierPincode" label="Pin Code">
                                            {(field) => <Input {...field} placeholder="Enter 6-digit pin code" maxLength={6} />}
                                        </FieldWrapper>
                                        <SelectField
                                            control={form.control}
                                            name="empFrom"
                                            label="Courier From"
                                            options={employees.map(e => ({ value: String(e.id), label: e.name }))}
                                            placeholder="Select Employee"
                                        />
                                        <FieldWrapper control={form.control} name="delDate" label="Delivery Date">
                                            {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                                        </FieldWrapper>
                                        <SelectField
                                            control={form.control}
                                            name="urgency"
                                            label="Dispatch Urgency"
                                            options={[
                                                { value: '1', label: 'Same Day (Urgent)' },
                                                { value: '2', label: 'Next Day' }
                                            ]}
                                            placeholder="Select Urgency"
                                        />
                                    </div>
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

                        <div className="pt-4 border-t">
                            <FollowupEmailEditor
                                instrumentType="DD"
                                templateData={{
                                    tenderNo: instrumentData?.tenderNo,
                                    projectName: instrumentData?.tenderName,
                                    amount: instrumentData?.amount,
                                    ddNo: instrumentData?.ddNo,
                                    date: instrumentData?.ddDate ? new Date(instrumentData.ddDate).toISOString() : undefined,
                                    status: instrumentData?.tenderStatusName,
                                }}
                                onEmailBodyChange={(html) => form.setValue('emailBody', html, { shouldValidate: false })}
                                initialEmailBody={formHistory?.initiateFollowup ? undefined : emailBody}
                            />
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
    </>
    );
}
