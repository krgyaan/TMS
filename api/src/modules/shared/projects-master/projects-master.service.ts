import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, count, desc, eq, gte, like, lte, or, sql } from "drizzle-orm";

import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";

import { projects } from "@/db/schemas/master/projects.schema";
import { organizations } from "@/db/schemas/master/organizations.schema";
import { items } from "@/db/schemas/master/items.schema";
import { locations } from "@/db/schemas/master/locations.schema";

import type {
    CreateProjectDto,
    ListProjectsFilters,
    UpdateProjectDto,
} from "./dto/projects-master.dto";

type ProjectRow = typeof projects.$inferSelect;

type ProjectListRow = ProjectRow & {
    organizationName?: string | null;
    itemName?: string | null;
    locationName?: string | null;
};

@Injectable()
export class ProjectsMasterService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    private async generateProjectCodeAndName(input: {
        teamName: string;
        organisationId?: number | null;
        itemId: number;
        locationId?: number | null;
    }): Promise<{ projectCode: string; projectName: string }> {
        const [org] = input.organisationId
            ? await this.db
                .select()
                .from(organizations)
                .where(eq(organizations.id, input.organisationId))
            : [undefined];
        const [itemRow] = await this.db
            .select()
            .from(items)
            .where(eq(items.id, input.itemId));
        const [location] = input.locationId
            ? await this.db
                .select()
                .from(locations)
                .where(eq(locations.id, input.locationId))
            : [undefined];

        const teamCode = input.teamName.toUpperCase();
        const orgCode = (org as any)?.acronym?.toUpperCase?.() ?? "ORG";
        const itemCode = itemRow?.name?.toUpperCase() ?? "ITEM";
        const locCode = (location as any)?.acronym?.toUpperCase?.() ?? "LOC";

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const from = month >= 4 ? year.toString().slice(-2) : (year - 1).toString().slice(-2);
        const to = ((parseInt(from, 10) + 1) % 100).toString().padStart(2, "0");
        const fy = `${from}${to}`;

        const prefix = `${teamCode}/${fy}/${orgCode}/${itemCode}/${locCode}`;

        const last = await this.db
            .select()
            .from(projects)
            .where(like(projects.projectCode, `${prefix}/%`))
            .orderBy(desc(projects.id))
            .limit(1);

        let next = 1;
        if (last[0]?.projectCode) {
            const match = last[0].projectCode.match(/(\d{4})$/);
            if (match) next = parseInt(match[1], 10) + 1;
        }

        const projectCode = `${prefix}/${next.toString().padStart(4, "0")}`;

        const organizationName = (org as any)?.name ?? "ORG";
        const itemName = itemRow?.name ?? "ITEM";
        const locationName = (location as any)?.name ?? "LOC";

        const projectName = `${organizationName} - ${itemName} - ${locationName}`;

        return { projectCode, projectName };
    }

    async findAll(filters: ListProjectsFilters) {
        const page = filters.page && filters.page > 0 ? filters.page : 1;
        const limit = filters.limit && filters.limit > 0 ? filters.limit : 50;
        const offset = (page - 1) * limit;

        const whereConditions: any[] = [];

        if (filters.search) {
            const pattern = `%${filters.search}%`;
            whereConditions.push(
                or(
                    like(projects.projectName, pattern),
                    like(projects.projectCode, pattern),
                    like(projects.teamName, pattern),
                    like(projects.poNo, pattern),
                ),
            );
        }

        if (filters.teamName) {
            whereConditions.push(like(projects.teamName, `%${filters.teamName}%`));
        }
        if (filters.organisationId) {
            whereConditions.push(eq(projects.organisationId, filters.organisationId));
        }
        if (filters.itemId) {
            whereConditions.push(eq(projects.itemId, filters.itemId));
        }
        if (filters.locationId) {
            whereConditions.push(eq(projects.locationId, filters.locationId));
        }

        if (filters.fromDate) {
            whereConditions.push(
                gte(
                    projects.poDate,
                    sql`${filters.fromDate}::date`,
                ),
            );
        }
        if (filters.toDate) {
            whereConditions.push(
                lte(
                    projects.poDate,
                    sql`${filters.toDate}::date`,
                ),
            );
        }

        const where =
            whereConditions.length > 0
                ? and(...whereConditions)
                : undefined;

        const [rows, [{ total }]] = await Promise.all([
            this.db
                .select({
                    id: projects.id,
                    teamName: projects.teamName,
                    organisationId: projects.organisationId,
                    itemId: projects.itemId,
                    locationId: projects.locationId,
                    poNo: projects.poNo,
                    projectCode: projects.projectCode,
                    projectName: projects.projectName,
                    poDocument: projects.poDocument,
                    poDate: projects.poDate,
                    performanceCertificate: projects.performanceCertificate,
                    performanceDate: projects.performanceDate,
                    completionDocument: projects.completionDocument,
                    completionDate: projects.completionDate,
                    createdAt: projects.createdAt,
                    updatedAt: projects.updatedAt,
                    sapPoDate: projects.sapPoDate,
                    sapPoNo: projects.sapPoNo,
                    tenderId: projects.tenderId,
                    enquiryId: projects.enquiryId,
                    organizationName: organizations.name,
                    itemName: items.name,
                    locationName: locations.name,
                })
                .from(projects)
                .leftJoin(organizations, eq(organizations.id, projects.organisationId as any))
                .leftJoin(items, eq(items.id, projects.itemId))
                .leftJoin(locations, eq(locations.id, projects.locationId as any))
                .where(where as any)
                .orderBy(desc(projects.createdAt))
                .limit(limit)
                .offset(offset),
            this.db
                .select({ total: count() })
                .from(projects)
                .where(where),
        ]);

        const data: ProjectListRow[] = (rows as ProjectListRow[]).map(row => ({
            id: row.id,
            teamName: row.teamName,
            organisationId: row.organisationId,
            itemId: row.itemId,
            locationId: row.locationId,
            poNo: row.poNo,
            projectCode: row.projectCode,
            projectName: row.projectName,
            poDocument: row.poDocument,
            poDate: row.poDate,
            performanceCertificate: row.performanceCertificate,
            performanceDate: row.performanceDate,
            completionDocument: row.completionDocument,
            completionDate: row.completionDate,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            sapPoDate: row.sapPoDate,
            sapPoNo: row.sapPoNo,
            tenderId: row.tenderId,
            enquiryId: row.enquiryId,
            organizationName: row.organizationName,
            itemName: row.itemName,
            locationName: row.locationName,
        }));

        return {
            data,
            meta: {
                total: Number(total ?? 0),
                page,
                limit,
            },
        };
    }

    async findById(id: number): Promise<ProjectRow> {
        const result = await this.db
            .select()
            .from(projects)
            .where(eq(projects.id, id))
            .limit(1);

        if (!result[0]) {
            throw new NotFoundException("Project not found");
        }

        return result[0];
    }

    async create(input: CreateProjectDto): Promise<ProjectRow> {
        const { projectCode, projectName } =
            await this.generateProjectCodeAndName({
                teamName: input.teamName,
                organisationId: input.organisationId ?? undefined,
                itemId: input.itemId,
                locationId: input.locationId ?? undefined,
            });

        const now = new Date();

        const rows = await this.db
            .insert(projects)
            .values({
                teamName: input.teamName,
                organisationId: input.organisationId ?? null,
                itemId: input.itemId,
                locationId: input.locationId ?? null,
                poNo: input.poNo ?? null,
                projectCode,
                projectName,
                poDocument: input.poDocument ?? null,
                poDate: input.poDate ? new Date(input.poDate) : null,
                performanceCertificate: input.performanceCertificate ?? null,
                performanceDate: input.performanceDate ? new Date(input.performanceDate) : null,
                completionDocument: input.completionDocument ?? null,
                completionDate: input.completionDate ? new Date(input.completionDate) : null,
                sapPoDate: input.sapPoDate ? new Date(input.sapPoDate) : null,
                sapPoNo: input.sapPoNo ?? null,
                tenderId: input.tenderId ?? null,
                enquiryId: input.enquiryId ?? null,
                createdAt: now,
                updatedAt: now,
            } as typeof projects.$inferInsert)
            .returning();

        return rows[0];
    }

    async update(id: number, input: UpdateProjectDto): Promise<ProjectRow> {
        const existing = await this.findById(id);

        let projectCode = existing.projectCode;
        let projectName = existing.projectName;

        const needsRegenerate =
            input.itemId ||
            input.organisationId !== undefined ||
            input.locationId !== undefined;

        if (needsRegenerate) {
            const { projectCode: newCode, projectName: newName } =
                await this.generateProjectCodeAndName({
                    teamName: input.teamName ?? existing.teamName,
                    organisationId:
                        input.organisationId ?? existing.organisationId ?? undefined,
                    itemId: input.itemId ?? existing.itemId,
                    locationId:
                        input.locationId ?? existing.locationId ?? undefined,
                });
            projectCode = newCode;
            projectName = newName;
        }

        const rows = await this.db
            .update(projects)
            .set({
                teamName: input.teamName ?? existing.teamName,
                organisationId:
                    input.organisationId !== undefined
                        ? input.organisationId
                        : existing.organisationId,
                itemId: input.itemId ?? existing.itemId,
                locationId:
                    input.locationId !== undefined
                        ? input.locationId
                        : existing.locationId,
                poNo: input.poNo ?? existing.poNo,
                projectCode,
                projectName,
                poDocument: input.poDocument ?? existing.poDocument,
                poDate: input.poDate ?? existing.poDate,
                performanceCertificate:
                    input.performanceCertificate ?? existing.performanceCertificate,
                performanceDate: input.performanceDate ?? existing.performanceDate,
                completionDocument:
                    input.completionDocument ?? existing.completionDocument,
                completionDate: input.completionDate ?? existing.completionDate,
                sapPoDate: input.sapPoDate ?? existing.sapPoDate,
                sapPoNo: input.sapPoNo ?? existing.sapPoNo,
                tenderId:
                    input.tenderId !== undefined
                        ? input.tenderId
                        : existing.tenderId,
                enquiryId:
                    input.enquiryId !== undefined
                        ? input.enquiryId
                        : existing.enquiryId,
                updatedAt: new Date(),
            })
            .where(eq(projects.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException("Project not found");
        }

        return rows[0];
    }

    async delete(id: number): Promise<void> {
        const result = await this.db
            .delete(projects)
            .where(eq(projects.id, id))
            .returning();

        if (!result[0]) {
            throw new NotFoundException("Project not found");
        }
    }
}
