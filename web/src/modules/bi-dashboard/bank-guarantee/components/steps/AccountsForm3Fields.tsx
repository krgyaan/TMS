import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { NumberInput } from '@/components/form/NumberInput';
import { FileUploader } from '@/components/file-upload';
import { toFileArray } from '@/modules/bi-dashboard/bank-guarantee/helpers/bankGuarantee.types';

export interface AccountsForm3Names<T extends FieldValues> {
    sfmsConf: FieldPath<T>;
    bgChargeDeducted: FieldPath<T>;
    sfmsChargeDeducted: FieldPath<T>;
    stampChargeDeducted: FieldPath<T>;
    otherChargeDeducted: FieldPath<T>;
}

interface AccountsForm3FieldsProps<T extends FieldValues> {
    control: Control<T>;
    names: AccountsForm3Names<T>;
    disabled?: boolean;
}

export function AccountsForm3Fields<T extends FieldValues>({
    control,
    names,
    disabled,
}: AccountsForm3FieldsProps<T>) {
    return (
        <>
            

            <h5 className="font-medium text-sm">Charges</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldWrapper control={control} name={names.bgChargeDeducted} label="BG Charges Deducted *">
                    {(field) => (
                        <NumberInput
                            {...field}
                            value={field.value as number | null | undefined}
                            placeholder="Enter charges"
                        />
                    )}
                </FieldWrapper>
                <FieldWrapper control={control} name={names.sfmsChargeDeducted} label="SFMS Charges Deducted *">
                    {(field) => (
                        <NumberInput
                            {...field}
                            value={field.value as number | null | undefined}
                            placeholder="Enter charges"
                        />
                    )}
                </FieldWrapper>
                <FieldWrapper control={control} name={names.stampChargeDeducted} label="Stamp Paper Charges Deducted *">
                    {(field) => (
                        <NumberInput
                            {...field}
                            value={field.value as number | null | undefined}
                            placeholder="Enter charges"
                        />
                    )}
                </FieldWrapper>
                <FieldWrapper control={control} name={names.otherChargeDeducted} label="Other charges deducted (if any)">
                    {(field) => (
                        <NumberInput
                            {...field}
                            value={field.value as number | null | undefined}
                            placeholder="Enter charges"
                        />
                    )}
                </FieldWrapper>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldWrapper control={control} name={names.sfmsConf} label="SFMS Confirmation copy *">
                    {(field) => (
                        <FileUploader
                            context="bg-sfms-conf"
                            value={toFileArray(field.value)}
                            onChange={field.onChange}
                            disabled={disabled}
                        />
                    )}
                </FieldWrapper>
            </div>
        </>
    );
}
