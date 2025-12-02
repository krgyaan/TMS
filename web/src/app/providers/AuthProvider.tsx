// web/src/app/providers/AuthProvider.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider as AuthContextProvider } from '@/contexts/AuthContext';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

interface ProvidersProps {
    children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthContextProvider>
                {children}
            </AuthContextProvider>
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
}

// If you have a separate AuthProvider component, simplify it:
export function AuthProvider({ children }: { children: React.ReactNode }) {
    return (
        <AuthContextProvider>
            {children}
        </AuthContextProvider>
    );
}
