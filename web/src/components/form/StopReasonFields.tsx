import { useEffect } from 'react';
import { type Control, useWatch } from 'react-hook-form';
import { FieldWrapper } from './FieldWrapper';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FileUploadField } from './FileUploadField';

export const STOP_REASON_LABELS: Record<number, string> = {
    1: 'Party Angry / Not Interested',
    2: 'Objective Achieved',
    3: 'Not Reachable',
    4: 'Other',
};

interface StopReasonFieldsProps<TFieldValues extends Record<string, any>> {
    control: Control<TFieldValues>;
    frequencyFieldName: string;
    stopReasonFieldName: string;
    proofTextFieldName: string;
    stopRemarksFieldName: string;
    proofImageFieldName?: string;
}

export function StopReasonFields<TFieldValues extends Record<string, any>>({
    control,
    frequencyFieldName,
    stopReasonFieldName,
    proofTextFieldName,
    stopRemarksFieldName,
    proofImageFieldName,
}: StopReasonFieldsProps<TFieldValues>) {
    const frequency = useWatch({ control, name: frequencyFieldName as any });
    const stopReason = useWatch({ control, name: stopReasonFieldName as any });

    // Only show when frequency is 6 (Stop)
    if (frequency !== 6) {
        return null;
    }

    return (
        <div className="space-y-4">
            <FieldWrapper control={control} name={stopReasonFieldName as any} label="Stop Reason">
                {(field) => (
                    <Select
                        value={field.value != null ? String(field.value) : undefined}
                        onValueChange={(val) => field.onChange(Number(val))}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(STOP_REASON_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </FieldWrapper>

            {/* Proof Details (when stopReason = 2) */}
            {stopReason === 2 && (
                <>
                    <FieldWrapper control={control} name={proofTextFieldName as any} label="Proof Details">
                        {(field) => (
                            <Textarea
                                {...field}
                                placeholder="Provide proof of objective achievement..."
                                className="min-h-[80px]"
                            />
                        )}
                    </FieldWrapper>
                    {proofImageFieldName && (
                        <FileUploadField
                            control={control}
                            name={proofImageFieldName as any}
                            label="Proof Image"
                            allowMultiple={false}
                            acceptedFileTypes={['image/*', 'application/pdf']}
                        />
                    )}
                </>
            )}

            {/* Remarks (when stopReason = 4) */}
            {stopReason === 4 && (
                <FieldWrapper control={control} name={stopRemarksFieldName as any} label="Remarks">
                    {(field) => (
                        <Textarea {...field} placeholder="Enter remarks..." className="min-h-[80px]" />
                    )}
                </FieldWrapper>
            )}
        </div>
    );
}
