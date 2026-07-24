import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { leadEnquiries, type NewLeadEnquiry, type LeadEnquiry } from '@db/schemas/crm/lead-enquiries.schema';
import { siteVisits, type SiteVisit, type NewSiteVisit } from '@db/schemas/crm/site-visits.schema';
import { siteVisitContacts, type SiteVisitContact } from '@db/schemas/crm/site-visit-contacts.schema';
import { privateCostingSheets } from '@db/schemas/crm/private-costing-sheets.schema';
import { leads } from '@db/schemas/crm/leads.schema';
import { items } from '@db/schemas/master/items.schema';
import { organizations } from '@db/schemas/master/organizations.schema';
import { locations } from '@db/schemas/master/locations.schema';
import { users } from '@db/schemas/auth/users.schema';
import { and, asc, desc, eq, ilike, like, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { GoogleDriveService } from '@/modules/integrations/google/google-drive.service';
import type { CreateLeadEnquiryDto, UpdateLeadEnquiryDto, CreateSiteVisitDto, UpdateSiteVisitDto, UpdateSiteVisitDetailsDto, CreateSiteVisitContactDto, CreateSiteVisitContactArrayDto, SubmitCostingSheetDto } from './dto/lead-enquiry.dto';

export type LeadEnquiryListFilters = {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
};

export type LeadEnquiryWithNames = LeadEnquiry & {
    leadName?: string | null;
    itemName?: string | null;
    orgName?: string | null;
    createdByName?: string | null;
    updatedByName?: string | null;
    hasSiteVisit?: boolean;
};

const createdByUser = alias(users, 'created_by_user');
const updatedByUser = alias(users, 'updated_by_user');

@Injectable()
export class LeadEnquiryService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly googleDriveService: GoogleDriveService,
    ) {}

    async findAll(filters?: LeadEnquiryListFilters): Promise<{
        data: LeadEnquiryWithNames[];
        meta: { total: number; page: number; limit: number; totalPages: number };
    }> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;
        const conditions: SQL[] = [];

        if (filters?.search) {
            conditions.push(
                or(
                    ilike(leadEnquiries.enqName, `%${filters.search}%`),
                    ilike(leadEnquiries.enquiryNumber, `%${filters.search}%`),
                    ilike(leadEnquiries.organizationName, `%${filters.search}%`),
                    ilike(leadEnquiries.locationCode, `%${filters.search}%`),
                ) as SQL
            );
        }

        if (filters?.status) {
            conditions.push(eq(leadEnquiries.status, filters.status));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const [countResult] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(leadEnquiries)
            .where(whereClause);

        const total = Number(countResult?.count || 0);

        const sortFn = filters?.sortOrder === 'desc' ? desc : asc;
        let orderByClause: SQL<unknown>;

        switch (filters?.sortBy) {
            case 'enqName':       orderByClause = sortFn(leadEnquiries.enqName); break;
            case 'enquiryNumber': orderByClause = sortFn(leadEnquiries.enquiryNumber); break;
            case 'createdAt':     orderByClause = sortFn(leadEnquiries.createdAt); break;
            default:              orderByClause = desc(leadEnquiries.createdAt);
        }

        const hasSiteVisitExpr = sql<boolean>`EXISTS (SELECT 1 FROM site_visits sv WHERE sv.enquiry_id = ${leadEnquiries.id})`;

        const rows = await this.db
            .select({
                leadEnquiries,
                leadName: leads.name,
                itemName: items.name,
                orgName: organizations.name,
                createdByName: createdByUser.name,
                updatedByName: updatedByUser.name,
                hasSiteVisit: hasSiteVisitExpr,
            })
            .from(leadEnquiries)
            .leftJoin(leads, eq(leads.id, leadEnquiries.leadId))
            .leftJoin(items, eq(items.id, leadEnquiries.itemId))
            .leftJoin(organizations, eq(organizations.id, leadEnquiries.organisationId))
            .leftJoin(createdByUser, eq(createdByUser.id, leadEnquiries.createdBy))
            .leftJoin(updatedByUser, eq(updatedByUser.id, leadEnquiries.updatedBy))
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset);

        return {
            data: rows.map(row => ({
                ...row.leadEnquiries,
                leadName: row.leadName ?? null,
                itemName: row.itemName ?? null,
                orgName: row.orgName ?? null,
                createdByName: row.createdByName ?? null,
                updatedByName: row.updatedByName ?? null,
                hasSiteVisit: row.hasSiteVisit ?? false,
            })),
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    async findById(id: number): Promise<LeadEnquiryWithNames> {
        const hasSiteVisitExpr = sql<boolean>`EXISTS (SELECT 1 FROM site_visits sv WHERE sv.enquiry_id = ${leadEnquiries.id})`;

        const [row] = await this.db
            .select({
                leadEnquiries,
                leadName: leads.name,
                itemName: items.name,
                orgName: organizations.name,
                createdByName: createdByUser.name,
                updatedByName: updatedByUser.name,
                hasSiteVisit: hasSiteVisitExpr,
            })
            .from(leadEnquiries)
            .leftJoin(leads, eq(leads.id, leadEnquiries.leadId))
            .leftJoin(items, eq(items.id, leadEnquiries.itemId))
            .leftJoin(organizations, eq(organizations.id, leadEnquiries.organisationId))
            .leftJoin(createdByUser, eq(createdByUser.id, leadEnquiries.createdBy))
            .leftJoin(updatedByUser, eq(updatedByUser.id, leadEnquiries.updatedBy))
            .where(eq(leadEnquiries.id, id))
            .limit(1);

        if (!row) throw new NotFoundException(`Lead enquiry with ID ${id} not found`);

        return {
            ...row.leadEnquiries,
            leadName: row.leadName ?? null,
            itemName: row.itemName ?? null,
            orgName: row.orgName ?? null,
            createdByName: row.createdByName ?? null,
            updatedByName: row.updatedByName ?? null,
            hasSiteVisit: row.hasSiteVisit ?? false,
        };
    }

    private generateAcronym(name: string): string {
        return name
            .split(/\s+/)
            .map(w => w.charAt(0).toUpperCase())
            .join('');
    }

    async create(data: CreateLeadEnquiryDto, userId: number): Promise<LeadEnquiry> {
        const db = this.db;

        // 1. Resolve Organization
        let organisationId: number | null = null;
        if (data.organizationName) {
            const [existingOrg] = await db
                .select({ id: organizations.id })
                .from(organizations)
                .where(eq(organizations.name, data.organizationName))
                .limit(1);

            if (existingOrg) {
                organisationId = existingOrg.id;
            } else {
                const acronym = this.generateAcronym(data.organizationName);
                const [newOrg] = await db
                    .insert(organizations)
                    .values({
                        name: data.organizationName,
                        acronym,
                        industryId: null,
                        status: false,
                    })
                    .returning({ id: organizations.id });
                organisationId = newOrg.id;
            }
        }

        // 2. Resolve Location Code (id → acronym)
        let locationCode = data.locationCode;
        if (locationCode) {
            const locId = Number(locationCode);
            if (!isNaN(locId)) {
                const [location] = await db
                    .select({ acronym: locations.acronym })
                    .from(locations)
                    .where(eq(locations.id, locId))
                    .limit(1);

                if (location?.acronym) {
                    locationCode = location.acronym;
                }
            }
        }

        // 3. Generate Enquiry Number
        const now = new Date();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yy = String(now.getFullYear()).slice(-2);
        const mmyy = `${mm}${yy}`;
        const prefix = `ENQ-${mmyy}-`;

        const [lastEnquiry] = await db
            .select({ enquiryNumber: leadEnquiries.enquiryNumber })
            .from(leadEnquiries)
            .where(like(leadEnquiries.enquiryNumber, `${prefix}%`))
            .orderBy(desc(leadEnquiries.id))
            .limit(1);

        let seq = 1;
        if (lastEnquiry?.enquiryNumber) {
            const lastSeq = parseInt(lastEnquiry.enquiryNumber.slice(-3), 10);
            if (!isNaN(lastSeq)) seq = lastSeq + 1;
        }
        const enquiryNumber = `${prefix}${String(seq).padStart(3, '0')}`;

        // 4. Insert lead enquiry with resolved values
        const [newEnquiry] = await db
            .insert(leadEnquiries)
            .values({
                leadId: data.leadId ?? null,
                team: data.team ?? null,
                enqName: data.enqName,
                organisationId,
                itemId: data.itemId,
                locationCode,
                approxValue: data.approxValue,
                siteVisitRequired: data.siteVisitRequired ?? false,
                createdBy: userId,
                orgAbbName: data.orgAbbName ?? null,
                enquiryFile: data.enquiryFile ?? null,
                enquiryPhotos: data.enquiryPhotos ?? null,
                organizationName: data.organizationName ?? null,
                enquiryNumber,
                status: "New",
                notes: data.notes ?? null,
            })
            .returning();
        return newEnquiry;
    }

    async update(id: number, data: UpdateLeadEnquiryDto, userId: number): Promise<LeadEnquiry> {
        let locationCode = data.locationCode;
        if (locationCode) {
            const locId = Number(locationCode);
            if (!isNaN(locId)) {
                const [location] = await this.db
                    .select({ acronym: locations.acronym })
                    .from(locations)
                    .where(eq(locations.id, locId))
                    .limit(1);

                if (location?.acronym) {
                    locationCode = location.acronym;
                }
            }
        }

        const updateData = { ...data, locationCode, updatedBy: userId, updatedAt: new Date() };

        const [updated] = await this.db
            .update(leadEnquiries)
            .set(updateData)
            .where(eq(leadEnquiries.id, id))
            .returning();

        if (!updated) throw new NotFoundException(`Lead enquiry with ID ${id} not found`);
        return updated;
    }

    async delete(id: number): Promise<void> {
        const [deleted] = await this.db
            .delete(leadEnquiries)
            .where(eq(leadEnquiries.id, id))
            .returning({ id: leadEnquiries.id });

        if (!deleted) throw new NotFoundException(`Lead enquiry with ID ${id} not found`);
    }

    async createSiteVisit(data: CreateSiteVisitDto): Promise<SiteVisit> {
        const db = this.db;
        const [visit] = await db
            .insert(siteVisits)
            .values({
                enquiryId: data.enquiryId,
                assignedTo: data.assignedTo ?? null,
                scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
                information: data.information ?? null,
                additionalNotes: data.additionalNotes ?? null,
                documents: data.documents ?? null,
            })
            .returning();

        await db
            .update(leadEnquiries)
            .set({ status: "Site Visit Conducted", updatedAt: new Date() })
            .where(eq(leadEnquiries.id, data.enquiryId));

        return visit;
    }

    async findSiteVisitsByEnquiry(enquiryId: number): Promise<SiteVisit[]> {
        return this.db
            .select()
            .from(siteVisits)
            .where(eq(siteVisits.enquiryId, enquiryId))
            .orderBy(desc(siteVisits.createdAt));
    }

    async findFirstSiteVisitByEnquiry(enquiryId: number): Promise<SiteVisit | null> {
        const [visit] = await this.db
            .select()
            .from(siteVisits)
            .where(eq(siteVisits.enquiryId, enquiryId))
            .orderBy(desc(siteVisits.createdAt))
            .limit(1);
        return visit ?? null;
    }

    async updateSiteVisit(id: number, data: UpdateSiteVisitDto): Promise<SiteVisit> {
        const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
        if (data.scheduledAt) updateData.scheduledAt = new Date(data.scheduledAt);
        if (data.conductedAt) updateData.conductedAt = new Date(data.conductedAt);

        const [updated] = await this.db
            .update(siteVisits)
            .set(updateData)
            .where(eq(siteVisits.id, id))
            .returning();

        if (!updated) throw new NotFoundException(`Site visit with ID ${id} not found`);
        return updated;
    }

    async updateSiteVisitDetails(id: number, data: UpdateSiteVisitDetailsDto): Promise<SiteVisit> {
        const updateData: Record<string, unknown> = {
            ...data,
            status: 'completed',
            updatedAt: new Date(),
        };

        const [updated] = await this.db
            .update(siteVisits)
            .set(updateData)
            .where(eq(siteVisits.id, id))
            .returning();

        if (!updated) throw new NotFoundException(`Site visit with ID ${id} not found`);
        return updated;
    }

    async createSiteVisitContact(data: CreateSiteVisitContactDto): Promise<SiteVisitContact> {
        const [contact] = await this.db
            .insert(siteVisitContacts)
            .values({
                siteVisitId: data.siteVisitId,
                name: data.name,
                designation: data.designation ?? null,
                phone: data.phone ?? null,
                email: data.email ?? null,
            })
            .returning();
        return contact;
    }

    async findSiteVisitContacts(siteVisitId: number): Promise<SiteVisitContact[]> {
        return this.db
            .select()
            .from(siteVisitContacts)
            .where(eq(siteVisitContacts.siteVisitId, siteVisitId))
            .orderBy(asc(siteVisitContacts.id));
    }

    async checkDriveScopes(userId: number) {
        return this.googleDriveService.checkUserHasDriveScopes(userId);
    }

    async createCostingSheet(data: { enquiryId: number }, userId: number): Promise<{ sheetUrl: string }> {
        const enquiry = await this.findById(data.enquiryId);
        if (!enquiry) throw new NotFoundException(`Lead enquiry with ID ${data.enquiryId} not found`);

        const teamMapping: Record<string, number> = { AC: 1, DC: 2 };
        const teamId = teamMapping[enquiry.team || ''] || 1;
        const sheetName = enquiry.enqName || `Enquiry-${enquiry.id}`;

        const sheetResult = await this.googleDriveService.createSheet(userId, teamId, sheetName);

        await this.db
            .update(leadEnquiries)
            .set({ costingDocument: sheetResult.sheetUrl, status: "Costing Sheet Created", updatedAt: new Date() })
            .where(eq(leadEnquiries.id, data.enquiryId));

        return { sheetUrl: sheetResult.sheetUrl };
    }

    async submitCostingSheet(data: SubmitCostingSheetDto, userId: number): Promise<{ success: boolean }> {
        const enquiry = await this.findById(data.enquiryId);
        if (!enquiry) throw new NotFoundException(`Lead enquiry with ID ${data.enquiryId} not found`);

        const title = enquiry.enqName || `Enquiry-${enquiry.id}`;

        await this.db
            .insert(privateCostingSheets)
            .values({
                enquiryId: data.enquiryId,
                title,
                sheetUrl: enquiry.costingDocument,
                preparedBy: userId,
                status: 'Costing Sheet Submitted',
                finalPrice: data.finalPrice ?? null,
                receiptPreGst: data.receiptPreGst ?? null,
                budgetPreGst: data.budgetPreGst ?? null,
                grossMargin: data.grossMargin ?? null,
                remarks: data.remarks ?? null,
            });

        await this.db
            .update(leadEnquiries)
            .set({ status: 'Costing Sheet Submitted', updatedAt: new Date() })
            .where(eq(leadEnquiries.id, data.enquiryId));

        return { success: true };
    }
}
