import { Injectable, NotFoundException, BadRequestException, Inject, LoggerService, InternalServerErrorException } from "@nestjs/common";
import { eq, ne, and, or, isNull, sql, desc, asc, like, SQL, inArray, ilike } from "drizzle-orm";
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
    updateFollowUpStatusSchema,
} from "@/modules/follow-up/zod";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import path from "path";

import { MailerService } from "@/mailer/mailer.service";
import { GoogleService } from "@/modules/integrations/google/google.service";

import { FollowupMailTemplates } from "./follow-up.mail";
import { FollowupMailDataBuilder } from "./follow-up.mail-data";
import { FollowupMailBase } from "./zod/mail.dto";

import { MailAudienceService } from "@/core/mail/mail-audience.service";

export const FREQUENCY_LABELS: Record<number, string> = {
    1: "Daily",
    2: "Alternate Days",
    3: "Twice a day",
    4: "Weekly",
    5: "Twice a Week",
    6: "Stop",
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
        private readonly logger: Logger,

        private readonly mailAudience: MailAudienceService
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

        this.logger.debug({ message: "The DATA received for creating follow up ", dto });
        try {
            // ------------------------
            // NORMALIZE CONTACTS
            // ------------------------
            const contacts = (dto.contacts ?? []).map(c => ({
                name: c.name ?? "",
                email: c.email ?? null,
                phone: c.phone ?? null,
                org: c.org ?? null,
                addedAt: new Date().toISOString(),
            }));

            // Sync to client directory (same behavior as before)
            await this.syncToClientDirectory(contacts);

            // ------------------------
            // DATE NORMALIZATION
            // ------------------------
            const normalizeDateToISODate = (v?: string | null) => {
                if (!v) return null;
                const d = new Date(v);
                if (isNaN(d.getTime())) return null;
                return d.toISOString().split("T")[0];
            };

            const startFrom = normalizeDateToISODate(dto.startFrom) ?? new Date().toISOString().split("T")[0];

            const nextFollowUpDate = normalizeDateToISODate(dto.nextFollowUpDate ?? null);

            const frequency = typeof (dto as any).frequency === "number" ? (dto as any).frequency : dto.frequency ? Number(dto.frequency) : 1;

            const stopReason = dto.stopReason == null ? null : Number(dto.stopReason);
            const reminderCount = dto.reminderCount ?? 1;

            // ------------------------
            // TRANSACTIONAL INSERT
            // ------------------------
            return await this.db.transaction(async tx => {
                // 1. Insert main follow-up record
                const [followUp] = await tx
                    .insert(followUps)
                    .values({
                        area: dto.area,
                        partyName: dto.partyName,
                        amount: dto.amount != null ? String(dto.amount) : "0",
                        followupFor: dto.followupFor ?? null,
                        assignedToId: dto.assignedToId || currentUserId,
                        createdById: dto.createdById || currentUserId,
                        assignmentStatus: dto.assignmentStatus ?? "assigned",
                        comment: dto.comment ?? null,
                        details: dto.details ?? null,
                        latestComment: dto.latestComment ?? null,
                        attachments: dto.attachments ?? [],
                        followUpHistory: dto.followUpHistory ?? [],
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

                this.logger.debug("Follow-up main record inserted", { followUpId: followUp.id });

                // 2. Insert relational contacts
                this.logger.debug("Preparing to insert relational contacts", {
                    count: contacts.length,
                    followUpId: followUp.id,
                });

                if (contacts.length > 0) {
                    const mappedContacts = contacts.map(c => ({
                        followUpId: followUp.id,
                        name: c.name,
                        email: c.email,
                        phone: c.phone,
                        organization: c.org || dto.partyName, // Ensuring organization is set
                    }));

                    this.logger.debug("Mapped contacts for relational insert", { mappedContacts });

                    const insertResult = await tx.insert(followUpPersons).values(mappedContacts).returning();

                    this.logger.debug("Relational contacts insert result", {
                        followUpId: followUp.id,
                        insertedCount: insertResult.length,
                    });
                } else {
                    this.logger.warn("No contacts found to insert relationally", { followUpId: followUp.id });
                }

                this.logger.info("Follow-up created successfully inside transaction", {
                    followUpId: followUp.id,
                });

                // ===== MAIL SIDE EFFECT (non-blocking for courier creation) =====
                try {
                    // createdById null check
                    if (followUp.createdById === null) {
                        this.logger.warn("createdById missing, mail skipped", {
                            followUpId: followUp.id,
                        });
                        return followUp;
                    }

                    const googleConnection = await this.resolveGoogleConnection(followUp.createdById, {
                        action: "create",
                        followUpId: followUp.id,
                    });

                    if (!googleConnection) {
                        this.logger.warn("Google connection completely missing (primary and fallback failed), follow-up creation mail skipped", {
                            followUpId: followUp.id,
                        });
                        return followUp;
                    }

                    let toEmailsList: string[] = [];
                    let toUser: typeof users.$inferSelect | undefined;

                    const [fromUser] = await this.db.select().from(users).where(eq(users.id, followUp.createdById));

                    // assignedToId null check
                    if (followUp.assignedToId !== null) {
                        [toUser] = await this.db.select().from(users).where(eq(users.id, followUp.assignedToId));

                        if (toUser) {
                            toEmailsList = [toUser.email];
                        }
                    }

                    const admin = await this.mailAudience.getAdmin();
                    const coordinator = await this.db.select().from(users).where(eq(users.id, 8));

                    const ccMail = [admin.email, coordinator[0]?.email];

                    this.logger.info("To Email List", { toEmailsList });
                    this.logger.info("CC Email List", { ccMail });

                    const mailPayload = {
                        teamMember: toUser?.name ?? "Team Member",
                        organizationName: followUp.partyName,
                        followUpFor: followUp.followupFor,
                        followUpInitiator: fromUser?.name ?? "",
                        formLink: `${process.env.FRONTEND_URL}/shared/follow-up/edit/${followUp.id}`,
                    };

                    await this.mailerService.sendMail(
                        FollowupMailTemplates.ASSIGNED_TO_MAIL,
                        mailPayload,
                        {
                            to: toEmailsList,
                            cc: ccMail,
                            subject: "New Follow Up Assigned",
                        },
                        googleConnection
                    );
                } catch (mailError: any) {
                    this.logger.error("Follow-up Created mail failed (non-blocking)", {
                        followUpId: followUp.id,
                        error: mailError.message,
                    });
                }

                return followUp;
            });
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

    async findAll(query: FollowUpQueryDto, currentUser: any) {
        const { tab, search, page, limit, sortBy, sortOrder } = query;
        this.logger.debug({message: "Printing the current user", currentUser});

        try {
            const offset = (page - 1) * limit;
            const conditions: SQL[] = [isNull(followUps.deletedAt)];

            if(currentUser.roleId != "1" && currentUser.roleId != "2"){
                this.logger.debug({message: "Is not admin"});

                    conditions.push(
                        or(
                            eq(followUps.assignedToId, currentUser.id),
                            eq(followUps.createdById, currentUser.id)
                        )!
                    );
            }

            if (search) {
                const pattern = `%${search}%`;

                // Subquery: find user IDs whose name matches
                const matchingUserIds = this.db.select({ id: users.id }).from(users).where(ilike(users.name, pattern));

                conditions.push(
                    or(
                        ilike(followUps.partyName, pattern),
                        ilike(followUps.area, pattern),
                        sql`CAST(${followUps.amount} AS TEXT) ILIKE ${pattern}`,
                        inArray(followUps.assignedToId, matchingUserIds) 
                    )!
                );
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
            contacts: (result.contacts ?? []).map(c => ({
                name: c.name ?? null,
                email: c.email ?? null,
                phone: c.phone ?? null,
                org: c.org ?? null,
            })),

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

    async update(id: number, dto: any, files: Express.Multer.File[], proofImage: Express.Multer.File | null, currentUser: { id: number; name: string }): Promise<FollowUp> {
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
            //updating the status
            updateData.assignmentStatus = "initiated";

            if (proofImage) {
                updateData.proofImagePath = proofImage.filename;
            }

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
            const [updated] = await this.db.update(followUps).set(updateData).where(eq(followUps.id, id)).returning();

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
                        name: c.name ?? "",
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

            // ✅ NEW: Send stop mail when follow-up is being stopped
            if (Number(data.frequency) === 6) {
                try {
                    const googleConnection = await this.resolveGoogleConnection(existing.assignedToId, {
                        action: "stop_mail",
                        followUpId: id,
                    });

                    if (!googleConnection) {
                        this.logger.warn("Google connection completely missing (primary and fallback failed), stop mail skipped", {
                            followUpId: id,
                        });
                    } else {
                        const [assigneeUser] = existing.assignedToId 
                            ? await this.db.select().from(users).where(eq(users.id, existing.assignedToId))
                            : [undefined];
                        const [creatorUser] = existing.createdById ? await this.db.select().from(users).where(eq(users.id, existing.createdById)) : [undefined];

                        const admin = await this.mailAudience.getAdmin();
                        const [coordinator] = await this.db.select().from(users).where(eq(users.id, 8));

                        const stopReasonNum = Number(data.stopReason ?? existing.stopReason);
                        const isObjectiveAchieved = stopReasonNum === 2;
                        const isRemarks = stopReasonNum === 4;

                        const mailPayload = {
                            followUpInitiator: creatorUser?.name ?? "Team",
                            followUpFor: existing.followupFor ?? "",
                            organizationName: existing.partyName,
                            reason: STOP_REASON_LABELS[stopReasonNum] ?? "",
                            remarks: data.stopRemarks ?? existing.stopRemarks ?? "",
                            proofs: data.proofText ?? existing.proofText ?? "",
                            isObjectiveAchieved,
                            isRemarks,
                            teamMember: assigneeUser?.name ?? "Team Member",
                        };

                        // ✅ Now correctly uses proofImage from param
                        const attachments = proofImage ? { files: [proofImage.filename], baseDir: "accounts" } : undefined;

                        await this.mailerService.sendMail(
                            FollowupMailTemplates.STOP,
                            mailPayload,
                            {
                                to: creatorUser?.email ? [creatorUser.email] : [],
                                cc: [admin.email, coordinator?.email].filter(Boolean) as string[],
                                subject: `Follow Up Stopped — ${existing.followupFor ?? existing.partyName}`,
                                attachments,
                            },
                            googleConnection
                        );

                        this.logger.info("Stop mail sent successfully", { followUpId: id });
                    }
                } catch (mailError: any) {
                    this.logger.error("Stop mail failed (non-blocking)", {
                        followUpId: id,
                        error: mailError.message,
                    });
                }
            }

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

    async delete(id: number, userId: number) {
        this.logger.warn("Hard deleting follow-up", { followUpId: id, userId });

        try {
            const existing = await this.findOne(id);
            if (!existing) {
                throw new NotFoundException("Follow-up not found");
            }

            await this.db.transaction(async tx => {
                // 1️⃣ Delete child records first (FK safety)
                await tx.delete(followUpPersons).where(eq(followUpPersons.followUpId, id));

                // 2️⃣ Delete follow_up
                await tx.delete(followUps).where(eq(followUps.id, id));
            });

            this.logger.warn("Follow-up hard deleted successfully", { followUpId: id });

            return { message: "Follow-up and related persons deleted successfully" };
        } catch (error: any) {
            this.logger.error("Failed to hard delete follow-up", {
                followUpId: id,
                userId,
                error: error.message,
            });

            throw new InternalServerErrorException(error.message);
        }
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

        const parsed = updateFollowUpStatusSchema.safeParse(dto);
        if (!parsed.success) {
            this.logger.warn("Validation failed while updating follow-up status", {
                followUpId: id,
                errors: parsed.error.flatten(),
            });
            throw new BadRequestException(parsed.error.flatten());
        }

        const data = parsed.data;

        const updateData: Partial<typeof followUps.$inferInsert> = {
            latestComment: data.latestComment ? `${data.latestComment} - ${currentUser.name}` : existing.latestComment,
            assignmentStatus: "initiated",
            updatedAt: new Date(),
        };

        if (data.frequency) updateData.frequency = data.frequency;
        if (data.stopReason) updateData.stopReason = data.stopReason;
        if (data.proofText) updateData.proofText = data.proofText;
        if (data.stopRemarks) updateData.stopRemarks = data.stopRemarks;
        if (proofImage) {
            updateData.proofImagePath = proofImage.filename;
        }
        const [updated] = await this.db.update(followUps).set(updateData).where(eq(followUps.id, id)).returning();

        this.logger.info("Follow-up status updated", {
            followUpId: updated.id,
            newStatus: updated.assignmentStatus,
        });

        // ✅ NEW: Send stop mail when follow-up is being stopped
        if (Number(data.frequency) === 6) {
            try {
                const googleConnection = await this.resolveGoogleConnection(existing.assignedToId, {
                    action: "stop_mail",
                    followUpId: id,
                });

                if (!googleConnection) {
                    this.logger.warn("Google connection completely missing (primary and fallback failed), stop mail skipped", {
                        followUpId: id,
                    });
                } else {
                    const [assigneeUser] = existing.assignedToId 
                        ? await this.db.select().from(users).where(eq(users.id, existing.assignedToId))
                        : [undefined];
                    const [creatorUser] = existing.createdById ? await this.db.select().from(users).where(eq(users.id, existing.createdById)) : [undefined];

                    const admin = await this.mailAudience.getAdmin();
                    const [coordinator] = await this.db.select().from(users).where(eq(users.id, 8));

                    const stopReasonNum = Number(data.stopReason ?? existing.stopReason);
                    const isObjectiveAchieved = stopReasonNum === 2;
                    const isRemarks = stopReasonNum === 4;

                    const mailPayload = {
                        followUpInitiator: creatorUser?.name ?? "Team",
                        followUpFor: existing.followupFor ?? "",
                        organizationName: existing.partyName,
                        reason: STOP_REASON_LABELS[stopReasonNum] ?? "",
                        remarks: data.stopRemarks ?? existing.stopRemarks ?? "",
                        proofs: data.proofText ?? existing.proofText ?? "",
                        isObjectiveAchieved,
                        isRemarks,
                        teamMember: assigneeUser?.name ?? "Team Member",
                    };

                    const attachments = proofImage ? { files: [proofImage.filename], baseDir: "accounts" } : undefined;

                    await this.mailerService.sendMail(
                        FollowupMailTemplates.STOP,
                        mailPayload,
                        {
                            to: creatorUser?.email ? [creatorUser.email] : [],
                            cc: [admin.email, coordinator?.email].filter(Boolean) as string[],
                            subject: `Follow Up Stopped — ${existing.followupFor ?? existing.partyName}`,
                            attachments,
                        },
                        googleConnection
                    );

                    this.logger.info("Stop mail sent successfully for status update", { followUpId: id });
                }
            } catch (mailError: any) {
                this.logger.error("Stop mail failed for status update (non-blocking)", {
                    followUpId: id,
                    error: mailError.message,
                });
            }
        }

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
    // GOOGLE CONNECTION HELPER
    // ==========================
    private async resolveGoogleConnection(targetUserId: number | null, contextData: Record<string, any>): Promise<any> {
        this.logger.info("Resolving Google connection", { ...contextData, targetUserId });

        let googleConnection: any = null;

        if (targetUserId) {
            googleConnection = await this.googleService.getSanitizedGoogleConnection(targetUserId);
        }

        if (googleConnection) {
            this.logger.info("Successfully resolved primary Google connection", { ...contextData, resolvedUserId: targetUserId });
            return googleConnection;
        }

        this.logger.warn("Primary Google connection missing, attempting fallback", {
            ...contextData,
            missingUserId: targetUserId,
        });

        const fallbackStr = process.env.FALLBACK_MAIL_USER_ID;
        if (fallbackStr && !isNaN(parseInt(fallbackStr))) {
            const FALLBACK_MAIL_USER_ID = parseInt(fallbackStr);
            googleConnection = await this.googleService.getSanitizedGoogleConnection(FALLBACK_MAIL_USER_ID);
            
            if (googleConnection) {
                 this.logger.info("Google connection for fallback id being used", {
                    ...contextData,
                    fallbackUserId: FALLBACK_MAIL_USER_ID,
                 });
                 return googleConnection;
            }
        }

        this.logger.error("Fallback Google connection also missing", { ...contextData });
        return null;
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

            //  attempt google connection
            const googleConnection = await this.resolveGoogleConnection(payload.assignedToUserId, {
                action: "process_followup_mail",
                followUpId: id,
            });

            if (!googleConnection) {
                this.logger.warn("Google connection completely missing (primary and fallback failed), follow-up mail skipped", {
                    followUpId: id,
                });
                return;
            }

            this.logger.debug("Entering mailer Service", {
                followUpId: id,
                googleConnection: googleConnection,
            });

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

            // incrementing reminder count
            this.incrementReminderCount(id);

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

    async getPreviewHtml(emdId: number) {
        this.logger.debug("Generating email template preview via builder", { emdId });

        try {
            const builder = new FollowupMailDataBuilder(this.db);
            const html = await builder.buildPreview(emdId);

            if (!html) {
                return { html: null, message: "Could not generate preview. Instrument missing." };
            }

            return { html };
        } catch (error: any) {
            this.logger.error("Error generating preview html", {
                emdId,
                error: error.message,
                stack: error.stack,
            });
            throw new BadRequestException("Failed to generate preview");
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
                .where(
                    and(
                        eq(followUps.assignmentStatus, "initiated"),
                        eq(followUps.frequency, frequency),
                        sql`${followUps.startFrom} <= ${today}`,
                        isNull(followUps.deletedAt),
                        ne(followUps.frequency, 6)
                    )
                );

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
            // this.logger.warn("transformFollowUp called with empty object");
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

        // this.logger.debug("Follow-up transformed for response", {
        //     followUpId: f.id,
        //     contactsCount: result.followPerson.length,
        // });

        return result;
    }
}
