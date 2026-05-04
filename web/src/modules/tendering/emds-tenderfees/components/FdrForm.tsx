import { FieldWrapper } from '@/components/form/FieldWrapper';
import { SelectField } from '@/components/form/SelectField';
import { NumberInput } from '@/components/form/NumberInput';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useFormContext } from 'react-hook-form';
import { PURPOSE_OPTIONS, DELIVERY_OPTIONS } from '../constants';
import DateInput from '@/components/form/DateInput';

interface PaymentFormBaseProps {
    amount?: number;
    prefix?: string;
}

export function FdrForm({ amount, prefix = 'emd.details' }: PaymentFormBaseProps) {
    const { control } = useFormContext();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            <SelectField
                control={control}
                name={`${prefix}.fdrPurpose`}
                label="Purpose *"
                options={PURPOSE_OPTIONS}
                placeholder="Select Purpose"
            />
            <FieldWrapper control={control} name={`${prefix}.fdrAmount`} label="FDR Amount *">
                {(field) => (
                    <NumberInput
                        {...field}
                        value={field.value ?? amount}
                        onChange={field.onChange}
                    />
                )}
            </FieldWrapper>
            <FieldWrapper control={control} name={`${prefix}.fdrFavouring`} label="FDR in Favour of *">
                {(field) => <Input {...field} placeholder="e.g., Individual or Company Name" />}
            </FieldWrapper>
            <FieldWrapper control={control} name={`${prefix}.fdrExpiryDate`} label="FDR Expiry Date *">
                {(field) => <DateInput value={field.value || null} onChange={field.onChange} />}
            </FieldWrapper>
            <SelectField
                control={control}
                name={`${prefix}.fdrDeliverBy`}
                label="Deliver By *"
                options={DELIVERY_OPTIONS}
                placeholder="Select"
            />
            <FieldWrapper control={control} name={`${prefix}.fdrCourierAddress`} label="Courier Address">
                {(field) => <Textarea rows={2} {...field} placeholder="e.g., Bank Name or Address" />}
            </FieldWrapper>
            <FieldWrapper control={control} name={`${prefix}.fdrCourierHours`} label="Courier Time (Hours)" description="Enter the number of hours required for the courier to deliver the FDR.">
                {(field) => <NumberInput min={1} {...field} />}
            </FieldWrapper>
            <FieldWrapper control={control} name={`${prefix}.fdrDate`} label="FDR Date">
                {(field) => <DateInput value={field.value || null} onChange={field.onChange} />}
            </FieldWrapper>
        </div>
    );
}