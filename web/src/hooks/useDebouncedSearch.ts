import { useState, useEffect } from 'react';

/**
 * Hook to debounce search input
 * @param value - The search value
 * @param delay - Delay in milliseconds (default: 300)
 * @returns Debounced value
 */
export function useDebouncedSearch(value: string, delay: number = 300): string {
    const [debouncedValue, setDebouncedValue] = useState<string>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}
