import { Injectable, NotFoundException, BadRequestException, Inject, LoggerService } from "@nestjs/common";
import { eq, ne, and, or, isNull, sql, desc, asc, like, SQL, inArray } from "drizzle-orm";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

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
        private readonly googleService: GoogleService,

        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger
    ) {}

    // ========================
    // CREATE
    // ========================

    async create(dto: CreateFollowUpDto, currentUserId: number): Promise<FollowUp> {
        this.logger.info("Creating follow-up", {
            partyName: dto.partyName,
            assignedToId: dto.assignedToId,
            createdBy: currentUserId,
            contactsCount: dto.contacts?.length ?? 0,
        });

        try {
            const contacts: FollowUpContact[] = dto.contacts.map(c => ({
                name: c.name,
                email: c.email ?? null,
                phone: c.phone ?? null,
                org: c.org ?? null,
                addedAt: new Date().toISOString(),
            }));

            await this.syncToClientDirectory(contacts);

            this.logger.debug("Client directory synced", {
                contactsCount: contacts.length,
            });

            const normalizeDateToISODate = (v?: string | null) => {
                if (!v) return null;
                const d = new Date(v);
                if (isNaN(d.getTime())) return null;
                return d.toISOString().split("T")[0];
            };

            const startFrom = normalizeDateToISODate(dto.startFrom) ?? new Date().toISOString().split("T")[0];

            const nextFollowUpDate = normalizeDateToISODate(dto.nextFollowUpDate ?? null);

            const frequency = typeof (dto as any).frequency === "number" ? (dto as any).frequency : dto.frequency ? Number((dto as any).frequency) : 1;

            const stopReason = dto.stopReason == null ? null : Number(dto.stopReason);

            const reminderCount = dto.reminderCount ?? 1;

            const [created] = await this.db
                .insert(followUps)
                .values({
                    area: dto.area,
                    partyName: dto.partyName,
                    amount: dto.amount != null ? String(dto.amount) : "0",
                    followupFor: dto.followupFor ?? null,
                    assignedToId: dto.assignedToId ?? null,
                    createdById: currentUserId,
                    assignmentStatus: "assigned",
                    comment: dto.comment ?? null,
                    details: dto.details ?? null,
                    latestComment: dto.latestComment ?? null,
                    contacts,
                    followUpHistory: dto.followUpHistory ?? [],
                    attachments: dto.attachments ?? [],
                    startFrom,
                    nextFollowUpDate,
                    frequency,
                    reminderCount,
                    stopReason,
                    proofText: dto.proofText ?? null,
                    proofImagePath: dto.proofImagePath ?? null,
                    stopRemarks: dto.stopRemarks ?? null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    deletedAt: null,
                    emdId: dto.emdId ?? null,
                })
                .returning();

            this.logger.info("Follow-up created successfully", {
                followUpId: created.id,
            });

            return created;
        } catch (error: any) {
            this.logger.error("Failed to create follow-up", {
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }

    // ========================
    // FIND ALL
    // ========================

    async findAll(query: FollowUpQueryDto, currentUser: { id: number; role: string }) {
        const { tab, search, page, limit, sortBy, sortOrder } = query;

        this.logger.info("Fetching follow-ups list", {
            userId: currentUser.id,
            tab,
            search,
            page,
            limit,
        });

        try {
            const offset = (page - 1) * limit;
            const conditions: SQL[] = [isNull(followUps.deletedAt)];

            if (search) {
                conditions.push(or(like(followUps.partyName, `%${search}%`), like(followUps.area, `%${search}%`))!);
            }

            const today = new Date().toLocaleDateString("en-CA");

            if (tab === "ongoing") conditions.push(ne(followUps.frequency, 6));
            else if (tab === "achieved") {
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

            const results = await this.db.query.followUps.findMany({
                where: and(...conditions),
                with: { contacts: true, assignee: true, creator: true },
                orderBy: orderDirection(orderColumn),
                limit,
                offset,
            });

            this.logger.debug("Follow-ups fetched", { count: results.length });

            const [{ count }] = await this.db
                .select({ count: sql<number>`count(*)` })
                .from(followUps)
                .where(and(...conditions));

            return {
                data: results.map(fu => ({
                    ...this.transformFollowUp(fu),
                    contacts: fu.contacts,
                    creator: fu.creator,
                    assignee: fu.assignee,
                })),
                meta: {
                    total: Number(count),
                    page,
                    limit,
                    totalPages: Math.ceil(Number(count) / limit),
                },
            };
        } catch (error: any) {
            this.logger.error("Error fetching follow-ups", {
                error: error.message,
            });
            throw error;
        }
    }

    // ========================
    // FIND ONE
    // ========================
    async findOne(id: number): Promise<FollowUpDetailsDto> {
        this.logger.info("Fetching follow-up details", { followUpId: id });

        const result = await this.db.query.followUps.findFirst({
            where: and(eq(followUps.id, id), isNull(followUps.deletedAt)),
            with: {
                contacts: true, // ✅ THIS IS THE MISSING PIECE
            },
        });

        if (!result) {
            this.logger.warn("Follow-up not found", { followUpId: id });
            throw new NotFoundException(`Follow-up with ID ${id} not found`);
        }

        const formatDateTime = (d?: Date | null) => (d ? d.toISOString() : null);

        const formatDateOnly = (d?: string | Date | null) => {
            if (!d) return null;
            const dateObj = d instanceof Date ? d : new Date(d);
            if (isNaN(dateObj.getTime())) return null;
            return dateObj.toISOString().split("T")[0];
        };

        this.logger.debug("Follow-up details loaded", {
            followUpId: result.id,
            contactsCount: result.contacts?.length ?? 0,
        });

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

    async update(id: number, dto: any, files: Express.Multer.File[], currentUser: { id: number; name: string }): Promise<FollowUp> {
        this.logger.info("Updating follow-up", {
            followUpId: id,
            userId: currentUser.id,
            filesUploaded: files?.length ?? 0,
        });

        try {
            // ========================
            // FETCH FOLLOW-UP
            // ========================
            const existing = await this.db
                .select()
                .from(followUps)
                .where(and(eq(followUps.id, id), isNull(followUps.deletedAt)))
                .limit(1)
                .then(r => r[0] ?? null);

            if (!existing) {
                this.logger.warn("Follow-up not found for update", { followUpId: id });
                throw new NotFoundException(`Follow-up with ID ${id} not found`);
            }

            this.logger.debug("Existing follow-up loaded", {
                followUpId: id,
                existingAttachments: existing.attachments?.length ?? 0,
            });

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
                this.logger.warn("Validation failed while updating follow-up", {
                    followUpId: id,
                    errors: parsed.error.flatten(),
                });
                throw new BadRequestException(parsed.error.flatten());
            }

            const data = parsed.data;

            // ========================
            // PREPARE UPDATE DATA
            // ========================
            const updateData: Partial<typeof followUps.$inferInsert> = {
                updatedAt: new Date(),
            };

            if (data.area !== undefined) updateData.area = data.area;
            if (data.partyName !== undefined) updateData.partyName = data.partyName;
            if (data.amount !== undefined) updateData.amount = String(data.amount);
            if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId;
            if (data.details !== undefined) updateData.details = data.details;
            if (data.frequency !== undefined) updateData.frequency = data.frequency;
            if (data.startFrom !== undefined) updateData.startFrom = data.startFrom;
            if (data.stopReason !== undefined) updateData.stopReason = data.stopReason;
            if (data.proofText !== undefined) updateData.proofText = data.proofText;
            if (data.stopRemarks !== undefined) updateData.stopRemarks = data.stopRemarks;

            // ========================
            // ATTACHMENTS
            // ========================
            const existingAttachments = existing.attachments ?? [];

            const removedAttachments = (data.removedAttachments ?? []).filter(f => !f.includes("..") && !path.isAbsolute(f));

            this.logger.debug("Removing attachments from disk", {
                followUpId: id,
                removedAttachmentsCount: removedAttachments.length,
            });

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
            // UPDATE FOLLOW-UP
            // ========================
            await this.db.update(followUps).set(updateData).where(eq(followUps.id, id));

            this.logger.info("Follow-up main record updated", {
                followUpId: id,
            });

            // ========================
            // CONTACTS
            // ========================
            const existingContacts = await this.db.select().from(followUpPersons).where(eq(followUpPersons.followUpId, id));

            const incomingContacts = data.contacts ?? [];
            const incomingIds = incomingContacts.filter(c => c.id !== undefined && c.id !== null).map(c => Number(c.id));

            const contactsToDelete = existingContacts.filter(ec => !incomingIds.includes(ec.id));

            if (contactsToDelete.length > 0) {
                const idsToDelete = contactsToDelete.map(c => Number(c.id));

                await this.db.delete(followUpPersons).where(and(eq(followUpPersons.followUpId, id), inArray(followUpPersons.id, idsToDelete)));

                this.logger.debug("Contacts deleted", {
                    followUpId: id,
                    count: contactsToDelete.length,
                });
            }

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

                this.logger.debug("New contacts inserted", {
                    followUpId: id,
                    count: newContacts.length,
                });
            }

            // ========================
            // RETURN UPDATED FOLLOW-UP
            // ========================
            const [updated] = await this.db.select().from(followUps).where(eq(followUps.id, id)).limit(1);

            this.logger.info("Follow-up updated successfully", {
                followUpId: id,
            });

            return updated;
        } catch (error: any) {
            this.logger.error("Failed to update follow-up", {
                followUpId: id,
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }

    // ========================
    // DELETE
    // ========================

    async remove(id: number) {
        const existing = await this.findOne(id);
        this.logger.warn("Soft deleting follow-up", { followUpId: id });
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
        this.logger.info("Updating follow-up status", {
            followUpId: id,
            userId: currentUser.id,
        });

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

        this.logger.info("Follow-up status updated", {
            followUpId: updated.id,
            newStatus: updated.assignmentStatus,
        });

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

                this.logger.debug("New client added to directory", {
                    email: contact.email,
                    phone: contact.phone,
                });
            }
        }
    }

    // ==========================
    // MAILING BEGINS HERE
    // ==========================
    async processFollowupMail(id: number) {
        this.logger.info("Processing follow-up mail", { followUpId: id });

        try {
            const builder = new FollowupMailDataBuilder(this.db);

            const payload = await builder.build(id);

            if (!payload) {
                this.logger.warn("Mail payload not built", { followUpId: id });
                return;
            }

            this.logger.debug("Mail Payload", {
                followUpId: id,
                payload,
            });

            this.logger.debug("Mail payload built", {
                followUpId: id,
                toCount: payload.to?.length ?? 0,
                ccCount: payload.cc?.length ?? 0,
            });

            const googleConnection = await this.googleService.getSanitizedGoogleConnection(payload.assignedToUserId);

            if (!googleConnection) {
                this.logger.warn("Google connection missing for user", {
                    followUpId: id,
                    userId: payload.assignedToUserId,
                });
                return;
            }

            await this.mailerService.sendMail(
                payload.template,
                payload.context,
                {
                    to: payload.to,
                    cc: payload.cc,
                    bcc: ["abhigaur.test@gmail.com"],
                    subject: payload.subject,
                    attachments: payload.attachments,
                },
                googleConnection
            );

            this.logger.info("Follow-up mail sent successfully", {
                followUpId: id,
                subject: payload.subject,
            });
        } catch (error: any) {
            this.logger.error("Error while sending follow-up mail", {
                followUpId: id,
                error: error.message,
                stack: error.stack,
            });
        }
    }

    async getDueFollowupsForCurrentWindow(frequency: number) {
        const today = new Date().toLocaleDateString("en-CA");

        this.logger.debug("Fetching due follow-ups", {
            frequency,
            date: today,
        });

        try {
            const result = await this.db
                .select()
                .from(followUps)
                .where(and(eq(followUps.frequency, frequency), sql`${followUps.startFrom} <= ${today}`, isNull(followUps.deletedAt), ne(followUps.frequency, 6)));

            this.logger.debug("Due follow-ups fetched", {
                frequency,
                count: result.length,
            });

            return result;
        } catch (error: any) {
            this.logger.error("Error fetching due follow-ups", {
                frequency,
                error: error.message,
            });
            throw error;
        }
    }

    async incrementReminderCount(id: number) {
        this.logger.debug("Incrementing reminder count", { followUpId: id });

        try {
            await this.db
                .update(followUps)
                .set({
                    reminderCount: sql`${followUps.reminderCount} + 1`,
                    updatedAt: new Date(),
                })
                .where(eq(followUps.id, id));

            this.logger.debug("Reminder count incremented", { followUpId: id });
        } catch (error: any) {
            this.logger.error("Failed to increment reminder count", {
                followUpId: id,
                error: error.message,
            });
            throw error;
        }
    }

    private getOrderColumn(sortBy: string) {
        const columnMap: Record<string, any> = {
            startFrom: followUps.startFrom,
            createdAt: followUps.createdAt,
            updatedAt: followUps.updatedAt,
            amount: followUps.amount,
            partyName: followUps.partyName,
        };

        if (!columnMap[sortBy]) {
            this.logger.warn("Invalid sortBy received, defaulting to startFrom", {
                sortBy,
            });
        }

        return columnMap[sortBy] || followUps.startFrom;
    }

    private transformFollowUp(f: any, includeHistory = false) {
        if (!f) {
            this.logger.warn("transformFollowUp called with empty object");
            return {};
        }

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

        this.logger.debug("Follow-up transformed for response", {
            followUpId: f.id,
            contactsCount: result.followPerson.length,
        });

        return result;
    }
}
