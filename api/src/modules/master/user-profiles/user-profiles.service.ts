import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import {
    userProfiles,
    type NewUserProfile,
    type UserProfile,
} from '../../../db/user-profiles.schema';

@Injectable()
export class UserProfilesService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    async findAll(): Promise<UserProfile[]> {
        return this.db.select().from(userProfiles);
    }

    async create(data: NewUserProfile): Promise<UserProfile> {
        const rows = (await this.db
            .insert(userProfiles)
            .values(data)
            .returning()) as unknown as UserProfile[];
        return rows[0];
    }

    async findByUserId(userId: number): Promise<UserProfile | null> {
        const rows = await this.db
            .select()
            .from(userProfiles)
            .where(eq(userProfiles.userId, userId))
            .limit(1);
        return rows[0] ?? null;
    }

    async updateByUserId(
        userId: number,
        data: Partial<NewUserProfile>,
    ): Promise<UserProfile> {
        const rows = (await this.db
            .update(userProfiles)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(userProfiles.userId, userId))
            .returning()) as unknown as UserProfile[];

        if (!rows[0]) {
            throw new NotFoundException(`Profile for user ${userId} not found`);
        }

        return rows[0];
    }
}
