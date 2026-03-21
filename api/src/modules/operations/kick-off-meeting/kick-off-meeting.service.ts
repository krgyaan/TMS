import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { woKickoffMeetings } from '@db/schemas/operations/kick-off-meetings.schema';
import { eq } from 'drizzle-orm';
import { SaveKickOffMeetingDto, UpdateKickOffMeetingMomDto } from './dto/kick-off-meeting.dto';

@Injectable()
export class KickOffMeetingService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

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
