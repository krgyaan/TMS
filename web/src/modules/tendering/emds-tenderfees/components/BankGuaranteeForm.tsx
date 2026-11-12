import { FieldWrapper } from '@/components/form/FieldWrapper';
import { SelectField, Combobox } from '@/components/form/SelectField';
import { NumberInput } from '@/components/form/NumberInput';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useFormContext, useWatch } from 'react-hook-form';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BG_PURPOSE_OPTIONS, BG_NEEDED_IN_OPTIONS, BANKS } from '../constants';
import DateInput from '@/components/form/DateInput';
import { FileUploader } from '@/components/file-upload';
import { useUsers } from '@/hooks/api/useUsers';
import { useAddTenderClient, useTenderContacts } from '@/hooks/api/useInfoSheets';
import { Briefcase, Loader2, Mail, Phone, Truck, User } from 'lucide-react';

interface PaymentFormBaseProps {
    amount?: number;
    prefix?: string;
    readOnly?: boolean;
    tenderId?: number;
}

type EmailFieldKey = 'user' | 'cp' | 'finance';

const ADD_CONTACT_OPTION = '__add_contact__';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPTY_CONTACT_DRAFT = { name: '', designation: '', email: '', phone: '' };
type ContactDraft = typeof EMPTY_CONTACT_DRAFT;

