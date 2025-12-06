import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { users } from '@db/schemas/auth/users.schema';
import { items } from '@db/schemas/master/items.schema';
import { tenderInformation } from '@db/schemas/tendering/tender-info-sheet.schema';
import { tenderDocumentChecklists } from '@db/schemas/tendering/tender-document-checklists.schema';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';

type ChecklistDashboardRow = {
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
export class ChecklistsService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    async findAll(): Promise<ChecklistDashboardRow[]> {
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
                hasChecklist: tenderDocumentChecklists.id,
            })
            .from(tenderInfos)
            .innerJoin(tenderInformation, eq(tenderInfos.id, tenderInformation.tenderId))
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(
                tenderDocumentChecklists,
                sql`${tenderDocumentChecklists.tenderId}::int = ${tenderInfos.id}`
            )
            .where(and(
                eq(tenderInfos.tlStatus, 1),
                eq(tenderInfos.deleteStatus, 0),
                TenderInfosService.getExcludeDnbTlStatusCondition()
            ));

        // Remove duplicates (tender can have multiple checklist documents)
        const uniqueTenders = new Map<number, ChecklistDashboardRow>();

        rows.forEach((row) => {
            if (!uniqueTenders.has(row.tenderId)) {
                uniqueTenders.set(row.tenderId, {
                    tenderId: row.tenderId,
                    tenderNo: row.tenderNo,
                    tenderName: row.tenderName,
                    teamMemberName: row.teamMemberName,
                    itemName: row.itemName,
                    statusName: row.statusName,
                    dueDate: row.dueDate,
                    gstValues: row.gstValues ? Number(row.gstValues) : 0,
                    checklistSubmitted: row.hasChecklist !== null,
                });
            }
        });

        return Array.from(uniqueTenders.values());
    }
}
