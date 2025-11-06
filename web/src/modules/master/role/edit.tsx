import { useParams, useNavigate } from 'react-router-dom';
// import { RoleForm } from './components/RoleForm';
import { useRole } from '@/hooks/api/useRoles';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { paths } from '@/app/routes/paths';

export default function RoleEditPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: role, isLoading, error } = useRole(id ? Number(id) : null);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (error || !role) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Role not found or failed to load.
                    <Button
                        variant="outline"
                        size="sm"
                        className="ml-4"
                        onClick={() => navigate(paths.master.roles)}
                    >
                        Back to List
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    return <></>;
}
