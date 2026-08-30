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
        const digits = phone.replace(/\D/g, "");
        return digits.replace(/^0+/, "").replace(/^91/, "");
    }

    /**
     * Resolve a user id to a WhatsApp JID (`<phone>@s.whatsapp.net`).
     * Returns null when the user has no mobile number.
     */
    async toJid(userId: number): Promise<string | null> {
        const rows = await this.db.select({ mobile: users.mobile }).from(users).where(eq(users.id, userId)).limit(1);

        const mobile = rows[0]?.mobile;
        if (!mobile) {
            this.logger.warn(`User ${userId} has no mobile number — cannot resolve WhatsApp JID`);
            return null;
        }

        return `${this.normalizePhone(mobile)}@s.whatsapp.net`;
    }
}
