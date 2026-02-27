import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { and, eq, asc, desc, sql, isNull, isNotNull, inArray, notInArray } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { users } from '@db/schemas/auth/users.schema';
import { items } from '@db/schemas/master/items.schema';
import { tenderInformation } from '@db/schemas/tendering/tender-info-sheet.schema';
import { tenderDocumentChecklists } from '@db/schemas/tendering/tender-document-checklists.schema';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import { CreateDocumentChecklistDto, UpdateDocumentChecklistDto } from '@/modules/tendering/checklists/dto/document-checklist.dto';
import type { PaginatedResult } from '@/modules/tendering/types/shared.types';
import { EmailService } from '@/modules/email/email.service';
import { RecipientResolver } from '@/modules/email/recipient.resolver';
import type { RecipientSource } from '@/modules/email/dto/send-email.dto';
import { Logger } from '@nestjs/common';
import { StatusCache } from '@/utils/status-cache';
import { wrapPaginatedResponse } from '@/utils/responseWrapper';
import { TimersService } from '@/modules/timers/timers.service';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

type TenderDocumentChecklistDashboardRow = {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamMemberName: string | null;
    itemName: string | null;
    statusName: string | null;
    dueDate: Date | null;
    gstValues: number;
    checklistSubmitted: boolean;
};

export type DocumentChecklistFilters = {
    tab?: "pending" | "submitted" | "tender-dnb";
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    search?: string;
};

@Injectable()
export class DocumentChecklistsService {
    private readonly logger = new Logger(DocumentChecklistsService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly emailService: EmailService,
        private readonly recipientResolver: RecipientResolver,
        private readonly tenderInfosService: TenderInfosService,
        private readonly timersService: TimersService
    ) { }

    /**
     * Get dashboard data by tab
     */
    async getDashboardData(
        tab?: 'pending' | 'submitted' | 'tender-dnb',
        filters?: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc'; search?: string },
        user?: ValidatedUser,
        teamId?: number
    ): Promise<PaginatedResult<TenderDocumentChecklistDashboardRow>> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        const activeTab = tab || "pending";

        // Build base conditions
        const baseConditions = [
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            // TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']),
        ];

        // Apply role-based filtering
        const roleFilterConditions: any[] = [];
        if (user && user.roleId) {
            // Role ID 1 = Super User, 2 = Admin, 4 = Coordinator: Show all tenders, respect teamId filter if provided
            if (user.roleId === 1 || user.roleId === 2 || user.roleId === 4) {
                // Super User or Admin or Coordinator: Show all, respect teamId filter if provided
                if (teamId !== undefined && teamId !== null) {
                    roleFilterConditions.push(eq(tenderInfos.team, teamId));
                }
                // If no teamId filter, show all (no additional condition added)
            } else if (user.roleId === 3 || user.roleId === 6) {
                // Role ID 3 = Team Leader, 6 = Engineer: Filter by primary_team_id
                if (user.teamId) {
                    roleFilterConditions.push(eq(tenderInfos.team, user.teamId));
                } else {
                    // If no teamId, return empty results (user has no team assigned)
                    roleFilterConditions.push(sql`1 = 0`); // Always false condition
                }
            } else {
                // All other roles: Show only own tenders
                if (user.sub) {
                    roleFilterConditions.push(eq(tenderInfos.teamMember, user.sub));
                } else {
                    // If no user ID, return empty results
                    roleFilterConditions.push(sql`1 = 0`); // Always false condition
                }
            }
        } else {
            // No user provided - return empty results for security
            roleFilterConditions.push(sql`1 = 0`); // Always false condition
        }

        const conditions = [...baseConditions, ...roleFilterConditions];

        if (activeTab === "pending") {
            conditions.push(TenderInfosService.getExcludeStatusCondition(["dnb", "lost"]));
            conditions.push(isNull(tenderDocumentChecklists.id));
        } else if (activeTab === "submitted") {
            conditions.push(TenderInfosService.getExcludeStatusCondition(["dnb", "lost"]));
            conditions.push(isNotNull(tenderDocumentChecklists.id));
        } else if (activeTab === "tender-dnb") {
            const dnbStatusIds = StatusCache.getIds("dnb");
            if (dnbStatusIds.length > 0) {
                conditions.push(inArray(tenderInfos.status, dnbStatusIds));
            } else {
                return wrapPaginatedResponse([], 0, page, limit);
            }
        } else {
            throw new BadRequestException(`Invalid tab: ${activeTab}`);
        }

