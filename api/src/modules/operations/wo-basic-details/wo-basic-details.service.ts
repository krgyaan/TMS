import type { DbInstance } from '@/db';
import { DRIZZLE } from '@/db/database.module';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class WoBasicDetailsService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    async findAll(filters?: any) {}
}
