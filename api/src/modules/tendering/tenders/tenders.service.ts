import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, inArray, isNull, notInArray, sql, desc } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { tenderInfos, type TenderInfo, type NewTenderInfo } from '@db/schemas/tendering/tenders.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { users } from '@db/schemas/auth/users.schema';
import { items } from '@db/schemas/master/items.schema';
import { organizations } from '@db/schemas/master/organizations.schema';
import { locations } from '@db/schemas/master/locations.schema';
import { websites } from '@db/schemas/master/websites.schema';
import { StatusCache } from '@/utils/status-cache';
import { tenderInformation } from '@/db/schemas/tendering/tender-info-sheet.schema';
import { TenderStatusHistoryService } from '@/modules/tendering/tender-status-history/tender-status-history.service';
import { EmailService } from '@/modules/email/email.service';
import { RecipientResolver } from '@/modules/email/recipient.resolver';
import type { RecipientSource } from '@/modules/email/dto/send-email.dto';
import { Logger } from '@nestjs/common';
import type { PaginatedResult, TenderInfoWithNames, TenderReference, TenderForPayment, TenderForRfq, TenderForPhysicalDocs, TenderForApproval } from '@/modules/tendering/types/shared.types';
import { WorkflowService } from '@/modules/timers/services/workflow.service';

export type TenderListFilters = {
    statusIds?: number[];
    category?: string;
    unallocated?: boolean;
    page?: number;
    limit?: number;
    search?: string;
    teamId?: number;
    assignedTo?: number;
};

@Injectable()
export class TenderInfosService {
    private readonly logger = new Logger(TenderInfosService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderStatusHistoryService: TenderStatusHistoryService,
        private readonly emailService: EmailService,
        private readonly recipientResolver: RecipientResolver,
        private readonly workflowService: WorkflowService,
    ) { }

    static getExcludeStatusCondition(categories: string[]) {
        const statusIds = categories
            .flatMap((cat) => StatusCache.getIds(cat))
            .filter(Boolean);

        return notInArray(tenderInfos.status, statusIds);
    }

    static getIncludeStatusCondition(categories: string[]) {
        const statusIds = categories
            .flatMap((cat) => StatusCache.getIds(cat))
            .filter(Boolean);
        return inArray(tenderInfos.status, statusIds);
    }

    static getActiveCondition() {
        return eq(tenderInfos.deleteStatus, 0);
    }

    static getApprovedCondition() {
        return eq(tenderInfos.tlStatus, 1);
    }

    static getRaApplicableCondition() {
        return eq(tenderInformation.reverseAuctionApplicable, 'Yes');
    }

    static getBaseFilters() {
        return and(
            this.getActiveCondition(),
            this.getApprovedCondition(),
            this.getExcludeStatusCondition(['lost'])
        );
    }

    private mapJoinedRow = (row: {
        tenderInfos: typeof tenderInfos.$inferSelect;
        users: { name: string | null; username: string | null } | null;
        statuses: { name: string | null } | null;
        items: { name: string | null } | null;
        organizations: { name: string | null; acronym: string | null } | null;
        locations: { name: string | null; state: string | null } | null;
        websites: { name: string | null; url: string | null } | null;
    }): TenderInfoWithNames => {
        const t = row.tenderInfos;
        return {
            ...t,
            organizationName: row.organizations?.name ?? null,
            organizationAcronym: row.organizations?.acronym ?? null,
            itemName: row.items?.name ?? null,
            teamMemberName: row.users?.name ?? null,
            teamMemberUsername: row.users?.username ?? null,
            statusName: row.statuses?.name ?? null,
            locationName: row.locations?.name ?? null,
            locationState: row.locations?.state ?? null,
            websiteName: row.websites?.name ?? null,
            websiteLink: row.websites?.url ?? null,
        };
    };

