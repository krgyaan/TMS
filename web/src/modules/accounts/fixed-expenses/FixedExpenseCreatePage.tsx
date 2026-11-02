import FixedExpenseForm from './components/FixedExpenseForm';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const FixedExpenseCreatePage = () => {
    const { canCreate } = useAuth();

    if (!canCreate('accounts.fixed-expenses')) {
        return (
            <Card>
                <CardContent className="py-16 flex flex-col items-center text-center gap-3">
                    <ShieldAlert className="h-10 w-10 text-destructive" />
                    <CardTitle>Access Denied</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        You don&apos;t have permission to create fixed expenses.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return <FixedExpenseForm mode="create" />;
};

export default FixedExpenseCreatePage;
