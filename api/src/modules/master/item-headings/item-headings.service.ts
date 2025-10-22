import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import {
  itemHeadings,
  type ItemHeading,
} from '../../../db/item-headings.schema';

@Injectable()
export class ItemHeadingsService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  async findAll(): Promise<ItemHeading[]> {
    return this.db.select().from(itemHeadings);
  }
}
