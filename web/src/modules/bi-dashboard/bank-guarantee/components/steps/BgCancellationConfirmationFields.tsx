import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { CompactFileUploader } from '@/components/file-upload';

export interface BgCancellationConfirmationNames<T extends FieldValues> {
    cancellConfirm: FieldPath<T>;
}

interface BgCancellationConfirmationFieldsProps<T extends FieldValues> {
    control: Control<T>;
    names: BgCancellationConfirmationNames<T>;
    disabled?: boolean;
}

export function BgCancellationConfirmationFields<T extends FieldValues>({
    control,
    names,
    disabled,
}: BgCancellationConfirmationFieldsProps<T>) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start pt-3 gap-y-4">
            <FieldWrapper
                control={control}
                name={names.cancellConfirm}
                label="Upload the Bank BG cancellation request"
            >
                {(field) => (
                    <CompactFileUploader
                        context="bg-cancell-confirm"
                        value={field.value as string | undefined}
                        onChange={field.onChange}
                        disabled={disabled}
                    />
                )}
            </FieldWrapper>
        </div>
    );
}