export function BankGuaranteeForm({ amount, prefix = 'emd.details', readOnly = false, tenderId = 0 }: PaymentFormBaseProps) {
    const { control, setValue } = useFormContext();
    const { data: employees = [] } = useUsers();
    const { data: tenderContacts } = useTenderContacts(tenderId);
    const addTenderClient = useAddTenderClient();
    const bgFormatFiles = useWatch({ control, name: `${prefix}.bgFormatFiles` });
    const bgPoFiles = useWatch({ control, name: `${prefix}.bgPoFiles` });
    const bgCourierDocs = useWatch({ control, name: `${prefix}.bgCourierDocs` });

    // "Add contact person" saves into tender_clients for this tender.
    const [addingFor, setAddingFor] = useState<EmailFieldKey | null>(null);
    const [contactDraft, setContactDraft] = useState<ContactDraft>(EMPTY_CONTACT_DRAFT);
    const [contactError, setContactError] = useState<string | null>(null);

    const emailFieldNames = {
        user: `${prefix}.bgClientUserEmail`,
        cp: `${prefix}.bgClientCpEmail`,
        finance: `${prefix}.bgClientFinanceEmail`,
    } as const;

    const emailOptions = useMemo(() => {
        const rawContacts = (tenderContacts?.contacts ?? []).map(contact => ({
            name: (contact.name ?? '').trim(),
            email: (contact.email ?? '').trim(),
        }));
        const seen = new Set<string>();
        const options = rawContacts
            .filter(contact => contact.email.includes('@'))
            .filter(contact => {
                const key = contact.email.toLowerCase();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .map(contact => ({
                // Show the contact's name, store the email as the value.
                id: contact.email,
                name: contact.name || contact.email,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        options.push({ id: ADD_CONTACT_OPTION, name: '+ Add contact person' });
        return options;
    }, [tenderContacts]);

    const handleEmailChange = (key: EmailFieldKey) => (value: string) => {
        if (value === ADD_CONTACT_OPTION) {
            if (!tenderId) {
                toast.error('Tender not found for this request');
                return;
            }
            setAddingFor(key);
            setContactDraft(EMPTY_CONTACT_DRAFT);
            setContactError(null);
            return;
        }
        setValue(emailFieldNames[key], value || '', { shouldValidate: true, shouldDirty: true });
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
            await addTenderClient.mutateAsync({
                tenderId,
                data: {
                    clientName: name,
                    clientDesignation: contactDraft.designation.trim() || undefined,
                    clientEmail: email,
                    clientMobile: contactDraft.phone.trim() || undefined,
                },
            });
            setValue(emailFieldNames[addingFor], email, { shouldValidate: true, shouldDirty: true });
            cancelContactDraft();
        } catch (error) {
            console.error('Failed to add contact person', error);
            setContactError('Could not save the contact person. Please try again.');
        }
    };

    const isSavingContact = addTenderClient.isPending;

    const renderEmailField = (key: EmailFieldKey, label: string) => (
        <FieldWrapper control={control} name={emailFieldNames[key]} label={label}>
            {(field) => {
                const currentValue = String(field.value ?? '');
                // Keep a legacy/typed email selectable even if it is not a saved contact.
                const fieldOptions = currentValue && !emailOptions.some(option => option.id === currentValue)
                    ? [{ id: currentValue, name: currentValue }, ...emailOptions]
                    : emailOptions;

                return (
                <div className="space-y-2">
                    <Combobox
                        value={currentValue}
                        onChange={handleEmailChange(key)}
                        options={fieldOptions}
                        placeholder="Select Email"
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
                );
            }}
        </FieldWrapper>
    );

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                <SelectField
                    control={control}
                    name={`${prefix}.bgPurpose`}
                    label="Purpose *"
                    options={BG_PURPOSE_OPTIONS}
                    placeholder="Select Purpose"
                    disabled={readOnly}
                />
                <FieldWrapper control={control} name={`${prefix}.bgAmount`} label="Amount *">
                    {(field) => (
                        <NumberInput
                            value={field.value ?? amount}
                            onChange={field.onChange}
                            disabled={readOnly}
                        />
                    )}
                </FieldWrapper>
                <SelectField
                    control={control}
                    name={`${prefix}.bgNeededIn`}
                    label="BG Needed In *"
                    options={BG_NEEDED_IN_OPTIONS}
                    placeholder="Select"
                />
                <FieldWrapper control={control} name={`${prefix}.bgFavouring`} label="BG in Favour of *">
                    {(field) => <Input {...field} placeholder="e.g., Individual or Company Name" />}
                </FieldWrapper>
                <FieldWrapper control={control} name={`${prefix}.bgAddress`} label="BG Address *">
                    {(field) => <Textarea rows={2} {...field} placeholder="e.g., Bank Name or Address" />}
                </FieldWrapper>
                <FieldWrapper control={control} name={`${prefix}.bgExpiryDate`} label="BG Expiry Date *">
                    {(field) => <DateInput value={field.value || null} onChange={field.onChange} />}
                </FieldWrapper>
                <FieldWrapper control={control} name={`${prefix}.bgClaimPeriod`} label="BG Claim Period *">
                    {(field) => <DateInput value={field.value || null} onChange={field.onChange} />}
                </FieldWrapper>
                <FieldWrapper control={control} name={`${prefix}.bgStampValue`} label="Stamp Paper Value">
                    {(field) => <NumberInput min={0} {...field} />}
                </FieldWrapper>
                <SelectField control={control} name={`${prefix}.bgBank`} label="Bank *" options={BANKS} placeholder="Select Bank" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FieldWrapper control={control} name={`${prefix}.bgBankAccountName`} label="Bank Account Name">
                    {(field) => <Input {...field} placeholder="e.g., Individual or Company Name" />}
                </FieldWrapper>
                <FieldWrapper control={control} name={`${prefix}.bgBankAccountNo`} label="Bank Account Number">
                    {(field) => <Input {...field} placeholder="e.g., 1234567890" />}
                </FieldWrapper>
                <FieldWrapper control={control} name={`${prefix}.bgBankIfsc`} label="Bank IFSC Code">
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
                    <FieldWrapper control={control} name={`${prefix}.bgCourierOrg`} label="Organization Name *">
                        {(field) => <Input {...field} placeholder="Enter organization name" />}
                    </FieldWrapper>
                    <FieldWrapper control={control} name={`${prefix}.bgCourierName`} label="Recipient Name *">
                        {(field) => <Input {...field} placeholder="Enter recipient name" />}
                    </FieldWrapper>
                    <FieldWrapper control={control} name={`${prefix}.bgCourierPhone`} label="Phone *">
                        {(field) => <Input {...field} placeholder="Enter phone number" maxLength={10} />}
                    </FieldWrapper>
                    <FieldWrapper control={control} name={`${prefix}.bgCourierAddrLine1`} label="Address Line 1 *">
                        {(field) => <Input {...field} placeholder="Building, Street" />}
                    </FieldWrapper>
                    <FieldWrapper control={control} name={`${prefix}.bgCourierAddrLine2`} label="Address Line 2 *">
                        {(field) => <Input {...field} placeholder="Area, Locality" />}
                    </FieldWrapper>
                    <FieldWrapper control={control} name={`${prefix}.bgCourierCity`} label="City *">
                        {(field) => <Input {...field} placeholder="Enter city" />}
                    </FieldWrapper>
                    <FieldWrapper control={control} name={`${prefix}.bgCourierState`} label="State *">
                        {(field) => <Input {...field} placeholder="Enter state" />}
                    </FieldWrapper>
                    <FieldWrapper control={control} name={`${prefix}.bgCourierPincode`} label="Pin Code *">
                        {(field) => <Input {...field} placeholder="Enter 6-digit pin code" maxLength={6} />}
                    </FieldWrapper>
                    <SelectField
                        control={control}
                        name={`${prefix}.bgCourierEmpFrom`}
                        label="Courier From *"
                        options={employees.map((employee: { id: number | string; name: string }) => ({
                            value: String(employee.id),
                            label: employee.name,
                        }))}
                        placeholder="Select Employee"
                        valueType="string"
                    />
                    <FieldWrapper control={control} name={`${prefix}.bgCourierDelDate`} label="Delivery Date *">
                        {(field) => <DateInput value={field.value || null} onChange={field.onChange} />}
                    </FieldWrapper>
                    <SelectField
                        control={control}
                        name={`${prefix}.bgCourierUrgency`}
                        label="Dispatch Urgency *"
                        options={[
                            { value: '1', label: 'Same Day (Urgent)' },
                            { value: '2', label: 'Next Day' },
                        ]}
                        placeholder="Select Urgency"
                        valueType="string"
                    />
                </div>

                <FileUploader
                    context="courier"
                    label="Soft Copy of the documents"
                    value={bgCourierDocs ?? []}
                    onChange={(paths) => setValue(`${prefix}.bgCourierDocs`, paths)}
                />
            </div>

            <div className="grid grid-cols-3 md:grid-cols-3 gap-4">
                <FileUploader
                    context="bg-format-files"
                    label="BG Format (Max 5 files)"
                    value={bgFormatFiles}
                    onChange={(paths) => setValue(`${prefix}.bgFormatFiles`, paths)}
                />
                <FileUploader
                    context="bg-po-files"
                    label="PO/Tender/Request Letter"
                    value={bgPoFiles}
                    onChange={(paths) => setValue(`${prefix}.bgPoFiles`, paths)}
                />
            </div>
        </div>
    );
}