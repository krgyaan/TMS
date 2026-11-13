import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { otherContacts } from '@db/schemas/shared/other-contacts.schema';
import type { CreateOtherContactDto } from './dto/other-contact.dto';

/**
 * Contacts that live outside any tender/project (see other_contacts schema).
 */
@Injectable()
export class OtherContactsService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    async list(purpose?: string) {
        return this.db
            .select()
            .from(otherContacts)
            .where(purpose ? eq(otherContacts.purpose, purpose) : undefined)
            .orderBy(asc(otherContacts.name));
    }

    async create(payload: CreateOtherContactDto, userId?: number) {
        const [contact] = await this.db
            .insert(otherContacts)
            .values({
                name: payload.name,
                designation: payload.designation ?? null,
                email: payload.email ?? null,
                phone: payload.phone ?? null,
                purpose: payload.purpose ?? null,
                createdBy: userId ?? null,
            })
            .returning();

        return contact;
    }
}
