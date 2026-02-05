import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { and, eq, asc, desc, sql, isNull, isNotNull, inArray, notInArray } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { users } from '@db/schemas/auth/users.schema';
import {
    physicalDocs,
    physicalDocsPersons,
    type NewPhysicalDocs,
} from '@db/schemas/tendering/physical-docs.schema';
import { tenderInformation } from '@db/schemas/tendering/tender-info-sheet.schema';
import { tenderStatusHistory } from '@db/schemas/tendering/tender-status-history.schema';
import type {
    CreatePhysicalDocDto,
    UpdatePhysicalDocDto,
} from '@/modules/tendering/physical-docs/dto/physical-docs.dto';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import type { PaginatedResult } from '@/modules/tendering/types/shared.types';
import { items } from '@db/schemas/master/items.schema';
import { TenderStatusHistoryService } from '@/modules/tendering/tender-status-history/tender-status-history.service';
import { EmailService } from '@/modules/email/email.service';
import { RecipientResolver } from '@/modules/email/recipient.resolver';
import type { RecipientSource } from '@/modules/email/dto/send-email.dto';
import { Logger } from '@nestjs/common';
import { tenderClients } from '@db/schemas/tendering/tender-info-sheet.schema';
import { StatusCache } from '@/utils/status-cache';
import { wrapPaginatedResponse } from '@/utils/responseWrapper';
import { WorkflowService } from '@/modules/timers/services/workflow.service';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

export type PhysicalDocFilters = {
    physicalDocsSent?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
};

export type PhysicalDocDashboardRow = {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    dueDate: Date;
    courierAddress: string;
    physicalDocsRequired: string;
    physicalDocsDeadline: Date;
    teamMemberName: string;
    status: number;
    statusName: string;
    latestStatus: number | null;
    latestStatusName: string | null;
    statusRemark: string | null;
    physicalDocs: number | null;
    courierNo: number | null;
    courierDate: Date | null;
};

export type PhysicalDocPerson = {
    id: number;
    name: string;
    email: string;
    phone: string;
};

export type PhysicalDocWithPersons = {
    id: number;
    tenderId: number;
    courierNo: number;
    submittedDocs: string | null;
    createdAt: string | Date;
    updatedAt: string | Date;
    persons: PhysicalDocPerson[];
};

@Injectable()
export class PhysicalDocsService {
    private readonly logger = new Logger(PhysicalDocsService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
        private readonly tenderStatusHistoryService: TenderStatusHistoryService,
        private readonly emailService: EmailService,
        private readonly recipientResolver: RecipientResolver,
        private readonly workflowService: WorkflowService,
    ) { }

