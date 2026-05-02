import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Save, Plus, X, ArrowLeft } from 'lucide-react';
import { useScheduleRa } from '@/hooks/api/useReverseAuctions';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';
import { SelectField } from '@/components/form/SelectField';
import DateTimeInput from '@/components/form/DateTimeInput';

const ScheduleRaSchema = z.object({
    technicallyQualified: z.enum(['Yes', 'No']),
    disqualificationReason: z.string().optional(),
    qualifiedPartiesCount: z.string().optional(),
    qualifiedPartiesNames: z.array(z.string()).optional(),
    raStartTime: z.string().optional(),
    raEndTime: z.string().optional(),
}).refine((data) => {
    if (data.technicallyQualified === 'No' && !data.disqualificationReason) {
        return false;
    }
    return true;
}, {
    message: 'Disqualification reason is required when not qualified',
    path: ['disqualificationReason'],
}).refine((data) => {
    if (data.technicallyQualified === 'Yes' && !data.raStartTime) {
        return false;
    }
    return true;
}, {
    message: 'RA Start Time is required when qualified',
    path: ['raStartTime'],
}).refine((data) => {
    if (data.technicallyQualified === 'Yes' && !data.raEndTime) {
        return false;
    }
    return true;
}, {
    message: 'RA End Time is required when qualified',
    path: ['raEndTime'],
});

type FormValues = z.infer<typeof ScheduleRaSchema>;

interface RaScheduleFormPageProps {
    tenderId: number;
    tenderDetails: {
        tenderNo: string;
        tenderName: string;
    };
    onSuccess?: () => void;
}

export default function RaScheduleFormPage({
    tenderId,
    tenderDetails,
    onSuccess,
}: RaScheduleFormPageProps) {
    const navigate = useNavigate();
    const scheduleRaMutation = useScheduleRa();
    const [newPartyName, setNewPartyName] = useState('');

    const form = useForm<FormValues>({
        resolver: zodResolver(ScheduleRaSchema),
        defaultValues: {
            technicallyQualified: 'Yes',
            disqualificationReason: '',
            qualifiedPartiesCount: '',
            qualifiedPartiesNames: [],
            raStartTime: '',
            raEndTime: '',
        },
    });

    const technicallyQualified = useWatch({
        control: form.control,
        name: 'technicallyQualified',
    });

    const qualifiedPartiesNames = useWatch({
        control: form.control,
        name: 'qualifiedPartiesNames',
    }) || [];

    const isSubmitting = form.formState.isSubmitting;

    const addPartyName = () => {
        if (newPartyName.trim()) {
            const current = form.getValues('qualifiedPartiesNames') || [];
            form.setValue('qualifiedPartiesNames', [...current, newPartyName.trim()]);
            setNewPartyName('');
        }
    };

    const removePartyName = (index: number) => {
        const current = form.getValues('qualifiedPartiesNames') || [];
        form.setValue('qualifiedPartiesNames', current.filter((_, i) => i !== index));
    };

    // Helper function to normalize empty strings to undefined for optional fields
    const normalizeOptionalString = (value: string | undefined): string | undefined => {
        return value && value.trim() ? value.trim() : undefined;
    };

    const onSubmit = async (data: FormValues) => {
        try {
            await scheduleRaMutation.mutateAsync({
                tenderId,
                data: {
                    technicallyQualified: data.technicallyQualified,
                    disqualificationReason: normalizeOptionalString(data.disqualificationReason),
                    qualifiedPartiesCount: normalizeOptionalString(data.qualifiedPartiesCount),
                    qualifiedPartiesNames: data.qualifiedPartiesNames && data.qualifiedPartiesNames.length > 0 ? data.qualifiedPartiesNames : undefined,
                    raStartTime: normalizeOptionalString(data.raStartTime),
                    raEndTime: normalizeOptionalString(data.raEndTime),
                },
            });
            if (onSuccess) {
                onSuccess();
            } else {
                navigate(paths.tendering.ras);
            }
        } catch (error) {
            console.error('Error scheduling RA:', error);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Schedule Reverse Auction</CardTitle>
                <CardDescription>
                    {tenderDetails.tenderNo} - {tenderDetails.tenderName}
                </CardDescription>
                <CardAction>
                    <Button variant="outline" onClick={() => navigate(paths.tendering.ras)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-3 items-start">
                            {/* Technical Qualification */}
                            <SelectField
                                control={form.control}
                                name="technicallyQualified"
                                label="Technically Qualified"
                                options={[
                                    { value: 'Yes', label: 'Yes' },
                                    { value: 'No', label: 'No' },
                                ]}
                                placeholder="Select qualification status"
                            />
                            {/* Disqualification Reason (if No) */}
                            {technicallyQualified === 'No' && (
                                <FieldWrapper
                                    control={form.control}
                                    name="disqualificationReason"
                                    label="Reason for Disqualification"
                                >
                                    {(field) => (
                                        <Textarea
                                            {...field}
                                            placeholder="Enter reason for disqualification"
                                            rows={3}
                                        />
                                    )}
                                </FieldWrapper>
                            )}

                            {/* Qualified Details (if Yes) */}
                            {technicallyQualified === 'Yes' && (
                                <>
                                    <FieldWrapper
                                        control={form.control}
                                        name="qualifiedPartiesCount"
                                        label="No. of Qualified Parties"
                                        description="Enter number or 'not known'"
                                    >
                                        {(field) => (
                                            <Input
                                                {...field}
                                                placeholder="e.g., 5 or 'not known'"
                                            />
                                        )}
                                    </FieldWrapper>

                                    {/* Qualified Parties Names */}
                                    <div className="flex flex-col gap-2">
                                        <div className="flex gap-2 items-center">
                                            <FieldWrapper
                                                control={form.control}
                                                name="qualifiedPartiesNames"
                                                label="Name of Qualified Parties"
                                                description="Add party names or enter 'not known' if unknown"
                                            >
                                                {(_field) => (
                                                    <Input
                                                        value={newPartyName}
                                                        onChange={(e) => setNewPartyName(e.target.value)}
                                                        placeholder="Enter party name"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                addPartyName();
                                                            }
                                                        }}
                                                    />
                                                )}
                                            </FieldWrapper>
                                            <Button type="button" onClick={addPartyName} size="icon">
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        {qualifiedPartiesNames.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {qualifiedPartiesNames.map((name, index) => (
                                                    <Badge key={index} variant="secondary" className="gap-1">
                                                        {name}
                                                        <X
                                                            className="h-3 w-3 cursor-pointer"
                                                            onClick={() => removePartyName(index)}
                                                        />
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* RA Schedule Times */}
                                    <FieldWrapper
                                        control={form.control}
                                        name="raStartTime"
                                        label="RA Start Time"
                                    >
                                        {(field) => (
                                            <DateTimeInput
                                                {...field}
                                                placeholder="Select start time"
                                            />
                                        )}
                                    </FieldWrapper>
                                    <FieldWrapper
                                        control={form.control}
                                        name="raEndTime"
                                        label="RA End Time"
                                    >
                                        {(field) => (
                                            <DateTimeInput
                                                {...field}
                                                placeholder="Select end time"
                                            />
                                        )}
                                    </FieldWrapper>
                                </>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate(paths.tendering.ras)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <span className="animate-spin mr-2">⏳</span>}
                                <Save className="mr-2 h-4 w-4" />
                                {technicallyQualified === 'No' ? 'Mark Disqualified' : 'Schedule RA'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
