import { FieldWrapper } from '@/components/form/FieldWrapper';
import { SelectField } from '@/components/form/SelectField';
import { NumberInput } from '@/components/form/NumberInput';
import { Input } from '@/components/ui/input';
import { useFormContext, useWatch } from 'react-hook-form';
import { CHEQUE_DELIVERY_OPTIONS, CHEQUE_DELIVERY_METHODS, CHEQUE_PURPOSE } from '../constants';
import DateInput from '@/components/form/DateInput';
import { CourierAddressFields } from './CourierAddressFields';
import { useLoanPartyOptions } from '@/hooks/useSelectOptions';

interface PaymentFormBaseProps {
    amount?: number;
    prefix?: string;
    readOnly?: boolean;
}

export function ChequeForm({ prefix = 'emd.details', readOnly = false }: PaymentFormBaseProps) {
    const { control } = useFormContext();
    const loanPartyOptions = useLoanPartyOptions();
    const deliveryMethod = useWatch({ control, name: `${prefix}.chequeDeliveryMethod` });

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            <SelectField
                control={control}
                name={`${prefix}.chequePurpose`}
                label="Purpose"
                options={CHEQUE_PURPOSE}
                placeholder="Select Purpose"
                disabled={readOnly}
            />
            <FieldWrapper control={control} name={`${prefix}.chequeAmount`} label="Cheque Amount">
                {(field) => <NumberInput {...field} placeholder="Leave blank for blank cheque" disabled={readOnly} />}
            </FieldWrapper>
            <FieldWrapper control={control} name={`${prefix}.chequeFavouring`} label="Cheque in Favour of">
                {(field) => <Input {...field} value={field.value || ''} placeholder="e.g., Individual or Company Name" />}
            </FieldWrapper>
            <FieldWrapper control={control} name={`${prefix}.chequeDate`} label="Cheque Date">
                {(field) => <DateInput value={field.value || null} onChange={field.onChange} placeholder="Leave blank for blank cheque" />}
            </FieldWrapper>
            <SelectField
                control={control}
                name={`${prefix}.chequeNeededIn`}
                label="Cheque Needed In"
                options={CHEQUE_DELIVERY_OPTIONS}
                placeholder="Select"
            />
            <SelectField
                control={control}
                name={`${prefix}.chequeDeliveryMethod`}
                label="Cheque Delivery Method"
                options={CHEQUE_DELIVERY_METHODS}
                placeholder="Select Delivery Method"
            />
            <SelectField
                control={control}
                name={`${prefix}.chequeAccount`}
                label="Account to be debited from"
                options={loanPartyOptions}
                placeholder="Select Party"
            />
            {deliveryMethod === 'HANDOVER' && (
                <FieldWrapper control={control} name={`${prefix}.chequeHandoverTo`} label="Cheque Handover to">
                    {(field) => <Input {...field} value={field.value || ''} placeholder="e.g., Person Name" />}
                </FieldWrapper>
            )}
            {deliveryMethod === 'COURIER' && (
                <div className="col-span-full p-4 border-dashed border-1 border-gray-400/50 rounded-lg">
                    <CourierAddressFields prefix={prefix} control={control} fieldPrefix="cheque" />
                </div>
            )}
        </div>
    );
}