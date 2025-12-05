import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { hash, verify } from 'argon2';
import { and, eq, isNull } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { users, type NewUser, type User } from '@db/schemas/auth/users.schema';
import { userProfiles } from '@db/schemas/auth/user-profiles.schema';
import { userRoles } from '@db/schemas/auth/user-roles.schema';
import { roles } from '@db/schemas/auth/roles.schema';
import { designations } from '@db/schemas/master/designations.schema';
import { teams } from '@db/schemas/master/teams.schema';
import { RoleName, DataScope, getDataScope, canSwitchTeams } from '@/common/constants/roles.constant';

export type SafeUser = Pick<
    User,
    | 'id'
    | 'name'
    | 'email'
    | 'username'
    | 'mobile'
    | 'isActive'
    | 'createdAt'
    | 'updatedAt'
>;

export type UserProfileSummary = {
    id: number;
    userId: number;
    firstName?: string | null;
    lastName?: string | null;
    dateOfBirth?: Date | string | null;
    gender?: string | null;
    employeeCode?: string | null;
    designationId?: number | null;
    primaryTeamId?: number | null;
    altEmail?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    image?: string | null;
    signature?: string | null;
    dateOfJoining?: Date | string | null;
    dateOfExit?: Date | string | null;
    timezone?: string | null;
    locale?: string | null;
    createdAt?: Date | string | null;
    updatedAt?: Date | string | null;
};

// NEW: Role information type
export type UserRoleInfo = {
    id: number;
    name: string;
    dataScope: DataScope;
    canSwitchTeams: boolean;
};

// UPDATED: Include role in UserWithRelations
export type UserWithRelations = SafeUser & {
    profile: UserProfileSummary | null;
    team: { id: number; name: string | null } | null;
    designation: { id: number; name: string | null } | null;
    role: UserRoleInfo | null;  // NEW
};

// NEW: Type for JWT payload enrichment
export type UserAuthInfo = {
    userId: number;
    email: string;
    roleName: string | null;
    roleId: number | null;
    primaryTeamId: number | null;
    dataScope: DataScope;
    canSwitchTeams: boolean;
};

