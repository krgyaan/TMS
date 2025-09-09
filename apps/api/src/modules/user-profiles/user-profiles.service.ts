import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../../db/database.module';
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
    const rows = (await this.db.insert(userProfiles).values(data).returning()) as unknown as UserProfile[];
    return rows[0];
  }
}
