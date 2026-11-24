import { FieldWrapper } from '@/components/form/FieldWrapper';
import { SelectField } from '@/components/form/SelectField';
import { NumberInput } from '@/components/form/NumberInput';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useFormContext } from 'react-hook-form';
import { PURPOSE_OPTIONS, DELIVERY_OPTIONS } from '../constants';
import DateInput from '@/components/form/DateInput';
import { useUsers } from '@/hooks/api/useUsers';
import { Truck } from 'lucide-react';

interface PaymentFormBaseProps {
    amount?: number;
    prefix?: string;
    readOnly?: boolean;
}

export function DemandDraftForm({ amount, prefix = 'emd.details', readOnly = false }: PaymentFormBaseProps) {
    const { control } = useFormContext();
    const { data: employees = [] } = useUsers();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            <SelectField
                control={control}
                name={`${prefix}.ddPurpose`}
                label="Purpose *"
                options={PURPOSE_OPTIONS}
                placeholder="Select Purpose"
                disabled={readOnly}
            />
            <FieldWrapper control={control} name={`${prefix}.ddAmount`} label="Amount *">
                {(field) => (
                    <NumberInput
                        value={field.value ?? amount}
                        onChange={field.onChange}
                        disabled={readOnly}
                    />
                )}
            </FieldWrapper>
            <FieldWrapper control={control} name={`${prefix}.ddFavouring`} label="DD in Favour of *">
                {(field) => <Input {...field} placeholder="e.g., Individual or Company Name" />}
            </FieldWrapper>
            <FieldWrapper control={control} name={`${prefix}.ddPayableAt`} label="Payable At *">
                {(field) => <Input {...field} placeholder="e.g., Bank Name or Address" />}
            </FieldWrapper>
            <SelectField
                control={control}
                name={`${prefix}.ddDeliverBy`}
                label="DD Needed In *"
                options={DELIVERY_OPTIONS}
                placeholder="Select"
                disabled={readOnly}
            />
            <FieldWrapper control={control} name={`${prefix}.ddDate`} label="DD Date">
                {(field) => <DateInput value={field.value || null} onChange={field.onChange} />}
            </FieldWrapper>

            <div className="col-span-full space-y-3">
                <div className="flex items-center gap-2 pt-2 border-t">
                    <Truck className="h-4 w-4 text-primary" />
                    <h5 className="font-medium text-sm">Courier Request Form</h5>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FieldWrapper control={control} name={`${prefix}.ddCourierOrg`} label="Organization Name *">
                        {(field) => <Input {...field} placeholder="Enter organization name" />}
                    </FieldWrapper>
                    <FieldWrapper control={control} name={`${prefix}.ddCourierName`} label="Recipient Name *">
                        {(field) => <Input {...field} placeholder="Enter recipient name" />}
                    </FieldWrapper>
                    <FieldWrapper control={control} name={`${prefix}.ddCourierPhone`} label="Phone *">
                        {(field) => <Input {...field} placeholder="Enter phone number" maxLength={10} />}
                    </FieldWrapper>
                    <FieldWrapper control={control} name={`${prefix}.ddCourierAddressLine1`} label="Address Line 1 *">
                        {(field) => <Input {...field} placeholder="Building, Street" />}
                    </FieldWrapper>
                    <FieldWrapper control={control} name={`${prefix}.ddCourierAddressLine2`} label="Address Line 2">
                        {(field) => <Input {...field} placeholder="Area, Locality" />}
                    </FieldWrapper>
                    <FieldWrapper control={control} name={`${prefix}.ddCourierCity`} label="City *">
                        {(field) => <Input {...field} placeholder="Enter city" />}
                    </FieldWrapper>
                    <FieldWrapper control={control} name={`${prefix}.ddCourierState`} label="State *">
                        {(field) => <Input {...field} placeholder="Enter state" />}
                    </FieldWrapper>
                    <FieldWrapper control={control} name={`${prefix}.ddCourierPincode`} label="Pin Code *">
                        {(field) => <Input {...field} placeholder="Enter 6-digit pin code" maxLength={6} />}
                    </FieldWrapper>
                    <SelectField
                        control={control}
                        name={`${prefix}.ddCourierEmpFrom`}
                        label="Courier From *"
                        options={employees.map((employee: { id: number | string; name: string }) => ({
                            value: String(employee.id),
                            label: employee.name,
                        }))}
                        placeholder="Select Employee"
                        valueType="string"
                    />
                    <FieldWrapper control={control} name={`${prefix}.ddCourierDelDate`} label="Expected Delivery Date *">
                        {(field) => <DateInput value={field.value || null} onChange={field.onChange} />}
                    </FieldWrapper>
                    <SelectField
                        control={control}
                        name={`${prefix}.ddCourierUrgency`}
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

            <FieldWrapper control={control} name={`${prefix}.ddRemarks`} label="Remarks">
                {(field) => <Textarea rows={2} {...field} />}
            </FieldWrapper>
        </div>
    );
}
