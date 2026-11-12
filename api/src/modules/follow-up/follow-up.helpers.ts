import { getIstDateKey, istDaysBetween } from "@/utils/ist-date";

export interface AlternateDayFollowUp {
    startFrom: string | null;
    lastReminderSentAt: Date | null;
}

export function isMailBodyEmpty(details?: string | null): boolean {
    if (!details) return true;

    const text = details
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&#160;/gi, " ")
        .replace(/\u00a0/g, " ")
        .trim();

    return text.length === 0;
}

export function isAlternateDayDue(followUp: AlternateDayFollowUp, now: Date = new Date()): boolean {
    if (!followUp.lastReminderSentAt) return true;

    const lastSentKey = getIstDateKey(followUp.lastReminderSentAt);

    // An explicitly advanced next follow-up date overrides the cadence.
    if (followUp.startFrom && followUp.startFrom > lastSentKey) return true;

    return istDaysBetween(lastSentKey, getIstDateKey(now)) >= 2;
}
