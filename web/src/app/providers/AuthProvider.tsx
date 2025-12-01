import { type ReactNode } from 'react';
import { useCurrentUser } from '@/hooks/api/useAuth';
import { TeamProvider } from '@/contexts/TeamContext';

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const { data: user } = useCurrentUser();

    return (
        <TeamProvider user={user ?? null}>
            {children}
        </TeamProvider>
    );
}
