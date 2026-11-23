import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, type Control, type Resolver } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { ContactPersonFields } from '@/components/form/ContactPersonFields';
import { FollowUpFrequencySelect } from '@/components/form/FollowUpFrequencySelect';
import { FollowupEmailEditor } from '@/components/form/FollowupEmailEditor';
import { ConditionalSection } from '@/components/form/ConditionalSection';
import { infoSheetsService } from '@/services/api/info-sheet.service';
import DateInput from '@/components/form/DateInput';
import { FdrActionFormSchema, type FdrActionFormValues } from '../helpers/fdrActionForm.schema';
import { useUpdateFdrAction } from '@/hooks/api/useFdrs';
import { toast } from 'sonner';
import { useWatch } from 'react-hook-form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Users, Package, Banknote, CheckCircle2, XCircle, CheckSquare, Info, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ALL_FDR_ACTION_OPTIONS, type FDRActionFormProps } from '../helpers/fdr.types';
import { FileUploader } from '@/components/file-upload';

interface MailIdRows {
    fields: Array<{ id: string }>;
    append: (value: { email?: string }) => void;
    remove: (index: number) => void;
}

function MailIdList({
    control,
    name,
    rows,
    heading,
    placeholder,
    removeLabel,
}: {
    control: Control<FdrActionFormValues>;
    name: 'bank_mail_ids' | 'bank_mail_ids_cc';
    rows: MailIdRows;
    heading: string;
    placeholder: string;
    removeLabel: string;
}) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
                <h5 className="font-medium text-sm">{heading}</h5>
                <Button type="button" variant="outline" size="sm" onClick={() => rows.append({ email: '' })}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add
                </Button>
            </div>
            <div className="flex flex-wrap items-end gap-2">
                {rows.fields.map((row, index) => (
                    <div key={row.id} className="flex items-center gap-1 w-full sm:w-72">
                        <FieldWrapper control={control} name={`${name}.${index}.email`} label="">
                            {(field) => (
                                <Input
                                    {...field}
                                    value={(field.value as string | undefined) ?? ''}
                                    type="email"
                                    placeholder={placeholder}
                                />
                            )}
                        </FieldWrapper>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => rows.remove(index)}
                            className="text-destructive hover:text-destructive shrink-0"
                            aria-label={removeLabel}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function FdrActionForm({ instrumentId, action: propAction, tenderId, formHistory, instrumentData, linkedCheque, linkedBg }: FDRActionFormProps) {
    const navigate = useNavigate();
    const updateMutation = useUpdateFdrAction();
    const hasAccountsFormData = !!(formHistory?.accountsForm?.fdrReq);
    const hasAccountsForm2Data = !!(formHistory?.accountsForm?.fdrNo);
    const isAccountsFormAccepted = formHistory?.accountsForm?.fdrReq === 'Accepted';
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
        ? ALL_FDR_ACTION_OPTIONS.filter(opt => opt.value === 'accounts-form')
        : ALL_FDR_ACTION_OPTIONS;

    const defaultValues: FdrActionFormValues = {
        action: '',
        contacts: [],
        bank_mail_ids: [{ email: '' }],
        bank_mail_ids_cc: [{ email: '' }],
    };

    if (formHistory?.accountsForm) {
        defaultValues.fdr_req = formHistory.accountsForm.fdrReq;
        defaultValues.reason_req = formHistory.accountsForm.reasonReq;
        defaultValues.prefilled_signed_fdr = formHistory.accountsForm.prefilledSignedFdr;
        defaultValues.upload_documents = formHistory.accountsForm.uploadDocuments;
        defaultValues.bank_mail_ids = formHistory.accountsForm.bankMailIds?.length
            ? formHistory.accountsForm.bankMailIds
            : [{ email: '' }];
        defaultValues.bank_mail_ids_cc = formHistory.accountsForm.bankMailIdsCc?.length
            ? formHistory.accountsForm.bankMailIdsCc
            : [{ email: '' }];
        defaultValues.fdr_no = formHistory.accountsForm.fdrNo;
        defaultValues.fdr_date = formHistory.accountsForm.fdrDate;
        defaultValues.fdr_validity = formHistory.accountsForm.fdrValidity;
        defaultValues.fdr_roi = formHistory.accountsForm.fdrRoi;
        defaultValues.fdr_copy = formHistory.accountsForm.fdrCopy;
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

    const form = useForm<FdrActionFormValues>({
        resolver: zodResolver(FdrActionFormSchema) as Resolver<FdrActionFormValues>,
        defaultValues,
    });

    const bankMailIds = useFieldArray({ control: form.control, name: 'bank_mail_ids' });
    const bankMailIdsCc = useFieldArray({ control: form.control, name: 'bank_mail_ids_cc' });

    const selectedAction = useWatch({ control: form.control, name: 'action' });
    const fdrReq = useWatch({ control: form.control, name: 'fdr_req' });
    const emailBody = useWatch({ control: form.control, name: 'emailBody' });

    useEffect(() => {
        if (formHistory?.accountsForm?.fdrReq) {
            form.setValue('fdr_req', formHistory.accountsForm.fdrReq, { shouldValidate: false });
        }
        if (formHistory?.accountsForm?.reasonReq) {
            form.setValue('reason_req', formHistory.accountsForm.reasonReq, { shouldValidate: false });
        }
        if (formHistory?.accountsForm?.prefilledSignedFdr?.length) {
            form.setValue('prefilled_signed_fdr', formHistory.accountsForm.prefilledSignedFdr, { shouldValidate: false });
        }
        if (formHistory?.accountsForm?.uploadDocuments) {
            form.setValue('upload_documents', formHistory.accountsForm.uploadDocuments, { shouldValidate: false });
        }
        if (formHistory?.accountsForm?.fdrNo) {
            form.setValue('fdr_no', formHistory.accountsForm.fdrNo, { shouldValidate: false });
        }
        if (formHistory?.accountsForm?.fdrDate) {
            form.setValue('fdr_date', formHistory.accountsForm.fdrDate, { shouldValidate: false });
        }
        if (formHistory?.accountsForm?.fdrValidity) {
            form.setValue('fdr_validity', formHistory.accountsForm.fdrValidity, { shouldValidate: false });
        }
        if (formHistory?.accountsForm?.fdrRoi !== undefined && formHistory.accountsForm.fdrRoi !== null) {
            form.setValue('fdr_roi', formHistory.accountsForm.fdrRoi, { shouldValidate: false });
        }
        if (formHistory?.accountsForm?.fdrCopy?.length) {
            form.setValue('fdr_copy', formHistory.accountsForm.fdrCopy, { shouldValidate: false });
        }
        if (formHistory?.accountsForm?.bankMailIds?.length) {
            bankMailIds.replace(formHistory.accountsForm.bankMailIds);
        }
        if (formHistory?.accountsForm?.bankMailIdsCc?.length) {
            bankMailIdsCc.replace(formHistory.accountsForm.bankMailIdsCc);
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

    useEffect(() => {
        if (tenderId && tenderId > 0) {
            (async () => {
                try {
                    const result = await infoSheetsService.getTenderContacts(tenderId);
                    if (result?.organisationName) {
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
    const isSelectedStageLocked =
        (selectedAction === 'accounts-form' && hasAccountsFormData) ||
        (selectedAction === 'accounts-form-2' && hasAccountsForm2Data);

    const handleSubmit = async (values: FdrActionFormValues) => {
        try {
            const payload: Record<string, any> = {
                action: values.action,
            };
            if (values.fdr_req) payload.fdr_req = values.fdr_req;
            if (values.reason_req) payload.reason_req = values.reason_req;
            if (values.fdr_no) payload.fdr_no = values.fdr_no;
            if (values.fdr_date) payload.fdr_date = values.fdr_date;
            if (values.remarks_fdr) payload.remarks = values.remarks_fdr;

            if (values.action === 'accounts-form') {
                if (values.fdr_req === 'Accepted') {
                    payload.prefilled_signed_fdr = values.prefilled_signed_fdr ?? [];
                    payload.upload_documents = values.upload_documents || '';
                    payload.bank_mail_ids = (values.bank_mail_ids ?? [])
                        .map((row) => row.email?.trim())
                        .filter(Boolean);
                    payload.bank_mail_ids_cc = (values.bank_mail_ids_cc ?? [])
                        .map((row) => row.email?.trim())
                        .filter(Boolean);
                }
            }

            if (values.action === 'accounts-form-2') {
                payload.fdr_no = values.fdr_no || '';
                payload.fdr_date = values.fdr_date || '';
                payload.fdr_validity = values.fdr_validity || '';
                payload.fdr_roi = values.fdr_roi ?? '';
                payload.fdr_copy = values.fdr_copy ?? [];
            }

            if (values.organisation_name) payload.organisation_name = values.organisation_name;
            if (values.contacts) payload.contacts = values.contacts;
            if (values.followup_start_date) payload.followup_start_date = values.followup_start_date;
            if (values.frequency) payload.frequency = Number(values.frequency);
            if (values.docket_no) payload.docket_no = values.docket_no;
            if (values.docket_slip) payload.docket_slip = values.docket_slip;
            if (values.transfer_date) payload.transfer_date = values.transfer_date;
            if (values.utr) payload.utr = values.utr;
            if (values.covering_letter) payload.covering_letter = values.covering_letter;
            if (values.req_receive) payload.req_receive = values.req_receive;
            if (values.cancellation_date) payload.fdr_cancellation_date = values.cancellation_date;
            if (values.cancellation_amount) payload.fdr_cancellation_amount = values.cancellation_amount;
            if (values.cancellation_reference_no) payload.fdr_cancellation_reference_no = values.cancellation_reference_no;
            if (values.emailBody) payload.emailBody = values.emailBody;
            if (values.followup_attachments?.length) payload.followup_attachments = values.followup_attachments;

            await updateMutation.mutateAsync({ id: instrumentId, data: payload });
            toast.success('Action updated successfully');
            localStorage.removeItem('fdr_action_data');
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
                                This FDR is linked to{' '}
                                <button
                                    type="button"
                                    className="underline font-medium hover:text-amber-900"
                                    onClick={() => navigate(`/bi-dashboard/cheque/action/${linkedCheque.requestId}`)}
                                >
                                    Cheque #{linkedCheque.chequeNo}
                                </button>
                                , which is still <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">{linkedCheque.status}</Badge>.
                                Please process the cheque before filling this FDR form.
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
                <div className="rounded-lg border bg-card p-3 text-sm space-y-1 mb-4">
                    <div className="flex items-center gap-2">
                        <span className="font-medium">Linked Cheque:</span>
                        {linkedCheque.requestId ? (
                            <button
                                type="button"
                                className="underline font-mono hover:text-blue-600 cursor-pointer"
                                onClick={() => navigate(`/bi-dashboard/cheque/action/${linkedCheque.requestId}`)}
                            >
                                #{linkedCheque.chequeNo}
                            </button>
                        ) : (
                            <span className="font-mono">#{linkedCheque.chequeNo}</span>
                        )}
                        <Badge variant="outline">{linkedCheque.status}</Badge>
                    </div>
                </div>
            )}

            {linkedBg && (
                <div className="rounded-lg border bg-card p-3 text-sm space-y-1 mb-4">
                    <div className="flex items-center gap-2">
                        <span className="font-medium">Linked BG:</span>
                        <button
                            type="button"
                            className="underline font-mono hover:text-blue-600 cursor-pointer"
                            onClick={() => navigate(`/bi-dashboard/bank-guarantee/action/${linkedBg.instrumentId}`)}
                        >
                            #{linkedBg.bgNo}
                        </button>
                        <Badge variant="outline">{linkedBg.status}</Badge>
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
                                (option.value === 'accounts-form-2' && hasAccountsForm2Data) ||
                                (option.value === 'initiate-followup' && hasFollowupData) ||
                                (option.value === 'returned-courier' && hasReturnedCourierData) ||
                                (option.value === 'returned-bank-transfer' && hasReturnedBankTransferData) ||
                                (option.value === 'settled' && hasSettledData) ||
                                (option.value === 'request-cancellation' && hasRequestCancellationData) ||
                                (option.value === 'cancellation-confirmation' && hasCancellationConfirmationData);

                            // Stage 2 can only be filled after Stage 1 is accepted.
                            const isStage2Locked = option.value === 'accounts-form-2' && !isAccountsFormAccepted;

                            return (
                                <div
                                    key={option.value}
                                    className={`relative flex items-start gap-3 p-4 rounded-lg border-2 text-foreground transition-all ${isStage2Locked
                                        ? 'opacity-50 cursor-not-allowed border-muted'
                                        : hasHistory
                                            ? 'bg-emerald-50 border-emerald-200 cursor-pointer hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800 dark:hover:bg-emerald-950/60'
                                            : `cursor-pointer hover:bg-muted/50 ${selectedAction === option.value ? 'border-primary' : ''}`
                                        }${!isStage2Locked && hasHistory && selectedAction === option.value ? ' border-primary' : ''}`}
                                    onClick={() => {
                                        if (isStage2Locked) return;
                                        form.setValue('action', option.value, { shouldValidate: true });
                                    }}
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
                    <fieldset disabled={hasAccountsFormData} className="min-w-0 [&_input:disabled]:opacity-100 [&_textarea:disabled]:opacity-100">
                    <div className="space-y-4 border rounded-lg p-4 bg-background">
                        <div className="flex items-center gap-2 pb-3 border-b">
                            <FileText className="h-5 w-5 text-primary" />
                            <h4 className="font-semibold text-base">Accounts Form</h4>
                            {hasAccountsFormData && (
                                <Badge
                                    variant="outline"
                                    className="ml-auto rounded-full border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                                >
                                    <CheckCircle2 className="mr-1 h-3 w-3" /> Completed
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground -mt-2">
                            Process the FDR request through accounts department
                        </p>

                        <FieldWrapper control={form.control} name="fdr_req" label="FDR Request">
                            {(field) => (
                                <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-6">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Accepted" id="fdr_req_accepted" />
                                        <Label htmlFor="fdr_req_accepted">Accepted</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Rejected" id="fdr_req_rejected" />
                                        <Label htmlFor="fdr_req_rejected">Rejected</Label>
                                    </div>
                                </RadioGroup>
                            )}
                        </FieldWrapper>

                        {fdrReq === 'Rejected' && (
                            <FieldWrapper control={form.control} name="reason_req" label="Reason for Rejection/Changes required *">
                                {(field) => <Textarea {...field} placeholder="Enter reason for rejection or changes required" className="min-h-[80px]" />}
                            </FieldWrapper>
                        )}

                        {fdrReq === 'Accepted' && (
                            <div className="space-y-4 pt-3 border-t">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FieldWrapper control={form.control} name="prefilled_signed_fdr" label="Bank Form, Signed by CEO">
                                        {(field) => (
                                            <FileUploader
                                                context="fdr-prefilled-signed"
                                                value={field.value || []}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    </FieldWrapper>

                                    <FieldWrapper control={form.control} name="upload_documents" label="Request Letter, Signed by CEO">
                                        {(field) => (
                                            <FileUploader
                                                context="fdr-format-imran"
                                                value={field.value ? [field.value] : []}
                                                onChange={(paths) => field.onChange(paths[0] || '')}
                                            />
                                        )}
                                    </FieldWrapper>
                                </div>

                                <MailIdList
                                    control={form.control}
                                    name="bank_mail_ids"
                                    rows={bankMailIds}
                                    heading="Bank Mail Ids"
                                    placeholder="e.g., bank.manager@bank.com"
                                    removeLabel="Remove mail id"
                                />

                                <MailIdList
                                    control={form.control}
                                    name="bank_mail_ids_cc"
                                    rows={bankMailIdsCc}
                                    heading="Bank Mail Ids CC"
                                    placeholder="e.g., branch@bank.com"
                                    removeLabel="Remove CC mail id"
                                />
                            </div>
                        )}
                    </div>
                    </fieldset>
                </ConditionalSection>

                <ConditionalSection show={selectedAction === 'accounts-form-2'}>
                    <fieldset disabled={hasAccountsForm2Data} className="min-w-0 [&_input:disabled]:opacity-100 [&_textarea:disabled]:opacity-100">
                    <div className="space-y-4 border rounded-lg p-4 bg-background">
                        <div className="flex items-center gap-2 pb-3 border-b">
                            <CheckSquare className="h-5 w-5 text-primary" />
                            <h4 className="font-semibold text-base">Accounts Form 2 - After FDR Creation</h4>
                            {hasAccountsForm2Data && (
                                <Badge
                                    variant="outline"
                                    className="ml-auto rounded-full border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                                >
                                    <CheckCircle2 className="mr-1 h-3 w-3" /> Completed
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground -mt-2">
                            Capture the issued FDR details
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <FieldWrapper control={form.control} name="fdr_no" label="FDR No. *">
                                {(field) => <Input {...field} placeholder="Enter FDR number" />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="fdr_date" label="FDR Date *">
                                {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="fdr_validity" label="FDR Validity *">
                                {(field) => <DateInput value={field.value} onChange={field.onChange} />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="fdr_roi" label="FDR ROI % *">
                                {(field) => <Input {...field} value={field.value ?? ''} type="number" step="0.01" placeholder="Enter ROI" />}
                            </FieldWrapper>
                        </div>

                        <FieldWrapper control={form.control} name="fdr_copy" label="FDR copy *">
                            {(field) => (
                                <FileUploader
                                    context="fdr-copy"
                                    value={field.value || []}
                                    onChange={field.onChange}
                                />
                            )}
                        </FieldWrapper>
                    </div>
                    </fieldset>
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
                                instrumentType="FDR"
                                templateData={{
                                    tenderNo: instrumentData?.tenderNo,
                                    projectName: instrumentData?.tenderName,
                                    amount: instrumentData?.amount,
                                    fdrNo: instrumentData?.fdrNo,
                                    date: instrumentData?.fdrDate ? new Date(instrumentData.fdrDate).toISOString() : undefined,
                                    expiryDate: instrumentData?.fdrExpiryDate ? new Date(instrumentData.fdrExpiryDate).toISOString() : undefined,
                                    status: instrumentData?.tenderStatusName,
                                    courierDetails: formHistory?.accountsForm
                                        ? [
                                            formHistory.accountsForm.courierName,
                                            [formHistory.accountsForm.courierAddrLine1, formHistory.accountsForm.courierAddrLine2].filter(Boolean).join(', '),
                                            [formHistory.accountsForm.courierCity, formHistory.accountsForm.courierState].filter(Boolean).join(', ') + (formHistory.accountsForm.courierPincode ? ` - ${formHistory.accountsForm.courierPincode}` : ''),
                                        ].filter(Boolean).join('\n')
                                        : undefined,
                                }}
                                onEmailBodyChange={(html) => form.setValue('emailBody', html, { shouldValidate: false })}
                                initialEmailBody={formHistory?.initiateFollowup ? undefined : emailBody}
                                onFilesChange={(paths) => form.setValue('followup_attachments', paths, { shouldValidate: false })}
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
                            Record return of FDR through courier
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FieldWrapper control={form.control} name="docket_no" label="Docket No.">
                                {(field) => <Input {...field} placeholder="Enter docket number" />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="docket_slip" label="Upload Docket Slip">
                                {(field) => (
                                    <FileUploader
                                        context="fdr-docket-slip"
                                        value={field.value ? [field.value] : []}
                                        onChange={(paths) => field.onChange(paths[0] || '')}
                                    />
                                )}
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
                            Record return of FDR through bank transfer
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
                            Mark FDR as settled with project account
                        </p>
                    </div>
                </ConditionalSection>

                <ConditionalSection show={selectedAction === 'request-cancellation'}>
                    <div className="space-y-4 border rounded-lg p-4 bg-background">
                        <div className="flex items-center gap-2 pb-3 border-b">
                            <XCircle className="h-5 w-5 text-primary" />
                            <h4 className="font-semibold text-base">Send FDR Cancellation Request</h4>
                        </div>
                        <p className="text-sm text-muted-foreground -mt-2">
                            Upload cancellation request documents
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FieldWrapper control={form.control} name="covering_letter" label="Upload Signed Stamped Covering Letter from the Client">
                                {(field) => (
                                    <FileUploader
                                        context="fdr-covering-letter"
                                        value={field.value ? [field.value] : []}
                                        onChange={(paths) => field.onChange(paths[0] || '')}
                                    />
                                )}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="req_receive" label="Upload the Bank FDR cancellation request receiving from the Bank">
                                {(field) => (
                                    <FileUploader
                                        context="fdr-req-receive"
                                        value={field.value ? [field.value] : []}
                                        onChange={(paths) => field.onChange(paths[0] || '')}
                                    />
                                )}
                            </FieldWrapper>
                        </div>
                    </div>
                </ConditionalSection>

                <ConditionalSection show={selectedAction === 'cancellation-confirmation'}>
                    <div className="space-y-4 border rounded-lg p-4 bg-background">
                        <div className="flex items-center gap-2 pb-3 border-b">
                            <CheckSquare className="h-5 w-5 text-primary" />
                            <h4 className="font-semibold text-base">FDR cancelled at Branch</h4>
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
                    <Button type="submit" disabled={isSubmitting || isSelectedStageLocked}>
                        {isSubmitting ? 'Submitting...' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </Form>
    </>
    );
}
