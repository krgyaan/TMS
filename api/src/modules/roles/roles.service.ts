import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../../db/database.module';
import type { DbInstance } from '../../db';
import { roles, type NewRole, type Role } from '../../db/roles.schema';

@Injectable()
export class RolesService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  async findAll(): Promise<Role[]> {
    return this.db.select().from(roles);
  }

  async create(data: NewRole): Promise<Role> {
    const rows = (await this.db.insert(roles).values(data).returning()) as unknown as Role[];
    return rows[0];
  }
}
