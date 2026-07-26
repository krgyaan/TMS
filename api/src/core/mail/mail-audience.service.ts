import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { users } from "@db/schemas/auth/users.schema";
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
