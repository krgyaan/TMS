import { Inject, Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { eq, asc, desc, and, ne, sql, getTableColumns, type SQL } from "drizzle-orm";
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
import type { BaseFilters } from "@/modules/tendering/types/shared.types";

export type VendorOrganizationListFilters = BaseFilters & { search?: string };

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

        const rows = await this.db.select({ id: vendorGsts.id }).from(vendorGsts).where(and(...conds)).limit(1);
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

        const rows = await this.db.select({ id: vendorAccs.id }).from(vendorAccs).where(and(...conds)).limit(1);
        if (rows[0]) {
            throw new ConflictException(`Account number "${trimmed}" already exists for this organization`);
        }
    }

    private async assertUniquePersonContact(
        orgId: number,
        data: { mobile?: string | null; email?: string | null },
        excludeId?: number
    ): Promise<void> {
        const mobile = data.mobile?.trim();
        if (mobile) {
            const conds = [eq(vendors.orgId, orgId), sql`trim(${vendors.mobile}) = ${mobile}`];
            if (excludeId !== undefined) {
                conds.push(ne(vendors.id, excludeId));
            }

            const rows = await this.db.select({ id: vendors.id }).from(vendors).where(and(...conds)).limit(1);
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

            const rows = await this.db.select({ id: vendors.id }).from(vendors).where(and(...conds)).limit(1);
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
        try {
            const rows = await this.db.insert(vendorOrganizations).values(data).returning();
            return rows[0];
        } catch (error: any) {
            if (error.code === "23505" || error.cause?.code === "23505") {
                throw new ConflictException(`Vendor Organization with name "${data.name}" already exists`);
            }
            throw error;
        }
    }

    async updateOrganization(id: number, data: Partial<NewVendorOrganization>): Promise<VendorOrganization> {
        try {
            const rows = await this.db
                .update(vendorOrganizations)
                .set({ ...data, updatedAt: new Date() })
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
}
