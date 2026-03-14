import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import {
    paymentInstruments,
    instrumentDdDetails,
    instrumentFdrDetails,
    instrumentBgDetails,
    instrumentChequeDetails,
    instrumentTransferDetails,
    type PaymentInstrument,
} from '@db/schemas/tendering/emds.schema';
import {
    InstrumentStatusHistoryService,
    type StatusChangeContext,
} from '@/modules/tendering/emds/services/instrument-status-history.service';
import {
    getStagesForInstrument,
    getStageFromStatus,
    isTerminalStatus,
    isRejectedStatus,
    getNextAvailableStages,
    type InstrumentType,
    DD_STATUSES,
    FDR_STATUSES,
    BG_STATUSES,
    CHEQUE_STATUSES,
    BT_STATUSES,
    PORTAL_STATUSES,
} from '@/modules/tendering/emds/constants/emd-statuses';

export interface StageFormData {
    [key: string]: unknown;
}

@Injectable()
export class InstrumentStatusService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly historyService: InstrumentStatusHistoryService
    ) { }

    /**
     * Transition an instrument to a new status
     */
    async transitionStatus(
        instrumentId: number,
        newStatus: string,
        formData: StageFormData = {},
        context: StatusChangeContext = {}
    ): Promise<PaymentInstrument> {
        // Get current instrument
        const [instrument] = await this.db
            .select()
            .from(paymentInstruments)
            .where(eq(paymentInstruments.id, instrumentId))
            .limit(1);

        if (!instrument) {
            throw new BadRequestException(`Instrument ${instrumentId} not found`);
        }

        const instrumentType = instrument.instrumentType as InstrumentType;
        const currentStatus = instrument.status;
        const currentStage = getStageFromStatus(instrumentType, currentStatus);
        const newStage = getStageFromStatus(instrumentType, newStatus);

        // Validate transition
        this.validateTransition(instrumentType, currentStatus, newStatus);

        // Update instrument status
        const [updated] = await this.db
            .update(paymentInstruments)
            .set({
                status: newStatus,
                action: newStage,
                updatedAt: new Date(),
            })
            .where(eq(paymentInstruments.id, instrumentId))
            .returning();

        // Update detail table with form data
        await this.updateDetailTable(instrumentId, instrumentType, newStage!, formData);

        // Record in history
        await this.historyService.recordStatusChange(
            instrumentId,
            currentStatus,
            newStatus,
            instrumentType,
            {
                ...context,
                formData,
            }
        );

        return updated;
    }

    /**
     * Reject an instrument at current stage
     */
    async rejectInstrument(
        instrumentId: number,
        rejectionReason: string,
        context: StatusChangeContext = {}
    ): Promise<PaymentInstrument> {
        const [instrument] = await this.db
            .select()
            .from(paymentInstruments)
            .where(eq(paymentInstruments.id, instrumentId))
            .limit(1);

        if (!instrument) {
            throw new BadRequestException(`Instrument ${instrumentId} not found`);
        }

        const instrumentType = instrument.instrumentType as InstrumentType;
        const currentStatus = instrument.status;

        // Determine rejection status
        const rejectedStatus = this.getRejectedStatus(instrumentType, currentStatus);

        // Update instrument
        const [updated] = await this.db
            .update(paymentInstruments)
            .set({
                status: rejectedStatus,
                updatedAt: new Date(),
            })
            .where(eq(paymentInstruments.id, instrumentId))
            .returning();

        // Record in history
        await this.historyService.recordStatusChange(
            instrumentId,
            currentStatus,
            rejectedStatus,
            instrumentType,
            {
                ...context,
                rejectionReason,
            }
        );

        return updated;
    }

    /**
     * Resubmit after rejection - creates a new instrument
     */
    async resubmitInstrument(
        rejectedInstrumentId: number,
        formData: StageFormData,
        context: StatusChangeContext = {}
    ): Promise<PaymentInstrument> {
        // Get rejected instrument
        const [rejectedInstrument] = await this.db
            .select()
            .from(paymentInstruments)
            .where(eq(paymentInstruments.id, rejectedInstrumentId))
            .limit(1);

        if (!rejectedInstrument) {
            throw new BadRequestException(`Instrument ${rejectedInstrumentId} not found`);
        }

        if (!isRejectedStatus(rejectedInstrument.status)) {
            throw new BadRequestException(
                `Instrument ${rejectedInstrumentId} is not in rejected status`
            );
        }

        const instrumentType = rejectedInstrument.instrumentType as InstrumentType;

        // Mark old instrument as inactive
        await this.db
            .update(paymentInstruments)
            .set({ isActive: false })
            .where(eq(paymentInstruments.id, rejectedInstrumentId));

        // Get initial status for this instrument type
        const initialStatus = this.getInitialStatus(instrumentType);

        // Create new instrument
        const [newInstrument] = await this.db
            .insert(paymentInstruments)
            .values({
                requestId: rejectedInstrument.requestId,
                instrumentType: rejectedInstrument.instrumentType,
                amount: rejectedInstrument.amount,
                favouring: rejectedInstrument.favouring,
                payableAt: rejectedInstrument.payableAt,
                status: initialStatus,
                action: 0,
                isActive: true,
                courierAddress: rejectedInstrument.courierAddress,
                courierDeadline: rejectedInstrument.courierDeadline,
            })
            .returning();

        // Create detail record
        await this.createDetailRecord(newInstrument.id, instrumentType, formData);

        // Record resubmission in history
        await this.historyService.recordResubmission(
            newInstrument.id,
            rejectedInstrumentId,
            initialStatus,
            instrumentType,
            {
                ...context,
                formData,
            }
        );

        return newInstrument;
    }

    /**
     * Get available next actions for an instrument
     */
    async getAvailableActions(instrumentId: number) {
        const [instrument] = await this.db
            .select()
            .from(paymentInstruments)
            .where(eq(paymentInstruments.id, instrumentId))
            .limit(1);

        if (!instrument) {
            return { nextStages: [], canResubmit: false };
        }

        const instrumentType = instrument.instrumentType as InstrumentType;
        const currentStatus = instrument.status;

        // If rejected, only option is resubmit
        if (isRejectedStatus(currentStatus)) {
            return {
                nextStages: [],
                canResubmit: true,
                currentStatus,
                instrumentType,
            };
        }

        // If terminal, no actions available
        if (isTerminalStatus(instrumentType, currentStatus)) {
            return {
                nextStages: [],
                canResubmit: false,
                currentStatus,
                instrumentType,
                isTerminal: true,
            };
        }

        // Get available next stages
        const nextStages = getNextAvailableStages(instrumentType, currentStatus);
        const stages = getStagesForInstrument(instrumentType);

        const availableStages = nextStages.map((stageNum) => {
            const stageConfig = stages[stageNum as keyof typeof stages];
            return {
                stage: stageNum,
                name: (stageConfig as Record<string, any>)?.name || `Stage ${stageNum}`,
                statuses: (stageConfig as Record<string, any>)?.statuses || [],
            };
        });

        return {
            nextStages: availableStages,
            canResubmit: false,
            currentStatus,
            instrumentType,
        };
    }

    // ========================================================================
    // Private Helper Methods
    // ========================================================================

    private validateTransition(
        instrumentType: InstrumentType,
        currentStatus: string,
        newStatus: string
    ): void {
        // If rejected, cannot transition (must resubmit)
        if (isRejectedStatus(currentStatus)) {
            throw new BadRequestException(
                `Cannot transition from rejected status. Please resubmit.`
            );
        }

        // If terminal, cannot transition
        if (isTerminalStatus(instrumentType, currentStatus)) {
            throw new BadRequestException(
                `Cannot transition from terminal status ${currentStatus}`
            );
        }

        const currentStage = getStageFromStatus(instrumentType, currentStatus);
        const newStage = getStageFromStatus(instrumentType, newStatus);

        if (!newStage) {
            throw new BadRequestException(`Invalid status ${newStatus} for ${instrumentType}`);
        }

        // Allow transition within same stage or to allowed next stages
        const allowedNextStages = getNextAvailableStages(instrumentType, currentStatus);

        if (currentStage !== newStage && !allowedNextStages.includes(newStage)) {
            throw new BadRequestException(
                `Cannot transition from stage ${currentStage} to stage ${newStage}`
            );
        }
    }

    private getRejectedStatus(instrumentType: InstrumentType, currentStatus: string): string {
        const currentStage = getStageFromStatus(instrumentType, currentStatus);

        switch (instrumentType) {
            case 'DD':
                if (currentStage === 1) return DD_STATUSES.ACCOUNTS_FORM_REJECTED;
                if (currentStage === 6) return DD_STATUSES.CANCELLATION_REQUESTED;
                return DD_STATUSES.ACCOUNTS_FORM_REJECTED;
            case 'FDR':
                if (currentStage === 1) return FDR_STATUSES.ACCOUNTS_FORM_REJECTED;
                if (currentStage === 6) return FDR_STATUSES.ACCOUNTS_FORM_REJECTED; // Cancellation request rejection
                return FDR_STATUSES.ACCOUNTS_FORM_REJECTED;
            case 'BG':
                if (currentStage === 1) return BG_STATUSES.ACCOUNTS_FORM_REJECTED;
                if (currentStage === 5) return BG_STATUSES.EXTENSION_REQUESTED;
                if (currentStage === 7) return BG_STATUSES.CANCELLATION_REQUESTED;
                return BG_STATUSES.ACCOUNTS_FORM_REJECTED;
            case 'Cheque':
                return CHEQUE_STATUSES.ACCOUNTS_FORM_REJECTED;
            case 'Bank Transfer':
                return BT_STATUSES.ACCOUNTS_FORM_REJECTED;
            case 'Portal Payment':
                return PORTAL_STATUSES.ACCOUNTS_FORM_REJECTED;
            default:
                throw new BadRequestException(`Unknown instrument type: ${instrumentType}`);
        }
    }

    private getInitialStatus(instrumentType: InstrumentType): string {
        switch (instrumentType) {
            case 'DD':
                return DD_STATUSES.PENDING;
            case 'FDR':
                return FDR_STATUSES.PENDING;
            case 'BG':
                return BG_STATUSES.PENDING;
            case 'Cheque':
                return CHEQUE_STATUSES.PENDING;
            case 'Bank Transfer':
                return BT_STATUSES.PENDING;
            case 'Portal Payment':
                return PORTAL_STATUSES.PENDING;
            default:
                return 'PENDING';
        }
    }

    private async updateDetailTable(
        instrumentId: number,
        instrumentType: InstrumentType,
        stage: number,
        formData: StageFormData
    ): Promise<void> {
        switch (instrumentType) {
            case 'DD':
                await this.db
                    .update(instrumentDdDetails)
                    .set(formData as any)
                    .where(eq(instrumentDdDetails.instrumentId, instrumentId));
                break;
            case 'FDR':
                await this.db
                    .update(instrumentFdrDetails)
                    .set(formData as any)
                    .where(eq(instrumentFdrDetails.instrumentId, instrumentId));
                break;
            case 'BG':
                await this.db
                    .update(instrumentBgDetails)
                    .set(formData as any)
                    .where(eq(instrumentBgDetails.instrumentId, instrumentId));
                break;
            case 'Cheque':
                await this.db
                    .update(instrumentChequeDetails)
                    .set(formData as any)
                    .where(eq(instrumentChequeDetails.instrumentId, instrumentId));
                break;
            case 'Bank Transfer':
            case 'Portal Payment':
                await this.db
                    .update(instrumentTransferDetails)
                    .set(formData as any)
                    .where(eq(instrumentTransferDetails.instrumentId, instrumentId));
                break;
        }
    }

    private async createDetailRecord(
        instrumentId: number,
        instrumentType: InstrumentType,
        formData: StageFormData
    ): Promise<void> {
        switch (instrumentType) {
            case 'DD':
                await this.db.insert(instrumentDdDetails).values({
                    instrumentId,
                    ...formData,
                } as any);
                break;
            case 'FDR':
                await this.db.insert(instrumentFdrDetails).values({
                    instrumentId,
                    ...formData,
                } as any);
                break;
            case 'BG':
                await this.db.insert(instrumentBgDetails).values({
                    instrumentId,
                    ...formData,
                } as any);
                break;
            case 'Cheque':
                await this.db.insert(instrumentChequeDetails).values({
                    instrumentId,
                    ...formData,
                } as any);
                break;
            case 'Bank Transfer':
            case 'Portal Payment':
                await this.db.insert(instrumentTransferDetails).values({
                    instrumentId,
                    ...formData,
                } as any);
                break;
        }
    }
}
