import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Save, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import DateInput from '@/components/form/DateInput';
import { useHappyCalling, useUpdateHappyCalling } from '@/hooks/api/useHappyCalling';
import type { HappyCallingStatus } from '@/modules/crm/happy-calling/helpers/happy-calling.types';

const formSchema = z.object({
    organization: z.string().max(255).optional().or(z.literal('')),
    name: z.string().min(1, 'Name is required').max(255),
    designation: z.string().max(255).optional().or(z.literal('')),
    email: z.string().email('Invalid email').max(255).optional().or(z.literal('')),
    phone: z.string().max(20).optional().or(z.literal('')),
    date: z.string().optional().or(z.literal('')),
    status: z.enum(['pending', 'done']).optional().or(z.literal('')),
    nextFollowupDate: z.string().optional().or(z.literal('')),
    broadcast: z.number().int().min(0).optional(),
});

type FormValues = z.infer<typeof formSchema>;

const inputCls =
    'border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent ' +
    'px-3 py-1 text-sm outline-none focus-visible:border-ring ' +
    'focus-visible:ring-ring/50 focus-visible:ring-[3px]';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    recordId?: number | null;
    onSuccess?: () => void;
};

export function HappyCallingModal({ open, onOpenChange, recordId, onSuccess }: Props) {
    const updateMutation = useUpdateHappyCalling();
    const { data: record, isLoading } = useHappyCalling(recordId ?? null);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as Resolver<FormValues>,
        defaultValues: {
            organization: '',
            name: '',
            designation: '',
            email: '',
            phone: '',
            date: '',
            status: '',
            nextFollowupDate: '',
            broadcast: 0,
        },
    });

    useEffect(() => {
        if (open && record) {
            const toInput = (v?: string | null) => {
                if (!v) return '';
                const s = String(v);
                return s.includes('T') ? s.slice(0, 16) : s;
            };
            form.reset({
                organization: record.organization ?? '',
                name: record.name,
                designation: record.designation ?? '',
                email: record.email ?? '',
                phone: record.phone ?? '',
                date: toInput(record.date),
                status: (record.status as HappyCallingStatus | null) ?? '',
                nextFollowupDate: toInput(record.nextFollowupDate),
                broadcast: record.broadcast ?? 0,
            });
            updateMutation.reset?.();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, record]);

    const handleSubmit = async (values: FormValues) => {
        if (!recordId) return;
        const payload = {
            organization: values.organization || null,
            name: values.name,
            designation: values.designation || null,
            email: values.email || null,
            phone: values.phone || null,
            date: values.date || null,
            status: (values.status || null) as HappyCallingStatus | null,
            nextFollowupDate: values.nextFollowupDate || null,
            broadcast: values.broadcast ?? 0,
        };
        await updateMutation.mutateAsync({ id: recordId, data: payload });
        onOpenChange(false);
        onSuccess?.();
    };

    const saving = updateMutation.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[560px] p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                            <Pencil className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle>Edit Happy Calling</DialogTitle>
                            <DialogDescription>Update the details for this entry</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="px-6 py-5 max-h-[calc(100vh-280px)] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : (
                        <form id="happy-calling-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="organization">Organization</Label>
                                    <Input id="organization" className={inputCls} {...form.register('organization')} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name *</Label>
                                    <Input id="name" className={inputCls} {...form.register('name')} />
                                    {form.formState.errors.name && (
                                        <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="designation">Designation</Label>
                                    <Input id="designation" className={inputCls} {...form.register('designation')} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone</Label>
                                    <Input id="phone" className={inputCls} {...form.register('phone')} />
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" className={inputCls} {...form.register('email')} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    <Select
                                        value={form.watch('status') || undefined}
                                        onValueChange={(value) => form.setValue('status', value as FormValues['status'])}
                                    >
                                        <SelectTrigger id="status" className="h-9">
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="done">Done</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="date">Date</Label>
                                    <Input id="date" type="datetime-local" className={inputCls} {...form.register('date')} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="nextFollowupDate">Next Follow Up Date</Label>
                                    <DateInput
                                        id="nextFollowupDate"
                                        value={form.watch('nextFollowupDate') || ''}
                                        onChange={(value) => form.setValue('nextFollowupDate', value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="broadcast">Broadcast</Label>
                                <Input
                                    id="broadcast"
                                    type="number"
                                    min={0}
                                    className={inputCls}
                                    value={form.watch('broadcast')}
                                    onChange={(e) => form.setValue('broadcast', Number(e.target.value))}
                                />
                            </div>
                        </form>
                    )}
                </div>

                <DialogFooter className="px-6 py-4 bg-muted/30 border-t">
                    <div className="flex items-center justify-between w-full">
                        <p className="text-xs text-muted-foreground hidden sm:block">
                            <span className="text-destructive">*</span> Required field
                        </p>
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                                Cancel
                            </Button>
                            <Button type="submit" form="happy-calling-form" disabled={saving}>
                                {saving ? (
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4 mr-1" />
                                )}
                                Save
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default HappyCallingModal;