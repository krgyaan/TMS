import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useBroadcasts } from '@/hooks/api/useHappyCalling';
import { BroadcastAddDialog } from '@/modules/crm/happy-calling/components/BroadcastAddDialog';

type Props = {
    value?: number;
    onChange: (id: number) => void;
    disabled?: boolean;
};

export function BroadcastSelect({ value, onChange, disabled }: Props) {
    const { data: broadcasts = [], isLoading: loadingBroadcasts } = useBroadcasts();
    const [addDialogOpen, setAddDialogOpen] = useState(false);

    const selected =
        value !== undefined && value !== null && broadcasts.some((b) => b.id === value)
            ? String(value)
            : undefined;

    return (
        <div className="flex items-center gap-2">
            <Select value={selected} onValueChange={(v) => onChange(Number(v))} disabled={disabled || loadingBroadcasts}>
                <SelectTrigger className="h-9 flex-1">
                    <SelectValue
                        placeholder={loadingBroadcasts ? 'Loading broadcasts...' : 'Select a broadcast list'}
                    />
                </SelectTrigger>
                <SelectContent>
                    {broadcasts.length === 0 && (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            No broadcast lists yet
                        </div>
                    )}
                    {broadcasts.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                            {b.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => setAddDialogOpen(true)}
            >
                <Plus className="h-4 w-4" />
            </Button>

            <BroadcastAddDialog
                open={addDialogOpen}
                onOpenChange={setAddDialogOpen}
                onCreated={(id) => onChange(id)}
            />
        </div>
    );
}

export default BroadcastSelect;
