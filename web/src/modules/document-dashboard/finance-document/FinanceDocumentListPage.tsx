import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/app/routes/paths';

const FinanceDocumentListPage = () => {
    const navigate = useNavigate();

    // TODO: Replace with actual API hook when available
    // const { data: financeDocuments, isLoading } = useFinanceDocuments();

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Finance Documents</CardTitle>
                        <CardDescription className="mt-2">
                            Manage finance documents
                        </CardDescription>
                    </div>
                    <Button onClick={() => navigate(paths.documentDashboard.financeDocumentCreate)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Finance Document
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-center text-muted-foreground py-8">
                    <p>Finance Document list will be displayed here</p>
                    <p className="text-sm mt-2">TODO: Implement list view with data table</p>
                </div>
            </CardContent>
        </Card>
    );
};

export default FinanceDocumentListPage;