    /**
     * Build role-based filter conditions for tender queries
     */
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
                // All other roles: Show only own tenders
                if (user.sub) {
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

    /**
     * Get dashboard data by tab - Refactored to use config
     */
    async getDashboardData(
        user?: ValidatedUser,
        teamId?: number,
        tabKey?: 'pending' | 'sent' | 'tender-dnb',
        filters?: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc'; search?: string }
    ): Promise<PaginatedResult<PhysicalDocDashboardRow>> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        const activeTab = tabKey || 'pending';

        // Build base conditions
        const baseConditions = [
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            // TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']),
            inArray(tenderInformation.physicalDocsRequired, ['Yes', 'YES']),
        ];

        // Apply role-based filtering
        const roleFilterConditions = this.buildRoleFilterConditions(user, teamId);

        // Build tab-specific conditions
        const conditions = [...baseConditions, ...roleFilterConditions];

        if (activeTab === 'pending') {
            conditions.push(isNull(physicalDocs.id));
            conditions.push(TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']));
        } else if (activeTab === 'sent') {
            conditions.push(isNotNull(physicalDocs.id));
            conditions.push(TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']));
        } else if (activeTab === 'tender-dnb') {
            const dnbStatusIds = StatusCache.getIds('dnb');
            const excludeStatusIds = [30];
            if (dnbStatusIds.length > 0) {
                conditions.push(inArray(tenderInfos.status, dnbStatusIds));
            }
            conditions.push(notInArray(tenderInfos.status, excludeStatusIds));
        } else {
            throw new BadRequestException(`Invalid tab: ${activeTab}`);
        }

        // Add search conditions - search across all rendered columns
        if (filters?.search) {
            const searchStr = `%${filters.search}%`;
            const searchConditions: any[] = [
                sql`${tenderInfos.tenderName} ILIKE ${searchStr}`,
                sql`${tenderInfos.tenderNo} ILIKE ${searchStr}`,
                sql`${tenderInfos.gstValues}::text ILIKE ${searchStr}`,
                sql`${tenderInfos.dueDate}::text ILIKE ${searchStr}`,
                sql`${users.name} ILIKE ${searchStr}`,
                sql`${statuses.name} ILIKE ${searchStr}`,
                sql`${tenderInformation.courierAddress} ILIKE ${searchStr}`,
                sql`${tenderInformation.physicalDocsDeadline}::text ILIKE ${searchStr}`,
                sql`${physicalDocs.courierNo} ILIKE ${searchStr}`,
            ];
            conditions.push(sql`(${sql.join(searchConditions, sql` OR `)})`);
        }

        const whereClause = and(...conditions);

        // Build orderBy clause
        const sortBy = filters?.sortBy;
        const sortOrder = filters?.sortOrder || (activeTab === 'pending' ? 'asc' : activeTab === 'sent' ? 'desc' : 'desc');
        let orderByClause: any = asc(tenderInfos.dueDate);

        // Set default sort based on tab if no sortBy specified
        if (!sortBy) {
            if (activeTab === 'pending') {
                orderByClause = asc(tenderInfos.dueDate);
            } else if (activeTab === 'sent') {
                orderByClause = desc(physicalDocs.createdAt);
            } else if (activeTab === 'tender-dnb') {
                orderByClause = desc(tenderInfos.updatedAt);
            }
        } else {
            const sortFn = sortOrder === 'desc' ? desc : asc;
            switch (sortBy) {
                case 'tenderNo':
                    orderByClause = sortFn(tenderInfos.tenderNo);
                    break;
                case 'tenderName':
                    orderByClause = sortFn(tenderInfos.tenderName);
                    break;
                case 'teamMemberName':
                    orderByClause = sortFn(users.name);
                    break;
                case 'dueDate':
                    orderByClause = sortFn(tenderInfos.dueDate);
                    break;
                case 'dispatchDate':
                    orderByClause = sortFn(physicalDocs.createdAt);
                    break;
                case 'statusChangeDate':
                    orderByClause = sortFn(tenderInfos.updatedAt);
                    break;
                case 'statusName':
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
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .innerJoin(tenderInformation, eq(tenderInfos.id, tenderInformation.tenderId))
            .leftJoin(physicalDocs, eq(tenderInfos.id, physicalDocs.tenderId))
            .where(whereClause);
        const total = Number(countResult?.count || 0);

        // Get paginated data
        const rows = await this.db
            .select({
                tenderId: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                courierAddress: tenderInformation.courierAddress,
                physicalDocsRequired: tenderInformation.physicalDocsRequired,
                physicalDocsDeadline: tenderInformation.physicalDocsDeadline,
                teamMember: tenderInfos.teamMember,
                teamMemberName: users.name,
                status: tenderInfos.status,
                statusName: statuses.name,
                item: tenderInfos.item,
                itemName: items.name,
                dueDate: tenderInfos.dueDate,
                physicalDocs: physicalDocs.id,
                courierNo: physicalDocs.courierNo,
                courierDate: physicalDocs.createdAt,
            })
            .from(tenderInfos)
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .innerJoin(tenderInformation, eq(tenderInfos.id, tenderInformation.tenderId))
            .leftJoin(physicalDocs, eq(tenderInfos.id, physicalDocs.tenderId))
            .where(whereClause)
            .limit(limit)
            .offset(offset)
            .orderBy(orderByClause);

        const data: PhysicalDocDashboardRow[] = rows.map((row) => ({
            tenderId: row.tenderId,
            tenderNo: row.tenderNo,
            tenderName: row.tenderName,
            dueDate: row.dueDate,
            courierAddress: row.courierAddress || '',
            physicalDocsRequired: row.physicalDocsRequired || '',
            physicalDocsDeadline: row.physicalDocsDeadline || new Date(),
            teamMemberName: row.teamMemberName || '',
            status: row.status,
            statusName: row.statusName || '',
            latestStatus: null,
            latestStatusName: null,
            statusRemark: null,
            physicalDocs: row.physicalDocs,
            courierNo: row.courierNo || null,
            courierDate: row.courierDate || null,
        }));

        return wrapPaginatedResponse(data, total, page, limit);
    }

    async getDashboardCounts(user?: ValidatedUser, teamId?: number): Promise<{ pending: number; sent: number; 'tender-dnb': number; total: number }> {
        const roleFilterConditions = this.buildRoleFilterConditions(user, teamId);

        const baseConditions = [
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            // TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']),
            eq(tenderInformation.physicalDocsRequired, 'Yes'),
            ...roleFilterConditions,
        ];

        // Count pending: status = 3, physicalDocsId IS NULL
        const pendingConditions = [
            ...baseConditions,
            TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']),
            isNull(physicalDocs.id),
        ];

        // Count sent: status = 30, physicalDocsId IS NOT NULL
        const sentConditions = [
            ...baseConditions,
            TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']),
            isNotNull(physicalDocs.id),
        ];

        // Count tender-dnb: status in dnb category, exclude status 30
        const dnbStatusIds = StatusCache.getIds('dnb');
        const tenderDnbConditions = [
            ...baseConditions,
            ...(dnbStatusIds.length > 0 ? [inArray(tenderInfos.status, dnbStatusIds)] : []),
            notInArray(tenderInfos.status, [30]),
        ];

        const counts = await Promise.all([
            this.db
                .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
                .from(tenderInfos)
                .innerJoin(users, eq(users.id, tenderInfos.teamMember))
                .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
                .leftJoin(items, eq(items.id, tenderInfos.item))
                .innerJoin(tenderInformation, eq(tenderInfos.id, tenderInformation.tenderId))
                .leftJoin(physicalDocs, eq(tenderInfos.id, physicalDocs.tenderId))
                .where(and(...pendingConditions))
                .then(([result]) => Number(result?.count || 0)),
            this.db
                .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
                .from(tenderInfos)
                .innerJoin(users, eq(users.id, tenderInfos.teamMember))
                .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
                .leftJoin(items, eq(items.id, tenderInfos.item))
                .innerJoin(tenderInformation, eq(tenderInfos.id, tenderInformation.tenderId))
                .leftJoin(physicalDocs, eq(tenderInfos.id, physicalDocs.tenderId))
                .where(and(...sentConditions))
                .then(([result]) => Number(result?.count || 0)),
            this.db
                .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
                .from(tenderInfos)
                .innerJoin(users, eq(users.id, tenderInfos.teamMember))
                .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
                .leftJoin(items, eq(items.id, tenderInfos.item))
                .innerJoin(tenderInformation, eq(tenderInfos.id, tenderInformation.tenderId))
                .leftJoin(physicalDocs, eq(tenderInfos.id, physicalDocs.tenderId))
                .where(and(...tenderDnbConditions))
                .then(([result]) => Number(result?.count || 0)),
        ]);

        return {
            pending: counts[0],
            sent: counts[1],
            'tender-dnb': counts[2],
            total: counts.reduce((sum, count) => sum + count, 0),
        };
    }

    async findById(id: number): Promise<PhysicalDocWithPersons | null> {
        const [physicalDoc] = await this.db
            .select()
            .from(physicalDocs)
            .where(eq(physicalDocs.id, id))
            .limit(1);

        if (!physicalDoc) {
            return null;
        }

        // Fetch persons for this physical doc
        const persons = await this.db
            .select()
            .from(physicalDocsPersons)
            .where(eq(physicalDocsPersons.physicalDocId, id));

        return {
            id: physicalDoc.id,
            tenderId: physicalDoc.tenderId,
            courierNo: physicalDoc.courierNo,
            submittedDocs: physicalDoc.submittedDocs,
            createdAt: physicalDoc.createdAt || '',
            updatedAt: physicalDoc.updatedAt || '',
            persons: persons.map((p) => ({
                id: p.id,
                name: p.name,
                email: p.email,
                phone: p.phone,
            })),
        };
    }

    async findByTenderId(tenderId: number): Promise<PhysicalDocDashboardRow | null> {
        const rows = await this.db
            .select({
                tenderId: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                courierAddress: tenderInfos.courierAddress,
                physicalDocsRequired: tenderInformation.physicalDocsRequired,
                physicalDocsDeadline: tenderInformation.physicalDocsDeadline,
                teamMemberName: users.name,
                statusName: statuses.name,
                physicalDocs: physicalDocs.id,
                courierNo: physicalDocs.courierNo,
            })
            .from(tenderInfos)
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(
                tenderInformation,
                eq(tenderInfos.id, tenderInformation.tenderId)
            )
            .leftJoin(physicalDocs, eq(tenderInfos.id, physicalDocs.tenderId))
            .where(eq(tenderInfos.id, tenderId))
            .limit(1);

        return rows[0] as unknown as PhysicalDocDashboardRow;
    }

    async findByTenderIdWithPersons(
        tenderId: number
    ): Promise<PhysicalDocWithPersons | null> {
        const [physicalDoc] = await this.db
            .select()
            .from(physicalDocs)
            .where(eq(physicalDocs.tenderId, tenderId))
            .limit(1);

        if (!physicalDoc) {
            return null;
        }

        // Fetch persons for this physical doc
        const persons = await this.db
            .select()
            .from(physicalDocsPersons)
            .where(eq(physicalDocsPersons.physicalDocId, physicalDoc.id));

        return {
            id: physicalDoc.id,
            tenderId: physicalDoc.tenderId,
            courierNo: physicalDoc.courierNo,
            submittedDocs: physicalDoc.submittedDocs,
            createdAt: physicalDoc.createdAt || '',
            updatedAt: physicalDoc.updatedAt || '',
            persons: persons.map((p) => ({
                id: p.id,
                name: p.name,
                email: p.email,
                phone: p.phone,
            })),
        };
    }

    async findByIdWithTender(id: number) {
        const physicalDoc = await this.findById(id);
        if (!physicalDoc) {
            throw new NotFoundException(`Physical doc with ID ${id} not found`);
        }

        const tender = await this.tenderInfosService.getTenderForPhysicalDocs(
            physicalDoc.tenderId
        );

        return {
            ...physicalDoc,
            tender,
        };
    }

    async create(data: CreatePhysicalDocDto, changedBy: number): Promise<PhysicalDocWithPersons> {
        // Validate tender exists and is approved
        await this.tenderInfosService.validateApproved(data.tenderId);

        // Get current tender status before update
        const currentTender = await this.tenderInfosService.findById(data.tenderId);
        const prevStatus = currentTender?.status ?? null;

        // AUTO STATUS CHANGE: Update tender status to 30 (Physical Docs Submitted) and track it
        const newStatus = 30; // Status ID for "Physical Docs Submitted"

        return await this.db.transaction(async (tx) => {
            // Insert physical doc
            const [physicalDoc] = await tx
                .insert(physicalDocs)
                .values({
                    tenderId: data.tenderId,
                    courierNo: data.courierNo,
                    submittedDocs: data.submittedDocs || null,
                })
                .returning();

            // Insert persons if provided
            let persons: PhysicalDocPerson[] = [];
            if (data.physicalDocsPersons && data.physicalDocsPersons.length > 0) {
                const personsToInsert = data.physicalDocsPersons.map((person) => ({
                    physicalDocId: physicalDoc.id,
                    name: person.name,
                    email: person.email,
                    phone: person.phone,
                }));

                const insertedPersons = await tx
                    .insert(physicalDocsPersons)
                    .values(personsToInsert)
                    .returning();

                persons = insertedPersons.map((p) => ({
                    id: p.id,
                    name: p.name,
                    email: p.email,
                    phone: p.phone,
                }));
            }

            // Update tender status
            await tx
                .update(tenderInfos)
                .set({ status: newStatus, updatedAt: new Date() })
                .where(eq(tenderInfos.id, data.tenderId));

            // Track status change
            await this.tenderStatusHistoryService.trackStatusChange(
                data.tenderId,
                newStatus,
                changedBy,
                prevStatus,
                'Physical docs submitted',
                tx
            );

            return {
                id: physicalDoc.id,
                tenderId: physicalDoc.tenderId,
                courierNo: physicalDoc.courierNo,
                submittedDocs: physicalDoc.submittedDocs,
                createdAt: physicalDoc.createdAt || '',
                updatedAt: physicalDoc.updatedAt || '',
                persons,
            };
        }).then(async (result) => {
            // Send email notification after transaction
            await this.sendPhysicalDocsSentEmail(data.tenderId, result, changedBy);

            // TIMER TRANSITION: Complete physical_docs step
            try {
                this.logger.log(`Transitioning timers for tender ${data.tenderId} after physical docs submitted`);

                // Get workflow status
                const workflowStatus = await this.workflowService.getWorkflowStatus('TENDER', data.tenderId.toString());

                // Complete the physical_docs step
                const physicalDocsStep = workflowStatus.steps.find(step =>
                    step.stepKey === 'physical_docs' && step.status === 'IN_PROGRESS'
                );

                if (physicalDocsStep) {
                    this.logger.log(`Completing physical_docs step ${physicalDocsStep.id} for tender ${data.tenderId}`);
                    await this.workflowService.completeStep(physicalDocsStep.id.toString(), {
                        userId: changedBy.toString(),
                        notes: 'Physical docs submitted'
                    });
                    this.logger.log(`Successfully completed physical_docs step for tender ${data.tenderId}`);
                } else {
                    this.logger.warn(`No active physical_docs step found for tender ${data.tenderId}`);
                    // Try to find any physical_docs step
                    const anyPhysicalDocsStep = workflowStatus.steps.find(step => step.stepKey === 'physical_docs');
                    if (anyPhysicalDocsStep) {
                        this.logger.warn(`Found physical_docs step ${anyPhysicalDocsStep.id} with status ${anyPhysicalDocsStep.status}`);
                    }
                }
            } catch (error) {
                this.logger.error(`Failed to transition timers for tender ${data.tenderId} after physical docs submitted:`, error);
                // Don't fail the entire operation if timer transition fails
            }

            return result;
        });
    }

    async update(
        id: number,
        data: UpdatePhysicalDocDto
    ): Promise<PhysicalDocWithPersons> {
        return await this.db.transaction(async (tx) => {
            // Update physical doc
            const updateData: Partial<NewPhysicalDocs> = {};
            if (data.courierNo !== undefined) updateData.courierNo = data.courierNo;
            if (data.submittedDocs !== undefined)
                updateData.submittedDocs = data.submittedDocs;
            updateData.updatedAt = new Date();

            const [physicalDoc] = await tx
                .update(physicalDocs)
                .set(updateData)
                .where(eq(physicalDocs.id, id))
                .returning();

            if (!physicalDoc) {
                throw new NotFoundException(`Physical doc with ID ${id} not found`);
            }

            // Handle persons if provided
            let persons: PhysicalDocPerson[] = [];
            if (data.physicalDocsPersons !== undefined) {
                // Fetch existing persons
                const existingPersons = await tx
                    .select()
                    .from(physicalDocsPersons)
                    .where(eq(physicalDocsPersons.physicalDocId, id));

                const newPersons = data.physicalDocsPersons || [];

                // Delete persons that are not in the new list
                const newEmails = new Set(newPersons.map((p) => p.email));
                const personsToDelete = existingPersons.filter(
                    (p) => !newEmails.has(p.email)
                );

                for (const person of personsToDelete) {
                    await tx
                        .delete(physicalDocsPersons)
                        .where(eq(physicalDocsPersons.id, person.id));
                }

                // Update or insert persons
                for (const newPerson of newPersons) {
                    const existingPerson = existingPersons.find(
                        (p) => p.email === newPerson.email
                    );

                    if (existingPerson) {
                        // Update existing person
                        await tx
                            .update(physicalDocsPersons)
                            .set({
                                name: newPerson.name,
                                phone: newPerson.phone,
                                updatedAt: new Date(),
                            })
                            .where(eq(physicalDocsPersons.id, existingPerson.id));
                    } else {
                        // Insert new person
                        await tx.insert(physicalDocsPersons).values({
                            physicalDocId: id,
                            name: newPerson.name,
                            email: newPerson.email,
                            phone: newPerson.phone,
                        });
                    }
                }

                // Fetch updated persons list
                const updatedPersons = await tx
                    .select()
                    .from(physicalDocsPersons)
                    .where(eq(physicalDocsPersons.physicalDocId, id));

                persons = updatedPersons.map((p) => ({
                    id: p.id,
                    name: p.name,
                    email: p.email,
                    phone: p.phone,
                }));
            } else {
                // If persons not provided, fetch existing ones
                const existingPersons = await tx
                    .select()
                    .from(physicalDocsPersons)
                    .where(eq(physicalDocsPersons.physicalDocId, id));

                persons = existingPersons.map((p) => ({
                    id: p.id,
                    name: p.name,
                    email: p.email,
                    phone: p.phone,
                }));
            }

            return {
                id: physicalDoc.id,
                tenderId: physicalDoc.tenderId,
                courierNo: physicalDoc.courierNo,
                submittedDocs: physicalDoc.submittedDocs,
                createdAt: physicalDoc.createdAt || '',
                updatedAt: physicalDoc.updatedAt || '',
                persons,
            };
        });
    }

    async delete(id: number): Promise<void> {
        const result = await this.db
            .delete(physicalDocs)
            .where(eq(physicalDocs.id, id))
            .returning();
        if (!result[0]) {
            throw new NotFoundException(`Physical doc with ID ${id} not found`);
        }
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
            // Don't throw - email failure shouldn't break main operation
        }
    }

    /**
     * Send physical docs sent email to clients
     */
    private async sendPhysicalDocsSentEmail(
        tenderId: number,
        physicalDoc: PhysicalDocWithPersons,
        sentBy: number
    ) {
        const tender = await this.tenderInfosService.findById(tenderId);
        if (!tender || !tender.teamMember) return;

        // Get TE user details
        const teUser = await this.recipientResolver.getUserById(tender.teamMember);
        if (!teUser) return;

        // Get client emails from tender clients
        const clients = await this.db
            .select({
                clientName: tenderClients.clientName,
                clientEmail: tenderClients.clientEmail,
            })
            .from(tenderClients)
            .where(eq(tenderClients.tenderId, tenderId));

        if (clients.length === 0) return;

        // Format due date
        const dueDate = tender.dueDate ? new Date(tender.dueDate).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }) : 'Not specified';

        // Get courier provider from persons if available, otherwise use placeholder
        const courierProvider = physicalDoc.persons.length > 0 ? physicalDoc.persons[0].name : 'Courier Service';
        const deliveryTime = 'As per courier service'; // TODO: Get from courier service if available

        // Send email to each client
        for (const client of clients) {
            if (!client.clientEmail) continue;

            const emailData = {
                clientName: client.clientName || 'Sir/Madam',
                tenderNo: tender.tenderNo,
                dueDate,
                courierProvider,
                docketNo: physicalDoc.courierNo.toString(),
                deliveryTime,
                tenderExecutive: teUser.name,
            };

            await this.sendEmail(
                'physical-docs.sent',
                tenderId,
                sentBy,
                `Physical Documents Courier - ${tender.tenderNo}`,
                'physical-docs-sent',
                emailData,
                {
                    to: [{ type: 'emails', emails: [client.clientEmail] }],
                    cc: [
                        { type: 'role', role: 'Admin', teamId: tender.team },
                        { type: 'role', role: 'Team Leader', teamId: tender.team },
                        { type: 'role', role: 'Coordinator', teamId: tender.team },
                    ],
                }
            );
        }
    }

}
