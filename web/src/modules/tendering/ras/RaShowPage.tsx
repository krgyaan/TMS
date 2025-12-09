import { useParams, useNavigate } from 'react-router-dom';
import { useReverseAuction } from '@/hooks/api/useReverseAuctions';
import { RaShow } from './components/RaShow';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function RaShowPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const raId = id ? Number(id) : null;
    const { data: ra, isLoading, error } = useReverseAuction(raId!);

    if (!raId) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Invalid RA ID.
                    <Button
                        variant="outline"
                        size="sm"
                        className="ml-4"
                        onClick={() => navigate('/tendering/ras')}
                    >
                        Back to List
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error || !ra) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    RA not found or failed to load.
                    <Button
                        variant="outline"
                        size="sm"
                        className="ml-4"
                        onClick={() => navigate('/tendering/ras')}
                    >
                        Back to List
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <RaShow
            ra={ra as any}
            isLoading={isLoading}
            showEditButton
            showBackButton
            onEdit={() => navigate(`/tendering/ras/${raId}/edit`)}
            onBack={() => navigate('/tendering/ras')}
        />
    );
}
