import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useClientDirectory, useUpdateClientDirectory } from '@/hooks/api/useClientDirectory';
import type { ClientDirectoryRow } from '@/modules/shared/client-directory/helpers/client-directory.types';

const editSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    email: z.string().email().max(255).nullable().optional(),
    phone: z.string().max(20).nullable().optional(),
    organization: z.string().max(255).nullable().optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    recordId: number | null;
    mode: 'view' | 'edit';
};

export function ClientDirectoryModal({ open, onOpenChange, recordId, mode }: Props) {
    const { data: record, isLoading } = useClientDirectory(recordId);
    const updateMutation = useUpdateClientDirectory();

    const form = useForm<EditFormValues>({
        resolver: zodResolver(editSchema),
        defaultValues: { name: '', email: null, phone: null, organization: null },
    });

    useEffect(() => {
        if (record) {
            form.reset({
                name: record.name,
                email: record.email ?? null,
                phone: record.phone ?? null,
                organization: record.organization ?? null,
            });
        }
    }, [record, form]);

    const handleSave = async (values: EditFormValues) => {
        if (!recordId) return;
        await updateMutation.mutateAsync({
            id: recordId,
            data: {
                name: values.name,
                email: values.email || null,
                phone: values.phone || null,
                organization: values.organization || null,
            },
        });
        onOpenChange(false);
    };

    const isView = mode === 'view';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isView ? 'View Client' : 'Edit Client'}</DialogTitle>
                    <DialogDescription>
                        {isView ? 'Client contact details' : 'Update client contact information'}
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="space-y-4 py-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="space-y-2">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ))}
                    </div>
                ) : record ? (
                    <form onSubmit={form.handleSubmit(handleSave)}>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                {isView ? (
                                    <div className="text-sm py-2 px-3 rounded-md border bg-muted/50">
                                        {record.name}
                                    </div>
                                ) : (
                                    <Input id="name" {...form.register('name')} />
                                )}
                                {!isView && form.formState.errors.name && (
                                    <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                {isView ? (
                                    <div className="text-sm py-2 px-3 rounded-md border bg-muted/50">
                                        {record.email || '—'}
                                    </div>
                                ) : (
                                    <Input id="email" type="email" {...form.register('email')} />
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                {isView ? (
                                    <div className="text-sm py-2 px-3 rounded-md border bg-muted/50">
                                        {record.phone || '—'}
                                    </div>
                                ) : (
                                    <Input id="phone" {...form.register('phone')} />
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="organization">Organization</Label>
                                {isView ? (
                                    <div className="text-sm py-2 px-3 rounded-md border bg-muted/50">
                                        {record.organization || '—'}
                                    </div>
                                ) : (
                                    <Input id="organization" {...form.register('organization')} />
                                )}
                            </div>
                        </div>

                        <DialogFooter>
                            {!isView && (
                                <Button type="submit" disabled={updateMutation.isPending}>
                                    {updateMutation.isPending ? 'Saving...' : 'Save'}
                                </Button>
                            )}
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                {isView ? 'Close' : 'Cancel'}
                            </Button>
                        </DialogFooter>
                    </form>
                ) : (
                    <div className="py-8 text-center text-muted-foreground">Record not found</div>
                )}
            </DialogContent>
        </Dialog>
    );
}
