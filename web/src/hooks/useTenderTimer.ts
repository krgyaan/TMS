import { useState, useEffect, useCallback } from 'react';
import type { TenderTimer } from '@/modules/tendering/tenders/helpers/tenderInfo.types';

export const useTenderTimer = (tenderId: number, initialData?: TenderTimer) => {
    const [timerData, setTimerData] = useState<TenderTimer | null>(
        initialData || null
    );
    const [isLoading, setIsLoading] = useState(!initialData);
    const [error, setError] = useState<string | null>(null);

    const fetchTimer = useCallback(async () => {
        if (!tenderId) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/tenders/${tenderId}/timer`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setTimerData(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch timer');
            console.error('Error fetching timer:', err);
        } finally {
            setIsLoading(false);
        }
    }, [tenderId]);

    // Poll for updates every 30 seconds
    useEffect(() => {
        if (!tenderId) return;

        // Initial fetch if no initial data
        if (!initialData) {
            fetchTimer();
        }

        // Set up polling
        const interval = setInterval(fetchTimer, 30000);

        return () => clearInterval(interval);
    }, [tenderId, initialData, fetchTimer]);

    return {
        timerData,
        isLoading,
        error,
        refreshTimer: fetchTimer,
        hasTimer: timerData?.hasTimer || false,
        remainingSeconds: timerData?.remainingSeconds || 0,
        status: timerData?.status || 'NOT_STARTED',
        stepName: timerData?.stepName || '',
        stepKey: timerData?.stepKey || ''
    };
};
