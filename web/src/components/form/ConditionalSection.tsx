import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ConditionalSectionProps {
    show: boolean;
    children: ReactNode;
    className?: string;
}

export function ConditionalSection({ show, children, className }: ConditionalSectionProps) {
    if (!show) {
        return null;
    }

    return (
        <div className={cn('space-y-4 animate-in fade-in slide-in-from-top-2 duration-200', className)}>
            {children}
        </div>
    );
}
