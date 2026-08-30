import type { RecipientSource } from "@/modules/email/dto/send-email.dto";
import type { GroupKey } from "@config/groups";

export type { RecipientSource };

/** Notification channels. Phase 1 supports only `email`; whatsapp is a stub. */
export type NotificationChannel = "email";

/** Domain of a notification — becomes `emailLogs.referenceType` (varchar 50). */
export type NotificationDomain = "tender" | "payment_request" | "courier" | "followup" | "operation" | "amc" | "crm";

/** WhatsApp target resolution mode. */
export type WaTarget = { kind: "group"; group: GroupKey } | { kind: "user"; userId: number } | { kind: "group_mention"; group: GroupKey; mentionUserIds: number[] };

export interface NotificationAttachment {
    files: string[];
    baseDir?: string;
}

export interface WhatsappOptions {
    target: WaTarget;
    text: string;
    attachments?: NotificationAttachment;
}

export interface NotificationRequest {
    /** Currently only `email`. Future: `whatsapp` / `both`. */
    channel: NotificationChannel;

    domain: NotificationDomain;

    /** Primary reference id used for threading/labeling (e.g. tender id, courier id). */
    referenceId: number;

    /** Optional tender id — used for label generation on tender-linked domains. */
    tenderId?: number;

    eventType: string;

    fromUserId: number;

    to: RecipientSource[];
    cc?: RecipientSource[];

    subject: string;
    template: string;
    data: Record<string, any>;

    attachments?: NotificationAttachment;

    /** WhatsApp payload — ignored (stub) until `channel` supports it. */
    whatsapp?: WhatsappOptions;
}

export interface NotificationResult {
    success: boolean;
    emailLogId?: number;
    error?: string;
}