        // Add search conditions
        if (filters?.search) {
            const searchStr = `%${filters.search}%`;
            conditions.push(
                sql`(
                    ${tenderInfos.tenderName} ILIKE ${searchStr} OR
                    ${tenderInfos.tenderNo} ILIKE ${searchStr} OR
                    ${tenderInfos.gstValues}::text ILIKE ${searchStr} OR
                    ${tenderInfos.dueDate}::text ILIKE ${searchStr} OR
                    ${users.name} ILIKE ${searchStr} OR
                    ${statuses.name} ILIKE ${searchStr}
                )`
            );
        }

        const whereClause = and(...conditions);

        // Build orderBy clause
        const sortBy = filters?.sortBy;
        const sortOrder = filters?.sortOrder || "asc";
        let orderByClause: any = asc(tenderInfos.dueDate);

        if (sortBy) {
            const sortFn = sortOrder === "desc" ? desc : asc;
            switch (sortBy) {
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
                case "submissionDate":
                    orderByClause = sortFn(tenderDocumentChecklists.createdAt);
                    break;
                case "statusChangeDate":
                    orderByClause = sortFn(tenderInfos.updatedAt);
                    break;
                case "gstValues":
                    orderByClause = sortFn(tenderInfos.gstValues);
                    break;
                case "statusName":
                    orderByClause = sortFn(statuses.name);
                    break;
                default:
                    orderByClause = sortFn(tenderInfos.dueDate);
            }
        }

        // Get total count
        const [countResult] = await this.db
            .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
            .from(tenderInfos)
            .innerJoin(tenderInformation, eq(tenderInfos.id, tenderInformation.tenderId))
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(tenderDocumentChecklists, eq(tenderDocumentChecklists.tenderId, tenderInfos.id))
            .where(whereClause);
        const total = Number(countResult?.count || 0);

