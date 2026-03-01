import type { TimerWithComputed } from './timer.types';

export type FrontendTimerStatus = 'NOT_STARTED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'OVERDUE';

export interface FrontendTimerData {
    remainingSeconds: number;
    status: FrontendTimerStatus;
    stepName: string;
}

export function transformTimerForFrontend(timer: TimerWithComputed | null, defaultStage?: string): FrontendTimerData {
    if (!timer) {
        // Return a default timer object so frontend always has something to render
        // This ensures the timer field is always present in the response
        return {
            remainingSeconds: 0,
            status: 'NOT_STARTED',
            stepName: defaultStage || 'unknown'
        };
    }

    // Convert milliseconds to seconds
    const remainingSeconds = Math.floor(timer.remainingTimeMs / 1000);

    // Map status from lowercase to uppercase format
    let status: FrontendTimerStatus;
    if (timer.isOverdue && timer.status === 'running') {
        status = 'OVERDUE';
    } else {
        switch (timer.status) {
            case 'running':
                status = 'RUNNING';
                break;
            case 'paused':
                status = 'PAUSED';
                break;
            case 'completed':
                status = 'COMPLETED';
                break;
            case 'cancelled':
                status = 'COMPLETED';  // Treat cancelled as completed
                break;
            case 'not_started':
            default:
                status = 'NOT_STARTED';
                break;
        }
    }

    return {
        remainingSeconds,
        status,
        stepName: timer.stage
    };
}
