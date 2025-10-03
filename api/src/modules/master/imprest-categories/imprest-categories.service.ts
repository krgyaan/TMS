import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import { imprestCategories, type ImprestCategory } from '../../../db/imprest-categories.schema';

@Injectable()
export class ImprestCategoriesService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  async findAll(): Promise<ImprestCategory[]> {
    return this.db.select().from(imprestCategories);
  }
}
