import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import TqReceivedForm from './components/TqReceivedForm';
import TqSelector from './components/TqSelector';
import { useTender } from '@/hooks/api/useTenders';
import { useTqByTender } from '@/hooks/api/useTqManagement';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function TqEditReceivedPage() {
    const { tenderId } = useParams<{ tenderId: string }>();
    const parsedTenderId = Number(tenderId);
    const { data: tenderDetails, isLoading: tenderLoading } = useTender(parsedTenderId);
    const { data: allTqs, isLoading: tqsLoading } = useTqByTender(parsedTenderId);
    const [selectedTqId, setSelectedTqId] = useState<number | null>(null);

    const filteredTqs = (allTqs || []).filter(tq => tq.status === 'TQ received');

    useEffect(() => {
        if (filteredTqs.length === 1 && !selectedTqId) {
            setSelectedTqId(filteredTqs[0].id);
        }
    }, [filteredTqs, selectedTqId]);

    const selectedTq = allTqs?.find(tq => tq.id === selectedTqId) ?? null;

    if (tenderLoading || tqsLoading) return <Skeleton className="h-[800px]" />;
    if (!tenderDetails) return <div>Tender not found</div>;

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
        <div className="space-y-6">
            <TqSelector
                tqs={filteredTqs}
                selectedTqId={selectedTqId}
                onSelect={(tq) => setSelectedTqId(tq.id)}
                label="Select TQ to Edit"
                emptyMessage="No TQ records with 'TQ received' status found for this tender."
            />
            {selectedTq && (
                <TqReceivedForm
                    tenderId={parsedTenderId}
                    tenderDetails={{
                        tenderNo: tenderDetails.tenderNo,
                        tenderName: tenderDetails.tenderName,
                        dueDate: tenderDetails.dueDate as Date,
                        teamMemberName: tenderDetails.teamMemberName as string,
                    }}
                    mode="edit"
                    existingData={selectedTq}
                />
            )}
        </div>
    );
}
