import { Inject, Injectable } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { DRIZZLE } from '../../../../db/database.module';
import type { DbInstance } from '../../../../db';
import {
    instrumentStatusHistory,
    paymentInstruments,
    type NewInstrumentStatusHistory,
} from '../../../../db/emds.schema';
import {
    getStageFromStatus,
    isRejectedStatus,
    type InstrumentType,
} from '../constants/emd-statuses';

export interface StatusChangeContext {
    userId?: number;
    userName?: string;
    userRole?: string;
    ipAddress?: string;
    userAgent?: string;
    remarks?: string;
    rejectionReason?: string;
    formData?: Record<string, unknown>;
}

@Injectable()
export class InstrumentStatusHistoryService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    /**
     * Record a status change in the history table
     */
    async recordStatusChange(
        instrumentId: number,
        fromStatus: string | null,
        toStatus: string,
        instrumentType: InstrumentType,
        context: StatusChangeContext = {}
    ): Promise<void> {
        const fromAction = fromStatus
            ? getStageFromStatus(instrumentType, fromStatus)
            : null;
        const toAction = getStageFromStatus(instrumentType, toStatus);

        const historyEntry: NewInstrumentStatusHistory = {
            instrumentId,
            fromStatus: fromStatus ?? '',
            toStatus,
            fromAction: fromAction !== null ? fromAction : 0,
            toAction: toAction !== null ? toAction : 0,
            fromStage: fromAction !== null ? fromAction : 0,
            toStage: toAction !== null ? toAction : 0,
            formData: context.formData ?? null,
            remarks: context.remarks ?? null,
            rejectionReason: context.rejectionReason ?? null,
            isResubmission: false,
            previousInstrumentId: null,
            changedBy: context.userId ?? 0,
            changedByName: context.userName ?? '',
            changedByRole: context.userRole ?? '',
            ipAddress: context.ipAddress ?? '',
            userAgent: context.userAgent ?? '',
        };

        await this.db.insert(instrumentStatusHistory).values(historyEntry);
    }

    /**
     * Record a resubmission (after rejection)
     */
    async recordResubmission(
        newInstrumentId: number,
        previousInstrumentId: number,
        toStatus: string,
        instrumentType: InstrumentType,
        context: StatusChangeContext = {}
    ): Promise<void> {
        // Get the previous instrument's final status
        const [prevInstrument] = await this.db
            .select({ status: paymentInstruments.status })
            .from(paymentInstruments)
            .where(eq(paymentInstruments.id, previousInstrumentId))
            .limit(1);

        const fromStatus = prevInstrument?.status || null;
        const toAction = getStageFromStatus(instrumentType, toStatus);

        const historyEntry: NewInstrumentStatusHistory = {
            instrumentId: newInstrumentId,
            fromStatus: fromStatus ?? '',
            toStatus,
            fromAction: 0,
            toAction: toAction !== null ? toAction : 0,
            fromStage: 0,
            toStage: toAction !== null ? toAction : 0,
            formData: context.formData ?? null,
            remarks: context.remarks ?? `Resubmission after rejection`,
            rejectionReason: null,
            isResubmission: true,
            previousInstrumentId,
            changedBy: context.userId ?? 0,
            changedByName: context.userName ?? '',
            changedByRole: context.userRole ?? '',
            ipAddress: context.ipAddress ?? '',
            userAgent: context.userAgent ?? '',
        };

        await this.db.insert(instrumentStatusHistory).values(historyEntry);
    }

    /**
     * Get full status history for an instrument
     */
    async getHistoryForInstrument(instrumentId: number) {
        return this.db
            .select()
            .from(instrumentStatusHistory)
            .where(eq(instrumentStatusHistory.instrumentId, instrumentId))
            .orderBy(desc(instrumentStatusHistory.createdAt));
    }

    /**
     * Get the complete chain of instruments (including resubmissions)
     */
    async getInstrumentChain(instrumentId: number) {
        const history = await this.db
            .select()
            .from(instrumentStatusHistory)
            .where(eq(instrumentStatusHistory.instrumentId, instrumentId))
            .orderBy(instrumentStatusHistory.createdAt);

        // Find all previous instruments in the chain
        const previousIds = history
            .filter((h) => h.isResubmission && h.previousInstrumentId)
            .map((h) => h.previousInstrumentId!);

        const chain: number[] = [...previousIds, instrumentId];

        // Recursively get history for previous instruments
        const fullHistory: any[] = [];
        for (const id of chain) {
            const instHistory = await this.getHistoryForInstrument(id);
            fullHistory.push(...instHistory);
        }

        return {
            instrumentIds: chain,
            history: fullHistory.sort(
                (a, b) =>
                    new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
            ),
        };
    }

    /**
     * Get the latest status entry for an instrument
     */
    async getLatestStatus(instrumentId: number) {
        const [latest] = await this.db
            .select()
            .from(instrumentStatusHistory)
            .where(eq(instrumentStatusHistory.instrumentId, instrumentId))
            .orderBy(desc(instrumentStatusHistory.createdAt))
            .limit(1);

        return latest || null;
    }
}
