import { useParams, useSearchParams } from 'react-router-dom';
import CostingApprovalForm from './components/CostingApprovalForm';
import { useCostingApprovalById } from '@/hooks/api/useCostingApprovals';
import { useCostingDetailById } from '@/hooks/api/useCostingSheets';
import { useTender } from '@/hooks/api/useTenders';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function CostingEditApprovalPage() {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const detailIdParam = searchParams.get('detailId');
    const sheetId = Number(id);
    const detailId = detailIdParam ? Number(detailIdParam) : null;

    const isDetailFlow = detailId !== null;

    const { data: costingSheet, isLoading: costingLoading, error: costingError } = useCostingApprovalById(sheetId);
    const { data: detail, isLoading: detailLoading, error: detailError } = useCostingDetailById(detailId ?? 0);
    const { data: tenderDetails, isLoading: tenderLoading } = useTender(
        Number(isDetailFlow ? detail?.tenderId : costingSheet?.tenderId)
    );

    const mergedData = isDetailFlow && detail ? (detail as any) : costingSheet;
    const isLoading = isDetailFlow
        ? (detailLoading || tenderLoading)
        : (costingLoading || tenderLoading);
    const hasError = isDetailFlow ? detailError : costingError;

    if (isLoading) return <Skeleton className="h-[800px]" />;

    if (hasError) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Failed to load costing data. You may not have permission to access this resource.
                </AlertDescription>
            </Alert>
        );
    }

    if (!mergedData || !tenderDetails) return <div>Costing data not found</div>;

    if (mergedData.status !== 'Approved') {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    This costing has not been approved yet. You can only edit approved costings.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <CostingApprovalForm
            costingSheet={mergedData}
            tenderDetails={{
                tenderNo: tenderDetails.tenderNo,
                tenderName: tenderDetails.tenderName,
                dueDate: tenderDetails.dueDate as Date,
                teamMemberName: tenderDetails.teamMemberName as string,
            }}
            mode="edit"
            isDetailFlow={isDetailFlow}
        />
    );
}
