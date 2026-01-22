import { eq, inArray } from "drizzle-orm";
import { users } from "@db/schemas/auth/users.schema";
import { roles } from "@db/schemas/auth/roles.schema";
import { userRoles } from "@db/schemas/auth/user-roles.schema";
import { STAGE_CONFIG } from "../config/stage-config";
import type { DbInstance } from "@/db";

interface PerformanceScope {
    role: "executive" | "team_leader";
    tenderUserIds: number[];
    timerUserIds: number[];
    stages: Array<{
        stageKey: string;
        type: "timer" | "existence";
        timerName?: string;
        isApplicable: (tender: any) => boolean;
        resolveDeadline: (tender: any) => Date | null;
    }>;
}

export async function resolvePerformanceScope(db: DbInstance, userId: number): Promise<PerformanceScope> {
    /* ----------------------------------------
       STEP 1: Resolve user role
    ---------------------------------------- */

    const roleRow = await db
        .select({
            roleName: roles.name,
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, userId))
        .limit(1);

    const roleName = roleRow[0]?.roleName;

    if (!roleName) {
        throw new Error(`Role not found for userId=${userId}`);
    }

    /* ----------------------------------------
       STEP 2: EXECUTIVE scope
    ---------------------------------------- */

    if (roleName !== "team_leader") {
        return {
            role: "executive",
            tenderUserIds: [userId],
            timerUserIds: [userId],
            stages: STAGE_CONFIG,
        };
    }

    /* ----------------------------------------
       STEP 3: TEAM LEADER scope
    ---------------------------------------- */

    // 3.1 Resolve leader's team
    const leaderRow = await db
        .select({
            teamId: users.team,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

    const leaderTeamId = leaderRow[0]?.teamId;

    if (!leaderTeamId) {
        throw new Error(`Team not assigned for team leader userId=${userId}`);
    }

    // 3.2 Resolve all active users in the same team
    const teamMembers = await db
        .select({
            id: users.id,
        })
        .from(users)
        .where(eq(users.team, leaderTeamId));

    const teamMemberUserIds = teamMembers.map(u => u.id);

    if (teamMemberUserIds.length === 0) {
        throw new Error(`No team members found for teamId=${leaderTeamId}`);
    }

    // 3.3 Restrict stages to leader-owned stages only
    const leaderStages = STAGE_CONFIG.filter(s => s.stageKey === "tender_info" || s.stageKey === "costing_approval");

    return {
        role: "team_leader",
        tenderUserIds: teamMemberUserIds,
        timerUserIds: [userId],
        stages: leaderStages,
    };
}
