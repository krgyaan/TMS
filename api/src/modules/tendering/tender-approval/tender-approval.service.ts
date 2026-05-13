import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import type { TenderApprovalPayload } from '@/modules/tendering/tender-approval/dto/tender-approval.dto';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { eq, and, asc, desc, sql, or, inArray, isNull, SQL, ne, notInArray } from 'drizzle-orm';
import { tenderInformation } from '@db/schemas/tendering/tender-info-sheet.schema';
import { paymentRequests, paymentInstruments } from '@db/schemas/tendering/payment-requests.schema';
import { users } from '@db/schemas/auth/users.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { items } from '@db/schemas/master/items.schema';
import { tenderIncompleteFields } from '@db/schemas/tendering/tender-incomplete-fields.schema';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import type { PaginatedResult } from '@/modules/tendering/types/shared.types';
import { TenderStatusHistoryService } from '@/modules/tendering/tender-status-history/tender-status-history.service';
import { EmailService } from '@/modules/email/email.service';
import { RecipientResolver } from '@/modules/email/recipient.resolver';
import type { RecipientSource } from '@/modules/email/dto/send-email.dto';
import { Logger } from '@nestjs/common';
import { wrapPaginatedResponse } from '@/utils/responseWrapper';
import { TimersService } from '@/modules/timers/timers.service';
import { TenderInfoSheetsService } from '../info-sheets/info-sheets.service';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { pqrDocuments } from '@db/schemas/shared/pqr.schema';
import { financeDocuments } from '@db/schemas/shared/finance_docs.schema';
import { vendorOrganizations } from '@db/schemas/vendors/vendor-organizations.schema';
import { bidSubmissions } from '@/db/schemas';

export type TenderApprovalFilters = {
    tlStatus?: "0" | "1" | "2" | "3" | number;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    search?: string;
};

type TenderRow = {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    item: number;
    gstValues: number;
    tenderFees: number;
    emd: number;
    teamMember: number;
    dueDate: Date;
    status: number;
    teamMemberName: string;
    itemName: string;
    statusName: string;
    tlStatus: string | number;
    statusRemark?: string | null;
    rejectReason?: number | null;
    rejectRemarks?: string | null;
    teRecommendation: string | null;
};

export const rejectedStatuses = [9, 10, 11, 12, 13, 14, 15, 31, 32];

@Injectable()
export class TenderApprovalService {
    private readonly logger = new Logger(TenderApprovalService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
        private readonly tenderStatusHistoryService: TenderStatusHistoryService,
        private readonly emailService: EmailService,
        private readonly recipientResolver: RecipientResolver,
        private readonly timersService: TimersService,
        private readonly tenderInfoSheetsService: TenderInfoSheetsService,
        private readonly configService: ConfigService
    ) {}

    private buildRoleFilterConditions(user?: ValidatedUser, teamId?: number): any[] {
        const roleFilterConditions: any[] = [];

        if (user && user.roleId) {
            if (user.roleId === 1 || user.roleId === 2) {
                // Super User or Admin: Show all, respect teamId filter if provided
                if (teamId !== undefined && teamId !== null) {
                    roleFilterConditions.push(eq(tenderInfos.team, teamId));
                }
            } else if (user.roleId === 3 || user.roleId === 4 || user.roleId === 6) {
                // Team Leader, Coordinator, Engineer: Filter by primary_team_id
                if (user.teamId) {
                    roleFilterConditions.push(eq(tenderInfos.team, user.teamId));
                } else {
                    roleFilterConditions.push(sql`1 = 0`); // Empty results
                }
            } else {
                if (teamId !== undefined && teamId !== null) {
                    roleFilterConditions.push(eq(tenderInfos.team, teamId));
                } else if (user.sub) {
                    roleFilterConditions.push(eq(tenderInfos.teamMember, user.sub));
                } else {
                    roleFilterConditions.push(sql`1 = 0`); // Empty results
                }
            }
        } else {
            // No user provided - return empty for security
            roleFilterConditions.push(sql`1 = 0`);
        }

        return roleFilterConditions;
    }

    private getDefaultSortByTab(tab: string): SQL<unknown> {
        switch (tab) {
            case "pending":
                // Soonest due date first, NULLs last
                return sql`${tenderInfos.dueDate} ASC NULLS LAST`;

            case "accepted":
                // Latest due date first (most recently due accepted tenders)
                return sql`${tenderInfos.dueDate} DESC NULLS LAST`;

            case "rejected":
                // Latest due date first (most recently due rejected tenders)
                return sql`${tenderInfos.dueDate} DESC NULLS LAST`;

            case "rejected_later":
                // Latest due date first (most recently due rejected tenders)
                return sql`${tenderInfos.dueDate} DESC NULLS LAST`;

            case "tender-dnb":
                // Latest due date first
                return sql`${tenderInfos.dueDate} DESC NULLS LAST`;

            default:
                return sql`${tenderInfos.dueDate} ASC NULLS LAST`;
        }
    }

    async getDashboardData(
        user?: ValidatedUser,
        teamId?: number,
        tabKey?: "pending" | "accepted" | "rejected" | "rejected_later" |"tender-dnb",
        filters?: { page?: number; limit?: number; sortBy?: string; sortOrder?: "asc" | "desc"; search?: string }
    ): Promise<PaginatedResult<TenderRow>> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        const activeTab = tabKey || "pending";

