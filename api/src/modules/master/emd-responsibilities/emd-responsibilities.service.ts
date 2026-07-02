import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, ilike, like } from "drizzle-orm";
import { DRIZZLE } from "@db/database.module";
import type { DbInstance } from "@db";
import { emdResponsibility, type EmdResponsibility, type NewEmdResponsibility } from "@db/schemas/master/emd-responsibilities";
import { users } from "@db/schemas/auth/users.schema";

export type EmdResponsibilityWithUser = {
    id: number;
    name: string | null;
    instrumentType: string | null;
    assignedUserId: number | null;
    assignedUserName: string | null;
    assignedUserEmail: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
};

@Injectable()
export class EmdResponsibilityService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    private withUser(query: any) {
        return query
            .select({
                id: emdResponsibility.id,
                name: emdResponsibility.name,
                instrumentType: emdResponsibility.instrumentType,
                assignedUserId: emdResponsibility.assignedUserId,
                assignedUserName: users.name,
                assignedUserEmail: users.email,
                createdAt: emdResponsibility.createdAt,
                updatedAt: emdResponsibility.updatedAt,
            })
            .from(emdResponsibility)
            .leftJoin(users, eq(users.id, emdResponsibility.assignedUserId));
    }

    async findAll(): Promise<EmdResponsibilityWithUser[]> {
        return this.withUser(this.db);
    }

    async findById(id: number): Promise<EmdResponsibilityWithUser | null> {
        const result = await this.withUser(this.db).where(eq(emdResponsibility.id, id)).limit(1);
        return result[0] ?? null;
    }

    async create(data: NewEmdResponsibility): Promise<EmdResponsibility> {
        const rows = await this.db.insert(emdResponsibility).values(data).returning();
        return rows[0];
    }

    async update(id: number, data: Partial<NewEmdResponsibility>): Promise<EmdResponsibility> {
        const rows = await this.db
            .update(emdResponsibility)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(emdResponsibility.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`EMD Responsibility with ID ${id} not found`);
        }
        return rows[0];
    }

    async delete(id: number): Promise<void> {
        const result = await this.db.delete(emdResponsibility).where(eq(emdResponsibility.id, id)).returning();

        if (!result[0]) {
            throw new NotFoundException(`EMD Responsibility with ID ${id} not found`);
        }
    }

    async search(query: string): Promise<EmdResponsibilityWithUser[]> {
        const searchPattern = `%${query}%`;
        return this.withUser(this.db).where(ilike(emdResponsibility.name, searchPattern));
    }
}
