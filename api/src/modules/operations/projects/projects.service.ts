import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, like, desc } from "drizzle-orm";

import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";

import { projects } from "@/db/schemas/operations/projects.schema";
import { tenderInfos } from "@/db/schemas/tendering/tenders.schema";
import { woBasicDetails } from "@/db/schemas/operations/wo-basic-details.schema";
import { woDetails } from "@/db/schemas/operations/wo-details.schema";
import { woAcceptanceYes } from "@/db/schemas/operations/wo-acceptance-yes.schema";
import { employeeImprests } from "@/db/schemas/shared/employee-imprest.schema";
import { purchaseOrders } from "@/db/schemas/operations/purchase-orders.schema";
import { purchaseOrderProducts } from "@/db/schemas/operations/purchase-order-products.schema";
import { projectParties } from "@/db/schemas/operations/project-parties.schema";
import { teams } from "@/db/schemas/master/teams.schema";
import { organizations } from "@/db/schemas/master/organizations.schema";
import { items } from "@/db/schemas/master/items.schema";
import { locations } from "@/db/schemas/master/locations.schema";

@Injectable()
export class ProjectsService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

    // ================= DASHBOARD =================
    async getDashboardData(projectId: number) {
        const project = (await this.db.select().from(projects).where(eq(projects.id, projectId)))[0];

        if (!project) throw new NotFoundException("Project not found");
        let projectName = project.projectName;

        const tender = project.tenderId ? (await this.db.select().from(tenderInfos).where(eq(tenderInfos.id, project.tenderId)))[0] : undefined;

        const basicDetail = tender ? (await this.db.select().from(woBasicDetails).where(eq(woBasicDetails.tenderNameId, tender.id)))[0] : undefined;

        const woDetail = basicDetail ? (await this.db.select().from(woDetails).where(eq(woDetails.basicDetailId, basicDetail.id)))[0] : undefined;

        const woAcceptance = basicDetail ? (await this.db.select().from(woAcceptanceYes).where(eq(woAcceptanceYes.basicDetailId, basicDetail.id)))[0] : undefined;

        const imprests = project.projectName ? await this.db.select().from(employeeImprests).where(eq(employeeImprests.projectName, project.projectName)) : [];

        const imprestSum = imprests.reduce((s, i) => s + (i.amount ?? 0), 0);

        const purchaseOrdersData = tender ? await this.db.select().from(purchaseOrders).where(eq(purchaseOrders.tenderId, tender.id)) : [];

        return {
            project,
            tender,
            woBasicDetail: basicDetail,
            woDetail,
            woAcceptanceYes: woAcceptance,
            imprests,
            imprestSum,
            purchaseOrders: purchaseOrdersData,
        };
    }

    // ================= PO NUMBER =================
    private async generatePONumber(tenderId: number) {
        const tender = (await this.db.select().from(tenderInfos).where(eq(tenderInfos.id, tenderId)))[0];

        const team = (await this.db.select().from(teams).where(eq(teams.id, tender.team)))[0];
        const item = (await this.db.select().from(items).where(eq(items.id, tender.item)))[0];
        const org = tender.organization ? (await this.db.select().from(organizations).where(eq(organizations.id, tender.organization)))[0] : undefined;

        const location = tender.location ? (await this.db.select().from(locations).where(eq(locations.id, tender.location)))[0] : undefined;

        const teamName = team?.name?.toUpperCase() ?? "TEAM";
        const orgCode = org?.acronym?.toUpperCase() ?? "ORG";
        const itemName = item?.name?.toUpperCase() ?? "ITEM";
        const locCode = location?.acronym?.toUpperCase() ?? "LOC";

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const from = month >= 4 ? year.toString().slice(-2) : (year - 1).toString().slice(-2);
        const to = ((parseInt(from) + 1) % 100).toString().padStart(2, "0");
        const fy = `${from}${to}`;

        const prefix = `${teamName}/${fy}/${orgCode}/${itemName}/${locCode}`;

        const last = await this.db
            .select()
            .from(projects)
            .where(like(projects.projectCode, `${prefix}/%`))
            .orderBy(desc(projects.id));

        let next = 1;
        if (last[0]?.projectCode) {
            const match = last[0].projectCode.match(/(\d{4})$/);
            if (match) next = parseInt(match[1]) + 1;
        }

        return `${prefix}/${next.toString().padStart(4, "0")}`;
    }

    // ================= CREATE PO =================
    async createPurchaseOrder(body: any) {
        const poNumber = await this.generatePONumber(body.tenderId);

        const project = (await this.db.select().from(projects).where(eq(projects.tenderId, body.tenderId)))[0];

        const seller = (await this.db.select().from(projectParties).where(eq(projectParties.id, body.sellerId)))[0];

        const po = (
            await this.db
                .insert(purchaseOrders)
                .values({
                    ...body,
                    poNumber,
                    projectName: project?.projectName,
                    sellerName: seller?.name,
                    sellerAddress: seller?.address,
                    sellerEmail: seller?.email,
                    sellerGstNo: seller?.gstNo,
                    sellerPanNo: seller?.pan,
                    sellerMsmeNo: seller?.msme,
                })
                .returning()
        )[0];

        for (const product of body.products) {
            await this.db.insert(purchaseOrderProducts).values({
                purchaseOrderId: po.id,
                ...product,
            });
        }

        return po;
    }

    async getPurchaseOrder(id: number) {
        const po = (await this.db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)))[0];
        const products = await this.db.select().from(purchaseOrderProducts).where(eq(purchaseOrderProducts.purchaseOrderId, id));

        return { ...po, products };
    }

    async createParty(body: any) {
        return (await this.db.insert(projectParties).values(body).returning())[0];
    }
}