        // Validate tab key
        if (!["pending", "accepted", "rejected", "rejected_later" ,"tender-dnb" ].includes(activeTab)) {
            throw new BadRequestException(`Invalid tab: ${activeTab}`);
        }

        // Base conditions for all tabs
        const baseConditions = [
            TenderInfosService.getActiveCondition(),
            // TenderInfosService.getExcludeStatusCondition(['lost']),
        ];

        // Apply role-based filtering
        const roleFilterConditions = this.buildRoleFilterConditions(user, teamId);

        // Tab-specific conditions
        let tabConditions: any[] = [];
        tabConditions.push(...roleFilterConditions);
        if (activeTab === "pending") {
            tabConditions.push(
                or(eq(tenderInfos.tlStatus, 0), eq(tenderInfos.tlStatus, 3), isNull(tenderInfos.tlStatus)),
                or(ne(bidSubmissions.status, "Tender Missed"), isNull(bidSubmissions.status))
            );
        } else if (activeTab === "accepted") {
            tabConditions.push(eq(tenderInfos.tlStatus, 1), or(ne(bidSubmissions.status, "Tender Missed"), isNull(bidSubmissions.status)));
        } else if (activeTab === "rejected") {
            tabConditions.push(eq(tenderInfos.tlStatus, 2), or(ne(bidSubmissions.status, "Tender Missed"), isNull(bidSubmissions.status)));
        } else if(activeTab === "rejected_later"){
            tabConditions.push(and(
                eq(bidSubmissions.status, "Tender Missed"),
                inArray(bidSubmissions.reasonStatus, [10, 14, 35]) 
            ))        
        }
        else if (activeTab === "tender-dnb") {
            // tabConditions.push(inArray(tenderInfos.status, [8, 34]), inArray(tenderInfos.tlStatus, [1, 2, 3]));
            tabConditions.push(and(
                eq(bidSubmissions.status, "Tender Missed"),
                or(
                    notInArray(bidSubmissions.reasonStatus,[10, 14, 35]),
                    isNull(bidSubmissions.reasonStatus)
                )
            ));
        }

        // Search conditions
        if (filters?.search) {
            const searchStr = `%${filters.search}%`;
            tabConditions.push(
                sql`(
                    ${tenderInfos.tenderName} ILIKE ${searchStr} OR
                    ${tenderInfos.tenderNo} ILIKE ${searchStr} OR
                    ${tenderInfos.gstValues}::text ILIKE ${searchStr} OR
                    ${tenderInfos.dueDate}::text ILIKE ${searchStr} OR
                    ${users.name} ILIKE ${searchStr} OR
                    ${items.name} ILIKE ${searchStr} OR
                    ${tenderInformation.teRejectionRemarks} ILIKE ${searchStr}
                )`
            );
        }

        const allConditions = [...baseConditions, ...tabConditions];
        const whereClause = and(...allConditions);

        // Build orderBy clause based on tab
        let orderByClause: SQL<unknown>;

        if (filters?.sortBy) {
            // User-specified sorting takes priority
            const sortFn = filters.sortOrder === "desc" ? desc : asc;
            switch (filters.sortBy) {
                case "tenderNo":
                    orderByClause = sortFn(tenderInfos.tenderNo);
                    break;
                case "tenderName":
                    orderByClause = sortFn(tenderInfos.tenderName);
                    break;
                case "teamMemberName":
                    orderByClause = sortFn(users.name);
                    break;
                case "dueDate":
                    orderByClause = sortFn(tenderInfos.dueDate);
                    break;
                case "gstValues":
                    orderByClause = sortFn(tenderInfos.gstValues);
                    break;
                case "itemName":
                    orderByClause = sortFn(items.name);
                    break;
                case "statusName":
                    orderByClause = sortFn(statuses.name);
                    break;
                case "tlStatus":
                    orderByClause = sortFn(tenderInfos.tlStatus);
                    break;
                default:
                    orderByClause = this.getDefaultSortByTab(activeTab);
            }
        } else {
            // Default sorting based on tab
            orderByClause = this.getDefaultSortByTab(activeTab);
        }

