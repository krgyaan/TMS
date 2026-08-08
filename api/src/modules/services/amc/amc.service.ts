import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, and, isNull, asc, inArray } from "drizzle-orm";
import type { DbInstance } from "@/db";
import { DRIZZLE } from "@/db/database.module";
import {
    amcs,
    amcSites,
    amcContacts,
    amcProducts,
} from "@/db/schemas";
import type {
    AmcProductDto,
    AmcServiceEngineerDto,
    AmcSiteContactDto,
    AmcSiteDto,
    CreateAmcDto,
    UpdateAmcDto,
} from "./dto/amc.dto";

type AmcPathField = "amcPoPath" | "serviceReportPath" | "signedServiceReportPath";

const CONTACT_SOURCE = {
    site: "site_contacts",
    engineer: "service_engineer",
} as const;

@Injectable()
export class AmcService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async list(projectId?: number) {
        const where = projectId
            ? and(eq(amcs.projectId, projectId), isNull(amcs.deletedAt))
            : isNull(amcs.deletedAt);

        const amcRows = await this.db
            .select()
            .from(amcs)
            .where(where)
            .orderBy(asc(amcs.id));

        if (!amcRows.length) {
            return [];
        }

        const ids = amcRows.map(amc => amc.id);

        const [sites, products, contacts] = await Promise.all([
            this.db
                .select()
                .from(amcSites)
                .where(inArray(amcSites.amcId, ids))
                .orderBy(asc(amcSites.id)),
            this.db
                .select()
                .from(amcProducts)
                .where(inArray(amcProducts.amcId, ids))
                .orderBy(asc(amcProducts.id)),
            this.db
                .select()
                .from(amcContacts)
                .where(inArray(amcContacts.amcId, ids))
                .orderBy(asc(amcContacts.id)),
        ]);

        const engineerRows = contacts.filter(contact => contact.source === CONTACT_SOURCE.engineer);
        const siteContactRows = contacts.filter(contact => contact.source === CONTACT_SOURCE.site);

