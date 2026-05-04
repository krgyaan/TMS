import { FieldWrapper } from '@/components/form/FieldWrapper';
import { SelectField } from '@/components/form/SelectField';
import { NumberInput } from '@/components/form/NumberInput';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useFormContext, useWatch } from 'react-hook-form';
import { BG_PURPOSE_OPTIONS, BG_NEEDED_IN_OPTIONS, BANKS } from '../constants';
import DateInput from '@/components/form/DateInput';
import { TenderFileUploader } from '@/components/tender-file-upload';

interface PaymentFormBaseProps {
    amount?: number;
    prefix?: string;
}

export function BankGuaranteeForm({ amount, prefix = 'emd.details' }: PaymentFormBaseProps) {
    const { control, setValue } = useFormContext();
    const bgFormatFiles = useWatch({ control, name: `${prefix}.bgFormatFiles` });
    const bgPoFiles = useWatch({ control, name: `${prefix}.bgPoFiles` });

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                <SelectField
                    control={control}
                    name={`${prefix}.bgPurpose`}
                    label="Purpose *"
                    options={BG_PURPOSE_OPTIONS}
                    placeholder="Select Purpose"
                />
                <FieldWrapper control={control} name={`${prefix}.bgAmount`} label="Amount *">
                    {(field) => (
                        <NumberInput
                            {...field}
                            value={field.value ?? amount}
                            onChange={field.onChange}
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
                <FieldWrapper control={control} name={`${prefix}.bgCourierAddress`} label="Courier Address *">
                    {(field) => <Textarea rows={2} {...field} placeholder="e.g., Bank Name or Address" />}
                </FieldWrapper>
                <FieldWrapper control={control} name={`${prefix}.bgCourierDays`} label="Courier Time (Days)" description="Enter the number of days required for the courier to deliver the BG.">
                    {(field) => <NumberInput min={1} max={10} {...field} />}
                </FieldWrapper>
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

            <div className="grid grid-cols-3 md:grid-cols-3 gap-4">
                <TenderFileUploader
                    context="bg-format-files"
                    label="BG Format (Max 5 files)"
                    value={bgFormatFiles}
                    onChange={(paths) => setValue(`${prefix}.bgFormatFiles`, paths)}
                />
                <TenderFileUploader
                    context="bg-po-files"
                    label="PO/Tender/Request Letter"
                    value={bgPoFiles}
                    onChange={(paths) => setValue(`${prefix}.bgPoFiles`, paths)}
                />
            </div>
        </div>
    );
}