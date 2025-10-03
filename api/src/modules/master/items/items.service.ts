import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import { items, type Item } from '../../../db/items.schema';

@Injectable()
export class ItemsService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  async findAll(): Promise<Item[]> {
    return this.db.select().from(items);
  }
}
