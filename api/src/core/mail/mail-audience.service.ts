import { Inject, Injectable } from "@nestjs/common";
import { and, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";
import { users } from "@db/schemas/auth/users.schema";
import { roles } from "@db/schemas/auth/roles.schema";
import type { DbInstance } from "@/db";
import { DRIZZLE } from "@/db/database.module";

@Injectable()
export class MailAudienceService {
    constructor(
        @Inject(DRIZZLE)
        private readonly db: DbInstance
    ) {}

    async getEmailsByRoleId(roleId: number, teamId?: number): Promise<string[]> {
        const conditions = teamId ? and(eq(users.roleId, roleId), eq(users.team, teamId)) : eq(users.roleId, roleId);

        const result = await this.db.select({ email: users.email }).from(users).where(conditions);

        return result.map(r => r.email);
    }

    async getCoo(): Promise<typeof users.$inferSelect> {
        const [user] = await this.db.select().from(users).where(eq(users.id, 64));

        return user;
    }

    async getAdmin(): Promise<typeof users.$inferSelect> {
        const [user] = await this.db.select().from(users).where(eq(users.id, 7));

        return user;
    }

    async getActiveUserById(userId: number): Promise<typeof users.$inferSelect | null> {
        const [user] = await this.db
            .select()
            .from(users)
            .where(and(eq(users.id, userId), eq(users.isActive, true), isNull(users.deletedAt)))
            .limit(1);

        return user ?? null;
    }

    /**
     * Resolve active users for the given role names, optionally scoped to the
     * team a user belongs to. Uses COALESCE(primary_team_id, team) so it stays
     * consistent with team switching across the app.
     */
    async getActiveUsersByRoleNames(roleNames: string[], teamId?: number | null): Promise<(typeof users.$inferSelect)[]> {
        const conditions: SQL[] = [
            inArray(roles.name, roleNames),
            eq(users.isActive, true),
            isNull(users.deletedAt),
        ];

        if (teamId !== undefined && teamId !== null) {
            conditions.push(eq(sql<number>`COALESCE(${users.primaryTeamId}, ${users.team})`, teamId));
        }

        const rows = await this.db
            .select({ user: users })
            .from(users)
            .innerJoin(roles, eq(roles.id, users.roleId))
            .where(and(...conditions));

        return rows.map(row => row.user);
    }

    async getCoordinator(): Promise<typeof users.$inferSelect | null> {
        const result = await this.db.select({ user: users }).from(users).where(eq(users.roleId, 4)).limit(1);

        return result.length ? result[0].user : null;
    }

    async getTlEmail(team : number){
        const tlMails = await this.db.select({email : users.email})
        .from(users)
            .where(and(
                    eq(users.team, team),
                    eq(users.roleId, 3)
                )
            );

        return tlMails.map((user) => user.email);
    }
}