    async exists(id: number): Promise<boolean> {
        const [result] = await this.db
            .select({ id: tenderInfos.id })
            .from(tenderInfos)
            .where(eq(tenderInfos.id, id))
            .limit(1);

        return !!result;
    }

    async validateExists(id: number): Promise<TenderInfo> {
        const [tender] = await this.db
            .select()
            .from(tenderInfos)
            .where(and(eq(tenderInfos.id, id), eq(tenderInfos.deleteStatus, 0)))
            .limit(1);

        if (!tender) {
            throw new NotFoundException(`Tender with ID ${id} not found`);
        }

        return tender;
    }

    async validateApproved(id: number): Promise<TenderInfo> {
        const [tender] = await this.db
            .select()
            .from(tenderInfos)
            .where(
                and(
                    eq(tenderInfos.id, id),
                    eq(tenderInfos.deleteStatus, 0),
                    eq(tenderInfos.tlStatus, 1)
                )
            )
            .limit(1);

        if (!tender) {
            throw new NotFoundException(
                `Tender with ID ${id} not found or not approved`
            );
        }

        return tender;
    }

    async getReference(id: number): Promise<TenderReference> {
        const [row] = await this.db
            .select({
                id: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                dueDate: tenderInfos.dueDate,
                organizationName: organizations.name,
                organizationAcronym: organizations.acronym,
                teamMemberName: users.name,
                statusName: statuses.name,
            })
            .from(tenderInfos)
            .leftJoin(organizations, eq(organizations.id, tenderInfos.organization))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .where(eq(tenderInfos.id, id))
            .limit(1);

        if (!row) {
            throw new NotFoundException(`Tender with ID ${id} not found`);
        }

        return row as TenderReference;
    }

    async getTenderForPayment(id: number): Promise<TenderForPayment> {
        const [row] = await this.db
            .select({
                id: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                gstValues: tenderInfos.gstValues,
                tenderFees: tenderInfos.tenderFees,
                emd: tenderInfos.emd,
                dueDate: tenderInfos.dueDate,
                organizationName: organizations.name,
                teamMemberName: users.name,
            })
            .from(tenderInfos)
            .leftJoin(organizations, eq(organizations.id, tenderInfos.organization))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .where(and(eq(tenderInfos.id, id), eq(tenderInfos.deleteStatus, 0)))
            .limit(1);

        if (!row) {
            throw new NotFoundException(`Tender with ID ${id} not found`);
        }

        return row as TenderForPayment;
    }

    async getTenderForRfq(id: number): Promise<TenderForRfq> {
        const [row] = await this.db
            .select({
                id: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                teamMember: tenderInfos.teamMember,
                teamMemberName: users.name,
                status: tenderInfos.status,
                statusName: statuses.name,
                itemName: items.name,
                rfqTo: tenderInfos.rfqTo,
                dueDate: tenderInfos.dueDate,
            })
            .from(tenderInfos)
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .where(and(eq(tenderInfos.id, id), eq(tenderInfos.deleteStatus, 0)))
            .limit(1);

        if (!row) {
            throw new NotFoundException(`Tender with ID ${id} not found`);
        }

        return row as TenderForRfq;
    }

    async getTenderForPhysicalDocs(id: number): Promise<TenderForPhysicalDocs> {
        const [row] = await this.db
            .select({
                id: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                courierAddress: tenderInfos.courierAddress,
                teamMemberName: users.name,
                statusName: statuses.name,
                dueDate: tenderInfos.dueDate,
            })
            .from(tenderInfos)
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .where(and(eq(tenderInfos.id, id), eq(tenderInfos.deleteStatus, 0)))
            .limit(1);

        if (!row) {
            throw new NotFoundException(`Tender with ID ${id} not found`);
        }

        return row as TenderForPhysicalDocs;
    }

