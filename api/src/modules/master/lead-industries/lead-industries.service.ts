import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { leadIndustries } from '@db/schemas/master/lead-industries.schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class LeadIndustriesService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
    ) {}

    async findAll() {
        return this.db
            .select({
                id: leadIndustries.id,
                name: leadIndustries.name,
            })
            .from(leadIndustries)
            .where(eq(leadIndustries.status, '1'))
            .orderBy(leadIndustries.name);
    }
}