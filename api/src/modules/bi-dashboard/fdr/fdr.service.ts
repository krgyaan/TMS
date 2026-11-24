import { couriers } from "@/db/schemas/shared/couriers.schema";
import { followUps } from "@/db/schemas/shared/follow-ups.schema";
import { AppLogger } from "@/logger/app-logger.service";
import type { FdrDashboardCounts, FdrDashboardRow } from "@/modules/bi-dashboard/fdr/helpers/fdr.types";
import { FollowUpService } from "@/modules/follow-up/follow-up.service";
import type { CreateFollowUpDto } from "@/modules/follow-up/dto";
import { CHEQUE_STATUSES, FDR_STATUSES } from "@/modules/tendering/payment-requests/constants/payment-request-statuses";
import { PaymentRequestsNotificationService } from "@/modules/tendering/payment-requests/services/payment-requests-notification.service";
import type { PaginatedResult } from "@/modules/tendering/types/shared.types";
import { wrapPaginatedResponse } from "@/utils/responseWrapper";
import type { DbInstance } from "@db";
import { DRIZZLE } from "@db/database.module";
import { users } from "@db/schemas/auth/users.schema";
import { statuses } from "@db/schemas/master/statuses.schema";
import { teams } from "@db/schemas/master/teams.schema";
import { instrumentBgDetails, instrumentChequeDetails, instrumentFdrDetails, paymentInstruments, paymentRequests } from "@db/schemas/tendering/payment-requests.schema";
import { tenderInfos } from "@db/schemas/tendering/tenders.schema";
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";

@Injectable()
export class FdrService {
    private readonly logger;

    constructor(
        private readonly appLogger: AppLogger,
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly followUpService: FollowUpService,
        private readonly notificationService: PaymentRequestsNotificationService,
    ) {
        this.logger = this.appLogger.withContext(FdrService.name);
    }

    private deriveFdrStatus(status: string | null, fdrNo?: string | null): string {
        const map: Record<string, string> = {
            [FDR_STATUSES.PENDING]: "Pending",
            [FDR_STATUSES.ACCOUNTS_FORM_ACCEPTED]: fdrNo ? "FDR Created" : "FDR Accepted",
            [FDR_STATUSES.ACCOUNTS_FORM_REJECTED]: "FDR Rejected",
            [FDR_STATUSES.FOLLOWUP_INITIATED]: "Followup Initiated",
            [FDR_STATUSES.RETURN_VIA_COURIER]: "Returned via courier",
            [FDR_STATUSES.RETURN_VIA_BANK_TRANSFER]: "Returned via Bank Transfer",
            [FDR_STATUSES.SETTLED_WITH_PROJECT]: "Settled with Project Account",
            [FDR_STATUSES.CANCELLATION_REQUESTED]: "FDR Cancellation request sent to branch",
            [FDR_STATUSES.CANCELLED]: "FDR Cancelled at Branch",
        };
        return map[status as string] || status || "Pending";
    }

    /**
     * Display label for the Tender / WO Name column. Uses the request's project
     * name first, then the joined tender name, and falls back to
     * "Accounts/Admin" when neither was captured (BI-raised FDRs).
     */
    private resolveFdrProjectLabel(
        projectName: string | null | undefined,
        tenderName: string | null | undefined,
    ): string {
        const isRealName = (value: string | null | undefined) => {
            const trimmed = value?.trim();
            return trimmed && trimmed.toUpperCase() !== 'NA' ? trimmed : null;
        };
        return isRealName(projectName) ?? isRealName(tenderName) ?? 'Accounts/Admin';
    }

    private deriveFdrExpiryStatus(fdrExpiryDate: Date | null): string {
        if (!fdrExpiryDate) return 'No date';
        return new Date(fdrExpiryDate) < new Date() ? 'Renewed' : 'Valid';
    }

    private buildFdrDashboardConditions(tab?: string): { conditions: any[]; needsFdrDetails: boolean } {
        const conditions: any[] = [eq(paymentInstruments.instrumentType, "FDR"), eq(paymentInstruments.isActive, true)];
        let needsFdrDetails = false;

        if (tab === "pending") {
            conditions.push(eq(paymentInstruments.action, 0), eq(paymentInstruments.status, FDR_STATUSES.PENDING));
        } else if (tab === "rejected") {
            conditions.push(inArray(paymentInstruments.action, [1, 2]), eq(paymentInstruments.status, FDR_STATUSES.ACCOUNTS_FORM_REJECTED));
        } else if (tab === "returned") {
            conditions.push(inArray(paymentInstruments.action, [3, 4, 5]));
        } else if (tab === "cancelled") {
            conditions.push(inArray(paymentInstruments.action, [6, 7]));
        } else if (tab === "bg-linked") {
            needsFdrDetails = true;
            conditions.push(
                inArray(paymentInstruments.action, [1, 2]),
                sql`EXISTS (
                    SELECT 1 FROM instrument_bg_details bg
                    INNER JOIN payment_instruments pi_bg ON pi_bg.id = bg.instrument_id
                    WHERE bg.fdr_no = ${instrumentFdrDetails.fdrNo}
                    AND pi_bg.is_active = true
                )`
            );
        } else if (tab === "bg") {
            needsFdrDetails = true;
            conditions.push(inArray(paymentInstruments.action, [1, 2]), eq(instrumentFdrDetails.fdrPurpose, "BANK_GUARANTEE"));
        } else if (tab === "other-security") {
            needsFdrDetails = true;
            conditions.push(inArray(paymentInstruments.action, [1, 2]), eq(instrumentFdrDetails.fdrPurpose, "OTHER_SECURITY"));
        } else if (tab === "emd") {
            needsFdrDetails = true;
            conditions.push(inArray(paymentInstruments.action, [1, 2]), eq(instrumentFdrDetails.fdrPurpose, "EMD"));
        } else if (tab === "security-deposit") {
            needsFdrDetails = true;
            conditions.push(inArray(paymentInstruments.action, [1, 2]), inArray(instrumentFdrDetails.fdrPurpose, ["deposit", "SECURITY_DEPOSIT"]));
        }

        return { conditions, needsFdrDetails };
    }

