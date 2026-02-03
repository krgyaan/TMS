import { Injectable, NotFoundException, BadRequestException, Inject } from "@nestjs/common";
import { eq, ne, and, or, isNull, sql, desc, asc, like, SQL, inArray } from "drizzle-orm";

import { followUps, FollowUp, FollowUpContact, FollowUpHistoryEntry } from "@/db/schemas/shared/follow-ups.schema";
import { clientDirectory } from "@/db/schemas/shared/client-directory.schema";
import { followUpPersons } from "@/db/schemas/shared/follow-up-persons.schema";
import { users } from "@/db/schemas/auth/users.schema";
import * as fs from "fs";

import {
    type CreateFollowUpDto,
    type UpdateFollowUpDto,
    type UpdateFollowUpStatusDto,
    type FollowUpQueryDto,
    type FollowUpDetailsDto,
    updateFollowUpSchema,
} from "@/modules/follow-up/zod";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import path from "path";

import { MailerService } from "@/mailer/mailer.service";
import { GoogleService } from "@/modules/integrations/google/google.service";

import { FollowupMailTemplates } from "./follow-up.mail";
import { FollowupMailDataBuilder } from "./follow-up.mail-data";
import { FollowupMailBase } from "./zod/mail.dto";

export const FREQUENCY_LABELS: Record<number, string> = {
    1: "Daily",
    2: "Alternate Days",
    3: "Weekly",
    4: "Bi-Weekly",
    5: "Monthly",
    6: "Stopped",
};

export const STOP_REASON_LABELS: Record<number, string> = {
    1: "Party Angry / Not Interested",
    2: "Objective Achieved",
    3: "Not Reachable",
    4: "Other",
};

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "accounts");

@Injectable()
export class FollowUpService {
    constructor(
        @Inject(DRIZZLE)
        private readonly db: DbInstance,
        private readonly mailerService: MailerService,
        private readonly googleService: GoogleService
    ) {}

    // ========================
    // CREATE
    // ========================

