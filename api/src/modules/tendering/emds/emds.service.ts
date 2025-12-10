import {
    Inject,
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { eq, and, inArray, or, lte, asc } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import {
    paymentRequests,
    paymentInstruments,
    instrumentDdDetails,
    instrumentFdrDetails,
    instrumentBgDetails,
    instrumentTransferDetails,
    type PaymentRequest,
    type PaymentInstrument,
} from '@db/schemas/tendering/emds.schema';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { tenderInformation } from '@db/schemas/tendering/tender-info-sheet.schema';
import { users } from '@db/schemas/auth/users.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import { InstrumentStatusService } from '@/modules/tendering/emds/services/instrument-status.service';
import { InstrumentStatusHistoryService } from '@/modules/tendering/emds/services/instrument-status-history.service';
import type {
    CreatePaymentRequestDto,
    UpdatePaymentRequestDto,
    UpdateStatusDto,
    DashboardRow,
    DashboardResponse,
    DashboardCounts,
    PaymentPurpose,
    InstrumentType,
} from '@/modules/tendering/emds/dto/emds.dto';
import {
    DD_STATUSES,
    FDR_STATUSES,
    BG_STATUSES,
    CHEQUE_STATUSES,
    BT_STATUSES,
    PORTAL_STATUSES,
} from '@/modules/tendering/emds/constants/emd-statuses';

// ============================================================================
// Helpers
// ============================================================================

const mapInstrumentType = (
    mode: string
): InstrumentType => {
    const mapping: Record<string, InstrumentType> = {
        DD: 'DD',
        FDR: 'FDR',
        BG: 'BG',
        CHEQUE: 'Cheque',
        BANK_TRANSFER: 'Bank Transfer',
        PORTAL: 'Portal Payment',
    };
    return mapping[mode] || 'DD';
};

const getInitialInstrumentStatus = (instrumentType: InstrumentType): string => {
    switch (instrumentType) {
        case 'DD':
            return DD_STATUSES.ACCOUNTS_FORM_PENDING;
        case 'FDR':
            return FDR_STATUSES.ACCOUNTS_FORM_PENDING;
        case 'BG':
            return BG_STATUSES.BANK_REQUEST_PENDING;
        case 'Cheque':
            return CHEQUE_STATUSES.ACCOUNTS_FORM_PENDING;
        case 'Bank Transfer':
            return BT_STATUSES.ACCOUNTS_FORM_PENDING;
        case 'Portal Payment':
            return PORTAL_STATUSES.ACCOUNTS_FORM_PENDING;
        default:
            return 'PENDING';
    }
};

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class EmdsService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
        private readonly instrumentStatusService: InstrumentStatusService,
        private readonly historyService: InstrumentStatusHistoryService,
    ) { }

    // ========================================================================
    // Dashboard Methods
    // ========================================================================

    /**
     * Get dashboard data with counts for all tabs
     */
    async getDashboardData(
        tab: string,
        userId?: number
    ): Promise<DashboardResponse> {
        const allData = await this.getAllDashboardItems(userId);
        const counts = this.calculateCounts(allData);

        let filteredData: DashboardRow[];
        switch (tab) {
            case 'pending':
                filteredData = allData.filter(
                    (r) => r.status === 'Pending' || r.status === 'Not Created'
                );
                break;
            case 'sent':
                filteredData = allData.filter(
                    (r) => r.status === 'Sent' || r.status === 'Requested'
                );
                break;
            case 'approved':
                filteredData = allData.filter((r) => r.status === 'Approved');
                break;
            case 'rejected':
                filteredData = allData.filter((r) => r.status === 'Rejected');
                break;
            case 'returned':
                filteredData = allData.filter((r) => r.status === 'Returned');
                break;
            default:
                filteredData = allData;
        }

        return { data: filteredData, counts };
    }

    /**
     * Get only counts for tab badges
     */
    async getDashboardCounts(userId?: number): Promise<DashboardCounts> {
        const allData = await this.getAllDashboardItems(userId);
        return this.calculateCounts(allData);
    }

    /**
     * Calculate counts for each status
     */
    private calculateCounts(data: DashboardRow[]): DashboardCounts {
        const counts: DashboardCounts = {
            pending: 0,
            sent: 0,
            approved: 0,
            rejected: 0,
            returned: 0,
            total: data.length,
        };

        for (const row of data) {
            if (row.status === 'Pending' || row.status === 'Not Created') {
                counts.pending++;
            } else if (row.status === 'Sent' || row.status === 'Requested') {
                counts.sent++;
            } else if (row.status === 'Approved') {
                counts.approved++;
            } else if (row.status === 'Rejected') {
                counts.rejected++;
            } else if (row.status === 'Returned') {
                counts.returned++;
            }
        }

        return counts;
    }

    /**
     * Get all dashboard items (existing requests + missing payments)
     */
    private async getAllDashboardItems(userId?: number): Promise<DashboardRow[]> {
        const [existingRequests, missingPayments] = await Promise.all([
            this.getExistingPaymentRequests(userId),
            this.getMissingPaymentRequests(userId),
        ]);

        // Sort by due date (urgent first), then by created date
        const allItems = [...existingRequests, ...missingPayments];
        allItems.sort((a, b) => {
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });

        return allItems;
    }

    /**
     * Get existing payment requests for the user
     */
    private async getExistingPaymentRequests(
        userId?: number
    ): Promise<DashboardRow[]> {
        const userCondition = userId
            ? or(
                eq(tenderInfos.teamMember, userId),
                eq(paymentRequests.requestedBy, userId.toString())
            )
            : undefined;

        const results = await this.db
            .select({
                id: paymentRequests.id,
                purpose: paymentRequests.purpose,
                amountRequired: paymentRequests.amountRequired,
                status: paymentRequests.status,
                createdAt: paymentRequests.createdAt,
                requestedBy: paymentRequests.requestedBy,
                tenderId: paymentRequests.tenderId,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                dueDate: tenderInfos.dueDate,
                teamMemberId: tenderInfos.teamMember,
                teamMemberName: users.name,
            })
            .from(paymentRequests)
            .innerJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .where(
                and(
                    TenderInfosService.getActiveCondition(),
                    userCondition
                )
            )
            .orderBy(paymentRequests.createdAt);

        // Get instruments for each request (only active ones)
        const requestIds = results.map((r) => r.id);

        const instrumentsMap = new Map<number, { type: string; status: string }>();

        if (requestIds.length > 0) {
            const instruments = await this.db
                .select({
                    requestId: paymentInstruments.requestId,
                    instrumentType: paymentInstruments.instrumentType,
                    status: paymentInstruments.status,
                })
                .from(paymentInstruments)
                .where(
                    and(
                        inArray(paymentInstruments.requestId, requestIds),
                        eq(paymentInstruments.isActive, true)
                    )
                );

            for (const inst of instruments) {
                if (!instrumentsMap.has(inst.requestId)) {
                    instrumentsMap.set(inst.requestId, {
                        type: inst.instrumentType,
                        status: inst.status,
                    });
                }
            }
        }

        return results.map((r): DashboardRow => {
            const instrument = instrumentsMap.get(r.id);

            // Derive dashboard status from instrument status
            const dashboardStatus = this.deriveDisplayStatus(
                r.status,
                instrument?.status
            );

            return {
                id: r.id,
                type: 'request',
                purpose: r.purpose as PaymentPurpose,
                amountRequired: r.amountRequired,
                status: dashboardStatus,
                instrumentType: (instrument?.type as InstrumentType) || null,
                instrumentStatus: instrument?.status || null,
                createdAt: r.createdAt,
                tenderId: r.tenderId,
                tenderNo: r.tenderNo || '',
                tenderName: r.tenderName || '',
                dueDate: r.dueDate,
                teamMemberId: r.teamMemberId,
                teamMemberName: r.teamMemberName,
                requestedBy: r.requestedBy,
            };
        });
    }

    /**
     * Derive display status for dashboard from instrument status
     */
    private deriveDisplayStatus(
        requestStatus: string | null,
        instrumentStatus: string | null | undefined
    ): string {
        if (!instrumentStatus) {
            return requestStatus || 'Pending';
        }

        // Map detailed instrument status to dashboard display status
        const status = instrumentStatus.toUpperCase();

        if (status.includes('REJECTED')) return 'Rejected';
        if (status.includes('RETURNED') || status.includes('RECEIVED')) return 'Returned';
        if (status.includes('APPROVED') || status.includes('ACCEPTED')) return 'Approved';
        if (status.includes('COMPLETED') || status.includes('CONFIRMED')) return 'Approved';
        if (status.includes('SUBMITTED') || status.includes('INITIATED') || status.includes('REQUESTED')) return 'Sent';
        if (status.includes('PENDING')) return 'Pending';

        return requestStatus || 'Pending';
    }

    /**
     * Get tenders that need payment requests but don't have them
     */
    private async getMissingPaymentRequests(
        userId?: number
    ): Promise<DashboardRow[]> {
        const userCondition = userId
            ? eq(tenderInfos.teamMember, userId)
            : undefined;

        const tenders = await this.db
            .select({
                tenderId: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                dueDate: tenderInfos.dueDate,
                teamMemberId: tenderInfos.teamMember,
                teamMemberName: users.name,
                emd: tenderInfos.emd,
                tenderFees: tenderInfos.tenderFees,
                processingFee: tenderInformation.processingFeeAmount,
            })
            .from(tenderInfos)
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(
                tenderInformation,
                eq(tenderInformation.tenderId, tenderInfos.id)
            )
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .where(
                and(
                    TenderInfosService.getActiveCondition(),
                    TenderInfosService.getApprovedCondition(),
                    TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']),
                    userCondition
                )
            )
            .orderBy(asc(tenderInfos.dueDate));

        if (tenders.length === 0) {
            return [];
        }

        const tenderIds = tenders.map((t) => t.tenderId);

        const existingRequests = await this.db
            .select({
                tenderId: paymentRequests.tenderId,
                purpose: paymentRequests.purpose,
            })
            .from(paymentRequests)
            .where(inArray(paymentRequests.tenderId, tenderIds));

        const requestsByTender = new Map<number, Set<string>>();
        for (const req of existingRequests) {
            if (!requestsByTender.has(req.tenderId)) {
                requestsByTender.set(req.tenderId, new Set());
            }
            requestsByTender.get(req.tenderId)!.add(req.purpose || '');
        }

        const missingPayments: DashboardRow[] = [];

        for (const tender of tenders) {
            const existingPurposes =
                requestsByTender.get(tender.tenderId) || new Set();

            // Check EMD
            const emdAmount = Number(tender.emd) || 0;
            if (emdAmount > 0 && !existingPurposes.has('EMD')) {
                missingPayments.push({
                    id: null,
                    type: 'missing',
                    purpose: 'EMD',
                    amountRequired: emdAmount.toFixed(2),
                    status: 'Not Created',
                    instrumentType: null,
                    instrumentStatus: null,
                    createdAt: null,
                    tenderId: tender.tenderId,
                    tenderNo: tender.tenderNo || '',
                    tenderName: tender.tenderName || '',
                    dueDate: tender.dueDate,
                    teamMemberId: tender.teamMemberId,
                    teamMemberName: tender.teamMemberName,
                    requestedBy: null,
                });
            }

            // Check Tender Fee
            const tenderFeeAmount = Number(tender.tenderFees) || 0;
            if (tenderFeeAmount > 0 && !existingPurposes.has('Tender Fee')) {
                missingPayments.push({
                    id: null,
                    type: 'missing',
                    purpose: 'Tender Fee',
                    amountRequired: tenderFeeAmount.toFixed(2),
                    status: 'Not Created',
                    instrumentType: null,
                    instrumentStatus: null,
                    createdAt: null,
                    tenderId: tender.tenderId,
                    tenderNo: tender.tenderNo || '',
                    tenderName: tender.tenderName || '',
                    dueDate: tender.dueDate,
                    teamMemberId: tender.teamMemberId,
                    teamMemberName: tender.teamMemberName,
                    requestedBy: null,
                });
            }

            // Check Processing Fee
            const processingFeeAmount = Number(tender.processingFee) || 0;
            if (processingFeeAmount > 0 && !existingPurposes.has('Processing Fee')) {
                missingPayments.push({
                    id: null,
                    type: 'missing',
                    purpose: 'Processing Fee',
                    amountRequired: processingFeeAmount.toFixed(2),
                    status: 'Not Created',
                    instrumentType: null,
                    instrumentStatus: null,
                    createdAt: null,
                    tenderId: tender.tenderId,
                    tenderNo: tender.tenderNo || '',
                    tenderName: tender.tenderName || '',
                    dueDate: tender.dueDate,
                    teamMemberId: tender.teamMemberId,
                    teamMemberName: tender.teamMemberName,
                    requestedBy: null,
                });
            }
        }

        return missingPayments;
    }

    async create(
        tenderId: number,
        payload: CreatePaymentRequestDto,
        userId?: number
    ) {
        const tender = await this.tenderInfosService.getTenderForPayment(tenderId);

        const [infoSheet] = await this.db
            .select()
            .from(tenderInformation)
            .where(eq(tenderInformation.tenderId, tenderId))
            .limit(1);

        const createdRequests: PaymentRequest[] = [];

        await this.db.transaction(async (tx) => {
            // Create EMD request if mode is provided
            if (payload.emd?.mode && payload.emd?.details) {
                const emdAmount = Number(tender.emd) || 0;
                if (emdAmount > 0) {
                    const request = await this.createPaymentRequest(
                        tx,
                        tenderId,
                        'EMD',
                        emdAmount,
                        tender,
                        userId
                    );
                    createdRequests.push(request);

                    await this.createInstrumentWithDetails(
                        tx,
                        request.id,
                        payload.emd.mode,
                        payload.emd.details,
                        emdAmount,
                        userId
                    );
                }
            }

            // Create Tender Fee request if mode is provided
            if (payload.tenderFee?.mode && payload.tenderFee?.details) {
                const tenderFeeAmount = Number(tender.tenderFees) || 0;
                if (tenderFeeAmount > 0) {
                    const request = await this.createPaymentRequest(
                        tx,
                        tenderId,
                        'Tender Fee',
                        tenderFeeAmount,
                        tender,
                        userId
                    );
                    createdRequests.push(request);

                    await this.createInstrumentWithDetails(
                        tx,
                        request.id,
                        payload.tenderFee.mode,
                        payload.tenderFee.details,
                        tenderFeeAmount,
                        userId
                    );
                }
            }

            // Create Processing Fee request if mode is provided
            if (
                payload.processingFee?.mode &&
                payload.processingFee?.details &&
                infoSheet
            ) {
                const processingFeeAmount = infoSheet.processingFeeAmount
                    ? Number(infoSheet.processingFeeAmount)
                    : 0;
                if (processingFeeAmount > 0) {
                    const request = await this.createPaymentRequest(
                        tx,
                        tenderId,
                        'Processing Fee',
                        processingFeeAmount,
                        tender,
                        userId
                    );
                    createdRequests.push(request);

                    await this.createInstrumentWithDetails(
                        tx,
                        request.id,
                        payload.processingFee.mode,
                        payload.processingFee.details,
                        processingFeeAmount,
                        userId
                    );
                }
            }
        });

        return createdRequests;
    }

    private async createPaymentRequest(
        tx: DbInstance,
        tenderId: number,
        purpose: PaymentPurpose,
        amount: number,
        tender: any,
        userId?: number
    ): Promise<PaymentRequest> {
        const [request] = await tx
            .insert(paymentRequests)
            .values({
                tenderId,
                purpose,
                amountRequired: amount.toString(),
                dueDate: tender.dueDate,
                tenderNo: tender.tenderNo,
                status: 'Pending',
                requestedBy: userId?.toString() || null,
            })
            .returning();

        return request;
    }

    private async createInstrumentWithDetails(
        tx: DbInstance,
        requestId: number,
        mode: string,
        details: any,
        amount: number,
        userId?: number
    ): Promise<PaymentInstrument> {
        const instrumentType = mapInstrumentType(mode);
        const initialStatus = getInitialInstrumentStatus(instrumentType);

        const instrumentData: any = {
            requestId,
            instrumentType,
            amount: amount.toString(),
            status: initialStatus,
            action: 1,
            currentStage: 1,
            isActive: true,
        };

        // Map common fields based on mode
        if (mode === 'DD' && details.ddFavouring) {
            instrumentData.favouring = details.ddFavouring;
            instrumentData.payableAt = details.ddPayableAt;
            instrumentData.courierAddress = details.ddCourierAddress;
            instrumentData.courierDeadline = details.ddCourierHours
                ? parseInt(details.ddCourierHours)
                : null;
            instrumentData.issueDate = details.ddDate
                ? new Date(details.ddDate).toISOString().split('T')[0]
                : null;
            instrumentData.remarks = details.ddRemarks;
        } else if (mode === 'FDR' && details.fdrFavouring) {
            instrumentData.favouring = details.fdrFavouring;
            instrumentData.expiryDate = details.fdrExpiryDate
                ? new Date(details.fdrExpiryDate).toISOString().split('T')[0]
                : null;
            instrumentData.courierAddress = details.fdrCourierAddress;
            instrumentData.courierDeadline = details.fdrCourierHours
                ? parseInt(details.fdrCourierHours)
                : null;
            instrumentData.issueDate = details.fdrDate
                ? new Date(details.fdrDate).toISOString().split('T')[0]
                : null;
        } else if (mode === 'BG' && details.bgFavouring) {
            instrumentData.favouring = details.bgFavouring;
            instrumentData.expiryDate = details.bgExpiryDate
                ? new Date(details.bgExpiryDate).toISOString().split('T')[0]
                : null;
            instrumentData.claimExpiryDate = details.bgClaimPeriod
                ? new Date(details.bgClaimPeriod).toISOString().split('T')[0]
                : null;
            instrumentData.courierAddress = details.bgCourierAddress;
            instrumentData.courierDeadline = details.bgCourierDays || null;
        } else if (mode === 'BANK_TRANSFER' && details.btAccountName) {
            // Bank transfer specific fields are in detail table
        } else if (mode === 'PORTAL' && details.portalName) {
            // Portal specific fields are in detail table
        }

        const [instrument] = await tx
            .insert(paymentInstruments)
            .values(instrumentData)
            .returning();

        // Create detail record
        await this.createInstrumentDetails(tx, instrument.id, mode, details);

        // Record initial status in history
        await this.historyService.recordStatusChange(
            instrument.id,
            null,
            initialStatus,
            instrumentType,
            {
                userId,
                remarks: 'Initial creation',
                formData: details,
            }
        );

        return instrument;
    }

    private async createInstrumentDetails(
        tx: DbInstance,
        instrumentId: number,
        mode: string,
        details: any
    ) {
        if (mode === 'DD' || mode === 'CHEQUE') {
            await tx.insert(instrumentDdDetails).values({
                instrumentId,
                ddDate: details.ddDate
                    ? new Date(details.ddDate).toISOString().split('T')[0]
                    : null,
                ddPurpose: details.ddPurpose,
                ddNeeds: details.ddDeliverBy,
                ddRemarks: details.ddRemarks,
            });
        } else if (mode === 'FDR') {
            await tx.insert(instrumentFdrDetails).values({
                instrumentId,
                fdrDate: details.fdrDate
                    ? new Date(details.fdrDate).toISOString().split('T')[0]
                    : null,
                fdrExpiryDate: details.fdrExpiryDate
                    ? new Date(details.fdrExpiryDate).toISOString().split('T')[0]
                    : null,
                fdrPurpose: details.fdrPurpose,
                fdrNeeds: details.fdrDeliverBy,
            });
        } else if (mode === 'BG') {
            await tx.insert(instrumentBgDetails).values({
                instrumentId,
                bgDate: details.bgExpiryDate
                    ? new Date(details.bgExpiryDate).toISOString().split('T')[0]
                    : null,
                validityDate: details.bgExpiryDate
                    ? new Date(details.bgExpiryDate).toISOString().split('T')[0]
                    : null,
                claimExpiryDate: details.bgClaimPeriod
                    ? new Date(details.bgClaimPeriod).toISOString().split('T')[0]
                    : null,
                beneficiaryName: details.bgFavouring,
                beneficiaryAddress: details.bgAddress,
                bankName: details.bgBank,
                stampCharges: details.bgStampValue?.toString() || null,
                bgNeeds: details.bgNeededIn,
                bgPurpose: details.bgPurpose,
                bgClientUser: details.bgClientUserEmail,
                bgClientCp: details.bgClientCpEmail,
                bgClientFin: details.bgClientFinanceEmail,
            });
        } else if (mode === 'BANK_TRANSFER') {
            await tx.insert(instrumentTransferDetails).values({
                instrumentId,
                accountName: details.btAccountName,
                accountNumber: details.btAccountNo,
                ifsc: details.btIfsc,
            });
        } else if (mode === 'PORTAL') {
            await tx.insert(instrumentTransferDetails).values({
                instrumentId,
                portalName: details.portalName,
                paymentMethod:
                    details.portalNetBanking === 'YES'
                        ? 'Netbanking'
                        : details.portalDebitCard === 'YES'
                            ? 'Debit Card'
                            : null,
                isNetbanking: details.portalNetBanking,
                isDebit: details.portalDebitCard,
            });
        }
    }

    // ========================================================================
    // Read Operations
    // ========================================================================

    async findByTenderId(tenderId: number) {
        await this.tenderInfosService.validateExists(tenderId);

        const requests = await this.db
            .select()
            .from(paymentRequests)
            .where(eq(paymentRequests.tenderId, tenderId))
            .orderBy(paymentRequests.createdAt);

        const requestsWithInstruments = await Promise.all(
            requests.map(async (request) => {
                const instruments = await this.db
                    .select()
                    .from(paymentInstruments)
                    .where(
                        and(
                            eq(paymentInstruments.requestId, request.id),
                            eq(paymentInstruments.isActive, true)
                        )
                    );

                const instrumentsWithDetails = await Promise.all(
                    instruments.map(async (instrument) => {
                        const [details, history, availableActions] = await Promise.all([
                            this.getInstrumentDetails(instrument.id, instrument.instrumentType),
                            this.historyService.getHistoryForInstrument(instrument.id),
                            this.instrumentStatusService.getAvailableActions(instrument.id),
                        ]);
                        return {
                            ...instrument,
                            details,
                            history,
                            availableActions,
                        };
                    })
                );

                return { ...request, instruments: instrumentsWithDetails };
            })
        );

        return requestsWithInstruments;
    }

    async findByTenderIdWithTender(tenderId: number) {
        const [requests, tender] = await Promise.all([
            this.findByTenderId(tenderId),
            this.tenderInfosService.getTenderForPayment(tenderId),
        ]);

        return { requests, tender };
    }

    async findById(requestId: number) {
        const [request] = await this.db
            .select()
            .from(paymentRequests)
            .where(eq(paymentRequests.id, requestId))
            .limit(1);

        if (!request) {
            throw new NotFoundException(
                `Payment request with ID ${requestId} not found`
            );
        }

        const instruments = await this.db
            .select()
            .from(paymentInstruments)
            .where(
                and(
                    eq(paymentInstruments.requestId, requestId),
                    eq(paymentInstruments.isActive, true)
                )
            );

        const instrumentsWithDetails = await Promise.all(
            instruments.map(async (instrument) => {
                const [details, history, availableActions] = await Promise.all([
                    this.getInstrumentDetails(instrument.id, instrument.instrumentType),
                    this.historyService.getHistoryForInstrument(instrument.id),
                    this.instrumentStatusService.getAvailableActions(instrument.id),
                ]);
                return {
                    ...instrument,
                    details,
                    history,
                    availableActions,
                };
            })
        );

        return { ...request, instruments: instrumentsWithDetails };
    }

    async findByIdWithTender(requestId: number) {
        const request = await this.findById(requestId);
        const tender = await this.tenderInfosService.getTenderForPayment(
            request.tenderId
        );

        return { ...request, tender };
    }

    private async getInstrumentDetails(
        instrumentId: number,
        instrumentType: string
    ) {
        switch (instrumentType) {
            case 'DD':
            case 'Cheque':
                const [dd] = await this.db
                    .select()
                    .from(instrumentDdDetails)
                    .where(eq(instrumentDdDetails.instrumentId, instrumentId))
                    .limit(1);
                return dd || null;
            case 'FDR':
                const [fdr] = await this.db
                    .select()
                    .from(instrumentFdrDetails)
                    .where(eq(instrumentFdrDetails.instrumentId, instrumentId))
                    .limit(1);
                return fdr || null;
            case 'BG':
                const [bg] = await this.db
                    .select()
                    .from(instrumentBgDetails)
                    .where(eq(instrumentBgDetails.instrumentId, instrumentId))
                    .limit(1);
                return bg || null;
            case 'Bank Transfer':
            case 'Portal Payment':
                const [transfer] = await this.db
                    .select()
                    .from(instrumentTransferDetails)
                    .where(eq(instrumentTransferDetails.instrumentId, instrumentId))
                    .limit(1);
                return transfer || null;
            default:
                return null;
        }
    }

    // ========================================================================
    // Update Operations
    // ========================================================================

    async update(requestId: number, payload: UpdatePaymentRequestDto) {
        const [existing] = await this.db
            .select()
            .from(paymentRequests)
            .where(eq(paymentRequests.id, requestId))
            .limit(1);

        if (!existing) {
            throw new NotFoundException(
                `Payment request with ID ${requestId} not found`
            );
        }

        // Get existing active instrument
        const [existingInstrument] = await this.db
            .select()
            .from(paymentInstruments)
            .where(
                and(
                    eq(paymentInstruments.requestId, requestId),
                    eq(paymentInstruments.isActive, true)
                )
            )
            .limit(1);

        if (!existingInstrument) {
            throw new NotFoundException(
                `No active instrument found for request ${requestId}`
            );
        }

        // Determine which mode/purpose this request is for
        let mode: string | undefined;
        let details: any;

        if (existing.purpose === 'EMD' && payload.emd?.mode) {
            mode = payload.emd.mode;
            details = payload.emd.details;
        } else if (existing.purpose === 'Tender Fee' && payload.tenderFee?.mode) {
            mode = payload.tenderFee.mode;
            details = payload.tenderFee.details;
        } else if (existing.purpose === 'Processing Fee' && payload.processingFee?.mode) {
            mode = payload.processingFee.mode;
            details = payload.processingFee.details;
        }

        if (!mode || !details) {
            throw new BadRequestException(
                'Invalid update payload for this payment request type'
            );
        }

        // Check if instrument type is changing
        const newType = mapInstrumentType(mode);
        if (existingInstrument.instrumentType !== newType) {
            throw new BadRequestException(
                'Cannot change instrument type after creation. Please create a new request.'
            );
        }

        // Update instrument and details
        await this.updateInstrumentWithDetails(
            existingInstrument.id,
            mode,
            details
        );

        return this.findById(requestId);
    }

    private async updateInstrumentWithDetails(
        instrumentId: number,
        mode: string,
        details: any
    ): Promise<void> {
        const instrumentData: any = {
            updatedAt: new Date(),
        };

        if (mode === 'DD' && details.ddFavouring) {
            instrumentData.favouring = details.ddFavouring;
            instrumentData.payableAt = details.ddPayableAt;
            instrumentData.courierAddress = details.ddCourierAddress;
            instrumentData.courierDeadline = details.ddCourierHours
                ? parseInt(details.ddCourierHours)
                : null;
            instrumentData.issueDate = details.ddDate
                ? new Date(details.ddDate).toISOString().split('T')[0]
                : null;
            instrumentData.remarks = details.ddRemarks;
        } else if (mode === 'FDR' && details.fdrFavouring) {
            instrumentData.favouring = details.fdrFavouring;
            instrumentData.expiryDate = details.fdrExpiryDate
                ? new Date(details.fdrExpiryDate).toISOString().split('T')[0]
                : null;
            instrumentData.courierAddress = details.fdrCourierAddress;
            instrumentData.courierDeadline = details.fdrCourierHours
                ? parseInt(details.fdrCourierHours)
                : null;
        } else if (mode === 'BG' && details.bgFavouring) {
            instrumentData.favouring = details.bgFavouring;
            instrumentData.expiryDate = details.bgExpiryDate
                ? new Date(details.bgExpiryDate).toISOString().split('T')[0]
                : null;
            instrumentData.claimExpiryDate = details.bgClaimPeriod
                ? new Date(details.bgClaimPeriod).toISOString().split('T')[0]
                : null;
            instrumentData.courierAddress = details.bgCourierAddress;
            instrumentData.courierDeadline = details.bgCourierDays || null;
        }

        if (Object.keys(instrumentData).length > 1) {
            await this.db
                .update(paymentInstruments)
                .set(instrumentData)
                .where(eq(paymentInstruments.id, instrumentId));
        }

        // Update detail table
        await this.updateDetailTable(instrumentId, mode, details);
    }

    private async updateDetailTable(
        instrumentId: number,
        mode: string,
        details: any
    ): Promise<void> {
        if (mode === 'DD' || mode === 'CHEQUE') {
            await this.db
                .update(instrumentDdDetails)
                .set({
                    ddDate: details.ddDate
                        ? new Date(details.ddDate).toISOString().split('T')[0]
                        : null,
                    ddPurpose: details.ddPurpose,
                    ddNeeds: details.ddDeliverBy,
                    ddRemarks: details.ddRemarks,
                })
                .where(eq(instrumentDdDetails.instrumentId, instrumentId));
        } else if (mode === 'FDR') {
            await this.db
                .update(instrumentFdrDetails)
                .set({
                    fdrDate: details.fdrDate
                        ? new Date(details.fdrDate).toISOString().split('T')[0]
                        : null,
                    fdrExpiryDate: details.fdrExpiryDate
                        ? new Date(details.fdrExpiryDate).toISOString().split('T')[0]
                        : null,
                    fdrPurpose: details.fdrPurpose,
                    fdrNeeds: details.fdrDeliverBy,
                })
                .where(eq(instrumentFdrDetails.instrumentId, instrumentId));
        } else if (mode === 'BG') {
            await this.db
                .update(instrumentBgDetails)
                .set({
                    bgDate: details.bgExpiryDate
                        ? new Date(details.bgExpiryDate).toISOString().split('T')[0]
                        : null,
                    validityDate: details.bgExpiryDate
                        ? new Date(details.bgExpiryDate).toISOString().split('T')[0]
                        : null,
                    claimExpiryDate: details.bgClaimPeriod
                        ? new Date(details.bgClaimPeriod).toISOString().split('T')[0]
                        : null,
                    beneficiaryName: details.bgFavouring,
                    beneficiaryAddress: details.bgAddress,
                    bankName: details.bgBank,
                    stampCharges: details.bgStampValue?.toString() || null,
                    bgNeeds: details.bgNeededIn,
                    bgPurpose: details.bgPurpose,
                })
                .where(eq(instrumentBgDetails.instrumentId, instrumentId));
        } else if (mode === 'BANK_TRANSFER') {
            await this.db
                .update(instrumentTransferDetails)
                .set({
                    accountName: details.btAccountName,
                    accountNumber: details.btAccountNo,
                    ifsc: details.btIfsc,
                })
                .where(eq(instrumentTransferDetails.instrumentId, instrumentId));
        } else if (mode === 'PORTAL') {
            await this.db
                .update(instrumentTransferDetails)
                .set({
                    portalName: details.portalName,
                    paymentMethod:
                        details.portalNetBanking === 'YES'
                            ? 'Netbanking'
                            : details.portalDebitCard === 'YES'
                                ? 'Debit Card'
                                : null,
                    isNetbanking: details.portalNetBanking,
                    isDebit: details.portalDebitCard,
                })
                .where(eq(instrumentTransferDetails.instrumentId, instrumentId));
        }
    }

    async updateStatus(requestId: number, payload: UpdateStatusDto) {
        const [existing] = await this.db
            .select()
            .from(paymentRequests)
            .where(eq(paymentRequests.id, requestId))
            .limit(1);

        if (!existing) {
            throw new NotFoundException(
                `Payment request with ID ${requestId} not found`
            );
        }

        await this.db
            .update(paymentRequests)
            .set({
                status: payload.status,
                remarks: payload.remarks || existing.remarks,
            })
            .where(eq(paymentRequests.id, requestId));

        return this.findById(requestId);
    }

    // ========================================================================
    // Instrument Status Operations (delegated to InstrumentStatusService)
    // ========================================================================

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

    async getInstrumentAvailableActions(instrumentId: number) {
        return this.instrumentStatusService.getAvailableActions(instrumentId);
    }

    async getInstrumentHistory(instrumentId: number) {
        return this.historyService.getInstrumentChain(instrumentId);
    }
}
