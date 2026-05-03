import { FieldWrapper } from '@/components/form/FieldWrapper';
import { SelectField } from '@/components/form/SelectField';
import { NumberInput } from '@/components/form/NumberInput';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { PURPOSE_OPTIONS, DELIVERY_OPTIONS } from '../constants';
import DateInput from '@/components/form/DateInput';

interface FdrFormProps {
    control: any;
    showPurposeAmount?: boolean;
}

export function FdrForm({ control, showPurposeAmount = false }: FdrFormProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            {showPurposeAmount && (
                <>
                    <SelectField
                        control={control}
                        name="emd.details.fdrPurpose"
                        label="Purpose *"
                        options={PURPOSE_OPTIONS}
                        placeholder="Select Purpose"
                    />
                    <FieldWrapper control={control} name="emd.details.fdrAmount" label="FDR Amount *">
                        {(field) => <NumberInput {...field} />}
                    </FieldWrapper>
                </>
            )}
            <FieldWrapper control={control} name="emd.details.fdrFavouring" label="FDR in Favour of *">
                {(field) => <Input {...field} placeholder="e.g., Individual or Company Name" />}
            </FieldWrapper>
            <FieldWrapper control={control} name="emd.details.fdrExpiryDate" label="FDR Expiry Date *">
                {(field) => <DateInput value={field.value || null} onChange={field.onChange} />}
            </FieldWrapper>
            <SelectField
                control={control}
                name="emd.details.fdrDeliverBy"
                label="Deliver By *"
                options={DELIVERY_OPTIONS}
                placeholder="Select"
            />
            <FieldWrapper control={control} name="emd.details.fdrCourierAddress" label="Courier Address">
                {(field) => <Textarea rows={2} {...field} placeholder="e.g., Bank Name or Address" />}
            </FieldWrapper>
            <FieldWrapper control={control} name="emd.details.fdrCourierHours" label="Courier Time (Hours)" description="Enter the number of hours required for the courier to deliver the FDR.">
                {(field) => <NumberInput min={1} {...field} />}
            </FieldWrapper>
            <FieldWrapper control={control} name="emd.details.fdrDate" label="FDR Date">
                {(field) => <DateInput value={field.value || null} onChange={field.onChange} />}
            </FieldWrapper>
        </div>
    );
}