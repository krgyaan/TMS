import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { type SubmitHandler, useForm, useFieldArray, type Resolver, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Plus, Trash2, User, FileText } from 'lucide-react';
import { paths } from '@/app/routes/paths';
import { LoanAdvanceFormSchema, type LoanAdvanceFormValues } from '../helpers/loanAdvance.schema';
import { type LoanAdvanceResponse, type LoanAdvanceListRow, YES_NO_SELECT_OPTIONS, LOAN_TYPE_OPTIONS } from '../helpers/loanAdvance.types';
import { buildLoanAdvanceDefaultValues, mapLoanAdvanceFormToCreateDto, mapLoanAdvanceFormToUpdateDto, mapLoanAdvanceResponseToForm } from '../helpers/loanAdvance.mappers';
import { useCreateLoanAdvance, useUpdateLoanAdvance } from '@/hooks/api/useLoanAdvance';
import { Alert, AlertDescription } from '@/components/ui/alert';
import SelectField from '@/components/form/SelectField';
import { useLoanPartyOptions } from '@/hooks/useSelectOptions';
import DateInput from '@/components/form/DateInput';
import { TenderFileUploader } from '@/components/tender-file-upload';

interface LoanAdvanceFormProps {
    mode: 'create' | 'edit';
    existingData?: LoanAdvanceResponse | LoanAdvanceListRow;
}

