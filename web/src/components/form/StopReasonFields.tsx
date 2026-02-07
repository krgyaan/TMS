import { type Control, useWatch } from 'react-hook-form';
import { FieldWrapper } from './FieldWrapper';
import { Textarea } from '@/components/ui/textarea';
import { FileUploadField } from './FileUploadField';
import SelectField from './SelectField';

export const STOP_REASON_LABELS: Record<string, string> = {
    '1': 'The person is getting angry/or has requested to stop',
    '2': 'Followup Objective achieved',
    '3': 'External Followup Initiated',
    '4': 'Remarks',
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
        <div className="grid grid-cols-1 md:grid-cols-3 items-start gap-4">
            <SelectField
                control={control}
                name={stopReasonFieldName as any}
                label="Stop Reason"
                options={Object.entries(STOP_REASON_LABELS).map(([value, label]) => ({ value, label }))}
                placeholder="Select reason"
            />
            {/* Proof Details (when stopReason = 2) */}
            {stopReason === '2' && (
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
            {stopReason === '4' && (
                <FieldWrapper control={control} name={stopRemarksFieldName as any} label="Remarks">
                    {(field) => (
                        <Textarea {...field} placeholder="Enter remarks..." className="min-h-[80px]" />
                    )}
                </FieldWrapper>
            )}
        </div>
    );
}
