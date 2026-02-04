import { Injectable, Inject } from "@nestjs/common";
import { eq, and } from "drizzle-orm";

import { users } from "@db/schemas/auth/users.schema";
import { userRoles } from "@db/schemas/auth/user-roles.schema";

import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";

@Injectable()
export class MailAudienceService {
    constructor(
        @Inject(DRIZZLE)
        private readonly db: DbInstance
    ) {}

    async getEmailsByRoleId(roleId: number, teamId?: number): Promise<string[]> {
        const conditions = teamId ? and(eq(userRoles.roleId, roleId), eq(users.team, teamId)) : eq(userRoles.roleId, roleId);

        const result = await this.db.select({ email: users.email }).from(users).innerJoin(userRoles, eq(users.id, userRoles.userId)).where(conditions);

        return result.map(r => r.email);
    }
}
