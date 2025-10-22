import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import {
  organizations,
  type Organization,
} from '../../../db/organizations.schema';

@Injectable()
export class OrganizationsService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  async findAll(): Promise<Organization[]> {
    return this.db.select().from(organizations);
  }
}
