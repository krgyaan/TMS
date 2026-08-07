import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, and, asc, count, inArray, isNotNull } from "drizzle-orm";
import type { DbInstance } from "@/db";
import { DRIZZLE } from "@/db/database.module";
import {
    amcs,
    amcSites,
    amcContacts,
    amcServices,
    amcBills,
    projects,
} from "@/db/schemas";

const CONTACT_SOURCE = {
    site: "site_contacts",
    engineer: "service_engineer",
} as const;

@Injectable()
export class AmcBillingService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async list(amcId?: number) {
        const where = amcId
            ? eq(amcBills.amcId, amcId)
            : undefined;

        const rows = await this.db
            .select()
            .from(amcBills)
            .where(where)
            .orderBy(asc(amcBills.billDueDate));

        return this.enrichAll(rows);
    }

    async getById(id: number) {
        const [row] = await this.db
            .select()
            .from(amcBills)
            .where(eq(amcBills.id, id))
            .limit(1);

        if (!row) {
            throw new NotFoundException(`AMC bill with ID ${id} not found`);
        }

        const [enriched] = await this.enrichAll([row]);
        return enriched;
    }

    async addInvoices(id: number, filePaths: string[]) {
        await this.ensureExists(id);

        const [bill] = await this.db
            .select({ invoices: amcBills.invoices })
            .from(amcBills)
            .where(eq(amcBills.id, id))
            .limit(1);

        const currentInvoices = (bill?.invoices as string[]) ?? [];
        const updatedInvoices = [...currentInvoices, ...filePaths];

        await this.db
            .update(amcBills)
            .set({ invoices: updatedInvoices, status: "Bill Submitted" })
            .where(eq(amcBills.id, id));

        return this.getById(id);
    }

    async addReceipts(id: number, filePaths: string[]) {
        await this.ensureExists(id);

        const [bill] = await this.db
            .select({ paymentReceipts: amcBills.paymentReceipts })
            .from(amcBills)
            .where(eq(amcBills.id, id))
            .limit(1);

        const currentReceipts = (bill?.paymentReceipts as string[]) ?? [];
        const updatedReceipts = [...currentReceipts, ...filePaths];

        await this.db
            .update(amcBills)
            .set({ paymentReceipts: updatedReceipts, status: "Payment Received" })
            .where(eq(amcBills.id, id));

        return this.getById(id);
    }

    async removeInvoice(id: number, index: number) {
        await this.ensureExists(id);

        const [bill] = await this.db
            .select({ invoices: amcBills.invoices })
            .from(amcBills)
            .where(eq(amcBills.id, id))
            .limit(1);

        const currentInvoices = (bill?.invoices as string[]) ?? [];
        if (index < 0 || index >= currentInvoices.length) {
            throw new BadRequestException("Invalid invoice index");
        }

        const updatedInvoices = currentInvoices.filter((_, i) => i !== index);

        await this.db
            .update(amcBills)
            .set({ invoices: updatedInvoices })
            .where(eq(amcBills.id, id));

        return this.getById(id);
    }

    async removeReceipt(id: number, index: number) {
        await this.ensureExists(id);

        const [bill] = await this.db
            .select({ paymentReceipts: amcBills.paymentReceipts })
            .from(amcBills)
            .where(eq(amcBills.id, id))
            .limit(1);

        const currentReceipts = (bill?.paymentReceipts as string[]) ?? [];
        if (index < 0 || index >= currentReceipts.length) {
            throw new BadRequestException("Invalid receipt index");
        }

        const updatedReceipts = currentReceipts.filter((_, i) => i !== index);

        await this.db
            .update(amcBills)
            .set({ paymentReceipts: updatedReceipts })
            .where(eq(amcBills.id, id));

        return this.getById(id);
    }

    async followup(id: number) {
        await this.ensureExists(id);

        await this.db
            .update(amcBills)
            .set({ status: "Follow-up" })
            .where(eq(amcBills.id, id));

        return this.getById(id);
    }

    private async enrichAll(rows: (typeof amcBills.$inferSelect)[]) {
        if (!rows.length) {
            return [];
        }

        const amcIds = [...new Set(rows.map(row => row.amcId))];
        const siteIds = [...new Set(rows.map(row => row.amcSiteId))];
        const billIds = rows.map(row => row.id);

        const amcRows = amcIds.length
            ? await this.db
                  .select()
                  .from(amcs)
                  .where(inArray(amcs.id, amcIds))
            : [];

        const siteRows = siteIds.length
            ? await this.db
                  .select()
                  .from(amcSites)
                  .where(inArray(amcSites.id, siteIds))
            : [];

        const engineerRows = amcIds.length
            ? await this.db
                  .select()
                  .from(amcContacts)
                  .where(
                      and(
                          inArray(amcContacts.amcId, amcIds),
                          eq(amcContacts.source, CONTACT_SOURCE.engineer),
                      ),
                  )
            : [];

        const contactRows = siteIds.length
            ? await this.db
                  .select()
                  .from(amcContacts)
                  .where(
                      and(
                          inArray(amcContacts.amcSiteId, siteIds),
                          eq(amcContacts.source, CONTACT_SOURCE.site),
                      ),
                  )
            : [];

        const serviceRows = billIds.length
            ? await this.db
                  .select()
                  .from(amcServices)
                  .where(
                      and(
                          inArray(amcServices.billId, billIds),
                          isNotNull(amcServices.billId),
                      ),
                  )
                  .orderBy(asc(amcServices.serviceDueDate))
            : [];

        const projectRows = amcRows.length
            ? await this.db
                  .select({ id: projects.id, name: projects.projectName })
                  .from(projects)
                  .where(inArray(projects.id, amcRows.map(amc => amc.projectId)))
            : [];

        const amcById = new Map<number, (typeof amcRows)[number]>();
        for (const amc of amcRows) amcById.set(amc.id, amc);

        const siteById = new Map<number, (typeof siteRows)[number]>();
        for (const site of siteRows) siteById.set(site.id, site);

        const projectNameById = new Map<number, string | null>();
        for (const project of projectRows) projectNameById.set(project.id, project.name);

        const engineersByAmcId = new Map<number, (typeof engineerRows)[number][]>();
        for (const engineer of engineerRows) {
            const list = engineersByAmcId.get(engineer.amcId) ?? [];
            list.push(engineer);
            engineersByAmcId.set(engineer.amcId, list);
        }

        const contactsBySiteId = new Map<number, (typeof contactRows)[number][]>();
        for (const contact of contactRows) {
            if (contact.amcSiteId === null) continue;
            const list = contactsBySiteId.get(contact.amcSiteId) ?? [];
            list.push(contact);
            contactsBySiteId.set(contact.amcSiteId, list);
        }

        const servicesByBillId = new Map<number, (typeof serviceRows)[number][]>();
        for (const service of serviceRows) {
            if (service.billId === null) continue;
            const list = servicesByBillId.get(service.billId) ?? [];
            list.push(service);
            servicesByBillId.set(service.billId, list);
        }

        return rows.map(row => {
            const amc = amcById.get(row.amcId);
            const site = row.amcSiteId ? siteById.get(row.amcSiteId) : undefined;

            return {
                ...row,
                invoices: (row.invoices as string[]) ?? [],
                paymentReceipts: (row.paymentReceipts as string[]) ?? [],
                amc: amc
                    ? {
                          id: amc.id,
                          teamName: amc.teamName,
                          projectName: projectNameById.get(amc.projectId) ?? null,
                          allocatedTe: amc.allocatedTe,
                          signedServiceReportPath: amc.signedServiceReportPath,
                          serviceEngineers: engineersByAmcId.get(amc.id) ?? [],
                      }
                    : null,
                site: site
                    ? {
                          ...site,
                          contacts: row.amcSiteId ? (contactsBySiteId.get(row.amcSiteId) ?? []) : [],
                      }
                    : null,
                services: servicesByBillId.get(row.id) ?? [],
            };
        });
    }

    private async ensureExists(id: number) {
        const [row] = await this.db
            .select({ id: amcBills.id })
            .from(amcBills)
            .where(eq(amcBills.id, id))
            .limit(1);

        if (!row) {
            throw new NotFoundException(`AMC bill with ID ${id} not found`);
        }
    }
}