import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../../database/database.module';
import type { DbInstance } from '../../db';
import {
  userProfiles,
  type NewUserProfile,
  type UserProfile,
} from '../../db/user-profiles.schema';

@Injectable()
export class UserProfilesService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  async findAll(): Promise<UserProfile[]> {
    return this.db.select().from(userProfiles);
  }

  async create(data: NewUserProfile): Promise<UserProfile> {
    const [created] = await this.db.insert(userProfiles).values(data).returning();
    return created;
  }
}
