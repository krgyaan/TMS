import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useCreateBroadcast } from '@/hooks/api/useHappyCalling';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: (id: number) => void;
};

export function BroadcastAddDialog({ open, onOpenChange, onCreated }: Props) {
    const [name, setName] = useState('');
    const createBroadcast = useCreateBroadcast();

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error('Broadcast name is required');
            return;
        }
        try {
            const created = await createBroadcast.mutateAsync({ name: name.trim() });
            toast.success('Broadcast added');
            setName('');
            onOpenChange(false);
            onCreated(created.id);
        } catch {
            // Error toast handled in hook
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" /> Add Broadcast
                    </DialogTitle>
                    <DialogDescription>Create a new broadcast list option</DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                    <Label htmlFor="broadcast-name">Broadcast Name</Label>
                    <Input
                        id="broadcast-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Marketing"
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={createBroadcast.isPending}>
                        {createBroadcast.isPending ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                            <Plus className="h-4 w-4 mr-1" />
                        )}
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default BroadcastAddDialog;