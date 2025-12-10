import { pgEnum } from "drizzle-orm/pg-core";

// Frequency of follow-up reminders
export const frequencyEnum = pgEnum("frequency_type", [
    "daily", // 1 - Every day
    "alternate", // 2 - Every other day
    "weekly", // 3 - Once a week
    "biweekly", // 4 - Every two weeks
    "monthly", // 5 - Once a month
    "stopped", // 6 - Follow-up stopped
]);

// Reason for stopping a follow-up
export const stopReasonEnum = pgEnum("stop_reason_type", [
    "party_angry", // 1 - Party not interested/angry
    "objective_achieved", // 2 - Goal accomplished
    "not_reachable", // 3 - Cannot reach party
    "other", // 4 - Other reasons
]);

// Status of follow-up assignment
export const assignmentStatusEnum = pgEnum("assignment_status", [
    "assigned", // Initially assigned to user
    "initiated", // Work has begun
]);

// User roles
export const userRoleEnum = pgEnum("user_role", ["admin", "manager", "user"]);

// User team
export const userTeamEnum = pgEnum("user_team", ["AC", "DC"]);
