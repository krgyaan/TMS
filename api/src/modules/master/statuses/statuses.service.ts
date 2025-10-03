import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import { statuses, type Status } from '../../../db/statuses.schema';

@Injectable()
export class StatusesService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  async findAll(): Promise<Status[]> {
    return this.db.select().from(statuses);
  }
}
