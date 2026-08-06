import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, and, desc, inArray } from "drizzle-orm";
import type { DbInstance } from "@/db";
import { DRIZZLE } from "@/db/database.module";
import {
    amcs,
    amcSites,
    amcContacts,
    amcCompletedServices,
    projects,
} from "@/db/schemas";
import type {
    CreateAmcBillingDto,
    UpdateAmcBillingDto,
} from "./dto/amc-billing.dto";

const DEFAULT_STATUS = "Signed Service reports Received";
const CONTACT_SOURCE = {
    site: "site_contacts",
    engineer: "service_engineer",
} as const;

@Injectable()
export class AmcBillingService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async list(amcId?: number) {
        const where = amcId
            ? eq(amcCompletedServices.amcId, amcId)
            : undefined;

        const rows = await this.db
            .select()
            .from(amcCompletedServices)
            .where(where)
            .orderBy(desc(amcCompletedServices.serviceCompletedDate));

        return this.enrichAll(rows);
    }

    async getById(id: number) {
        const [row] = await this.db
            .select()
            .from(amcCompletedServices)
            .where(eq(amcCompletedServices.id, id))
            .limit(1);

        if (!row) {
            throw new NotFoundException(`Completed service with ID ${id} not found`);
        }

        const [enriched] = await this.enrichAll([row]);
        return enriched;
    }

    async create(dto: CreateAmcBillingDto) {
        const [row] = await this.db
            .insert(amcCompletedServices)
            .values({
                amcId: dto.amcId,
                amcSiteId: dto.amcSiteId ?? null,
                serviceDueDate: dto.serviceDueDate ?? null,
                serviceCompletedDate: dto.serviceCompletedDate
                    ? new Date(dto.serviceCompletedDate)
                    : null,
                notes: dto.notes ?? null,
                status: dto.status ?? DEFAULT_STATUS,
                invoice: dto.invoice ?? null,
                paymentReceipt: dto.paymentReceipt ?? null,
            })
            .returning();

        return this.getById(row.id);
    }

    async update(id: number, dto: UpdateAmcBillingDto) {
        await this.ensureExists(id);

        const patch: Record<string, unknown> = {};

        if (dto.amcId !== undefined) patch.amcId = dto.amcId;
        if (dto.amcSiteId !== undefined) patch.amcSiteId = dto.amcSiteId;
        if (dto.serviceDueDate !== undefined) patch.serviceDueDate = dto.serviceDueDate;
        if (dto.serviceCompletedDate !== undefined) {
            patch.serviceCompletedDate = dto.serviceCompletedDate
                ? new Date(dto.serviceCompletedDate)
                : null;
        }
        if (dto.notes !== undefined) patch.notes = dto.notes;
        if (dto.status !== undefined) patch.status = dto.status;
        if (dto.invoice !== undefined) patch.invoice = dto.invoice;
        if (dto.paymentReceipt !== undefined) patch.paymentReceipt = dto.paymentReceipt;

        await this.db
            .update(amcCompletedServices)
            .set(patch)
            .where(eq(amcCompletedServices.id, id));

        return this.getById(id);
    }

    async setFilePath(id: number, field: "invoice" | "paymentReceipt", path: string) {
        await this.ensureExists(id);

        const status = field === "invoice" ? "Bill Submitted" : "Payment Received";

        await this.db
            .update(amcCompletedServices)
            .set({ [field]: path, status } as Record<string, unknown>)
            .where(eq(amcCompletedServices.id, id));

        return this.getById(id);
    }

    async remove(id: number) {
        await this.ensureExists(id);
        await this.db
            .delete(amcCompletedServices)
            .where(eq(amcCompletedServices.id, id));
        return { id, deleted: true };
    }

    private async enrichAll(rows: (typeof amcCompletedServices.$inferSelect)[]) {
        if (!rows.length) {
            return [];
        }

        const amcIds = [...new Set(rows.map(row => row.amcId))];
        const siteIds = [...new Set(rows.map(row => row.amcSiteId).filter((id): id is number => !!id))];

        const amcRows = await this.db
            .select()
            .from(amcs)
            .where(inArray(amcs.id, amcIds));

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

        return rows.map(row => {
            const amc = amcById.get(row.amcId);
            const site = row.amcSiteId ? siteById.get(row.amcSiteId) : undefined;

            return {
                ...row,
                amc: amc
                    ? {
                          id: amc.id,
                          teamName: amc.teamName,
                          projectName: projectNameById.get(amc.projectId) ?? null,
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
            };
        });
    }

    private async ensureExists(id: number) {
        const [row] = await this.db
            .select({ id: amcCompletedServices.id })
            .from(amcCompletedServices)
            .where(eq(amcCompletedServices.id, id))
            .limit(1);

        if (!row) {
            throw new NotFoundException(`Completed service with ID ${id} not found`);
        }
    }
}
