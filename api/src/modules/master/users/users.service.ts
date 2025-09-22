import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import { users, type NewUser, type User } from '../../../db/users.schema';

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  async findAll(): Promise<User[]> {
    return this.db.select().from(users);
  }

  async create(data: NewUser): Promise<User> {
    const rows = (await this.db.insert(users).values(data).returning()) as unknown as User[];
    return rows[0];
  }
}
