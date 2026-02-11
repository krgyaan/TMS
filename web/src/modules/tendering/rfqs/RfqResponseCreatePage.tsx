import { useNavigate, useParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { paths } from '@/app/routes/paths';
import { useRfq, useRfqVendors } from '@/hooks/api/useRfqs';
import { RfqResponseForm } from './components/RfqResponseForm';
import { useMemo } from 'react';

export default function RfqResponseCreatePage() {
    const navigate = useNavigate();
    const { rfqId: rfqIdParam } = useParams<{ rfqId: string }>();

    const rfqId = rfqIdParam ? parseInt(rfqIdParam, 10) : null;
    const { data: rfq, isLoading, error } = useRfq(rfqId);
    const { data: vendorOrgs = [] } = useRfqVendors(rfq?.requestedVendor ?? undefined);

    const { vendorName, vendorId } = useMemo(() => {
        const firstOrg = vendorOrgs[0];
        if (!firstOrg) return { vendorName: '—', vendorId: 0 };
        const persons = firstOrg.persons ?? [];
        if (persons.length > 0) {
            const firstPerson = persons[0];
            return {
                vendorName: persons.length > 1 ? `${firstOrg.name} – ${firstPerson.name}` : firstOrg.name,
                vendorId: firstPerson.id,
            };
        }
        return { vendorName: firstOrg.name, vendorId: firstOrg.id };
    }, [vendorOrgs]);

    if (!rfqIdParam || Number.isNaN(rfqId!)) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid RFQ ID</AlertDescription>
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
                    <Skeleton className="h-[400px] w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error || !rfq) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Failed to load RFQ. Please try again.</AlertDescription>
                <Button variant="outline" size="sm" onClick={() => navigate(paths.tendering.rfqs)}>
                    Go Back
                </Button>
            </Alert>
        );
    }

    const rfqData = {
        ...rfq,
        items: rfq.items ?? [],
        tenderNo: (rfq as any).tenderNo ?? '',
        tenderName: (rfq as any).tenderName ?? '',
    };

    if (!rfqData.items.length) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>This RFQ has no items. Add items to the RFQ before recording a response.</AlertDescription>
                <Button variant="outline" size="sm" onClick={() => navigate(paths.tendering.rfqs)}>
                    Go Back
                </Button>
            </Alert>
        );
    }

    return (
        <div>
            <RfqResponseForm
                rfqId={rfqId!}
                rfqData={rfqData}
                vendorName={vendorName}
                vendorId={vendorId}
            />
        </div>
    );
}
