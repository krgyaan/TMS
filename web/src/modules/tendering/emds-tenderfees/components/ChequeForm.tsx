import { FieldWrapper } from '@/components/form/FieldWrapper';
import { SelectField } from '@/components/form/SelectField';
import { NumberInput } from '@/components/form/NumberInput';
import { Input } from '@/components/ui/input';
import { PURPOSE_OPTIONS, DELIVERY_OPTIONS, BANKS } from '../constants';
import DateInput from '@/components/form/DateInput';

interface ChequeFormProps {
    control: any;
    showPurposeAmount?: boolean;
}

export function ChequeForm({ control, showPurposeAmount = false }: ChequeFormProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            {showPurposeAmount && (
                <>
                    <SelectField
                        control={control}
                        name="emd.details.chequePurpose"
                        label="Purpose *"
                        options={PURPOSE_OPTIONS}
                        placeholder="Select Purpose"
                    />
                    <FieldWrapper control={control} name="emd.details.chequeAmount" label="Cheque Amount *">
                        {(field) => <NumberInput {...field} />}
                    </FieldWrapper>
                </>
            )}
            <FieldWrapper control={control} name="emd.details.chequeFavouring" label="Cheque in Favour of *">
                {(field) => <Input {...field} value={field.value || ''} placeholder="e.g., Individual or Company Name" />}
            </FieldWrapper>
            <FieldWrapper control={control} name="emd.details.chequeDate" label="Cheque Date *">
                {(field) => <DateInput value={field.value || null} onChange={field.onChange} />}
            </FieldWrapper>
            <SelectField
                control={control}
                name="emd.details.chequeNeededIn"
                label="Cheque Needed In *"
                options={DELIVERY_OPTIONS}
                placeholder="Select"
            />
            <SelectField
                control={control}
                name="emd.details.chequeAccount"
                label="Account to be debited from *"
                options={BANKS}
                placeholder="Select Bank"
            />
        </div>
    );
}