        return amcRows.map(amc => ({
            ...amc,
            sites: sites
                .filter(site => site.amcId === amc.id)
                .map(site => ({
                    ...site,
                    contacts: siteContactRows.filter(contact => contact.amcSiteId === site.id),
                })),
            products: products.filter(product => product.amcId === amc.id),
            serviceEngineers: engineerRows.filter(engineer => engineer.amcId === amc.id),
        }));
    }

    async getById(id: number) {
        const [amc] = await this.db
            .select()
            .from(amcs)
            .where(and(eq(amcs.id, id), isNull(amcs.deletedAt)))
            .limit(1);

        if (!amc) {
            throw new NotFoundException(`AMC with ID ${id} not found`);
        }

        const [sites, products, contacts] = await Promise.all([
            this.db
                .select()
                .from(amcSites)
                .where(eq(amcSites.amcId, id))
                .orderBy(asc(amcSites.id)),
            this.db
                .select()
                .from(amcProducts)
                .where(eq(amcProducts.amcId, id))
                .orderBy(asc(amcProducts.id)),
            this.db
                .select()
                .from(amcContacts)
                .where(eq(amcContacts.amcId, id))
                .orderBy(asc(amcContacts.id)),
        ]);

        const siteContacts = contacts.filter(contact => contact.source === CONTACT_SOURCE.site);

        const sitesWithContacts = sites.map(site => ({
            ...site,
            contacts: siteContacts.filter(c => c.amcSiteId === site.id),
        }));

        return {
            ...amc,
            sites: sitesWithContacts,
            products,
            serviceEngineers: contacts.filter(contact => contact.source === CONTACT_SOURCE.engineer),
        };
    }

    async create(dto: CreateAmcDto, createdBy?: number) {
        const amcId = await this.db.transaction(async tx => {
            const [amc] = await tx
                .insert(amcs)
                .values({
                    teamName: dto.teamName,
                    projectId: dto.projectId,
                    createdBy: createdBy ?? null,
                    allocatedTe: dto.allocatedTe ?? null,
                    serviceFrequency: dto.serviceFrequency,
                    amcStartDate: dto.amcStartDate,
                    nextServiceDue: dto.nextServiceDue ?? this.nextServiceDue(dto.amcStartDate, dto.serviceFrequency),
                    amcEndDate: dto.amcEndDate,
                    billFrequency: dto.billFrequency,
                    billType: dto.billType,
                    billValue: dto.billValue,
                    variableBills: dto.variableBills ?? null,
                    amcPoPath: dto.amcPoPath ?? null,
                    serviceReportPath: dto.serviceReportPath ?? null,
                    signedServiceReportPath: dto.signedServiceReportPath ?? null,
                })
                .returning();

            await this.replaceSites(tx, amc.id, dto.sites ?? []);
            await this.replaceProducts(tx, amc.id, dto.products ?? []);
            await this.replaceServiceEngineers(tx, amc.id, dto.serviceEngineers ?? []);

            return amc.id;
        });

        return this.getById(amcId);
    }

    async update(id: number, dto: UpdateAmcDto) {
        await this.ensureExists(id);

        let effectiveStartDate = dto.amcStartDate;
        let effectiveFrequency = dto.serviceFrequency;
        if (dto.nextServiceDue === undefined && dto.amcStartDate !== undefined) {
            if (effectiveFrequency === undefined) {
                effectiveFrequency = await this.frequencyOf(id);
            }
        }

        await this.db.transaction(async tx => {
            const patch: Record<string, unknown> = {};

            if (dto.teamName !== undefined) patch.teamName = dto.teamName;
            if (dto.projectId !== undefined) patch.projectId = dto.projectId;
            if (dto.allocatedTe !== undefined) patch.allocatedTe = dto.allocatedTe;
            if (dto.serviceFrequency !== undefined) patch.serviceFrequency = dto.serviceFrequency;
            if (dto.amcStartDate !== undefined) patch.amcStartDate = dto.amcStartDate;
            if (dto.nextServiceDue !== undefined) {
                patch.nextServiceDue = dto.nextServiceDue;
            } else if (effectiveStartDate !== undefined && effectiveFrequency !== undefined) {
                patch.nextServiceDue = this.nextServiceDue(effectiveStartDate, effectiveFrequency);
            }
            if (dto.amcEndDate !== undefined) patch.amcEndDate = dto.amcEndDate;
            if (dto.billFrequency !== undefined) patch.billFrequency = dto.billFrequency;
            if (dto.billType !== undefined) patch.billType = dto.billType;
            if (dto.billValue !== undefined) patch.billValue = dto.billValue;
            if (dto.variableBills !== undefined) patch.variableBills = dto.variableBills;
            if (dto.amcPoPath !== undefined) patch.amcPoPath = dto.amcPoPath;
            if (dto.serviceReportPath !== undefined) patch.serviceReportPath = dto.serviceReportPath;
            if (dto.signedServiceReportPath !== undefined) patch.signedServiceReportPath = dto.signedServiceReportPath;

            await tx.update(amcs).set(patch).where(eq(amcs.id, id));

            if (dto.sites !== undefined) await this.replaceSites(tx, id, dto.sites);
            if (dto.products !== undefined) await this.replaceProducts(tx, id, dto.products);
            if (dto.serviceEngineers !== undefined) await this.replaceServiceEngineers(tx, id, dto.serviceEngineers);
        });

        return this.getById(id);
    }

    async remove(id: number) {
        await this.ensureExists(id);
        await this.db
            .update(amcs)
            .set({ deletedAt: new Date() })
            .where(eq(amcs.id, id));
        return { id, deleted: true };
    }

    async setFilePath(id: number, field: AmcPathField, path: string | null, subKey?: "sample" | "filled") {
        await this.ensureExists(id);

        if (field === "serviceReportPath" && subKey && path) {
            const [amc] = await this.db
                .select({ serviceReportPath: amcs.serviceReportPath })
                .from(amcs)
                .where(eq(amcs.id, id))
                .limit(1);

            const current = Array.isArray(amc?.serviceReportPath)
                ? amc.serviceReportPath.filter((entry): entry is string => typeof entry === "string")
                : [];

            const others = current.filter(entry => !entry.startsWith(`${subKey}:`));
            const entry = `${subKey}:${path}`;
            let next: string[];
            if (subKey === "sample") {
                next = [entry, ...others];
            } else {
                const sample = others.find(e => e.startsWith("sample:"));
                const rest = others.filter(e => !e.startsWith("sample:"));
                next = sample ? [sample, entry, ...rest] : [entry, ...rest];
            }

            await this.db
                .update(amcs)
                .set({ serviceReportPath: next })
                .where(eq(amcs.id, id));
        } else {
            await this.db
                .update(amcs)
                .set({ [field]: path } as Record<string, unknown>)
                .where(eq(amcs.id, id));
        }

        return this.getById(id);
    }

    private async ensureExists(id: number) {
        const [amc] = await this.db
            .select({ id: amcs.id })
            .from(amcs)
            .where(and(eq(amcs.id, id), isNull(amcs.deletedAt)))
            .limit(1);

        if (!amc) {
            throw new NotFoundException(`AMC with ID ${id} not found`);
        }
    }

    private async frequencyOf(id: number) {
        const [amc] = await this.db
            .select({ serviceFrequency: amcs.serviceFrequency })
            .from(amcs)
            .where(eq(amcs.id, id))
            .limit(1);

        return amc?.serviceFrequency;
    }

    private nextServiceDue(startDate: string, frequency: string): string {
        const monthsByFrequency: Record<string, number> = {
            Monthly: 1,
            Quarterly: 3,
            "Half-Yearly": 6,
            Yearly: 12,
        };
        const months = monthsByFrequency[frequency] ?? 1;
        const date = new Date(`${startDate}T00:00:00`);
        if (isNaN(date.getTime())) {
            return startDate;
        }
        date.setMonth(date.getMonth() + months);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    private async replaceSites(
        tx: Parameters<Parameters<DbInstance["transaction"]>[0]>[0],
        amcId: number,
        sites: AmcSiteDto[],
    ) {
        const existingSites = await tx
            .select({ id: amcSites.id })
            .from(amcSites)
            .where(eq(amcSites.amcId, amcId));

        if (existingSites.length) {
            await tx
                .delete(amcContacts)
                .where(
                    and(
                        inArray(amcContacts.amcSiteId, existingSites.map(site => site.id)),
                        eq(amcContacts.source, CONTACT_SOURCE.site),
                    ),
                );
        }
        await tx.delete(amcSites).where(eq(amcSites.amcId, amcId));

        for (const site of sites) {
            const [insertedSite] = await tx
                .insert(amcSites)
                .values({
                    amcId,
                    name: site.name,
                    address: site.address,
                    mapLink: site.mapLink ?? null,
                    status: "Pending",
                })
                .returning();

            await this.replaceSiteContacts(tx, amcId, insertedSite.id, site.contacts ?? []);
        }
    }

    private async replaceSiteContacts(
        tx: Parameters<Parameters<DbInstance["transaction"]>[0]>[0],
        amcId: number,
        amcSiteId: number,
        contacts: AmcSiteContactDto[],
    ) {
        await tx
            .delete(amcContacts)
            .where(
                and(
                    eq(amcContacts.amcSiteId, amcSiteId),
                    eq(amcContacts.source, CONTACT_SOURCE.site),
                ),
            );

        if (contacts.length) {
            await tx.insert(amcContacts).values(
                contacts.map(contact => ({
                    amcId,
                    amcSiteId,
                    source: CONTACT_SOURCE.site,
                    name: contact.name,
                    organization: contact.organization ?? null,
                    mobile: contact.mobile,
                    email: contact.email ?? null,
                })),
            );
        }
    }

    private async replaceProducts(
        tx: Parameters<Parameters<DbInstance["transaction"]>[0]>[0],
        amcId: number,
        products: AmcProductDto[],
    ) {
        await tx.delete(amcProducts).where(eq(amcProducts.amcId, amcId));

        if (products.length) {
            await tx.insert(amcProducts).values(
                products.map(product => ({
                    amcId,
                    itemId: product.itemId,
                    description: product.description ?? null,
                    make: product.make ?? null,
                    model: product.model ?? null,
                    serialNo: product.serialNo ?? null,
                    quantity: product.quantity ?? 1,
                })),
            );
        }
    }

    private async replaceServiceEngineers(
        tx: Parameters<Parameters<DbInstance["transaction"]>[0]>[0],
        amcId: number,
        engineers: AmcServiceEngineerDto[],
    ) {
        await tx
            .delete(amcContacts)
            .where(
                and(
                    eq(amcContacts.amcId, amcId),
                    eq(amcContacts.source, CONTACT_SOURCE.engineer),
                ),
            );

        if (engineers.length) {
            await tx.insert(amcContacts).values(
                engineers.map(engineer => ({
                    amcId,
                    amcSiteId: null,
                    source: CONTACT_SOURCE.engineer,
                    name: engineer.name,
                    organization: engineer.organization ?? null,
                    mobile: engineer.mobile,
                    email: engineer.email ?? null,
                })),
            );
        }
    }
}