import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, asc, desc, sql, isNull, isNotNull } from 'drizzle-orm';
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
import type {
    CreatePhysicalDocDto,
    UpdatePhysicalDocDto,
} from '@/modules/tendering/physical-docs/dto/physical-docs.dto';
import { TenderInfosService, type PaginatedResult } from '@/modules/tendering/tenders/tenders.service';
import { items } from '@db/schemas/master/items.schema';
import { TenderStatusHistoryService } from '@/modules/tendering/tender-status-history/tender-status-history.service';
import { EmailService } from '@/modules/email/email.service';
import { RecipientResolver } from '@/modules/email/recipient.resolver';
import type { RecipientSource } from '@/modules/email/dto/send-email.dto';
import { Logger } from '@nestjs/common';
import { tenderClients } from '@db/schemas/tendering/tender-info-sheet.schema';

export type PhysicalDocFilters = {
    physicalDocsSent?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
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
    statusName: string;
    physicalDocs: number | null;
    courierNo: number | null;
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
    ) { }

    async findAll(filters?: PhysicalDocFilters): Promise<PaginatedResult<PhysicalDocDashboardRow>> {
        console.log("Filters:", filters);
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        // Build WHERE conditions
        const baseConditions = [
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            eq(tenderInformation.physicalDocsRequired, 'YES'),
            TenderInfosService.getExcludeStatusCondition(['dnb', 'lost'])
        ];

        // Add physicalDocsSent filter condition
        if (filters?.physicalDocsSent !== undefined) {
            if (filters.physicalDocsSent) {
                baseConditions.push(isNotNull(physicalDocs.id));
            } else {
                baseConditions.push(isNull(physicalDocs.id));
            }
        }

        const whereClause = and(...baseConditions);

        // Get total count
        const [countResult] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(tenderInfos)
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
            .innerJoin(items, eq(items.id, tenderInfos.item))
            .innerJoin(
                tenderInformation,
                eq(tenderInfos.id, tenderInformation.tenderId)
            )
            .leftJoin(physicalDocs, eq(tenderInfos.id, physicalDocs.tenderId))
            .where(whereClause);
        const total = Number(countResult?.count || 0);

        // Apply sorting
        let orderByClause;
        if (filters?.sortBy) {
            const sortOrder = filters.sortOrder === 'desc' ? desc : asc;
            switch (filters.sortBy) {
                case 'tenderNo':
                    orderByClause = sortOrder(tenderInfos.tenderNo);
                    break;
                case 'tenderName':
                    orderByClause = sortOrder(tenderInfos.tenderName);
                    break;
                case 'teamMemberName':
                    orderByClause = sortOrder(users.name);
                    break;
                case 'dueDate':
                    orderByClause = sortOrder(tenderInfos.dueDate);
                    break;
                case 'statusName':
                    orderByClause = sortOrder(statuses.name);
                    break;
                default:
                    orderByClause = asc(tenderInfos.dueDate);
            }
        } else {
            orderByClause = asc(tenderInfos.dueDate);
        }

        // Get paginated data
        const rows = await this.db
            .select({
                tenderId: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                courierAddress: tenderInfos.courierAddress,
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
            })
            .from(tenderInfos)
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
            .innerJoin(items, eq(items.id, tenderInfos.item))
            .innerJoin(
                tenderInformation,
                eq(tenderInfos.id, tenderInformation.tenderId)
            )
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
            statusName: row.statusName || '',
            physicalDocs: row.physicalDocs,
            courierNo: row.courierNo || null,
        }));
        // const data = rows.map(RowMappers.mapPhysicalDocRow as PhysicalDocDashboardRow);

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

    async getDashboardCounts(): Promise<{ pending: number; sent: number; total: number }> {
        const [pendingCountResult] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(physicalDocs)
            .where(isNull(physicalDocs.id));
        const pending = Number(pendingCountResult?.count || 0);
        const [sentCountResult] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(physicalDocs)
            .where(isNotNull(physicalDocs.id));
        const sent = Number(sentCountResult?.count || 0);
        const total = pending + sent;
        return { pending, sent, total };
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
                `Physical Documents Sent: ${tender.tenderNo}`,
                'physical-docs-sent',
                emailData,
                {
                    to: [{ type: 'emails', emails: [client.clientEmail] }],
                }
            );
        }
    }

}
