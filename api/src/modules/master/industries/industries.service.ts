import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import { industries, type Industry } from '../../../db/industries.schema';

@Injectable()
export class IndustriesService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  async findAll(): Promise<Industry[]> {
    return this.db.select().from(industries);
  }
}