export function LoanAdvanceForm({ mode, existingData }: LoanAdvanceFormProps) {
    const navigate = useNavigate();

    const createMutation = useCreateLoanAdvance();
    const updateMutation = useUpdateLoanAdvance();

    const loanPartyOption = useLoanPartyOptions();

    // Compute initial values based on mode
    const initialValues = useMemo(() => {
        if (mode === 'edit' && existingData) {
            return mapLoanAdvanceResponseToForm(existingData);
        }
        return buildLoanAdvanceDefaultValues();
    }, [mode, existingData]);

    const form = useForm<LoanAdvanceFormValues>({
        resolver: zodResolver(LoanAdvanceFormSchema) as Resolver<LoanAdvanceFormValues>,
        defaultValues: initialValues,
    });

    // Watch bankName to auto-fill contact org_name
    const bankName = form.watch('bankName');
    const sanctionLetter = useWatch({ control: form.control, name: "sanctionLetter" });
    const bankLoanSchedule = useWatch({ control: form.control, name: "bankLoanSchedule" });

    // Field array for bank contacts
    const {
        fields: contactFields,
        append: appendContact,
        remove: removeContact
    } = useFieldArray({
        control: form.control,
        name: 'bankContacts',
    });

    // Reset form when initial values change
    useEffect(() => {
        form.reset(initialValues);
    }, [form, initialValues]);

    // Auto-fill org_name when bankName changes
    useEffect(() => {
        if (bankName) {
            contactFields.forEach((_, index) => {
                const currentOrgName = form.getValues(`bankContacts.${index}.orgName`);
                if (!currentOrgName || currentOrgName === '') {
                    form.setValue(`bankContacts.${index}.orgName`, bankName);
                }
            });
        }
    }, [bankName, contactFields, form]);

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    const handleSubmit: SubmitHandler<LoanAdvanceFormValues> = async (values) => {
        console.log('Form values on submit:', values);
        try {
            if (mode === 'create') {
                const payload = mapLoanAdvanceFormToCreateDto(values);
                await createMutation.mutateAsync(payload);
            } else if (existingData?.id) {
                const payload = mapLoanAdvanceFormToUpdateDto(existingData.id, values);
                await updateMutation.mutateAsync({ id: existingData.id, data: payload });
            }
            navigate(paths.accounts.loanAdvances);
        } catch (error) {
            console.error('Error submitting form:', error);
        }
    };

    const handleAddContact = () => {
        appendContact({ orgName: bankName || '', personName: '', phone: '', designation: '', email: '' });
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>
                            {mode === 'create' ? 'New' : 'Edit'} Loan / Advance
                        </CardTitle>
                        <CardDescription className="mt-2">
                            {mode === 'create'
                                ? 'Add a new loan or advance entry'
                                : 'Update loan or advance information'}
                        </CardDescription>
                    </div>
                    <CardAction>
                        <Button variant="outline" onClick={() => navigate(-1)}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                    </CardAction>
                </div>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit, (errors) => console.log(errors))} className="space-y-8">

                        {/* Basic Loan Information */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                                <h3 className="text-lg font-medium">Loan Information</h3>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {/* Loan Party Name */}
                                <SelectField
                                    control={form.control}
                                    name="loanPartyName"
                                    label="Loan Party Name"
                                    options={loanPartyOption}
                                    placeholder="Select Party Name"
                                />

                                {/* Bank/NBFC Name */}
                                <FieldWrapper
                                    control={form.control}
                                    name="bankName"
                                    label="Bank/NBFC Name"
                                >
                                    {field => <Input placeholder="Enter Bank/NBFC name" {...field} />}
                                </FieldWrapper>

                                {/* Type of Loan */}
                                <SelectField
                                    control={form.control}
                                    name="typeOfLoan"
                                    label="Type of Loan"
                                    options={LOAN_TYPE_OPTIONS}
                                    placeholder="Select Loan Type"
                                />

                                {/* Loan Account No */}
                                <FieldWrapper
                                    control={form.control}
                                    name="loanAccNo"
                                    label="Loan Account No."
                                >
                                    {field => <Input placeholder="Enter Loan Account Number" {...field} />}
                                </FieldWrapper>

                                {/* Loan Amount */}
                                <FieldWrapper
                                    control={form.control}
                                    name="loanAmount"
                                    label="Loan Amount"
                                >
                                    {field => <Input type='number' step={0.01} placeholder='Enter Loan Amount' {...field} />}
                                </FieldWrapper>
                                {/* Sanction Letter Date */}
                                <FieldWrapper
                                    control={form.control}
                                    name="sanctionLetterDate"
                                    label="Sanction Letter Date"
                                >
                                    {(field) => <DateInput {...field} />}
                                </FieldWrapper>

                                {/* EMI Payment Date */}
                                <FieldWrapper
                                    control={form.control}
                                    name="emiPaymentDate"
                                    label="EMI Payment Date"
                                >
                                    {(field) => <DateInput {...field} />}
                                </FieldWrapper>

                                {/* Last EMI Date */}
                                <FieldWrapper
                                    control={form.control}
                                    name="lastEmiDate"
                                    label="Last EMI Date"
                                >
                                    {(field) => <DateInput {...field} />}
                                </FieldWrapper>
                            </div>
                        </div>

                        {/* Document Uploads */}
                        <div className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-start">
                                {/* Sanction Letter Upload */}
                                <TenderFileUploader
                                    context="sanctionLetter"
                                    value={sanctionLetter}
                                    onChange={(paths) => form.setValue("sanctionLetter", paths)}
                                    label="Upload Saction Letter"
                                    disabled={isSubmitting}
                                />

                                {/* Bank Loan Schedule Upload */}
                                <TenderFileUploader
                                    context="bankLoanSchedule"
                                    value={bankLoanSchedule}
                                    onChange={(paths) => form.setValue("bankLoanSchedule", paths)}
                                    label="Upload Bank Loan Schedule"
                                    disabled={isSubmitting}
                                />

                                {/* Loan Schedule Google Sheet Link */}
                                <FieldWrapper
                                    control={form.control}
                                    name="loanSchedule"
                                    label="Loan Schedule (Google Sheet Link)"
                                >
                                    {field => <Input placeholder="https://docs.google.com/spreadsheets/..." {...field} />}
                                </FieldWrapper>

                                {/* Charge Created on MCA Website */}
                                <SelectField
                                    control={form.control}
                                    name="chargeMcaWebsite"
                                    label="Charge Created on MCA Website"
                                    options={YES_NO_SELECT_OPTIONS}
                                    placeholder="Select Yes or No"
                                />
                                {/* TDS to be Deducted on Interest */}
                                <SelectField
                                    control={form.control}
                                    name="tdsToBeDeductedOnInterest"
                                    label="TDS to be Deducted on Interest"
                                    options={YES_NO_SELECT_OPTIONS}
                                    placeholder="Select Yes or No"
                                />
                            </div>
                        </div>

                        {/* Bank/NBFC Contact Details Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <User className="h-5 w-5 text-muted-foreground" />
                                    <h3 className="text-lg font-medium">Contact Details of Bank/NBFC</h3>
                                    <span className="text-sm text-muted-foreground">
                                        ({contactFields.length} {contactFields.length === 1 ? 'contact' : 'contacts'})
                                    </span>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddContact}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Contact
                                </Button>
                            </div>

                            {contactFields.length === 0 && (
                                <Alert>
                                    <AlertDescription>
                                        No contacts added. Click "Add Contact" to add bank/NBFC contact details.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {contactFields.map((field, index) => (
                                <Card key={field.id} className="border-dashed">
                                    <CardContent className="pt-4">
                                        <div className="flex items-start justify-between mb-4">
                                            <span className="text-sm font-medium text-muted-foreground">
                                                Contact {index + 1}
                                            </span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeContact(index)}
                                                className="text-destructive hover:text-destructive"
                                                disabled={contactFields.length === 1}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                                            <FieldWrapper
                                                control={form.control}
                                                name={`bankContacts.${index}.orgName`}
                                                label="Organization Name"
                                            >
                                                {(field) => (
                                                    <Input
                                                        {...field}
                                                        placeholder="Organization name"
                                                        disabled
                                                    />
                                                )}
                                            </FieldWrapper>

                                            <FieldWrapper
                                                control={form.control}
                                                name={`bankContacts.${index}.personName`}
                                                label="Person Name"
                                            >
                                                {(field) => (<Input {...field} placeholder="Contact person name" />)}
                                            </FieldWrapper>

                                            <FieldWrapper
                                                control={form.control}
                                                name={`bankContacts.${index}.designation`}
                                                label="Designation"
                                            >
                                                {(field) => (<Input {...field} placeholder="Designation" />)}
                                            </FieldWrapper>

                                            <FieldWrapper
                                                control={form.control}
                                                name={`bankContacts.${index}.phone`}
                                                label="Phone"
                                            >
                                                {(field) => (<Input {...field} type="tel" placeholder="+91XXXXXXXXXX" />)}
                                            </FieldWrapper>

                                            <FieldWrapper
                                                control={form.control}
                                                name={`bankContacts.${index}.email`}
                                                label="Email"
                                            >
                                                {(field) => (
                                                    <Input {...field} type="email" placeholder="email@example.com" />)}
                                            </FieldWrapper>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Form Actions */}
                        <div className="flex justify-end gap-2 pt-6 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate(-1)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => form.reset(initialValues)}
                                disabled={isSubmitting}
                            >
                                Reset
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-orange-500 hover:bg-orange-600 text-white"
                            >
                                {isSubmitting && <span className="animate-spin mr-2">⏳</span>}
                                <Save className="mr-2 h-4 w-4" />
                                {mode === 'create' ? 'Create Loan' : 'Update Loan'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

export default LoanAdvanceForm;
