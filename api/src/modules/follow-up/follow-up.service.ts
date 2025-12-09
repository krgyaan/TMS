import { Injectable, NotFoundException, BadRequestException, Inject } from "@nestjs/common";
import { eq, ne, and, or, isNull, sql, desc, asc, like, SQL } from "drizzle-orm";

import { followUps, FollowUp, FollowUpContact, FollowUpHistoryEntry } from "../../db/follow-ups.schema";
import { clientDirectory } from "../../db/client-directory.schema";
import { users } from "../../db/users.schema";

import type { CreateFollowUpDto, UpdateFollowUpDto, UpdateFollowUpStatusDto, FollowUpQueryDto, FollowUpDetailsDto } from "./zod";
import { DRIZZLE } from "../../db/database.module";
import type { DbInstance } from "../../db";

const FREQUENCY_LABELS: Record<string, string> = {
    daily: "Daily",
    alternate: "Alternate Days",
    weekly: "Weekly",
    biweekly: "Bi-Weekly",
    monthly: "Monthly",
    stopped: "Stopped",
};

const STOP_REASON_LABELS: Record<string, string> = {
    party_angry: "Party Angry / Not Interested",
    objective_achieved: "Objective Achieved",
    not_reachable: "Not Reachable",
    other: "Other",
};

@Injectable()
export class FollowUpService {
    constructor(
        @Inject(DRIZZLE)
        private readonly db: DbInstance
    ) {}

    // ========================
    // CREATE
    // ========================

    async create(dto: CreateFollowUpDto, currentUserId: number): Promise<FollowUp> {
        const contacts: FollowUpContact[] = dto.contacts.map(c => ({
            name: c.name,
            email: c.email || null,
            phone: c.phone || null,
            org: c.org || null,
            addedAt: new Date().toISOString(),
        }));

        await this.syncToClientDirectory(contacts);

        const [created] = await this.db
            .insert(followUps)
            .values({
                area: dto.area,
                partyName: dto.partyName,
                amount: dto.amount?.toString() || "0",
                categoryId: dto.categoryId || null,
                assignedToId: dto.assignedToId,
                createdById: currentUserId,
                assignmentStatus: "assigned",
                comment: dto.comment || null,
                contacts,
                startFrom: dto.startFrom || new Date().toISOString().split("T")[0],
                frequency: "daily",
                emdId: dto.emdId || null,
            })
            .returning();

        return created;
    }

    // ========================
    // FIND ALL
    // ========================

    async findAll(query: FollowUpQueryDto, currentUser: { id: number; role: string }) {
        const { tab, assignedToId, search, page, limit, sortBy, sortOrder } = query;
        const offset = (page - 1) * limit;

        const conditions: SQL[] = [isNull(followUps.deletedAt)];

        if (currentUser.role !== "admin") {
            conditions.push(eq(followUps.assignedToId, currentUser.id));
        } else if (assignedToId) {
            conditions.push(eq(followUps.assignedToId, assignedToId));
        }

        if (search) {
            conditions.push(or(like(followUps.partyName, `%${search}%`), like(followUps.area, `%${search}%`))!);
        }

        const today = new Date().toISOString().split("T")[0];

        if (tab === "ongoing") {
            conditions.push(ne(followUps.frequency, "stopped"));
        } else if (tab === "achieved") {
            conditions.push(eq(followUps.frequency, "stopped"));
        } else if (tab === "angry") {
            conditions.push(eq(followUps.frequency, "stopped"), eq(followUps.stopReason, "party_angry"));
        } else if (tab === "future") {
            conditions.push(sql`${followUps.startFrom} > ${today}`);
        }

        const orderDirection = sortOrder === "asc" ? asc : desc;
        const orderColumn = this.getOrderColumn(sortBy);

        const results = await this.db
            .select()
            .from(followUps)
            .where(and(...conditions))
            .orderBy(orderDirection(orderColumn))
            .limit(limit)
            .offset(offset);

        const [{ count }] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(followUps)
            .where(and(...conditions));

        const data = results.map(r => this.transformFollowUp(r));

        return {
            data,
            meta: {
                total: Number(count),
                page,
                limit,
                totalPages: Math.ceil(Number(count) / limit),
            },
        };
    }

