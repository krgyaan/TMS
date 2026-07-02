import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { formatDateTime } from '@/hooks/useFormatedDate';
import type { TenderQuery } from '../helpers/tqManagement.types';

interface TqSelectorProps {
    tqs: TenderQuery[];
    selectedTqId: number | null;
    onSelect: (tq: TenderQuery) => void;
    label?: string;
    filterStatus?: string;
    isLoading?: boolean;
    emptyMessage?: string;
}

export default function TqSelector({
    tqs,
    selectedTqId,
    onSelect,
    label = 'Select TQ',
    filterStatus,
    isLoading = false,
    emptyMessage = 'No TQs available',
}: TqSelectorProps) {
    const filteredTqs = filterStatus
        ? tqs.filter(tq => tq.status === filterStatus)
        : tqs;

    const selectedTq = tqs.find(tq => tq.id === selectedTqId) ?? null;

    if (isLoading) {
        return (
            <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
            </div>
        );
    }

    if (filteredTqs.length === 0) {
        return (
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{emptyMessage}</AlertDescription>
            </Alert>
        );
    }

    const handleValueChange = (value: string) => {
        const selected = filteredTqs.find(tq => tq.id.toString() === value);
        if (selected) {
            onSelect(selected);
        }
    };

    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <Select
                value={selectedTq?.id?.toString() ?? ''}
                onValueChange={handleValueChange}
            >
                <SelectTrigger>
                    <SelectValue placeholder="Select a TQ to work with..." />
                </SelectTrigger>
                <SelectContent>
                    {filteredTqs.map((tq, index) => (
                        <SelectItem key={tq.id} value={tq.id.toString()}>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] shrink-0">
                                    TQ #{index + 1}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                    {tq.receivedAt ? formatDateTime(tq.receivedAt) : '—'}
                                </span>
                                <Badge variant="secondary" className="text-[10px] shrink-0">
                                    {tq.status}
                                </Badge>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
