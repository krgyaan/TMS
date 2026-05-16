import { useParams } from 'react-router-dom';
import { WoRaiseQueryEditForm } from '@/modules/operations/wo-details/components/WoRaiseQueryEditForm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useWoQueriesByWoDetail } from '@/hooks/api/useWoQueries';
import { Skeleton } from '@/components/ui/skeleton';

const WoRaiseQueryEditPage = () => {
    const { id } = useParams<{ id: string }>();
    const woDetailsId = Number(id);

    const { data: queries, isLoading, error } = useWoQueriesByWoDetail(woDetailsId);

    if (!woDetailsId) {
        return (
            <Alert variant="destructive">
                <AlertTitle>Invalid WO Detail ID</AlertTitle>
                <AlertDescription>Please provide a valid WO Detail ID.</AlertDescription>
            </Alert>
        );
    }

    if (isLoading) {
        return (
            <Skeleton>
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
            </Skeleton>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertTitle>Error Loading Queries</AlertTitle>
                <AlertDescription>Failed to fetch existing queries. Please refresh the page.</AlertDescription>
            </Alert>
        );
    }

    return <WoRaiseQueryEditForm woDetailsId={woDetailsId} initialQueries={queries || []} />;
};

export default WoRaiseQueryEditPage;
