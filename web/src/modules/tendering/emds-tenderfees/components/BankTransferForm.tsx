import { FieldWrapper } from '@/components/form/FieldWrapper';
import { SelectField } from '@/components/form/SelectField';
import { NumberInput } from '@/components/form/NumberInput';
import { Input } from '@/components/ui/input';

interface BankTransferFormProps {
    control: any;
    showPurposeAmount?: boolean;
}

export function BankTransferForm({ control, showPurposeAmount = false }: BankTransferFormProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            {showPurposeAmount && (
                <>
                    <SelectField
                        control={control}
                        name="emd.details.btPurpose"
                        label="Purpose *"
                        options={[{ value: 'EMD', label: 'EMD' }]}
                        placeholder="EMD"
                    />
                    <FieldWrapper control={control} name="emd.details.btAmount" label="Amount *">
                        {(field) => <NumberInput {...field} />}
                    </FieldWrapper>
                </>
            )}
            <FieldWrapper control={control} name="emd.details.btAccountName" label="Account Name *">
                {(field) => <Input {...field} placeholder="e.g., Individual or Company Name" />}
            </FieldWrapper>
            <FieldWrapper control={control} name="emd.details.btAccountNo" label="Account Number *">
                {(field) => <Input {...field} placeholder="e.g., 1234567890" />}
            </FieldWrapper>
            <FieldWrapper control={control} name="emd.details.btIfsc" label="IFSC Code *">
                {(field) => <Input {...field} placeholder="e.g., SBIN0001234" />}
            </FieldWrapper>
        </div>
    );
}