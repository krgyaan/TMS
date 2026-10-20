import { Inject, Injectable, NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";
import { eq, asc, desc, and, ne, sql, getTableColumns, isNotNull, count, type SQL } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { DRIZZLE } from "@db/database.module";
import type { DbInstance } from "@db";
import { ClientDirectorySyncService } from "@/modules/shared/client-directory/client-directory-sync.service";
import { wrapPaginatedResponse } from "@/utils/responseWrapper";
import { vendorOrganizations, type VendorOrganization, type NewVendorOrganization } from "@db/schemas/vendors/vendor-organizations.schema";
import { vendors, type Vendor, type NewVendor } from "@db/schemas/vendors/vendors.schema";
import { vendorGsts, type VendorGst, type NewVendorGst } from "@db/schemas/vendors/vendor-gsts.schema";
import { vendorAccs, type VendorAcc, type NewVendorAcc } from "@db/schemas/vendors/vendor-banks.schema";
import { vendorFiles, type VendorFile, type NewVendorFile } from "@db/schemas/vendors/vendor-files.schema";
import { tenderInfos } from "@db/schemas/tendering/tenders.schema";
import { rfqs, rfqResponses } from "@db/schemas/tendering/rfqs.schema";
import { tenderCostingSheets } from "@db/schemas/tendering/tender-costing-sheets.schema";
import { purchaseOrders } from "@db/schemas/operations/purchase-orders.schema";
import { vendorWorkOrders } from "@db/schemas/operations/vendor-work-orders.schema";
import { projects } from "@db/schemas/master/projects.schema";
import type { BaseFilters } from "@/modules/tendering/types/shared.types";
import { normalizeVendorName } from "./vendor-name.util";
import { repointCsvIdList, repointIdArray, csvIdListContains, idArrayContains, looseIdListContains, repointLooseIdList, NO_CSV_SENTINELS } from "./vendor-merge.util";

export type VendorOrganizationListFilters = BaseFilters & { search?: string };

export type VendorMergeChildCounts = { persons: number; gsts: number; accounts: number; files: number };

export type VendorMergeOrgSummary = VendorOrganization & { _counts: VendorMergeChildCounts };

export type VendorMergeRefGroup = { count: number; ids: number[] };

export type VendorMergePreview = {
    keep: VendorMergeOrgSummary;
    drop: VendorMergeOrgSummary;
    references: {
        purchaseOrders: VendorMergeRefGroup;
        vendorWorkOrders: VendorMergeRefGroup;
        rfqResponses: VendorMergeRefGroup;
        projects: VendorMergeRefGroup;
        tendersRfqTo: VendorMergeRefGroup;
        tendersOemNotAllowed: VendorMergeRefGroup;
        rfqsRequestedOrganization: VendorMergeRefGroup;
        costingSheetsOemVendorIds: VendorMergeRefGroup;
        partiesArchiveResolved: VendorMergeRefGroup;
        partiesArchiveVendorOrg: VendorMergeRefGroup;
    };
};

export type VendorMergeResult = {
    keptId: number;
    dropId: number;
    movedRefs: Record<string, number[]>;
    filled: Record<string, string>;
};

// Email is optional on vendors; an explicit blank must not be stored as "" and an
// omitted field must not be rewritten (so PATCH leaves the column untouched).
const normalizeEmail = (email: string | null | undefined): string | null | undefined => {
    if (email === undefined) return undefined;
    return email?.trim() || null;
};

@Injectable()
export class VendorMasterService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly clientDirectorySyncService: ClientDirectorySyncService
    ) {}

    private async assertUniqueGstNo(orgId: number, gstNo: string | null | undefined, excludeId?: number): Promise<void> {
        const trimmed = gstNo?.trim();
        if (!trimmed) return;

        const normalized = trimmed.toLowerCase();
        const conds = [eq(vendorGsts.orgId, orgId), sql`lower(trim(${vendorGsts.gstNo})) = ${normalized}`];
        if (excludeId !== undefined) {
            conds.push(ne(vendorGsts.id, excludeId));
        }

        const rows = await this.db
            .select({ id: vendorGsts.id })
            .from(vendorGsts)
            .where(and(...conds))
            .limit(1);
        if (rows[0]) {
            throw new ConflictException(`GST number "${trimmed}" already exists for this organization`);
        }
    }

    private async assertUniqueAccountNum(orgId: number, accountNum: string, excludeId?: number): Promise<void> {
        const trimmed = accountNum.trim();
        if (!trimmed) return;

        const normalized = trimmed.toLowerCase();
        const conds = [eq(vendorAccs.orgId, orgId), sql`lower(trim(${vendorAccs.accountNum})) = ${normalized}`];
        if (excludeId !== undefined) {
            conds.push(ne(vendorAccs.id, excludeId));
        }

        const rows = await this.db
            .select({ id: vendorAccs.id })
            .from(vendorAccs)
            .where(and(...conds))
            .limit(1);
        if (rows[0]) {
            throw new ConflictException(`Account number "${trimmed}" already exists for this organization`);
        }
    }

    private async assertUniquePersonContact(orgId: number, data: { mobile?: string | null; email?: string | null }, excludeId?: number): Promise<void> {
        const mobile = data.mobile?.trim();
        if (mobile) {
            const conds = [eq(vendors.orgId, orgId), sql`trim(${vendors.mobile}) = ${mobile}`];
            if (excludeId !== undefined) {
                conds.push(ne(vendors.id, excludeId));
            }

            const rows = await this.db
                .select({ id: vendors.id })
                .from(vendors)
                .where(and(...conds))
                .limit(1);
            if (rows[0]) {
                throw new ConflictException(`Mobile number "${mobile}" already exists for this organization`);
            }
        }

        const emailTrimmed = data.email?.trim();
        if (emailTrimmed) {
            const normalized = emailTrimmed.toLowerCase();
            const conds = [eq(vendors.orgId, orgId), sql`lower(trim(${vendors.email})) = ${normalized}`];
            if (excludeId !== undefined) {
                conds.push(ne(vendors.id, excludeId));
            }

            const rows = await this.db
                .select({ id: vendors.id })
                .from(vendors)
                .where(and(...conds))
                .limit(1);
            if (rows[0]) {
                throw new ConflictException(`Email "${emailTrimmed}" already exists for this organization`);
            }
        }
    }

    private assertArrayUnique<T>(items: T[] | undefined, key: (item: T) => string | null | undefined, label: string): void {
        if (!items) return;

        const seen = new Set<string>();
        for (const item of items) {
            const trimmed = key(item)?.trim();
            if (!trimmed) continue;

            const normalized = trimmed.toLowerCase();
            if (seen.has(normalized)) {
                throw new ConflictException(`Duplicate ${label} "${trimmed}" in the request`);
            }
            seen.add(normalized);
        }
    }

    /**
     * Get all vendor organizations (flat list)
     */
    async findAllOrganizations(): Promise<VendorOrganization[]> {
        const res = await this.db.select().from(vendorOrganizations).orderBy(asc(vendorOrganizations.name));
        return res;
    }

    /**
     * Get single vendor organization
     */
    async findOrganizationById(id: number): Promise<VendorOrganization> {
        const result = await this.db.select().from(vendorOrganizations).where(eq(vendorOrganizations.id, id)).limit(1);

        if (!result[0]) {
            throw new NotFoundException(`Vendor Organization with ID ${id} not found`);
        }

        return result[0];
    }

    /**
     * Get vendor organization with ALL related data
     * (vendors, GSTs, accounts, files from all persons)
     */
    async findOrganizationByIdWithRelations(id: number) {
        // Get organization
        const organization = await this.findOrganizationById(id);

        // Get all vendors (persons) in this organization
        const persons = await this.db.select().from(vendors).where(eq(vendors.orgId, id));

        // Get all GST numbers for this organization
        const gsts = await this.db.select().from(vendorGsts).where(eq(vendorGsts.orgId, id));

        // Get all bank accounts for this organization
        const accounts = await this.db.select().from(vendorAccs).where(eq(vendorAccs.orgId, id));

        // Get all files for this organization
        const files = await this.db.select().from(vendorFiles).where(eq(vendorFiles.orgId, id));

        return {
            ...organization,
            persons,
            gsts,
            accounts,
            files,
        };
    }

    /**
     * Get vendor organization with ALL related data including files
     */
    async findOrganizationByIdWithAllRelations(id: number) {
        return this.findOrganizationByIdWithRelations(id);
    }

    /**
     * Get ALL organizations with their related data
     * (for the expandable list view)
     */
    async findAllOrganizationsWithRelations() {
        const orgs = await this.findAllOrganizations();

        // Fetch related data for all organizations
        const orgsWithRelations = await Promise.all(
            orgs.map(async org => {
                const persons = await this.db.select().from(vendors).where(eq(vendors.orgId, org.id));

                const gsts = await this.db.select().from(vendorGsts).where(eq(vendorGsts.orgId, org.id));

                const accounts = await this.db.select().from(vendorAccs).where(eq(vendorAccs.orgId, org.id));

                const files = await this.db.select().from(vendorFiles).where(eq(vendorFiles.orgId, org.id));

                return {
                    ...org,
                    persons,
                    gsts,
                    accounts,
                    files,
                    _counts: {
                        persons: persons.length,
                        gsts: gsts.length,
                        accounts: accounts.length,
                        files: files.length,
                    },
                };
            })
        );

        return orgsWithRelations;
    }

    /**
     * Paginated organization list for the vendor master grid.
     *
     * Two queries total (total count + page rows), replacing the N+1 pattern of
     * findAllOrganizationsWithRelations(). Relation counts come from correlated
     * subqueries so the four count columns can be both selected and sorted by.
     */
    async findAllOrganizationsPaginated(filters?: VendorOrganizationListFilters) {
        const page = Math.max(1, filters?.page ?? 1);
        const limit = Math.max(1, Math.min(filters?.limit ?? 50, 100));
        const offset = (page - 1) * limit;

        // Correlated count subqueries — reused by the SELECT list and the sort whitelist.
        //
        // The outer id must be written explicitly: drizzle renders `${column}` inside a
        // raw sql template as a bare name when the template sits in the SELECT list, and
        // an unqualified "id" inside these subqueries resolves to the INNER table's id,
        // silently turning the count into a non-correlated one.
        const outerOrgId = sql.raw(`"${getTableConfig(vendorOrganizations).name}"."id"`);
        const personCountSql = sql<number>`(select count(*)::int from ${vendors} where ${vendors.orgId} = ${outerOrgId})`.as("persons_count");
        const gstCountSql = sql<number>`(select count(*)::int from ${vendorGsts} where ${vendorGsts.orgId} = ${outerOrgId})`.as("gsts_count");
        const accountCountSql = sql<number>`(select count(*)::int from ${vendorAccs} where ${vendorAccs.orgId} = ${outerOrgId})`.as("accounts_count");
        const fileCountSql = sql<number>`(select count(*)::int from ${vendorFiles} where ${vendorFiles.orgId} = ${outerOrgId})`.as("files_count");

        // Search mirrors the former client-side filter exactly, including the
        // "Manufacturer"/"Service" labels derived from msmeType.
        const conditions: SQL<unknown>[] = [];
        const search = filters?.search?.trim();
        if (search) {
            const q = `%${search}%`;
            conditions.push(sql`(
                ${vendorOrganizations.name} ILIKE ${q} OR
                ${vendorOrganizations.alias} ILIKE ${q} OR
                ${vendorOrganizations.pan} ILIKE ${q} OR
                ${vendorOrganizations.msme} ILIKE ${q} OR
                ${vendorOrganizations.address} ILIKE ${q} OR
                case ${vendorOrganizations.msmeType}
                    when 'M' then 'Manufacturer'
                    when 'S' then 'Service'
                    else ${vendorOrganizations.msmeType}
                end ILIKE ${q} OR
                exists (
                    select 1 from ${vendorGsts}
                    where ${vendorGsts.orgId} = ${vendorOrganizations.id}
                      and (${vendorGsts.gstNo} ILIKE ${q} or ${vendorGsts.gstState} ILIKE ${q})
                ) OR
                exists (
                    select 1 from ${vendors}
                    where ${vendors.orgId} = ${vendorOrganizations.id}
                      and (${vendors.name} ILIKE ${q} or ${vendors.email} ILIKE ${q} or ${vendors.mobile} ILIKE ${q})
                ) OR
                exists (
                    select 1 from ${vendorAccs}
                    where ${vendorAccs.orgId} = ${vendorOrganizations.id}
                      and (${vendorAccs.accountNum} ILIKE ${q} or ${vendorAccs.ifscCode} ILIKE ${q})
                )
            )`);
        }

        const whereClause = conditions.length ? and(...conditions) : undefined;

        const [countRow] = await this.db
            .select({ total: sql<number>`COUNT(*)`.as("total") })
            .from(vendorOrganizations)
            .where(whereClause);
        const total = Number(countRow?.total ?? 0);

        // Sort whitelist: AG Grid colId -> SQL. A raw colId never reaches ORDER BY.
        const sortFn = filters?.sortOrder === "desc" ? desc : asc;
        let orderByClause: SQL<unknown>;
        switch (filters?.sortBy) {
            case "alias":
                orderByClause = sortFn(vendorOrganizations.alias);
                break;
            case "pan":
                orderByClause = sortFn(vendorOrganizations.pan);
                break;
            case "msme":
                orderByClause = sortFn(vendorOrganizations.msme);
                break;
            case "msmeType":
                orderByClause = sortFn(vendorOrganizations.msmeType);
                break;
            case "gstCount":
                orderByClause = sortFn(gstCountSql);
                break;
            case "accountCount":
                orderByClause = sortFn(accountCountSql);
                break;
            case "personCount":
                orderByClause = sortFn(personCountSql);
                break;
            case "fileCount":
                orderByClause = sortFn(fileCountSql);
                break;
            case "name":
                orderByClause = sortFn(vendorOrganizations.name);
                break;
            default:
                orderByClause = asc(vendorOrganizations.name);
        }

        const rows = await this.db
            .select({
                ...getTableColumns(vendorOrganizations),
                personsCount: personCountSql,
                gstsCount: gstCountSql,
                accountsCount: accountCountSql,
                filesCount: fileCountSql,
            })
            .from(vendorOrganizations)
            .where(whereClause)
            .orderBy(orderByClause, asc(vendorOrganizations.id))
            .limit(limit)
            .offset(offset);

        const data = rows.map(({ personsCount, gstsCount, accountsCount, filesCount, ...org }) => ({
            ...org,
            _counts: {
                persons: personsCount,
                gsts: gstsCount,
                accounts: accountsCount,
                files: filesCount,
            },
        }));

        return wrapPaginatedResponse(data, total, page, limit);
    }

    async createOrganization(data: NewVendorOrganization): Promise<VendorOrganization> {
        const name = normalizeVendorName(data.name);
        try {
            const rows = await this.db
                .insert(vendorOrganizations)
                .values({ ...data, name })
                .returning();
            return rows[0];
        } catch (error: any) {
            if (error.code === "23505" || error.cause?.code === "23505") {
                throw new ConflictException(`Vendor Organization with name "${name}" already exists`);
            }
            throw error;
        }
    }

    async updateOrganization(id: number, data: Partial<NewVendorOrganization>): Promise<VendorOrganization> {
        const normalised = data.name !== undefined ? { ...data, name: normalizeVendorName(data.name) } : data;
        try {
            const rows = await this.db
                .update(vendorOrganizations)
                .set({ ...normalised, updatedAt: new Date() })
                .where(eq(vendorOrganizations.id, id))
                .returning();

            if (!rows[0]) {
                throw new NotFoundException(`Vendor Organization with ID ${id} not found`);
            }
            return rows[0];
        } catch (error: any) {
            if (error.code === "23505" || error.cause?.code === "23505") {
                throw new ConflictException(`A Vendor Organization with this name already exists`);
            }
            throw error;
        }
    }

    async deleteOrganization(id: number): Promise<void> {
        const result = await this.db.delete(vendorOrganizations).where(eq(vendorOrganizations.id, id)).returning();

        if (!result[0]) {
            throw new NotFoundException(`Vendor Organization with ID ${id} not found`);
        }
    }

    /**
     * Create organization with nested relations (GSTs, accounts, persons, files)
     */
    async createOrganizationWithRelations(data: {
        organization: NewVendorOrganization;
        gsts?: Omit<NewVendorGst, "orgId">[];
        accounts?: Omit<NewVendorAcc, "orgId">[];
        persons?: Omit<NewVendor, "orgId">[];
        files?: Omit<NewVendorFile, "orgId">[];
    }) {
        this.assertArrayUnique(data.gsts, gst => gst.gstNo, "GST number");
        this.assertArrayUnique(data.accounts, acc => acc.accountNum, "Account number");
        this.assertArrayUnique(data.persons, person => person.mobile, "Mobile number");
        this.assertArrayUnique(data.persons, person => person.email, "Email");

        // Create organization first
        const organization = await this.createOrganization(data.organization);

        // Create GSTs
        if (data.gsts && data.gsts.length > 0) {
            await this.db.insert(vendorGsts).values(
                data.gsts.map(gst => ({
                    ...gst,
                    orgId: organization.id,
                }))
            );
        }

        // Create accounts
        if (data.accounts && data.accounts.length > 0) {
            await this.db.insert(vendorAccs).values(
                data.accounts.map(acc => ({
                    ...acc,
                    orgId: organization.id,
                }))
            );
        }

        // Create persons
        if (data.persons && data.persons.length > 0) {
            await this.db.insert(vendors).values(
                data.persons.map(personFields => ({
                    ...personFields,
                    name: personFields.name?.trim(),
                    email: personFields.email?.trim(),
                    mobile: personFields.mobile?.trim(),
                    address: personFields.address?.trim(),
                    orgId: organization.id,
                }))
            );
        }

        // Create files (belong to the organization)
        if (data.files && data.files.length > 0) {
            await this.db.insert(vendorFiles).values(
                data.files.map(file => ({
                    ...file,
                    orgId: organization.id,
                }))
            );
        }

        // Return organization with all relations
        return this.findOrganizationByIdWithAllRelations(organization.id);
    }

    /**
     * Update organization and related entities
     */
    async updateOrganizationWithRelations(
        id: number,
        data: {
            organization?: Partial<NewVendorOrganization>;
            gsts?: {
                create?: Omit<NewVendorGst, "orgId">[];
                update?: Array<{ id: number; data: Partial<Omit<NewVendorGst, "orgId">> }>;
                delete?: number[];
            };
            accounts?: {
                create?: Omit<NewVendorAcc, "orgId">[];
                update?: Array<{ id: number; data: Partial<Omit<NewVendorAcc, "orgId">> }>;
                delete?: number[];
            };
            persons?: {
                create?: Omit<NewVendor, "orgId">[];
                update?: Array<{ id: number; data: Partial<Omit<NewVendor, "orgId">> }>;
                delete?: number[];
            };
            files?: {
                create?: Omit<NewVendorFile, "orgId">[];
                update?: Array<{ id: number; data: Partial<Omit<NewVendorFile, "orgId">> }>;
                delete?: number[];
            };
        }
    ) {
        if (data.gsts) {
            this.assertArrayUnique(data.gsts.create, gst => gst.gstNo, "GST number");
            for (const gst of data.gsts.create ?? []) {
                await this.assertUniqueGstNo(id, gst.gstNo);
            }
            for (const { id: gstId, data: gstData } of data.gsts.update ?? []) {
                if (gstData.gstNo !== undefined) {
                    await this.assertUniqueGstNo(id, gstData.gstNo, gstId);
                }
            }
        }

        if (data.accounts) {
            this.assertArrayUnique(data.accounts.create, acc => acc.accountNum, "Account number");
            for (const acc of data.accounts.create ?? []) {
                await this.assertUniqueAccountNum(id, acc.accountNum);
            }
            for (const { id: accId, data: accData } of data.accounts.update ?? []) {
                if (accData.accountNum !== undefined) {
                    await this.assertUniqueAccountNum(id, accData.accountNum, accId);
                }
            }
        }

        if (data.persons) {
            this.assertArrayUnique(data.persons.create, person => person.mobile, "Mobile number");
            this.assertArrayUnique(data.persons.create, person => person.email, "Email");
            for (const person of data.persons.create ?? []) {
                await this.assertUniquePersonContact(id, person);
            }
            for (const { id: personId, data: personData } of data.persons.update ?? []) {
                if (personData.mobile !== undefined || personData.email !== undefined) {
                    await this.assertUniquePersonContact(id, personData, personId);
                }
            }
        }

        // Update organization
        if (data.organization) {
            await this.updateOrganization(id, data.organization);
        }

        // Handle GSTs
        if (data.gsts) {
            if (data.gsts.create && data.gsts.create.length > 0) {
                await this.db.insert(vendorGsts).values(
                    data.gsts.create.map(gst => ({
                        ...gst,
                        orgId: id,
                    }))
                );
            }
            if (data.gsts.update) {
                for (const { id: gstId, data: gstData } of data.gsts.update) {
                    await this.db
                        .update(vendorGsts)
                        .set({ ...gstData, updatedAt: new Date() })
                        .where(eq(vendorGsts.id, gstId));
                }
            }
            if (data.gsts.delete && data.gsts.delete.length > 0) {
                for (const gstId of data.gsts.delete) {
                    await this.db.delete(vendorGsts).where(eq(vendorGsts.id, gstId));
                }
            }
        }

        // Handle accounts
        if (data.accounts) {
            if (data.accounts.create && data.accounts.create.length > 0) {
                await this.db.insert(vendorAccs).values(
                    data.accounts.create.map(acc => ({
                        ...acc,
                        orgId: id,
                    }))
                );
            }
            if (data.accounts.update) {
                for (const { id: accId, data: accData } of data.accounts.update) {
                    await this.db
                        .update(vendorAccs)
                        .set({ ...accData, updatedAt: new Date() })
                        .where(eq(vendorAccs.id, accId));
                }
            }
            if (data.accounts.delete && data.accounts.delete.length > 0) {
                for (const accId of data.accounts.delete) {
                    await this.db.delete(vendorAccs).where(eq(vendorAccs.id, accId));
                }
            }
        }

        // Handle persons
        if (data.persons) {
            if (data.persons.create && data.persons.create.length > 0) {
                await this.db.insert(vendors).values(
                    data.persons.create.map(personFields => ({
                        ...personFields,
                        name: personFields.name?.trim(),
                        email: personFields.email?.trim(),
                        mobile: personFields.mobile?.trim(),
                        address: personFields.address?.trim(),
                        orgId: id,
                    }))
                );
            }
            if (data.persons.update) {
                for (const { id: personId, data: personData } of data.persons.update) {
                    const trimmedPersonData = {
                        ...personData,
                        name: personData.name?.trim(),
                        email: personData.email?.trim(),
                        mobile: personData.mobile?.trim(),
                        address: personData.address?.trim(),
                    };
                    await this.db
                        .update(vendors)
                        .set({ ...trimmedPersonData, updatedAt: new Date() })
                        .where(eq(vendors.id, personId));
                }
            }
            if (data.persons.delete && data.persons.delete.length > 0) {
                for (const personId of data.persons.delete) {
                    await this.db.delete(vendors).where(eq(vendors.id, personId));
                }
            }
        }

        // Handle files (belong to the organization)
        if (data.files) {
            if (data.files.create && data.files.create.length > 0) {
                await this.db.insert(vendorFiles).values(
                    data.files.create.map(file => ({
                        ...file,
                        orgId: id,
                    }))
                );
            }
            if (data.files.update) {
                for (const { id: fileId, data: fileData } of data.files.update) {
                    await this.db
                        .update(vendorFiles)
                        .set({ ...fileData, updatedAt: new Date() })
                        .where(eq(vendorFiles.id, fileId));
                }
            }
            if (data.files.delete && data.files.delete.length > 0) {
                for (const fileId of data.files.delete) {
                    await this.db.delete(vendorFiles).where(eq(vendorFiles.id, fileId));
                }
            }
        }

        // Return updated organization with all relations
        return this.findOrganizationByIdWithAllRelations(id);
    }

    /**
     * Select fields with organization
     */
    private getSelectWithOrganization() {
        return {
            id: vendors.id,
            organizationId: vendors.orgId,
            name: vendors.name,
            email: vendors.email,
            mobile: vendors.mobile,
            address: vendors.address,
            createdAt: vendors.createdAt,
            updatedAt: vendors.updatedAt,
            // Include organization
            organization: {
                id: vendorOrganizations.id,
                name: vendorOrganizations.name,
                alias: vendorOrganizations.alias,
                msme: vendorOrganizations.msme,
                pan: vendorOrganizations.pan,
                address: vendorOrganizations.address,
            },
        };
    }

    /**
     * Get all vendors with organization
     */
    async findAllVendors() {
        return this.db.select(this.getSelectWithOrganization()).from(vendors).leftJoin(vendorOrganizations, eq(vendors.orgId, vendorOrganizations.id));
    }

    /**
     * Get single vendor with organization
     */
    async findVendorById(id: number) {
        const result = await this.db
            .select(this.getSelectWithOrganization())
            .from(vendors)
            .leftJoin(vendorOrganizations, eq(vendors.orgId, vendorOrganizations.id))
            .where(eq(vendors.id, id))
            .limit(1);

        if (!result[0]) {
            throw new NotFoundException(`Vendor with ID ${id} not found`);
        }

        return result[0];
    }

    /**
     * Get vendor with ALL related data (files, organization)
     * This returns nested structure for detail view
     */
    async findVendorByIdWithRelations(id: number) {
        // Get vendor with organization
        const vendor = await this.findVendorById(id);

        // Get files for this vendor's organization
        const files = vendor.organizationId ? await this.db.select().from(vendorFiles).where(eq(vendorFiles.orgId, vendor.organizationId)) : [];

        return {
            ...vendor,
            files,
        };
    }

    /**
     * Get vendors by organization
     */
    async findVendorsByOrganization(organizationId: number) {
        return this.db
            .select(this.getSelectWithOrganization())
            .from(vendors)
            .leftJoin(vendorOrganizations, eq(vendors.orgId, vendorOrganizations.id))
            .where(eq(vendors.orgId, organizationId));
    }

    async createVendor(data: NewVendor): Promise<Vendor> {
        const trimmedData = {
            ...data,
            name: data.name?.trim(),
            email: normalizeEmail(data.email),
            mobile: data.mobile?.trim(),
            address: data.address?.trim(),
        };
        if (trimmedData.orgId) {
            await this.assertUniquePersonContact(trimmedData.orgId, trimmedData);
        }
        const rows = await this.db.insert(vendors).values(trimmedData).returning();
        const vendor = rows[0];
        if (vendor.name) {
            await this.clientDirectorySyncService.syncToClientDirectory([
                {
                    name: vendor.name,
                    email: vendor.email,
                    phone: vendor.mobile,
                    org: null,
                },
            ]);
        }
        return vendor;
    }

    async updateVendor(id: number, data: Partial<NewVendor>): Promise<Vendor> {
        const trimmedData = {
            ...data,
            name: data.name?.trim(),
            email: normalizeEmail(data.email),
            mobile: data.mobile?.trim(),
            address: data.address?.trim(),
        };
        if (trimmedData.mobile !== undefined || trimmedData.email !== undefined) {
            const existing = await this.findVendorById(id);
            const targetOrgId = data.orgId ?? existing.organizationId;
            if (targetOrgId) {
                await this.assertUniquePersonContact(targetOrgId, trimmedData, id);
            }
        }
        const rows = await this.db
            .update(vendors)
            .set({ ...trimmedData, updatedAt: new Date() })
            .where(eq(vendors.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`Vendor with ID ${id} not found`);
        }
        const vendor = rows[0];
        if (vendor.name && (data.name || data.email || data.mobile)) {
            await this.clientDirectorySyncService.syncToClientDirectory([
                {
                    name: vendor.name,
                    email: vendor.email,
                    phone: vendor.mobile,
                    org: null,
                },
            ]);
        }
        return vendor;
    }

    async deleteVendor(id: number): Promise<void> {
        const result = await this.db.delete(vendors).where(eq(vendors.id, id)).returning();

        if (!result[0]) {
            throw new NotFoundException(`Vendor with ID ${id} not found`);
        }
    }

    async findAllGsts(): Promise<VendorGst[]> {
        return this.db.select().from(vendorGsts);
    }

    async findGstById(id: number): Promise<VendorGst> {
        const result = await this.db.select().from(vendorGsts).where(eq(vendorGsts.id, id)).limit(1);

        if (!result[0]) {
            throw new NotFoundException(`Vendor GST with ID ${id} not found`);
        }

        return result[0];
    }

    async findGstsByOrganization(orgId: number): Promise<VendorGst[]> {
        return this.db.select().from(vendorGsts).where(eq(vendorGsts.orgId, orgId));
    }

    async createGst(data: NewVendorGst): Promise<VendorGst> {
        await this.assertUniqueGstNo(data.orgId, data.gstNo);
        const rows = await this.db.insert(vendorGsts).values(data).returning();
        return rows[0];
    }

    async updateGst(id: number, data: Partial<NewVendorGst>): Promise<VendorGst> {
        if (data.gstNo !== undefined) {
            const existing = await this.findGstById(id);
            await this.assertUniqueGstNo(existing.orgId, data.gstNo, id);
        }
        const rows = await this.db
            .update(vendorGsts)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(vendorGsts.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`Vendor GST with ID ${id} not found`);
        }
        return rows[0];
    }

    async deleteGst(id: number): Promise<void> {
        const result = await this.db.delete(vendorGsts).where(eq(vendorGsts.id, id)).returning();

        if (!result[0]) {
            throw new NotFoundException(`Vendor GST with ID ${id} not found`);
        }
    }

    async findAllAccounts(): Promise<VendorAcc[]> {
        return this.db.select().from(vendorAccs);
    }

    async findAccountById(id: number): Promise<VendorAcc> {
        const result = await this.db.select().from(vendorAccs).where(eq(vendorAccs.id, id)).limit(1);

        if (!result[0]) {
            throw new NotFoundException(`Vendor Account with ID ${id} not found`);
        }

        return result[0];
    }

    async findAccountsByOrganization(orgId: number): Promise<VendorAcc[]> {
        return this.db.select().from(vendorAccs).where(eq(vendorAccs.orgId, orgId));
    }

    async createAccount(data: NewVendorAcc): Promise<VendorAcc> {
        await this.assertUniqueAccountNum(data.orgId, data.accountNum);
        const rows = await this.db.insert(vendorAccs).values(data).returning();
        return rows[0];
    }

    async updateAccount(id: number, data: Partial<NewVendorAcc>): Promise<VendorAcc> {
        if (data.accountNum !== undefined) {
            const existing = await this.findAccountById(id);
            await this.assertUniqueAccountNum(existing.orgId, data.accountNum, id);
        }
        const rows = await this.db
            .update(vendorAccs)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(vendorAccs.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`Vendor Account with ID ${id} not found`);
        }
        return rows[0];
    }

    async deleteAccount(id: number): Promise<void> {
        const result = await this.db.delete(vendorAccs).where(eq(vendorAccs.id, id)).returning();

        if (!result[0]) {
            throw new NotFoundException(`Vendor Account with ID ${id} not found`);
        }
    }

    async findAllVendorFiles(): Promise<VendorFile[]> {
        return this.db.select().from(vendorFiles);
    }

    async findVendorFileById(id: number): Promise<VendorFile> {
        const result = await this.db.select().from(vendorFiles).where(eq(vendorFiles.id, id)).limit(1);

        if (!result[0]) {
            throw new NotFoundException(`Vendor File with ID ${id} not found`);
        }

        return result[0];
    }

    async findVendorFilesByOrganization(orgId: number): Promise<VendorFile[]> {
        return this.db.select().from(vendorFiles).where(eq(vendorFiles.orgId, orgId));
    }

    async createVendorFile(data: NewVendorFile): Promise<VendorFile> {
        const rows = await this.db.insert(vendorFiles).values(data).returning();
        return rows[0];
    }

    async updateVendorFile(id: number, data: Partial<NewVendorFile>): Promise<VendorFile> {
        const rows = await this.db
            .update(vendorFiles)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(vendorFiles.id, id))
            .returning();

        if (!rows[0]) {
            throw new NotFoundException(`Vendor File with ID ${id} not found`);
        }
        return rows[0];
    }

    async deleteVendorFile(id: number): Promise<void> {
        const result = await this.db.delete(vendorFiles).where(eq(vendorFiles.id, id)).returning();

        if (!result[0]) {
            throw new NotFoundException(`Vendor File with ID ${id} not found`);
        }
    }

    // ==================== Vendor organization merge ====================
    // Implements scripts/merge-vendor-orgs-runbook.md §2/§3 in code:
    // re-point every reference from the drop org to the keeper, archive the
    // dropped row, and deactivate it — never delete.

    async getMergePreview(keepId: number, dropId: number): Promise<VendorMergePreview> {
        if (keepId === dropId) {
            throw new BadRequestException("Keep and drop vendor organizations must be different");
        }

        const [keep, drop] = await Promise.all([this.findOrganizationById(keepId), this.findOrganizationById(dropId)]);

        const buildSummary = async (org: VendorOrganization): Promise<VendorMergeOrgSummary> => {
            const [gsts, persons, accounts, files] = await Promise.all([
                this.db.select({ c: count() }).from(vendorGsts).where(eq(vendorGsts.orgId, org.id)),
                this.db.select({ c: count() }).from(vendors).where(eq(vendors.orgId, org.id)),
                this.db.select({ c: count() }).from(vendorAccs).where(eq(vendorAccs.orgId, org.id)),
                this.db.select({ c: count() }).from(vendorFiles).where(eq(vendorFiles.orgId, org.id)),
            ]);
            return {
                ...org,
                _counts: {
                    gsts: gsts[0]?.c ?? 0,
                    persons: persons[0]?.c ?? 0,
                    accounts: accounts[0]?.c ?? 0,
                    files: files[0]?.c ?? 0,
                },
            };
        };

        const refGroup = (ids: number[]): VendorMergeRefGroup => ({ count: ids.length, ids });
        const toNumbers = (rows: Array<{ id: string | number }>): number[] => rows.map(r => Number(r.id));

        const [poRows, vwoRows, responseRows, projectRows, tenderRfqToRows, tenderOemRows, rfqRows, costingRows, archiveResolved, archiveVendorOrg] = await Promise.all([
            this.db.select({ id: purchaseOrders.id }).from(purchaseOrders).where(eq(purchaseOrders.sellerOrganizationId, dropId)),
            this.db.select({ id: vendorWorkOrders.id }).from(vendorWorkOrders).where(eq(vendorWorkOrders.sellerOrganizationId, dropId)),
            this.db.select({ id: rfqResponses.id }).from(rfqResponses).where(eq(rfqResponses.organizationId, dropId)),
            this.db.select({ id: projects.id }).from(projects).where(eq(projects.organisationId, dropId)),
            this.db.select({ id: tenderInfos.id, rfqTo: tenderInfos.rfqTo }).from(tenderInfos).where(isNotNull(tenderInfos.rfqTo)),
            // oem_not_allowed is varchar in the DB while the Drizzle schema says text[] —
            // selecting it raw avoids Drizzle's parsePgArray mangling of bare/CSV values.
            this.db
                .select({ id: tenderInfos.id, oemNotAllowed: sql<string>`${tenderInfos.oemNotAllowed}` })
                .from(tenderInfos)
                .where(isNotNull(tenderInfos.oemNotAllowed)),
            this.db.select({ id: rfqs.id, requestedOrganization: rfqs.requestedOrganization }).from(rfqs).where(isNotNull(rfqs.requestedOrganization)),
            this.db
                .select({ id: tenderCostingSheets.id, oemVendorIds: tenderCostingSheets.oemVendorIds })
                .from(tenderCostingSheets)
                .where(isNotNull(tenderCostingSheets.oemVendorIds)),
            this.db.execute(sql`SELECT id FROM project_parties_sellers_archive WHERE resolved_org_id = ${dropId}`),
            this.db.execute(sql`SELECT id FROM project_parties_sellers_archive WHERE vendor_organization_id = ${dropId}`),
        ]);

        return {
            keep: await buildSummary(keep),
            drop: await buildSummary(drop),
            references: {
                purchaseOrders: refGroup(toNumbers(poRows)),
                vendorWorkOrders: refGroup(toNumbers(vwoRows)),
                rfqResponses: refGroup(toNumbers(responseRows)),
                projects: refGroup(toNumbers(projectRows)),
                tendersRfqTo: refGroup(tenderRfqToRows.filter(r => csvIdListContains(r.rfqTo, dropId)).map(r => r.id)),
                tendersOemNotAllowed: refGroup(tenderOemRows.filter(r => looseIdListContains(r.oemNotAllowed, dropId)).map(r => r.id)),
                rfqsRequestedOrganization: refGroup(rfqRows.filter(r => csvIdListContains(r.requestedOrganization, dropId, NO_CSV_SENTINELS)).map(r => r.id)),
                costingSheetsOemVendorIds: refGroup(costingRows.filter(r => idArrayContains(r.oemVendorIds, dropId)).map(r => r.id)),
                partiesArchiveResolved: refGroup(toNumbers(archiveResolved.rows as Array<{ id: string | number }>)),
                partiesArchiveVendorOrg: refGroup(toNumbers(archiveVendorOrg.rows as Array<{ id: string | number }>)),
            },
        };
    }

    async mergeVendors(keepId: number, dropId: number): Promise<VendorMergeResult> {
        if (keepId === dropId) {
            throw new BadRequestException("Keep and drop vendor organizations must be different");
        }

        return this.db.transaction(async tx => {
            const [keep] = await tx.select().from(vendorOrganizations).where(eq(vendorOrganizations.id, keepId)).limit(1);
            const [drop] = await tx.select().from(vendorOrganizations).where(eq(vendorOrganizations.id, dropId)).limit(1);

            if (!keep) throw new NotFoundException(`Vendor organization with ID ${keepId} not found`);
            if (!drop) throw new NotFoundException(`Vendor organization with ID ${dropId} not found`);
            if (!drop.status) throw new BadRequestException(`Vendor "${drop.name}" is already inactive`);

            const movedRefs: Record<string, number[]> = {};

            const movedVendors = await tx.update(vendors).set({ orgId: keepId }).where(eq(vendors.orgId, dropId)).returning({ id: vendors.id });
            movedRefs["vendors.org_id"] = movedVendors.map(r => r.id);

            const movedGsts = await tx.update(vendorGsts).set({ orgId: keepId }).where(eq(vendorGsts.orgId, dropId)).returning({ id: vendorGsts.id });
            movedRefs["vendor_gsts.org_id"] = movedGsts.map(r => r.id);

            const movedAccs = await tx.update(vendorAccs).set({ orgId: keepId }).where(eq(vendorAccs.orgId, dropId)).returning({ id: vendorAccs.id });
            movedRefs["vendor_accs.org_id"] = movedAccs.map(r => r.id);

            const movedFiles = await tx.update(vendorFiles).set({ orgId: keepId }).where(eq(vendorFiles.orgId, dropId)).returning({ id: vendorFiles.id });
            movedRefs["vendor_files.org_id"] = movedFiles.map(r => r.id);

            const movedProjects = await tx.update(projects).set({ organisationId: keepId }).where(eq(projects.organisationId, dropId)).returning({ id: projects.id });
            movedRefs["projects.org_id"] = movedProjects.map(r => r.id);

            const movedPos = await tx
                .update(purchaseOrders)
                .set({ sellerOrganizationId: keepId })
                .where(eq(purchaseOrders.sellerOrganizationId, dropId))
                .returning({ id: purchaseOrders.id });
            movedRefs["purchase_orders.seller_organization_id"] = movedPos.map(r => r.id);

            const movedVwos = await tx
                .update(vendorWorkOrders)
                .set({ sellerOrganizationId: keepId })
                .where(eq(vendorWorkOrders.sellerOrganizationId, dropId))
                .returning({ id: vendorWorkOrders.id });
            movedRefs["vendor_work_orders.seller_organization_id"] = movedVwos.map(r => r.id);

            const movedResponses = await tx.update(rfqResponses).set({ organizationId: keepId }).where(eq(rfqResponses.organizationId, dropId)).returning({ id: rfqResponses.id });
            movedRefs["rfq_responses.organization_id"] = movedResponses.map(r => r.id);

            // Archive table has no drizzle schema — raw SQL.
            const movedArchiveResolved = await tx.execute(
                sql`UPDATE project_parties_sellers_archive SET resolved_org_id = ${keepId} WHERE resolved_org_id = ${dropId} RETURNING id`
            );
            movedRefs["project_parties_sellers_archive.resolved_org_id"] = toNumberIds(movedArchiveResolved.rows);
            const movedArchiveVendorOrg = await tx.execute(
                sql`UPDATE project_parties_sellers_archive SET vendor_organization_id = ${keepId} WHERE vendor_organization_id = ${dropId} RETURNING id`
            );
            movedRefs["project_parties_sellers_archive.vendor_organization_id"] = toNumberIds(movedArchiveVendorOrg.rows);

            // CSV id lists — token-wise rewrite with de-duplication.
            const tenderCsvRows = await tx.select({ id: tenderInfos.id, rfqTo: tenderInfos.rfqTo }).from(tenderInfos).where(isNotNull(tenderInfos.rfqTo));
            const tendersMoved: number[] = [];
            for (const row of tenderCsvRows) {
                const next = repointCsvIdList(row.rfqTo, dropId, keepId);
                if (next !== row.rfqTo) {
                    await tx
                        .update(tenderInfos)
                        .set({ rfqTo: next ?? null, updatedAt: new Date() })
                        .where(eq(tenderInfos.id, row.id));
                    tendersMoved.push(row.id);
                }
            }
            movedRefs["tender_infos.rfq_to"] = tendersMoved;

            const rfqCsvRows = await tx.select({ id: rfqs.id, requestedOrganization: rfqs.requestedOrganization }).from(rfqs).where(isNotNull(rfqs.requestedOrganization));
            const rfqsMoved: number[] = [];
            for (const row of rfqCsvRows) {
                // requested_organization has no {0,1} sentinels — tokens are real org ids.
                const next = repointCsvIdList(row.requestedOrganization, dropId, keepId, NO_CSV_SENTINELS);
                if (next !== row.requestedOrganization) {
                    await tx
                        .update(rfqs)
                        .set({ requestedOrganization: next ?? null, updatedAt: new Date() })
                        .where(eq(rfqs.id, row.id));
                    rfqsMoved.push(row.id);
                }
            }
            movedRefs["rfqs.requested_organization"] = rfqsMoved;

            // oem_not_allowed — varchar in the DB (Drizzle schema says text[]), mixed
            // bare/CSV/pg-array encodings: read raw, rewrite format-preservingly, update
            // via raw SQL (Drizzle's text[] mapper/serializer would mangle it).
            const oemRows = await tx
                .select({ id: tenderInfos.id, oemNotAllowed: sql<string>`${tenderInfos.oemNotAllowed}` })
                .from(tenderInfos)
                .where(isNotNull(tenderInfos.oemNotAllowed));
            const oemMoved: number[] = [];
            for (const row of oemRows) {
                const next = repointLooseIdList(row.oemNotAllowed, dropId, keepId) ?? row.oemNotAllowed;
                if (next !== row.oemNotAllowed) {
                    await tx.execute(sql`UPDATE tender_infos SET oem_not_allowed = ${next}, updated_at = now() WHERE id = ${row.id}`);
                    oemMoved.push(row.id);
                }
            }
            movedRefs["tender_infos.oem_not_allowed"] = oemMoved;

            const costingRows = await tx
                .select({ id: tenderCostingSheets.id, oemVendorIds: tenderCostingSheets.oemVendorIds })
                .from(tenderCostingSheets)
                .where(isNotNull(tenderCostingSheets.oemVendorIds));
            const costingMoved: number[] = [];
            for (const row of costingRows) {
                const next = repointIdArray(row.oemVendorIds, dropId, keepId);
                if (next !== row.oemVendorIds) {
                    await tx
                        .update(tenderCostingSheets)
                        .set({ oemVendorIds: next ?? null, updatedAt: new Date() })
                        .where(eq(tenderCostingSheets.id, row.id));
                    costingMoved.push(row.id);
                }
            }
            movedRefs["tender_costing_sheets.oem_vendor_ids"] = costingMoved;

            // Fill the keeper's EMPTY identifying fields from the drop (runbook §3b).
            const filled: Record<string, string> = {};
            const keeperPatch: Partial<NewVendorOrganization> = {};
            const blank = (value: string | null | undefined) => !value?.trim();
            if (blank(keep.alias) && drop.alias?.trim()) {
                keeperPatch.alias = drop.alias;
                filled.alias = drop.alias;
            }
            if (blank(keep.pan) && drop.pan?.trim()) {
                keeperPatch.pan = drop.pan;
                filled.pan = drop.pan;
            }
            if (blank(keep.msme) && drop.msme?.trim()) {
                keeperPatch.msme = drop.msme;
                filled.msme = drop.msme;
            }
            if (blank(keep.msmeType) && drop.msmeType?.trim()) {
                keeperPatch.msmeType = drop.msmeType;
                filled.msmeType = drop.msmeType;
            }
            if (blank(keep.address) && drop.address?.trim()) {
                keeperPatch.address = drop.address;
                filled.address = drop.address;
            }
            if (Object.keys(keeperPatch).length > 0) {
                await tx
                    .update(vendorOrganizations)
                    .set({ ...keeperPatch, updatedAt: new Date() })
                    .where(eq(vendorOrganizations.id, keepId));
            }

            // Archive the dropped row for manual rollback (runbook §3a).
            await tx.execute(sql`
                INSERT INTO vendor_organizations_dups_archive
                    (id, kept_id, name, alias, address, pan, msme, msme_type, status,
                     created_at, updated_at, reason, moved_refs, filled)
                VALUES
                    (${drop.id}, ${keep.id}, ${drop.name}, ${drop.alias}, ${drop.address}, ${drop.pan},
                     ${drop.msme}, ${drop.msmeType}, ${drop.status}, ${drop.createdAt}, ${drop.updatedAt},
                     ${"app merge (VendorMergePage)"},
                     CAST(${JSON.stringify(movedRefs)} AS jsonb), CAST(${JSON.stringify(filled)} AS jsonb))
                ON CONFLICT (id) DO UPDATE SET
                    kept_id = EXCLUDED.kept_id,
                    reason = EXCLUDED.reason,
                    moved_refs = EXCLUDED.moved_refs,
                    filled = EXCLUDED.filled
            `);

            // Safety net — any leftover reference aborts the whole transaction.
            const remaining = await tx.execute(sql`
                SELECT (
                      (SELECT count(*) FROM vendors                         WHERE org_id = ${dropId})
                    + (SELECT count(*) FROM vendor_gsts                     WHERE org_id = ${dropId})
                    + (SELECT count(*) FROM vendor_accs                     WHERE org_id = ${dropId})
                    + (SELECT count(*) FROM vendor_files                    WHERE org_id = ${dropId})
                    + (SELECT count(*) FROM projects                        WHERE org_id = ${dropId})
                    + (SELECT count(*) FROM purchase_orders                 WHERE seller_organization_id = ${dropId})
                    + (SELECT count(*) FROM vendor_work_orders              WHERE seller_organization_id = ${dropId})
                    + (SELECT count(*) FROM rfq_responses                  WHERE organization_id = ${dropId})
                    + (SELECT count(*) FROM project_parties_sellers_archive
                         WHERE resolved_org_id = ${dropId} OR vendor_organization_id = ${dropId})
                    + (SELECT count(*) FROM tender_infos
                         WHERE rfq_to IS NOT NULL AND rfq_to <> '0' AND rfq_to <> '1'
                           AND (',' || replace(rfq_to, ' ', '') || ',') LIKE ('%,' || ${dropId} || ',%'))
                    + (SELECT count(*) FROM rfqs
                         WHERE requested_organization IS NOT NULL
                           AND (',' || replace(requested_organization, ' ', '') || ',') LIKE ('%,' || ${dropId} || ',%'))
                    + (SELECT count(*) FROM tender_infos
                         WHERE oem_not_allowed IS NOT NULL
                           AND btrim(oem_not_allowed) <> ''
                           AND (',' || replace(replace(replace(replace(oem_not_allowed, '{', ''), '}', ''), '"', ''), ' ', '') || ',')
                               LIKE ('%,' || ${dropId} || ',%'))
                    + (SELECT count(*) FROM tender_costing_sheets
                         WHERE oem_vendor_ids @> CAST(${JSON.stringify([dropId])} AS jsonb))
                ) AS remaining
            `);
            const remainingCount = Number((remaining.rows as Array<{ remaining: string | number }>)[0]?.remaining ?? 0);
            if (remainingCount > 0) {
                throw new ConflictException(`Merge aborted: ${remainingCount} reference(s) to vendor ${dropId} remain`);
            }

            // Never delete — deactivate the duplicate (runbook rule).
            await tx.update(vendorOrganizations).set({ status: false, updatedAt: new Date() }).where(eq(vendorOrganizations.id, dropId));

            return { keptId: keepId, dropId, movedRefs, filled };
        });
    }
}

const toNumberIds = (rows: unknown[]): number[] => rows.map(row => Number((row as { id: string | number }).id)).filter(Number.isInteger);
