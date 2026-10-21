import { Inject, Injectable, Logger } from "@nestjs/common";
import { DRIZZLE } from "@db/database.module";
import { users } from "@/db/schemas";
import { eq } from "drizzle-orm";
import type { DbInstance } from "@/db";

@Injectable()
export class WhatsappJidResolver {
    private readonly logger = new Logger(WhatsappJidResolver.name);

    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    /** Normalize an E.164-capable phone number into a WhatsApp JID suffix. */
    private normalizePhone(phone: string): string {
        let d = phone.replace(/\D/g, "");
        // Remove leading 0s
        d = d.replace(/^0+/, "");
        // If it's a 10-digit Indian mobile starting with 6-9, prefix 91
        if (d.length === 10 && /^[6-9]/.test(d)) {
            return `91${d}`;
        }
        // If it's 12 digits starting with 91, keep as-is
        if (d.length === 12 && d.startsWith("91")) {
            return d;
        }
        // If already has country code (13+ digits starting with 91), keep as-is
        if (d.length >= 13 && d.startsWith("91")) {
            return d;
        }
        return d;
    }

    /**
     * Resolve a user id to a WhatsApp JID (`<phone>@c.us`).
     * Returns null when the user has no mobile number.
     */
    async toJid(userId: number): Promise<string | null> {
        const rows = await this.db.select({ mobile: users.mobile }).from(users).where(eq(users.id, userId)).limit(1);

        const mobile = rows[0]?.mobile;
        if (!mobile) {
            this.logger.warn(`User ${userId} has no mobile number — cannot resolve WhatsApp JID`);
            return null;
        }

        return `${this.normalizePhone(mobile)}@c.us`;
    }
}
