import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Save, Plus, X, ArrowLeft } from 'lucide-react';
import { useScheduleRa } from '@/hooks/api/useReverseAuctions';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

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
    raId: number;
    tenderDetails: {
        tenderNo: string;
        tenderName: string;
    };
    onSuccess?: () => void;
}

export default function RaScheduleFormPage({
    raId,
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

    const onSubmit = async (data: FormValues) => {
        try {
            await scheduleRaMutation.mutateAsync({
                id: raId,
                data: {
                    technicallyQualified: data.technicallyQualified,
                    disqualificationReason: data.disqualificationReason,
                    qualifiedPartiesCount: data.qualifiedPartiesCount,
                    qualifiedPartiesNames: data.qualifiedPartiesNames,
                    raStartTime: data.raStartTime,
                    raEndTime: data.raEndTime,
                },
            });
            if (onSuccess) {
                onSuccess();
            } else {
                navigate(`/tendering/ras/${raId}`);
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
                    <Button variant="outline" onClick={() => navigate(`/tendering/ras/${raId}`)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Technical Qualification */}
                        <FieldWrapper
                            control={form.control}
                            name="technicallyQualified"
                            label="Technically Qualified"
                        >
                            {(field) => (
                                <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select qualification status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Yes">Yes</SelectItem>
                                        <SelectItem value="No">No</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        </FieldWrapper>

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
                                <div className="grid gap-4 md:grid-cols-2">
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
                                </div>

                                {/* Qualified Parties Names */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        Name of Qualified Parties
                                    </label>
                                    <div className="flex gap-2">
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
                                    <p className="text-xs text-muted-foreground">
                                        Add party names or enter "not known" if unknown
                                    </p>
                                </div>

                                {/* RA Schedule Times */}
                                <div className="grid gap-4 md:grid-cols-2">
                                    <FieldWrapper
                                        control={form.control}
                                        name="raStartTime"
                                        label="RA Start Time"
                                    >
                                        {(field) => (
                                            <Input
                                                {...field}
                                                type="datetime-local"
                                            />
                                        )}
                                    </FieldWrapper>
                                    <FieldWrapper
                                        control={form.control}
                                        name="raEndTime"
                                        label="RA End Time"
                                    >
                                        {(field) => (
                                            <Input
                                                {...field}
                                                type="datetime-local"
                                            />
                                        )}
                                    </FieldWrapper>
                                </div>
                            </>
                        )}

                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate(`/tendering/ras/${raId}`)}
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
