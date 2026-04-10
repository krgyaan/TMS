import { z } from 'zod';

export const SaveKickOffMeetingSchema = z.object({
  woDetailId: z.number().int().positive(),
  meetingDate: z.string().datetime().nullable().optional(),
  meetingLink: z.string().url().max(500).nullable().optional(),
});

export type SaveKickOffMeetingDto = z.infer<typeof SaveKickOffMeetingSchema>;

export const UpdateKickOffMeetingMomSchema = z.object({
  momFilePath: z.string().max(500),
});

export type UpdateKickOffMeetingMomDto = z.infer<typeof UpdateKickOffMeetingMomSchema>;

export interface KickOffMeetingDashboardRow {
    id: number | null;
    woDetailId: number | null;
    projectName: string | null;
    woNumber: string | null;
    woDate: Date | null;
    woValuePreGst: number | null;
    woValueGstAmt: number | null;
    woStatus: string | null;
    meetingDate: Date | null;
    meetingLink: string | null;
    momFilePath: string | null;
    teamMemberName: string | null;
}