    // ========================
    // FIND ONE
    // ========================
    async findOne(id: number): Promise<FollowUpDetailsDto> {
        const result = await this.db
            .select()
            .from(followUps)
            .where(and(eq(followUps.id, id), isNull(followUps.deletedAt)))
            .limit(1)
            .then(r => r[0] ?? null);

        if (!result) {
            throw new NotFoundException(`Follow-up with ID ${id} not found`);
        }

        return {
            id: result.id,

            area: result.area,
            partyName: result.partyName,

            amount: result.amount ? Number(result.amount) : null,
            categoryId: result.categoryId,

            assignedToId: result.assignedToId,
            details: result.details,

            // ✅ MAPPED CORRECTLY
            status: result.assignmentStatus,

            frequency: result.frequency,
            startFrom: result.startFrom,

            stopReason: result.stopReason,
            proofText: result.proofText,
            proofImagePath: result.proofImagePath,
            stopRemarks: result.stopRemarks,

            contacts: result.contacts ?? [],
            attachments: result.attachments ?? [],

            createdAt: result.createdAt.toDateString(),
            updatedAt: result.updatedAt.toDateString(),
        };
    }
    // ========================
    // UPDATE
    // ========================

    async update(id: number, dto: UpdateFollowUpDto, currentUser: { id: number; name: string }): Promise<FollowUp> {
        console.log("✅ DTO RECEIVED BY BACKEND:", dto);

        const existing = await this.db
            .select()
            .from(followUps)
            .where(and(eq(followUps.id, id), isNull(followUps.deletedAt)))
            .limit(1)
            .then(r => r[0] ?? null);

        if (!existing) {
            throw new NotFoundException(`Follow-up with ID ${id} not found`);
        }

        const updateData: Partial<typeof followUps.$inferInsert> = {
            updatedAt: new Date(),
        };

        // ✅ BASIC FIELDS
        if (dto.area !== undefined) updateData.area = dto.area;
        if (dto.partyName !== undefined) updateData.partyName = dto.partyName;
        if (dto.amount !== undefined) updateData.amount = String(dto.amount);
        if (dto.assignedToId !== undefined) updateData.assignedToId = dto.assignedToId;

        // ✅ DETAILS
        if (dto.details !== undefined) updateData.details = dto.details;

        // ✅ SCHEDULING
        if (dto.frequency !== undefined) updateData.frequency = dto.frequency;
        if (dto.startFrom !== undefined) updateData.startFrom = dto.startFrom;

        // ✅ STOP FIELDS
        if (dto.stopReason !== undefined) updateData.stopReason = dto.stopReason;
        if (dto.proofText !== undefined) updateData.proofText = dto.proofText;
        if (dto.proofImagePath !== undefined) updateData.proofImagePath = dto.proofImagePath;
        if (dto.stopRemarks !== undefined) updateData.stopRemarks = dto.stopRemarks;

        // ✅ ATTACHMENTS
        if (dto.attachments !== undefined) updateData.attachments = dto.attachments;

        // ✅ CONTACTS
        if (dto.contacts !== undefined) {
            updateData.contacts = dto.contacts.map(c => ({
                name: c.name,
                email: c.email ?? null, // ✅ undefined → null
                phone: c.phone ?? null, // ✅ undefined → null
                org: c.org ?? null, // ✅ undefined → null
                addedAt: new Date().toISOString(), // ✅ required field
            }));
        }

        console.log("✅ FINAL UPDATE OBJECT SENT TO DRIZZLE:", updateData);

        const [updated] = await this.db.update(followUps).set(updateData).where(eq(followUps.id, id)).returning();

        console.log("✅ UPDATED ROW FROM DB:", updated);

        return updated;
    }
    // ========================
    // DELETE
    // ========================

    async remove(id: number) {
        const existing = await this.findOne(id);

        await this.db.update(followUps).set({ deletedAt: new Date() }).where(eq(followUps.id, id));
        return { message: "Follow-up deleted successfully" };
    }

