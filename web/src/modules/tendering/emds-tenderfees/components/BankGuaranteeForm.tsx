import { FieldWrapper } from '@/components/form/FieldWrapper';
import { SelectField } from '@/components/form/SelectField';
import { NumberInput } from '@/components/form/NumberInput';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useFormContext, useWatch } from 'react-hook-form';
import { BG_PURPOSE_OPTIONS, BG_NEEDED_IN_OPTIONS, BANKS } from '../constants';
import DateInput from '@/components/form/DateInput';
import { FileUploader } from '@/components/file-upload';
import { useUsers } from '@/hooks/api/useUsers';
import { Truck } from 'lucide-react';

interface PaymentFormBaseProps {
    amount?: number;
    prefix?: string;
    readOnly?: boolean;
}

export function BankGuaranteeForm({ amount, prefix = 'emd.details', readOnly = false }: PaymentFormBaseProps) {
    const { control, setValue } = useFormContext();
    const { data: employees = [] } = useUsers();
    const bgFormatFiles = useWatch({ control, name: `${prefix}.bgFormatFiles` });
    const bgPoFiles = useWatch({ control, name: `${prefix}.bgPoFiles` });
    const bgCourierDocs = useWatch({ control, name: `${prefix}.bgCourierDocs` });

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
                <FieldWrapper control={control} name={`${prefix}.bgClientUserEmail`} label="User Dept. Email">
                    {(field) => <Input type="email" {...field} placeholder="e.g., user@company.com" />}
                </FieldWrapper>
                <FieldWrapper control={control} name={`${prefix}.bgClientCpEmail`} label="C&P Dept. Email">
                    {(field) => <Input type="email" {...field} placeholder="e.g., cp@company.com" />}
                </FieldWrapper>
                <FieldWrapper control={control} name={`${prefix}.bgClientFinanceEmail`} label="Finance Dept. Email">
                    {(field) => <Input type="email" {...field} placeholder="e.g., finance@company.com" />}
                </FieldWrapper>
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