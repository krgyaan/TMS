import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import { followupCategories, type FollowupCategory } from '../../../db/followup-categories.schema';

@Injectable()
export class FollowupCategoriesService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  async findAll(): Promise<FollowupCategory[]> {
    return this.db.select().from(followupCategories);
  }
}
