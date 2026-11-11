import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider, useWatch, type Resolver } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save } from 'lucide-react';
import { useCreatePaymentRequest } from '@/hooks/api/usePaymentRequests';
import { useProjectOverview } from '@/hooks/api/useProjectDashboard';
import { useWoContactsByBasicDetail } from '@/hooks/api/useWoContacts';
import { infoSheetsService } from '@/services/api/info-sheet.service';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import DateInput from '@/components/form/DateInput';
import FieldWrapper from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SelectField, Combobox } from '@/components/form/SelectField';
import { NumberInput } from '@/components/form/NumberInput';
import { FileUploader } from '@/components/file-upload';
import { BANKS, BG_NEEDED_IN_OPTIONS } from '@/modules/tendering/emds-tenderfees/constants';
import {
    BiOtherThanTenderRequestSchema,
    type BiOtherThanTenderRequestFormValues,
} from '@/modules/tendering/emds-tenderfees/helpers/payment-request.schema';

type FormValues = BiOtherThanTenderRequestFormValues;

const BG_PREFIX = 'EMD.details';

// Project-specific purpose options (does not affect the EMD BG form).
const PROJECT_BG_PURPOSE_OPTIONS = [
    { value: 'ADVANCE_PAYMENT', label: 'Advance Payment' },
    { value: 'SECURITY_BOND_DEPOSIT', label: 'Security Bond/Deposit' },
    { value: 'PERFORMANCE_BG', label: 'Performance BG' },
];

// Project BG requests do not offer the 48-hour option.
const PROJECT_BG_NEEDED_IN_OPTIONS = BG_NEEDED_IN_OPTIONS.filter(option => option.value !== '48');

const PROJECT_BG_BANK = 'AU_8316';

const ADD_EMAIL_OPTION = '__add_email__';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EmailFieldKey = 'user' | 'cp' | 'finance';

interface BiBankGuaranteeRequestFormProps {
    projectId: number;
}

/**
 * Bank Guarantee request raised from a project dashboard ("Request BI").
 * Saves to the same payment_requests / payment_instruments tables as the
 * tendering EMD Bank Guarantee flow, with project_id set.
 */
