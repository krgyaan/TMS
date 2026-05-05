import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { eq, and, sql } from 'drizzle-orm';
import { paymentRequests, paymentInstruments, instrumentDdDetails, instrumentFdrDetails, instrumentBgDetails, instrumentChequeDetails, instrumentTransferDetails } from '@db/schemas/tendering/payment-requests.schema';;
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import type { CreatePaymentRequestDto, UpdatePaymentRequestDto, UpdateStatusDto, PaymentPurpose } from '../dto/payment-requests.dto';
import { extractAmountFromDetails } from './payment-requests.shared';
import { tenderInformation } from '@/db/schemas';
import { PaymentRequestsNotificationService } from './payment-requests-notification.service';
import { TimersService } from '@/modules/timers/timers.service';

@Injectable()
export class PaymentRequestsCommandService {
    private readonly logger = new Logger(PaymentRequestsCommandService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
        @Inject(forwardRef(() => PaymentRequestsNotificationService))
        private readonly notificationService: PaymentRequestsNotificationService,
        private readonly timersService: TimersService,
    ) {}

    // ============================================================================
    // Create Methods
    // ============================================================================

    async create(
        tenderId: number,
        payload: CreatePaymentRequestDto,
        userId?: number
    ) {
        this.logger.log(`Creating payment request for tender: ${JSON.stringify(payload)}`);
        const isNonTmsRequest = payload.type === 'Old Entries' || payload.type === 'Other Than Tender';

        let tender: any = null;
        let currentTender: any = null;
        let infoSheet: any = null;

        // Fetch tender data for TMS requests
        if (!isNonTmsRequest && tenderId > 0) {
            tender = await this.tenderInfosService.getTenderForPayment(tenderId);
            currentTender = await this.tenderInfosService.findById(tenderId);

            [infoSheet] = await this.db
                .select()
                .from(tenderInformation)
                .where(eq(tenderInformation.tenderId, tenderId))
                .limit(1);
        }

        // For non-TMS requests, create minimal tender from payload
        if (isNonTmsRequest) {
            tender = {
                tenderNo: payload.tenderNo || 'NA',
                tenderName: payload.tenderName || null,
                dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
                emd: null,
                tenderFees: null,
            };
        }

        const createdRequests: any[] = [];
        const results: any[] = [];
        let emdRequested = false;

        await this.db.transaction(async (tx) => {
            // Create EMD request
            if (payload.EMD?.mode && payload.EMD?.details) {
                emdRequested = true;
                const emdAmount = isNonTmsRequest
                    ? extractAmountFromDetails(payload.EMD.mode, payload.EMD.details)
                    : Number(tender?.emd) || 0;
                const emdRemarks = isNonTmsRequest
                    ? `${payload.EMD.mode} Details`
                    : `${payload.EMD.mode} Details`;

                if (emdAmount > 0) {
                    const request = await this.createPaymentRequest(
                        tx,
                        tenderId,
                        'EMD',
                        emdAmount,
                        tender,
                        userId,
                        payload.type,
                        payload.tenderNo,
                        payload.tenderName,
                        payload.dueDate,
                        emdRemarks
                    );
                    createdRequests.push(request);

                    const instrument = await this.createInstrumentWithDetails(
                        tx,
                        request.id,
                        payload.EMD.mode,
                        payload.EMD.details,
                        emdAmount,
                        userId
                    );
                    results.push({ request, instrument });
                }
            }

            // Create Tender Fee request
            if (payload.TENDER_FEES?.mode && payload.TENDER_FEES?.details) {
                const tfAmount = isNonTmsRequest
                    ? extractAmountFromDetails(payload.TENDER_FEES.mode, payload.TENDER_FEES.details)
                    : Number(tender?.tenderFees) || 0;
                const tfRemarks = isNonTmsRequest
                    ? `${payload.TENDER_FEES.mode} Details`
                    : `${payload.TENDER_FEES.mode} Details`;

                if (tfAmount > 0) {
                    const request = await this.createPaymentRequest(
                        tx,
                        tenderId,
                        'Tender Fee',
                        tfAmount,
                        tender,
                        userId,
                        payload.type,
                        payload.tenderNo,
                        payload.tenderName,
                        payload.dueDate,
                        tfRemarks
                    );
                    createdRequests.push(request);

                    const instrument = await this.createInstrumentWithDetails(
                        tx,
                        request.id,
                        payload.TENDER_FEES.mode,
                        payload.TENDER_FEES.details,
                        tfAmount,
                        userId
                    );
                    results.push({ request, instrument });
                }
            }

            // Create Processing Fee request
            if (payload.PROCESSING_FEES?.mode && payload.PROCESSING_FEES?.details) {
                const pfAmount = isNonTmsRequest
                    ? extractAmountFromDetails(payload.PROCESSING_FEES.mode, payload.PROCESSING_FEES.details)
                    : 0;
                const pfRemarks = isNonTmsRequest
                    ? `${payload.PROCESSING_FEES.mode} Details`
                    : `${payload.PROCESSING_FEES.mode} Details`;

                if (pfAmount > 0) {
                    const request = await this.createPaymentRequest(
                        tx,
                        tenderId,
                        'Processing Fee',
                        pfAmount,
                        tender,
                        userId,
                        payload.type,
                        payload.tenderNo,
                        payload.tenderName,
                        payload.dueDate,
                        pfRemarks
                    );
                    createdRequests.push(request);

                    const instrument = await this.createInstrumentWithDetails(
                        tx,
                        request.id,
                        payload.PROCESSING_FEES.mode,
                        payload.PROCESSING_FEES.details,
                        pfAmount,
                        userId
                    );
                    results.push({ request, instrument });
                }
            }
        });

        // Background operations
        this.handleBackgroundOperations(results, tenderId, tender, userId, emdRequested, isNonTmsRequest)
            .catch((error) => {
                this.logger.error('Background operations failed:', error);
            });

        this.logger.log(`Payment request created successfully: ${JSON.stringify(results)}`);
        return results;
    }

