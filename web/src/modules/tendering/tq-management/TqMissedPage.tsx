import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import TqMissedForm from './components/TqMissedForm';
import TqSelector from './components/TqSelector';
import { useTqByTender } from '@/hooks/api/useTqManagement';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function TqMissedPage() {
    const { tenderId } = useParams<{ tenderId: string }>();
    const parsedTenderId = Number(tenderId);
    const { data: allTqs, isLoading: tqsLoading } = useTqByTender(parsedTenderId);
    const [selectedTqId, setSelectedTqId] = useState<number | null>(null);

    const filteredTqs = (allTqs || []).filter(tq => tq.status === 'TQ received');

    useEffect(() => {
        if (filteredTqs.length === 1 && !selectedTqId) {
            setSelectedTqId(filteredTqs[0].id);
        }
    }, [filteredTqs, selectedTqId]);

    const selectedTq = allTqs?.find(tq => tq.id === selectedTqId) ?? null;

    if (tqsLoading) return <Skeleton className="h-[800px]" />;

    if (filteredTqs.length === 0) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    No TQ records with "TQ received" status found for this tender.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <Card>
            <CardContent className="space-y-6">
                <TqSelector
                    tqs={filteredTqs}
                    selectedTqId={selectedTqId}
                    onSelect={(tq) => setSelectedTqId(tq.id)}
                    label="Select TQ to Mark as Missed"
                    emptyMessage="No TQ records with 'TQ received' status found for this tender."
                />
                {selectedTq && (
                    <TqMissedForm
                        tqData={selectedTq}
                        mode="missed"
                    />
                )}
            </CardContent>
        </Card>
    );
}
