import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Textarea } from '@/components/ui/textarea';
import { CompactFileUploader } from '@/components/file-upload';

export interface RequestCancellationNames<T extends FieldValues> {
    stampCoveringLetter: FieldPath<T>;
    cancelRemark: FieldPath<T>;
    cancellationLetterPath?: FieldPath<T>;
}

interface RequestCancellationFieldsProps<T extends FieldValues> {
    control: Control<T>;
    names: RequestCancellationNames<T>;
    disabled?: boolean;
}

export function RequestCancellationFields<T extends FieldValues>({
    control,
    names,
    disabled,
}: RequestCancellationFieldsProps<T>) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start pt-3 gap-y-4">
            <FieldWrapper
                control={control}
                name={names.stampCoveringLetter}
                label="Upload a Signed, Stamped Covering Letter"
            >
                {(field) => (
                    <CompactFileUploader
                        context="bg-stamp-covering-letter"
                        value={field.value as string | undefined}
                        onChange={field.onChange}
                        disabled={disabled}
                    />
                )}
            </FieldWrapper>
            <FieldWrapper control={control} name={names.cancelRemark} label="Remarks">
                {(field) => (
                    <Textarea
                        {...field}
                        value={(field.value as string | undefined) ?? ''}
                        placeholder="Enter remarks"
                        className="min-h-[80px]"
                    />
                )}
            </FieldWrapper>
            {names.cancellationLetterPath && (
                <FieldWrapper
                    control={control}
                    name={names.cancellationLetterPath}
                    label="Bank Cancellation Letter"
                >
                    {(field) => (
                        <CompactFileUploader
                            context="bg-stamp-covering-letter"
                            value={field.value as string | undefined}
                            onChange={field.onChange}
                            disabled={disabled}
                        />
                    )}
                </FieldWrapper>
            )}
        </div>
    );
}