export function BiBankGuaranteeRequestForm({ projectId }: BiBankGuaranteeRequestFormProps) {
    const navigate = useNavigate();
    const createRequest = useCreatePaymentRequest();
    const { data: overview } = useProjectOverview(projectId);

    const projectName = overview?.project?.projectName ?? '';
    const poNo = overview?.project?.poNo ?? '';
    const tenderId = overview?.tender?.id ?? 0;
    const woBasicDetailId = overview?.woBasicDetail?.id ?? 0;

    // Emails connected to this project's tender info sheet + WO contacts.
    const { data: woContacts } = useWoContactsByBasicDetail(woBasicDetailId);
    const { data: tenderContacts } = useQuery({
        queryKey: ['tender-contacts', tenderId],
        queryFn: () => infoSheetsService.getTenderContacts(tenderId),
        enabled: tenderId > 0,
    });

    // Emails typed through "+ Add new email" — kept for this form session only.
    const [customEmails, setCustomEmails] = useState<string[]>([]);
    const [addingFor, setAddingFor] = useState<EmailFieldKey | null>(null);
    const [draftEmail, setDraftEmail] = useState('');
    const [addEmailError, setAddEmailError] = useState<string | null>(null);

    const emailFieldNames = {
        user: `${BG_PREFIX}.bgClientUserEmail`,
        cp: `${BG_PREFIX}.bgClientCpEmail`,
        finance: `${BG_PREFIX}.bgClientFinanceEmail`,
    } as const;

    const emailOptions = useMemo(() => {
        const rawEmails = [
            ...(woContacts ?? []).map(contact => contact.email),
            ...(tenderContacts?.contacts ?? []).map(contact => contact.email),
            ...customEmails,
        ];
        const seen = new Set<string>();
        const options = rawEmails
            .map(email => (email ?? '').trim())
            .filter(email => email.includes('@'))
            .filter(email => {
                const key = email.toLowerCase();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .sort((a, b) => a.localeCompare(b))
            .map(email => ({ id: email, name: email }));

        options.push({ id: ADD_EMAIL_OPTION, name: '+ Add new email' });
        return options;
    }, [woContacts, tenderContacts, customEmails]);

    const emailPlaceholder = emailOptions.length > 1 ? 'Select Email' : '+ Add new email';

    const handleEmailChange = (key: EmailFieldKey) => (value: string) => {
        if (value === ADD_EMAIL_OPTION) {
            setAddingFor(key);
            setDraftEmail('');
            setAddEmailError(null);
            return;
        }
        form.setValue(emailFieldNames[key], value || undefined, { shouldValidate: true, shouldDirty: true });
    };

    const cancelDraftEmail = () => {
        setAddingFor(null);
        setDraftEmail('');
        setAddEmailError(null);
    };

    const commitDraftEmail = () => {
        if (!addingFor) return;
        const email = draftEmail.trim();
        if (!EMAIL_PATTERN.test(email)) {
            setAddEmailError('Enter a valid email address');
            return;
        }
        setCustomEmails(prev =>
            prev.some(existing => existing.toLowerCase() === email.toLowerCase()) ? prev : [...prev, email],
        );
        form.setValue(emailFieldNames[addingFor], email, { shouldValidate: true, shouldDirty: true });
        cancelDraftEmail();
    };

    const renderEmailField = (key: EmailFieldKey, label: string) => (
        <FieldWrapper control={form.control} name={emailFieldNames[key]} label={label}>
            {(field) => (
                <div className="space-y-2">
                    <Combobox
                        value={String(field.value ?? '')}
                        onChange={handleEmailChange(key)}
                        options={emailOptions}
                        placeholder={emailPlaceholder}
                    />
                    {addingFor === key && (
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Input
                                    autoFocus
                                    type="email"
                                    value={draftEmail}
                                    placeholder="name@example.com"
                                    onChange={(e) => {
                                        setDraftEmail(e.target.value);
                                        setAddEmailError(null);
                                    }}
                                    onKeyDown={(e) => {
                                        e.stopPropagation();
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            commitDraftEmail();
                                        } else if (e.key === 'Escape') {
                                            cancelDraftEmail();
                                        }
                                    }}
                                />
                                <Button type="button" size="sm" onClick={commitDraftEmail}>
                                    Add
                                </Button>
                                <Button type="button" size="sm" variant="ghost" onClick={cancelDraftEmail}>
                                    Cancel
                                </Button>
                            </div>
                            {addEmailError && <p className="text-xs text-destructive">{addEmailError}</p>}
                        </div>
                    )}
                </div>
            )}
        </FieldWrapper>
    );

    const form = useForm<FormValues>({
        resolver: zodResolver(BiOtherThanTenderRequestSchema) as Resolver<FormValues>,
        defaultValues: {
            tenderName: '',
            tenderNo: '',
            EMD: { mode: 'BG', details: { bgBank: PROJECT_BG_BANK } },
        },
    });

    // Prefill project name + work no. once, when the overview loads.
    const prefilledRef = useRef(false);
    useEffect(() => {
        if (prefilledRef.current) return;
        if (!projectName && !poNo) return;
        prefilledRef.current = true;
        form.setValue('tenderName', projectName);
        form.setValue('tenderNo', poNo);
    }, [projectName, poNo, form]);

    const bgFormatFiles = useWatch({ control: form.control, name: `${BG_PREFIX}.bgFormatFiles` });
    const bgPoFiles = useWatch({ control: form.control, name: `${BG_PREFIX}.bgPoFiles` });

    const handleSubmit = async (values: FormValues) => {
        const payload: any = {
            type: 'Other Than Tender',
            tenderNo: poNo || values.tenderNo || '',
            tenderName: projectName || values.tenderName || '',
            dueDate: values.tenderDueDate || '',
            projectId,
            EMD: {
                mode: 'BG',
                details: values.EMD?.details || {},
            },
        };

        try {
            await createRequest.mutateAsync({
                tenderId: 0,
                data: payload,
            });
            toast.success('Bank Guarantee request created successfully');
            navigate(-1);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl">Request Bank Guarantee</CardTitle>
                <CardDescription>
                    <p className="text-muted-foreground">
                        Raise a Bank Guarantee request for this project. It follows the same approval flow as an EMD Bank Guarantee.
                    </p>
                </CardDescription>
                <CardAction>
                    <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        <span className="hidden md:inline">Back</span>
                    </Button>
                </CardAction>
            </CardHeader>

            <CardContent>
                <FormProvider {...form}>
                    <form
                        onSubmit={form.handleSubmit(handleSubmit, (errors) => {
                            console.error('Form validation errors:', errors);
                            toast.error('Please fix the errors in the form before submitting');
                        })}
                        className="space-y-8"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start mb-4">
                            <FieldWrapper control={form.control} name="tenderName" label="Project Name">
                                {(field) => <Input {...field} disabled className="bg-muted text-muted-foreground disabled:opacity-100 disabled:cursor-not-allowed" />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="tenderNo" label="Work No.">
                                {(field) => <Input {...field} disabled className="bg-muted text-muted-foreground disabled:opacity-100 disabled:cursor-not-allowed" />}
                            </FieldWrapper>
                        </div>

                        <div className="border rounded-lg p-6 bg-muted/20">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">Bank Guarantee Details</h3>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                                    <SelectField
                                        control={form.control}
                                        name={`${BG_PREFIX}.bgPurpose`}
                                        label="Purpose *"
                                        options={PROJECT_BG_PURPOSE_OPTIONS}
                                        placeholder="Select Purpose"
                                    />
                                    <FieldWrapper control={form.control} name={`${BG_PREFIX}.bgAmount`} label="Amount *">
                                        {(field) => <NumberInput value={field.value} onChange={field.onChange} />}
                                    </FieldWrapper>
                                    <SelectField
                                        control={form.control}
                                        name={`${BG_PREFIX}.bgNeededIn`}
                                        label="BG Needed In *"
                                        options={PROJECT_BG_NEEDED_IN_OPTIONS}
                                        placeholder="Select"
                                    />
                                    <FieldWrapper control={form.control} name={`${BG_PREFIX}.bgFavouring`} label="BG in Favour of *">
                                        {(field) => <Input {...field} placeholder="e.g., Individual or Company Name" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name={`${BG_PREFIX}.bgAddress`} label="BG Address (Client Address to be written in BG) *">
                                        {(field) => <Textarea rows={2} {...field} placeholder="e.g., Bank Name or Address" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name={`${BG_PREFIX}.bgExpiryDate`} label="BG Expiry Date *">
                                        {(field) => <DateInput value={field.value || null} onChange={field.onChange} />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name={`${BG_PREFIX}.bgClaimPeriod`} label="BG Claim Period *">
                                        {(field) => <DateInput value={field.value || null} onChange={field.onChange} />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name={`${BG_PREFIX}.bgStampValue`} label="Stamp Paper Value">
                                        {(field) => <NumberInput min={0} {...field} />}
                                    </FieldWrapper>
                                    <SelectField control={form.control} name={`${BG_PREFIX}.bgBank`} label="Bank *" options={BANKS} placeholder="Select Bank" disabled />
                                    <FieldWrapper control={form.control} name={`${BG_PREFIX}.bgCourierAddress`} label="Courier Address *">
                                        {(field) => <Textarea rows={2} {...field} placeholder="e.g., Bank Name or Address" />}
                                    </FieldWrapper>
                                    <FieldWrapper
                                        control={form.control}
                                        name={`${BG_PREFIX}.bgCourierDays`}
                                        label={
                                            <span>
                                                Courier Time{' '}
                                                <span className="text-muted-foreground font-normal text-xs">
                                                    (Number of days required for the courier to deliver the BG)
                                                </span>
                                            </span>
                                        }
                                    >
                                        {(field) => <NumberInput min={1} max={10} {...field} />}
                                    </FieldWrapper>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FieldWrapper control={form.control} name={`${BG_PREFIX}.bgBankAccountName`} label="Customer Account Name">
                                        {(field) => <Input {...field} placeholder="e.g., Individual or Company Name" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name={`${BG_PREFIX}.bgBankAccountNo`} label="Customer Account Number">
                                        {(field) => <Input {...field} placeholder="e.g., 1234567890" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name={`${BG_PREFIX}.bgBankIfsc`} label="Customer IFSC Code">
                                        {(field) => <Input {...field} placeholder="e.g., SBIN0001234" />}
                                    </FieldWrapper>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {renderEmailField('user', 'User Dept. Email')}
                                    {renderEmailField('cp', 'C&P Dept. Email')}
                                    {renderEmailField('finance', 'Finance Dept. Email')}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FileUploader
                                        context="bg-format-files"
                                        label="BG Format (Max 5 files)"
                                        value={bgFormatFiles}
                                        onChange={(paths) => form.setValue(`${BG_PREFIX}.bgFormatFiles`, paths)}
                                    />
                                    <FileUploader
                                        context="bg-po-files"
                                        label="PO/Tender/Request Letter"
                                        value={bgPoFiles}
                                        onChange={(paths) => form.setValue(`${BG_PREFIX}.bgPoFiles`, paths)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-4 pt-6 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                size="lg"
                                onClick={() => navigate(-1)}
                                disabled={createRequest.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                size="lg"
                                disabled={createRequest.isPending}
                                className="min-w-48"
                            >
                                {createRequest.isPending ? (
                                    'Submitting...'
                                ) : (
                                    <>
                                        <Save className="mr-2 h-5 w-5" />
                                        Submit Request
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </FormProvider>
            </CardContent>
        </Card>
    );
}
