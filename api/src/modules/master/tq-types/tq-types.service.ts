import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import { tqTypes, type TqType } from '../../../db/tq-types.schema';

@Injectable()
export class TqTypesService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  async findAll(): Promise<TqType[]> {
    return this.db.select().from(tqTypes);
  }
}