    /**
     * Handle background operations asynchronously after HTTP response
     * - Send email notifications for Bank Transfer and Portal Payment
     * - Stop timer if EMD was requested
     */
    private async handleBackgroundOperations(
        results: Array<{ request: any; instrument: any }>,
        tenderId: number,
        tender: any,
        userId: number | undefined,
        emdRequested: boolean,
        isNonTmsRequest: boolean
    ): Promise<void> {
        try {
            // Send email notifications for each instrument
            if (tender) {
                for (const { request, instrument } of results) {
                    try {
                        const mode = instrument.instrumentType;
                        await this.notificationService.sendPaymentInstrumentEmail(
                            instrument.id,
                            mode,
                            request.purpose,
                            tenderId,
                            tender,
                            userId || 0
                        );
                    } catch (error) {
                        this.logger.error(
                            `Failed to send email for instrument ${instrument?.id} (${instrument?.instrumentType}): ${error instanceof Error ? error.message : String(error)}`
                        );
                    }
                }
            }

            // Stop timer if EMD was requested (only for TMS requests)
            if (emdRequested && userId && !isNonTmsRequest && tenderId > 0) {
                try {
                    this.logger.log(`Stopping timer for tender ${tenderId} after EMD requested`);
                    await this.timersService.stopTimer({
                        entityType: 'TENDER',
                        entityId: tenderId,
                        stage: 'emd_request',
                        userId: userId,
                        reason: 'EMD requested'
                    });
                    this.logger.log(`Successfully stopped emd_request timer for tender ${tenderId}`);
                } catch (error) {
                    this.logger.error(`Failed to stop timer for tender ${tenderId} after EMD requested:`, error);
                }
            }
        } catch (error) {
            this.logger.error('Unexpected error in background operations:', error);
            throw error;
        }
    }

    // ============================================================================
    // Update Methods
    // ============================================================================

