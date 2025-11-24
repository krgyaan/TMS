import { useNavigate, useParams } from 'react-router-dom';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { paths } from "@/app/routes/paths";
import { useTender } from '@/hooks/api/useTenders';
import { useRfqByTenderId } from '@/hooks/api/useRfqs';
import { RfqView } from './components/RfqView';

export default function RfqShowPage() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const tenderId = id ? parseInt(id) : null;

    const { data: tender, isLoading: isTenderLoading, error: tenderError } = useTender(tenderId);
    const { data: rfqData, isLoading: isRfqLoading, error: rfqError } = useRfqByTenderId(tenderId);

    const isLoading = isTenderLoading || isRfqLoading;
    const error = tenderError || rfqError;

    if (!tenderId) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid tender ID</AlertDescription>
                <Button variant="outline" size="sm" onClick={() => navigate(paths.tendering.rfqs)}>
                    Go Back
                </Button>
            </Alert>
        );
    }

    if (error || !tender || !rfqData) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    {!tender ? 'Failed to load tender.' : 'RFQ not found for this tender.'} Please try again.
                </AlertDescription>
                <Button variant="outline" size="sm" onClick={() => navigate(paths.tendering.rfqs)}>
                    Go Back
                </Button>
            </Alert>
        );
    }

    return (
        <RfqView
            rfq={rfqData}
            tender={tender}
            isLoading={isLoading}
            showEditButton={true}
            showBackButton={true}
            onEdit={() => navigate(paths.tendering.rfqsEdit(tenderId))}
            onBack={() => navigate(paths.tendering.rfqs)}
        />
    );
}
