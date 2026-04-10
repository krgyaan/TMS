import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import { employeeProfiles, type NewEmployeeProfile, type EmployeeProfile } from "@/db/schemas/hrms/employee-profiles.schema";

function stripUndefined<T extends Record<string, any>>(obj: T): T {
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

@Injectable()
export class EmployeeProfilesService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async findAll(): Promise<EmployeeProfile[]> {
        return this.db.select().from(employeeProfiles);
    }

    async create(data: NewEmployeeProfile): Promise<EmployeeProfile> {
        const cleanData = stripUndefined(data);
        const rows = await this.db.insert(employeeProfiles).values(cleanData as any).returning();
        return rows[0];
    }

    async findByUserId(userId: number): Promise<EmployeeProfile | null> {
        const rows = await this.db.select().from(employeeProfiles).where(eq(employeeProfiles.userId, userId)).limit(1);
        return rows[0] ?? null;
    }

    async updateByUserId(userId: number, data: Partial<Omit<NewEmployeeProfile, "userId">>): Promise<EmployeeProfile> {
        const rows = await this.db
            .update(employeeProfiles)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(employeeProfiles.userId, userId))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`Employee profile for user ${userId} not found`);
        }

        return rows[0];
    }
}
