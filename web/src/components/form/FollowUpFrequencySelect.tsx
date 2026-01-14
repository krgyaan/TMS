import { type Control } from 'react-hook-form';
import { FieldWrapper } from './FieldWrapper';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const FREQUENCY_LABELS: Record<number, string> = {
    1: 'Daily',
    2: 'Alternate Days',
    3: '2 times a day',
    4: 'Weekly (every Mon)',
    5: 'Twice a Week (every Mon & Thu)',
    6: 'Stop',
};

interface FollowUpFrequencySelectProps<TFieldValues extends Record<string, any>> {
    control: Control<TFieldValues>;
    name: string;
    label?: string;
}

export function FollowUpFrequencySelect<TFieldValues extends Record<string, any>>({
    control,
    name,
    label = 'Follow-up Frequency',
}: FollowUpFrequencySelectProps<TFieldValues>) {
    return (
        <FieldWrapper control={control} name={name as any} label={label}>
            {(field) => (
                <Select
                    value={field.value != null ? String(field.value) : undefined}
                    onValueChange={(val) => field.onChange(Number(val))}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Choose frequency" />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                                {label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
        </FieldWrapper>
    );
}