    async getDashboardData(
        tab?: string,
        options?: {
            page?: number;
            limit?: number;
            sortBy?: string;
            sortOrder?: "asc" | "desc";
            search?: string;
            teamId?: number;
        }
    ): Promise<PaginatedResult<FdrDashboardRow>> {
        const page = options?.page || 1;
        const limit = options?.limit || 50;
        const offset = (page - 1) * limit;

        const { conditions: baseConditions, needsFdrDetails } = this.buildFdrDashboardConditions(tab);
        const conditions = [...baseConditions];

        const searchTerm = options?.search?.trim();

        // Team filter
        const teamId = options?.teamId;
        if (teamId) {
            conditions.push(sql`COALESCE(${tenderInfos.team}, ${users.team}) = ${teamId}`);
        }

        // Search filter - search across all rendered columns
        // Note: We always join instrumentFdrDetails in the query, so we can search FDR columns
        if (searchTerm) {
            const searchStr = `%${searchTerm}%`;
            const searchConditions: any[] = [
                sql`${tenderInfos.tenderName} ILIKE ${searchStr}`,
                sql`${tenderInfos.tenderNo} ILIKE ${searchStr}`,
                sql`${instrumentFdrDetails.fdrNo} ILIKE ${searchStr}`,
                sql`${paymentInstruments.favouring} ILIKE ${searchStr}`,
                sql`${paymentInstruments.amount}::text ILIKE ${searchStr}`,
                sql`${statuses.name} ILIKE ${searchStr}`,
                sql`${users.name} ILIKE ${searchStr}`,
                sql`${instrumentFdrDetails.fdrDate}::text ILIKE ${searchStr}`,
                sql`${instrumentFdrDetails.fdrExpiryDate}::text ILIKE ${searchStr}`,
                sql`${paymentInstruments.status} ILIKE ${searchStr}`,
            ];
            conditions.push(sql`(${sql.join(searchConditions, sql` OR `)})`);
        }

        // Build order clause
        let orderClause: any = desc(paymentInstruments.createdAt);
        if (options?.sortBy) {
            const direction = options.sortOrder === "desc" ? desc : asc;
            switch (options.sortBy) {
                case "fdrCreationDate":
                    orderClause = direction(instrumentFdrDetails.fdrDate);
                    break;
                case "fdrNo":
                    orderClause = direction(instrumentFdrDetails.fdrNo);
                    break;
                case "tenderNo":
                    orderClause = direction(tenderInfos.tenderNo);
                    break;
                case "fdrAmount":
                    orderClause = direction(paymentInstruments.amount);
                    break;
                default:
                    orderClause = direction(paymentInstruments.createdAt);
            }
        }

        // Build base query with joins
        const baseQuery = this.db
            .select({
                id: paymentInstruments.id,
                requestId: paymentRequests.id,
                fdrCreationDate: instrumentFdrDetails.fdrDate,
                fdrNo: instrumentFdrDetails.fdrNo,
                beneficiaryName: paymentInstruments.favouring,
                fdrAmount: paymentInstruments.amount,
                tenderName: tenderInfos.tenderName,
                projectName: paymentRequests.projectName,
                projectNo: paymentRequests.tenderNo,
                requestTenderId: paymentRequests.tenderId,
                tenderNo: tenderInfos.tenderNo,
                tenderStatus: statuses.name,
                teamMember: users.name,
                source: instrumentFdrDetails.fdrSource,
                expiry: instrumentFdrDetails.fdrExpiryDate,
                fdrStatus: paymentInstruments.status,
            })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .innerJoin(instrumentFdrDetails, eq(instrumentFdrDetails.instrumentId, paymentInstruments.id))
            .leftJoin(users, eq(users.id, paymentRequests.requestedBy))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status));

        // Data query
        const rows = await baseQuery
            .where(and(...conditions))
            .orderBy(orderClause)
            .limit(limit)
            .offset(offset);

        // Count query
        const countQuery = this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .innerJoin(instrumentFdrDetails, eq(instrumentFdrDetails.instrumentId, paymentInstruments.id))
            .leftJoin(users, eq(users.id, paymentRequests.requestedBy))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status));

        const [countResult] = await countQuery.where(and(...conditions));

        const total = Number(countResult?.count || 0);

        // Follow-ups that have been stopped: shown as "Followup Stopped"
        // instead of "Followup Initiated" on the dashboard.
        const stoppedFollowupIds = new Set<number>();
        const instrumentIds = rows.map((row) => row.id);
        if (instrumentIds.length > 0) {
            const stoppedRows = await this.db
                .select({ emdId: followUps.emdId })
                .from(followUps)
                .where(and(
                    inArray(followUps.emdId, instrumentIds),
                    isNull(followUps.deletedAt),
                    sql`(${followUps.stopReason} is not null or ${followUps.stopRemarks} is not null)`,
                ));
            for (const stopped of stoppedRows) {
                if (stopped.emdId != null) stoppedFollowupIds.add(Number(stopped.emdId));
            }
        }

        const data: FdrDashboardRow[] = rows.map(row => ({
            id: row.id,
            requestId: row.requestId,
            fdrCreationDate: row.fdrCreationDate ? new Date(row.fdrCreationDate) : null,
            fdrNo: row.fdrNo,
            beneficiaryName: row.beneficiaryName,
            fdrAmount: row.fdrAmount ? Number(row.fdrAmount) : null,
            tenderName: row.tenderName || row.projectName,
            projectLabel: this.resolveFdrProjectLabel(row.projectName, row.tenderName),
            tenderNo: row.tenderNo || row.projectNo,
            tenderStatus: row.requestTenderId ? (row.tenderStatus ?? 'Other than Tender') : 'Other than Tender',
            member: row.teamMember?.toString() ?? null,
            expiry: this.deriveFdrExpiryStatus(row.expiry ? new Date(row.expiry) : null),
            fdrStatus: stoppedFollowupIds.has(row.id) && row.fdrStatus === FDR_STATUSES.FOLLOWUP_INITIATED
                ? 'Followup Stopped'
                : this.deriveFdrStatus(row.fdrStatus, row.fdrNo),
        }));

        return wrapPaginatedResponse(data, total, page, limit);
    }

    async getExportData(
        tab?: string,
        options?: {
            teamId?: number;
        },
    ): Promise<{ data: any[] }> {
        const { conditions } = this.buildFdrDashboardConditions(tab);

        const teamId = options?.teamId;
        if (teamId) {
            conditions.push(sql`${tenderInfos.team} = ${teamId}`);
        }

        const rows = await this.db
            .select({
                id: paymentInstruments.id,
                requestId: paymentRequests.id,
                fdrCreationDate: instrumentFdrDetails.fdrDate,
                fdrNo: instrumentFdrDetails.fdrNo,
                beneficiaryName: paymentInstruments.favouring,
                fdrAmount: paymentInstruments.amount,
                projectName: paymentRequests.projectName,
                projectNo: paymentRequests.tenderNo,
                requestTenderId: paymentRequests.tenderId,
                tenderName: tenderInfos.tenderName,
                tenderStatus: statuses.name,
                teamMember: users.name,
                source: instrumentFdrDetails.fdrSource,
                expiry: instrumentFdrDetails.fdrExpiryDate,
                fdrStatus: paymentInstruments.status,
                reqNo: paymentInstruments.reqNo,
                fdrNeeds: instrumentFdrDetails.fdrNeeds,
                fdrPurpose: instrumentFdrDetails.fdrPurpose,
                fdrRemark: instrumentFdrDetails.fdrRemark,
                fdrSource: instrumentFdrDetails.fdrSource,
                fdrExpiryDate: instrumentFdrDetails.fdrExpiryDate,
                utr: paymentInstruments.utr,
                issueDate: paymentInstruments.issueDate,
                expiryDate: paymentInstruments.expiryDate,
                payableAt: paymentInstruments.payableAt,
                favouring: paymentInstruments.favouring,
                docketNo: paymentInstruments.docketNo,
            })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .innerJoin(instrumentFdrDetails, eq(instrumentFdrDetails.instrumentId, paymentInstruments.id))
            .leftJoin(users, eq(users.id, paymentRequests.requestedBy))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .where(and(...conditions))
            .orderBy(desc(paymentInstruments.createdAt));

        const stoppedFollowupIds = new Set<number>();
        const exportInstrumentIds = rows.map((row) => row.id);
        if (exportInstrumentIds.length > 0) {
            const stoppedRows = await this.db
                .select({ emdId: followUps.emdId })
                .from(followUps)
                .where(and(
                    inArray(followUps.emdId, exportInstrumentIds),
                    isNull(followUps.deletedAt),
                    sql`(${followUps.stopReason} is not null or ${followUps.stopRemarks} is not null)`,
                ));
            for (const stopped of stoppedRows) {
                if (stopped.emdId != null) stoppedFollowupIds.add(Number(stopped.emdId));
            }
        }

        const data = rows.map(row => ({
            id: row.id,
            requestId: row.requestId,
            fdrCreationDate: row.fdrCreationDate ? new Date(row.fdrCreationDate) : null,
            fdrNo: row.fdrNo,
            beneficiaryName: row.beneficiaryName,
            fdrAmount: row.fdrAmount ? Number(row.fdrAmount) : null,
            projectName: row.projectName,
            projectNo: row.projectNo,
            projectLabel: this.resolveFdrProjectLabel(row.projectName, row.tenderName),
            tenderStatus: row.requestTenderId ? (row.tenderStatus ?? 'Other than Tender') : 'Other than Tender',
            member: row.teamMember?.toString() ?? null,
            expiry: this.deriveFdrExpiryStatus(row.expiry ? new Date(row.expiry) : null),
            fdrStatus: stoppedFollowupIds.has(row.id) && row.fdrStatus === FDR_STATUSES.FOLLOWUP_INITIATED
                ? 'Followup Stopped'
                : this.deriveFdrStatus(row.fdrStatus, row.fdrNo),
            reqNo: row.reqNo,
            fdrNeeds: row.fdrNeeds,
            fdrPurpose: row.fdrPurpose,
            fdrRemark: row.fdrRemark,
            fdrSource: row.fdrSource,
            fdrExpiryDate: row.fdrExpiryDate ? new Date(row.fdrExpiryDate) : null,
            utr: row.utr,
            issueDate: row.issueDate ? new Date(row.issueDate) : null,
            expiryDate: row.expiryDate ? new Date(row.expiryDate) : null,
            payableAt: row.payableAt,
            favouring: row.favouring,
            docketNo: row.docketNo,
        }));

        return { data };
    }

    async getDashboardCounts(): Promise<FdrDashboardCounts> {
        const baseWhere = and(
            eq(paymentInstruments.instrumentType, "FDR"),
            eq(paymentInstruments.isActive, true),
        );

        const pendingFilter = and(
            eq(paymentInstruments.action, 0),
            eq(paymentInstruments.status, FDR_STATUSES.PENDING),
        );

        const rejectedFilter = and(
            inArray(paymentInstruments.action, [1, 2]),
            eq(paymentInstruments.status, FDR_STATUSES.ACCOUNTS_FORM_REJECTED),
        );

        const returnedFilter = inArray(paymentInstruments.action, [3, 4, 5]);

        const cancelledFilter = inArray(paymentInstruments.action, [6, 7]);

        const bgLinkedFilter = and(
            inArray(paymentInstruments.action, [1, 2]),
            sql`EXISTS (
                SELECT 1 FROM instrument_bg_details bg
                INNER JOIN payment_instruments pi_bg ON pi_bg.id = bg.instrument_id
                WHERE bg.fdr_no = ${instrumentFdrDetails.fdrNo}
                AND pi_bg.is_active = true
            )`,
        );

        const bgPurposeFilter = and(
            inArray(paymentInstruments.action, [1, 2]),
            eq(instrumentFdrDetails.fdrPurpose, "BANK_GUARANTEE"),
        );

        const otherSecurityFilter = and(
            inArray(paymentInstruments.action, [1, 2]),
            eq(instrumentFdrDetails.fdrPurpose, "OTHER_SECURITY"),
        );

        const emdFilter = and(
            inArray(paymentInstruments.action, [1, 2]),
            eq(instrumentFdrDetails.fdrPurpose, "EMD"),
        );

        const securityDepositFilter = and(
            inArray(paymentInstruments.action, [1, 2]),
            inArray(instrumentFdrDetails.fdrPurpose, ["deposit", "SECURITY_DEPOSIT"]),
        );

        const [counts] = await this.db.select({
            pending: sql<number>`count(distinct ${paymentInstruments.id}) filter (where ${pendingFilter})`,
            rejected: sql<number>`count(distinct ${paymentInstruments.id}) filter (where ${rejectedFilter})`,
            returned: sql<number>`count(distinct ${paymentInstruments.id}) filter (where ${returnedFilter})`,
            cancelled: sql<number>`count(distinct ${paymentInstruments.id}) filter (where ${cancelledFilter})`,
            bgLinked: sql<number>`count(distinct ${paymentInstruments.id}) filter (where ${bgLinkedFilter})`,
            bgPurpose: sql<number>`count(distinct ${paymentInstruments.id}) filter (where ${bgPurposeFilter})`,
            otherSecurity: sql<number>`count(distinct ${paymentInstruments.id}) filter (where ${otherSecurityFilter})`,
            emd: sql<number>`count(distinct ${paymentInstruments.id}) filter (where ${emdFilter})`,
            securityDeposit: sql<number>`count(distinct ${paymentInstruments.id}) filter (where ${securityDepositFilter})`,
        })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(
                instrumentFdrDetails,
                eq(instrumentFdrDetails.instrumentId, paymentInstruments.id),
            )
            .where(baseWhere);

        const pending = Number(counts?.pending ?? 0);
        const rejected = Number(counts?.rejected ?? 0);
        const returned = Number(counts?.returned ?? 0);
        const cancelled = Number(counts?.cancelled ?? 0);
        const bgLinked = Number(counts?.bgLinked ?? 0);
        const bgPurpose = Number(counts?.bgPurpose ?? 0);
        const otherSecurity = Number(counts?.otherSecurity ?? 0);
        const emd = Number(counts?.emd ?? 0);
        const securityDeposit = Number(counts?.securityDeposit ?? 0);

        return {
            pending,
            rejected,
            returned,
            cancelled,
            "bg-linked": bgLinked,
            bg: bgPurpose,
            "other-security": otherSecurity,
            emd,
            "security-deposit": securityDeposit,
            total: pending + rejected + returned + cancelled + bgLinked + bgPurpose + otherSecurity + emd + securityDeposit,
        };
    }

    private mapActionToNumber(action: string): number {
        const actionMap: Record<string, number> = {
            "accounts-form": 1,
            "accounts-form-2": 1,
            "initiate-followup": 2,
            "returned-courier": 3,
            "returned-bank-transfer": 4,
            settled: 5,
            "request-cancellation": 6,
            "cancellation-confirmation": 7,
        };
        return actionMap[action] || 1;
    }



    /**
     * Creates the courier dispatch record for an FDR from the courier address
     * captured on the request form. Runs on the first Stage 2 save, mirroring
     * the BG flow (createBgCourierDispatch). No-op when a courier is already
     * linked or when the FDR is raised against a Bank Guarantee.
     */
    private async createFdrCourierDispatch(
        instrument: {
            id: number;
            reqNo?: string | null;
            courierAddressJson?: unknown;
            courierAddress?: string | null;
            purpose?: string | null;
        },
        userId: number,
    ): Promise<void> {
        // Already linked to a courier (e.g. created at request time before this change).
        if (instrument.reqNo?.trim()) {
            return;
        }

        const [fdrDetails] = await this.db
            .select({ fdrPurpose: instrumentFdrDetails.fdrPurpose })
            .from(instrumentFdrDetails)
            .where(eq(instrumentFdrDetails.instrumentId, instrument.id))
            .limit(1);

        // FDRs raised against a Bank Guarantee do not need a courier dispatch.
        const rawPurpose = (fdrDetails?.fdrPurpose || instrument.purpose || '').trim();
        if (rawPurpose.toUpperCase() === 'BANK_GUARANTEE') {
            return;
        }

        let rawJson: any = instrument.courierAddressJson;
        if (typeof rawJson === 'string') {
            try {
                rawJson = JSON.parse(rawJson);
            } catch {
                rawJson = null;
            }
        }

        const json = rawJson !== null && typeof rawJson === 'object' && !Array.isArray(rawJson)
            ? (rawJson as Record<string, any>)
            : {};

        const org = String(json.org ?? '').trim();
        if (!org) {
            return;
        }

        const toAddr = [
            json.line1,
            json.line2,
            json.city,
            json.state,
        ].filter(Boolean).join(', ') || (instrument.courierAddress ?? '');

        await this.db.transaction(async (tx) => {
            const [row] = await tx
                .insert(couriers)
                .values({
                    userId: userId || 0,
                    toOrg: org,
                    toName: String(json.name ?? '').trim(),
                    toAddr,
                    toPin: String(json.pincode ?? '').trim(),
                    toMobile: String(json.phone ?? '').trim(),
                    empFrom: Number(json.empFrom) || userId || 0,
                    delDate: json.delDate ? new Date(json.delDate) : new Date(),
                    urgency: Number(json.urgency) || 1,
                    courierDocs: Array.isArray(json.docs) ? json.docs : [],
                    status: 0,
                })
                .returning();

            if (!row) {
                return;
            }

            await tx
                .update(paymentInstruments)
                .set({ reqNo: String(row.id), updatedAt: new Date() })
                .where(eq(paymentInstruments.id, instrument.id));
        });
    }

    async updateAction(instrumentId: number, body: Record<string, any>, user: any) {
        const [instrument] = await this.db.select().from(paymentInstruments).where(eq(paymentInstruments.id, instrumentId)).limit(1);

        if (!instrument) {
            throw new NotFoundException(`Instrument ${instrumentId} not found`);
        }

        if (instrument.instrumentType !== "FDR") {
            throw new BadRequestException("Instrument is not an FDR");
        }

        if (
            body.action === "accounts-form-2" &&
            (instrument.status === FDR_STATUSES.PENDING || instrument.status === FDR_STATUSES.ACCOUNTS_FORM_REJECTED)
        ) {
            throw new BadRequestException("Accounts Form must be accepted before capturing FDR details");
        }

        const actionNumber = this.mapActionToNumber(body.action);
        let contacts: any[] = [];
        if (body.contacts) {
            try {
                contacts = typeof body.contacts === "string" ? JSON.parse(body.contacts) : body.contacts;
            } catch (e) {
                this.logger.warn("Failed to parse contacts", e);
            }
        }

        const updateData: any = {
            action: actionNumber,
            updatedAt: new Date(),
        };

        if (body.action === "accounts-form") {
            const [linkedCheque] = await this.db
                .select({
                    status: paymentInstruments.status,
                    rejectionReason: paymentInstruments.rejectionReason,
                })
                .from(instrumentChequeDetails)
                .innerJoin(paymentInstruments, eq(paymentInstruments.id, instrumentChequeDetails.instrumentId))
                .where(eq(instrumentChequeDetails.linkedFdrId, instrumentId))
                .limit(1);

            if (linkedCheque) {
                if (linkedCheque.status === CHEQUE_STATUSES.ACCOUNTS_FORM_REJECTED) {
                    body.fdr_req = 'Rejected';
                    if (!body.reason_req) {
                        body.reason_req = linkedCheque.rejectionReason || 'Linked Cheque was rejected';
                    }
                } else if (linkedCheque.status !== CHEQUE_STATUSES.ACCOUNTS_FORM_ACCEPTED) {
                    throw new BadRequestException(
                        'Cannot process: linked Cheque is not yet accepted. Please accept the Cheque first.'
                    );
                }
            }
        }

        if (body.action === "accounts-form") {
            if (body.fdr_req === "Accepted") {
                updateData.status = FDR_STATUSES.ACCOUNTS_FORM_ACCEPTED;
                if (body.req_no) updateData.reqNo = body.req_no;
                if (body.courier_address_json) {
                    try {
                        updateData.courierAddressJson = typeof body.courier_address_json === 'string'
                            ? JSON.parse(body.courier_address_json)
                            : body.courier_address_json;
                    } catch {
                        this.logger.warn('Failed to parse courier_address_json');
                    }
                }
            } else if (body.fdr_req === "Rejected") {
                updateData.status = FDR_STATUSES.ACCOUNTS_FORM_REJECTED;
                updateData.rejectionReason = body.reason_req || null;
            }
            // Upload Documents is stored on instrument_fdr_details below
        } else if (body.action === "initiate-followup") {
            updateData.status = FDR_STATUSES.FOLLOWUP_INITIATED;
        } else if (body.action === "returned-courier") {
            updateData.status = FDR_STATUSES.RETURN_VIA_COURIER;
            if (body.docket_no) updateData.docketNo = body.docket_no;
            if (body.docket_slip && typeof body.docket_slip === "string") {
                updateData.docketSlip = body.docket_slip;
            }
        } else if (body.action === "returned-bank-transfer") {
            updateData.status = FDR_STATUSES.RETURN_VIA_BANK_TRANSFER;
            if (body.transfer_date) updateData.transferDate = body.transfer_date;
            if (body.utr) updateData.utr = body.utr;
        } else if (body.action === "settled") {
            updateData.status = FDR_STATUSES.SETTLED_WITH_PROJECT;
        } else if (body.action === "request-cancellation") {
            updateData.status = FDR_STATUSES.CANCELLATION_REQUESTED;
            if (body.covering_letter && typeof body.covering_letter === "string") {
                updateData.coveringLetter = body.covering_letter;
            }
            if (body.req_receive && typeof body.req_receive === "string") {
                updateData.reqReceive = body.req_receive;
            }
            // Store cancellation remarks
            if (body.cancellation_remarks) {
                updateData.legacyData = {
                    ...(instrument.legacyData || {}),
                    cancellation_remarks: body.cancellation_remarks,
                };
            }
        } else if (body.action === "cancellation-confirmation") {
            updateData.status = FDR_STATUSES.CANCELLED;
            // Store cancellation details in legacyData
            if (body.fdr_cancellation_date || body.fdr_cancellation_amount || body.fdr_cancellation_reference_no) {
                updateData.legacyData = {
                    ...(instrument.legacyData || {}),
                    fdr_cancellation_date: body.fdr_cancellation_date || null,
                    fdr_cancellation_amount: body.fdr_cancellation_amount || null,
                    fdr_cancellation_reference_no: body.fdr_cancellation_reference_no || null,
                };
            }
        }

        await this.db.update(paymentInstruments).set(updateData).where(eq(paymentInstruments.id, instrumentId));

        const fdrDetailsUpdate: any = {};
        if (body.action === "accounts-form" || body.action === "accounts-form-2") {
            if (body.fdr_no) fdrDetailsUpdate.fdrNo = body.fdr_no;
            if (body.fdr_date) fdrDetailsUpdate.fdrDate = body.fdr_date;
            if (body.fdr_validity) fdrDetailsUpdate.fdrExpiryDate = body.fdr_validity;
            if (body.fdr_roi !== undefined && body.fdr_roi !== '') fdrDetailsUpdate.roi = body.fdr_roi;
            if (body.fdr_copy !== undefined) {
                try {
                    const copyFiles = typeof body.fdr_copy === "string" ? JSON.parse(body.fdr_copy) : body.fdr_copy;
                    fdrDetailsUpdate.fdrCopy = Array.isArray(copyFiles) ? JSON.stringify(copyFiles) : null;
                } catch (e) {
                    this.logger.warn("Failed to parse fdr_copy", e);
                }
            }
            if (body.fdr_percentage) fdrDetailsUpdate.marginPercent = body.fdr_percentage;
            if (body.fdr_amount) fdrDetailsUpdate.fdrAmt = body.fdr_amount;
            if (body.fdr_roi) fdrDetailsUpdate.roi = body.fdr_roi;
            if (body.upload_documents !== undefined) {
                const raw = Array.isArray(body.upload_documents)
                    ? body.upload_documents[0]
                    : body.upload_documents;
                fdrDetailsUpdate.uploadDocuments = raw ? String(raw) : null;
            }
            if (body.prefilled_signed_fdr !== undefined) {
                try {
                    const prefilledFiles = typeof body.prefilled_signed_fdr === "string"
                        ? JSON.parse(body.prefilled_signed_fdr)
                        : body.prefilled_signed_fdr;
                    fdrDetailsUpdate.prefilledSignedFdr = Array.isArray(prefilledFiles)
                        ? JSON.stringify(prefilledFiles)
                        : null;
                } catch (e) {
                    this.logger.warn("Failed to parse prefilled_signed_fdr", e);
                }
            }
            const parseMailIds = (value: unknown): string[] | null => {
                try {
                    const parsed = typeof value === "string" ? JSON.parse(value) : value;
                    if (!Array.isArray(parsed)) return null;
                    return parsed
                        .map((entry) => {
                            if (typeof entry === "string") return entry.trim();
                            if (entry && typeof entry === "object" && "email" in entry) {
                                return String((entry as { email?: unknown }).email ?? "").trim();
                            }
                            return "";
                        })
                        .filter(Boolean);
                } catch (e) {
                    this.logger.warn("Failed to parse bank mail ids", e);
                    return null;
                }
            };
            if (body.bank_mail_ids !== undefined) {
                const ids = parseMailIds(body.bank_mail_ids);
                if (ids !== null) fdrDetailsUpdate.bankMailIds = ids;
            }
            if (body.bank_mail_ids_cc !== undefined) {
                const idsCc = parseMailIds(body.bank_mail_ids_cc);
                if (idsCc !== null) fdrDetailsUpdate.bankMailIdsCc = idsCc;
            }
            // Store charges in legacyData (schema doesn't have charge fields)
            if (body.fdr_charges || body.sfms_charges || body.stamp_charges || body.other_charges) {
                updateData.legacyData = {
                    ...(instrument.legacyData || {}),
                    ...(updateData.legacyData || {}),
                    fdr_charges: body.fdr_charges || null,
                    sfms_charges: body.sfms_charges || null,
                    stamp_charges: body.stamp_charges || null,
                    other_charges: body.other_charges || null,
                };
            }
        }

        let wasFdrCreated = false;

        if (Object.keys(fdrDetailsUpdate).length > 0) {
            fdrDetailsUpdate.updatedAt = new Date();

            // Check if fdrDetails record exists
            const [existingFdrDetails] = await this.db.select().from(instrumentFdrDetails).where(eq(instrumentFdrDetails.instrumentId, instrumentId)).limit(1);

            wasFdrCreated = Boolean(
                existingFdrDetails?.fdrNo && String(existingFdrDetails.fdrNo).trim().length > 0,
            );

            if (existingFdrDetails) {
                await this.db.update(instrumentFdrDetails).set(fdrDetailsUpdate).where(eq(instrumentFdrDetails.instrumentId, instrumentId));
            } else {
                // Create new fdrDetails record
                await this.db.insert(instrumentFdrDetails).values({
                    instrumentId,
                    ...fdrDetailsUpdate,
                    createdAt: new Date(),
                });
            }
        }

        // Send email notification for accounts-form (accept/reject)
        if (body.action === "accounts-form") {
            try {
                await this.notificationService.sendFdrCreatedMail(instrumentId, body, user);
            } catch (error) {
                this.logger.error(`Failed to send FDR created email for instrument ${instrumentId}:`, error);
            }

            if (body.fdr_req === "Accepted") {
                this.notificationService
                    .sendFdrBankRequestEmail(instrumentId)
                    .catch((error) =>
                        this.logger.error(
                            `FDR bank request email failed for instrument ${instrumentId}:`,
                            error,
                        ),
                    );
            }
        }

        // Create the courier dispatch from the address captured at request time
        // on the first Stage 2 save (skipped for FDRs raised against a BG).
        if (body.action === "accounts-form-2") {
            try {
                await this.createFdrCourierDispatch(instrument, user?.id ?? user?.sub ?? 0);
            } catch (error) {
                this.logger.error(
                    `Failed to create FDR courier dispatch for instrument ${instrumentId}:`,
                    error,
                );
            }
        }

        // Notify the tendering team the first time Stage 2 (FDR created) is saved.
        if (body.action === "accounts-form-2" && !wasFdrCreated) {
            this.notificationService
                .sendFdrCreatedTeamEmail(instrumentId, body)
                .catch((error) =>
                    this.logger.error(
                        `FDR created (team) email failed for instrument ${instrumentId}:`,
                        error,
                    ),
                );
        }

        // Create follow-up if action is initiate-followup
        if (body.action === "initiate-followup") {
            try {
                // Get payment request and tender info
                const [paymentRequest] = await this.db
                    .select({
                        requestId: paymentRequests.id,
                        tenderId: paymentRequests.tenderId,
                    })
                    .from(paymentRequests)
                    .where(eq(paymentRequests.id, instrument.requestId))
                    .limit(1);

                if (paymentRequest) {
                    const [tenderInfo] = await this.db
                        .select({
                            teamId: tenderInfos.team,
                            teamMemberId: tenderInfos.teamMember,
                        })
                        .from(tenderInfos)
                        .where(eq(tenderInfos.id, paymentRequest.tenderId))
                        .limit(1);

                    if (tenderInfo) {
                        // Get team name
                        const [team] = await this.db.select({ name: teams.name }).from(teams).where(eq(teams.id, tenderInfo.teamId)).limit(1);

                        // Map team name to area format (AC → 'AC Team', Accounts → 'Accounts', others → '{team} Team')
                        let area = "DC Team";
                        if (team?.name === "AC") {
                            area = "AC Team";
                        } else if (team?.name === "Accounts") {
                            area = "Accounts";
                        } else if (team?.name) {
                            area = `${team.name} Team`;
                        }

                        // Map contacts to ContactPersonDto format and filter out invalid ones
                        const mappedContacts = contacts
                            .filter(contact => contact.name && contact.name.trim().length > 0)
                            .map(contact => ({
                                name: contact.name.trim(),
                                email: contact.email || null,
                                phone: contact.phone || null,
                                org: contact.org || null,
                            }));

                        if (mappedContacts.length === 0) {
                            throw new BadRequestException("At least one valid contact with name is required");
                        }

                        // Create followup DTO
                        const followUpDto: CreateFollowUpDto = {
                            area: (body.area || 'Accounts'),
                            partyName: body.organisation_name || "",
                            amount: instrument.amount ? Number(instrument.amount) : 0,
                            followupFor: "EMD Refund",
                            assignedToId: tenderInfo.teamMemberId || null,
                            emdId: paymentRequest.requestId,
                            details: body.emailBody || null,
                            contacts: mappedContacts,
                            frequency: body.frequency ? Number(body.frequency) : 1,
                            startFrom: body.followup_start_date || undefined,
                            attachments: body.attachments || [],
                            createdById: user.id,
                            followUpHistory: [],
                        };

                        await this.followUpService.create(followUpDto, user.id);
                        this.logger.log(`Follow-up created successfully for instrument ${instrumentId}`);
                    }
                }
            } catch (error) {
                this.logger.error(`Failed to create follow-up for instrument ${instrumentId}:`, error);
                // Don't throw - allow the action to complete even if followup creation fails
            }
        }

        return {
            success: true,
            instrumentId,
            action: body.action,
            actionNumber,
        };
    }

    async getById(id: number) {
        const [result] = await this.db
            .select({
                // Payment Instrument fields
                instrumentId: paymentInstruments.id,
                instrumentType: paymentInstruments.instrumentType,
                purpose: paymentInstruments.purpose,
                amount: paymentInstruments.amount,
                favouring: paymentInstruments.favouring,
                payableAt: paymentInstruments.payableAt,
                issueDate: paymentInstruments.issueDate,
                expiryDate: paymentInstruments.expiryDate,
                validityDate: paymentInstruments.validityDate,
                claimExpiryDate: paymentInstruments.claimExpiryDate,
                utr: paymentInstruments.utr,
                docketNo: paymentInstruments.docketNo,
                courierAddress: paymentInstruments.courierAddress,
                courierAddressJson: paymentInstruments.courierAddressJson,
                courierDeadline: paymentInstruments.courierDeadline,
                action: paymentInstruments.action,
                status: paymentInstruments.status,
                rejectionReason: paymentInstruments.rejectionReason,
                isActive: paymentInstruments.isActive,
                generatedPdf: paymentInstruments.generatedPdf,
                cancelPdf: paymentInstruments.cancelPdf,
                docketSlip: paymentInstruments.docketSlip,
                coveringLetter: paymentInstruments.coveringLetter,
                extraPdfPaths: paymentInstruments.extraPdfPaths,
                reqNo: paymentInstruments.reqNo,
                createdAt: paymentInstruments.createdAt,
                updatedAt: paymentInstruments.updatedAt,

                // Payment Request fields
                requestId: paymentRequests.id,
                tenderId: paymentRequests.tenderId,
                requestType: paymentRequests.type,
                tenderNo: paymentRequests.tenderNo,
                projectName: paymentRequests.projectName,
                requestDueDate: paymentRequests.dueDate,
                requestedBy: paymentRequests.requestedBy,
                requestPurpose: paymentRequests.purpose,
                amountRequired: paymentRequests.amountRequired,
                requestStatus: paymentRequests.status,
                requestRemarks: paymentRequests.remarks,
                requestCreatedAt: paymentRequests.createdAt,
                requestUpdatedAt: paymentRequests.updatedAt,

                // FDR Details - all fields
                fdrDetailsId: instrumentFdrDetails.id,
                fdrNo: instrumentFdrDetails.fdrNo,
                fdrDate: instrumentFdrDetails.fdrDate,
                fdrSource: instrumentFdrDetails.fdrSource,
                roi: instrumentFdrDetails.roi,
                marginPercent: instrumentFdrDetails.marginPercent,
                fdrPurpose: instrumentFdrDetails.fdrPurpose,
                fdrExpiryDate: instrumentFdrDetails.fdrExpiryDate,
                fdrNeeds: instrumentFdrDetails.fdrNeeds,
                fdrRemark: instrumentFdrDetails.fdrRemark,
                prefilledSignedFdr: instrumentFdrDetails.prefilledSignedFdr,
                uploadDocuments: instrumentFdrDetails.uploadDocuments,
                fdrCopy: instrumentFdrDetails.fdrCopy,
                envelopeSlip: instrumentFdrDetails.envelopeSlip,
                bankMailIds: instrumentFdrDetails.bankMailIds,
                bankMailIdsCc: instrumentFdrDetails.bankMailIdsCc,
                fdrDetailsCreatedAt: instrumentFdrDetails.createdAt,
                fdrDetailsUpdatedAt: instrumentFdrDetails.updatedAt,

                // Tender Info fields
                tenderName: tenderInfos.tenderName,
                tenderDueDate: tenderInfos.dueDate,
                tenderStatusId: tenderInfos.status,
                tenderOrganizationId: tenderInfos.organization,
                tenderItemId: tenderInfos.item,
                tenderTeamMember: tenderInfos.teamMember,

                // Status fields
                tenderStatusName: statuses.name,

                // User fields
                requestedByName: users.name,
            })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(instrumentFdrDetails, eq(instrumentFdrDetails.instrumentId, paymentInstruments.id))
            .leftJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(users, eq(users.id, paymentRequests.requestedBy))
            .where(and(
                eq(paymentRequests.id, id),
                eq(paymentInstruments.instrumentType, 'FDR'),
                eq(paymentInstruments.isActive, true)
            ))
            .limit(1);

        if (!result) {
            throw new NotFoundException(`Payment Request with ID ${id} not found`);
        }

        let linkedCheque: any = null;
        if (result.instrumentId) {
            const [cheque] = await this.db
                .select({
                    chequeNo: instrumentChequeDetails.chequeNo,
                    chequeDate: instrumentChequeDetails.chequeDate,
                    bankName: instrumentChequeDetails.bankName,
                    amount: paymentInstruments.amount,
                    status: paymentInstruments.status,
                    favouring: paymentInstruments.favouring,
                    requestId: paymentRequests.id,
                })
                .from(instrumentChequeDetails)
                .innerJoin(paymentInstruments, eq(paymentInstruments.id, instrumentChequeDetails.instrumentId))
                .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
                .where(eq(instrumentChequeDetails.linkedFdrId, result.instrumentId))
                .limit(1);
            if (cheque) {
                linkedCheque = {
                    ...cheque,
                    chequeDate: cheque.chequeDate ? new Date(cheque.chequeDate) : null,
                };
            }
        }

        let linkedBg: any = null;
        if (result.fdrNo) {
            const [bg] = await this.db
                .select({
                    bgNo: instrumentBgDetails.bgNo,
                    bgDate: instrumentBgDetails.bgDate,
                    validityDate: instrumentBgDetails.validityDate,
                    claimExpiryDate: instrumentBgDetails.claimExpiryDate,
                    bankName: instrumentBgDetails.bankName,
                    beneficiaryName: instrumentBgDetails.beneficiaryName,
                    beneficiaryAddress: instrumentBgDetails.beneficiaryAddress,
                    cashMarginPercent: instrumentBgDetails.cashMarginPercent,
                    fdrMarginPercent: instrumentBgDetails.fdrMarginPercent,
                    stampCharges: instrumentBgDetails.stampCharges,
                    sfmsCharges: instrumentBgDetails.sfmsCharges,
                    bgPurpose: instrumentBgDetails.bgPurpose,
                    bgNeeds: instrumentBgDetails.bgNeeds,
                    courierNo: instrumentBgDetails.courierNo,
                    bgBankAcc: instrumentBgDetails.bgBankAcc,
                    bgBankIfsc: instrumentBgDetails.bgBankIfsc,
                    status: paymentInstruments.status,
                    amount: paymentInstruments.amount,
                    instrumentId: paymentInstruments.id,
                })
                .from(instrumentBgDetails)
                .innerJoin(paymentInstruments, eq(paymentInstruments.id, instrumentBgDetails.instrumentId))
                .where(eq(instrumentBgDetails.fdrNo, result.fdrNo))
                .limit(1);
            if (bg) {
                linkedBg = {
                    ...bg,
                    bgDate: bg.bgDate ? new Date(bg.bgDate) : null,
                    validityDate: bg.validityDate ? new Date(bg.validityDate) : null,
                    claimExpiryDate: bg.claimExpiryDate ? new Date(bg.claimExpiryDate) : null,
                    cashMarginPercent: bg.cashMarginPercent ? Number(bg.cashMarginPercent) : null,
                    fdrMarginPercent: bg.fdrMarginPercent ? Number(bg.fdrMarginPercent) : null,
                    stampCharges: bg.stampCharges ? Number(bg.stampCharges) : null,
                    sfmsCharges: bg.sfmsCharges ? Number(bg.sfmsCharges) : null,
                    amount: bg.amount ? Number(bg.amount) : null,
                };
            }
        }

        let courierDetails: any = null;
        if (result.reqNo) {
            const courierId = Number(result.reqNo);
            if (!isNaN(courierId)) {
                const [courier] = await this.db
                    .select()
                    .from(couriers)
                    .where(eq(couriers.id, courierId))
                    .limit(1);
                if (courier) {
                    const courierStatusLabels = ['Pending', 'In Transit', 'Dispatched', 'Not Delivered', 'Delivered', 'Rejected'];
                    courierDetails = {
                        id: courier.id,
                        toOrg: courier.toOrg,
                        toName: courier.toName,
                        toAddr: courier.toAddr,
                        toPin: courier.toPin,
                        toMobile: courier.toMobile,
                        empFrom: courier.empFrom,
                        delDate: courier.delDate,
                        urgency: courier.urgency,
                        trackingNumber: courier.trackingNumber,
                        courierProvider: courier.courierProvider,
                        docketNo: courier.docketNo,
                        docketSlip: courier.docketSlip,
                        courierDocs: courier.courierDocs,
                        deliveryPod: courier.deliveryPod,
                        deliveryDate: courier.deliveryDate,
                        pickupDate: courier.pickupDate,
                        status: courier.status,
                        courierStatusName: courier.status != null ? (courierStatusLabels[courier.status] || 'Unknown') : 'Unknown',
                    };
                }
            }
        }

        const parseDocPaths = (value: unknown): string[] => {
            if (!value) return [];
            if (Array.isArray(value)) {
                return value.filter((entry): entry is string => typeof entry === 'string');
            }
            if (typeof value === 'string') {
                try {
                    const parsed = JSON.parse(value);
                    if (Array.isArray(parsed)) {
                        return parsed.filter((entry): entry is string => typeof entry === 'string');
                    }
                } catch {
                    // Not JSON — treat as a single path.
                }
                return [value];
            }
            return [];
        };

        return {
            ...result,
            linkedCheque,
            linkedBg,
            fdrStatus: this.deriveFdrStatus(result.status, result.fdrNo),
            rejectionReason: result.rejectionReason,
            roi: result.roi != null ? Number(result.roi) : null,
            marginPercent: result.marginPercent != null ? Number(result.marginPercent) : null,
            prefilledSignedFdr: parseDocPaths(result.prefilledSignedFdr),
            uploadDocuments: result.uploadDocuments ?? null,
            fdrCopy: parseDocPaths(result.fdrCopy),
            bankMailIds: (result.bankMailIds as string[] | null) ?? [],
            bankMailIdsCc: (result.bankMailIdsCc as string[] | null) ?? [],
            courierDetails,
            deliverBy: result.courierDeadline != null
                ? (result.courierDeadline === -1 ? 'Tender Due Date'
                    : result.courierDeadline === 24 ? '24 Hours'
                    : result.courierDeadline === 48 ? '48 Hours'
                    : `${result.courierDeadline} Hours`)
                : null,
            hasAccountsFormData: result.action != null && result.action >= 1,
            hasReturnedData: result.action != null && result.action >= 3,
            hasSettledData: result.action === 4 || result.action === 7,
        };
    }

    async getActionFormData(id: number) {
        const [result] = await this.db
            .select({
                id: paymentInstruments.id,
                action: paymentInstruments.action,
                status: paymentInstruments.status,
                rejectionReason: paymentInstruments.rejectionReason,
                amount: paymentInstruments.amount,
                favouring: paymentInstruments.favouring,
                payableAt: paymentInstruments.payableAt,
                issueDate: paymentInstruments.issueDate,
                expiryDate: paymentInstruments.expiryDate,
                utr: paymentInstruments.utr,
                docketNo: paymentInstruments.docketNo,
                courierAddress: paymentInstruments.courierAddress,
                courierAddressJson: paymentInstruments.courierAddressJson,
                courierDeadline: paymentInstruments.courierDeadline,
                generatedPdf: paymentInstruments.generatedPdf,
                cancelPdf: paymentInstruments.cancelPdf,
                docketSlip: paymentInstruments.docketSlip,
                tenderNo: paymentRequests.tenderNo,
                tenderName: paymentRequests.projectName,
                tenderId: paymentRequests.tenderId,
                requestCreatedAt: paymentRequests.createdAt,
                fdrNo: instrumentFdrDetails.fdrNo,
                fdrDate: instrumentFdrDetails.fdrDate,
                fdrSource: instrumentFdrDetails.fdrSource,
                fdrPurpose: instrumentFdrDetails.fdrPurpose,
                fdrExpiryDate: instrumentFdrDetails.fdrExpiryDate,
                fdrNeeds: instrumentFdrDetails.fdrNeeds,
                fdrRemark: instrumentFdrDetails.fdrRemark,
                prefilledSignedFdr: instrumentFdrDetails.prefilledSignedFdr,
                uploadDocuments: instrumentFdrDetails.uploadDocuments,
                fdrRoi: instrumentFdrDetails.roi,
                marginPercent: instrumentFdrDetails.marginPercent,
                fdrCopy: instrumentFdrDetails.fdrCopy,
                bankMailIds: instrumentFdrDetails.bankMailIds,
                bankMailIdsCc: instrumentFdrDetails.bankMailIdsCc,
                legacyData: paymentInstruments.legacyData,
                reqNo: paymentInstruments.reqNo,
                tenderStatusName: statuses.name,
            })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(instrumentFdrDetails, eq(instrumentFdrDetails.instrumentId, paymentInstruments.id))
            .leftJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .where(and(
                eq(paymentInstruments.id, id),
                eq(paymentInstruments.instrumentType, 'FDR'),
                eq(paymentInstruments.isActive, true)
            ))
            .limit(1);

        if (!result) {
            throw new NotFoundException(`Payment Instrument with ID ${id} not found`);
        }

        const hasAccountsFormData = result.action != null && result.action >= 1;
        const hasReturnedData = result.action != null && result.action >= 3;
        const hasSettledData = result.action === 4 || result.action === 7;

        let linkedChequeData: any = null;
        {
            const [cheque] = await this.db
                .select({
                    chequeNo: instrumentChequeDetails.chequeNo,
                    amount: paymentInstruments.amount,
                    status: paymentInstruments.status,
                    requestId: paymentInstruments.id,
                })
                .from(instrumentChequeDetails)
                .innerJoin(paymentInstruments, eq(paymentInstruments.id, instrumentChequeDetails.instrumentId))
                .where(eq(instrumentChequeDetails.linkedFdrId, id))
                .limit(1);
            if (cheque) {
                linkedChequeData = cheque;
            }
        }

        let linkedBgData: any = null;
        if (result.fdrNo) {
            const fdrNo = result.fdrNo;
            if (fdrNo) {
                const [bg] = await this.db
                    .select({
                        bgNo: instrumentBgDetails.bgNo,
                        bankName: instrumentBgDetails.bankName,
                        status: paymentInstruments.status,
                        instrumentId: paymentInstruments.id,
                    })
                    .from(instrumentBgDetails)
                    .innerJoin(paymentInstruments, eq(paymentInstruments.id, instrumentBgDetails.instrumentId))
                    .where(eq(instrumentBgDetails.fdrNo, fdrNo))
                    .limit(1);
                if (bg) {
                    linkedBgData = bg;
                }
            }
        }

        let courierDetails: any = null;
        if (result.reqNo) {
            const courierId = Number(result.reqNo);
            if (!isNaN(courierId)) {
                const [courier] = await this.db
                    .select()
                    .from(couriers)
                    .where(eq(couriers.id, courierId))
                    .limit(1);
                if (courier) {
                    const courierStatusLabels = ['Pending', 'In Transit', 'Dispatched', 'Not Delivered', 'Delivered', 'Rejected'];
                    courierDetails = {
                        id: courier.id,
                        toOrg: courier.toOrg,
                        toName: courier.toName,
                        toAddr: courier.toAddr,
                        toPin: courier.toPin,
                        toMobile: courier.toMobile,
                        empFrom: courier.empFrom,
                        delDate: courier.delDate,
                        urgency: courier.urgency,
                        trackingNumber: courier.trackingNumber,
                        courierProvider: courier.courierProvider,
                        docketNo: courier.docketNo,
                        docketSlip: courier.docketSlip,
                        courierDocs: courier.courierDocs,
                        deliveryPod: courier.deliveryPod,
                        deliveryDate: courier.deliveryDate,
                        pickupDate: courier.pickupDate,
                        status: courier.status,
                        courierStatusName: courier.status != null ? (courierStatusLabels[courier.status] || 'Unknown') : 'Unknown',
                    };
                }
            }
        }

        const legacyData = (result.legacyData as Record<string, any> | null) ?? {};
        let prefilledSignedFdr: string[] = [];
        const rawPrefilled = result.prefilledSignedFdr ?? legacyData.prefilled_signed_fdr;
        if (rawPrefilled) {
            try {
                const parsed = typeof rawPrefilled === 'string' ? JSON.parse(rawPrefilled) : rawPrefilled;
                if (Array.isArray(parsed)) prefilledSignedFdr = parsed.filter((entry): entry is string => typeof entry === 'string');
            } catch {
                prefilledSignedFdr = [];
            }
        }

        return {
            id: result.id,
            action: result.action,
            fdrStatus: this.deriveFdrStatus(result.status),
            fdrReq: result.rejectionReason
                ? 'Rejected'
                : result.status === FDR_STATUSES.PENDING
                    ? null
                    : 'Accepted',
            rejectionReason: result.rejectionReason,
            tenderNo: result.tenderNo,
            tenderName: result.tenderName,
            tenderId: result.tenderId,
            requestCreatedAt: result.requestCreatedAt ? result.requestCreatedAt.toISOString() : null,
            amount: result.amount ? Number(result.amount) : null,
            favouring: result.favouring,
            payableAt: result.payableAt,
            issueDate: result.issueDate ? new Date(result.issueDate) : null,
            expiryDate: result.expiryDate ? new Date(result.expiryDate) : null,
            fdrNo: result.fdrNo,
            fdrDate: result.fdrDate ? new Date(result.fdrDate) : null,
            tenderStatusName: result.tenderStatusName,
            fdrSource: result.fdrSource,
            fdrPurpose: result.fdrPurpose,
            fdrExpiryDate: result.fdrExpiryDate ? new Date(result.fdrExpiryDate) : null,
            fdrNeeds: result.fdrNeeds,
            fdrRemark: result.fdrRemark,
            fdrRoi: result.fdrRoi != null ? Number(result.fdrRoi) : null,
            marginPercent: result.marginPercent != null ? Number(result.marginPercent) : null,
            fdrCopy: (() => {
                if (!result.fdrCopy) return [];
                try {
                    const parsed = JSON.parse(result.fdrCopy);
                    return Array.isArray(parsed) ? parsed : [result.fdrCopy];
                } catch {
                    return [result.fdrCopy];
                }
            })(),
            prefilledSignedFdr,
            uploadDocuments: result.uploadDocuments,
            bankMailIds: (result.bankMailIds as string[] | null) ?? [],
            bankMailIdsCc: (result.bankMailIdsCc as string[] | null) ?? [],
            reqNo: result.reqNo,
            courierDetails,
            courierAddress: result.courierAddress,
            courierAddressJson: result.courierAddressJson as Record<string, any> | null,
            courierDeadline: result.courierDeadline ? Number(result.courierDeadline) : null,
            deliverBy: result.courierDeadline != null
                ? (result.courierDeadline === -1 ? 'Tender Due Date'
                    : result.courierDeadline === 24 ? '24 Hours'
                    : result.courierDeadline === 48 ? '48 Hours'
                    : `${result.courierDeadline} Hours`)
                : null,
            utr: result.utr,
            docketNo: result.docketNo,
            generatedPdf: result.generatedPdf,
            cancelPdf: result.cancelPdf,
            docketSlip: result.docketSlip,
            hasAccountsFormData,
            hasReturnedData,
            hasSettledData,
            linkedCheque: linkedChequeData,
            linkedBg: linkedBgData,
        };
    }

    async getMailPreview(
        instrumentId: number,
        body: { stage?: number | string; files?: Record<string, string[]> } = {},
    ) {
        const stage = Number(body.stage);
        if (![1, 2].includes(stage)) {
            throw new BadRequestException('mail-preview stage must be 1 or 2');
        }

        return this.notificationService.getFdrMailPreview(instrumentId, stage, body.files ?? {});
    }

    async getFollowupData(instrumentId: number) {
        const [result] = await this.db
            .select({
                id: followUps.id,
                emdId: followUps.emdId,
                partyName: followUps.partyName,
                area: followUps.area,
                amount: followUps.amount,
                contacts: followUps.contacts,
                frequency: followUps.frequency,
                startFrom: followUps.startFrom,
                nextFollowUpDate: followUps.nextFollowUpDate,
                stopReason: followUps.stopReason,
                proofText: followUps.proofText,
                stopRemarks: followUps.stopRemarks,
                proofImagePath: followUps.proofImagePath,
                assignmentStatus: followUps.assignmentStatus,
                createdAt: followUps.createdAt,
            })
            .from(followUps)
            .where(and(
                eq(followUps.emdId, instrumentId),
                isNull(followUps.deletedAt)
            ))
            .orderBy(desc(followUps.createdAt))
            .limit(1);

        if (!result) {
            return null;
        }

        return {
            id: result.id,
            organisationName: result.partyName,
            area: result.area,
            amount: result.amount ? Number(result.amount) : null,
            contacts: result.contacts || [],
            frequency: result.frequency,
            followupStartDate: result.startFrom ? new Date(result.startFrom) : null,
            nextFollowUpDate: result.nextFollowUpDate ? new Date(result.nextFollowUpDate) : null,
            stopReason: result.stopReason,
            proofText: result.proofText,
            stopRemarks: result.stopRemarks,
            proofImagePath: result.proofImagePath,
            assignmentStatus: result.assignmentStatus,
            createdAt: result.createdAt,
        };
    }
}
