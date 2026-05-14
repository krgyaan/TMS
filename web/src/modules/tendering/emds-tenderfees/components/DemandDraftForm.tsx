import { FieldWrapper } from '@/components/form/FieldWrapper';
import { SelectField } from '@/components/form/SelectField';
import { NumberInput } from '@/components/form/NumberInput';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useFormContext } from 'react-hook-form';
import { PURPOSE_OPTIONS, DELIVERY_OPTIONS } from '../constants';
import DateInput from '@/components/form/DateInput';
import { CourierAddressFields } from './CourierAddressFields';

interface PaymentFormBaseProps {
    amount?: number;
    prefix?: string;
    readOnly?: boolean;
}

export function DemandDraftForm({ amount, prefix = 'emd.details', readOnly = false }: PaymentFormBaseProps) {
    const { control } = useFormContext();

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
                label="Deliver By *"
                options={DELIVERY_OPTIONS}
                placeholder="Select"
            />
            <FieldWrapper control={control} name={`${prefix}.ddDate`} label="DD Date">
                {(field) => <DateInput value={field.value || null} onChange={field.onChange} />}
            </FieldWrapper>
            <div className="col-span-full p-4 border-dashed border-1 border-gray-400/50 rounded-lg">
                <CourierAddressFields prefix={prefix} control={control} fieldPrefix="dd" />
            </div>
            <FieldWrapper control={control} name={`${prefix}.ddCourierHours`} label="Courier Time (Hours)" description="Enter the number of hours required for the courier to deliver the DD.">
                {(field) => <NumberInput min={1} {...field} />}
            </FieldWrapper>
            <FieldWrapper control={control} name={`${prefix}.ddRemarks`} label="Remarks">
                {(field) => <Textarea rows={2} {...field} />}
            </FieldWrapper>
        </div>
    );
}