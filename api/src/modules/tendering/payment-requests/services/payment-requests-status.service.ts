import { Injectable, Logger } from '@nestjs/common';
import { Inject, forwardRef } from '@nestjs/common';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { InstrumentStatusService } from './instrument-status.service';
import { InstrumentStatusHistoryService } from './instrument-status-history.service';
import { PaymentRequestsService } from '../payment-requests.service';

@Injectable()
export class PaymentRequestsStatusService {
    private readonly logger = new Logger(PaymentRequestsStatusService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly instrumentStatusService: InstrumentStatusService,
        private readonly historyService: InstrumentStatusHistoryService,
        @Inject(forwardRef(() => PaymentRequestsService))
        private readonly paymentRequestsService: PaymentRequestsService,
    ) {}

    /**
     * Transition instrument status - delegates to main service
     */
    async transitionInstrumentStatus(
        instrumentId: number,
        newStatus: string,
        context: Record<string, unknown>
    ) {
        return this.paymentRequestsService.transitionInstrumentStatus(
            instrumentId,
            newStatus,
            context as any
        );
    }

    /**
     * Reject instrument - delegates to main service
     */
    async rejectInstrument(instrumentId: number, reason: string, context: Record<string, unknown>) {
        return this.paymentRequestsService.rejectInstrument(
            instrumentId,
            reason,
            context as any
        );
    }

    /**
     * Resubmit instrument - delegates to main service
     */
    async resubmitInstrument(instrumentId: number, context: Record<string, unknown>) {
        return this.paymentRequestsService.resubmitInstrument(
            instrumentId,
            context as any
        );
    }

    /**
     * Get available actions for instrument - delegates to main service
     */
    async getInstrumentAvailableActions(instrumentId: number) {
        return this.paymentRequestsService.getInstrumentAvailableActions(instrumentId);
    }

    /**
     * Get instrument history - delegates to main service
     */
    async getInstrumentHistory(instrumentId: number) {
        return this.paymentRequestsService.getInstrumentHistory(instrumentId);
    }
}