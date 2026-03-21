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