        // Get paginated data
        const rows = await this.db
            .select({
                tenderId: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                teamMemberName: users.name,
                itemName: items.name,
                statusName: statuses.name,
                dueDate: tenderInfos.dueDate,
                gstValues: tenderInfos.gstValues,
                checklistId: tenderDocumentChecklists.id,
            })
            .from(tenderInfos)
            .innerJoin(tenderInformation, eq(tenderInfos.id, tenderInformation.tenderId))
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(tenderDocumentChecklists, eq(tenderDocumentChecklists.tenderId, tenderInfos.id))
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset);

        const data = rows.map(row => ({
            tenderId: row.tenderId,
            tenderNo: row.tenderNo,
            tenderName: row.tenderName,
            teamMemberName: row.teamMemberName,
            itemName: row.itemName,
            statusName: row.statusName,
            dueDate: row.dueDate,
            gstValues: row.gstValues ? Number(row.gstValues) : 0,
            checklistSubmitted: row.checklistId !== null,
        }));

        return wrapPaginatedResponse(data, total, page, limit);
    }

    async getDashboardCounts(user?: ValidatedUser, teamId?: number): Promise<{ pending: number; submitted: number; 'tender-dnb': number; total: number }> {
        const baseCondition = TenderInfosService.getActiveCondition();

        // Apply role-based filtering
        const roleFilterConditions: any[] = [];
        if (user && user.roleId) {
            // Role ID 1 = Super User, 2 = Admin: Show all tenders, respect teamId filter if provided
            if (user.roleId === 1 || user.roleId === 2) {
                // Super User or Admin: Show all, respect teamId filter if provided
                if (teamId !== undefined && teamId !== null) {
                    roleFilterConditions.push(eq(tenderInfos.team, teamId));
                }
                // If no teamId filter, show all (no additional condition added)
            } else if (user.roleId === 3 || user.roleId === 4 || user.roleId === 6) {
                // Role ID 3 = Team Leader, 4 = Coordinator, 6 = Engineer: Filter by primary_team_id
                if (user.teamId) {
                    roleFilterConditions.push(eq(tenderInfos.team, user.teamId));
                } else {
                    // If no teamId, return empty results (user has no team assigned)
                    roleFilterConditions.push(sql`1 = 0`); // Always false condition
                }
            } else {
                // All other roles: Show only own tenders
                if (user.sub) {
                    roleFilterConditions.push(eq(tenderInfos.teamMember, user.sub));
                } else {
                    // If no user ID, return empty results
                    roleFilterConditions.push(sql`1 = 0`); // Always false condition
                }
            }
        } else {
            // No user provided - return empty results for security
            roleFilterConditions.push(sql`1 = 0`); // Always false condition
        }

        const filteredBaseCondition = roleFilterConditions.length > 0
            ? and(baseCondition, ...roleFilterConditions)
            : baseCondition;

        const baseConditions = [
            filteredBaseCondition,
            TenderInfosService.getApprovedCondition(),
        ];

        // Count pending: exclude dnb/lost, checklistId IS NULL
        const pendingConditions = [...baseConditions, TenderInfosService.getExcludeStatusCondition(["dnb", "lost"]), isNull(tenderDocumentChecklists.id)];

        // Count submitted: exclude dnb/lost, checklistId IS NOT NULL
        const submittedConditions = [...baseConditions, TenderInfosService.getExcludeStatusCondition(["dnb", "lost"]), isNotNull(tenderDocumentChecklists.id)];

        // Count tender-dnb: status in dnb category
        const dnbStatusIds = StatusCache.getIds('dnb');
        const tenderDnbConditions = [
            filteredBaseCondition,
            TenderInfosService.getApprovedCondition(),
            ...(dnbStatusIds.length > 0 ? [inArray(tenderInfos.status, dnbStatusIds)] : []),
        ];

        const [pendingResult, submittedResult, tenderDnbResult] = await Promise.all([
            this.db
                .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
                .from(tenderInfos)
                .innerJoin(tenderInformation, eq(tenderInfos.id, tenderInformation.tenderId))
                .leftJoin(tenderDocumentChecklists, eq(tenderDocumentChecklists.tenderId, tenderInfos.id))
                .where(and(...pendingConditions))
                .then(r => Number(r[0]?.count || 0)),
            this.db
                .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
                .from(tenderInfos)
                .innerJoin(tenderInformation, eq(tenderInfos.id, tenderInformation.tenderId))
                .leftJoin(tenderDocumentChecklists, eq(tenderDocumentChecklists.tenderId, tenderInfos.id))
                .where(and(...submittedConditions))
                .then(r => Number(r[0]?.count || 0)),
            dnbStatusIds.length > 0
                ? this.db
                    .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
                    .from(tenderInfos)
                    .innerJoin(tenderInformation, eq(tenderInfos.id, tenderInformation.tenderId))
                    .leftJoin(tenderDocumentChecklists, eq(tenderDocumentChecklists.tenderId, tenderInfos.id))
                    .where(and(...tenderDnbConditions))
                    .then(r => Number(r[0]?.count || 0))
                : Promise.resolve(0),
        ]);

        return {
            pending: pendingResult,
            submitted: submittedResult,
            "tender-dnb": tenderDnbResult,
            total: pendingResult + submittedResult + tenderDnbResult,
        };
    }

    async findByTenderId(tenderId: number) {
        const result = await this.db.select().from(tenderDocumentChecklists).where(eq(tenderDocumentChecklists.tenderId, tenderId)).limit(1);

        return result[0] || null;
    }

    async create(createDocumentChecklistDto: CreateDocumentChecklistDto) {
        const [result] = await this.db
            .insert(tenderDocumentChecklists)
            .values({
                tenderId: createDocumentChecklistDto.tenderId,
                selectedDocuments: createDocumentChecklistDto.selectedDocuments || null,
                extraDocuments: createDocumentChecklistDto.extraDocuments
                    ? createDocumentChecklistDto.extraDocuments.map(doc => ({
                        name: doc.name ?? "",
                        path: doc.path ?? "",
                    }))
                    : null,
            })
            .returning();

        // Send email notification (don't fail the operation if email fails)
        try {
            await this.sendDocumentChecklistSubmittedEmail(createDocumentChecklistDto.tenderId, result);
        } catch (error) {
            this.logger.error(
                `Failed to send document checklist submitted email for tender ${createDocumentChecklistDto.tenderId}: ${error instanceof Error ? error.message : String(error)}`
            );
            // Continue execution - email failure shouldn't break the main operation
        }

        // TIMER TRANSITION: Stop document_checklist timer
        try {
            this.logger.log(`Stopping timer for tender ${createDocumentChecklistDto.tenderId} after document checklist submitted`);

            // Get tender to find team member for userId
            const tender = await this.tenderInfosService.findById(createDocumentChecklistDto.tenderId);
            const userId = tender?.teamMember || 1; // Use team member or default to 1

            await this.timersService.stopTimer({
                entityType: 'TENDER',
                entityId: createDocumentChecklistDto.tenderId,
                stage: 'document_checklist',
                userId: userId,
                reason: 'Document checklist submitted'
            });
            this.logger.log(`Successfully stopped document_checklist timer for tender ${createDocumentChecklistDto.tenderId}`);
        } catch (error) {
            this.logger.error(`Failed to stop timer for tender ${createDocumentChecklistDto.tenderId} after document checklist submitted:`, error);
            // Don't fail the entire operation if timer transition fails
        }

        return result;
    }

    async update(id: number, updateDocumentChecklistDto: UpdateDocumentChecklistDto) {
        const [result] = await this.db
            .update(tenderDocumentChecklists)
            .set({
                selectedDocuments: updateDocumentChecklistDto.selectedDocuments || null,
                extraDocuments: updateDocumentChecklistDto.extraDocuments
                    ? updateDocumentChecklistDto.extraDocuments.map(doc => ({
                        name: doc.name ?? "",
                        path: doc.path ?? "",
                    }))
                    : null,
                updatedAt: new Date(),
            })
            .where(eq(tenderDocumentChecklists.id, id))
            .returning();

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
        recipients: { to?: RecipientSource[]; cc?: RecipientSource[]; attachments?: { files: string[]; baseDir?: string } }
    ) {
        try {
            await this.emailService.sendTenderEmail({
                tenderId,
                eventType,
                fromUserId,
                to: recipients.to || [],
                cc: recipients.cc,
                subject,
                template,
                data,
                attachments: recipients.attachments,
            });
        } catch (error) {
            this.logger.error(`Failed to send email for tender ${tenderId}: ${error instanceof Error ? error.message : String(error)}`);
            // Don't throw - email failure shouldn't break main operation
        }
    }

    /**
     * Send document checklist submitted email
     */
    private async sendDocumentChecklistSubmittedEmail(
        tenderId: number,
        checklist: { selectedDocuments: string[] | null; extraDocuments: Array<{ name: string; path: string }> | null }
    ) {
        const tender = await this.tenderInfosService.findById(tenderId);
        if (!tender || !tender.teamMember) return;

        // Get Team Leader name
        const teamLeaderEmails = await this.recipientResolver.getEmailsByRole("Team Leader", tender.team);
        let tlName = "Team Leader";
        if (teamLeaderEmails.length > 0) {
            const [tlUser] = await this.db.select({ name: users.name }).from(users).where(eq(users.email, teamLeaderEmails[0])).limit(1);
            if (tlUser?.name) {
                tlName = tlUser.name;
            }
        }

        // Get TE name
        const teUser = await this.recipientResolver.getUserById(tender.teamMember);
        const teName = teUser?.name || "Tender Executive";

        // Build documents list
        const documents: string[] = [];
        if (checklist.selectedDocuments && checklist.selectedDocuments.length > 0) {
            documents.push(...checklist.selectedDocuments);
        }
        if (checklist.extraDocuments && checklist.extraDocuments.length > 0) {
            documents.push(...checklist.extraDocuments.map(doc => doc.name));
        }

        const emailData = {
            tl: tlName,
            tenderNo: tender.tenderNo,
            tenderName: tender.tenderName,
            documents: documents.length > 0 ? documents : ["No documents specified"],
            te: teName,
        };

        // Collect attachment file paths from extraDocuments
        const attachmentFiles = checklist.extraDocuments?.map(doc => doc.path).filter((path): path is string => !!path) || [];

        await this.sendEmail("document-checklist.submitted", tenderId, tender.teamMember, `Document Checklist - ${tender.tenderName}`, "document-checklist-submitted", emailData, {
            to: [{ type: "role", role: "Team Leader", teamId: tender.team }],
            cc: [{ type: "role", role: "Admin", teamId: tender.team }],
            // attachments: attachmentFiles.length > 0 ? { files: attachmentFiles } : undefined,
        });
    }
}
