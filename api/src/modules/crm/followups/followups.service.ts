import { Injectable, NotFoundException, Inject, BadRequestException } from '@nestjs/common';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { leadFollowups, type NewLeadFollowup } from '@db/schemas/crm/lead-followups.schema';
import { leadContacts } from '@db/schemas/crm/lead-contacts.schema';
import { couriers } from '@db/schemas/shared/couriers.schema';
import { leads } from '@db/schemas/crm/leads.schema';
import { users } from '@db/schemas/auth/users.schema';
import { eq, desc, sql } from 'drizzle-orm';

import type {
    CreateFollowupDto,
    LetterFollowupDto,
    CallFollowupDto,
    VisitFollowupDto,
    ContactDto,
} from './dto/followup.dto';

@Injectable()
export class FollowupsService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
    ) {}

    // ─── Find All Followups for a Lead ────────────────────────────────

    async findAllByLead(leadId: number) {
        // Verify lead exists
        const lead = await this.db
            .select({ id: leads.id })
            .from(leads)
            .where(eq(leads.id, leadId))
            .limit(1);

        if (!lead[0]) {
            throw new NotFoundException(`Lead with ID ${leadId} not found`);
        }

        const followups = await this.db
            .select({
                followup: leadFollowups,
                createdByName: users.name,
            })
            .from(leadFollowups)
            .leftJoin(users, eq(users.id, leadFollowups.createdBy))
            .where(eq(leadFollowups.leadId, leadId))
            .orderBy(desc(leadFollowups.createdAt));

        // For each followup, fetch related data
        const result = await Promise.all(
            followups.map(async (row) => {
                // ── CHANGED: added `courier: null` initialization ──
                const followup: any = {
                    ...row.followup,
                    createdByName: row.createdByName ?? null,
                    contacts: [] as any[],
                    courier: null,
                };

                // Fetch contacts for call/visit (unchanged)
                if (
                    row.followup.type === 'call' ||
                    row.followup.type === 'visit'
                ) {
                    const contacts = await this.db
                        .select()
                        .from(leadContacts)
                        .where(eq(leadContacts.followupId, row.followup.id));

                    followup.contacts = contacts;
                }

                // ── CHANGED: fetch and embed courier data for letter type ──
                if (
                    row.followup.type === 'letter' &&
                    row.followup.courierId
                ) {
                    const [courierData] = await this.db
                        .select()
                        .from(couriers)
                        .where(eq(couriers.id, row.followup.courierId))
                        .limit(1);

                    if (courierData) {
                        // Drizzle already maps snake_case columns to camelCase
                        // via the schema definition, so this object is already
                        // in camelCase and ready for the frontend.
                        followup.courier = courierData;
                    }
                }

                return followup;
            })
        );

        return result;
    }

    // ─── Find Single Followup ─────────────────────────────────────────

    async findById(id: number) {
        const rows = await this.db
            .select({
                followup: leadFollowups,
                createdByName: users.name,
            })
            .from(leadFollowups)
            .leftJoin(users, eq(users.id, leadFollowups.createdBy))
            .where(eq(leadFollowups.id, id))
            .limit(1);

        if (!rows[0]) {
            throw new NotFoundException(`Followup with ID ${id} not found`);
        }

        const row = rows[0];

        // ── CHANGED: added `courier: null` initialization ──
        const followup: any = {
            ...row.followup,
            createdByName: row.createdByName ?? null,
            contacts: [],
            courier: null,
        };

        // Fetch contacts if call/visit (unchanged)
        if (row.followup.type === 'call' || row.followup.type === 'visit') {
            followup.contacts = await this.db
                .select()
                .from(leadContacts)
                .where(eq(leadContacts.followupId, id));
        }

        // ── CHANGED: fetch and embed courier data for letter type ──
        if (row.followup.type === 'letter' && row.followup.courierId) {
            const [courierData] = await this.db
                .select()
                .from(couriers)
                .where(eq(couriers.id, row.followup.courierId))
                .limit(1);

            if (courierData) {
                followup.courier = courierData;
            }
        }

        return followup;
    }

    // ─── Create Followup ──────────────────────────────────────────────
    // ── UNCHANGED ────────────────────────────────────────────────────

    async create(
        leadId: number,
        data: CreateFollowupDto,
        createdBy: number,
    ) {
        // Verify lead exists
        const lead = await this.db
            .select({ id: leads.id })
            .from(leads)
            .where(eq(leads.id, leadId))
            .limit(1);

        if (!lead[0]) {
            throw new NotFoundException(`Lead with ID ${leadId} not found`);
        }

        return this.db.transaction(async (tx) => {

            let courierId: number | null = null;

            // ── Handle Letter: create courier record first ────────────
            if (data.type === 'letter') {
                const letterData = data as LetterFollowupDto;

                const [courier] = await tx
                    .insert(couriers)
                    .values({
                        userId: createdBy,
                        toOrg: letterData.toOrg,
                        toName: letterData.toName,
                        toAddr: letterData.toAddr,
                        toPin: letterData.toPin,
                        toMobile: letterData.toMobile,
                        empFrom: letterData.empFrom,
                        delDate: new Date(letterData.delDate),
                        urgency: letterData.urgency,
                        courierDocs: letterData.attachments ?? [],
                        status: 0,
                    })
                    .returning();

                courierId = courier.id;
            }

            // ── Build followup payload ─────────────────────────────────

            const followupPayload: NewLeadFollowup = {
                leadId,
                type: data.type,
                createdBy,
                courierId,
            };

            // Common fields
            if ('body' in data)              followupPayload.body = data.body;
            if ('veResponsibility' in data)  followupPayload.veResponsibility = data.veResponsibility ?? null;
            if ('attachments' in data)       followupPayload.attachments = data.attachments ?? [];
            if ('nextFollowupDate' in data)  followupPayload.nextFollowupDate = data.nextFollowupDate ? new Date(data.nextFollowupDate) : null;
            if ('frequency' in data)         followupPayload.frequency = data.frequency ?? null;

            // ── Insert followup ───────────────────────────────────────

            const [followup] = await tx
                .insert(leadFollowups)
                .values(followupPayload)
                .returning();

            // ── Handle Contacts (Call/Visit) ──────────────────────────

            if (
                (data.type === 'call' || data.type === 'visit') &&
                'contacts' in data &&
                (data as CallFollowupDto | VisitFollowupDto).contacts.length > 0
            ) {
                const contactSource = data.type === 'call'
                    ? 'call_followup'
                    : 'visit_followup';

                const contactsPayload = (data as CallFollowupDto | VisitFollowupDto)
                    .contacts
                    .map((contact: ContactDto) => ({
                        leadId,
                        followupId: followup.id,
                        name: contact.name,
                        designation: contact.designation ?? null,
                        phone: contact.phone ?? null,
                        email: contact.email ?? null,
                        source: contactSource as 'call_followup' | 'visit_followup',
                    }));

                await tx.insert(leadContacts).values(contactsPayload);
            }

            // ── Update lead counters ───────────────────────────────────

            const leadUpdate: any = {
                updatedAt: new Date(),
                recentFollowUp: data.type,
            };

            switch (data.type) {
                case 'mail':
                    leadUpdate.mailFollowupCount = sql`${leads.mailFollowupCount} + 1`;
                    leadUpdate.lastMailSentAt    = new Date();
                    break;
                case 'call':
                    leadUpdate.callFollowupCount = sql`${leads.callFollowupCount} + 1`;
                    leadUpdate.lastCallAt         = new Date();
                    break;
                case 'visit':
                    leadUpdate.visitFollowupCount = sql`${leads.visitFollowupCount} + 1`;
                    leadUpdate.lastVisitAt         = new Date();
                    break;
                case 'letter':
                    leadUpdate.letterSentCount   = sql`${leads.letterSentCount} + 1`;
                    leadUpdate.lastLetterSentAt  = new Date();
                    break;
                case 'whatsapp':
                    leadUpdate.whatsappFollowupCount = sql`${leads.whatsappFollowupCount} + 1`;
                    leadUpdate.lastWhatsappSentAt    = new Date();
                    break;
            }

            await tx
                .update(leads)
                .set(leadUpdate)
                .where(eq(leads.id, leadId));

            return followup;
        });
    }

    // ─── Update Followup ──────────────────────────────────────────────
    // ── UNCHANGED ────────────────────────────────────────────────────

    async update(
        id: number,
        data: CreateFollowupDto,
        updatedBy: number,
    ): Promise<any> {
        // Get existing followup
        const existingFollowup = await this.findById(id);

        // Check if it was created today (only today's followups can be edited)
        const createdAt = new Date(existingFollowup.createdAt);
        const today = new Date();
        const isToday =
            createdAt.getDate() === today.getDate() &&
            createdAt.getMonth() === today.getMonth() &&
            createdAt.getFullYear() === today.getFullYear();

        if (!isToday) {
            throw new BadRequestException('Only today\'s follow-ups can be edited');
        }

        return this.db.transaction(async (tx) => {
            let courierId = existingFollowup.courierId;

            // Handle Letter: update courier record if needed
            if (data.type === 'letter') {
                const letterData = data as LetterFollowupDto;

                if (courierId) {
                    // Update existing courier
                    await tx
                        .update(couriers)
                        .set({
                            toOrg: letterData.toOrg,
                            toName: letterData.toName,
                            toAddr: letterData.toAddr,
                            toPin: letterData.toPin,
                            toMobile: letterData.toMobile,
                            empFrom: letterData.empFrom,
                            delDate: new Date(letterData.delDate),
                            urgency: letterData.urgency,
                            courierDocs: letterData.attachments ?? [],
                        })
                        .where(eq(couriers.id, courierId));
                } else {
                    // Create new courier if it didn't exist
                    const [courier] = await tx
                        .insert(couriers)
                        .values({
                            userId: updatedBy,
                            toOrg: letterData.toOrg,
                            toName: letterData.toName,
                            toAddr: letterData.toAddr,
                            toPin: letterData.toPin,
                            toMobile: letterData.toMobile,
                            empFrom: letterData.empFrom,
                            delDate: new Date(letterData.delDate),
                            urgency: letterData.urgency,
                            courierDocs: letterData.attachments ?? [],
                            status: 0,
                        })
                        .returning();
                    courierId = courier.id;
                }
            }

            // Build update payload
            const updatePayload: Partial<NewLeadFollowup> = {
                courierId,
                updatedAt: new Date(),
            };

            if ('body' in data)             updatePayload.body = data.body;
            if ('veResponsibility' in data) updatePayload.veResponsibility = data.veResponsibility ?? null;
            if ('attachments' in data)      updatePayload.attachments = data.attachments ?? [];
            if ('nextFollowupDate' in data) updatePayload.nextFollowupDate = data.nextFollowupDate ? new Date(data.nextFollowupDate) : null;
            if ('frequency' in data)        updatePayload.frequency = data.frequency ?? null;

            // Update followup
            const [updatedFollowup] = await tx
                .update(leadFollowups)
                .set(updatePayload)
                .where(eq(leadFollowups.id, id))
                .returning();

            // Update contacts for call/visit
            if (
                (data.type === 'call' || data.type === 'visit') &&
                'contacts' in data
            ) {
                // Delete old contacts
                await tx
                    .delete(leadContacts)
                    .where(eq(leadContacts.followupId, id));

                // Insert new contacts
                if ((data as CallFollowupDto | VisitFollowupDto).contacts.length > 0) {
                    const contactSource = data.type === 'call' ? 'call_followup' : 'visit_followup';
                    const contactsPayload = (data as CallFollowupDto | VisitFollowupDto)
                        .contacts
                        .map((contact: ContactDto) => ({
                            leadId: updatedFollowup.leadId,
                            followupId: id,
                            name: contact.name,
                            designation: contact.designation ?? null,
                            phone: contact.phone ?? null,
                            email: contact.email ?? null,
                            source: contactSource as 'call_followup' | 'visit_followup',
                        }));

                    await tx.insert(leadContacts).values(contactsPayload);
                }
            }

            return updatedFollowup;
        });
    }

    // ─── Delete Followup ──────────────────────────────────────────────
    // ── UNCHANGED ────────────────────────────────────────────────────

    async delete(id: number): Promise<void> {
        const followup = await this.findById(id);

        await this.db.transaction(async (tx) => {
            // Delete related contacts
            await tx
                .delete(leadContacts)
                .where(eq(leadContacts.followupId, id));

            // Delete followup
            await tx
                .delete(leadFollowups)
                .where(eq(leadFollowups.id, id));

            // Decrement lead counter
            const decrementMap: any = {};

            switch (followup.type) {
                case 'mail':
                    decrementMap.mailFollowupCount = sql`GREATEST(${leads.mailFollowupCount} - 1, 0)`;
                    break;
                case 'call':
                    decrementMap.callFollowupCount = sql`GREATEST(${leads.callFollowupCount} - 1, 0)`;
                    break;
                case 'visit':
                    decrementMap.visitFollowupCount = sql`GREATEST(${leads.visitFollowupCount} - 1, 0)`;
                    break;
                case 'letter':
                    decrementMap.letterSentCount = sql`GREATEST(${leads.letterSentCount} - 1, 0)`;
                    break;
                case 'whatsapp':
                    decrementMap.whatsappFollowupCount = sql`GREATEST(${leads.whatsappFollowupCount} - 1, 0)`;
                    break;
            }

            if (Object.keys(decrementMap).length > 0) {
                await tx
                    .update(leads)
                    .set({ ...decrementMap, updatedAt: new Date() })
                    .where(eq(leads.id, followup.leadId));
            }
        });
    }
}