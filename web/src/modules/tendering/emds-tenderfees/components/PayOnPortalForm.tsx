import { FieldWrapper } from '@/components/form/FieldWrapper';
import { SelectField } from '@/components/form/SelectField';
import { NumberInput } from '@/components/form/NumberInput';
import { Input } from '@/components/ui/input';
import { PURPOSE_OPTIONS, YES_NO_OPTIONS } from '../constants';

interface PayOnPortalFormProps {
    control: any;
    showPurposeAmount?: boolean;
}

export function PayOnPortalForm({ control, showPurposeAmount = false }: PayOnPortalFormProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            {showPurposeAmount && (
                <>
                    <SelectField
                        control={control}
                        name="emd.details.portalPurpose"
                        label="Purpose *"
                        options={PURPOSE_OPTIONS}
                        placeholder="Select Purpose"
                    />
                    <FieldWrapper control={control} name="emd.details.portalAmount" label="Amount *">
                        {(field) => <NumberInput {...field} />}
                    </FieldWrapper>
                </>
            )}
            <FieldWrapper control={control} name="emd.details.portalName" label="Portal/Website Name *">
                {(field) => <Input placeholder="e.g., gem.gov.in" {...field} />}
            </FieldWrapper>
            <SelectField
                control={control}
                name="emd.details.portalNetBanking"
                label="Net Banking Available *"
                options={YES_NO_OPTIONS}
                placeholder="Select"
            />
            <SelectField
                control={control}
                name="emd.details.portalDebitCard"
                label="Debit Card Allowed *"
                options={YES_NO_OPTIONS}
                placeholder="Select"
            />
        </div>
    );
}