    async getTenderForApproval(id: number): Promise<TenderForApproval> {
        const [row] = await this.db
            .select({
                id: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                item: tenderInfos.item,
                itemName: items.name,
                gstValues: tenderInfos.gstValues,
                tenderFees: tenderInfos.tenderFees,
                emd: tenderInfos.emd,
                teamMember: tenderInfos.teamMember,
                teamMemberName: users.name,
                dueDate: tenderInfos.dueDate,
                status: tenderInfos.status,
                statusName: statuses.name,
                tlStatus: tenderInfos.tlStatus,
            })
            .from(tenderInfos)
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .where(and(eq(tenderInfos.id, id), eq(tenderInfos.deleteStatus, 0)))
            .limit(1);

        if (!row) {
            throw new NotFoundException(`Tender with ID ${id} not found`);
        }

        return row as TenderForApproval;
    }

    async findByIds(ids: number[]): Promise<TenderInfoWithNames[]> {
        if (ids.length === 0) return [];

        const rows = await this.getBaseQueryBuilder().where(
            and(inArray(tenderInfos.id, ids), eq(tenderInfos.deleteStatus, 0))
        );

        return rows.map((row) =>
            this.mapJoinedRow({
                tenderInfos: row.tenderInfos,
                users: row.users,
                statuses: row.statuses,
                items: row.items,
                organizations: row.organizations,
                locations: row.locations,
                websites: row.websites,
            })
        );
    }

    private getTenderBaseSelect() {
        return {
            tenderInfos,
            users: {
                name: users.name,
                username: users.username,
                isActive: users.isActive,
            },
            statuses: {
                id: statuses.id,
                name: statuses.name,
            },
            items: {
                id: items.id,
                name: items.name,
            },
            organizations: {
                acronym: organizations.acronym,
                name: organizations.name,
            },
            locations: {
                state: locations.state,
                name: locations.name,
            },
            websites: {
                name: websites.name,
                url: websites.url,
            },
        };
    }

    private getBaseQueryBuilder() {
        return this.db
            .select(this.getTenderBaseSelect())
            .from(tenderInfos)
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(organizations, eq(organizations.id, tenderInfos.organization))
            .leftJoin(locations, eq(locations.id, tenderInfos.location))
            .leftJoin(websites, eq(websites.id, tenderInfos.website));
    }

    async findAll(filters?: TenderListFilters): Promise<PaginatedResult<TenderInfoWithNames>> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        // 1. Build Where Conditions
        const conditions = [eq(tenderInfos.deleteStatus, 0)];

        if (filters?.unallocated) {
            conditions.push(isNull(tenderInfos.teamMember), eq(tenderInfos.status, 1));
        } else {
            let statusIdsToUse: number[] = [];
            if (filters?.category) {
                statusIdsToUse = StatusCache.getIds(filters.category);
            } else if (filters?.statusIds?.length) {
                statusIdsToUse = filters.statusIds;
            }

            if (statusIdsToUse.length > 0) {
                conditions.push(inArray(tenderInfos.status, statusIdsToUse));
            }
        }

        // TODO: Add role-based filtering middleware/guard
        // - Admin: see all tenders
        // - Team Leader/Coordinator/Operation Leader: filter by user.team
        // - Others: filter by team_member = user.id

        if (filters?.search) {
            const searchStr = `%${filters.search}%`;
            conditions.push(
                sql`(
                    ${tenderInfos.tenderNo} ILIKE ${searchStr} OR
                    ${tenderInfos.tenderName} ILIKE ${searchStr} OR
                    ${tenderInfos.gstValues}::text ILIKE ${searchStr} OR
                    ${tenderInfos.emd}::text ILIKE ${searchStr} OR
                    ${tenderInfos.dueDate}::text ILIKE ${searchStr} OR
                    ${users.name} ILIKE ${searchStr} OR
                    ${organizations.name} ILIKE ${searchStr} OR
                    ${statuses.name} ILIKE ${searchStr}
                )`
            );
        }

        if (!filters?.unallocated && filters?.teamId !== undefined && filters?.teamId !== null) {
            conditions.push(eq(tenderInfos.team, filters.teamId));
        }