    async update(requestId: number, payload: UpdatePaymentRequestDto) {
        this.logger.log(`Updating payment request: ${requestId}`);
        const [existing] = await this.db
            .select()
            .from(paymentRequests)
            .where(eq(paymentRequests.id, requestId))
            .limit(1);

        if (!existing) {
            throw new NotFoundException(`Payment request ${requestId} not found`);
        }

        const instruments = await this.db
            .select()
            .from(paymentInstruments)
            .where(and(
                eq(paymentInstruments.requestId, requestId),
                eq(paymentInstruments.isActive, true)
            ));

        await this.db.transaction(async (tx) => {
            // Update each instrument
            for (const instrument of instruments) {
                const details = payload[instrument.purpose?.toLowerCase() as string]?.details;
                if (details) {
                    await this.updateInstrumentWithDetails(
                        tx,
                        instrument.id,
                        instrument.instrumentType as string,
                        details
                    );
                }
            }
        });

        this.logger.log(`Payment request updated successfully: ${requestId}`);
        return this.findById(requestId);
    }

    async updateStatus(requestId: number, payload: UpdateStatusDto) {
        this.logger.log(`Updating payment request status: ${requestId}`);
        const [existing] = await this.db
            .select()
            .from(paymentRequests)
            .where(eq(paymentRequests.id, requestId))
            .limit(1);

        if (!existing) {
            throw new NotFoundException(`Payment request ${requestId} not found`);
        }

        await this.db
            .update(paymentRequests)
            .set({
                status: payload.status,
                remarks: payload.remarks || existing.remarks,
            })
            .where(eq(paymentRequests.id, requestId));

        this.logger.log(`Payment request status updated successfully: ${requestId}`);
        return this.findById(requestId);
    }

    // ============================================================================
    // Private Helpers - Payment Request
    // ============================================================================

    private async createPaymentRequest(
        tx: any,
        tenderId: number,
        purpose: PaymentPurpose,
        amount: number,
        tender: any,
        userId?: number,
        type?: string,
        tenderNo?: string,
        tenderName?: string,
        dueDate?: string,
        remarks?: string
    ) {
        this.logger.log(`Creating payment request: ${purpose} - Amount: ${amount}`);
        const effectiveDueDate = tender?.dueDate 
            ? new Date(tender.dueDate) 
            : dueDate 
                ? new Date(dueDate) 
                : null;

        const [request] = await tx
            .insert(paymentRequests)
            .values({
                tenderId: tenderId,
                type: type || 'TMS',
                tenderNo: tenderNo || tender?.tenderNo || 'NA',
                projectName: tenderName || tender?.tenderName,
                dueDate: effectiveDueDate,
                requestedBy: userId,
                purpose: purpose,
                amountRequired: amount.toString(),
                status: 'Pending',
                remarks: remarks || 'Payment Request', 
            })
            .returning()
            .onConflictDoNothing()
            .execute();

        this.logger.log(`Payment request created successfully: ${JSON.stringify(request)}`);
        return request;
    }

    private async createInstrumentWithDetails(
        tx: any,
        requestId: number,
        mode: string,
        details: any,
        amount: number,
        userId?: number
    ) {
        this.logger.log(`Creating instrument with details: ${mode} - Amount: ${amount}`);
        const instrumentTypeMap: Record<string, string> = {
            'DD': 'DD',
            'FDR': 'FDR',
            'BG': 'BG',
            'CHEQUE': 'Cheque',
            'BANK_TRANSFER': 'Bank Transfer',
            'PORTAL': 'Portal Payment',
        };

        const [instrument] = await tx
            .insert(paymentInstruments)
            .values({
                requestId: requestId,
                instrumentType: instrumentTypeMap[mode] || mode,
                purpose: details[`${mode.toLowerCase()}Purpose`] || null,
                amount: amount.toString(),
                favouring: details[`${mode.toLowerCase()}Favouring`] || null,
                payableAt: details[`${mode.toLowerCase()}PayableAt`] || null,
                issueDate: details[`${mode.toLowerCase()}Date`] || null,
                isActive: true,
                createdBy: userId,
            })
            .returning()
            .execute();

        // Create type-specific details
        await this.createInstrumentDetails(tx, instrument.id, mode, details);

        this.logger.log(`Instrument created successfully: ${JSON.stringify(instrument)}`);
        return instrument;
    }

