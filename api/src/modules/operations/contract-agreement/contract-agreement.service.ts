import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { and, asc, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { ContractAgreementDashboardRow, SaveContractAgreementDto } from './dto/contract-agreement.dto';
import { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { wrapPaginatedResponse } from '@/utils/responseWrapper';
import { PaginatedResult } from '@/modules/tendering/types/shared.types';
import { users } from '@/db/schemas';
import { woBasicDetails, woDetails } from '@/db/schemas/operations';

@Injectable()
export class ContractAgreementService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async getDashboardData(tab?: 'not_uploaded' | 'uploaded', filters?: {page?: number;limit?: number;sortBy?: string;sortOrder?: 'asc' | 'desc';search?: string;}, user?: ValidatedUser, teamId?: number): Promise<PaginatedResult<ContractAgreementDashboardRow>> {
        const page = filters?.page ?? 1;
        const limit = filters?.limit ?? 50;
        const offset = (page - 1) * limit;
        const activeTab = tab ?? 'not_uploaded';

        const conditions: any[] = [
            eq(woDetails.isContractAgreement, true),
        ];
        // Tab filter
        if (activeTab === 'not_uploaded') {
            conditions.push(isNull(woDetails.veSigned), isNull(woDetails.clientAndVeSigned));
        } else if (activeTab === 'uploaded') {
            conditions.push(isNotNull(woDetails.veSigned), isNotNull(woDetails.clientAndVeSigned));
        }

        // Search (optimized)
        if (filters?.search) {
            const searchStr = `%${filters.search}%`;
            conditions.push(sql`(
            ${woBasicDetails.projectName} ILIKE ${searchStr} OR
            ${woBasicDetails.woNumber} ILIKE ${searchStr} OR
            ${woBasicDetails.woValuePreGst}::text ILIKE ${searchStr} OR
            ${woBasicDetails.woValueGstAmt}::text ILIKE ${searchStr} OR
            ${users.name} ILIKE ${searchStr}
            )`);
        }

        const whereClause = conditions.length ? and(...conditions) : undefined;

        // Sorting
        const sortBy = filters?.sortBy;
        const sortOrder = filters?.sortOrder === 'desc' ? desc : asc;
        let orderByClause: any = desc(woDetails.id);

        if (sortBy) {
            switch (sortBy) {
            case 'woNumber':
                orderByClause = sortOrder(woBasicDetails.woNumber);
                break;
            case 'projectName':
                orderByClause = sortOrder(woBasicDetails.projectName);
                break;
            case 'teamMemberName':
                orderByClause = sortOrder(users.name);
                break;
            case 'woDate':
                orderByClause = sortOrder(woBasicDetails.woDate);
                break;
            case 'woValuePreGst':
                orderByClause = sortOrder(woBasicDetails.woValuePreGst);
                break;
            case 'woValueGstAmt':
                orderByClause = sortOrder(woBasicDetails.woValueGstAmt);
                break;
            case 'woStatus':
                orderByClause = sortOrder(woDetails.status);
                break;
            }
        }

        // Count Query (consistent)
        const [countResult] = await this.db
            .select({count: sql<number>`count(distinct ${woDetails.id})`})
            .from(woDetails)
            .leftJoin(woBasicDetails, eq(woBasicDetails.id, woDetails.woBasicDetailId))
            .leftJoin(users, eq(users.id, woBasicDetails.oeFirst))
            .where(whereClause);

        const total = Number(countResult?.count || 0);

        // Data Query
        const rows = await this.db
            .select({
                woBasicDetailId: woBasicDetails.id,
                projectName: woBasicDetails.projectName,
                woNumber: woBasicDetails.woNumber,
                teamMemberName: users.name,
                woDate: woBasicDetails.woDate,
                woValuePreGst: woBasicDetails.woValuePreGst,
                woValueGstAmt: woBasicDetails.woValueGstAmt,
                woDetailId: woDetails.id,
                woStatus: woDetails.status,

                veSigned: woDetails.veSigned,
                veSignedDate: woDetails.veSignedDate,
                clientAndVeSigned: woDetails.clientAndVeSigned,
                clientAndVeSignedDate: woDetails.clientAndVeSignedDate,
            })
            .from(woDetails)
            .leftJoin(woBasicDetails, eq(woBasicDetails.id, woDetails.woBasicDetailId))
            .leftJoin(users, eq(users.id, woBasicDetails.oeFirst))
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset);

        // Mapping
        const data = rows.map(row => ({
            id: row.woDetailId,
            woDetailId: row.woDetailId,
            projectName: row.projectName,
            woNumber: row.woNumber,
            woDate: row.woDate ? new Date(row.woDate) : null,
            woValuePreGst: row.woValuePreGst ? Number(row.woValuePreGst) : null,
            woValueGstAmt: row.woValueGstAmt ? Number(row.woValueGstAmt) : null,
            woStatus: row.woStatus,
            veSigned: row.veSigned,
            veSignedDate: row.veSignedDate ? new Date(row.veSignedDate) : null,
            clientAndVeSigned: row.clientAndVeSigned,
            clientAndVeSignedDate: row.clientAndVeSignedDate ? new Date(row.clientAndVeSignedDate) : null,
            teamMemberName: row.teamMemberName,
        }));

        return wrapPaginatedResponse(data, total, page, limit);
    }

    async getDashboardCounts(user?: ValidatedUser, teamId?: number): Promise<{ 'uploaded': number; 'not_uploaded': number; total: number }> {
        // Apply role-based filtering
        const baseConditions = [eq(woDetails.isContractAgreement, true)];

        // Count not_scheduled: kickoff IS NULL
        const notScheduledConditions = [...baseConditions, isNull(woDetails.veSigned), isNull(woDetails.clientAndVeSigned)];

        // Count scheduled: kickoff IS NOT NULL
        const scheduledConditions = [...baseConditions, isNotNull(woDetails.veSigned), isNotNull(woDetails.clientAndVeSigned)];

        const [notScheduledResult, scheduledResult] = await Promise.all([
            this.db
                .select({ count: sql<number>`count(distinct ${woDetails.id})` })
                .from(woDetails)
                .leftJoin(woBasicDetails, eq(woBasicDetails.id, woDetails.woBasicDetailId))
                .leftJoin(users, eq(users.id, woBasicDetails.oeFirst))
                .where(notScheduledConditions.length ? and(...notScheduledConditions) : undefined)
                .then(r => Number(r[0]?.count || 0)),
            this.db
                .select({ count: sql<number>`count(distinct ${woDetails.id})` })
                .from(woDetails)
                .leftJoin(woBasicDetails, eq(woBasicDetails.id, woDetails.woBasicDetailId))
                .leftJoin(users, eq(users.id, woBasicDetails.oeFirst))
                .where(scheduledConditions.length ? and(...scheduledConditions) : undefined)
                .then(r => Number(r[0]?.count || 0)),
        ]);

        return {
            uploaded: scheduledResult,
            not_uploaded: notScheduledResult,
            total: notScheduledResult + scheduledResult,
        };
    }

  async getByWoDetailId(woDetailId: number) {
    const [woDetail] = await this.db
      .select()
      .from(woDetails)
      .where(eq(woDetails.id, woDetailId))
      .limit(1);
    return woDetail || null;
  }

    async saveContractAgreement(userId: number, dto: SaveContractAgreementDto) {
        const updateData: any = {
            updatedBy: userId,
            updatedAt: new Date(),
        };
        if (dto.veSigned !== undefined) {
            updateData.veSigned = dto.veSigned;
        }
        if (dto.veSignedDate !== undefined) {
            updateData.veSignedDate = dto.veSignedDate;
        }
        if (dto.clientAndVeSigned !== undefined) {
            updateData.clientAndVeSigned = dto.clientAndVeSigned;
        }
        if (dto.clientAndVeSignedDate !== undefined) {
            updateData.clientAndVeSignedDate = dto.clientAndVeSignedDate;
        }
        const [updated] = await this.db
            .update(woDetails)
            .set(updateData)
            .where(eq(woDetails.id, dto.woDetailId))
            .returning();

        return updated;
    }
}
