import { z } from "zod";

const emailArray = z.array(z.string().email()).min(1, "At least one recipient is required");

const attachmentFilesSchema = z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]);

export const SendMailSchema = z.object({
    senderUserId: z.number().int(),

    to: emailArray,
    cc: z.array(z.string().email()).optional(),
    bcc: z.array(z.string().email()).optional(),

    subject: z.string().min(1),
    html: z.string().min(1),

    replyTo: z.string().email().optional(),

    attachments: z
        .object({
            files: attachmentFilesSchema,
        })
        .optional(),
});

export type SendMailInput = z.infer<typeof SendMailSchema>;
