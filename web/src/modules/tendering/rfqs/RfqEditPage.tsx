import { useNavigate, useParams } from 'react-router-dom';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { paths } from "@/app/routes/paths";
import { useTender } from '@/hooks/api/useTenders';
import { useRfqByTenderId } from '@/hooks/api/useRfqs';
import { RfqForm } from './components/RfqForm';

export default function RfqEditPage() {
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

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48 mt-2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[600px] w-full" />
                </CardContent>
            </Card>
        );
    }

    const rfq = Array.isArray(rfqData) ? rfqData[0] : null;
    if (error || !tender || !rfq) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    {!tender ? 'Failed to load tender.' : 'No RFQ found to edit.'} Please try again.
                </AlertDescription>
                <Button variant="outline" size="sm" onClick={() => navigate(paths.tendering.rfqs)}>
                    Go Back
                </Button>
            </Alert>
        );
    }

    // Map tender data to the format expected by RfqForm
    const tenderData = {
        tenderId: tender.id,
        tenderNo: tender.tenderNo || '',
        tenderName: tender.tenderName || '',
        rfqTo: tender.rfqTo || '',
        itemName: tender.itemName || '',
        teamMemberName: tender.teamMemberName || '',
        statusName: tender.statusName || '',
        dueDate: tender.dueDate,
        rfqId: rfq.id,
        vendorOrganizationNames: null,
    };

    return (
        <div>
            <RfqForm tenderData={tenderData} initialData={rfq} />
        </div>
    );
}
