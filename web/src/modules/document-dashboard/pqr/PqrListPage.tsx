import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';

const PqrListPage = () => {
    const navigate = useNavigate();

    // TODO: Replace with actual API hook when available
    // const { data: pqrs, isLoading } = usePqrs();

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>PQR</CardTitle>
                        <CardDescription className="mt-2">
                            Manage PQR entries
                        </CardDescription>
                    </div>
                    <Button onClick={() => navigate(paths.documentDashboard.pqrCreate)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create PQR
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-center text-muted-foreground py-8">
                    <p>PQR list will be displayed here</p>
                    <p className="text-sm mt-2">TODO: Implement list view with data table</p>
                </div>
            </CardContent>
        </Card>
    );
};

export default PqrListPage;
