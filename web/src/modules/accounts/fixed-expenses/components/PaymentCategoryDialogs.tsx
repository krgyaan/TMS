import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useCreatePaymentCategory } from '@/hooks/api/usePaymentCategories';
import type { PaymentCategory } from '@/services/api/payment-category.api';

interface PaymentCategoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: (created: PaymentCategory) => void;
}

interface AddSubTypeDialogProps extends PaymentCategoryDialogProps {
    /** Category (type) the subtype belongs to. */
    typeName: string;
}

function AddTypeDialogContent({ onCreated, onClose }: { onCreated: (c: PaymentCategory) => void; onClose: () => void }) {
    const [name, setName] = useState('');
    const createMutation = useCreatePaymentCategory();

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        const category = name.trim();
        if (!category) return;

        try {
            const created = await createMutation.mutateAsync({ purpose: 'fixed', category });
            onCreated(created);
            setName('');
            onClose();
        } catch {
            // Error toast is handled by the mutation hook.
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
            <Input
                id="payment-category-type-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Electricity"
                autoFocus
            />
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={createMutation.isPending}>
                    Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || !name.trim()}>
                    {createMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
            </DialogFooter>
        </form>
    );
}

function AddSubTypeDialogContent({
    typeName,
    onCreated,
    onClose,
}: {
    typeName: string;
    onCreated: (c: PaymentCategory) => void;
    onClose: () => void;
}) {
    const [name, setName] = useState('');
    const createMutation = useCreatePaymentCategory();

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        const subCategory = name.trim();
        if (!subCategory) return;

        try {
            const created = await createMutation.mutateAsync({
                purpose: 'fixed',
                category: typeName,
                subCategory,
            });
            onCreated(created);
            setName('');
            onClose();
        } catch {
            // Error toast is handled by the mutation hook.
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
            <Input
                id="payment-sub-category-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={`e.g. Residential (${typeName})`}
                autoFocus
            />
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={createMutation.isPending}>
                    Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || !name.trim()}>
                    {createMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
            </DialogFooter>
        </form>
    );
}

export function AddTypeDialog({ open, onOpenChange, onCreated }: PaymentCategoryDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Type</DialogTitle>
                    <DialogDescription>Create a new expense type for fixed expenses.</DialogDescription>
                </DialogHeader>
                {open && (
                    <AddTypeDialogContent
                        onCreated={onCreated}
                        onClose={() => onOpenChange(false)}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

export function AddSubTypeDialog({ open, onOpenChange, onCreated, typeName }: AddSubTypeDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Sub Type</DialogTitle>
                    <DialogDescription>
                        Add a sub type under <span className="font-medium">{typeName}</span>.
                    </DialogDescription>
                </DialogHeader>
                {open && (
                    <AddSubTypeDialogContent
                        typeName={typeName}
                        onCreated={onCreated}
                        onClose={() => onOpenChange(false)}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