@Injectable()
export class UsersService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    // UPDATED: Include role in base query
    private baseUserQuery() {
        return this.db
            .select({
                // User fields
                id: users.id,
                name: users.name,
                email: users.email,
                username: users.username,
                mobile: users.mobile,
                isActive: users.isActive,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt,
                // Profile fields
                profileId: userProfiles.id,
                profileUserId: userProfiles.userId,
                profileFirstName: userProfiles.firstName,
                profileLastName: userProfiles.lastName,
                profileDateOfBirth: userProfiles.dateOfBirth,
                profileGender: userProfiles.gender,
                profileEmployeeCode: userProfiles.employeeCode,
                profileDesignationId: userProfiles.designationId,
                profilePrimaryTeamId: userProfiles.primaryTeamId,
                profileAltEmail: userProfiles.altEmail,
                profileEmergencyContactName: userProfiles.emergencyContactName,
                profileEmergencyContactPhone: userProfiles.emergencyContactPhone,
                profileImage: userProfiles.image,
                profileSignature: userProfiles.signature,
                profileDateOfJoining: userProfiles.dateOfJoining,
                profileDateOfExit: userProfiles.dateOfExit,
                profileTimezone: userProfiles.timezone,
                profileLocale: userProfiles.locale,
                profileCreatedAt: userProfiles.createdAt,
                profileUpdatedAt: userProfiles.updatedAt,
                // Team fields
                teamId: teams.id,
                teamName: teams.name,
                // Designation fields
                designationId: designations.id,
                designationName: designations.name,
                // Role fields (NEW)
                roleId: roles.id,
                roleName: roles.name,
            })
            .from(users)
            .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
            .leftJoin(designations, eq(userProfiles.designationId, designations.id))
            .leftJoin(teams, eq(userProfiles.primaryTeamId, teams.id))
            .leftJoin(userRoles, eq(userRoles.userId, users.id))  // NEW
            .leftJoin(roles, eq(roles.id, userRoles.roleId));     // NEW
    }

    // UPDATED: Include role in mapping
    private mapUserRow(row: any): UserWithRelations {
        const profile = row.profileId
            ? {
                id: row.profileId,
                userId: row.profileUserId,
                firstName: row.profileFirstName,
                lastName: row.profileLastName,
                dateOfBirth: row.profileDateOfBirth,
                gender: row.profileGender,
                employeeCode: row.profileEmployeeCode,
                designationId: row.profileDesignationId,
                primaryTeamId: row.profilePrimaryTeamId,
                altEmail: row.profileAltEmail,
                emergencyContactName: row.profileEmergencyContactName,
                emergencyContactPhone: row.profileEmergencyContactPhone,
                image: row.profileImage,
                signature: row.profileSignature,
                dateOfJoining: row.profileDateOfJoining,
                dateOfExit: row.profileDateOfExit,
                timezone: row.profileTimezone,
                locale: row.profileLocale,
                createdAt: row.profileCreatedAt,
                updatedAt: row.profileUpdatedAt,
            }
            : null;

        const team =
            row.teamId != null
                ? {
                    id: row.teamId,
                    name: row.teamName,
                }
                : null;

        const designation =
            row.designationId != null
                ? {
                    id: row.designationId,
                    name: row.designationName,
                }
                : null;

        // NEW: Map role with computed properties
        const role: UserRoleInfo | null =
            row.roleId != null
                ? {
                    id: row.roleId,
                    name: row.roleName,
                    dataScope: getDataScope(row.roleName),
                    canSwitchTeams: canSwitchTeams(row.roleName),
                }
                : null;

        return {
            id: row.id,
            name: row.name,
            email: row.email,
            username: row.username,
            mobile: row.mobile,
            isActive: row.isActive,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            profile,
            team,
            designation,
            role,  // NEW
        };
    }

    // NEW: Get user auth info for JWT and guards
    async getUserAuthInfo(userId: number): Promise<UserAuthInfo | null> {
        const rows = await this.db
            .select({
                userId: users.id,
                email: users.email,
                roleName: roles.name,
                roleId: roles.id,
                primaryTeamId: userProfiles.primaryTeamId,
            })
            .from(users)
            .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
            .leftJoin(userRoles, eq(userRoles.userId, users.id))
            .leftJoin(roles, eq(roles.id, userRoles.roleId))
            .where(and(eq(users.id, userId), isNull(users.deletedAt)))
            .limit(1);

        const row = rows[0];
        if (!row) return null;

        return {
            userId: row.userId,
            email: row.email,
            roleName: row.roleName,
            roleId: row.roleId,
            primaryTeamId: row.primaryTeamId,
            dataScope: getDataScope(row.roleName ?? ''),
            canSwitchTeams: canSwitchTeams(row.roleName ?? ''),
        };
    }

    // NEW: Assign role to user
    async assignRole(userId: number, roleId: number): Promise<void> {
        await this.db
            .insert(userRoles)
            .values({ userId, roleId })
            .onConflictDoUpdate({
                target: userRoles.userId,
                set: { roleId, updatedAt: new Date() },
            });
    }

    // NEW: Get role by name
    async getRoleByName(name: string): Promise<{ id: number; name: string } | null> {
        const result = await this.db
            .select({ id: roles.id, name: roles.name })
            .from(roles)
            .where(eq(roles.name, name))
            .limit(1);
        return result[0] ?? null;
    }

    async findAllWithRelations(): Promise<UserWithRelations[]> {
        const rows = await this.baseUserQuery().where(isNull(users.deletedAt));
        return rows.map((row) => this.mapUserRow(row));
    }

    async findAll(): Promise<UserWithRelations[]> {
        return this.findAllWithRelations();
    }

    async findDetailById(id: number): Promise<UserWithRelations | null> {
        const rows = await this.baseUserQuery()
            .where(and(eq(users.id, id), isNull(users.deletedAt)))
            .limit(1);
        if (!rows[0]) {
            return null;
        }
        return this.mapUserRow(rows[0]);
    }

    async findById(id: number): Promise<User | null> {
        const result = await this.db
            .select()
            .from(users)
            .where(and(eq(users.id, id), isNull(users.deletedAt)))
            .limit(1);
        return result[0] ?? null;
    }

    async findByEmail(email: string): Promise<User | null> {
        const result = await this.db
            .select()
            .from(users)
            .where(and(eq(users.email, email), isNull(users.deletedAt)))
            .limit(1);
        return result[0] ?? null;
    }

    // UPDATED: sanitizeUser now returns UserWithRelations for auth
    async sanitizeUserWithRelations(userId: number): Promise<UserWithRelations | null> {
        return this.findDetailById(userId);
    }

    // Keep original for backward compatibility
    sanitizeUser(user: User): SafeUser {
        const {
            id,
            name,
            email,
            username,
            mobile,
            isActive,
            createdAt,
            updatedAt,
        } = user;
        return {
            id,
            name,
            email,
            username,
            mobile,
            isActive,
            createdAt,
            updatedAt,
        };
    }

    async create(data: NewUser): Promise<User> {
        if (!data.password) {
            throw new Error('Password is required');
        }
        const hashed = await this.hashPassword(data.password);
        const rows = (await this.db
            .insert(users)
            .values({ ...data, password: hashed })
            .returning()) as unknown as User[];
        return rows[0];
    }

    async update(
        id: number,
        data: Partial<
            Pick<
                NewUser,
                'name' | 'username' | 'email' | 'mobile' | 'password' | 'isActive'
            >
        >,
    ): Promise<User> {
        const updatePayload: Partial<NewUser> = {
            ...data,
            updatedAt: new Date(),
        };

        if (data.password) {
            updatePayload.password = await this.hashPassword(data.password);
        }

        const rows = (await this.db
            .update(users)
            .set(updatePayload)
            .where(and(eq(users.id, id), isNull(users.deletedAt)))
            .returning()) as unknown as User[];

        if (!rows[0]) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        return rows[0];
    }

    async delete(id: number): Promise<void> {
        const rows = (await this.db
            .update(users)
            .set({
                isActive: false,
                deletedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(and(eq(users.id, id), isNull(users.deletedAt)))
            .returning()) as unknown as User[];

        if (!rows[0]) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }
    }

    async createFromGoogle(payload: {
        email: string;
        name?: string | null;
    }): Promise<User> {
        const randomPassword = randomBytes(32).toString('hex');
        const hashed = await this.hashPassword(randomPassword);
        const name = payload.name?.trim()?.length
            ? payload.name
            : payload.email.split('@')[0];
        const rows = (await this.db
            .insert(users)
            .values({
                name,
                email: payload.email,
                password: hashed,
                isActive: true,
            })
            .returning()) as unknown as User[];
        return rows[0];
    }

    async ensureUser(id: number): Promise<User> {
        const user = await this.findById(id);
        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    async verifyPassword(user: User, candidate: string): Promise<boolean> {
        if (!candidate || !user.password) {
            return false;
        }
        try {
            return await verify(user.password, candidate);
        } catch {
            return false;
        }
    }

    private async hashPassword(plain: string) {
        return hash(plain);
    }
}
