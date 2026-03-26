import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { woKickoffMeetings } from '@db/schemas/operations/kick-off-meetings.schema';
import { and, asc, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { KickOffMeetingDashboardRow, SaveKickOffMeetingDto, UpdateKickOffMeetingMomDto } from './dto/kick-off-meeting.dto';
import { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { wrapPaginatedResponse } from '@/utils/responseWrapper';
import { PaginatedResult } from '@/modules/tendering/types/shared.types';
import { users } from '@/db/schemas';
import { woAcceptance, woBasicDetails, woDetails } from '@/db/schemas/operations';

@Injectable()
export class KickOffMeetingService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async getDashboardData(tab?: 'not_scheduled' | 'scheduled', filters?: {page?: number;limit?: number;sortBy?: string;sortOrder?: 'asc' | 'desc';search?: string;}, user?: ValidatedUser, teamId?: number): Promise<PaginatedResult<KickOffMeetingDashboardRow>> {
        const page = filters?.page ?? 1;
        const limit = filters?.limit ?? 50;
        const offset = (page - 1) * limit;
        const activeTab = tab ?? 'not_scheduled';

        const conditions: any[] = [
            eq(woAcceptance.status, 'completed')
        ];
        // Tab filter
        if (activeTab === 'not_scheduled') {
            conditions.push(isNull(sql`latest_kickoff.id`));
        } else if (activeTab === 'scheduled') {
            conditions.push(isNotNull(sql`latest_kickoff.id`));
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

        // Latest Kickoff Subquery
        const latestKickoff = this.db
            .select({
            id: woKickoffMeetings.id,
            woDetailId: woKickoffMeetings.woDetailId,
            meetingDate: woKickoffMeetings.meetingDate,
            meetingLink: woKickoffMeetings.meetingLink,
            momFilePath: woKickoffMeetings.momFilePath,
            })
            .from(woKickoffMeetings)
            .where(
            eq(
                woKickoffMeetings.id,
                sql`(
                SELECT km.id
                FROM wo_kickoff_meetings km
                WHERE km.wo_detail_id = ${woKickoffMeetings.woDetailId}
                ORDER BY km.meeting_date DESC
                LIMIT 1
                )`
            )
            )
            .as('latest_kickoff');

        // Sorting
        const sortBy = filters?.sortBy;
        const sortOrder = filters?.sortOrder === 'desc' ? desc : asc;

        let orderByClause: any = sql`latest_kickoff.meeting_date IS NULL, latest_kickoff.meeting_date ASC`;

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
            case 'meetingDate':
                orderByClause = sortOrder(sql`latest_kickoff.meeting_date`);
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
            .select({
            count: sql<number>`count(distinct ${woDetails.id})`,
            })
            .from(woDetails)
            .leftJoin(woBasicDetails, eq(woBasicDetails.id, woDetails.woBasicDetailId))
            .leftJoin(users, eq(users.id, woBasicDetails.oeFirst))
            .leftJoin(latestKickoff, eq(latestKickoff.woDetailId, woDetails.id))
            .leftJoin(woAcceptance, eq(woAcceptance.woDetailId, woDetails.id))
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

                meetingDate: sql<Date | null>`latest_kickoff.meeting_date`,
                meetingLink: sql<string | null>`latest_kickoff.meeting_link`,
                momFilePath: sql<string | null>`latest_kickoff.mom_file_path`,
                kickOffMeetingId: sql<number | null>`latest_kickoff.id`,
            })
            .from(woDetails)
            .leftJoin(woBasicDetails, eq(woBasicDetails.id, woDetails.woBasicDetailId))
            .leftJoin(users, eq(users.id, woBasicDetails.oeFirst))
            .leftJoin(latestKickoff, eq(latestKickoff.woDetailId, woDetails.id))
            .leftJoin(woAcceptance, eq(woAcceptance.woDetailId, woDetails.id))
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset);

        // Mapping
        const data = rows.map(row => ({
            id: row.kickOffMeetingId,
            woDetailId: row.woDetailId,
            projectName: row.projectName,
            woNumber: row.woNumber,
            woDate: row.woDate ? new Date(row.woDate) : null,
            woValuePreGst: row.woValuePreGst ? Number(row.woValuePreGst) : null,
            woValueGstAmt: row.woValueGstAmt ? Number(row.woValueGstAmt) : null,
            woStatus: row.woStatus,
            meetingDate: row.meetingDate ?? null,
            meetingLink: row.meetingLink,
            momFilePath: row.momFilePath,
            teamMemberName: row.teamMemberName,
        }));

        return wrapPaginatedResponse(data, total, page, limit);
    }

    async getDashboardCounts(user?: ValidatedUser, teamId?: number): Promise<{ 'scheduled': number; 'not_scheduled': number; total: number }> {
        // Apply role-based filtering
        const roleFilterConditions: any[] = [];

        // Latest Kickoff Subquery (same as in getDashboardData)
        const latestKickoff = this.db
            .select({
                id: woKickoffMeetings.id,
                woDetailId: woKickoffMeetings.woDetailId,
            })
            .from(woKickoffMeetings)
            .where(
                eq(
                    woKickoffMeetings.id,
                    sql`(
                        SELECT km.id
                        FROM wo_kickoff_meetings km
                        WHERE km.wo_detail_id = ${woKickoffMeetings.woDetailId}
                        ORDER BY km.meeting_date DESC
                        LIMIT 1
                    )`
                )
            )
            .as('latest_kickoff');

        const baseConditions = [...roleFilterConditions, eq(woAcceptance.status, 'completed')];

        // Count not_scheduled: kickoff IS NULL
        const notScheduledConditions = [...baseConditions, isNull(sql`latest_kickoff.id`)];

        // Count scheduled: kickoff IS NOT NULL
        const scheduledConditions = [...baseConditions, isNotNull(sql`latest_kickoff.id`)];

        const [notScheduledResult, scheduledResult] = await Promise.all([
            this.db
                .select({ count: sql<number>`count(distinct ${woDetails.id})` })
                .from(woDetails)
                .leftJoin(woBasicDetails, eq(woBasicDetails.id, woDetails.woBasicDetailId))
                .leftJoin(users, eq(users.id, woBasicDetails.oeFirst))
                .leftJoin(latestKickoff, eq(latestKickoff.woDetailId, woDetails.id))
                .leftJoin(woAcceptance, eq(woAcceptance.woDetailId, woDetails.id))
                .where(notScheduledConditions.length ? and(...notScheduledConditions) : undefined)
                .then(r => Number(r[0]?.count || 0)),
            this.db
                .select({ count: sql<number>`count(distinct ${woDetails.id})` })
                .from(woDetails)
                .leftJoin(woBasicDetails, eq(woBasicDetails.id, woDetails.woBasicDetailId))
                .leftJoin(users, eq(users.id, woBasicDetails.oeFirst))
                .leftJoin(latestKickoff, eq(latestKickoff.woDetailId, woDetails.id))
                .leftJoin(woAcceptance, eq(woAcceptance.woDetailId, woDetails.id))
                .where(scheduledConditions.length ? and(...scheduledConditions) : undefined)
                .then(r => Number(r[0]?.count || 0)),
        ]);

        return {
            scheduled: scheduledResult,
            not_scheduled: notScheduledResult,
            total: notScheduledResult + scheduledResult,
        };
    }

  async getByWoDetailId(woDetailId: number) {
    const [meeting] = await this.db
      .select()
      .from(woKickoffMeetings)
      .where(eq(woKickoffMeetings.woDetailId, woDetailId))
      .limit(1);
    return meeting || null;
  }

  async saveKickOffMeeting(userId: number, dto: SaveKickOffMeetingDto) {
    const existing = await this.getByWoDetailId(dto.woDetailId);

    if (existing) {
      const [updated] = await this.db
        .update(woKickoffMeetings)
        .set({
          meetingDate: dto.meetingDate ? new Date(dto.meetingDate) : null,
          meetingLink: dto.meetingLink || null,
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(woKickoffMeetings.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await this.db
      .insert(woKickoffMeetings)
      .values({
        woDetailId: dto.woDetailId,
        meetingDate: dto.meetingDate ? new Date(dto.meetingDate) : null,
        meetingLink: dto.meetingLink || null,
        createdBy: userId,
      })
      .returning();
    return created;
  }

  async updateMomFilePath(id: number, userId: number, dto: UpdateKickOffMeetingMomDto) {
    const [updated] = await this.db
      .update(woKickoffMeetings)
      .set({
        momFilePath: dto.momFilePath,
        momUploadedAt: new Date(),
        momUploadedBy: userId,
        status: 'mom_uploaded',
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(woKickoffMeetings.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Kick-off meeting with ID ${id} not found`);
    }

    return updated;
  }
}
