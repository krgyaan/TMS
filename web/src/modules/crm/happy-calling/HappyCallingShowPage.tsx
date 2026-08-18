import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, PhoneCall, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHappyCalling } from '@/hooks/api/useHappyCalling';
import { HappyCallingView } from '@/modules/crm/happy-calling/components/HappyCallingView';
import { paths } from '@/app/routes/paths';

const HappyCallingShowPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const recordId = id ? parseInt(id, 10) : null;

    const { data: record, isLoading } = useHappyCalling(recordId);

    const backToList = () => navigate(paths.crm.happyCalling);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48 mt-2" />
                </CardHeader>
                <CardContent className="p-6">
                    <Skeleton className="h-[400px] w-full" />
                </CardContent>
            </Card>
        );
    }

    if (!record) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Happy calling entry not found.
                    <Button variant="outline" size="sm" className="ml-4" onClick={backToList}>
                        Back to List
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <PhoneCall className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle>{record.name}</CardTitle>
                            <CardDescription className="mt-1">Happy calling details</CardDescription>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={backToList}>
                            <ArrowLeft className="h-4 w-4 mr-1" /> Back
                        </Button>
                        <Button size="sm" onClick={() => navigate(paths.crm.happyCallingEdit(record.id))}>
                            <Pencil className="h-4 w-4 mr-1" /> Edit
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <HappyCallingView record={record} />
            </CardContent>
        </Card>
    );
};

export default HappyCallingShowPage;
