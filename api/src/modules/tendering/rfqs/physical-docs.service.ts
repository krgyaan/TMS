import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import { tenderInfos } from '../../../db/tenders.schema';
import { statuses } from '../../../db/statuses.schema';
import { users } from '../../../db/users.schema';
import { physicalDocs, PhysicalDocs, type NewPhysicalDocs } from 'src/db/physical-docs.schema';
import { tenderInformation } from 'src/db/tender-info-sheet.schema';

type PhysicalDocRow = {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    courierAddress: string;
    physicalDocsRequired: string;
    physicalDocsDeadline: Date;
    teamMemberName: string;
    statusName: string;
    physicalDocs: PhysicalDocs | null;
}

@Injectable()
export class PhysicalDocsService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    async findAll(): Promise<PhysicalDocRow[]> {
        console.log("tlStatus data type: ", tenderInfos.tlStatus.dataType);
        const rows = await this.db.select({
            id: tenderInfos.id,
            tenderNo: tenderInfos.tenderNo,
            tenderName: tenderInfos.tenderName,
            courierAddress: tenderInfos.courierAddress,
            physicalDocsRequired: tenderInformation?.physicalDocsRequired,
            physicalDocsDeadline: tenderInformation?.physicalDocsDeadline,
            teamMember: tenderInfos.teamMember,
            status: tenderInfos.status,
            teamMemberName: users.name,
            statusName: statuses.name,
            physicalDocs: physicalDocs?.id,
        })
            .from(tenderInfos)
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(tenderInformation, eq(tenderInfos.id, tenderInformation.tenderId))
            .leftJoin(physicalDocs, eq(tenderInfos.id, physicalDocs.tenderId))
            .where(sql`${tenderInfos.tlStatus} = 1`);
        // console.log("rows: ", rows);
        const pendingRows = rows.filter((row) => row.physicalDocs === null);
        const sentRows = rows.filter((row) => row.physicalDocs !== null);
        return [...pendingRows, ...sentRows] as unknown as PhysicalDocRow[];
    }

    async findById(id: number): Promise<PhysicalDocRow | null> {
        const rows = await this.db
            .select({
                id: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                courierAddress: tenderInfos.courierAddress,
                physicalDocsRequired: tenderInformation?.physicalDocsRequired,
                physicalDocsDeadline: tenderInformation?.physicalDocsDeadline,
                teamMemberName: users.name,
                statusName: statuses.name,
                // physicalDocs: physicalDocs?.id,
            })
            .from(tenderInfos)
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(tenderInformation, eq(tenderInfos.id, tenderInformation.tenderId))
            // .leftJoin(physicalDocs, eq(tenderInfos.id, physicalDocs.tenderId))
            .where(eq(tenderInfos.id, id))
            .limit(1);

        return rows[0] as unknown as PhysicalDocRow;
    }

    async create(data: NewPhysicalDocs): Promise<PhysicalDocs> {
        const rows = await this.db.insert(physicalDocs).values(data).returning();
        return rows[0];
    }

    async update(id: number, data: Partial<NewPhysicalDocs>): Promise<PhysicalDocs> {
        const rows = await this.db
            .update(physicalDocs)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(physicalDocs.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`Physical doc with ID ${id} not found`);
        }
        return rows[0];
    }

    async delete(id: number): Promise<void> {
        const result = await this.db.delete(physicalDocs).where(eq(physicalDocs.id, id)).returning();
        if (!result[0]) {
            throw new NotFoundException(`Physical doc with ID ${id} not found`);
        }
    }
}
