import { useParams } from 'react-router-dom';
import { useFixedExpense } from '@/hooks/api/useFixedExpense';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import FixedExpenseForm from './components/FixedExpenseForm';

const FixedExpenseEditPage = () => {
    const { id } = useParams<{ id: string }>();
    const expenseId = Number(id);

    const { data: fixedExpense, isLoading, error } = useFixedExpense(expenseId);

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
