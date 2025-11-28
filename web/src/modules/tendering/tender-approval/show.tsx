import { useParams, useNavigate } from 'react-router-dom';
import { useTender } from '@/hooks/api/useTenders';
import { useTenderApproval } from '@/hooks/api/useTenderApprovals';
import { TenderApprovalView } from './components/TenderApprovalView';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { paths } from '@/app/routes/paths';
import type { TenderWithRelations } from '@/types/api.types';

export default function TenderApprovalShowPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const parsedId = id ? Number(id) : NaN;
    const tenderId = Number.isNaN(parsedId) ? null : parsedId;

    const { data: tender, isLoading: tenderLoading, error: tenderError } = useTender(tenderId);
    const { data: approval, isLoading: approvalLoading } = useTenderApproval(tenderId);
    console.log(tender, approval);

    const isLoading = tenderLoading || approvalLoading;

    if (!tenderId || tenderError || (!tenderLoading && !tender)) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Tender not found or failed to load.
                    <Button
                        variant="outline"
                        size="sm"
                        className="ml-4"
                        onClick={() => navigate(paths.tendering.tenderApproval)}
                    >
                        Back to List
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    // Combine tender and approval into TenderWithRelations
    const tenderWithRelations: TenderWithRelations = {
        ...tender!,
        approval: approval || null,
    };

    return (
        <div className="space-y-6">
            <TenderApprovalView
                tender={tenderWithRelations}
                isLoading={isLoading}
                showEditButton
                showBackButton
                onEdit={() => navigate(paths.tendering.tenderApprovalCreate(tenderId!))}
                onBack={() => navigate(paths.tendering.tenderApproval)}
            />
        </div>
    );
}
