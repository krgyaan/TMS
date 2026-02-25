import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE } from "@db/database.module";
import type { DbInstance } from "@db";
import { users } from "@db/schemas/auth/users.schema";
import { userProfiles, type NewUserProfile, type UserProfile } from "@db/schemas/auth/user-profiles.schema";

function stripUndefined<T extends Record<string, any>>(obj: T): T {
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

@Injectable()
export class UserProfilesService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async findAll(): Promise<UserProfile[]> {
        return this.db.select().from(userProfiles);
    }

    async create(data: NewUserProfile): Promise<UserProfile> {
        const cleanData = stripUndefined(data);

        const rows = await this.db.insert(userProfiles).values(cleanData).returning();

        return rows[0];
    }

    async findByUserId(userId: number): Promise<UserProfile | null> {
        const rows = await this.db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
        return rows[0] ?? null;
    }

    async updateByUserId(userId: number, data: Partial<Omit<NewUserProfile, "userId">>): Promise<UserProfile> {
        const rows = await this.db
            .update(userProfiles)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(userProfiles.userId, userId))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`Profile for user ${userId} not found`);
        }

        return rows[0];
    }

    async updateAvatar(userId: number, filePath: string): Promise<UserProfile> {
        const existingProfile = await this.findByUserId(userId);

        if (existingProfile) {
            return this.updateByUserId(userId, { image: filePath });
        } else {
            // Fetch user name to provide mandatory firstName/lastName
            const user = await this.db.query.users.findFirst({
                where: eq(users.id, userId),
                columns: { name: true },
            });

            const fullName = user?.name || "User";
            const nameParts = fullName.trim().split(/\s+/);
            const firstName = nameParts[0] || "User";
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : " ";

            return this.create({
                userId,
                firstName,
                lastName,
                image: filePath,
            });
        }
    }
}
