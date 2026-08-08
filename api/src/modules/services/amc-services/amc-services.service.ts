import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, and, asc, inArray } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { DbInstance } from "@/db";
import { DRIZZLE } from "@/db/database.module";
import {
    amcs,
    amcSites,
    amcContacts,
    amcServices,
    projects,
} from "@/db/schemas";

const CONTACT_SOURCE = {
    site: "site_contacts",
    engineer: "service_engineer",
} as const;

type ReportField = "filledReport" | "signedReport";

@Injectable()
export class AmcServicesService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    async list(amcId?: number, siteId?: number) {
        const conditions: (SQL<unknown>)[] = [];
        if (amcId) conditions.push(eq(amcServices.amcId, amcId));
        if (siteId) conditions.push(eq(amcServices.amcSiteId, siteId));

        const where = conditions.length ? and(...conditions) : undefined;

        const rows = await this.db
            .select()
            .from(amcServices)
            .where(where)
            .orderBy(asc(amcServices.serviceDueDate));

        return this.enrichAll(rows);
    }

    async getById(id: number) {
        const [row] = await this.db
            .select()
            .from(amcServices)
            .where(eq(amcServices.id, id))
            .limit(1);

        if (!row) {
            throw new NotFoundException(`AMC service with ID ${id} not found`);
        }

        const [enriched] = await this.enrichAll([row]);
        return enriched;
    }

    async setReportPath(id: number, field: ReportField, path: string) {
        await this.ensureExists(id);

        if (field === "signedReport") {
            await this.db
                .update(amcServices)
                .set({
                    signedReport: path,
                    status: "Done",
                    serviceCompletedDate: new Date(),
                })
                .where(eq(amcServices.id, id));
            await this.advanceNextServiceDue(id);
        } else {
            await this.db
                .update(amcServices)
                .set({ filledReport: path })
                .where(eq(amcServices.id, id));
        }

        return this.getById(id);
    }

    private async advanceNextServiceDue(serviceId: number) {
        const [service] = await this.db
            .select({ amcId: amcServices.amcId })
            .from(amcServices)
            .where(eq(amcServices.id, serviceId))
            .limit(1);

        if (!service) return;

        const [amc] = await this.db
            .select({ amcEndDate: amcs.amcEndDate })
            .from(amcs)
            .where(eq(amcs.id, service.amcId))
            .limit(1);

        if (!amc) return;

        const [nextPending] = await this.db
            .select({ serviceDueDate: amcServices.serviceDueDate })
            .from(amcServices)
            .where(
                and(
                    eq(amcServices.amcId, service.amcId),
                    eq(amcServices.status, "Pending"),
                ),
            )
            .orderBy(asc(amcServices.serviceDueDate))
            .limit(1);

        await this.db
            .update(amcs)
            .set({ nextServiceDue: nextPending?.serviceDueDate ?? amc.amcEndDate })
            .where(eq(amcs.id, service.amcId));
    }

    private async enrichAll(rows: (typeof amcServices.$inferSelect)[]) {
        if (!rows.length) {
            return [];
        }

        const amcIds = [...new Set(rows.map(row => row.amcId))];
        const siteIds = [...new Set(rows.map(row => row.amcSiteId))];

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
            const site = siteById.get(row.amcSiteId);

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
                          contacts: contactsBySiteId.get(site.id) ?? [],
                      }
                    : null,
            };
        });
    }

    private async ensureExists(id: number) {
        const [row] = await this.db
            .select({ id: amcServices.id })
            .from(amcServices)
            .where(eq(amcServices.id, id))
            .limit(1);

        if (!row) {
            throw new NotFoundException(`AMC service with ID ${id} not found`);
        }
    }
}
