import { BaseApiService } from './base.service';

class TimerDashboardService extends BaseApiService {
    constructor() {
        super('/timer-dashboard');
    }

    async search(by: string, value: string) {
        return this.get<{ tender: any; timers: any[]; }>(`/search?by=${encodeURIComponent(by)}&value=${encodeURIComponent(value)}`);
    }

    async stopTimer(data: { entityType: string; entityId: number; stage: string }) {
        return this.post('/stop', data);
    }
}

export const timerDashboardService = new TimerDashboardService();
