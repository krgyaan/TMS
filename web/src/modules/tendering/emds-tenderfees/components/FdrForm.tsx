import { FieldWrapper } from '@/components/form/FieldWrapper';
import { SelectField } from '@/components/form/SelectField';
import { NumberInput } from '@/components/form/NumberInput';
import { Input } from '@/components/ui/input';
import { useFormContext } from 'react-hook-form';
import { PURPOSE_OPTIONS } from '../constants';
import DateInput from '@/components/form/DateInput';
import { useUsers } from '@/hooks/api/useUsers';
import { Truck } from 'lucide-react';

interface PaymentFormBaseProps {
    amount?: number;
    prefix?: string;
    readOnly?: boolean;
    purposeOptions?: Array<{ value: string; label: string }>;
}

export function FdrForm({
    amount,
    prefix = 'emd.details',
    readOnly = false,
    purposeOptions = PURPOSE_OPTIONS,
}: PaymentFormBaseProps) {
    const { control } = useFormContext();
    const { data: employees = [] } = useUsers();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            <SelectField
                control={control}
                name={`${prefix}.fdrPurpose`}
                label="Purpose *"
                options={purposeOptions}
                placeholder="Select Purpose"
                disabled={readOnly}
            />
            <FieldWrapper control={control} name={`${prefix}.fdrAmount`} label="FDR Amount *">
                {(field) => (
                    <NumberInput
                        value={field.value ?? amount}
                        onChange={field.onChange}
                        disabled={readOnly}
                    />
                )}
            </FieldWrapper>
            <FieldWrapper control={control} name={`${prefix}.fdrFavouring`} label="FDR in Favour of *">
                {(field) => <Input {...field} placeholder="e.g., Individual or Company Name" />}
            </FieldWrapper>
            <FieldWrapper control={control} name={`${prefix}.fdrExpiryDate`} label="FDR Expiry Date *">
                {(field) => <DateInput value={field.value || null} onChange={field.onChange} />}
            </FieldWrapper>

            <div className="col-span-full space-y-3">
                <div className="flex items-center gap-2 pt-2 border-t">
                    <Truck className="h-4 w-4 text-primary" />
                    <h5 className="font-medium text-sm">Courier Dispatch</h5>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FieldWrapper control={control} name={`${prefix}.fdrCourierOrg`} label="Organization Name *">
                        {(field) => <Input {...field} placeholder="Enter organization name" />}
                    </FieldWrapper>
                    <FieldWrapper control={control} name={`${prefix}.fdrCourierName`} label="Recipient Name *">
                        {(field) => <Input {...field} placeholder="Enter recipient name" />}
                    </FieldWrapper>
                    <FieldWrapper control={control} name={`${prefix}.fdrCourierPhone`} label="Phone *">
                        {(field) => <Input {...field} placeholder="Enter phone number" maxLength={10} />}
                    </FieldWrapper>
                    <FieldWrapper control={control} name={`${prefix}.fdrCourierAddrLine1`} label="Address Line 1 *">
                        {(field) => <Input {...field} placeholder="Building, Street" />}
                    </FieldWrapper>
                    <FieldWrapper control={control} name={`${prefix}.fdrCourierAddrLine2`} label="Address Line 2 *">
                        {(field) => <Input {...field} placeholder="Area, Locality" />}
                    </FieldWrapper>
                    <FieldWrapper control={control} name={`${prefix}.fdrCourierCity`} label="City *">
                        {(field) => <Input {...field} placeholder="Enter city" />}
                    </FieldWrapper>
                    <FieldWrapper control={control} name={`${prefix}.fdrCourierState`} label="State *">
                        {(field) => <Input {...field} placeholder="Enter state" />}
                    </FieldWrapper>
                    <FieldWrapper control={control} name={`${prefix}.fdrCourierPincode`} label="Pin Code *">
                        {(field) => <Input {...field} placeholder="Enter 6-digit pin code" maxLength={6} />}
                    </FieldWrapper>
                    <SelectField
                        control={control}
                        name={`${prefix}.fdrCourierEmpFrom`}
                        label="Courier From *"
                        options={employees.map((employee: { id: number | string; name: string }) => ({
                            value: String(employee.id),
                            label: employee.name,
                        }))}
                        placeholder="Select Employee"
                        valueType="string"
                    />
                    <FieldWrapper control={control} name={`${prefix}.fdrCourierDelDate`} label="Expected Delivery Date *">
                        {(field) => <DateInput value={field.value || null} onChange={field.onChange} />}
                    </FieldWrapper>
                    <SelectField
                        control={control}
                        name={`${prefix}.fdrCourierUrgency`}
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
        </div>
    );
}
