import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { hash, verify } from 'argon2';
import { and, eq, isNull } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import { users, type NewUser, type User } from '../../../db/users.schema';
import { userProfiles } from '../../../db/user-profiles.schema';
import { designations } from '../../../db/designations.schema';
import { teams } from '../../../db/teams.schema';

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

export type UserWithRelations = SafeUser & {
    profile: UserProfileSummary | null;
    team: { id: number; name: string | null } | null;
    designation: { id: number; name: string | null } | null;
};

@Injectable()
export class UsersService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    private baseUserQuery() {
        return this.db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                username: users.username,
                mobile: users.mobile,
                isActive: users.isActive,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt,
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
                teamId: teams.id,
                teamName: teams.name,
                designationId: designations.id,
                designationName: designations.name,
            })
            .from(users)
            .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
            .leftJoin(designations, eq(userProfiles.designationId, designations.id))
            .leftJoin(teams, eq(userProfiles.primaryTeamId, teams.id));
    }

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
        };
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
    private async hashPassword(plain: string) {
        return hash(plain);
    }
}
