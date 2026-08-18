import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Plus, Save, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useClientDirectory, useCreateClientDirectory, useUpdateClientDirectory } from '@/hooks/api/useClientDirectory';
import { cn } from '@/lib/utils';
import type { ClientDirectoryAddress, GiftingTier } from '@/modules/shared/client-directory/helpers/client-directory.types';

const GIFTING_TIERS: GiftingTier[] = ['T0', 'T1', 'T2', 'T3', 'T4'];

const formSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    designation: z.string().max(255).optional().or(z.literal('')),
    email: z.string().email('Invalid email').max(255).optional().or(z.literal('')),
    phone: z.string().max(20).optional().or(z.literal('')),
    organization: z.string().max(255).optional().or(z.literal('')),
    giftingTier: z.enum(['T0', 'T1', 'T2', 'T3', 'T4']).optional().or(z.literal('')),
    addressPersonal: z.string().max(500).optional().or(z.literal('')),
    addressOfficial: z.string().max(500).optional().or(z.literal('')),
    remarks: z.array(z.string()).default([]),
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

export function ClientDirectoryModal({ open, onOpenChange, recordId, onSuccess }: Props) {
    const isEdit = !!recordId;

    const createMutation = useCreateClientDirectory();
    const updateMutation = useUpdateClientDirectory();
    const { data: record, isLoading } = useClientDirectory(recordId ?? null);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as Resolver<FormValues>,
        defaultValues: {
            name: '',
            designation: '',
            email: '',
            phone: '',
            organization: '',
            giftingTier: '',
            addressPersonal: '',
            addressOfficial: '',
            remarks: [],
        },
    });

    useEffect(() => {
        if (open) {
            if (isEdit && record) {
                form.reset({
                    name: record.name,
                    designation: record.designation ?? '',
                    email: record.email ?? '',
                    phone: record.phone ?? '',
                    organization: record.organization ?? '',
                    giftingTier: (record.giftingTier as GiftingTier | null) ?? '',
                    addressPersonal: record.address?.personal ?? '',
                    addressOfficial: record.address?.official ?? '',
                    remarks: (record.remarks ?? []).map(r => r.text),
                });
            } else {
                form.reset({
                    name: '',
                    designation: '',
                    email: '',
                    phone: '',
                    organization: '',
                    giftingTier: '',
                    addressPersonal: '',
                    addressOfficial: '',
                    remarks: [],
                });
            }
            createMutation.reset?.();
            updateMutation.reset?.();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, isEdit, record]);

    const handleAddRemark = () => {
        form.setValue('remarks', [...(form.getValues('remarks') ?? []), '']);
    };

    const handleRemarkChange = (index: number, value: string) => {
        const current = [...(form.getValues('remarks') ?? [])];
        current[index] = value;
        form.setValue('remarks', current);
    };

    const handleRemoveRemark = (index: number) => {
        form.setValue('remarks', (form.getValues('remarks') ?? []).filter((_, i) => i !== index));
    };

    const handleSubmit = async (values: FormValues) => {
        const address: ClientDirectoryAddress | null =
            values.addressPersonal || values.addressOfficial
                ? {
                      personal: values.addressPersonal || null,
                      official: values.addressOfficial || null,
                  }
                : null;

        const payload = {
            name: values.name,
            designation: values.designation || null,
            email: values.email || null,
            phone: values.phone || null,
            organization: values.organization || null,
            giftingTier: (values.giftingTier || null) as GiftingTier | null,
            address,
            remarks: (values.remarks ?? []).filter((r) => r.trim().length > 0),
        };

        if (isEdit && recordId) {
            await updateMutation.mutateAsync({ id: recordId, data: payload });
        } else {
            await createMutation.mutateAsync(payload);
        }
        onOpenChange(false);
        onSuccess?.();
    };

    const remarkValues = form.watch('remarks') ?? [];
    const saving = createMutation.isPending || updateMutation.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[640px] p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                    <div className="flex items-center gap-3">
                        <div
                            className={cn(
                                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                                isEdit
                                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                                    : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                            )}
                        >
                            {isEdit ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                        </div>
                        <div>
                            <DialogTitle>{isEdit ? 'Edit Client' : 'Add Client'}</DialogTitle>
                            <DialogDescription>
                                {isEdit ? 'Update client contact information' : 'Manually add a new client contact'}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="px-6 py-5 max-h-[calc(100vh-280px)] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : (
                        <form id="client-directory-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name *</Label>
                                    <Input id="name" className={inputCls} {...form.register('name')} />
                                    {form.formState.errors.name && (
                                        <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="designation">Designation</Label>
                                    <Input id="designation" className={inputCls} {...form.register('designation')} />
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" className={inputCls} {...form.register('email')} />
                                    {form.formState.errors.email && (
                                        <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone</Label>
                                    <Input id="phone" className={inputCls} {...form.register('phone')} />
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="organization">Organization</Label>
                                    <Input id="organization" className={inputCls} {...form.register('organization')} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="giftingTier">Gifting Tier</Label>
                                    <Select
                                        value={form.watch('giftingTier') || undefined}
                                        onValueChange={(value) =>
                                            form.setValue('giftingTier', value as FormValues['giftingTier'])
                                        }
                                    >
                                        <SelectTrigger id="giftingTier" className="h-9">
                                            <SelectValue placeholder="Select tier" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {GIFTING_TIERS.map((tier) => (
                                                <SelectItem key={tier} value={tier}>
                                                    {tier}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="addressPersonal">Address (Personal)</Label>
                                    <Textarea id="addressPersonal" {...form.register('addressPersonal')} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="addressOfficial">Address (Official)</Label>
                                    <Textarea id="addressOfficial" {...form.register('addressOfficial')} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Remarks</Label>
                                <div className="space-y-2">
                                    {remarkValues.map((remark, index) => (
                                        <div key={index} className="flex items-start gap-2">
                                            <Textarea
                                                value={remark}
                                                onChange={(e) => handleRemarkChange(index, e.target.value)}
                                                placeholder="Add a remark..."
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="mt-1 shrink-0 text-muted-foreground hover:text-destructive"
                                                onClick={() => handleRemoveRemark(index)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button type="button" variant="outline" size="sm" onClick={handleAddRemark}>
                                        <Plus className="h-4 w-4 mr-1" /> Add Remark
                                    </Button>
                                </div>
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
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={saving}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" form="client-directory-form" disabled={saving}>
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

export default ClientDirectoryModal;
