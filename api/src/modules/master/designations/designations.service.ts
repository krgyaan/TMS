import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import {
  designations,
  type NewDesignation,
  type Designation,
} from '../../../db/designations.schema';

@Injectable()
export class DesignationsService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  async findAll(): Promise<Designation[]> {
    return this.db.select().from(designations);
  }

  async create(data: NewDesignation): Promise<Designation> {
    const rows = (await this.db.insert(designations).values(data).returning()) as unknown as Designation[];
    return rows[0];
  }
}
