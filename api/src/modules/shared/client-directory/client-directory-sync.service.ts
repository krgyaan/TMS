import { Inject, Injectable } from '@nestjs/common';
import { or, eq } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { clientDirectory } from '@db/schemas/shared/client-directory.schema';

export type SyncContact = {
    name: string;
    email?: string | null;
    phone?: string | null;
    org?: string | null;
};

@Injectable()
export class ClientDirectorySyncService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async syncToClientDirectory(contacts: SyncContact[]) {
        for (const contact of contacts) {
            if (!contact.email && !contact.phone) continue;

            const existing = await this.db
                .select()
                .from(clientDirectory)
                .where(
                    or(
                        contact.email ? eq(clientDirectory.email, contact.email) : undefined,
                        contact.phone ? eq(clientDirectory.phone, contact.phone) : undefined,
                    ),
                )
                .limit(1)
                .then((r) => r[0] ?? null);

            if (!existing) {
                await this.db.insert(clientDirectory).values({
                    name: contact.name,
                    email: contact.email,
                    phone: contact.phone,
                    organization: contact.org,
                });
            }
        }
    }
}
