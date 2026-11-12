import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider, useWatch, type Resolver } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Briefcase, Check, ChevronDown, Loader2, Mail, Phone, Save, Truck, User } from 'lucide-react';
import { useCreatePaymentRequest } from '@/hooks/api/usePaymentRequests';
import { useProjectList, useProjectOverview } from '@/hooks/api/useProjectDashboard';
import { useCreateWoContact, useWoContactsByBasicDetail } from '@/hooks/api/useWoContacts';
import { useAddTenderClient, useTenderContacts } from '@/hooks/api/useInfoSheets';
import { useTenders } from '@/hooks/api/useTenders';
import { useUsers } from '@/hooks/api/useUsers';
import { bankGuaranteesKey } from '@/hooks/api/useBankGuarantees';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import DateInput from '@/components/form/DateInput';
import FieldWrapper from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { SelectField, Combobox, type SelectOption } from '@/components/form/SelectField';
import { NumberInput } from '@/components/form/NumberInput';
import { FileUploader } from '@/components/file-upload';
import { BANKS, BG_NEEDED_IN_OPTIONS } from '@/modules/tendering/emds-tenderfees/constants';
import {
    ProjectBgRequestSchema,
    type ProjectBgRequestFormValues,
} from '@/modules/tendering/emds-tenderfees/helpers/payment-request.schema';

type FormValues = ProjectBgRequestFormValues;

const BG_PREFIX = 'EMD.details';

// Purpose options for this form.
const BG_PURPOSE_OPTIONS = [
    { value: 'ADVANCE_PAYMENT', label: 'Advance Payment' },
    { value: 'SECURITY_DEPOSIT', label: 'Security Deposit' },
    { value: 'FINANCIAL', label: 'Financial' },
    { value: 'COUNTER_GUARANTEE', label: 'Counter Guarantee' },
];

// No 48-hour option.
const BG_NEEDED_IN_OPTIONS_FILTERED = BG_NEEDED_IN_OPTIONS.filter(option => option.value !== '48');

const BG_BANK = 'AU_8316';

const ADD_CONTACT_OPTION = '__add_contact__';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EmailFieldKey = 'user' | 'cp' | 'finance';

const EMPTY_CONTACT_DRAFT = { name: '', designation: '', email: '', phone: '' };
type ContactDraft = typeof EMPTY_CONTACT_DRAFT;

/** The tender or project this request is being raised against. */
type BgContext =
    | { kind: 'tender'; id: number; tenderName: string; tenderNo: string; dueDate: string }
    | { kind: 'project'; id: number };

const toDateOnly = (value: string | null | undefined): string => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).split('T')[0] ?? '';
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
};

const formatDateForLabel = (value: string | null | undefined): string => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-IN');
};

/**
 * Combined tender + project picker. Kept separate so the tender/project
 * lists are only fetched on this standalone page.
 */
