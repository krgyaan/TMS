import { type Control } from 'react-hook-form';
import SelectField from './SelectField';

export const FREQUENCY_LABELS: Record<number, string> = {
    1: 'Daily',
    2: 'Alternate Days',
    3: '2 times a day',
    4: 'Weekly (every Mon)',
    5: 'Twice a Week (every Mon & Thu)',
    6: 'Stop',
    7: 'Once in 15 Days (Alternate Mondays)',
    8: 'Once a Month (First Monday of the Month)',
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
        <SelectField
            control={control}
            name={name as any}
            label={label}
            options={Object.entries(FREQUENCY_LABELS)
                .sort(([a], [b]) => {
                    if (Number(a) === 6) return 1;
                    if (Number(b) === 6) return -1;
                    return Number(a) - Number(b);
                })
                .map(([value, label]) => ({ value, label }))}
            placeholder="Choose frequency"
        />
    );
}
