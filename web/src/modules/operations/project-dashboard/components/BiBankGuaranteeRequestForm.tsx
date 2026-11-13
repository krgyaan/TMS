import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider, useWatch, type Resolver } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Briefcase, Loader2, Mail, Phone, Save, Truck, User } from 'lucide-react';
import { useCreatePaymentRequest } from '@/hooks/api/usePaymentRequests';
import { useProjectOverview } from '@/hooks/api/useProjectDashboard';
import { useCreateWoContact, useWoContactsByBasicDetail } from '@/hooks/api/useWoContacts';
import { useTenderContacts } from '@/hooks/api/useInfoSheets';
import { useUsers } from '@/hooks/api/useUsers';
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
    ProjectBgRequestSchema,
    type ProjectBgRequestFormValues,
} from '@/modules/tendering/emds-tenderfees/helpers/payment-request.schema';

type FormValues = ProjectBgRequestFormValues;

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

const ADD_CONTACT_OPTION = '__add_contact__';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EmailFieldKey = 'user' | 'cp' | 'finance';

const EMPTY_CONTACT_DRAFT = { name: '', designation: '', email: '', phone: '' };
type ContactDraft = typeof EMPTY_CONTACT_DRAFT;

interface BiBankGuaranteeRequestFormProps {
    projectId: number;
}


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
    const { data: employees = [] } = useUsers();
    const { data: tenderContacts } = useTenderContacts(tenderId);

    const createWoContact = useCreateWoContact();
    const [addingFor, setAddingFor] = useState<EmailFieldKey | null>(null);
    const [contactDraft, setContactDraft] = useState<ContactDraft>(EMPTY_CONTACT_DRAFT);
    const [contactError, setContactError] = useState<string | null>(null);

    const emailFieldNames = {
        user: `${BG_PREFIX}.bgClientUserEmail`,
        cp: `${BG_PREFIX}.bgClientCpEmail`,
        finance: `${BG_PREFIX}.bgClientFinanceEmail`,
    } as const;

    const emailOptions = useMemo(() => {
        const rawContacts = [
            ...(woContacts ?? []).map(contact => ({ name: contact.name, email: contact.email })),
            ...(tenderContacts?.contacts ?? []).map(contact => ({ name: contact.name, email: contact.email })),
        ];
        const seen = new Set<string>();
        const options = rawContacts
            .map(contact => ({ name: (contact.name ?? '').trim(), email: (contact.email ?? '').trim() }))
            .filter(contact => contact.email.includes('@'))
            .filter(contact => {
                const key = contact.email.toLowerCase();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .map(contact => ({
                // Show the contact's name in the dropdown, but the stored value stays the email.
                id: contact.email,
                name: contact.name || contact.email,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        options.push({ id: ADD_CONTACT_OPTION, name: '+ Add contact person' });
        return options;
    }, [woContacts, tenderContacts]);

    const emailPlaceholder = emailOptions.length > 1 ? 'Select Email' : '+ Add contact person';

    const handleEmailChange = (key: EmailFieldKey) => (value: string) => {
        if (value === ADD_CONTACT_OPTION) {
            if (!woBasicDetailId) {
                toast.error('Work order details not found for this project');
                return;
            }
            setAddingFor(key);
            setContactDraft(EMPTY_CONTACT_DRAFT);
            setContactError(null);
            return;
        }
        form.setValue(emailFieldNames[key], value || undefined, { shouldValidate: true, shouldDirty: true });
    };

    const setContactField = (field: keyof ContactDraft, value: string) => {
        setContactDraft(prev => ({ ...prev, [field]: value }));
        setContactError(null);
    };

    const cancelContactDraft = () => {
        setAddingFor(null);
        setContactDraft(EMPTY_CONTACT_DRAFT);
        setContactError(null);
    };

    const saveContactDraft = async () => {
        if (!addingFor) return;
        const name = contactDraft.name.trim();
        const email = contactDraft.email.trim();

        if (!name) {
            setContactError('Full Name is required');
            return;
        }
        if (!EMAIL_PATTERN.test(email)) {
            setContactError('Enter a valid email address');
            return;
        }

        try {
            // Saved into wo_contacts — the same table the WO basic details form uses.
            await createWoContact.mutateAsync({
                woBasicDetailId,
                name,
                designation: contactDraft.designation.trim() || undefined,
                email,
                phone: contactDraft.phone.trim() || undefined,
            });
            form.setValue(emailFieldNames[addingFor], email, { shouldValidate: true, shouldDirty: true });
            cancelContactDraft();
        } catch (error) {
            console.error('Failed to add contact person', error);
            setContactError('Could not save the contact person. Please try again.');
        }
    };

    const isSavingContact = createWoContact.isPending;

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
                        <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                            <div className="grid grid-cols-1 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium">Full Name *</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            autoFocus
                                            className="pl-10"
                                            placeholder="Enter full name"
                                            value={contactDraft.name}
                                            disabled={isSavingContact}
                                            onChange={(e) => setContactField('name', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium">Designation</label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            className="pl-10"
                                            placeholder="Enter designation"
                                            value={contactDraft.designation}
                                            disabled={isSavingContact}
                                            onChange={(e) => setContactField('designation', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium">Email Address *</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="email"
                                            className="pl-10"
                                            placeholder="email@example.com"
                                            value={contactDraft.email}
                                            disabled={isSavingContact}
                                            onChange={(e) => setContactField('email', e.target.value)}
                                            onKeyDown={(e) => {
                                                e.stopPropagation();
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    void saveContactDraft();
                                                } else if (e.key === 'Escape') {
                                                    cancelContactDraft();
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium">Phone Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            className="pl-10"
                                            placeholder="Enter phone number"
                                            maxLength={10}
                                            value={contactDraft.phone}
                                            disabled={isSavingContact}
                                            onChange={(e) => setContactField('phone', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                            {contactError && <p className="text-xs text-destructive">{contactError}</p>}
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => void saveContactDraft()}
                                    disabled={isSavingContact}
                                >
                                    {isSavingContact ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        'Save Contact'
                                    )}
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={cancelContactDraft}
                                    disabled={isSavingContact}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </FieldWrapper>
    );

    const form = useForm<FormValues>({
        resolver: zodResolver(ProjectBgRequestSchema) as Resolver<FormValues>,
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
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FieldWrapper control={form.control} name={`${BG_PREFIX}.bgBankAccountName`} label="Customer Account Name *">
                                        {(field) => <Input {...field} placeholder="e.g., Individual or Company Name" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name={`${BG_PREFIX}.bgBankAccountNo`} label="Customer Account Number *">
                                        {(field) => <Input {...field} placeholder="e.g., 1234567890" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name={`${BG_PREFIX}.bgBankIfsc`} label="Customer IFSC Code *">
                                        {(field) => <Input {...field} placeholder="e.g., SBIN0001234" />}
                                    </FieldWrapper>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {renderEmailField('user', 'User Dept. Email')}
                                    {renderEmailField('cp', 'C&P Dept. Email')}
                                    {renderEmailField('finance', 'Finance Dept. Email')}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FieldWrapper control={form.control} name={`${BG_PREFIX}.uniqueCode`} label="Unique Code">
                                        {(field) => <Input {...field} placeholder="e.g., BG-XXXXXX" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name={`${BG_PREFIX}.uniqueAdviceMessage`} label="Unique Advice Message">
                                        {(field) => <Textarea rows={3} {...field} placeholder="Advice message from the bank" />}
                                    </FieldWrapper>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 pt-2 border-t">
                                        <Truck className="h-4 w-4 text-primary" />
                                        <h5 className="font-medium text-sm">Courier Dispatch</h5>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <FieldWrapper control={form.control} name={`${BG_PREFIX}.bgCourierOrg`} label="Organization Name *">
                                            {(field) => <Input {...field} placeholder="Enter organization name" />}
                                        </FieldWrapper>
                                        <FieldWrapper control={form.control} name={`${BG_PREFIX}.bgCourierName`} label="Recipient Name *">
                                            {(field) => <Input {...field} placeholder="Enter recipient name" />}
                                        </FieldWrapper>
                                        <FieldWrapper control={form.control} name={`${BG_PREFIX}.bgCourierPhone`} label="Phone *">
                                            {(field) => <Input {...field} placeholder="Enter phone number" maxLength={10} />}
                                        </FieldWrapper>
                                        <FieldWrapper control={form.control} name={`${BG_PREFIX}.bgCourierAddrLine1`} label="Address Line 1 *">
                                            {(field) => <Input {...field} placeholder="Building, Street" />}
                                        </FieldWrapper>
                                        <FieldWrapper control={form.control} name={`${BG_PREFIX}.bgCourierAddrLine2`} label="Address Line 2 *">
                                            {(field) => <Input {...field} placeholder="Area, Locality" />}
                                        </FieldWrapper>
                                        <FieldWrapper control={form.control} name={`${BG_PREFIX}.bgCourierCity`} label="City *">
                                            {(field) => <Input {...field} placeholder="Enter city" />}
                                        </FieldWrapper>
                                        <FieldWrapper control={form.control} name={`${BG_PREFIX}.bgCourierState`} label="State *">
                                            {(field) => <Input {...field} placeholder="Enter state" />}
                                        </FieldWrapper>
                                        <FieldWrapper control={form.control} name={`${BG_PREFIX}.bgCourierPincode`} label="Pin Code *">
                                            {(field) => <Input {...field} placeholder="Enter 6-digit pin code" maxLength={6} />}
                                        </FieldWrapper>
                                        <SelectField
                                            control={form.control}
                                            name={`${BG_PREFIX}.bgCourierEmpFrom`}
                                            label="Courier From *"
                                            options={employees.map((employee: { id: number | string; name: string }) => ({
                                                value: String(employee.id),
                                                label: employee.name,
                                            }))}
                                            placeholder="Select Employee"
                                            valueType="string"
                                        />
                                        <FieldWrapper control={form.control} name={`${BG_PREFIX}.bgCourierDelDate`} label="Expected Delivery Date *">
                                            {(field) => <DateInput value={field.value || null} onChange={field.onChange} />}
                                        </FieldWrapper>
                                        <SelectField
                                            control={form.control}
                                            name={`${BG_PREFIX}.bgCourierUrgency`}
                                            label="Dispatch Urgency *"
                                            options={[
                                                { value: '1', label: 'Same Day (Urgent)' },
                                                { value: '2', label: 'Next Day' },
                                            ]}
                                            placeholder="Select Urgency"
                                            valueType="string"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FileUploader
                                        context="bg-format-files"
                                        label="BG Format (Max 5 files)"
                                        value={bgFormatFiles}
                                        onChange={(paths) => form.setValue(`${BG_PREFIX}.bgFormatFiles`, paths)}
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
