import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, like } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import {
    organizations,
    type Organization,
    type NewOrganization,
} from '@db/schemas/master/organizations.schema';
import { industries } from '@db/schemas/master/industries.schema';

@Injectable()
export class OrganizationsService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    private getSelectWithRelations() {
        return {
            id: organizations.id,
            name: organizations.name,
            acronym: organizations.acronym,
            industryId: organizations.industryId,
            status: organizations.status,
            createdAt: organizations.createdAt,
            updatedAt: organizations.updatedAt,
            industry: {
                id: industries.id,
                name: industries.name,
            },
        };
    }

    private getQueryWithJoins() {
        return this.db
            .select(this.getSelectWithRelations())
            .from(organizations)
            .leftJoin(industries, eq(organizations.industryId, industries.id));
    }

    async findAll() {
        return this.db
            .select({
                id: organizations.id,
                name: organizations.name,
                acronym: organizations.acronym,
                industryId: organizations.industryId,
                status: organizations.status,
                createdAt: organizations.createdAt,
                updatedAt: organizations.updatedAt,
                industry: {
                    id: industries.id,
                    name: industries.name,
                },
            })
            .from(organizations)
            .leftJoin(industries, eq(organizations.industryId, industries.id));
    }

    //   async findAll() {
    //     return this.getQueryWithJoins();
    //   }

    async findById(id: number) {
        const result = await this.getQueryWithJoins()
            .where(eq(organizations.id, id))
            .limit(1);

        if (!result[0]) {
            throw new NotFoundException(`Organization with ID ${id} not found`);
        }

        return result[0];
    }

    async create(data: NewOrganization): Promise<Organization> {
        const rows = await this.db
            .insert(organizations)
            .values(data)
            .returning();
        return rows[0];
    }

    async update(
        id: number,
        data: Partial<NewOrganization>,
    ): Promise<Organization> {
        const rows = await this.db
            .update(organizations)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(organizations.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`Organization with ID ${id} not found`);
        }
        return rows[0];
    }

    async delete(id: number): Promise<void> {
        const result = await this.db
            .delete(organizations)
            .where(eq(organizations.id, id))
            .returning();

        if (!result[0]) {
            throw new NotFoundException(`Organization with ID ${id} not found`);
        }
    }

    async search(query: string) {
        const searchPattern = `%${query}%`;
        return this.getQueryWithJoins().where(
            like(organizations.name, searchPattern),
        );
    }

    async findByIndustry(industryId: number) {
        return this.getQueryWithJoins().where(
            eq(organizations.industryId, industryId),
        );
    }
}
