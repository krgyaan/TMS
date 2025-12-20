import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DRIZZLE } from '@db/database.module';
import { users, userRoles, userProfiles, roles, teams } from '@/db/schemas';
import { RecipientSource } from './dto/send-email.dto';
import { and, eq } from 'drizzle-orm';
import type { DbInstance } from '@/db';

@Injectable()
export class RecipientResolver implements OnModuleInit {
    private readonly logger = new Logger(RecipientResolver.name);

    // Cache role_name -> role_id
    private roleCache = new Map<string, number>();
    // Cache team_id -> team_name
    private teamNameCache = new Map<number, string>();

    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    async onModuleInit() {
        await this.loadCaches();
    }

    /**
     * Load role and team caches from database
     */
    private async loadCaches() {
        try {
            const allRoles = await this.db.select().from(roles);
            allRoles.forEach((r) => this.roleCache.set(r.name, r.id));

            const allTeams = await this.db.select().from(teams);
            allTeams.forEach((t) => this.teamNameCache.set(t.id, t.name));

            this.logger.log(`Loaded ${allRoles.length} roles, ${allTeams.length} teams`);
        } catch (error) {
            this.logger.error('Failed to load caches:', error.message);
        }
    }

    /**
     * Get team name by ID
     */
    getTeamName(teamId: number): string {
        return this.teamNameCache.get(teamId) || 'Unknown';
    }

    /**
     * Resolve multiple sources to email array
     */
    async resolveAll(sources: RecipientSource[]): Promise<string[]> {
        const results = await Promise.all(sources.map((s) => this.resolve(s)));
        const emails = results.flat();
        return [...new Set(emails)]; // Remove duplicates
    }

    /**
     * Resolve single source to emails
     */
    async resolve(source: RecipientSource): Promise<string[]> {
        switch (source.type) {
            case 'user':
                return this.getEmailByUserId(source.userId);

            case 'role':
                return this.getEmailsByRole(source.role, source.teamId);

            case 'emails':
                return source.emails.filter((e) => this.isValidEmail(e));

            default:
                return [];
        }
    }

    /**
     * Get user email by ID
     */
    async getEmailByUserId(userId: number): Promise<string[]> {
        const result = await this.db
            .select({ email: users.email })
            .from(users)
            .where(and(eq(users.id, userId), eq(users.isActive, true)))
            .limit(1);

        return result.length > 0 ? [result[0].email] : [];
    }

    /**
     * Get user info by ID
     */
    async getUserById(userId: number): Promise<{ email: string; name: string } | null> {
        const result = await this.db
            .select({ email: users.email, name: users.name })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        return result.length > 0 ? result[0] : null;
    }

    /**
     * Get emails by role in a team
     */
    async getEmailsByRole(roleName: string, teamId: number): Promise<string[]> {
        const roleId = this.roleCache.get(roleName);
        if (!roleId) {
            this.logger.warn(`Role not found: ${roleName}`);
            return [];
        }

        const result = await this.db
            .select({ email: users.email })
            .from(users)
            .innerJoin(userRoles, eq(userRoles.userId, users.id))
            .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
            .where(
                and(
                    eq(userRoles.roleId, roleId),
                    eq(userProfiles.primaryTeamId, teamId),
                    eq(users.isActive, true),
                ),
            );

        return result.map((r) => r.email);
    }

    /**
     * Get team leader email
     */
    async getTeamLeader(teamId: number): Promise<string | null> {
        const emails = await this.getEmailsByRole('Team Leader', teamId);
        return emails[0] || null;
    }

    /**
     * Get team admin email
     */
    async getTeamAdmin(teamId: number): Promise<string | null> {
        const emails = await this.getEmailsByRole('Admin', teamId);
        return emails[0] || null;
    }

    /**
     * Get team coordinator email
     */
    async getTeamCoordinator(teamId: number): Promise<string | null> {
        const emails = await this.getEmailsByRole('Coordinator', teamId);
        return emails[0] || null;
    }

    /**
     * Get both admins (tender team + accounts team)
     */
    async getBothAdmins(tenderTeamId: number): Promise<string[]> {
        // Find accounts team ID
        let accountsTeamId: number | undefined;
        this.teamNameCache.forEach((name, id) => {
            if (name === 'Accounts') accountsTeamId = id;
        });

        const [tenderAdmin, accountsAdmin] = await Promise.all([
            this.getTeamAdmin(tenderTeamId),
            accountsTeamId ? this.getTeamAdmin(accountsTeamId) : null,
        ]);

        const admins: string[] = [];
        if (tenderAdmin) admins.push(tenderAdmin);
        if (accountsAdmin && accountsAdmin !== tenderAdmin) admins.push(accountsAdmin);

        return admins;
    }

    /**
     * Validate email format
     */
    private isValidEmail(email: string): boolean {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
}
