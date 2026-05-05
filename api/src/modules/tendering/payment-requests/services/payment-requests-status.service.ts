import { Injectable, Logger } from '@nestjs/common';
import { Inject, forwardRef } from '@nestjs/common';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { InstrumentStatusService } from './instrument-status.service';
import { InstrumentStatusHistoryService } from './instrument-status-history.service';

@Injectable()
export class PaymentRequestsStatusService {
    private readonly logger = new Logger(PaymentRequestsStatusService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly instrumentStatusService: InstrumentStatusService,
        private readonly historyService: InstrumentStatusHistoryService,
    ) {}

    /**
     * Transition instrument status
     */
    async transitionInstrumentStatus(
        instrumentId: number,
        newStatus: string,
        formData: Record<string, unknown> = {},
        context: { userId?: number; userName?: string; remarks?: string } = {}
    ) {
        return this.instrumentStatusService.transitionStatus(
            instrumentId,
            newStatus,
            formData,
            context
        );
    }

    /**
     * Reject instrument
     */
    async rejectInstrument(
        instrumentId: number,
        rejectionReason: string,
        context: { userId?: number; userName?: string } = {}
    ) {
        return this.instrumentStatusService.rejectInstrument(
            instrumentId,
            rejectionReason,
            context
        );
    }

    /**
     * Resubmit rejected instrument
     */
    async resubmitInstrument(
        rejectedInstrumentId: number,
        formData: Record<string, unknown>,
        context: { userId?: number; userName?: string } = {}
    ) {
        return this.instrumentStatusService.resubmitInstrument(
            rejectedInstrumentId,
            formData,
            context
        );
    }

    /**
     * Get available actions for instrument
     */
    async getInstrumentAvailableActions(instrumentId: number) {
        return this.instrumentStatusService.getAvailableActions(instrumentId);
    }

    /**
     * Get instrument status history
     */
    async getInstrumentHistory(instrumentId: number) {
        return this.historyService.getInstrumentChain(instrumentId);
    }
}