        // Build query
        const query = this.db
            .select({
                tenderId: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                item: tenderInfos.item,
                gstValues: tenderInfos.gstValues,
                tenderFees: tenderInfos.tenderFees,
                emd: tenderInfos.emd,
                teamMember: tenderInfos.teamMember,
                dueDate: tenderInfos.dueDate,
                status: tenderInfos.status,
                tlStatus: tenderInfos.tlStatus,
                teamMemberName: users.name,
                itemName: items.name,
                statusName: statuses.name,
                teRecommendation: tenderInformation.teRecommendation,
                rejectReason: tenderInformation.teRejectionReason,
                rejectRemarks: tenderInformation.teRejectionRemarks,
            })
            .from(tenderInfos)
            .leftJoin(users, eq(tenderInfos.teamMember, users.id))
            .leftJoin(statuses, eq(tenderInfos.status, statuses.id))
            .leftJoin(items, eq(tenderInfos.item, items.id))
            .leftJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
            .innerJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id))
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset);
        // Execute query
        const rows = (await query) as unknown as TenderRow[];

        // Get total count
        let countQuery: any = this.db
            .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
            .from(tenderInfos)
            .leftJoin(users, eq(tenderInfos.teamMember, users.id))
            .leftJoin(statuses, eq(tenderInfos.status, statuses.id))
            .leftJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
            .leftJoin(items, eq(tenderInfos.item, items.id))
            .innerJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id));

        // Add search joins to count query if search is used
        if (filters?.search) {
            // Joins already added above
        }

        const [countResult] = await countQuery.where(whereClause);
        const total = Number(countResult?.count || 0);

        return wrapPaginatedResponse(rows, total, page, limit);
    }

    async getCounts(user?: ValidatedUser, teamId?: number) {
        const roleFilterConditions = this.buildRoleFilterConditions(user, teamId);

        // Base conditions for all tabs
        const baseConditions = [
            TenderInfosService.getActiveCondition(),
            // TenderInfosService.getExcludeStatusCondition(['lost']),
            ...roleFilterConditions,
        ];

        // Build conditions for each tab
        const pendingConditions = [
            ...baseConditions,
            or(eq(tenderInfos.tlStatus, 0), eq(tenderInfos.tlStatus, 3), isNull(tenderInfos.tlStatus)),
            or(ne(bidSubmissions.status, "Tender Missed"), isNull(bidSubmissions.status)),
            ,
        ];
        
        const acceptedConditions = [...baseConditions, eq(tenderInfos.tlStatus, 1), or(ne(bidSubmissions.status, "Tender Missed"), isNull(bidSubmissions.status))];
        
        const rejectedConditions = [...baseConditions, eq(tenderInfos.tlStatus, 2), or(ne(bidSubmissions.status, "Tender Missed"), isNull(bidSubmissions.status))];
        
        const tenderDnbConditions = [...baseConditions, eq(bidSubmissions.status, "Tender Missed") , or(notInArray(bidSubmissions.reasonStatus, [10,15,35]) , isNull(bidSubmissions.reasonStatus))];
        
        const tenderRejectedLaterCounts = [...baseConditions, eq(bidSubmissions.status, "Tender Missed"), inArray(bidSubmissions.reasonStatus, [10, 14, 35])];
        
        


        // const tenderDnbConditions = [...baseConditions, inArray(tenderInfos.status, [8, 34]), inArray(tenderInfos.tlStatus, [1, 2, 3])];
        // ---------------------------- NEW LOGIC TO GET MISSED BIDS -------------------------------//

        // Count for each tab
        const [pendingCount, acceptedCount, rejectedCount, rejectedLaterCount, tenderDnbCount] = await Promise.all([
            this.countTabItems(and(...pendingConditions)),
            this.countTabItems(and(...acceptedConditions)),
            this.countTabItems(and(...rejectedConditions)),
            this.countTabItems(and(...tenderRejectedLaterCounts)),
            this.countTabItems(and(...tenderDnbConditions)),
        ]);

        return {
            pending: pendingCount,
            accepted: acceptedCount,
            rejected: rejectedCount,
            rejected_later: rejectedLaterCount,
            "tender-dnb": tenderDnbCount,
            total: pendingCount + acceptedCount + rejectedCount + tenderDnbCount,
        };
    }

    private async countTabItems(whereClause: any): Promise<number> {
        const countQuery = this.db
            .select({ count: sql<number>`count(*)` })
            .from(tenderInfos)
            .leftJoin(users, eq(tenderInfos.teamMember, users.id))
            .leftJoin(statuses, eq(tenderInfos.status, statuses.id))
            .leftJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
            .leftJoin(items, eq(tenderInfos.item, items.id))
            .innerJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id))
            .where(whereClause);

        const [result] = await countQuery;
        return Number(result?.count || 0);
    }

    async getByTenderId(tenderId: number) {
        // Validate tender exists first
        await this.tenderInfosService.validateExists(tenderId);

        const result = await this.db
            .select({
                tlStatus: tenderInfos.tlStatus,
                rfqRequired: tenderInfos.rfqRequired,
                quotationFiles: tenderInfos.quotationFiles,
                rfqTo: tenderInfos.rfqTo,
                processingFeeMode: tenderInfos.processingFeeMode,
                tenderFeeMode: tenderInfos.tenderFeeMode,
                emdMode: tenderInfos.emdMode,
                approvePqrSelection: tenderInfos.approvePqrSelection,
                approveFinanceDocSelection: tenderInfos.approveFinanceDocSelection,
                tenderStatus: tenderInfos.status,
                statusName: statuses.name,
                oemNotAllowed: tenderInfos.oemNotAllowed,
                tlRejectionRemarks: tenderInfos.tlRejectionRemarks,
                tlIncompleteRemarks: tenderInfos.tlIncompleteRemarks,
                tlApprovalRemarks: tenderInfos.tlApprovalRemarks,
                tlApprovalTimestamp: tenderInfos.tlApprovalTimestamp,
            })
            .from(tenderInfos)
            .leftJoin(statuses, eq(tenderInfos.status, statuses.id))
            .leftJoin(vendorOrganizations, sql`${tenderInfos.oemNotAllowed} = ${vendorOrganizations.id}::varchar`)
            .leftJoin(tenderInformation, eq(tenderInfos.id, tenderInformation.tenderId))
            .where(eq(tenderInfos.id, tenderId))
            .limit(1);

        if (!result.length) {
            return null;
        }

        const data = result[0] as {
            tlStatus: number;
            rfqRequired: string | null;
            quotationFiles: string | null;
            rfqTo: string | null;
            processingFeeMode: string | null;
            tenderFeeMode: string | null;
            emdMode: string | null;
            approvePqrSelection: string | null;
            approveFinanceDocSelection: string | null;
            tenderStatus: number;
            statusName: string;
            oemNotAllowed: string[] | null;
            tlRejectionRemarks: string | null;
            tlIncompleteRemarks: string | null;
        };

        let vendorOrganizationNames: { name: string }[] = [];
        let vendorOrganizationIds: number[] = [];

        if (data.rfqTo) {
            vendorOrganizationIds = data.rfqTo
                .split(",")
                .map(id => parseInt(id.trim(), 10))
                .filter(id => Number.isInteger(id) && id > 0);

            if (vendorOrganizationIds.length > 0) {
                vendorOrganizationNames = await this.db
                    .select({ name: vendorOrganizations.name })
                    .from(vendorOrganizations)
                    .where(inArray(vendorOrganizations.id, vendorOrganizationIds));
            }
        }

        // Parse quotationFiles from JSON string if present
        let quotationFilesArray: string[] = [];
        if (data.quotationFiles) {
            try {
                quotationFilesArray = JSON.parse(data.quotationFiles);
            } catch (e) {
                // If parsing fails, treat as empty array
                quotationFilesArray = [];
            }
        }

        // Fetch incomplete fields
        const incompleteFieldsResult = await this.db
            .select({
                id: tenderIncompleteFields.id,
                fieldName: tenderIncompleteFields.fieldName,
                comment: tenderIncompleteFields.comment,
                status: tenderIncompleteFields.status,
            })
            .from(tenderIncompleteFields)
            .where(eq(tenderIncompleteFields.tenderId, tenderId));

        // Fetch OEM names for oemNotAllowed array
        let oemNotAllowedNames: string[] = [];
        if (data.oemNotAllowed && data.oemNotAllowed.length > 0) {
            const oemOrgIds = data.oemNotAllowed.map(id => parseInt(id, 10)).filter(id => Number.isInteger(id) && id > 0);

            if (oemOrgIds.length > 0) {
                const oemNames = await this.db.select({ name: vendorOrganizations.name }).from(vendorOrganizations).where(inArray(vendorOrganizations.id, oemOrgIds));
                oemNotAllowedNames = oemNames.map(o => o.name);
            }
        }

        return {
            ...data,
            rfqTo: vendorOrganizationIds,
            rfqToName: vendorOrganizationNames.map(v => v.name).join(", "),
            quotationFiles: quotationFilesArray,
            incompleteFields: incompleteFieldsResult,
            oemNotAllowed: data.oemNotAllowed || [],
            oemNotAllowedName: oemNotAllowedNames.length > 0 ? oemNotAllowedNames.join(", ") : null,
        };
    }

    async getByTenderIdWithDetails(tenderId: number) {
        const [approvalData, tenderDetails] = await Promise.all([this.getByTenderId(tenderId), this.tenderInfosService.getTenderForApproval(tenderId)]);

        return {
            ...approvalData,
            tender: tenderDetails,
        };
    }

    async updateApproval(tenderId: number, payload: TenderApprovalPayload, changedBy: number) {
        console.log('[updateApproval] START', { tenderId, payload, changedBy });
        
        const currentTender = await this.tenderInfosService.findById(tenderId);
        console.log('[updateApproval] currentTender fetched', { tenderId: currentTender?.id, tlStatus: currentTender?.tlStatus });
        
        if (!currentTender) throw new Error("Tender not found");
        const prevStatus = currentTender.status;
        const isEditMode = String(currentTender?.tlStatus) === payload.tlStatus;
        
        console.log('[updateApproval] Mode check', { prevStatus, isEditMode, payloadTlStatus: payload.tlStatus });

        const { newStatus, statusComment, updateData } = await this.buildApprovalUpdateData(tenderId, payload, isEditMode);
        console.log('[updateApproval] buildApprovalUpdateData done', { newStatus, statusComment, updateDataKeys: Object.keys(updateData) });

        await this.db.transaction(async tx => {
            console.log('[updateApproval] Transaction started');
            
            await tx.update(tenderInfos).set(updateData).where(eq(tenderInfos.id, tenderId)).returning();
            console.log('[updateApproval] Tender updated');

            if (isEditMode && payload.tlStatus === "1" && currentTender) {
                console.log('[updateApproval] Checking payment mode changes', { 
                    currentEmdMode: currentTender.emdMode, 
                    newEmdMode: payload.emdMode,
                    currentTenderFeeMode: currentTender.tenderFeeMode,
                    newTenderFeeMode: payload.tenderFeeMode,
                    currentProcessingFeeMode: currentTender.processingFeeMode,
                    newProcessingFeeMode: payload.processingFeeMode
                });
                await this.handlePaymentModeChanges(tx, tenderId, currentTender, payload);
            }

            if (payload.tlStatus === "1" && payload.emdMode === 'exempt') {
                console.log('[updateApproval] Handling exempt EMD');
                await this.handleExemptEmd(tx, tenderId);
            }

            if (newStatus !== null && newStatus !== prevStatus) {
                console.log('[updateApproval] Tracking status change', { newStatus, prevStatus, statusComment });
                await this.tenderStatusHistoryService.trackStatusChange(tenderId, newStatus, changedBy, prevStatus, statusComment, tx);
            }
            
            console.log('[updateApproval] Transaction committed');
        });
        
        console.log('[updateApproval] END');
    }

    private async buildApprovalUpdateData(tenderId: number, payload: TenderApprovalPayload, isEditMode: boolean) {
        console.log('[buildApprovalUpdateData] START', { tenderId, tlStatus: payload.tlStatus, isEditMode });
        
        const updateData: any = { tlStatus: payload.tlStatus, updatedAt: new Date() };
        let newStatus: number | null = null;
        let statusComment = '';

        if (payload.tlStatus !== "3") {
            await this.db.delete(tenderIncompleteFields).where(eq(tenderIncompleteFields.tenderId, tenderId));
            console.log('[buildApprovalUpdateData] Cleared incomplete fields');
        }

        switch (payload.tlStatus) {
            case "1":
                console.log('[buildApprovalUpdateData] Processing APPROVED status');
                Object.assign(updateData, {
                    rfqTo: payload.rfqTo?.join(",") || "",
                    rfqRequired: payload.rfqRequired ?? null,
                    quotationFiles: payload.quotationFiles ? JSON.stringify(payload.quotationFiles) : null,
                    processingFeeMode: payload.processingFeeMode ?? null,
                    tenderFeeMode: payload.tenderFeeMode ?? null,
                    emdMode: payload.emdMode ?? null,
                    approvePqrSelection: payload.approvePqrSelection ?? null,
                    approveFinanceDocSelection: payload.approveFinanceDocSelection ?? null,
                    tlApprovalRemarks: payload.tlApprovalRemarks ?? null,
                    tlRejectionRemarks: null,
                    tlIncompleteRemarks: null,
                    oemNotAllowed: null,
                    tlApprovalTimestamp: new Date(),
                });

                if (!isEditMode) {
                    updateData.status = 3;
                    newStatus = 3;
                    statusComment = "Tender info approved";
                }

                const infoSheet = await this.tenderInfoSheetsService.findByTenderId(tenderId);
                if (infoSheet) {
                    if (infoSheet.tenderValue != null) updateData.gstValues = String(infoSheet.tenderValue);
                    if (infoSheet.tenderFeeAmount != null) updateData.tenderFees = String(infoSheet.tenderFeeAmount);
                    if (infoSheet.emdAmount != null) updateData.emd = String(infoSheet.emdAmount);
                }
                break;

            case "2":
                console.log('[buildApprovalUpdateData] Processing REJECTED status');
                Object.assign(updateData, this.getClearedApprovalFields(), {
                    tlRejectionRemarks: payload.tlRejectionRemarks ?? null,
                    oemNotAllowed: payload.oemNotAllowed,
                    tlApprovalTimestamp: new Date(),
                });

                if (payload.tenderStatus && !isEditMode) {
                    updateData.status = payload.tenderStatus;
                    newStatus = payload.tenderStatus;
                    statusComment = "Tender rejected";
                }
                console.log('[buildApprovalUpdateData] Rejected status set', { newStatus, tenderStatus: payload.tenderStatus });
                break;

            case "3":
                console.log('[buildApprovalUpdateData] Processing INCOMPLETE status');
                Object.assign(updateData, this.getClearedApprovalFields(), {
                    tlIncompleteRemarks: payload.tlIncompleteRemarks ?? null,
                    tlApprovalTimestamp: null,
                    oemNotAllowed: null,
                });

                if (!isEditMode) {
                    updateData.status = 29;
                    newStatus = 29;
                    statusComment = "Tender info sheet incomplete";
                }

                await this.db.delete(tenderIncompleteFields).where(eq(tenderIncompleteFields.tenderId, tenderId));

                if (payload.incompleteFields?.length) {
                    const incompleteFieldsData = payload.incompleteFields.map(field => ({
                        tenderId,
                        fieldName: field.fieldName,
                        comment: field.comment,
                        status: "pending" as const,
                    }));
                    await this.db.insert(tenderIncompleteFields).values(incompleteFieldsData);
                }
                break;
        }

        return { newStatus, statusComment, updateData };
    }

    private getClearedApprovalFields() {
        return {
            rfqTo: null,
            rfqRequired: null,
            quotationFiles: null,
            processingFeeMode: null,
            tenderFeeMode: null,
            emdMode: null,
            approvePqrSelection: null,
            tlApprovalRemarks: null,
            approveFinanceDocSelection: null,
        };
    }

    private async handlePaymentModeChanges(
        tx: any,
        tenderId: number,
        currentTender: typeof tenderInfos.$inferSelect,
        payload: TenderApprovalPayload
    ) {
        const changedModes: ('EMD' | 'Tender Fee' | 'Processing Fee')[] = [];

        if (currentTender.emdMode !== payload.emdMode) changedModes.push('EMD');
        if (currentTender.tenderFeeMode !== payload.tenderFeeMode) changedModes.push('Tender Fee');
        if (currentTender.processingFeeMode !== payload.processingFeeMode) changedModes.push('Processing Fee');

        if (!changedModes.length) return;

        const rejectionReason = `Mode changed by TL on ${new Date().toISOString()}`;

        const requestsToReject = await tx
            .select({ id: paymentRequests.id })
            .from(paymentRequests)
            .where(and(
                eq(paymentRequests.tenderId, tenderId),
                or(...changedModes.map(mode => eq(paymentRequests.purpose, mode)))
            ));

        if (!requestsToReject.length) return;

        const requestIds = requestsToReject.map(r => r.id);

        await tx.update(paymentRequests)
            .set({ status: 'Rejected', remarks: rejectionReason })
            .where(inArray(paymentRequests.id, requestIds));

        await tx.update(paymentInstruments)
            .set({ action: 1, status: 'ACCOUNT_FORM_REJECTED', rejectionReason })
            .where(and(
                inArray(paymentInstruments.requestId, requestIds),
                eq(paymentInstruments.action, 0)
            ));
    }

    private async handleExemptEmd(tx: any, tenderId: number) {
        const requestIds = await tx
            .select({ id: paymentRequests.id })
            .from(paymentRequests)
            .where(eq(paymentRequests.tenderId, tenderId));

        if (requestIds.length) {
            const ids = requestIds.map(r => r.id);
            await tx.update(paymentInstruments)
                .set({ action: 1, status: 'ACCOUNT_FORM_REJECTED', rejectionReason: `EMD Exempted By TL on ${new Date().toISOString()}` })
                .where(and(
                    inArray(paymentInstruments.requestId, ids),
                    eq(paymentInstruments.action, 0)
                ));
        }

        await tx.update(tenderInformation)
            .set({ emdRequired: 'EXEMPT' })
            .where(eq(tenderInformation.tenderId, tenderId));
    }
    
    async getRejectionStatuses(){
        let result = this.db
            .select({id : statuses.id, name : statuses.name})
            .from(statuses)
            .where(inArray(statuses.id, rejectedStatuses));

            return result;
    }

    /**
     * Helper method to send email notifications
     */
    private async sendEmail(
        eventType: string,
        tenderId: number,
        fromUserId: number,
        subject: string,
        template: string,
        data: Record<string, any>,
        recipients: { to?: RecipientSource[]; cc?: RecipientSource[] },
        attachments?: { files: string[] }
    ) {
        try {
            await this.emailService.sendTenderEmail({
                tenderId,
                eventType,
                fromUserId: 13,
                to: recipients.to || [],
                cc: recipients.cc,
                subject,
                template,
                data,
                attachments,
            });
        } catch (error) {
            this.logger.error(`Failed to send email for tender ${tenderId}: ${error instanceof Error ? error.message : String(error)}`);
            // Don't throw - email failure shouldn't break main operation
        }
    }

    /**
     * Send approval/rejection email
     */
    private async sendApprovalEmail(tenderId: number, payload: TenderApprovalPayload, changedBy: number) {
        const tender = await this.tenderInfosService.findById(tenderId);
        if (!tender || !tender.teamMember) return;

        const assignee = await this.recipientResolver.getUserById(tender.teamMember);
        if (!assignee) return;

        // Get Team Leader name
        const teamLeaderEmails = await this.recipientResolver.getEmailsByRole("Team Leader", tender.team);
        let tlName = "Team Leader";
        let tlId = 7;
        if (teamLeaderEmails.length > 0) {
            const [tlUser] = await this.db.select({ name: users.name, id: users.id }).from(users).where(eq(users.email, teamLeaderEmails[0])).limit(1);
            if (tlUser?.name) {
                tlName = tlUser.name;
                tlId = tlUser.id;
            }
        }

        const isBidApproved = payload.tlStatus === "1";
        const isRejected = payload.tlStatus === "2";
        const isReview = payload.tlStatus === "3";

        // Generate links (TODO: Update with actual frontend URLs)
        const emdLink = `#/tendering/emds?tenderId=${tenderId}`;
        const tenderFeesLink = `#/tendering/tender-fees?tenderId=${tenderId}`;
        const rfqLink = `#/tendering/rfqs?tenderId=${tenderId}`;

        // Get vendor names from rfqTo
        let vendor = "Selected Vendors";
        if (payload.rfqRequired === "yes" && payload.rfqTo && payload.rfqTo.length > 0) {
            const vendorOrgs = await this.db.select({ name: vendorOrganizations.name }).from(vendorOrganizations).where(inArray(vendorOrganizations.id, payload.rfqTo));
            vendor = vendorOrgs.map(org => org.name).join(", ") || "Selected Vendors";
        } else if (payload.rfqTo && payload.rfqTo.length > 0) {
            vendor = `${payload.rfqTo.length} vendor(s)`;
        }

        // Fetch info sheet to get original documents
        const infoSheet = await this.tenderInfoSheetsService.findByTenderId(tenderId);

        // Get physical docs requirement
        const courierAddress = infoSheet?.courierName
            ? `${infoSheet?.courierName}, ${infoSheet?.courierPhone}, ${infoSheet?.courierAddressLine1}, ${infoSheet?.courierAddressLine2}, ${infoSheet?.courierCity}, ${infoSheet?.courierState}, ${infoSheet?.courierPincode}`
            : infoSheet?.courierAddress;
        const phyDocs = courierAddress || "As per tender requirements";

        // Fetch all PQR and Finance documents for mapping
        const [allPqrDocs, allFinanceDocs] = await Promise.all([this.db.select().from(pqrDocuments).limit(1000), this.db.select().from(financeDocuments).limit(1000)]);

        // Create maps for document lookup
        const pqrMap = new Map<number, string>();
        allPqrDocs.forEach(pqr => {
            const label = pqr.projectName ? (pqr.item ? `${pqr.projectName} - ${pqr.item}` : pqr.projectName) : `PQR ${pqr.id}`;
            pqrMap.set(pqr.id, label);
        });

        const financeMap = new Map<number, string>();
        allFinanceDocs.forEach(doc => {
            if (doc.documentName) {
                financeMap.set(doc.id, doc.documentName);
            }
        });

        // Map original technical documents from info sheet
        const mapTechnicalDocs = (docs: Array<{ id?: number; documentName: string }> | string[] | null | undefined): string[] => {
            if (!docs || !Array.isArray(docs) || docs.length === 0) return [];
            return docs
                .map(doc => {
                    if (typeof doc === "string") {
                        const docId = parseInt(doc, 10);
                        if (!isNaN(docId) && pqrMap.has(docId)) {
                            return pqrMap.get(docId)!;
                        }
                        return doc; // Return as-is if not a valid ID or not found
                    }
                    const docId = parseInt(doc.documentName, 10);
                    if (!isNaN(docId) && pqrMap.has(docId)) {
                        return pqrMap.get(docId)!;
                    }
                    return doc.documentName || "";
                })
                .filter(Boolean);
        };

        // Map original financial documents from info sheet
        const mapFinancialDocs = (docs: Array<{ id?: number; documentName: string }> | string[] | null | undefined): string[] => {
            if (!docs || !Array.isArray(docs) || docs.length === 0) return [];
            return docs
                .map(doc => {
                    if (typeof doc === "string") {
                        const docId = parseInt(doc, 10);
                        if (!isNaN(docId) && financeMap.has(docId)) {
                            return financeMap.get(docId)!;
                        }
                        return doc; // Return as-is if not a valid ID or not found
                    }
                    const docId = parseInt(doc.documentName, 10);
                    if (!isNaN(docId) && financeMap.has(docId)) {
                        return financeMap.get(docId)!;
                    }
                    return doc.documentName || "";
                })
                .filter(Boolean);
        };

        // Map alternative documents (using the same logic)
        const mapAlternativeTechnicalDocs = (ids: string[] | undefined): string[] => {
            if (!ids || !Array.isArray(ids)) return [];
            return ids
                .map(id => {
                    const docId = parseInt(id, 10);
                    if (!isNaN(docId) && pqrMap.has(docId)) {
                        return pqrMap.get(docId)!;
                    }
                    return id;
                })
                .filter(Boolean);
        };

        const mapAlternativeFinancialDocs = (ids: string[] | undefined): string[] => {
            if (!ids || !Array.isArray(ids)) return [];
            return ids
                .map(id => {
                    const docId = parseInt(id, 10);
                    if (!isNaN(docId) && financeMap.has(docId)) {
                        return financeMap.get(docId)!;
                    }
                    return id;
                })
                .filter(Boolean);
        };

        let techDocs = infoSheet?.technicalWorkOrders;
        let pqrDocs: string[] = [];
        if (techDocs && Array.isArray(techDocs)) {
            pqrDocs = techDocs
                .map(doc => {
                    const docId = typeof doc === "string" ? parseInt(doc, 10) : doc.id;
                    if (!isNaN(docId) && pqrMap.has(docId)) {
                        return pqrMap.get(docId)!;
                    }
                    return typeof doc === "string" ? doc : doc.projectName || "";
                })
                .filter(Boolean);
        }
        let finDocs = infoSheet?.commercialDocuments;
        let financeDocs: string[] = [];
        if (finDocs && Array.isArray(finDocs)) {
            financeDocs = finDocs
                .map(doc => {
                    const docId = typeof doc === "string" ? parseInt(doc, 10) : doc.id;
                    if (!isNaN(docId) && financeMap.has(docId)) {
                        return financeMap.get(docId)!;
                    }
                    return typeof doc === "string" ? doc : doc.documentName || "";
                })
                .filter(Boolean);
        }
        const originalTechnicalDocs = infoSheet ? mapTechnicalDocs(pqrDocs) : [];
        const originalFinancialDocs = infoSheet ? mapFinancialDocs(financeDocs) : [];
        const alternativeTechnicalDocNames = mapAlternativeTechnicalDocs(payload.alternativeTechnicalDocs);
        const alternativeFinancialDocNames = mapAlternativeFinancialDocs(payload.alternativeFinancialDocs);

        // Get rejection reason if rejected
        let rejectionReasonLabel = "";
        if (isRejected && payload.tenderStatus) {
            const rejectionResult = await this.db.select({ name: statuses.name }).from(statuses).where(eq(statuses.id, payload.tenderStatus)).limit(1);
            rejectionReasonLabel = rejectionResult[0]?.name || String(payload.tenderStatus);
        }

        // Get rejection proof URLs
        const rejectionProofs: string[] = [];
        if (infoSheet?.teRejectionProof && Array.isArray(infoSheet.teRejectionProof)) {
            const apiUrl = this.configService.get<string>("app.apiUrl") || "";
            infoSheet.teRejectionProof.forEach((path: string) => {
                if (path) {
                    rejectionProofs.push(`${apiUrl}/tender-files/serve/${path}`);
                }
            });
        }

        // Get review fields with current values from infoSheet
        const reviewFields: Array<{ field: string; value: string; remark: string }> = [];
        if (isReview) {
            const incompleteFieldsData = await this.db
                .select({
                    fieldName: tenderIncompleteFields.fieldName,
                    comment: tenderIncompleteFields.comment,
                })
                .from(tenderIncompleteFields)
                .where(eq(tenderIncompleteFields.tenderId, tenderId));

            const fieldLabelMap: Record<string, string> = {
                teRecommendation: "TE Recommendation",
                teRejectionReason: "Rejection Reason",
                teRejectionRemarks: "Rejection Remarks",
                processingFeeRequired: "Processing Fee Required",
                processingFeeModes: "Processing Fee Mode",
                processingFeeAmount: "Processing Fee Amount",
                tenderFeeRequired: "Tender Fee Required",
                tenderFeeModes: "Tender Fee Mode",
                tenderFeeAmount: "Tender Fee Amount",
                emdRequired: "EMD Required",
                emdModes: "EMD Mode",
                emdAmount: "EMD Amount",
                tenderValueGstInclusive: "Tender Value (GST Inclusive)",
                bidValidityDays: "Bid Validity",
                mafRequired: "MAF Required",
                commercialEvaluation: "Commercial Evaluation",
                reverseAuctionApplicable: "Reverse Auction",
                paymentTermsSupply: "Payment Terms Supply",
                paymentTermsInstallation: "Payment Terms Installation",
                deliveryTimeSupply: "Delivery Time Supply",
                deliveryTimeInstallation: "Delivery Time Installation",
                deliveryTimeInstallationInclusive: "Installation Inclusive",
                pbgRequired: "PBG Required",
                pbgForm: "PBG Form",
                pbgPercentage: "PBG Percentage",
                pbgDurationMonths: "PBG Duration",
                sdRequired: "SD Required",
                sdForm: "SD Form",
                securityDepositPercentage: "SD Percentage",
                sdDurationMonths: "SD Duration",
                ldRequired: "LD Applicable",
                ldPercentagePerWeek: "LD Per Week",
                maxLdPercentage: "Max LD Percentage",
            };

            for (const field of incompleteFieldsData) {
                const fieldName = field.fieldName;
                if (!fieldName) continue;

                const fieldLabel = fieldLabelMap[fieldName] || fieldName;
                const infoSheetAny = infoSheet as Record<string, unknown>;
                const currentValue = infoSheetAny[fieldName] !== undefined && infoSheetAny[fieldName] !== null ? String(infoSheetAny[fieldName]) : "Not filled";

                reviewFields.push({
                    field: fieldLabel,
                    value: currentValue,
                    remark: field.comment || "",
                });
            }
        }

        const status = parseInt(payload.tlStatus, 10);

        // Get document URLs for email
        const apiUrl = this.configService.get<string>("app.apiUrl") || "";

        const technicalDocUrls: Array<{ name: string; url: string }> = [];
        if (infoSheet?.technicalWorkOrders) {
            infoSheet.technicalWorkOrders.forEach((doc: any) => {
                if (doc.poDocument?.[0]) {
                    technicalDocUrls.push({
                        name: doc.projectName || `PQR ${doc.id}`,
                        url: `${apiUrl}/tender-files/serve/${doc.poDocument[0]}`,
                    });
                }
            });
        }

        const financialDocUrls: Array<{ name: string; url: string }> = [];
        if (infoSheet?.commercialDocuments) {
            infoSheet.commercialDocuments.forEach((doc: any) => {
                if (doc.documentPath?.[0]) {
                    financialDocUrls.push({
                        name: doc.documentName || `Finance Doc ${doc.id}`,
                        url: `${apiUrl}/tender-files/serve/${doc.documentPath[0]}`,
                    });
                }
            });
        }

        const quotationFileUrls: string[] = [];
        if (payload.quotationFiles && payload.quotationFiles.length > 0) {
            payload.quotationFiles.forEach((file: string) => {
                if (file) {
                    quotationFileUrls.push(`${apiUrl}/tender-files/serve/${file}`);
                }
            });
        }

        const emailData = {
            te_name: assignee.name,
            tl_name: tlName,
            status,
            tl_approval_remark: payload.tlApprovalRemarks || "",
            rejection_reason: rejectionReasonLabel,
            rejection_remark: payload.tlRejectionRemarks || "",
            rejection_proof: rejectionProofs.length > 0 ? rejectionProofs.join(", ") : "",
            review_fields: reviewFields,
            final_remarks: payload.tlIncompleteRemarks || "",
            emdLink,
            tenderFeesLink,
            rfqLink,
            processingFeeMode: payload.processingFeeMode || "Not Required",
            tenderFeesMode: payload.tenderFeeMode || "Not Required",
            emdMode: payload.emdMode || "Not Required",
            rfqRequired: payload.rfqRequired || null,
            vendor,
            courier_address: phyDocs,
            pqrApproved: payload.approvePqrSelection === "1",
            finApproved: payload.approveFinanceDocSelection === "1",
            technical_docs: originalTechnicalDocs,
            financial_docs: originalFinancialDocs,
            technical_doc_urls: technicalDocUrls,
            financial_doc_urls: financialDocUrls,
            quotation_file_urls: quotationFileUrls,
            alternativeTechnicalDocs: alternativeTechnicalDocNames.length > 0 ? alternativeTechnicalDocNames.join(", ") : "",
            alternativeFinancialDocs: alternativeFinancialDocNames.length > 0 ? alternativeFinancialDocNames.join(", ") : "",
        };

        console.log("Email Data: ", emailData);

        const template = "tender-approved-by-tl";
        let subject: string;
        let eventType: string;

        if (status === 1) {
            subject = `Tender Approved - ${tender.tenderName}`;
            eventType = "tender.approved";
        } else if (status === 3) {
            subject = `Tender Needs Review - ${tender.tenderName}`;
            eventType = "tender.review";
        } else {
            subject = `Tender Rejected - ${tender.tenderName}`;
            eventType = "tender.rejected";
        }

        await this.sendEmail(eventType, tenderId, tlId, subject, template, emailData, {
            to: [{ type: "emails", emails: ['gyan@volksenergie.in'] }],
            // to: [{ type: "user", userId: tender.teamMember }],
            // cc: [
            //     { type: "role", role: "Admin", teamId: tender.team },
            //     { type: "role", role: "Coordinator", teamId: tender.team },
            // ],
        });
    }
}
