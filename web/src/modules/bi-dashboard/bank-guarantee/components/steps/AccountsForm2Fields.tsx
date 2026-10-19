import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { SelectField } from '@/components/form/SelectField';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import DateInput from '@/components/form/DateInput';
import { FileUploader } from '@/components/file-upload';
import { Truck } from 'lucide-react';

const URGENCY_OPTIONS = [
    { value: '1', label: 'Same Day (Urgent)' },
    { value: '2', label: 'Next Day' },
];

export interface AccountsForm2Names<T extends FieldValues> {
    bgNo: FieldPath<T>;
    bgDate: FieldPath<T>;
    bg2Remark: FieldPath<T>;
    bgValidity?: FieldPath<T>;
    bgClaimPeriod?: FieldPath<T>;
}

interface AccountsForm2FieldsProps<T extends FieldValues> {
    control: Control<T>;
    names: AccountsForm2Names<T>;
    employees?: Array<{ id: number | string; name: string }>;
}

export function AccountsForm2Fields<T extends FieldValues>({
    control,
    names,
    employees = [],
}: AccountsForm2FieldsProps<T>) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <FieldWrapper control={control} name={names.bgNo} label="BG No.">
                    {(field) => (
                        <Input {...field} value={(field.value as string | undefined) ?? ''} placeholder="Enter BG number" />
                    )}
                </FieldWrapper>
                <FieldWrapper control={control} name={names.bgDate} label="BG Creation Date">
                    {(field) => (
                        <DateInput
                            value={(field.value as string | undefined) ?? undefined}
                            onChange={field.onChange}
                        />
                    )}
                </FieldWrapper>
                {names.bgValidity && (
                    <FieldWrapper control={control} name={names.bgValidity} label="BG Validity">
                        {(field) => (
                            <DateInput
                                value={(field.value as string | undefined) ?? undefined}
                                onChange={field.onChange}
                            />
                        )}
                    </FieldWrapper>
                )}
                {names.bgClaimPeriod && (
                    <FieldWrapper control={control} name={names.bgClaimPeriod} label="BG Claim Period Expiry">
                        {(field) => (
                            <DateInput
                                value={(field.value as string | undefined) ?? undefined}
                                onChange={field.onChange}
                            />
                        )}
                    </FieldWrapper>
                )}
                <FieldWrapper control={control} name={names.bg2Remark} label="Remarks">
                    {(field) => (
                        <Textarea
                            {...field}
                            value={(field.value as string | undefined) ?? ''}
                            placeholder="Enter remarks"
                            className="min-h-[80px]"
                        />
                    )}
                </FieldWrapper>
            </div>

            <div className="space-y-3">
                <div className="flex items-center gap-2 pt-2 border-t">
                    <Truck className="h-4 w-4 text-primary" />
                    <h5 className="font-medium text-sm">Courier Dispatch</h5>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FieldWrapper control={control} name="courierOrg" label="Organization Name">
                        {(field) => <Input {...field} value={field.value ?? ''} placeholder="Enter organization name" />}
                    </FieldWrapper>
                    <FieldWrapper control={control} name="courierName" label="Recipient Name">
                        {(field) => <Input {...field} value={field.value ?? ''} placeholder="Enter recipient name" />}
                    </FieldWrapper>
                    <FieldWrapper control={control} name="courierPhone" label="Phone">
                        {(field) => <Input {...field} value={field.value ?? ''} placeholder="Enter phone number" maxLength={10} />}
                    </FieldWrapper>
                    <FieldWrapper control={control} name="courierAddrLine1" label="Address Line 1">
                        {(field) => <Input {...field} value={field.value ?? ''} placeholder="Building, Street" />}
                    </FieldWrapper>
                    <FieldWrapper control={control} name="courierAddrLine2" label="Address Line 2">
                        {(field) => <Input {...field} value={field.value ?? ''} placeholder="Area, Locality" />}
                    </FieldWrapper>
                    <FieldWrapper control={control} name="courierCity" label="City">
                        {(field) => <Input {...field} value={field.value ?? ''} placeholder="Enter city" />}
                    </FieldWrapper>
                    <FieldWrapper control={control} name="courierState" label="State">
                        {(field) => <Input {...field} value={field.value ?? ''} placeholder="Enter state" />}
                    </FieldWrapper>
                    <FieldWrapper control={control} name="courierPincode" label="Pin Code">
                        {(field) => <Input {...field} value={field.value ?? ''} placeholder="Enter 6-digit pin code" maxLength={6} />}
                    </FieldWrapper>
                    <SelectField
                        control={control}
                        name="empFrom"
                        label="Courier From"
                        options={employees.map(e => ({ value: String(e.id), label: e.name }))}
                        placeholder="Select Employee"
                        valueType="string"
                    />
                    <FieldWrapper control={control} name="delDate" label="Delivery Date">
                        {(field) => <DateInput value={field.value ?? undefined} onChange={field.onChange} />}
                    </FieldWrapper>
                    <SelectField
                        control={control}
                        name="urgency"
                        label="Dispatch Urgency"
                        options={URGENCY_OPTIONS}
                        placeholder="Select Urgency"
                        valueType="string"
                    />
                </div>

                <FieldWrapper control={control} name="courier_docs" label="Soft Copy of the documents">
                    {(field) => (
                        <FileUploader
                            context="courier"
                            value={field.value ?? []}
                            onChange={field.onChange}
                        />
                    )}
                </FieldWrapper>
            </div>
        </div>
    );
}