    async create(dto: CreateFollowUpDto, currentUserId: number): Promise<FollowUp> {
        // normalize contacts
        const contacts: FollowUpContact[] = dto.contacts.map(c => ({
            name: c.name,
            email: c.email ?? null,
            phone: c.phone ?? null,
            org: c.org ?? null,
            addedAt: new Date().toISOString(),
        }));

        // keep client directory in sync (your existing helper)
        await this.syncToClientDirectory(contacts);

        // normalize dates to YYYY-MM-DD for DATE columns
        const normalizeDateToISODate = (v?: string | null) => {
            if (!v) return null;
            const d = new Date(v);
            if (isNaN(d.getTime())) return null;
            return d.toISOString().split("T")[0];
        };

        const startFrom = normalizeDateToISODate(dto.startFrom) ?? new Date().toISOString().split("T")[0];
        const nextFollowUpDate = normalizeDateToISODate(dto.nextFollowUpDate ?? null);

        // frequency and stopReason are numeric in DB (smallint)
        const frequency = typeof (dto as any).frequency === "number" ? (dto as any).frequency : dto.frequency ? Number((dto as any).frequency) : 1;

        const stopReason = dto.stopReason == null ? null : Number(dto.stopReason);

        const reminderCount = dto.reminderCount ?? 1;

        // insert into DB
        const [created] = await this.db
            .insert(followUps)
            .values({
                // required fields
                area: dto.area,
                partyName: dto.partyName,
                amount: dto.amount != null ? String(dto.amount) : "0",

                // followup_for in your DDL is varchar(50)
                followupFor: dto.followupFor ?? null,

                // relationships (nullable in your DDL)
                assignedToId: dto.assignedToId ?? null,
                createdById: currentUserId,

                // assignment status is varchar in your DDL
                assignmentStatus: "assigned",

                // text fields
                comment: dto.comment ?? null,
                details: dto.details ?? null,
                latestComment: dto.latestComment ?? null,

                // JSON/array fields
                contacts,
                followUpHistory: dto.followUpHistory ?? [],
                attachments: dto.attachments ?? [],

                // scheduling / numeric fields
                startFrom,
                nextFollowUpDate,
                frequency,
                reminderCount,
                stopReason,

                // other optional fields
                proofText: dto.proofText ?? null,
                proofImagePath: dto.proofImagePath ?? null,
                stopRemarks: dto.stopRemarks ?? null,

                // audit
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,

                // optional
                emdId: dto.emdId ?? null,
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

        // if (currentUser.role !== "admin") {
        //     conditions.push(eq(followUps.assignedToId, currentUser.id));
        // } else if (assignedToId) {
        //     conditions.push(eq(followUps.assignedToId, assignedToId));
        // }

        if (search) {
            conditions.push(or(like(followUps.partyName, `%${search}%`), like(followUps.area, `%${search}%`))!);
        }

        const today = new Date().toLocaleDateString("en-CA");

        if (tab === "ongoing") {
            conditions.push(ne(followUps.frequency, 6));
        } else if (tab === "achieved") {
            conditions.push(eq(followUps.frequency, 6));
            conditions.push(eq(followUps.stopReason, 2));
        } else if (tab === "angry") {
            conditions.push(eq(followUps.frequency, 6));
            conditions.push(eq(followUps.stopReason, 1));
        } else if (tab === "future") {
            conditions.push(sql`${followUps.startFrom} > ${today}`);
        }

        const orderDirection = sortOrder === "asc" ? asc : desc;
        const orderColumn = this.getOrderColumn(sortBy);

        // ⭐ DRIZZLE RELATION QUERY — contacts auto-included
        const results = await this.db.query.followUps.findMany({
            where: and(...conditions),
            with: {
                contacts: true,
                assignee: true,
                creator: true,
            },
            orderBy: orderDirection(orderColumn),
            limit,
            offset,
        });

        // Count for pagination
        const [{ count }] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(followUps)
            .where(and(...conditions));

        // Transform + include contacts
        const data = results.map(fu => ({
            ...this.transformFollowUp(fu),
            contacts: fu.contacts,
            creator: fu.creator,
            assignee: fu.assignee,
        }));

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
        const result = await this.db.query.followUps.findFirst({
            where: and(eq(followUps.id, id), isNull(followUps.deletedAt)),
            with: {
                contacts: true, // ✅ THIS IS THE MISSING PIECE
            },
        });

        if (!result) {
            throw new NotFoundException(`Follow-up with ID ${id} not found`);
        }

        const formatDateTime = (d?: Date | null) => (d ? d.toISOString() : null);

        const formatDateOnly = (d?: string | Date | null) => {
            if (!d) return null;
            const dateObj = d instanceof Date ? d : new Date(d);
            if (isNaN(dateObj.getTime())) return null;
            return dateObj.toISOString().split("T")[0];
        };

        return {
            id: result.id,

            area: result.area,
            partyName: result.partyName,

            amount: result.amount ? Number(result.amount) : null,
            followupFor: result.followupFor ?? null,

            assignedToId: result.assignedToId ?? null,
            details: result.details ?? null,

            status: result.assignmentStatus ?? "assigned",

            frequency: result.frequency ?? null,
            stopReason: result.stopReason ?? null,

            startFrom: formatDateOnly(result.startFrom),
            nextFollowUpDate: formatDateOnly(result.nextFollowUpDate),

            proofText: result.proofText ?? null,
            proofImagePath: result.proofImagePath ?? null,
            stopRemarks: result.stopRemarks ?? null,

            // ✅ CORRECT SOURCE
            contacts: result.contacts ?? [],

            attachments: Array.isArray(result.attachments) ? result.attachments : [],
            followUpHistory: Array.isArray(result.followUpHistory) ? result.followUpHistory : [],

            createdAt: formatDateTime(result.createdAt),
            updatedAt: formatDateTime(result.updatedAt),
            reminderCount: result.reminderCount ?? 0,
        };
    }

    // ========================
    // UPDATE
    // ========================

    async update(
        id: number,
        dto: any, // multipart-safe raw body
        files: Express.Multer.File[],
        currentUser: { id: number; name: string }
    ): Promise<FollowUp> {
        // ========================
        // FETCH FOLLOW-UP
        // ========================
        const existing = await this.db
            .select()
            .from(followUps)
            .where(and(eq(followUps.id, id), isNull(followUps.deletedAt)))
            .limit(1)
            .then(r => r[0]);

        if (!existing) {
            throw new NotFoundException(`Follow-up with ID ${id} not found`);
        }

        // ========================
        // NORMALIZE MULTIPART INPUT
        // ========================
        const normalizedDto = {
            ...dto,
            assignedToId: dto.assignedToId !== undefined ? Number(dto.assignedToId) : undefined,
            frequency: dto.frequency !== undefined ? Number(dto.frequency) : undefined,
            stopReason: dto.stopReason !== undefined ? Number(dto.stopReason) : undefined,
            amount: dto.amount !== undefined ? Number(dto.amount) : undefined,
            contacts: dto.contacts ? JSON.parse(Array.isArray(dto.contacts) ? dto.contacts[dto.contacts.length - 1] : dto.contacts) : [],
            removedAttachments: dto.removedAttachments ? (Array.isArray(dto.removedAttachments) ? dto.removedAttachments : [dto.removedAttachments]) : [],
        };

        // ========================
        // VALIDATE
        // ========================
        const parsed = updateFollowUpSchema.safeParse(normalizedDto);
        if (!parsed.success) {
            throw new BadRequestException(parsed.error.flatten());
        }

        const data = parsed.data;

        // ========================
        // UPDATE FOLLOW-UP (PARENT)
        // ========================
        const updateData: Partial<typeof followUps.$inferInsert> = {
            updatedAt: new Date(),
        };

        // Basic fields
        if (data.area !== undefined) updateData.area = data.area;
        if (data.partyName !== undefined) updateData.partyName = data.partyName;
        if (data.amount !== undefined) updateData.amount = String(data.amount);
        if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId;
        if (data.details !== undefined) updateData.details = data.details;

        // Scheduling
        if (data.frequency !== undefined) updateData.frequency = data.frequency;
        if (data.startFrom !== undefined) updateData.startFrom = data.startFrom;

        // Stop fields
        if (data.stopReason !== undefined) updateData.stopReason = data.stopReason;
        if (data.proofText !== undefined) updateData.proofText = data.proofText;
        if (data.stopRemarks !== undefined) updateData.stopRemarks = data.stopRemarks;

        // ========================
        // ATTACHMENTS (UNCHANGED LOGIC)
        // ========================
        const existingAttachments = existing.attachments ?? [];

        const removedAttachments = (data.removedAttachments ?? []).filter(f => !f.includes("..") && !path.isAbsolute(f));

        // delete removed files from disk
        for (const file of removedAttachments) {
            const filePath = path.join(UPLOAD_DIR, file);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        const remainingAttachments = existingAttachments.filter(f => !removedAttachments.includes(f));

        const newFiles = Array.isArray(files) ? files.map(f => f.filename) : [];

        updateData.attachments = Array.from(new Set([...remainingAttachments, ...newFiles]));

        // ========================
        // SAVE FOLLOW-UP
        // ========================
        const followUp = await this.db.update(followUps).set(updateData).where(eq(followUps.id, id));

        // ========================
        // CONTACTS LOGIC (SIMPLE CREATE / DELETE)
        // ========================

        const existingContacts = await this.db.select().from(followUpPersons).where(eq(followUpPersons.followUpId, id));

        const incomingContacts = data.contacts ?? [];

        // existing contact IDs coming from frontend
        const incomingIds = incomingContacts.filter(c => c.id !== undefined && c.id !== null).map(c => Number(c.id));

        // delete removed contacts
        const contactsToDelete = existingContacts.filter(ec => !incomingIds.includes(ec.id));

        if (contactsToDelete.length > 0) {
            const idsToDelete = contactsToDelete.map(c => Number(c.id));

            await this.db.delete(followUpPersons).where(and(eq(followUpPersons.followUpId, id), inArray(followUpPersons.id, idsToDelete)));
        }

        // insert new contacts (same as CREATE)
        const newContacts = incomingContacts.filter(c => !c.id);

        if (newContacts.length > 0) {
            await this.db.insert(followUpPersons).values(
                newContacts.map(c => ({
                    followUpId: existing.id,
                    name: c.name,
                    email: c.email ?? null,
                    phone: c.phone ?? null,
                }))
            );
        }

        // ========================
        // RETURN UPDATED FOLLOW-UP
        // ========================
        const [updated] = await this.db.select().from(followUps).where(eq(followUps.id, id)).limit(1);

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

    async updateStatus(id: number, dto: any, currentUser: { id: number; name: string }, proofImage: Express.Multer.File): Promise<FollowUp> {
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
        if (dto.stopRemarks) updateData.stopRemarks = dto.stopRemarks;
        if (proofImage) {
            updateData.proofImagePath = proofImage.filename;
        }
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

    // ==========================
    // MAILING BEGINS HERE
    // ==========================
    async processFollowupMail(id: number) {
        console.log("Sending followup mail for", id);

        const builder = new FollowupMailDataBuilder(this.db);

        const payload = await builder.build(id);
        console.log("mail payload", payload);

        if (!payload) return;

        const googleConnection = await this.googleService.getSanitizedGoogleConnection(payload.assignedToUserId);

        console.log("googleConnection", googleConnection);

        if (!googleConnection) return;

        await this.mailerService.sendMail(
            payload.template,
            payload.context,
            {
                to: payload.to,
                cc: payload.cc,
                subject: payload.subject,
                attachments: payload.attachments,
            },
            googleConnection
        );
    }

    async getDueFollowupsForCurrentWindow(frequency: number) {
        const today = new Date().toLocaleDateString("en-CA");

        return this.db
            .select()
            .from(followUps)
            .where(and(eq(followUps.frequency, frequency), sql`${followUps.startFrom} <= ${today}`, isNull(followUps.deletedAt), ne(followUps.frequency, 6)));
    }

    async incrementReminderCount(id: number) {
        await this.db
            .update(followUps)
            .set({
                reminderCount: sql`${followUps.reminderCount} + 1`,
                updatedAt: new Date(),
            })
            .where(eq(followUps.id, id));
    }

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