        if (!filters?.unallocated && filters?.assignedTo !== undefined && filters?.assignedTo !== null) {
            conditions.push(eq(tenderInfos.teamMember, filters.assignedTo));
        }

        const whereClause = and(...conditions);

        // 2. Get Total Count
        // Use same joins as data query when searching joined table fields
        let countQuery: any = this.db
            .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
            .from(tenderInfos);

        // Add joins if search is being used (searches in joined tables)
        if (filters?.search) {
            countQuery = countQuery
                .leftJoin(users, eq(users.id, tenderInfos.teamMember))
                .leftJoin(organizations, eq(organizations.id, tenderInfos.organization))
                .leftJoin(statuses, eq(statuses.id, tenderInfos.status));
        }

        const [countResult] = await countQuery.where(whereClause);
        const total = Number(countResult?.count || 0);

        // 3. Get Data (Paginated)
        const rows = await this.getBaseQueryBuilder()
            .where(whereClause)
            .limit(limit)
            .offset(offset)
            .orderBy(desc(tenderInfos.createdAt));

        // 4. Map Data
        const data = rows.map((row) =>
            this.mapJoinedRow({
                tenderInfos: row.tenderInfos,
                users: row.users,
                statuses: row.statuses,
                items: row.items,
                organizations: row.organizations,
                locations: row.locations,
                websites: row.websites,
            })
        );

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findById(id: number): Promise<TenderInfoWithNames | null> {
        const rows = await this.getBaseQueryBuilder()
            .where(eq(tenderInfos.id, id))
            .limit(1);

        const row = rows[0];
        if (!row) return null;

        return this.mapJoinedRow({
            tenderInfos: row.tenderInfos,
            users: row.users,
            statuses: row.statuses,
            items: row.items,
            organizations: row.organizations,
            locations: row.locations,
            websites: row.websites,
        });
    }

    async create(data: NewTenderInfo, createdBy: number): Promise<TenderInfo> {
        const rows = await this.db.insert(tenderInfos).values(data).returning();
        const newTender = rows[0];
        this.logger.log(`New tender created: ${newTender.id}`);

        // Track initial status (status = 1) automatically
        const initialStatus = data.status ?? 1;
        await this.tenderStatusHistoryService.trackStatusChange(
            newTender.id as number, initialStatus, createdBy, null, 'Tender created'
        );

        // Send email notification
        await this.sendTenderCreatedEmail(newTender.id as number, data, createdBy);

        // START TIMER: Add this code to start the workflow and timers
        try {
            this.logger.log(`Starting workflow for tender ${newTender.id}`);
            const workflowResult = await this.workflowService.startWorkflow({
                workflowCode: 'TENDERING_WF',
                entityType: 'TENDER',
                entityId: newTender.id.toString(),
                metadata: {
                    createdBy,
                    tenderNo: newTender.tenderNo,
                    dueDate: newTender.dueDate
                }
            });

            this.logger.log(`Started workflow for tender ${newTender.id} with ${workflowResult.stepsStarted} steps`);
        } catch (error) {
            this.logger.error(`Failed to start workflow for tender ${newTender.id}:`, error);
        }

        return newTender;
    }

    async update(id: number, data: Partial<NewTenderInfo>, updatedBy: number): Promise<TenderInfo> {
        // Get current tender before update
        const currentTender = await this.findById(id);
        if (!currentTender) {
            throw new NotFoundException(`Tender with ID ${id} not found`);
        }

        const rows = await this.db
            .update(tenderInfos)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(tenderInfos.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`Tender with ID ${id} not found`);
        }

        // Get updated tender with names
        const updatedTender = await this.findById(id);
        if (updatedTender) {
            // Send email notification for major updates
            await this.sendTenderUpdateEmail(currentTender, updatedTender, data, updatedBy);
        }

