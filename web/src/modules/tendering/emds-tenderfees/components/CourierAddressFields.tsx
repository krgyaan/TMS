import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import type { Control } from 'react-hook-form';

interface CourierAddressFieldsProps {
    prefix: string;
    control: Control<any>;
    fieldPrefix: 'dd' | 'fdr' | 'cheque';
}

export function CourierAddressFields({ prefix, control, fieldPrefix }: CourierAddressFieldsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            <FieldWrapper control={control} name={`${prefix}.${fieldPrefix}CourierName`} label="Courier Name *">
                {(field) => <Input {...field} placeholder="e.g., John Doe" />}
            </FieldWrapper>
            <FieldWrapper control={control} name={`${prefix}.${fieldPrefix}CourierPhone`} label="Phone No">
                {(field) => <Input {...field} placeholder="e.g., 9876543210" />}
            </FieldWrapper>
            <FieldWrapper control={control} name={`${prefix}.${fieldPrefix}CourierAddressLine1`} label="Address Line 1 *">
                {(field) => <Input {...field} placeholder="e.g., Building, Street" />}
            </FieldWrapper>
            <FieldWrapper control={control} name={`${prefix}.${fieldPrefix}CourierAddressLine2`} label="Address Line 2">
                {(field) => <Input {...field} placeholder="e.g., Area, Locality" />}
            </FieldWrapper>
            <FieldWrapper control={control} name={`${prefix}.${fieldPrefix}CourierCity`} label="City">
                {(field) => <Input {...field} placeholder="e.g., New Delhi" />}
            </FieldWrapper>
            <FieldWrapper control={control} name={`${prefix}.${fieldPrefix}CourierState`} label="State *">
                {(field) => <Input {...field} placeholder="e.g., Delhi" />}
            </FieldWrapper>
            <FieldWrapper control={control} name={`${prefix}.${fieldPrefix}CourierPincode`} label="Pin Code *">
                {(field) => <Input {...field} placeholder="e.g., 110044" />}
            </FieldWrapper>
        </div>
    );
}
