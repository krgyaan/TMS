import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

interface PersistedTabOptions<T extends string> {
    param: string;
    defaultValue: T;
    validValues: readonly T[];
    storageKey: string;
}

export function usePersistedTab<T extends string>({
    param,
    defaultValue,
    validValues,
    storageKey,
}: PersistedTabOptions<T>): [T, (value: T) => void] {
    const [searchParams, setSearchParams] = useSearchParams();

    const readInitial = (): T => {
        const urlValue = searchParams.get(param);
        if (urlValue && validValues.includes(urlValue as T)) {
            return urlValue as T;
        }
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved && validValues.includes(saved as T)) {
                return saved as T;
            }
        } catch {
            // storage unavailable
        }
        return defaultValue;
    };

    const [value, setValueState] = useState<T>(readInitial);

    useEffect(() => {
        const current = searchParams.get(param);
        const next = new URLSearchParams(searchParams);
        if (value === defaultValue) {
            if (current !== null) {
                next.delete(param);
            }
        } else if (current !== value) {
            next.set(param, value);
        }
        setSearchParams(next, { replace: true });
        try {
            localStorage.setItem(storageKey, value);
        } catch {
            // storage unavailable
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, param, defaultValue, searchParams, setSearchParams]);

    const setValue = useCallback((next: T) => {
        setValueState(next);
    }, []);

    return [value, setValue];
}
