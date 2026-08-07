import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, and, isNull, isNotNull, asc, inArray, sql } from "drizzle-orm";
import type { DbInstance } from "@/db";
import { DRIZZLE } from "@/db/database.module";
import {
    amcs,
    amcSites,
    amcContacts,
    amcProducts,
    amcServices,
    amcBills,
} from "@/db/schemas";
import type {
    AmcProductDto,
    AmcServiceEngineerDto,
    AmcSiteContactDto,
    AmcSiteDto,
    CreateAmcDto,
    UpdateAmcDto,
    VariableBillItemDto,
} from "./dto/amc.dto";

type AmcPathField = "amcPoPath" | "serviceReportPath" | "signedServiceReportPath";
type Tx = Parameters<Parameters<DbInstance["transaction"]>[0]>[0];

const CONTACT_SOURCE = {
    site: "site_contacts",
    engineer: "service_engineer",
} as const;

const FREQUENCY_MONTHS: Record<string, number> = {
    Monthly: 1,
    Quarterly: 3,
    "Half-Yearly": 6,
    Yearly: 12,
};

const SERVICE_DONE_STATUS = "Done";

function addMonths(start: Date, months: number): Date {
    const date = new Date(start);
    date.setMonth(date.getMonth() + months);
    return date;
}

function fmtDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

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

        const [sites, products, contacts, services, bills] = await Promise.all([
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
            this.db
                .select()
                .from(amcServices)
                .where(inArray(amcServices.amcId, ids))
                .orderBy(asc(amcServices.serviceDueDate)),
            this.db
                .select()
                .from(amcBills)
                .where(inArray(amcBills.amcId, ids))
                .orderBy(asc(amcBills.billDueDate)),
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
            services: services.filter(service => service.amcId === amc.id),
            bills: bills.filter(bill => bill.amcId === amc.id),
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

        const [sites, products, contacts, services, bills] = await Promise.all([
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
            this.db
                .select()
                .from(amcServices)
                .where(eq(amcServices.amcId, id))
                .orderBy(asc(amcServices.serviceDueDate)),
            this.db
                .select()
                .from(amcBills)
                .where(eq(amcBills.amcId, id))
                .orderBy(asc(amcBills.billDueDate)),
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
            services,
            bills,
        };
    }

    async create(dto: CreateAmcDto, createdBy?: number) {
        const amcId = await this.db.transaction(async tx => {
            const serviceDueDates = this.dueDates(dto.amcStartDate, dto.amcEndDate, dto.serviceFrequency);

            const [amc] = await tx
                .insert(amcs)
                .values({
                    teamName: dto.teamName,
                    projectId: dto.projectId,
                    createdBy: createdBy ?? null,
                    allocatedTe: dto.allocatedTe ?? null,
                    serviceFrequency: dto.serviceFrequency,
                    amcStartDate: dto.amcStartDate,
                    nextServiceDue: serviceDueDates[0] ?? dto.amcStartDate,
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

            const siteIds = await this.replaceSites(tx, amc.id, dto.sites ?? []);
            await this.replaceProducts(tx, amc.id, dto.products ?? []);
            await this.replaceServiceEngineers(tx, amc.id, dto.serviceEngineers ?? []);

            await this.generateSchedule(tx, amc.id, {
                startDate: dto.amcStartDate,
                endDate: dto.amcEndDate,
                serviceFrequency: dto.serviceFrequency,
                billFrequency: dto.billFrequency,
                billType: dto.billType,
                billValue: dto.billValue ?? null,
                variableBills: dto.variableBills ?? null,
                siteIds,
            });

            return amc.id;
        });

        return this.getById(amcId);
    }

    async update(id: number, dto: UpdateAmcDto) {
        await this.ensureExists(id);

        const existing = await this.getById(id);

        const effStart = dto.amcStartDate ?? existing.amcStartDate;
        const effEnd = dto.amcEndDate ?? existing.amcEndDate;
        const effServiceFrequency = dto.serviceFrequency ?? existing.serviceFrequency;
        const effBillFrequency = dto.billFrequency ?? existing.billFrequency;
        const effBillType = dto.billType ?? existing.billType;
        const effBillValue = dto.billValue !== undefined ? dto.billValue : existing.billValue;
        const effVariableBills = dto.variableBills !== undefined
            ? dto.variableBills
            : (existing.variableBills as VariableBillItemDto[] | null);

        await this.db.transaction(async tx => {
            const patch: Record<string, unknown> = {};

            if (dto.teamName !== undefined) patch.teamName = dto.teamName;
            if (dto.projectId !== undefined) patch.projectId = dto.projectId;
            if (dto.allocatedTe !== undefined) patch.allocatedTe = dto.allocatedTe;
            if (dto.serviceFrequency !== undefined) patch.serviceFrequency = dto.serviceFrequency;
            if (dto.amcStartDate !== undefined) patch.amcStartDate = dto.amcStartDate;
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

            const scheduleChanged = [
                dto.amcStartDate,
                dto.amcEndDate,
                dto.serviceFrequency,
                dto.billFrequency,
                dto.billType,
                dto.billValue,
                dto.variableBills,
                dto.sites,
            ].some(value => value !== undefined);

            if (scheduleChanged && (await this.canRegenerate(tx, id))) {
                await tx.delete(amcServices).where(eq(amcServices.amcId, id));
                await tx.delete(amcBills).where(eq(amcBills.amcId, id));

                const siteIds = await this.siteIdsOf(tx, id);

                await this.generateSchedule(tx, id, {
                    startDate: effStart,
                    endDate: effEnd,
                    serviceFrequency: effServiceFrequency,
                    billFrequency: effBillFrequency,
                    billType: effBillType,
                    billValue: effBillValue,
                    variableBills: effVariableBills,
                    siteIds,
                });
            }

            const [firstPending] = await tx
                .select({ serviceDueDate: amcServices.serviceDueDate })
                .from(amcServices)
                .where(eq(amcServices.amcId, id))
                .orderBy(asc(amcServices.serviceDueDate))
                .limit(1);

            if (firstPending) {
                await tx
                    .update(amcs)
                    .set({ nextServiceDue: firstPending.serviceDueDate })
                    .where(eq(amcs.id, id));
            }
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

    // ── Schedule generation ────────────────────────────────────────────────

    private dueDates(startDate: string, endDate: string, frequency: string): string[] {
        const months = FREQUENCY_MONTHS[frequency] ?? 1;
        const start = new Date(`${startDate}T00:00:00`);
        const end = new Date(`${endDate}T00:00:00`);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return [];
        }

        const dates: string[] = [];
        for (let k = 1; ; k++) {
            const due = addMonths(start, k * months);
            if (due.getTime() > end.getTime()) break;
            dates.push(fmtDate(due));
        }
        return dates;
    }

    private billAmountFor(
        billDueDate: string,
        opts: {
            billType: string;
            billValue: string | null;
            variableBills: VariableBillItemDto[] | null;
        },
    ): string | null {
        const entry = opts.variableBills?.find(
            item => item.date === billDueDate || item.label === billDueDate,
        );

        if (entry?.amount != null) {
            return String(entry.amount);
        }

        if (opts.billType === "constant" && opts.billValue) {
            return opts.billValue;
        }

        return null;
    }

    private billForService(
        billDueDates: string[],
        billsBySiteAndDue: Map<string, number>,
        serviceDueDate: string,
        siteId: number,
    ): number | null {
        for (const due of billDueDates) {
            if (serviceDueDate <= due) {
                return billsBySiteAndDue.get(`${siteId}:${due}`) ?? null;
            }
        }
        return null;
    }

    private async generateSchedule(
        tx: Tx,
        amcId: number,
        opts: {
            startDate: string;
            endDate: string;
            serviceFrequency: string;
            billFrequency: string;
            billType: string;
            billValue: string | null;
            variableBills: VariableBillItemDto[] | null;
            siteIds: number[];
        },
    ) {
        if (!opts.siteIds.length) {
            return;
        }

        const billDueDates = this.dueDates(opts.startDate, opts.endDate, opts.billFrequency);
        const serviceDueDates = this.dueDates(opts.startDate, opts.endDate, opts.serviceFrequency);

        const billsBySiteAndDue = new Map<string, number>();

        for (const siteId of opts.siteIds) {
            for (let i = 0; i < billDueDates.length; i++) {
                const due = billDueDates[i];
                const [bill] = await tx
                    .insert(amcBills)
                    .values({
                        amcId,
                        amcSiteId: siteId,
                        billNo: i + 1,
                        billDueDate: due,
                        amount: this.billAmountFor(due, opts),
                    })
                    .returning();

                billsBySiteAndDue.set(`${siteId}:${due}`, bill.id);
            }
        }

        for (const siteId of opts.siteIds) {
            for (let i = 0; i < serviceDueDates.length; i++) {
                const due = serviceDueDates[i];
                await tx.insert(amcServices).values({
                    amcId,
                    amcSiteId: siteId,
                    billId: this.billForService(billDueDates, billsBySiteAndDue, due, siteId),
                    serviceNo: i + 1,
                    serviceDueDate: due,
                    status: "Pending",
                });
            }
        }
    }

    private async canRegenerate(tx: Tx, amcId: number): Promise<boolean> {
        const [doneService] = await tx
            .select({ id: amcServices.id })
            .from(amcServices)
            .where(
                and(
                    eq(amcServices.amcId, amcId),
                    eq(amcServices.status, SERVICE_DONE_STATUS),
                ),
            )
            .limit(1);

        if (doneService) {
            return false;
        }

        const [invoicedBill] = await tx
            .select({ id: amcBills.id })
            .from(amcBills)
            .where(and(eq(amcBills.amcId, amcId), sql`jsonb_array_length(${amcBills.invoices}) > 0`))
            .limit(1);

        return !invoicedBill;
    }

    private async siteIdsOf(tx: Tx, amcId: number): Promise<number[]> {
        const sites = await tx
            .select({ id: amcSites.id })
            .from(amcSites)
            .where(eq(amcSites.amcId, amcId))
            .orderBy(asc(amcSites.id));

        return sites.map(site => site.id);
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

    private async replaceSites(
        tx: Tx,
        amcId: number,
        sites: AmcSiteDto[],
    ): Promise<number[]> {
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

        const insertedSiteIds: number[] = [];

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

            insertedSiteIds.push(insertedSite.id);
            await this.replaceSiteContacts(tx, amcId, insertedSite.id, site.contacts ?? []);
        }

        return insertedSiteIds;
    }

    private async replaceSiteContacts(
        tx: Tx,
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
        tx: Tx,
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
        tx: Tx,
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