        return rows[0];
    }

    async delete(id: number): Promise<void> {
        const result = await this.db
            .delete(tenderInfos)
            .where(eq(tenderInfos.id, id))
            .returning();
        if (!result[0]) {
            throw new NotFoundException(`Tender with ID ${id} not found`);
        }
    }

    /**
     * Update tender status manually with comment
     */
    async updateStatus(
        tenderId: number,
        newStatus: number,
        changedBy: number,
        comment: string
    ): Promise<TenderInfo> {
        const currentTender = await this.validateExists(tenderId);
        const prevStatus = currentTender.status;

        if (prevStatus === newStatus) {
            throw new BadRequestException('Status is already set to this value');
        }

        // Get status names
        const [oldStatusRow, newStatusRow] = await Promise.all([
            this.db.select({ name: statuses.name }).from(statuses).where(eq(statuses.id, prevStatus)).limit(1),
            this.db.select({ name: statuses.name }).from(statuses).where(eq(statuses.id, newStatus)).limit(1),
        ]);

        const oldStatusName = oldStatusRow[0]?.name || `Status ${prevStatus}`;
        const newStatusName = newStatusRow[0]?.name || `Status ${newStatus}`;

        // Update status in transaction
        const updated = await this.db.transaction(async (tx) => {
            // Update tender status
            const [updatedTender] = await tx
                .update(tenderInfos)
                .set({ status: newStatus, updatedAt: new Date() })
                .where(eq(tenderInfos.id, tenderId))
                .returning();

            if (!updatedTender) {
                throw new NotFoundException(`Tender with ID ${tenderId} not found`);
            }

            // Track status change
            await this.tenderStatusHistoryService.trackStatusChange(
                tenderId,
                newStatus,
                changedBy,
                prevStatus,
                comment
            );

            return updatedTender;
        });

        // Send email notification for status update
        await this.sendTenderStatusUpdateEmail(tenderId, oldStatusName, newStatusName, comment, changedBy);

        return updated;
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
        recipients: { to?: RecipientSource[]; cc?: RecipientSource[] }
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
            });
        } catch (error) {
            this.logger.error(`Failed to send email for tender ${tenderId}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get coordinator name for a team
     */
    private async getCoordinatorName(teamId: number): Promise<string> {
        const coordinatorEmails = await this.recipientResolver.getEmailsByRole('Coordinator', teamId);
        if (coordinatorEmails.length > 0) {
            const [coordinatorUser] = await this.db
                .select({ name: users.name })
                .from(users)
                .where(eq(users.email, coordinatorEmails[0]))
                .limit(1);
            return coordinatorUser?.name || 'Coordinator';
        }
        return 'Coordinator';
    }

    /**
     * Get coordinator user ID for a team
     */
    private async getCoordinatorUserId(teamId: number): Promise<number | null> {
        const coordinatorEmails = await this.recipientResolver.getEmailsByRole('Coordinator', teamId);
        if (coordinatorEmails.length > 0) {
            const [coordinatorUser] = await this.db
                .select({ id: users.id })
                .from(users)
                .where(eq(users.email, coordinatorEmails[0]))
                .limit(1);
            return coordinatorUser?.id || null;
        }
        return null;
    }

    /**
     * Send tender created email (assigned or unallocated)
     */
    private async sendTenderCreatedEmail(tenderId: number, data: NewTenderInfo, createdBy: number) {
        const tender = await this.findById(tenderId);
        if (!tender) return;

        const teamId = tender.team;
        const coordinatorName = await this.getCoordinatorName(teamId);

        // Format date
        const dueDate = tender.dueDate ? new Date(tender.dueDate).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }) : 'Not specified';

        const emailData = {
            tenderName: tender.tenderName,
            tenderNo: tender.tenderNo,
            website: tender.websiteName || tender.websiteLink || 'Not specified',
            dueDate,
            tenderValue: tender.gstValues ? `₹${Number(tender.gstValues).toLocaleString('en-IN')}` : 'Not specified',
            tenderFees: tender.tenderFees ? `₹${Number(tender.tenderFees).toLocaleString('en-IN')}` : 'Not specified',
            emd: tender.emd ? `₹${Number(tender.emd).toLocaleString('en-IN')}` : 'Not specified',
            remarks: tender.remarks || 'None',
            coordinator: coordinatorName,
        };

        if (tender.teamMember) {
            // Tender assigned - send to team member, from coordinator
            const assignee = await this.recipientResolver.getUserById(tender.teamMember);
            const coordinatorUserId = await this.getCoordinatorUserId(teamId);

            if (assignee && coordinatorUserId) {
                await this.sendEmail(
                    'tender.created',
                    tenderId,
                    coordinatorUserId,
                    `New Tender Assigned: ${tender.tenderNo}`,
                    'tender-created',
                    {
                        ...emailData,
                        assignee: assignee.name,
                        tenderInfoSheet: `/tendering/info-sheet/${tender.id}`,
                    },
                    {
                        to: [{ type: 'user', userId: tender.teamMember }],
                        cc: [
                            { type: 'role', role: 'Team Leader', teamId },
                            { type: 'role', role: 'Admin', teamId },
                        ],
                    }
                );
            }
        } else {
            // Tender unallocated - send to team leader, from coordinator
            const coordinatorUserId = await this.getCoordinatorUserId(teamId);

            if (coordinatorUserId) {
                await this.sendEmail(
                    'tender.created.unallocated',
                    tenderId,
                    coordinatorUserId,
                    `New Tender Awaiting Allocation: ${tender.tenderNo}`,
                    'tender-created-unallocated',
                    emailData,
                    {
                        to: [{ type: 'role', role: 'Team Leader', teamId }],
                        cc: [
                            { type: 'role', role: 'Admin', teamId },
                        ],
                    }
                );
            }
        }
    }

    /**
     * Send tender update email for major changes
     */
    private async sendTenderUpdateEmail(
        oldTender: TenderInfoWithNames,
        newTender: TenderInfoWithNames,
        changedData: Partial<NewTenderInfo>,
        updatedBy: number
    ) {
        if (!newTender.teamMember) return; // Skip if unallocated

        const teamId = newTender.team;
        const coordinatorName = await this.getCoordinatorName(teamId);

        // Detect major changes
        const changedFields: string[] = [];
        let isTeamMemberChange = false;
        let isTeamChange = false;
        let isTenderNoChange = false;

        if (changedData.teamMember !== undefined && changedData.teamMember !== oldTender.teamMember) {
            isTeamMemberChange = true;
            changedFields.push('Team Member');
        }
        if (changedData.team !== undefined && changedData.team !== oldTender.team) {
            isTeamChange = true;
            changedFields.push('Team');
        }
        if (changedData.tenderNo !== undefined && changedData.tenderNo !== oldTender.tenderNo) {
            isTenderNoChange = true;
            changedFields.push('Tender Number');
        }
        if (changedData.dueDate !== undefined && changedData.dueDate !== oldTender.dueDate) {
            changedFields.push('Due Date');
        }
        if (changedData.tenderName !== undefined && changedData.tenderName !== oldTender.tenderName) {
            changedFields.push('Tender Name');
        }
        if (changedData.gstValues !== undefined && changedData.gstValues !== oldTender.gstValues) {
            changedFields.push('Tender Value');
        }
        if (changedData.tenderFees !== undefined && changedData.tenderFees !== oldTender.tenderFees) {
            changedFields.push('Tender Fees');
        }
        if (changedData.emd !== undefined && changedData.emd !== oldTender.emd) {
            changedFields.push('EMD');
        }

        // Only send email if there are significant changes
        if (changedFields.length === 0 && !isTeamMemberChange && !isTeamChange && !isTenderNoChange) {
            return;
        }

        const dueDate = newTender.dueDate ? new Date(newTender.dueDate).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }) : 'Not specified';

        const assignee = await this.recipientResolver.getUserById(newTender.teamMember);
        if (!assignee) return;

        const coordinatorUserId = await this.getCoordinatorUserId(teamId);
        if (!coordinatorUserId) return;

        await this.sendEmail(
            'tender.updated',
            newTender.id as number,
            coordinatorUserId,
            `Tender Updated: ${newTender.tenderNo}`,
            'tender-major-update',
            {
                assignee: assignee.name,
                tenderName: newTender.tenderName,
                tenderNo: newTender.tenderNo,
                website: newTender.websiteName || newTender.websiteLink || 'Not specified',
                dueDate,
                tenderValue: newTender.gstValues ? `₹${Number(newTender.gstValues).toLocaleString('en-IN')}` : 'Not specified',
                tenderFees: newTender.tenderFees ? `₹${Number(newTender.tenderFees).toLocaleString('en-IN')}` : 'Not specified',
                emd: newTender.emd ? `₹${Number(newTender.emd).toLocaleString('en-IN')}` : 'Not specified',
                status_remark: newTender.remarks || '',
                coordinator: coordinatorName,
                changed: changedFields.length > 0 || isTeamMemberChange || isTeamChange || isTenderNoChange,
                changedFields,
                isTeamMemberChange,
                isTeamChange,
                isTenderNoChange,
            },
            {
                to: [{ type: 'user', userId: newTender.teamMember }],
                cc: [
                    { type: 'role', role: 'Team Leader', teamId },
                    { type: 'role', role: 'Admin', teamId },
                ],
            }
        );
    }

    /**
     * Send tender status update email
     */
    private async sendTenderStatusUpdateEmail(
        tenderId: number,
        oldStatus: string,
        newStatus: string,
        comment: string,
        changedBy: number
    ) {
        const tender = await this.findById(tenderId);
        if (!tender || !tender.teamMember) return;

        const assignee = await this.recipientResolver.getUserById(tender.teamMember);
        if (!assignee) return;

        // Get coordinator name and user ID
        const coordinatorName = await this.getCoordinatorName(tender.team);
        const coordinatorUserId = await this.getCoordinatorUserId(tender.team);
        if (!coordinatorUserId) return;

        // Format due date
        const dueDate = tender.dueDate ? new Date(tender.dueDate).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }) : 'Not specified';

        await this.sendEmail(
            'tender.status-updated',
            tenderId,
            coordinatorUserId,
            `Tender Status Updated: ${tender.tenderNo}`,
            'tender-major-update',
            {
                assignee: assignee.name || 'Team Member',
                tenderName: tender.tenderName || 'Not specified',
                tenderNo: tender.tenderNo || 'Not specified',
                website: tender.websiteName || tender.websiteLink || 'Not specified',
                dueDate,
                tenderValue: tender.gstValues ? `₹${Number(tender.gstValues).toLocaleString('en-IN')}` : 'Not specified',
                tenderFees: tender.tenderFees ? `₹${Number(tender.tenderFees).toLocaleString('en-IN')}` : 'Not specified',
                emd: tender.emd ? `₹${Number(tender.emd).toLocaleString('en-IN')}` : 'Not specified',
                status_remark: comment || tender.remarks || '',
                coordinator: coordinatorName || 'Coordinator',
                changed: false,
                oldStatus: oldStatus || 'Not specified',
                newStatus: newStatus || 'Not specified',
                changedFields: [],
                isTeamMemberChange: false,
                isTeamChange: false,
                isTenderNoChange: false,
            },
            {
                to: [{ type: 'user', userId: tender.teamMember }],
                cc: [
                    { type: 'role', role: 'Team Leader', teamId: tender.team },
                    { type: 'role', role: 'Admin', teamId: tender.team },
                ],
            }
        );
    }

    /**
     * Generate a unique tender name based on organization, item, and location
     */
    async generateTenderName(
        organizationId: number,
        itemId: number,
        locationId?: number
    ): Promise<{ tenderName: string }> {
        // Fetch organization acronym
        const [organization] = await this.db
            .select({ acronym: organizations.acronym })
            .from(organizations)
            .where(eq(organizations.id, organizationId))
            .limit(1);

        if (!organization || !organization.acronym) {
            throw new NotFoundException(`Organization with ID ${organizationId} not found or has no acronym`);
        }

        // Fetch item name
        const [item] = await this.db
            .select({ name: items.name })
            .from(items)
            .where(eq(items.id, itemId))
            .limit(1);

        if (!item || !item.name) {
            throw new NotFoundException(`Item with ID ${itemId} not found`);
        }

        // Build base name parts: org loc item
        const nameParts = [organization.acronym.trim()];

        // Add location name if provided
        if (locationId) {
            const [location] = await this.db
                .select({ name: locations.name })
                .from(locations)
                .where(eq(locations.id, locationId))
                .limit(1);

            if (location && location.name) {
                nameParts.push(location.name.trim());
            }
        }

        // Add item name last
        nameParts.push(item.name.trim());

        // Build base name
        const baseName = nameParts.join(' ');

        // Query existing tenders with names starting with baseName
        const existingTenders = await this.db
            .select({ tenderName: tenderInfos.tenderName })
            .from(tenderInfos)
            .where(sql`${tenderInfos.tenderName} LIKE ${`${baseName}%`}`)
            .limit(100); // Reasonable limit to check duplicates

        // Count how many tenders start with this base name
        const existingCount = existingTenders.length;

        // Generate unique name
        let uniqueName = baseName;
        if (existingCount > 0) {
            uniqueName = `${baseName} (${existingCount})`;
        }
        console.log("Tender Name: ", uniqueName);
        return { tenderName: uniqueName };
    }

    async getDashboardCounts(): Promise<{
        'under-preparation': number;
        'did-not-bid': number;
        'tenders-bid': number;
        'tender-won': number;
        'tender-lost': number;
        'unallocated': number;
        total: number;
    }> {
        // Base condition
        const baseCondition = TenderInfosService.getActiveCondition();

        // Tab-specific status IDs using StatusCache
        const underPreparationStatusIds = StatusCache.getIds('prep');
        const didNotBidStatusIds = StatusCache.getIds('dnb');
        const tendersBidStatusIds = StatusCache.getIds('bid');
        const tenderWonStatusIds = StatusCache.getIds('won');
        const tenderLostStatusIds = StatusCache.getIds('lost');

        // Count for each tab
        const counts = await Promise.all([
            this.countTabItems(and(baseCondition, inArray(tenderInfos.status, underPreparationStatusIds))),
            this.countTabItems(and(baseCondition, inArray(tenderInfos.status, didNotBidStatusIds))),
            this.countTabItems(and(baseCondition, inArray(tenderInfos.status, tendersBidStatusIds))),
            this.countTabItems(and(baseCondition, inArray(tenderInfos.status, tenderWonStatusIds))),
            this.countTabItems(and(baseCondition, inArray(tenderInfos.status, tenderLostStatusIds))),
            this.countTabItems(and(baseCondition, isNull(tenderInfos.teamMember), eq(tenderInfos.status, 1))),
        ]);

        return {
            'under-preparation': counts[0],
            'did-not-bid': counts[1],
            'tenders-bid': counts[2],
            'tender-won': counts[3],
            'tender-lost': counts[4],
            'unallocated': counts[5],
            total: counts.slice(0, 5).reduce((sum, count) => sum + count, 0),
        };
    }

    /**
     * Helper method to count items with given conditions
     */
    private async countTabItems(whereClause: any): Promise<number> {
        const [result] = await this.db
            .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
            .from(tenderInfos)
            .where(whereClause);

        return result?.count ?? 0;
    }
}
