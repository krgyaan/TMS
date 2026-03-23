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
import { woBasicDetails, woDetails } from '@/db/schemas/operations';

@Injectable()
export class KickOffMeetingService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async getDashboardData(
        tab?: 'not_scheduled' | 'scheduled',
        filters?: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc'; search?: string },
        user?: ValidatedUser,
        teamId?: number
    ): Promise<PaginatedResult<KickOffMeetingDashboardRow>> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        const activeTab = tab || "not_scheduled";

        // Apply role-based filtering
        const roleFilterConditions: any[] = [];


        const conditions = [...roleFilterConditions];

        if (activeTab === "not_scheduled") {
            conditions.push(isNull(woKickoffMeetings.id));
        } else if (activeTab === "scheduled") {
            conditions.push(isNotNull(woKickoffMeetings.id));
        } else {
            throw new BadRequestException(`Invalid tab: ${activeTab}`);
        }

        // Add search conditions
        if (filters?.search) {
            const searchStr = `%${filters.search}%`;
            conditions.push(
                sql`(
                    ${woBasicDetails.projectName} ILIKE ${searchStr} OR
                    ${woBasicDetails.woNumber} ILIKE ${searchStr} OR
                    ${woBasicDetails.woValuePreGst}::text ILIKE ${searchStr} OR
                    ${woBasicDetails.woValueGstAmt}::text ILIKE ${searchStr} OR
                    ${woBasicDetails.woDate}::text ILIKE ${searchStr} OR
                    ${users.name} ILIKE ${searchStr}
                )`
            );
        }

        const whereClause = and(...conditions);

        // Build orderBy clause
        const sortBy = filters?.sortBy;
        const sortOrder = filters?.sortOrder || "asc";
        let orderByClause: any = asc(woKickoffMeetings.meetingDate);

        if (sortBy) {
            const sortFn = sortOrder === "desc" ? desc : asc;
            switch (sortBy) {
                case "woNumber":
                    orderByClause = sortFn(woBasicDetails.woNumber);
                    break;
                case "projectName":
                    orderByClause = sortFn(woBasicDetails.projectName);
                    break;
                case "teamMemberName":
                    orderByClause = sortFn(users.name);
                    break;
                case "woDate":
                    orderByClause = sortFn(woBasicDetails.woDate);
                    break;
                case "meetingDate":
                    orderByClause = sortFn(woKickoffMeetings.meetingDate);
                    break;
                case "woValuePreGst":
                    orderByClause = sortFn(woBasicDetails.woValuePreGst);
                    break;
                case "woValueGstAmt":
                    orderByClause = sortFn(woBasicDetails.woValueGstAmt);
                    break;
                case "woStatus":
                    orderByClause = sortFn(woDetails.status);
                    break;
                default:
                    orderByClause = sortFn(woKickoffMeetings.meetingDate);
            }
        }

        // Get total count
        const [countResult] = await this.db
            .select({ count: sql<number>`count(distinct ${woBasicDetails.id})` })
            .from(woDetails)
            .leftJoin(woBasicDetails, eq(woBasicDetails.id, woDetails.woBasicDetailId))
            .leftJoin(users, eq(users.id, woBasicDetails.oeFirst))
            .leftJoin(woKickoffMeetings, eq(woKickoffMeetings.woDetailId, woDetails.id))
            .where(whereClause);
        const total = Number(countResult?.count || 0);

        // Get paginated data
        const rows = await this.db
            .select({
                woBasicDetailId: woBasicDetails.id,
                projectName: woBasicDetails.projectName,
                woNumber: woBasicDetails.woNumber,
                teamMemberName: users.name,
                woDate: woBasicDetails.woDate,
                meetingDate: woKickoffMeetings.meetingDate,
                meetingLink: woKickoffMeetings.meetingLink,
                momFilePath: woKickoffMeetings.momFilePath,
                woValuePreGst: woBasicDetails.woValuePreGst,
                woValueGstAmt: woBasicDetails.woValueGstAmt,
                woDetailId: woDetails.id,
                woStatus: woDetails.status,
                kickOffMeetingId: woKickoffMeetings.id,
            })
            .from(woDetails)
            .leftJoin(woBasicDetails, eq(woBasicDetails.id, woDetails.woBasicDetailId))
            .leftJoin(users, eq(users.id, woBasicDetails.oeFirst))
            .leftJoin(woKickoffMeetings, eq(woKickoffMeetings.woDetailId, woDetails.id))
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset);

        const data = rows.map(row => ({
            id: row.kickOffMeetingId,
            woDetailId: row.woDetailId,
            projectName: row.projectName,
            woNumber: row.woNumber,
            woDate: row.woDate ? new Date(row.woDate) : null,
            woValuePreGst: row.woValuePreGst ? Number(row.woValuePreGst) : null,
            woValueGstAmt: row.woValueGstAmt ? Number(row.woValueGstAmt) : null,
            woStatus: row.woStatus,
            meetingDate: row.meetingDate ? new Date(row.meetingDate) : null,
            meetingLink: row.meetingLink,
            momFilePath: row.momFilePath,
            teamMemberName: row.teamMemberName,
        }));

        return wrapPaginatedResponse(data, total, page, limit);
    }

    async getDashboardCounts(user?: ValidatedUser, teamId?: number): Promise<{ 'scheduled': number; 'not_scheduled': number; total: number }> {


        return {
            scheduled: 0,
            'not_scheduled': 0,
            total: 0,
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