function TenderProjectSelector({
    value,
    onSelect,
}: {
    value: string;
    onSelect: (context: BgContext) => void;
}) {
    const { data: tenderList } = useTenders(undefined, undefined, { page: 1, limit: 200 });
    const { data: projectList } = useProjectList({ page: 1, limit: 200 });

    const { options, byKey } = useMemo(() => {
        const byKey = new Map<string, BgContext>();
        const options: SelectOption[] = [];

        for (const tender of tenderList?.data ?? []) {
            const key = `tender:${tender.id}`;
            const dueDateLabel = formatDateForLabel(tender.dueDate ? String(tender.dueDate) : '');
            byKey.set(key, {
                kind: 'tender',
                id: tender.id,
                tenderName: tender.tenderName ?? '',
                tenderNo: tender.tenderNo ?? '',
                dueDate: tender.dueDate ? String(tender.dueDate) : '',
            });
            options.push({
                id: key,
                name: tender.tenderName || tender.tenderNo,
                description: `Tender · ${tender.tenderNo}${dueDateLabel ? ` · due ${dueDateLabel}` : ''}`,
            });
        }

        for (const project of projectList?.data ?? []) {
            const key = `project:${project.id}`;
            byKey.set(key, { kind: 'project', id: project.id });
            options.push({
                id: key,
                name: project.projectName || project.poNo || `Project #${project.id}`,
                description: `Project${project.poNo ? ` · WO ${project.poNo}` : ''}`,
            });
        }

        return { options, byKey };
    }, [tenderList, projectList]);

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');

    const selected = options.find(option => option.id === value);
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return options;
        return options.filter(option =>
            option.name.toLowerCase().includes(q) || (option.description ?? '').toLowerCase().includes(q),
        );
    }, [options, query]);

    return (
        <DropdownMenu
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) setQuery('');
            }}
        >
            <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between min-w-0">
                    <span className="truncate">{selected ? selected.name : 'Select Tender / Project'}</span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-96 max-w-[90vw] p-0" align="start">
                <div className="p-2 border-b">
                    <Input
                        autoFocus
                        placeholder="Search..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="h-8"
                    />
                </div>
                <div className="max-h-64 overflow-auto py-1">
                    {filtered.length === 0 && (
                        <div className="px-2 py-2 text-sm text-muted-foreground">No results</div>
                    )}
                    {filtered.map((option) => {
                        const isSelected = option.id === value;
                        return (
                            <DropdownMenuItem
                                key={option.id}
                                onClick={() => {
                                    const context = byKey.get(option.id);
                                    if (context) onSelect(context);
                                    setOpen(false);
                                    setQuery('');
                                }}
                                className="flex items-center justify-between gap-2"
                            >
                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                    <Check className={`mr-1 h-4 w-4 shrink-0 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                                    <span className="flex-1 min-w-0 truncate">{option.name}</span>
                                </div>
                                {option.description && (
                                    <span className="shrink-0 max-w-[45%] truncate text-xs text-muted-foreground">
                                        {option.description}
                                    </span>
                                )}
                            </DropdownMenuItem>
                        );
                    })}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function BankGuaranteeRequestForm() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const createRequest = useCreatePaymentRequest();

    const [selection, setSelection] = useState<BgContext | null>(null);
    const selectedProjectId = selection?.kind === 'project' ? selection.id : 0;

    const { data: overview } = useProjectOverview(selectedProjectId);

    const projectName = overview?.project?.projectName ?? '';
    const poNo = overview?.project?.poNo ?? '';

    // A picked tender supplies the context directly; a project supplies it
    // through its overview (project + linked tender).
    const tenderId = selection?.kind === 'tender' ? selection.id : (overview?.tender?.id ?? 0);
    const woBasicDetailId = selection?.kind === 'tender' ? 0 : (overview?.woBasicDetail?.id ?? 0);

    const { data: woContacts } = useWoContactsByBasicDetail(woBasicDetailId);
    const { data: employees = [] } = useUsers();
    const { data: tenderContacts } = useTenderContacts(tenderId);

    const createWoContact = useCreateWoContact();
    const addTenderClient = useAddTenderClient();

    const [addingFor, setAddingFor] = useState<EmailFieldKey | null>(null);
    const [contactDraft, setContactDraft] = useState<ContactDraft>(EMPTY_CONTACT_DRAFT);
    const [contactError, setContactError] = useState<string | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(ProjectBgRequestSchema) as Resolver<FormValues>,
        defaultValues: {
            tenderName: '',
            tenderNo: '',
            EMD: { mode: 'BG', details: { bgBank: BG_BANK } },
        },
    });

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
                // Show the contact's name, but store the email as the value.
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
            if (!woBasicDetailId && !tenderId) {
                toast.error('Select a tender or project first');
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
            if (woBasicDetailId) {
                // Project flow: saved into wo_contacts (same table as the WO basic details form).
                await createWoContact.mutateAsync({
                    woBasicDetailId,
                    name,
                    designation: contactDraft.designation.trim() || undefined,
                    email,
                    phone: contactDraft.phone.trim() || undefined,
                });
            } else {
                // Tender flow: saved into tender_clients.
                await addTenderClient.mutateAsync({
                    tenderId,
                    data: {
                        clientName: name,
                        clientDesignation: contactDraft.designation.trim() || undefined,
                        clientEmail: email,
                        clientMobile: contactDraft.phone.trim() || undefined,
                    },
                });
            }
            form.setValue(emailFieldNames[addingFor], email, { shouldValidate: true, shouldDirty: true });
            cancelContactDraft();
        } catch (error) {
            console.error('Failed to add contact person', error);
            setContactError('Could not save the contact person. Please try again.');
        }
    };

    const isSavingContact = createWoContact.isPending || addTenderClient.isPending;

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

    // Prefill the name/number/due-date fields from the selected tender or project.
    useEffect(() => {
        if (!selection) return;
        if (selection.kind === 'tender') {
            form.setValue('tenderName', selection.tenderName);
            form.setValue('tenderNo', selection.tenderNo);
            form.setValue('tenderDueDate', toDateOnly(selection.dueDate));
            return;
        }
        // Project: wait for its overview, then mirror the project dashboard form.
        if (!projectName && !poNo) return;
        form.setValue('tenderName', projectName);
        form.setValue('tenderNo', poNo);
        form.setValue('tenderDueDate', '');
    }, [selection, projectName, poNo, form]);

    const bgFormatFiles = useWatch({ control: form.control, name: `${BG_PREFIX}.bgFormatFiles` });
    const bgPoFiles = useWatch({ control: form.control, name: `${BG_PREFIX}.bgPoFiles` });

    const handleSubmit = async (values: FormValues) => {
        if (!selection) {
            toast.error('Select a tender or project');
            return;
        }

        const selectedTender = selection.kind === 'tender' ? selection : null;
        const payload: any = {
            type: 'Other Than Tender',
            tenderNo: selectedTender ? selectedTender.tenderNo : (poNo || values.tenderNo || ''),
            tenderName: selectedTender ? selectedTender.tenderName : (projectName || values.tenderName || ''),
            dueDate: values.tenderDueDate || (selectedTender ? toDateOnly(selectedTender.dueDate) : ''),
            ...(selectedTender ? {} : { projectId: selection.id }),
            // Keep the exact project-style BG purpose (Advance Payment /
            // Security Bond/Deposit / Performance BG) on the request.
            preserveBgPurpose: true,
            EMD: {
                mode: 'BG',
                details: values.EMD?.details || {},
            },
        };

        try {
            await createRequest.mutateAsync({
                tenderId: selectedTender ? selectedTender.id : 0,
                data: payload,
            });
            queryClient.invalidateQueries({ queryKey: bankGuaranteesKey.all });
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
                        Raise a Bank Guarantee request against a tender or a project. It follows the same approval flow as an EMD Bank Guarantee.
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
                        <div className="space-y-2 max-w-sm">
                            <label className="text-sm font-medium">Tender / Project *</label>
                            <TenderProjectSelector
                                value={selection ? `${selection.kind}:${selection.id}` : ''}
                                onSelect={(context) => {
                                    setSelection(context);
                                    cancelContactDraft();
                                }}
                            />
                            <p className="text-xs text-muted-foreground">
                                Select the tender or project this bank guarantee is for.
                            </p>
                        </div>

                        {selection && (
                            <div className={`grid grid-cols-1 md:grid-cols-2 ${selection.kind === 'tender' ? 'lg:grid-cols-3' : ''} gap-4 items-start mb-4`}>
                                <FieldWrapper
                                    control={form.control}
                                    name="tenderName"
                                    label={selection.kind === 'tender' ? 'Tender Name' : 'Project Name'}
                                >
                                    {(field) => <Input {...field} disabled className="bg-muted text-muted-foreground disabled:opacity-100 disabled:cursor-not-allowed" />}
                                </FieldWrapper>
                                <FieldWrapper
                                    control={form.control}
                                    name="tenderNo"
                                    label={selection.kind === 'tender' ? 'Tender No.' : 'Work No.'}
                                >
                                    {(field) => <Input {...field} disabled className="bg-muted text-muted-foreground disabled:opacity-100 disabled:cursor-not-allowed" />}
                                </FieldWrapper>
                                {selection.kind === 'tender' && (
                                    <FieldWrapper control={form.control} name="tenderDueDate" label="Due Date">
                                        {(field) => (
                                            <DateInput
                                                value={field.value || null}
                                                onChange={field.onChange}
                                                disabled
                                                className="bg-muted text-muted-foreground disabled:opacity-100 disabled:cursor-not-allowed"
                                            />
                                        )}
                                    </FieldWrapper>
                                )}
                            </div>
                        )}

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
                                        options={BG_PURPOSE_OPTIONS}
                                        placeholder="Select Purpose"
                                    />
                                    <FieldWrapper control={form.control} name={`${BG_PREFIX}.bgAmount`} label="Amount *">
                                        {(field) => <NumberInput value={field.value} onChange={field.onChange} />}
                                    </FieldWrapper>
                                    <SelectField
                                        control={form.control}
                                        name={`${BG_PREFIX}.bgNeededIn`}
                                        label="BG Needed In *"
                                        options={BG_NEEDED_IN_OPTIONS_FILTERED}
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
                                    <SelectField control={form.control} name={`${BG_PREFIX}.bgBank`} label="Bank *" options={BANKS} placeholder="Select Bank" />
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
                                        <FieldWrapper control={form.control} name={`${BG_PREFIX}.bgCourierDelDate`} label="Delivery Date *">
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

                                    <FieldWrapper control={form.control} name={`${BG_PREFIX}.bgCourierDocs`} label="Soft Copy of the documents">
                                        {(field) => (
                                            <FileUploader
                                                context="courier"
                                                value={field.value ?? []}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    </FieldWrapper>
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

export default BankGuaranteeRequestForm;
