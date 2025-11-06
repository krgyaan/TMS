import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { ErrorBoundary } from 'react-error-boundary';
import { Button } from '@/components/ui/button';

// Loading component
function RouteLoader() {
    return (
        <div className="space-y-4 p-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
            <Skeleton className="h-96 w-full" />
        </div>
    );
}

// Error fallback
function RouteErrorFallback({ error, resetErrorBoundary }: any) {
    return (
        <div className="p-6">
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Something went wrong</AlertTitle>
                <AlertDescription className="mt-2">
                    <p className="text-sm">{error?.message || 'An unexpected error occurred'}</p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={resetErrorBoundary}
                        className="mt-4"
                    >
                        Try again
                    </Button>
                </AlertDescription>
            </Alert>
        </div>
    );
}

// Main wrapper
export function RouteWrapper({ children }: { children: React.ReactNode }) {
    return (
        <ErrorBoundary FallbackComponent={RouteErrorFallback}>
            <Suspense fallback={<RouteLoader />}>
                {children}
            </Suspense>
        </ErrorBoundary>
    );
}
