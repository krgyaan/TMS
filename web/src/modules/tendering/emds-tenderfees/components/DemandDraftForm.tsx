import { FieldWrapper } from '@/components/form/FieldWrapper';
import { SelectField } from '@/components/form/SelectField';
import { NumberInput } from '@/components/form/NumberInput';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { PURPOSE_OPTIONS, DELIVERY_OPTIONS } from '../constants';
import DateInput from '@/components/form/DateInput';

interface DemandDraftFormProps {
    control: any;
    showPurposeAmount?: boolean;
}

export function DemandDraftForm({ control, showPurposeAmount = false }: DemandDraftFormProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            {showPurposeAmount && (
                <>
                    <SelectField
                        control={control}
                        name="emd.details.ddPurpose"
                        label="Purpose *"
                        options={PURPOSE_OPTIONS}
                        placeholder="Select Purpose"
                    />
                    <FieldWrapper control={control} name="emd.details.ddAmount" label="Amount *">
                        {(field) => <NumberInput {...field} />}
                    </FieldWrapper>
                </>
            )}
            <FieldWrapper control={control} name="emd.details.ddFavouring" label="DD in Favour of *">
                {(field) => <Input {...field} placeholder="e.g., Individual or Company Name" />}
            </FieldWrapper>
            <FieldWrapper control={control} name="emd.details.ddPayableAt" label="Payable At *">
                {(field) => <Input {...field} placeholder="e.g., Bank Name or Address" />}
            </FieldWrapper>
            <SelectField
                control={control}
                name="emd.details.ddDeliverBy"
                label="Deliver By *"
                options={DELIVERY_OPTIONS}
                placeholder="Select"
            />
            <FieldWrapper control={control} name="emd.details.ddCourierAddress" label="Courier Address">
                {(field) => <Textarea rows={2} {...field} />}
            </FieldWrapper>
            <FieldWrapper control={control} name="emd.details.ddCourierHours" label="Courier Time (Hours)" description="Enter the number of hours required for the courier to deliver the DD.">
                {(field) => <NumberInput min={1} {...field} />}
            </FieldWrapper>
            <FieldWrapper control={control} name="emd.details.ddDate" label="DD Date">
                {(field) => <DateInput value={field.value || null} onChange={field.onChange} />}
            </FieldWrapper>
            <FieldWrapper control={control} name="emd.details.ddRemarks" label="Remarks">
                {(field) => <Textarea rows={2} {...field} />}
            </FieldWrapper>
        </div>
    );
}