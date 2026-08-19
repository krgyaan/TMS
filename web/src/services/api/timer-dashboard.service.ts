import { BaseApiService } from './base.service';

export interface TenderEntity {
    type: 'TENDER';
    id: number;
    tenderNo: string;
    tenderName: string;
    dueDate: string | null;
    teamMemberId: number | null;
    teamMemberName: string | null;
    tlStatus: number;
    deleteStatus: number;
}

export interface EmdEntity {
    type: 'EMD';
    id: number;
    tenderId: number;
    tenderNo: string | null;
    projectName: string | null;
    purpose: string;
    amountRequired: string;
    dueDate: string | null;
    status: string | null;
    requestedBy: number | null;
}

export type ExpiringTimerEntity = TenderEntity | EmdEntity;

export interface ExpiringTimer {
    id: number;
    entityType: 'TENDER' | 'EMD' | 'COURIER' | 'SERVICE' | 'OPERATION';
    entityId: number;
    stage: string;
    status: string;
    deadlineAt: string | null;
    allocatedTimeMs: number;
    totalExtensionMs: number;
    totalPausedDurationMs: number;
    assignedUserId: number | null;
    assignedUserName: string | null;
    remainingMs: number;
    metadata: Record<string, unknown> | null;
    entity: ExpiringTimerEntity | null;
}

export interface ExpiringTimersResponse {
    timers: ExpiringTimer[];
}

class TimerDashboardService extends BaseApiService {
    constructor() {
        super('/timer-dashboard');
    }

    async search(by: string, value: string) {
        return this.get<{ results: Array<{ tender: Record<string, unknown>; timers: Array<Record<string, unknown>> }> }>(`/search?by=${encodeURIComponent(by)}&value=${encodeURIComponent(value)}`);
    }

    async expiringSoon(hours: number = 12, includeOverdue: boolean = false) {
        return this.get<ExpiringTimersResponse>(`/expiring-soon?hours=${hours}&includeOverdue=${includeOverdue}`);
    }

    async stopTimer(data: { entityType: string; entityId: number; stage: string }) {
        return this.post('/stop', data);
    }
}

export const timerDashboardService = new TimerDashboardService();