    // ========================
    // AMOUNT SUMMARY
    // ========================

    async getAmountSummary(currentUser: { id: number; role: string }) {
        const baseConditions: SQL[] = [isNull(followUps.deletedAt)];

        if (currentUser.role !== "admin") {
            baseConditions.push(eq(followUps.assignedToId, currentUser.id));
        }

        const results = await this.db
            .select({
                assignedToId: followUps.assignedToId,
                totalAmount: sql<string>`SUM(${followUps.amount})`,
            })
            .from(followUps)
            .where(and(...baseConditions))
            .groupBy(followUps.assignedToId);

        return results;
    }

    // ========================
    // UPDATE STATUS (QUICK MODAL)
    // ========================

    async updateStatus(
        id: number,
        dto: any, // keeping it loose to match your current simplified service
        currentUser: { id: number; name: string }
    ): Promise<FollowUp> {
        const existing = await this.db
            .select()
            .from(followUps)
            .where(and(eq(followUps.id, id), isNull(followUps.deletedAt)))
            .limit(1)
            .then(r => r[0] ?? null);

        if (!existing) {
            throw new NotFoundException(`Follow-up with ID ${id} not found`);
        }

        const updateData: Partial<typeof followUps.$inferInsert> = {
            latestComment: dto.latestComment ? `${dto.latestComment} - ${currentUser.name}` : existing.latestComment,
            assignmentStatus: "initiated",
            updatedAt: new Date(),
        };

        if (dto.frequency) updateData.frequency = dto.frequency;
        if (dto.stopReason) updateData.stopReason = dto.stopReason;
        if (dto.proofText) updateData.proofText = dto.proofText;
        if (dto.proofImagePath) updateData.proofImagePath = dto.proofImagePath;
        if (dto.stopRemarks) updateData.stopRemarks = dto.stopRemarks;

        const [updated] = await this.db.update(followUps).set(updateData).where(eq(followUps.id, id)).returning();

        return updated;
    }

    // ========================
    // CLIENT DIRECTORY SYNC
    // ========================

    private async syncToClientDirectory(contacts: FollowUpContact[]) {
        for (const contact of contacts) {
            if (!contact.email && !contact.phone) continue;

            const existing = await this.db
                .select()
                .from(clientDirectory)
                .where(or(contact.email ? eq(clientDirectory.email, contact.email) : undefined, contact.phone ? eq(clientDirectory.phone, contact.phone) : undefined))
                .limit(1)
                .then(r => r[0] ?? null);

            if (!existing) {
                await this.db.insert(clientDirectory).values({
                    name: contact.name,
                    email: contact.email,
                    phone: contact.phone,
                    organization: contact.org,
                });
            }
        }
    }

    // ========================
    // HELPERS
    // ========================

    private getOrderColumn(sortBy: string) {
        const columnMap: Record<string, any> = {
            startFrom: followUps.startFrom,
            createdAt: followUps.createdAt,
            updatedAt: followUps.updatedAt,
            amount: followUps.amount,
            partyName: followUps.partyName,
        };
        return columnMap[sortBy] || followUps.startFrom;
    }

    private transformFollowUp(f: any, includeHistory = false) {
        const result: any = {
            id: f.id,
            area: f.area,
            party_name: f.partyName,
            amount: parseFloat(f.amount || "0"),
            frequency: f.frequency,
            frequencyLabel: FREQUENCY_LABELS[f.frequency] || f.frequency,
            status: f.assignmentStatus,
            latest_comment: f.latestComment,
            updated_at: f.updatedAt,
            created_at: f.createdAt,
            start_from: f.startFrom,
            assigned_to_id: f.assignedToId,
            followPerson: f.contacts || [],
            stop_reason: f.stopReason,
            stopReasonLabel: f.stopReason ? STOP_REASON_LABELS[f.stopReason] : null,
        };

        if (includeHistory) {
            result.follow_up_history = f.followUpsHistory || [];
        }

        return result;
    }
}
