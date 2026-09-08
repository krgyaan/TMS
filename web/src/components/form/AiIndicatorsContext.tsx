import * as React from 'react';
import { Sparkles, AlertTriangle, AlertCircle } from 'lucide-react';

export interface FieldIndicator {
    type: 'high' | 'fallback' | 'low' | 'missing';
    label: string;
    message: string;
    confidenceValue?: number | string;
    suggestedValue?: any;
    source?: string | null;
}

export const AiIndicatorsContext = React.createContext<Record<string, FieldIndicator>>({});

export function AiFieldIndicator({ indicator }: { indicator?: FieldIndicator | null }) {
    if (!indicator) return null;

    if (indicator.type === 'high') {
        return (
            <span
                className="inline-flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 cursor-help select-none shadow-2xs"
                title={indicator.message}
            >
                <Sparkles className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                <span>{indicator.label}</span>
            </span>
        );
    }

    if (indicator.type === 'fallback') {
        return (
            <span
                className="inline-flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 cursor-help select-none shadow-2xs"
                title={indicator.message}
            >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>{indicator.label}</span>
            </span>
        );
    }

    if (indicator.type === 'low') {
        return (
            <span
                className="inline-flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-orange-100 dark:bg-orange-950/80 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-700 cursor-help select-none shadow-2xs"
                title={indicator.message}
            >
                <AlertTriangle className="h-2.5 w-2.5 text-orange-600 dark:text-orange-400" />
                <span>{indicator.label}</span>
            </span>
        );
    }

    // missing in PDF
    return (
        <span
            className="inline-flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700 cursor-help select-none shadow-2xs"
            title={indicator.message}
        >
            <AlertCircle className="h-2.5 w-2.5 text-red-600 dark:text-red-400" />
            <span>{indicator.label}</span>
        </span>
    );
}

