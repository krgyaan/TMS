import { useParams } from 'react-router-dom';
import CostingApprovalForm from './components/CostingApprovalForm';
import { useCostingApprovalById } from '@/hooks/api/useCostingApprovals';
import { useTender } from '@/hooks/api/useTenders';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface CostingApprovalActionPageProps {
    mode: 'approve' | 'edit';
}

export default function CostingApprovalActionPage({ mode }: CostingApprovalActionPageProps) {
    const { id } = useParams<{ id: string }>();
    const sheetId = Number(id);

    const { data: costingSheet, isLoading, error } = useCostingApprovalById(sheetId);
    const { data: tenderDetails, isLoading: tenderLoading } = useTender(
        Number(costingSheet?.tenderId)
    );

    if (isLoading || tenderLoading) return <Skeleton className="h-[800px]" />;

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Failed to load costing data. You may not have permission to access this resource.
                </AlertDescription>
            </Alert>
        );
    }

    if (!costingSheet || !tenderDetails) return <div>Costing data not found</div>;

    const tenderDetailProps = {
        tenderNo: tenderDetails.tenderNo,
        tenderName: tenderDetails.tenderName,
        dueDate: tenderDetails.dueDate as Date,
        teamMemberName: tenderDetails.teamMemberName as string,
    };

    if (mode === 'edit') {
        const hasApproved = costingSheet.details?.some(d => d.status === 'Approved');
        if (!hasApproved) {
            return (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        No approved costing details found. You can only edit approved costings.
                    </AlertDescription>
                </Alert>
            );
        }
    }

    return (
        <CostingApprovalForm
            costingSheet={costingSheet}
            tenderDetails={tenderDetailProps}
            mode={mode}
        />
    );
}
