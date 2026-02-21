export interface TimerConfig {
    type: 'FIXED_DURATION' | 'DEADLINE_BASED' | 'NEGATIVE_COUNTDOWN' | 'DYNAMIC' | 'NO_TIMER';
    durationHours?: number;
    warningThreshold?: number;
    criticalThreshold?: number;
    hoursBeforeDeadline?: number;
}

export interface StartTimerInput {
    entityId: number;
    entityType: string;
    stage: string;
    allocatedTimeMs?: number;
    timerConfig?: TimerConfig;
    assignedUserId?: number;
    assignedRole?: string;
    workflowCode?: string;
    stepOrder?: number;
    deadlineAt?: Date;
    userId?: number;
    metadata?: Record<string, any>;
}

export interface TimerActionInput {
    entityId: number;
    entityType: string;
    stage?: string;
    userId?: number;
    reason?: string;
}

export interface ExtendTimerInput extends TimerActionInput {
    extensionMs: number;
}

export interface TimerWithComputed {
    id: number;
    entityType: string;
    entityId: number;
    stage: string;
    status: string;
    timerType: string;
    allocatedTimeMs: number;
    totalExtensionMs: number;
    totalPausedDurationMs: number;
    effectiveAllocatedTimeMs: number;
    remainingTimeMs: number;
    elapsedTimeMs: number;
    progressPercent: number;
    isWarning: boolean;
    isCritical: boolean;
    isOverdue: boolean;
    startedAt: Date | null;
    endedAt: Date | null;
    pausedAt: Date | null;
    deadlineAt: Date | null;
    assignedUserId: number | null;
    assignedRole: string | null;
    workflowCode: string | null;
    stepOrder: number | null;
    warningThreshold: number;
    criticalThreshold: number;
    metadata: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

// Helper
export const hoursToMs = (hours: number): number => hours * 60 * 60 * 1000;