    private async createInstrumentDetails(tx: any, instrumentId: number, mode: string, details: any) {
        this.logger.log(`Creating instrument details: ${mode} - Instrument ID: ${instrumentId}`);
        switch (mode) {
            case 'DD':
                await tx.insert(instrumentDdDetails).values({
                    instrumentId,
                    ddFavour: details.ddFavouring || null,
                    ddPayableAt: details.ddPayableAt || null,
                    ddDeliverBy: details.ddDeliverBy || null,
                    ddPurpose: details.ddPurpose || null,
                    ddCourierAddress: details.ddCourierAddress || null,
                    ddCourierHours: details.ddCourierHours || null,
                    ddDate: details.ddDate || null,
                    ddRemarks: details.ddRemarks || null,
                }).execute();
                break;

            case 'FDR':
                await tx.insert(instrumentFdrDetails).values({
                    instrumentId,
                    fdrFavour: details.fdrFavouring || null,
                    fdrExpiryDate: details.fdrExpiryDate || null,
                    fdrDeliverBy: details.fdrDeliverBy || null,
                    fdrPurpose: details.fdrPurpose || null,
                    fdrCourierAddress: details.fdrCourierAddress || null,
                    fdrCourierHours: details.fdrCourierHours || null,
                    fdrDate: details.fdrDate || null,
                }).execute();
                break;

            case 'BG':
                await tx.insert(instrumentBgDetails).values({
                    instrumentId,
                    bgNeededIn: details.bgNeededIn || null,
                    bgPurpose: details.bgPurpose || null,
                    bgFavouring: details.bgFavouring || null,
                    bgAddress: details.bgAddress || null,
                    bgExpiryDate: details.bgExpiryDate || null,
                    bgClaimPeriod: details.bgClaimPeriod || null,
                    bgStampValue: details.bgStampValue || null,
                    bgBank: details.bgBank || null,
                    bgBankAccountName: details.bgBankAccountName || null,
                    bgBankAccountNo: details.bgBankAccountNo || null,
                    bgBankIfsc: details.bgBankIfsc || null,
                    bgClientUserEmail: details.bgClientUserEmail || null,
                    bgClientCpEmail: details.bgClientCpEmail || null,
                    bgClientFinanceEmail: details.bgClientFinanceEmail || null,
                    bgCourierAddress: details.bgCourierAddress || null,
                    bgCourierDays: details.bgCourierDays || null,
                }).execute();
                break;

            case 'CHEQUE':
                await tx.insert(instrumentChequeDetails).values({
                    instrumentId,
                    chequeFavour: details.chequeFavouring || null,
                    chequeDate: details.chequeDate || null,
                    chequeNeededIn: details.chequeNeededIn || null,
                    chequePurpose: details.chequePurpose || null,
                    chequeAccount: details.chequeAccount || null,
                    reason: details.chequePurpose || null,
                }).execute();
                break;

            case 'BANK_TRANSFER':
                await tx.insert(instrumentTransferDetails).values({
                    instrumentId,
                    btPurpose: details.btPurpose || null,
                    btAccountName: details.btAccountName || null,
                    btAccountNo: details.btAccountNo || null,
                    btIfsc: details.btIfsc || null,
                    reason: details.btPurpose || null,
                }).execute();
                break;

            case 'PORTAL':
                await tx.insert(instrumentTransferDetails).values({
                    instrumentId,
                    portalPurpose: details.portalPurpose || null,
                    portalName: details.portalName || null,
                    portalNetBanking: details.portalNetBanking || null,
                    portalDebitCard: details.portalDebitCard || null,
                    reason: details.portalPurpose || null,
                }).execute();
                break;
        }
        this.logger.log(`Instrument details created successfully: ${mode} - Instrument ID: ${instrumentId}`);
    }

    private async getDetailIdForInstrument(instrumentId: number, mode: string): Promise<number> {
        this.logger.log(`Getting instrument details: ${mode} - Instrument ID: ${instrumentId}`);
        const tableMap: Record<string, any> = {
            DD: instrumentDdDetails,
            FDR: instrumentFdrDetails,
            BG: instrumentBgDetails,
            CHEQUE: instrumentChequeDetails,
            BANK_TRANSFER: instrumentTransferDetails,
            PORTAL: instrumentTransferDetails,
        };

        const table = tableMap[mode];
        if (!table) return instrumentId;

        const [detail] = await this.db
            .select({ id: sql<number>`${table.id}` })
            .from(table)
            .where(eq(table.instrumentId, instrumentId))
            .limit(1);

        this.logger.log(`Instrument details fetched successfully: ${mode} - Instrument ID: ${instrumentId}`);
        return detail?.id || instrumentId;
    }

