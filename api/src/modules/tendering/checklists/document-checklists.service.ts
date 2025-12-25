import { Inject, Injectable } from '@nestjs/common';
import { and, eq, asc, desc, sql, isNull, isNotNull } from 'drizzle-orm';
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
import type { PaginatedResult } from '@/modules/tendering/tenders/tenders.service';
import { EmailService } from '@/modules/email/email.service';
import { RecipientResolver } from '@/modules/email/recipient.resolver';
import type { RecipientSource } from '@/modules/email/dto/send-email.dto';
import { Logger } from '@nestjs/common';

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
}

export type DocumentChecklistFilters = {
    checklistSubmitted?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
};

@Injectable()
export class DocumentChecklistsService {
    private readonly logger = new Logger(DocumentChecklistsService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly emailService: EmailService,
        private readonly recipientResolver: RecipientResolver,
        private readonly tenderInfosService: TenderInfosService,
    ) { }

    async findAll(filters?: DocumentChecklistFilters): Promise<PaginatedResult<TenderDocumentChecklistDashboardRow>> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        // Build WHERE conditions
        const baseConditions = [
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            TenderInfosService.getExcludeStatusCondition(['dnb', 'lost'])
        ];

        // Add checklistSubmitted filter condition
        if (filters?.checklistSubmitted !== undefined) {
            if (filters.checklistSubmitted) {
                baseConditions.push(isNotNull(tenderDocumentChecklists.id));
            } else {
                baseConditions.push(isNull(tenderDocumentChecklists.id));
            }
        }

        const whereClause = and(...baseConditions);

        // Get total count
        const [countResult] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(tenderInfos)
            .innerJoin(tenderInformation, eq(tenderInfos.id, tenderInformation.tenderId))
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(tenderDocumentChecklists, eq(tenderDocumentChecklists.tenderId, tenderInfos.id))
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
                case 'gstValues':
                    orderByClause = sortOrder(tenderInfos.gstValues);
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
            .limit(limit)
            .offset(offset)
            .orderBy(orderByClause);

        const data = rows.map((row) => ({
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

    async getDashboardCounts(): Promise<{ pending: number; submitted: number; total: number }> {
        const [pendingCountResult] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(tenderDocumentChecklists)
            .where(isNull(tenderDocumentChecklists.id));
        const pending = Number(pendingCountResult?.count || 0);
        const [submittedCountResult] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(tenderDocumentChecklists)
            .where(isNotNull(tenderDocumentChecklists.id));
        const submitted = Number(submittedCountResult?.count || 0);
        const total = pending + submitted;
        return { pending, submitted, total };
    }

    async findByTenderId(tenderId: number) {
        const result = await this.db
            .select()
            .from(tenderDocumentChecklists)
            .where(eq(tenderDocumentChecklists.tenderId, tenderId))
            .limit(1);

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
                        name: doc.name ?? '',
                        path: doc.path ?? ''
                    }))
                    : null,
            })
            .returning();

        // Send email notification
        await this.sendDocumentChecklistSubmittedEmail(createDocumentChecklistDto.tenderId, result);

        return result;
    }

    async update(id: number, updateDocumentChecklistDto: UpdateDocumentChecklistDto) {
        const [result] = await this.db
            .update(tenderDocumentChecklists)
            .set({
                selectedDocuments: updateDocumentChecklistDto.selectedDocuments || null,
                extraDocuments: updateDocumentChecklistDto.extraDocuments
                    ? updateDocumentChecklistDto.extraDocuments.map(doc => ({
                        name: doc.name ?? '',
                        path: doc.path ?? ''
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
     * Send document checklist submitted email
     */
    private async sendDocumentChecklistSubmittedEmail(
        tenderId: number,
        checklist: { selectedDocuments: string[] | null; extraDocuments: Array<{ name: string; path: string }> | null }
    ) {
        const tender = await this.tenderInfosService.findById(tenderId);
        if (!tender || !tender.teamMember) return;

        // Get Team Leader name
        const teamLeaderEmails = await this.recipientResolver.getEmailsByRole('Team Leader', tender.team);
        let tlName = 'Team Leader';
        if (teamLeaderEmails.length > 0) {
            const [tlUser] = await this.db
                .select({ name: users.name })
                .from(users)
                .where(eq(users.email, teamLeaderEmails[0]))
                .limit(1);
            if (tlUser?.name) {
                tlName = tlUser.name;
            }
        }

        // Get TE name
        const teUser = await this.recipientResolver.getUserById(tender.teamMember);
        const teName = teUser?.name || 'Tender Executive';

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
            documents: documents.length > 0 ? documents : ['No documents specified'],
            te: teName,
        };

        await this.sendEmail(
            'document-checklist.submitted',
            tenderId,
            tender.teamMember,
            `Document Checklist Submitted: ${tender.tenderNo}`,
            'document-checklist-submitted',
            emailData,
            {
                to: [{ type: 'role', role: 'Team Leader', teamId: tender.team }],
            }
        );
    }
}
