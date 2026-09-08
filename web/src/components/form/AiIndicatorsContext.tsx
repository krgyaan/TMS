import * as React from 'react';

export interface FieldIndicator {
    type: 'fallback' | 'missing' | 'low';
    label: string;
    message: string;
}

export const AiIndicatorsContext = React.createContext<Record<string, FieldIndicator>>({});

export function AiFieldIndicator({ indicator }: { indicator?: FieldIndicator | null }) {
    if (!indicator) return null;
    return (
        <span
            className="inline-flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 cursor-help select-none"
            title={indicator.message}
        >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>{indicator.label}</span>
        </span>
    );
}