    // ============================================================================
    // Update Helpers
    // ============================================================================

    private async updateInstrumentWithDetails(
        tx: any,
        instrumentId: number,
        mode: string,
        details: any
    ) {
        this.logger.log(`Updating instrument with details: ${mode} - Instrument ID: ${instrumentId}`);
        // Update main instrument
        await tx
            .update(paymentInstruments)
            .set({
                favouring: details[`${mode.toLowerCase()}Favouring`] || null,
                amount: details[`${mode.toLowerCase()}Amount`]?.toString() || null,
            })
            .where(eq(paymentInstruments.id, instrumentId));

        // Update type-specific details
        this.logger.log(`Updating instrument details: ${mode} - Instrument ID: ${instrumentId}`);
        await this.updateDetailTable(tx, instrumentId, mode, details);
    }

    private async updateDetailTable(
        tx: any,
        instrumentId: number,
        mode: string,
        details: any
    ) {
        this.logger.log(`Updating instrument details: ${mode} - Instrument ID: ${instrumentId}`);
        const detailsMap: Record<string, any> = {
            DD: { updateFn: 'update', table: instrumentDdDetails, fields: { ddFavour: details.ddFavouring } },
            FDR: { updateFn: 'update', table: instrumentFdrDetails, fields: { fdrFavour: details.fdrFavouring } },
            BG: { updateFn: 'update', table: instrumentBgDetails, fields: { bgFavouring: details.bgFavouring } },
            CHEQUE: { updateFn: 'update', table: instrumentChequeDetails, fields: { chequeFavour: details.chequeFavouring } },
            BT: { updateFn: 'update', table: instrumentTransferDetails, fields: { btAccountName: details.btAccountName } },
            PORTAL: { updateFn: 'update', table: instrumentTransferDetails, fields: { portalName: details.portalName } },
        };

        const config = detailsMap[mode];
        if (!config) return;

        const { table, fields } = config;
        const [existing] = await tx
            .select()
            .from(table)
            .where(eq(table.instrumentId, instrumentId))
            .limit(1);

        if (existing) {
            await tx.update(table).set(fields).where(eq(table.instrumentId, instrumentId));
        }
        this.logger.log(`Instrument details updated successfully: ${mode} - Instrument ID: ${instrumentId}`);
    }

    private async getInstrumentDetails(instrumentId: number) {
        this.logger.log(`Getting instrument details: ${instrumentId}`);
        const [instrument] = await this.db
            .select()
            .from(paymentInstruments)
            .where(eq(paymentInstruments.id, instrumentId))
            .limit(1);

        if (!instrument) return null;

        return {
            ...instrument,
            details: await this.getInstrumentSpecificDetails(instrumentId, instrument.instrumentType as string),
        };
    }

    private async getInstrumentSpecificDetails(instrumentId: number, instrumentType: string) {
        this.logger.log(`Getting instrument specific details: ${instrumentId} - ${instrumentType}`);
        const tableMap: Record<string, any> = {
            DD: instrumentDdDetails,
            FDR: instrumentFdrDetails,
            BG: instrumentBgDetails,
            CHEQUE: instrumentChequeDetails,
            BT: instrumentTransferDetails,
            PORTAL: instrumentTransferDetails,
        };

        const table = tableMap[instrumentType];
        if (!table) return null;

        const [detail] = await this.db
            .select()
            .from(table)
            .where(eq(table.instrumentId, instrumentId))
            .limit(1);

        return detail || null;
    }

    private async findById(requestId: number) {
        this.logger.log(`Finding payment request by ID: ${requestId}`);
        const [request] = await this.db
            .select()
            .from(paymentRequests)
            .where(eq(paymentRequests.id, requestId))
            .limit(1);

        if (!request) return null;

        const instruments = await this.db
            .select()
            .from(paymentInstruments)
            .where(and(
                eq(paymentInstruments.requestId, requestId),
                eq(paymentInstruments.isActive, true)
            ));

        return {
            ...request,
            instruments,
        };
    }
}