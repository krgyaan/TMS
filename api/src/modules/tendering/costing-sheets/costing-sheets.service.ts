import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import { tenderInfos } from '../../../db/tenders.schema';
import { statuses } from '../../../db/statuses.schema';
import { users } from '../../../db/users.schema';
import { items } from '../../../db/items.schema';
import { tenderInformation } from '../../../db/tender-info-sheet.schema';
import { TenderInfosService } from '../tenders/tenders.service';

type CostingSheetDashboardRow = {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamMemberName: string | null;
    itemName: string | null;
    statusName: string | null;
    dueDate: Date | null;
    gstValues: number;
}

@Injectable()
export class CostingSheetsService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    async findAll(): Promise<CostingSheetDashboardRow[]> {
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
            })
            .from(tenderInfos)
            .innerJoin(tenderInformation, eq(tenderInfos.id, tenderInformation.tenderId))
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .where(and(
                eq(tenderInfos.tlStatus, 1),
                eq(tenderInfos.deleteStatus, 0),
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
        }));
    }
}
