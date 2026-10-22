import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { FileUploader } from '@/components/file-upload';
import { toFileArray } from '@/modules/bi-dashboard/bank-guarantee/helpers/bankGuarantee.types';

export interface ReturnedCourierNames<T extends FieldValues> {
    docketNo: FieldPath<T>;
    docketSlip: FieldPath<T>;
}

interface ReturnedCourierFieldsProps<T extends FieldValues> {
    control: Control<T>;
    names: ReturnedCourierNames<T>;
    disabled?: boolean;
}

export function ReturnedCourierFields<T extends FieldValues>({
    control,
    names,
    disabled,
}: ReturnedCourierFieldsProps<T>) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start pt-3 gap-y-4">
            <FieldWrapper control={control} name={names.docketNo} label="Docket No.">
                {(field) => (
                    <Input {...field} value={(field.value as string | undefined) ?? ''} placeholder="Enter docket number" />
                )}
            </FieldWrapper>
            <FieldWrapper control={control} name={names.docketSlip} label="Upload Docket Slip">
                {(field) => (
                    <FileUploader
                        context="bg-docket-slip"
                        value={toFileArray(field.value)}
                        onChange={field.onChange}
                        disabled={disabled}
                    />
                )}
            </FieldWrapper>
        </div>
    );
}
