import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
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

@Injectable()
export class DocumentChecklistsService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    async findAll(): Promise<TenderDocumentChecklistDashboardRow[]> {
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
            .where(and(
                TenderInfosService.getActiveCondition(),
                TenderInfosService.getApprovedCondition(),
                TenderInfosService.getExcludeDnbTlStatusCondition()
            ));

        return rows.map((row) => ({
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
}
