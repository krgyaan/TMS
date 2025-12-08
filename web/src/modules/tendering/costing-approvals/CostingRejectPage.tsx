import { useParams } from 'react-router-dom';
import CostingRejectionForm from './components/CostingRejectionForm';
import { useCostingApprovalById } from '@/hooks/api/useCostingApprovals';
import { useTender } from '@/hooks/api/useTenders';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function CostingRejectPage() {
    const { id } = useParams<{ id: string }>();
    const { data: costingSheet, isLoading: costingLoading, error: costingError } = useCostingApprovalById(Number(id));
    const { data: tenderDetails, isLoading: tenderLoading } = useTender(Number(costingSheet?.tenderId));

    if (costingLoading || tenderLoading) return <Skeleton className="h-[600px]" />;

    if (costingError) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Failed to load costing sheet. You may not have permission to access this resource.
                </AlertDescription>
            </Alert>
        );
    }

    if (!costingSheet || !tenderDetails) return <div>Costing sheet not found</div>;

    return (
        <CostingRejectionForm
            costingSheet={costingSheet}
            tenderDetails={{
                tenderNo: tenderDetails.tenderNo,
                tenderName: tenderDetails.tenderName,
                dueDate: tenderDetails.dueDate as Date,
                teamMemberName: tenderDetails.teamMemberName as string,
            }}
        />
    );
}
