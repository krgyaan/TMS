import { useParams } from 'react-router-dom';
import { useFixedExpense } from '@/hooks/api/useFixedExpense';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { AlertCircle, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import FixedExpenseForm from './components/FixedExpenseForm';

const FixedExpenseEditPage = () => {
    const { id } = useParams<{ id: string }>();
    const expenseId = Number(id);
    const { canUpdate } = useAuth();

    const { data: fixedExpense, isLoading, error } = useFixedExpense(expenseId);

    if (!canUpdate('accounts.fixed-expenses')) {
        return (
            <Card>
                <CardContent className="py-16 flex flex-col items-center text-center gap-3">
                    <ShieldAlert className="h-10 w-10 text-destructive" />
                    <CardTitle>Access Denied</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        You don&apos;t have permission to edit fixed expenses.
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                ))}
            </div>
        );
    }

    if (error || !fixedExpense) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                    Failed to load fixed expense details. Please try again later.
                </AlertDescription>
            </Alert>
        );
    }

    return <FixedExpenseForm mode="edit" existingData={fixedExpense} />;
};

export default FixedExpenseEditPage;
