import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { eq, and, sql } from 'drizzle-orm';
import { paymentRequests, paymentInstruments, instrumentDdDetails, instrumentFdrDetails, instrumentBgDetails, instrumentChequeDetails, instrumentTransferDetails, instrumentStatusHistory } from '@db/schemas/tendering/payment-requests.schema';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import { users } from '@/db/schemas/auth/users.schema';
import { userRoles } from '@/db/schemas/auth/user-roles.schema';
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

                    // Auto-create Cheque after DD/FDR creation
                    if ((payload.EMD.mode === 'DD' || payload.EMD.mode === 'FDR') && instrument) {
                        const chequeResult = await this.autoCreateChequeFromDdFdr(
                            tx,
                            request,
                            instrument,
                            userId
                        );
                        if (chequeResult) {
                            results.push({ request, instrument: chequeResult, isAutoCreatedCheque: true });
                        }
                    }
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
     * - Update tender status to 5 if tender_id exists
     */
    private async handleBackgroundOperations(
        results: Array<{ request: any; instrument: any; isAutoCreatedCheque?: boolean }>,
        tenderId: number,
        tender: any,
        userId: number | undefined,
        emdRequested: boolean,
        isNonTmsRequest: boolean
    ): Promise<void> {
        try {
            // Send email notifications for each instrument
            for (const { request, instrument, isAutoCreatedCheque } of results) {
                try {
                    const mode = instrument.instrumentType;
                    
                    // Skip email for DD/FDR (auto-created Cheque will send its own email)
                    if (!isAutoCreatedCheque && (mode === 'DD' || mode === 'FDR')) {
                        continue;
                    }
                    
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

            // Update tender status to 5 if tender_id exists (only for TMS requests)
            if (!isNonTmsRequest && tenderId > 0) {
                try {
                    this.logger.log(`Updating tender ${tenderId} status to 5`);
                    await this.tenderInfosService.updateStatus(tenderId, 5, userId || 0, 'Payment request created');
                    this.logger.log(`Successfully updated tender ${tenderId} status to 5`);
                } catch (error) {
                    this.logger.error(`Failed to update tender ${tenderId} status to 5:`, error);
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
            // Update request level fields if provided
            const purpose = existing.purpose;
            const requestData = (payload[purpose] || payload[purpose.toLowerCase()]);
            
            if (requestData?.details) {
                const amount = requestData.details.amountRequired || 
                              requestData.details.btAmount || 
                              requestData.details.portalAmount || 
                              requestData.details.ddAmount || 
                              requestData.details.fdrAmount || 
                              requestData.details.bgAmount || 
                              requestData.details.chequeAmount || 
                              requestData.details[`${purpose === 'EMD' ? 'emd' : purpose === 'Tender Fee' ? 'tf' : 'pf'}Amount`] || 
                              existing.amountRequired;
                
                await tx
                    .update(paymentRequests)
                    .set({
                        amountRequired: amount.toString(),
                        remarks: requestData.details.remarks || existing.remarks,
                    })
                    .where(eq(paymentRequests.id, requestId));
            }

            // Update each instrument
            for (const instrument of instruments) {
                const instrPurpose = instrument.purpose || purpose;
                const details = (payload[instrPurpose] || payload[instrPurpose.toLowerCase()] || requestData)?.details;
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
        this.logger.log(`Creating instrument with details: ${JSON.stringify(details)}`);
        const instrumentTypeMap: Record<string, string> = {
            'DD': 'DD',
            'FDR': 'FDR',
            'BG': 'BG',
            'CHEQUE': 'Cheque',
            'BANK_TRANSFER': 'Bank Transfer',
            'PORTAL': 'Portal Payment',
            'SURETY_BOND': 'Surety Bond'
        };

        const shorthand = mode === 'BANK_TRANSFER' ? 'bt' : mode === 'PORTAL' ? 'portal' : mode.toLowerCase();

        // Build structured courier address JSONB for DD/FDR
        const courierAddressJson = (mode === 'DD' || mode === 'FDR') ? {
            name: details[`${shorthand}CourierName`] || null,
            phone: details[`${shorthand}CourierPhone`] || null,
            line1: details[`${shorthand}CourierAddressLine1`] || null,
            line2: details[`${shorthand}CourierAddressLine2`] || null,
            city: details[`${shorthand}CourierCity`] || null,
            state: details[`${shorthand}CourierState`] || null,
            pincode: details[`${shorthand}CourierPincode`] || null,
        } : null;

        const [instrument] = await tx
            .insert(paymentInstruments)
            .values({
                requestId: requestId,
                instrumentType: instrumentTypeMap[mode] || mode,
                purpose: details[`${shorthand}Purpose`] || null,
                amount: amount.toString(),
                favouring: (details[`${shorthand}Favouring`] || details.btAccountName || details.portalName) || null,
                payableAt: (details[`${shorthand}PayableAt`] || details.bgAddress) || null,
                issueDate: (details[`${shorthand}Date`] || details.bgDate) || null,
                expiryDate: (details[`${shorthand}ExpiryDate`] || details.bgExpiryDate || details.fdrExpiryDate) || null,
                courierAddress: (details[`${shorthand}CourierAddress`] || details.bgCourierAddress || details.ddCourierAddress || details.fdrCourierAddress) || null,
                courierAddressJson,
                courierDeadline: (details[`${shorthand}CourierHours`] || details.bgCourierDays || details.ddCourierHours || details.fdrCourierHours) || null,
                isActive: true,
                createdBy: userId,
            })
            .returning()
            .execute();

        // Create type-specific details
        await this.createInstrumentDetails(tx, instrument.id, mode, details);

        // Create status history entry
        await this.createStatusHistoryEntry(tx, instrument.id, mode, details, userId);

        this.logger.log(`Instrument created successfully: ${JSON.stringify(instrument)}`);
        return instrument;
    }

    private async createInstrumentDetails(tx: any, instrumentId: number, mode: string, details: any) {
        this.logger.log(`Creating instrument details: ${JSON.stringify(details)}`);
        switch (mode) {
            case 'DD':
                await tx.insert(instrumentDdDetails).values({
                    instrumentId,
                    ddDate: details.ddDate || null,
                    ddPurpose: details.ddPurpose || null,
                    ddNeeds: details.ddDeliverBy || null,
                    ddRemarks: details.ddRemarks || null,
                    reqNo: details.reqNo || null,
                }).execute();
                break;

            case 'FDR':
                await tx.insert(instrumentFdrDetails).values({
                    instrumentId,
                    fdrDate: details.fdrDate || null,
                    fdrPurpose: details.fdrPurpose || null,
                    fdrExpiryDate: details.fdrExpiryDate || null,
                    fdrNeeds: details.fdrDeliverBy || null,
                    fdrRemark: details.fdrRemarks || null,
                }).execute();
                break;

            case 'BG':
                await tx.insert(instrumentBgDetails).values({
                    instrumentId,
                    bgDate: details.bgDate || null,
                    validityDate: details.bgExpiryDate || null,
                    claimExpiryDate: details.bgClaimPeriod || null,
                    beneficiaryName: details.bgFavouring || null,
                    beneficiaryAddress: details.bgAddress || null,
                    bankName: details.bgBank || null,
                    bgBankAcc: details.bgBankAccountNo || null,
                    bgBankIfsc: details.bgBankIfsc || null,
                    bgPurpose: details.bgPurpose || null,
                    bgNeeds: details.bgNeededIn || null,
                    bgClientUser: details.bgClientUserEmail || null,
                    bgClientCp: details.bgClientCpEmail || null,
                    bgClientFin: details.bgClientFinanceEmail || null,
                    stampCharge: details.bgStampValue || null,
                }).execute();
                break;

            case 'CHEQUE':
                await tx.insert(instrumentChequeDetails).values({
                    instrumentId,
                    chequeDate: details.chequeDate || null,
                    bankName: details.chequeAccount || null,
                    chequeReason: details.chequePurpose || null,
                    chequeNeeds: details.chequeNeededIn || null,
                }).execute();
                break;

            case 'BANK_TRANSFER':
                await tx.insert(instrumentTransferDetails).values({
                    instrumentId,
                    accountName: details.btAccountName || null,
                    accountNumber: details.btAccountNo || null,
                    ifsc: details.btIfsc || null,
                    paymentMethod: 'Bank Transfer'
                }).execute();
                break;

            case 'PORTAL':
                await tx.insert(instrumentTransferDetails).values({
                    instrumentId,
                    portalName: details.portalName || null,
                    isNetbanking: details.portalNetBanking || null,
                    isDebit: details.portalDebitCard || null,
                    paymentMethod: 'Portal Payment'
                }).execute();
                break;
        }
        this.logger.log(`Instrument details created successfully: ${mode} - Instrument ID: ${instrumentId}`);
    }

    /**
     * Auto-create Cheque entry from DD/FDR data
     * Maps DD/FDR fields to Cheque fields and creates a new Cheque instrument
     */
    private async autoCreateChequeFromDdFdr(
        tx: any,
        ddFdrRequest: any,
        ddFdrInstrument: any,
        userId?: number
    ) {
        this.logger.log(`Auto-creating Cheque from DD/FDR: ${ddFdrInstrument.id}`);

        const today = new Date().toISOString().split('T')[0];

        const [chequeInstrument] = await tx
            .insert(paymentInstruments)
            .values({
                requestId: ddFdrRequest.id,
                instrumentType: 'Cheque',
                purpose: ddFdrInstrument.purpose,
                amount: ddFdrInstrument.amount,
                favouring: ddFdrInstrument.favouring,
                payableAt: ddFdrInstrument.payableAt,
                issueDate: today,
                courierDeadline: ddFdrInstrument.courierDeadline,
                courierAddress: ddFdrInstrument.courierAddress,
                isActive: true,
                createdBy: userId,
            })
            .returning()
            .execute();

        await tx
            .insert(instrumentChequeDetails)
            .values({
                instrumentId: chequeInstrument.id,
                chequeDate: today,
                chequeReason: ddFdrInstrument.purpose,
                chequeNeeds: ddFdrInstrument.isActive ? 'DD/FDR' : null,
                linkedDdId: ddFdrInstrument.instrumentType === 'DD' ? ddFdrInstrument.id : null,
                linkedFdrId: ddFdrInstrument.instrumentType === 'FDR' ? ddFdrInstrument.id : null,
            })
            .execute();

        await tx
            .insert(instrumentTransferDetails)
            .values({
                instrumentId: chequeInstrument.id,
                accountName: 'AU_9589',
                accountNumber: 'AU_9589',
                paymentMethod: 'Default Account'
            })
            .execute();

        // Create status history entry for auto-created Cheque
        await this.createStatusHistoryEntry(tx, chequeInstrument.id, 'CHEQUE', ddFdrInstrument, userId);

        this.logger.log(`Auto-created Cheque: ${chequeInstrument.id} from DD/FDR: ${ddFdrInstrument.id}`);
        return chequeInstrument;
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
    
        const normalizedMode = mode.toUpperCase().replace(' ', '_');
        let shorthand = normalizedMode.toLowerCase();
        
        if (normalizedMode === 'BANK_TRANSFER' || normalizedMode === 'BT') {
            shorthand = 'bt';
        } else if (normalizedMode === 'PORTAL' || normalizedMode === 'PORTAL_PAYMENT') {
            shorthand = 'portal';
        }

        // Update main instrument
        await tx
            .update(paymentInstruments)
            .set({
                purpose: (details[`${shorthand}Purpose`] || details.btPurpose || details.portalPurpose || details.ddPurpose || details.fdrPurpose || details.bgPurpose || details.chequePurpose) || null,
                amount: (details[`${shorthand}Amount`] || details.amountRequired || details.btAmount || details.portalAmount || details.ddAmount || details.fdrAmount || details.bgAmount || details.chequeAmount)?.toString() || null,
                favouring: (details[`${shorthand}Favouring`] || details.btAccountName || details.portalName || details.bgFavouring || details.ddFavouring || details.fdrFavouring || details.chequeFavouring) || null,
                payableAt: (details[`${shorthand}PayableAt`] || details.bgAddress || details.ddPayableAt || details.fdrPayableAt || details.btPayableAt || details.portalPayableAt || details.chequePayableAt) || null,
                issueDate: (details[`${shorthand}Date`] || details.bgDate || details.ddDate || details.fdrDate || details.btDate || details.portalDate || details.chequeDate) || null,
                expiryDate: (details[`${shorthand}ExpiryDate`] || details.bgExpiryDate || details.fdrExpiryDate) || null,
                courierAddress: (details[`${shorthand}CourierAddress`] || details.bgCourierAddress || details.ddCourierAddress || details.fdrCourierAddress) || null,
                courierAddressJson: (normalizedMode === 'DD' || normalizedMode === 'FDR') ? {
                    name: details[`${shorthand}CourierName`] || null,
                    phone: details[`${shorthand}CourierPhone`] || null,
                    line1: details[`${shorthand}CourierAddressLine1`] || null,
                    line2: details[`${shorthand}CourierAddressLine2`] || null,
                    city: details[`${shorthand}CourierCity`] || null,
                    state: details[`${shorthand}CourierState`] || null,
                    pincode: details[`${shorthand}CourierPincode`] || null,
                } : null,
                courierDeadline: (details[`${shorthand}CourierHours`] || details.bgCourierDays || details.ddCourierHours || details.fdrCourierHours) || null,
            })
            .where(eq(paymentInstruments.id, instrumentId));

        // Update type-specific details
        await this.updateDetailTable(tx, instrumentId, mode, details);
    }

    private async updateDetailTable(
        tx: any,
        instrumentId: number,
        mode: string,
        details: any
    ) {
        this.logger.log(`Updating instrument details table: ${mode} - Instrument ID: ${instrumentId}`);
        const normalizedMode = mode.toUpperCase().replace(' ', '_');

        switch (normalizedMode) {
            case 'DD':
                await tx.update(instrumentDdDetails).set({
                    ddNo: details.ddNo || null,
                    ddDate: details.ddDate || null,
                    ddPurpose: details.ddPurpose || null,
                    ddNeeds: details.ddDeliverBy || null,
                    ddRemarks: details.ddRemarks || null,
                    reqNo: details.reqNo || null,
                }).where(eq(instrumentDdDetails.instrumentId, instrumentId));
                break;

            case 'FDR':
                await tx.update(instrumentFdrDetails).set({
                    fdrNo: details.fdrNo || null,
                    fdrDate: details.fdrDate || null,
                    fdrPurpose: details.fdrPurpose || null,
                    fdrExpiryDate: details.fdrExpiryDate || null,
                    fdrNeeds: details.fdrDeliverBy || null,
                    fdrRemark: details.fdrRemarks || null,
                    fdrSource: details.fdrSource || null,
                }).where(eq(instrumentFdrDetails.instrumentId, instrumentId));
                break;

            case 'BG':
                await tx.update(instrumentBgDetails).set({
                    bgNo: details.bgNo || null,
                    bgDate: details.bgDate || null,
                    validityDate: details.bgExpiryDate || null,
                    claimExpiryDate: details.bgClaimPeriod || null,
                    beneficiaryName: details.bgFavouring || null,
                    beneficiaryAddress: details.bgAddress || null,
                    bankName: details.bgBank || null,
                    bgPurpose: details.bgPurpose || null,
                    bgNeeds: details.bgNeededIn || null,
                    bgClientUser: details.bgClientUserEmail || null,
                    bgClientCp: details.bgClientCpEmail || null,
                    bgClientFin: details.bgClientFinanceEmail || null,
                    stampCharge: details.bgStampValue || null,
                }).where(eq(instrumentBgDetails.instrumentId, instrumentId));
                break;

            case 'CHEQUE':
                await tx.update(instrumentChequeDetails).set({
                    chequeNo: details.chequeNo || null,
                    chequeDate: details.chequeDate || null,
                    bankName: details.chequeAccount || null,
                    chequeReason: details.chequePurpose || null,
                    chequeNeeds: details.chequeNeededIn || null,
                }).where(eq(instrumentChequeDetails.instrumentId, instrumentId));
                break;

            case 'BANK_TRANSFER':
            case 'BT':
                await tx.update(instrumentTransferDetails).set({
                    accountName: details.btAccountName || null,
                    accountNumber: details.btAccountNo || null,
                    ifsc: details.btIfsc || null,
                    reason: details.btPurpose || null,
                }).where(eq(instrumentTransferDetails.instrumentId, instrumentId));
                break;

            case 'PORTAL':
            case 'PORTAL_PAYMENT':
                await tx.update(instrumentTransferDetails).set({
                    portalName: details.portalName || null,
                    isNetbanking: details.portalNetBanking || null,
                    isDebit: details.portalDebitCard || null,
                    reason: details.portalPurpose || null,
                }).where(eq(instrumentTransferDetails.instrumentId, instrumentId));
                break;
        }
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

    private getInitialStatus(mode: string): string {
        const statusMap: Record<string, string> = {
            'DD': 'DD_ACCOUNTS_FORM_PENDING',
            'FDR': 'FDR_ACCOUNTS_FORM_PENDING',
            'BG': 'BG_ACCOUNTS_FORM_PENDING',
            'CHEQUE': 'CHEQUE_ACCOUNTS_FORM_PENDING',
            'BANK_TRANSFER': 'Bank Transfer_ACCOUNTS_FORM_PENDING',
            'PORTAL': 'Portal Payment_ACCOUNTS_FORM_PENDING',
        };
        return statusMap[mode] || 'ACCOUNTS_FORM_PENDING';
    }

    private async createStatusHistoryEntry(
        tx: any,
        instrumentId: number,
        mode: string,
        formData: any,
        userId?: number
    ) {
        const toStatus = this.getInitialStatus(mode);
        
        let userName = '';
        let userRoleId = 0;
        
        if (userId) {
            const [user] = await tx
                .select({ name: users.name })
                .from(users)
                .where(eq(users.id, userId))
                .limit(1);
            
            if (user) {
                userName = user.name;
                const [role] = await tx
                    .select({ roleId: userRoles.roleId })
                    .from(userRoles)
                    .where(eq(userRoles.userId, userId))
                    .limit(1);
                userRoleId = role?.roleId || 0;
            }
        }

        await tx.insert(instrumentStatusHistory).values({
            instrumentId,
            fromStatus: '',
            toStatus,
            fromAction: 0,
            toAction: 0,
            fromStage: 0,
            toStage: 0,
            formData,
            changedBy: userId || 0,
            changedByName: userName,
            changedByRole: String(userRoleId),
            ipAddress: '',
            userAgent: '',
        }).execute();
        
        this.logger.log(`Status history created for instrument ${instrumentId} with status ${toStatus}`);
    }
}