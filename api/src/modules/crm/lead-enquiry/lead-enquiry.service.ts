import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { leadEnquiries, type NewLeadEnquiry, type LeadEnquiry } from '@db/schemas/crm/lead-enquiries.schema';
import { siteVisits, type SiteVisit, type NewSiteVisit } from '@db/schemas/crm/site-visits.schema';
import { siteVisitContacts, type SiteVisitContact } from '@db/schemas/crm/site-visit-contacts.schema';
import { leads, type NewLead } from '@db/schemas/crm/leads.schema';
import { leadContacts } from '@db/schemas/crm/lead-contacts.schema';
import { leadFollowups } from '@db/schemas/crm/lead-followups.schema';
import { tenderInfos, type TenderInfo } from '@db/schemas/tendering/tenders.schema';
import { tenderInformation } from '@db/schemas/tendering/tender-info-sheet.schema';
import { physicalDocs } from '@db/schemas/tendering/physical-docs.schema';
import { rfqs } from '@db/schemas/tendering/rfqs.schema';
import { paymentRequests } from '@db/schemas/tendering/payment-requests.schema';
import { tenderDocumentChecklists } from '@db/schemas/tendering/tender-document-checklists.schema';
import { tenderCostingSheets } from '@db/schemas/tendering/tender-costing-sheets.schema';
import { bidSubmissions } from '@db/schemas/tendering/bid-submissions.schema';
import { tenderQueries } from '@db/schemas/tendering/tender-queries.schema';
import { reverseAuctions } from '@db/schemas/tendering/reverse-auction.schema';
import { tenderResults } from '@db/schemas/tendering/tender-result.schema';
import { items } from '@db/schemas/master/items.schema';
import { organizations } from '@db/schemas/master/organizations.schema';
import { teams } from '@db/schemas/master/teams.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { users } from '@db/schemas/auth/users.schema';
import { TenderStatusHistoryService } from '@/modules/tendering/tender-status-history/tender-status-history.service';
import { and, asc, desc, eq, ilike, inArray, like, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { CreateLeadEnquiryDto, UpdateLeadEnquiryDto, CreateSiteVisitDto, UpdateSiteVisitDto, UpdateSiteVisitDetailsDto, CreateSiteVisitContactDto, CreateSiteVisitContactArrayDto, EnquiryContactDto, CreateEnquiryWithLeadDto } from './dto/lead-enquiry.dto';

export type LeadEnquiryListFilters = {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    team?: string;
    leadId?: number;
    happyCallingId?: number;
    enquiryType?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
};

export type LeadEnquiryWithNames = LeadEnquiry & {
    leadName?: string | null;
    itemName?: string | null;
    orgName?: string | null;
    createdByName?: string | null;
    updatedByName?: string | null;
    teamName?: string | null;
    teamMemberName?: string | null;
    hasSiteVisit?: boolean;
    tenderStatusId?: number | null;
    tenderStatusName?: string | null;
    tenderStage?: string | null;
    latestFollowupType?: string | null;
    nextFollowupDate?: string | null;
    lastFollowupAt?: string | null;
    contacts?: EnquiryContactDto[] | null;
};

const createdByUser = alias(users, 'created_by_user');
const updatedByUser = alias(users, 'updated_by_user');
const teamMemberUser = alias(users, 'team_member_user');

@Injectable()
export class LeadEnquiryService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderStatusHistoryService: TenderStatusHistoryService,
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

        if (filters?.team) {
            conditions.push(eq(teams.name, filters.team));
        }

        if (filters?.leadId) {
            conditions.push(eq(leadEnquiries.leadId, filters.leadId));
        }

        if (filters?.happyCallingId) {
            conditions.push(eq(leadEnquiries.happyCallingId, filters.happyCallingId));
        }

        if (filters?.enquiryType) {
            conditions.push(eq(leadEnquiries.enquiryType, filters.enquiryType));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const [countResult] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(leadEnquiries)
            .leftJoin(teams, eq(teams.id, sql`NULLIF(${leadEnquiries.team}, '')::BIGINT`))
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
                teamMemberName: teamMemberUser.name,
                hasSiteVisit: hasSiteVisitExpr,
                tenderStatusId: statuses.id,
                tenderStatusName: statuses.name,
                latestFollowupType: sql<string | null>`(
                    SELECT lf.type FROM ${leadFollowups} lf
                    WHERE lf.enquiry_id = ${leadEnquiries.id}
                    ORDER BY lf.created_at DESC, lf.id DESC LIMIT 1
                )`,
                nextFollowupDate: sql<string | null>`(
                    SELECT lf.next_followup_date FROM ${leadFollowups} lf
                    WHERE lf.enquiry_id = ${leadEnquiries.id} AND lf.next_followup_date IS NOT NULL
                    ORDER BY lf.created_at DESC, lf.id DESC LIMIT 1
                )`,
                lastFollowupAt: sql<string | null>`(
                    SELECT lf.created_at FROM ${leadFollowups} lf
                    WHERE lf.enquiry_id = ${leadEnquiries.id}
                    ORDER BY lf.created_at DESC, lf.id DESC LIMIT 1
                )`,
            })
            .from(leadEnquiries)
            .leftJoin(teams, eq(teams.id, sql`NULLIF(${leadEnquiries.team}, '')::BIGINT`))
            .leftJoin(leads, eq(leads.id, leadEnquiries.leadId))
            .leftJoin(items, eq(items.id, leadEnquiries.itemId))
            .leftJoin(organizations, eq(organizations.id, leadEnquiries.organisationId))
            .leftJoin(createdByUser, eq(createdByUser.id, leadEnquiries.createdBy))
            .leftJoin(updatedByUser, eq(updatedByUser.id, leadEnquiries.updatedBy))
            .leftJoin(tenderInfos, eq(tenderInfos.id, leadEnquiries.tenderId))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(teamMemberUser, eq(teamMemberUser.id, tenderInfos.teamMember))
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset);

        const tenderIds = rows
            .map((row) => row.leadEnquiries.tenderId)
            .filter((id): id is number => id != null);
        const tenderStages = await this.computeTenderStages(tenderIds);

        return {
            data: rows.map(row => ({
                ...row.leadEnquiries,
                leadName: row.leadName ?? null,
                itemName: row.itemName ?? null,
                orgName: row.orgName ?? null,
                createdByName: row.createdByName ?? null,
                updatedByName: row.updatedByName ?? null,
                teamMemberName: row.teamMemberName ?? null,
hasSiteVisit: row.hasSiteVisit ?? false,
                tenderStatusId: row.tenderStatusId ?? null,
                tenderStatusName: row.tenderStatusName ?? null,
                latestFollowupType: row.latestFollowupType ?? null,
                nextFollowupDate: row.nextFollowupDate ?? null,
                lastFollowupAt: row.lastFollowupAt ?? null,
                tenderStage: row.leadEnquiries.tenderId != null
                    ? (tenderStages.get(row.leadEnquiries.tenderId) ?? null)
                    : null,
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
                teamName: teams.name,
                createdByName: createdByUser.name,
                updatedByName: updatedByUser.name,
                teamMemberName: teamMemberUser.name,
                hasSiteVisit: hasSiteVisitExpr,
                tenderStatusId: statuses.id,
                tenderStatusName: statuses.name,
                latestFollowupType: sql<string | null>`(
                    SELECT lf.type FROM ${leadFollowups} lf
                    WHERE lf.enquiry_id = ${leadEnquiries.id}
                    ORDER BY lf.created_at DESC, lf.id DESC LIMIT 1
                )`,
                nextFollowupDate: sql<string | null>`(
                    SELECT lf.next_followup_date FROM ${leadFollowups} lf
                    WHERE lf.enquiry_id = ${leadEnquiries.id} AND lf.next_followup_date IS NOT NULL
                    ORDER BY lf.created_at DESC, lf.id DESC LIMIT 1
                )`,
                lastFollowupAt: sql<string | null>`(
                    SELECT lf.created_at FROM ${leadFollowups} lf
                    WHERE lf.enquiry_id = ${leadEnquiries.id}
                    ORDER BY lf.created_at DESC, lf.id DESC LIMIT 1
                )`,
            })
            .from(leadEnquiries)
            .leftJoin(teams, eq(teams.id, sql`NULLIF(${leadEnquiries.team}, '')::BIGINT`))
            .leftJoin(leads, eq(leads.id, leadEnquiries.leadId))
            .leftJoin(items, eq(items.id, leadEnquiries.itemId))
            .leftJoin(organizations, eq(organizations.id, leadEnquiries.organisationId))
            .leftJoin(createdByUser, eq(createdByUser.id, leadEnquiries.createdBy))
            .leftJoin(updatedByUser, eq(updatedByUser.id, leadEnquiries.updatedBy))
            .leftJoin(tenderInfos, eq(tenderInfos.id, leadEnquiries.tenderId))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(teamMemberUser, eq(teamMemberUser.id, tenderInfos.teamMember))
            .where(eq(leadEnquiries.id, id))
            .limit(1);

        if (!row) throw new NotFoundException(`Lead enquiry with ID ${id} not found`);

        const contacts = await this.db
            .select({
                name: leadContacts.name,
                designation: leadContacts.designation,
                phone: leadContacts.phone,
                email: leadContacts.email,
            })
            .from(leadContacts)
            .where(eq(leadContacts.enquiryId, id))
            .orderBy(asc(leadContacts.id));

        const tenderIds = row.leadEnquiries.tenderId != null ? [row.leadEnquiries.tenderId] : [];
        const tenderStages = await this.computeTenderStages(tenderIds);

        return {
            ...row.leadEnquiries,
            leadName: row.leadName ?? null,
            itemName: row.itemName ?? null,
            orgName: row.orgName ?? null,
            teamName: row.teamName ?? null,
            createdByName: row.createdByName ?? null,
            updatedByName: row.updatedByName ?? null,
            teamMemberName: row.teamMemberName ?? null,
            hasSiteVisit: row.hasSiteVisit ?? false,
            tenderStatusId: row.tenderStatusId ?? null,
            tenderStatusName: row.tenderStatusName ?? null,
            latestFollowupType: row.latestFollowupType ?? null,
            nextFollowupDate: row.nextFollowupDate ?? null,
            lastFollowupAt: row.lastFollowupAt ?? null,
            tenderStage: row.leadEnquiries.tenderId != null
                ? (tenderStages.get(row.leadEnquiries.tenderId) ?? null)
                : null,
            contacts,
        };
    }

    private generateAcronym(name: string): string {
        return name
            .split(/\s+/)
            .map(w => w.charAt(0).toUpperCase())
            .join('');
    }

    private async resolveOrganizationId(db: DbInstance, organizationName?: string | null): Promise<number | null> {
        if (!organizationName) return null;

        const [existingOrg] = await db
            .select({ id: organizations.id })
            .from(organizations)
            .where(eq(organizations.name, organizationName))
            .limit(1);

        if (existingOrg) return existingOrg.id;

        const acronym = this.generateAcronym(organizationName);
        const [newOrg] = await db
            .insert(organizations)
            .values({
                name: organizationName,
                acronym,
                industryId: null,
                status: false,
            })
            .returning({ id: organizations.id });

        return newOrg.id;
    }

    private async generateEnquiryNumber(db: DbInstance): Promise<string> {
        const now = new Date();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yy = String(now.getFullYear()).slice(-2);
        const mmyy = `${mm}${yy}`;
        const prefix = `EN/${mmyy}/`;

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
        return `${prefix}${String(seq).padStart(3, '0')}`;
    }

    private async createLinkedTender(
        db: DbInstance,
        params: {
            team?: string | null;
            enqName: string;
            organisationId?: number | null;
            itemId: number;
            enquiryNumber: string;
            dueDate?: string | null;
            locationCode?: string | null;
            documents?: string | null;
            approxValue?: string | null;
            userId: number;
        },
    ): Promise<TenderInfo> {
        const dueDate = params.dueDate
            ? new Date(params.dueDate)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const [tender] = await db
            .insert(tenderInfos)
            .values({
                team: Number(params.team) || 1,
                tenderNo: params.enquiryNumber,
                tenderName: params.enqName,
                organization: params.organisationId ?? null,
                item: params.itemId,
                location: params.locationCode ? Number(params.locationCode) : null,
                gstValues: params.approxValue ?? "0",
                dueDate,
                documents: params.documents ?? null,
                teamMember: null,
                status: 0,
            })
            .returning();

        return tender;
    }

    private async linkEnquiryToTender(
        db: DbInstance,
        enquiryId: number,
        tenderId: number,
        userId: number,
    ): Promise<void> {
        await db
            .update(leadEnquiries)
            .set({ tenderId })
            .where(eq(leadEnquiries.id, enquiryId));

        await this.tenderStatusHistoryService.trackStatusChange(
            tenderId, 0, userId, null, 'Tender created from enquiry', db,
        );
    }

    private async computeTenderStages(tenderIds: number[]): Promise<Map<number, string | null>> {
        const stageMap = new Map<number, string | null>();
        if (tenderIds.length === 0) return stageMap;

        const uniqueIds = [...new Set(tenderIds)];
        const stageTable = [
            { table: tenderInformation, label: 'Info Sheet' },
            { table: physicalDocs, label: 'Physical Docs' },
            { table: rfqs, label: 'RFQ' },
            { table: paymentRequests, label: 'EMD / Fees' },
            { table: tenderDocumentChecklists, label: 'Checklist' },
            { table: tenderCostingSheets, label: 'Costing' },
            { table: bidSubmissions, label: 'Bid' },
            { table: tenderQueries, label: 'TQ' },
            { table: reverseAuctions, label: 'RA' },
            { table: tenderResults, label: 'Result' },
        ] as const;

        const present = new Map<number, Set<string>>();
        for (const id of uniqueIds) present.set(id, new Set());

        for (const { table, label } of stageTable) {
            const rows = await this.db
                .select({ tenderId: (table as any).tenderId })
                .from(table as any)
                .where(inArray((table as any).tenderId, uniqueIds));

            for (const row of rows) {
                present.get(row.tenderId)?.add(label);
            }
        }

        const orderedStages = stageTable.map((s) => s.label);
        for (const [id, labels] of present) {
            let current: string | null = null;
            for (const label of orderedStages) {
                if (labels.has(label)) current = label;
            }
            stageMap.set(id, current);
        }

        return stageMap;
    }

    async create(data: CreateLeadEnquiryDto, userId: number): Promise<LeadEnquiry> {
        const db = this.db;

        // 1. Resolve Organization
        const organisationId = await this.resolveOrganizationId(db, data.organizationName);

        // 2. Location Code stored directly as the location id
        const locationCode = data.locationCode;

        // 3. Generate Enquiry Number
        const enquiryNumber = await this.generateEnquiryNumber(db);

        // 4. Insert lead enquiry with resolved values
        const [newEnquiry] = await db
            .insert(leadEnquiries)
            .values({
                leadId: data.leadId ?? null,
                happyCallingId: data.happyCallingId ?? null,
                team: data.team ?? null,
                enqName: data.enqName,
                organisationId,
                itemId: data.itemId,
                locationCode,
                approxValue: data.approxValue,
                dueDate: data.dueDate ? new Date(data.dueDate) : null,
                siteVisitRequired: data.siteVisitRequired ?? false,
                createdBy: userId,
                orgAbbName: data.orgAbbName ?? null,
                enquiryFile: data.enquiryFile ?? null,
                enquiryPhotos: data.enquiryPhotos ?? null,
                organizationName: data.organizationName ?? null,
                enquiryNumber,
                status: "New",
                enquiryType: data.enquiryType ?? null,
                notes: data.notes ?? null,
            })
            .returning();

        // 5. Insert enquiry contacts
        if (data.contacts && data.contacts.length > 0) {
            await db
                .insert(leadContacts)
                .values(
                    data.contacts.map((c) => ({
                        enquiryId: newEnquiry.id,
                        leadId: data.leadId ?? null,
                        source: 'enquiry' as const,
                        name: c.name,
                        designation: c.designation ?? null,
                        phone: c.phone ?? null,
                        email: c.email ?? null,
                    })),
                );
        }

        // 6. Create linked tender so the enquiry flows through the tender workflow
        const tender = await this.createLinkedTender(db, {
            team: data.team ?? null,
            enqName: data.enqName,
            organisationId,
            itemId: data.itemId,
            enquiryNumber,
            dueDate: data.dueDate ?? null,
            locationCode: data.locationCode ?? null,
            documents: data.enquiryFile ?? null,
            approxValue: data.approxValue ?? null,
            userId,
        });

        await this.linkEnquiryToTender(db, newEnquiry.id, tender.id, userId);

        return newEnquiry;
    }

    async createWithLead(data: CreateEnquiryWithLeadDto, userId: number): Promise<{ lead: typeof leads.$inferSelect; enquiry: LeadEnquiry }> {
        const result = await this.db.transaction(async (tx) => {
            const primaryContact = data.contacts[0] ?? null;

            // 1. Create the lead row (companyName from the enquiry organisation)
            const [lead] = await tx
                .insert(leads)
                .values({
                    companyName: data.organizationName,
                    name: primaryContact?.name ?? null,
                    designation: primaryContact?.designation ?? null,
                    phone: primaryContact?.phone ?? null,
                    email: primaryContact?.email ?? null,
                    address: data.address ?? null,
                    country: data.country ?? null,
                    state: data.state ?? null,
                    team: data.team ?? null,
                    bdPerson: userId,
                    leadPriority: 'Cold',
                    enquiryReceivedAt: new Date(),
                } as NewLead)
                .returning();

            // 2. Resolve Organization
            const organisationId = await this.resolveOrganizationId(tx, data.organizationName);

            // 3. Location Code stored directly as the location id
            const locationCode = data.locationCode;

            // 4. Generate Enquiry Number
            const enquiryNumber = await this.generateEnquiryNumber(tx);

            // 5. Insert lead enquiry linked to the new lead
            const [enquiry] = await tx
                .insert(leadEnquiries)
                .values({
                    leadId: lead.id,
                    team: data.team ?? null,
                    enqName: data.enqName,
                    organisationId,
                    itemId: data.itemId,
                    locationCode,
                    approxValue: data.approxValue,
                    dueDate: data.dueDate ? new Date(data.dueDate) : null,
                    siteVisitRequired: data.siteVisitRequired ?? false,
                    createdBy: userId,
                    orgAbbName: data.orgAbbName ?? null,
                    enquiryFile: data.enquiryFile ?? null,
                    enquiryPhotos: data.enquiryPhotos ?? null,
                    organizationName: data.organizationName ?? null,
                    enquiryNumber,
                    status: "New",
                    enquiryType: data.enquiryType ?? null,
                    notes: data.notes ?? null,
                })
                .returning();

            // 6. Insert additional enquiry contacts (first contact populates the lead)
            const extraContacts = data.contacts.slice(1);
            if (extraContacts.length > 0) {
                await tx
                    .insert(leadContacts)
                    .values(
                        extraContacts.map((c) => ({
                            enquiryId: enquiry.id,
                            leadId: lead.id,
                            source: 'enquiry' as const,
                            name: c.name,
                            designation: c.designation ?? null,
                            phone: c.phone ?? null,
                            email: c.email ?? null,
                        })),
                    );
            }

            // 7. Create linked tender so the enquiry flows through the tender workflow
            const tender = await this.createLinkedTender(tx, {
                team: data.team ?? null,
                enqName: data.enqName,
                organisationId,
                itemId: data.itemId,
                enquiryNumber,
                dueDate: data.dueDate ?? null,
                locationCode: data.locationCode ?? null,
                documents: data.enquiryFile ?? null,
                approxValue: data.approxValue ?? null,
                userId,
            });

            await this.linkEnquiryToTender(tx, enquiry.id, tender.id, userId);

            return { lead, enquiry, tenderId: tender.id };
        });

        return { lead: result.lead, enquiry: result.enquiry };
    }

    async update(id: number, data: UpdateLeadEnquiryDto, userId: number): Promise<LeadEnquiry> {
        const locationCode = data.locationCode;

        const { contacts, dueDate, enquiryFile, approxValue, ...restData } = data;

        // Re-resolve organisation id when the organisation name is provided so it stays in sync
        let resolvedOrganisationId: number | null | undefined = data.organisationId ?? undefined;
        if (data.organizationName != null) {
            resolvedOrganisationId = await this.resolveOrganizationId(this.db, data.organizationName);
        }

        const updateData = {
            ...restData,
            organisationId: resolvedOrganisationId,
            locationCode,
            dueDate: dueDate ? new Date(dueDate) : undefined,
            enquiryFile: enquiryFile !== undefined ? enquiryFile : undefined,
            updatedBy: userId,
            updatedAt: new Date(),
        };

        const [updated] = await this.db
            .update(leadEnquiries)
            .set(updateData)
            .where(eq(leadEnquiries.id, id))
            .returning();

        if (!updated) throw new NotFoundException(`Lead enquiry with ID ${id} not found`);

        // Keep the linked tender's connected fields in sync
        if (updated.tenderId) {
            const tenderSync: {
                dueDate?: Date;
                location?: number | null;
                documents?: string | null;
                gstValues?: string;
                tenderName?: string;
                tenderNo?: string;
                organization?: number | null;
                item?: number;
                updatedAt: Date;
            } = { updatedAt: new Date() };

            if (dueDate) tenderSync.dueDate = new Date(dueDate);
            if (locationCode) tenderSync.location = Number(locationCode);
            if (enquiryFile !== undefined) tenderSync.documents = enquiryFile;
            if (approxValue !== undefined) tenderSync.gstValues = approxValue;
            if (data.enqName) tenderSync.tenderName = data.enqName;
            if (data.enquiryNumber) tenderSync.tenderNo = data.enquiryNumber;
            if (resolvedOrganisationId != null) tenderSync.organization = resolvedOrganisationId;
            if (data.itemId != null) tenderSync.item = data.itemId;

            if (Object.keys(tenderSync).length > 1) {
                await this.db
                    .update(tenderInfos)
                    .set(tenderSync)
                    .where(eq(tenderInfos.id, updated.tenderId));
            }
        }

        // Replace enquiry contacts when provided
        if (contacts) {
            await this.db
                .delete(leadContacts)
                .where(eq(leadContacts.enquiryId, id));

            if (contacts.length > 0) {
                await this.db
                    .insert(leadContacts)
                    .values(
                        contacts.map((c) => ({
                            enquiryId: id,
                            leadId: updated.leadId ?? null,
                            source: 'enquiry' as const,
                            name: c.name,
                            designation: c.designation ?? null,
                            phone: c.phone ?? null,
                            email: c.email ?? null,
                        })),
                    );
            }
        }

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
                information: null,
                additionalNotes: data.information ?? null,
                documents: data.documents ?? null,
            })
            .returning();

        await db
            .update(leadEnquiries)
            .set({ status: "Site Visit Conducted", updatedAt: new Date() })
            .where(eq(leadEnquiries.id, data.enquiryId));

        return visit;
    }

    async findSiteVisitsByEnquiry(enquiryId: number): Promise<(SiteVisit & { assignedToName: string | null })[]> {
        return this.db
            .select({
                id: siteVisits.id,
                enquiryId: siteVisits.enquiryId,
                assignedTo: siteVisits.assignedTo,
                assignedToName: users.name,
                scheduledAt: siteVisits.scheduledAt,
                conductedAt: siteVisits.conductedAt,
                information: siteVisits.information,
                additionalNotes: siteVisits.additionalNotes,
                documents: siteVisits.documents,
                status: siteVisits.status,
                createdAt: siteVisits.createdAt,
                updatedAt: siteVisits.updatedAt,
            })
            .from(siteVisits)
            .leftJoin(users, eq(users.id, siteVisits.assignedTo))
            .where(eq(siteVisits.enquiryId, enquiryId))
            .orderBy(desc(siteVisits.createdAt));
    }

    async findFirstSiteVisitByEnquiry(enquiryId: number): Promise<(SiteVisit & { assignedToName: string | null }) | null> {
        const [visit] = await this.db
            .select({
                id: siteVisits.id,
                enquiryId: siteVisits.enquiryId,
                assignedTo: siteVisits.assignedTo,
                assignedToName: users.name,
                scheduledAt: siteVisits.scheduledAt,
                conductedAt: siteVisits.conductedAt,
                information: siteVisits.information,
                additionalNotes: siteVisits.additionalNotes,
                documents: siteVisits.documents,
                status: siteVisits.status,
                createdAt: siteVisits.createdAt,
                updatedAt: siteVisits.updatedAt,
            })
            .from(siteVisits)
            .leftJoin(users, eq(users.id, siteVisits.assignedTo))
            .where(eq(siteVisits.enquiryId, enquiryId))
            .orderBy(desc(siteVisits.createdAt))
            .limit(1);
        return visit ?? null;
    }

    async findSiteVisitsByLead(leadId: number): Promise<(SiteVisit & { enqName: string | null; enquiryNumber: string | null; assignedToName: string | null })[]> {
        return this.db
            .select({
                id: siteVisits.id,
                enquiryId: siteVisits.enquiryId,
                assignedTo: siteVisits.assignedTo,
                assignedToName: users.name,
                scheduledAt: siteVisits.scheduledAt,
                conductedAt: siteVisits.conductedAt,
                information: siteVisits.information,
                additionalNotes: siteVisits.additionalNotes,
                documents: siteVisits.documents,
                status: siteVisits.status,
                createdAt: siteVisits.createdAt,
                updatedAt: siteVisits.updatedAt,
                enqName: leadEnquiries.enqName,
                enquiryNumber: leadEnquiries.enquiryNumber,
            })
            .from(siteVisits)
            .innerJoin(leadEnquiries, eq(leadEnquiries.id, siteVisits.enquiryId))
            .leftJoin(users, eq(users.id, siteVisits.assignedTo))
            .where(eq(leadEnquiries.leadId, leadId))
            .orderBy(desc(siteVisits.createdAt));
    }

    async findSiteVisitsByHappyCalling(happyCallingId: number): Promise<(SiteVisit & { enqName: string | null; enquiryNumber: string | null; assignedToName: string | null })[]> {
        return this.db
            .select({
                id: siteVisits.id,
                enquiryId: siteVisits.enquiryId,
                assignedTo: siteVisits.assignedTo,
                assignedToName: users.name,
                scheduledAt: siteVisits.scheduledAt,
                conductedAt: siteVisits.conductedAt,
                information: siteVisits.information,
                additionalNotes: siteVisits.additionalNotes,
                documents: siteVisits.documents,
                status: siteVisits.status,
                createdAt: siteVisits.createdAt,
                updatedAt: siteVisits.updatedAt,
                enqName: leadEnquiries.enqName,
                enquiryNumber: leadEnquiries.enquiryNumber,
            })
            .from(siteVisits)
            .innerJoin(leadEnquiries, eq(leadEnquiries.id, siteVisits.enquiryId))
            .leftJoin(users, eq(users.id, siteVisits.assignedTo))
            .where(eq(leadEnquiries.happyCallingId, happyCallingId))
            .orderBy(desc(siteVisits.createdAt));
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
        if (data.conductedAt) updateData.conductedAt = new Date(data.conductedAt);

        const [updated] = await this.db
            .update(siteVisits)
            .set(updateData)
            .where(eq(siteVisits.id, id))
            .returning();

        if (!updated) throw new NotFoundException(`Site visit with ID ${id} not found`);
        return updated;
    }

    async appendSiteVisitDocs(siteVisitId: number, newFilenames: string[]): Promise<void> {
        const [existing] = await this.db
            .select({ documents: siteVisits.documents })
            .from(siteVisits)
            .where(eq(siteVisits.id, siteVisitId))
            .limit(1);

        if (!existing) throw new NotFoundException(`Site visit with ID ${siteVisitId} not found`);

        const existingDocs = existing.documents ? existing.documents.split(',').filter(Boolean) : [];
        const allDocs = [...existingDocs, ...newFilenames];

        await this.db
            .update(siteVisits)
            .set({ documents: allDocs.join(','), updatedAt: new Date() })
            .where(eq(siteVisits.id, siteVisitId));
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
}
