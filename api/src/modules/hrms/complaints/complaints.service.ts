import { Injectable, Inject, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { eq, aliasedTable, and, sql, isNull, asc, desc, ilike, or, type SQL } from "drizzle-orm";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import { users } from "@/db/schemas/auth/users.schema";
import { teams } from "@/db/schemas/master/teams.schema";
import { complaints } from "@/db/schemas/hrms/complaints.schema";
import type { CreateComplaintDto, UpdateComplaintDto } from "./dto";

@Injectable()
export class ComplaintsService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    /**
     * Lookup lists for the complaint form: active employees + departments.
     */
    async getComplaintLookups() {
        const [userRows, teamRows] = await Promise.all([
            this.db
                .select({ id: users.id, name: users.name })
                .from(users)
                .where(and(eq(users.isActive, true), isNull(users.deletedAt)))
                .orderBy(asc(users.name)),
            this.db.select({ id: teams.id, name: teams.name }).from(teams).orderBy(asc(teams.name)),
        ]);
        return { users: userRows, departments: teamRows };
    }

    /**
     * Shared enriched fetch — resolves the "against" name from users/teams by
     * complaintAgainstId, plus complainant/creator names.
     */
    private async fetchEnrichedComplaints(options: { where?: SQL; orderBy?: SQL<unknown>; limit?: number; offset?: number }) {
        const againstUsers = aliasedTable(users, "against_users");
        const againstTeams = aliasedTable(teams, "against_teams");
        const complainantUsers = aliasedTable(users, "complainant_users");
        const creatorUsers = aliasedTable(users, "creator_users");

        const rows = await this.db
            .select({
                complaint: complaints,
                againstUserName: againstUsers.name,
                againstTeamName: againstTeams.name,
                complainantName: complainantUsers.name,
                createdByName: creatorUsers.name,
            })
            .from(complaints)
            .leftJoin(againstUsers, and(eq(complaints.complaintAgainstId, againstUsers.id), eq(complaints.complaintAgainstType, "person")))
            .leftJoin(againstTeams, and(eq(complaints.complaintAgainstId, againstTeams.id), eq(complaints.complaintAgainstType, "department")))
            .leftJoin(complainantUsers, eq(complaints.complainantId, complainantUsers.id))
            .leftJoin(creatorUsers, eq(complaints.createdBy, creatorUsers.id))
            .where(options.where)
            .orderBy(options.orderBy ?? desc(complaints.createdAt))
            .limit(options.limit ?? 10000)
            .offset(options.offset ?? 0);

        return rows.map(({ complaint: c, againstUserName, againstTeamName, complainantName, createdByName }) => ({
            id: c.id,
            complaintCode: c.complaintCode,
            complaintType: c.complaintType,
            complaintAgainst: c.complaintAgainstType,
            complaintAgainstName: againstUserName || againstTeamName || null,
            subject: c.subject,
            description: c.description,
            priority: c.priority,
            status: c.status,
            incidentDate: c.incidentAt?.toISOString() || null,
            incidentLocation: c.incidentLocation,
            witnesses: c.witnesses,
            previousAttempts: c.previousAttempts,
            expectedResolution: c.expectedResolution,
            attachments: (c.supportingDocs as string[] | null) || [],
            complainantId: c.complainantId,
            complainantName: complainantName || null,
            createdBy: c.createdBy,
            createdByName: createdByName || null,
            createdAt: c.createdAt?.toISOString() || null,
            updatedAt: c.updatedAt?.toISOString() || null,
        }));
    }

    /**
     * Complaints filed by the authenticated employee (support page list).
     */
    async getMyComplaints(userId: number) {
        return this.fetchEnrichedComplaints({
            where: eq(complaints.complainantId, userId),
        });
    }

    /**
     * Admin list — every complaint with enriched names, filters + pagination
     * (Coordinator+ guarded at the controller).
     */
    async getAllComplaints(filters?: { page?: number; limit?: number; search?: string; status?: string; priority?: string; sortBy?: string; sortOrder?: "asc" | "desc" }) {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        const conditions: SQL[] = [];
        if (filters?.search) {
            conditions.push(
                or(
                    ilike(complaints.subject, `%${filters.search}%`),
                    ilike(complaints.complaintCode, `%${filters.search}%`),
                    ilike(complaints.description, `%${filters.search}%`)
                ) as SQL
            );
        }
        if (filters?.status) conditions.push(eq(complaints.status, filters.status));
        if (filters?.priority) conditions.push(eq(complaints.priority, filters.priority));
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const [countResult] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(complaints)
            .where(whereClause);
        const total = Number(countResult?.count || 0);

        const sortFn = filters?.sortOrder === "asc" ? asc : desc;
        let orderByClause: SQL<unknown>;
        switch (filters?.sortBy) {
            case "subject":
                orderByClause = sortFn(complaints.subject);
                break;
            case "priority":
                orderByClause = sortFn(complaints.priority);
                break;
            case "status":
                orderByClause = sortFn(complaints.status);
                break;
            case "createdAt":
                orderByClause = sortFn(complaints.createdAt);
                break;
            default:
                orderByClause = desc(complaints.createdAt);
        }

        const data = await this.fetchEnrichedComplaints({
            where: whereClause,
            orderBy: orderByClause,
            limit,
            offset,
        });

        return {
            data,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    /**
     * File a complaint as the authenticated employee (support page).
     * complainantId + createdBy are both taken from the JWT — never the body.
     */
    async createComplaint(userId: number, dto: CreateComplaintDto) {
        const complaintAgainstId = await this.resolveComplaintAgainst(dto);

        // Generate sequential complaint code: CMP-0001
        const [row] = await this.db.select({ maxCode: sql<string>`MAX(complaint_code)` }).from(complaints);
        const maxCode = row?.maxCode;
        let num = 0;
        if (maxCode) {
            const parsed = parseInt(maxCode.replace("CMP-", ""), 10);
            if (!isNaN(parsed)) num = parsed;
        }
        const complaintCode = `CMP-${String(num + 1).padStart(4, "0")}`;

        const [created] = await this.db
            .insert(complaints)
            .values({
                complaintCode,
                complainantId: userId,
                createdBy: userId,
                complaintType: dto.complaintType,
                complaintAgainstType: dto.complaintAgainst || null,
                complaintAgainstId,
                subject: dto.subject,
                description: dto.description,
                priority: dto.priority,
                incidentAt: dto.incidentDate ? new Date(dto.incidentDate) : null,
                incidentLocation: dto.incidentLocation || null,
                previousAttempts: dto.previousAttempts || null,
                witnesses: dto.witnesses || null,
                expectedResolution: dto.expectedResolution || null,
                supportingDocs: dto.attachments ?? [],
                status: "open",
            })
            .returning();

        return created;
    }

    /**
     * Edit a complaint — allowed only while its status is still "open"
     * and only by the employee who filed it.
     */
    async updateMyComplaint(userId: number, id: number, dto: UpdateComplaintDto) {
        const complaint = await this.getOwnedComplaint(userId, id);
        if (complaint.status !== "open") {
            throw new ForbiddenException("Only complaints that are still Open can be edited");
        }

        const patch: Record<string, unknown> = { updatedAt: new Date() };
        if (dto.complaintType !== undefined) patch.complaintType = dto.complaintType;
        if (dto.subject !== undefined) patch.subject = dto.subject;
        if (dto.description !== undefined) patch.description = dto.description;
        if (dto.priority !== undefined) patch.priority = dto.priority;
        if (dto.incidentDate !== undefined) patch.incidentAt = dto.incidentDate ? new Date(dto.incidentDate) : null;
        if (dto.incidentLocation !== undefined) patch.incidentLocation = dto.incidentLocation || null;
        if (dto.previousAttempts !== undefined) patch.previousAttempts = dto.previousAttempts || null;
        if (dto.witnesses !== undefined) patch.witnesses = dto.witnesses || null;
        if (dto.expectedResolution !== undefined) patch.expectedResolution = dto.expectedResolution || null;
        if (dto.attachments !== undefined) patch.supportingDocs = dto.attachments;

        // "Against" is updated as a pair: changing the type clears/validates the id
        if (dto.complaintAgainst !== undefined || dto.complaintAgainstId !== undefined) {
            const againstType = dto.complaintAgainst ?? (complaint.complaintAgainstType as UpdateComplaintDto["complaintAgainst"]);
            const againstId = dto.complaintAgainstId ?? null;
            patch.complaintAgainstType = againstType || null;
            patch.complaintAgainstId = againstType && againstId ? await this.resolveComplaintAgainst({ complaintAgainst: againstType, complaintAgainstId: againstId }) : null;
        }

        const [updated] = await this.db.update(complaints).set(patch).where(eq(complaints.id, id)).returning();

        return updated;
    }

    /**
     * Delete a complaint — allowed only while its status is still "open"
     * and only by the employee who filed it.
     */
    async deleteMyComplaint(userId: number, id: number) {
        const complaint = await this.getOwnedComplaint(userId, id);
        if (complaint.status !== "open") {
            throw new ForbiddenException("Only complaints that are still Open can be deleted");
        }

        await this.db.delete(complaints).where(eq(complaints.id, id));
        return { success: true, message: "Complaint deleted successfully" };
    }

    /** Fetch + authorize: complaint must exist and belong to the caller. */
    private async getOwnedComplaint(userId: number, id: number) {
        const [complaint] = await this.db.select().from(complaints).where(eq(complaints.id, id)).limit(1);
        if (!complaint || complaint.complainantId !== userId) {
            throw new NotFoundException("Complaint not found");
        }
        return complaint;
    }

    /** Validate the "against" subject exists; system/policy/facility carry no id. */
    private async resolveComplaintAgainst(dto: UpdateComplaintDto): Promise<number | null> {
        if (!dto.complaintAgainstId) return null;
        if (dto.complaintAgainst === "person") {
            const [subject] = await this.db
                .select({ id: users.id })
                .from(users)
                .where(and(eq(users.id, dto.complaintAgainstId), isNull(users.deletedAt)))
                .limit(1);
            if (!subject) throw new NotFoundException("Complaint subject (person) not found");
            return subject.id;
        }
        if (dto.complaintAgainst === "department") {
            const [subject] = await this.db.select({ id: teams.id }).from(teams).where(eq(teams.id, dto.complaintAgainstId)).limit(1);
            if (!subject) throw new NotFoundException("Complaint subject (department) not found");
            return subject.id;
        }
        throw new BadRequestException(`complaintAgainstId is not valid for type "${dto.complaintAgainst}"`);
    }
}
