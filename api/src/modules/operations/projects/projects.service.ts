import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, like, desc } from "drizzle-orm";

import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";

import { projects } from "@/db/schemas/operations/projects.schema";
import { tenderInfos } from "@/db/schemas/tendering/tenders.schema";
import { woBasicDetails, woDetails } from "@/db/schemas/operations/work-order.schema";
import { employeeImprests } from "@/db/schemas/shared/employee-imprest.schema";
import { purchaseOrders } from "@/db/schemas/operations/purchase-orders.schema";
import { purchaseOrderProducts } from "@/db/schemas/operations/purchase-order-products.schema";
import { projectParties } from "@/db/schemas/operations/project-parties.schema";
import { teams } from "@/db/schemas/master/teams.schema";
import { organizations } from "@/db/schemas/master/organizations.schema";
import { items } from "@/db/schemas/master/items.schema";
import { locations } from "@/db/schemas/master/locations.schema";
import { imprestCategories, users } from "@/db/schemas";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

@Injectable()
export class ProjectsService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        
        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger,
    ) {}

    // ================= DASHBOARD =================
    async getDashboardData(projectId: number) {
        const project = (await this.db.select().from(projects).where(eq(projects.id, projectId)))[0];

        if (!project) throw new NotFoundException("Project not found");
        let projectName = project.projectName;

        const tender = project.tenderId ? (await this.db.select().from(tenderInfos).where(eq(tenderInfos.id, project.tenderId)))[0] : undefined;

        const basicDetail = tender ? (await this.db.select().from(woBasicDetails).where(eq(woBasicDetails.tenderId, tender.id)))[0] : undefined;

        const woDetail = basicDetail ? (await this.db.select().from(woDetails).where(eq(woDetails.woBasicDetailId, basicDetail.id)))[0] : undefined;

        const woAcceptance = basicDetail ? (await this.db.select().from(woDetails).where(eq(woDetails.woBasicDetailId, basicDetail.id)))[0] : undefined;

        const imprests = project.projectName ? await this.db.select({
            id: employeeImprests.id,
            amount: employeeImprests.amount,
            projectName: employeeImprests.projectName,
            partyName: employeeImprests.partyName,
            category: imprestCategories.name,
            status: employeeImprests.status,
            approvalDate: employeeImprests.approvedDate,
            proof: employeeImprests.invoiceProof,
            remark: employeeImprests.remark,
            userId: employeeImprests.userId,
            userName: users.name,
        })
        .from(employeeImprests)
        .innerJoin(users, eq(users.id, employeeImprests.userId))
        .innerJoin(imprestCategories, eq(imprestCategories.id, employeeImprests.categoryId))
        .where(eq(employeeImprests.projectName, project.projectName)) : [];

        const imprestSum = imprests.reduce((sum: number, item) => {
            return sum + Number(item.amount ?? 0);
        }, 0);

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

    const project = (
        await this.db
        .select()
        .from(projects)
        .where(eq(projects.tenderId, body.tenderId))
    )[0];

    // Insert the purchase order
    const po = (
        await this.db
        .insert(purchaseOrders)
        .values({
            tenderId: body.tenderId,
            poNumber,
            poDate: body.poDate,
            projectName: project?.projectName,
            
            // Seller Info
            sellerName: body.sellerName,
            sellerAddress: body.sellerAddress,
            sellerEmail: body.sellerEmail,
            sellerGstNo: body.sellerGstNo,
            sellerPanNo: body.sellerPanNo,
            sellerMsmeNo: body.sellerMsmeNo,
            
            // Ship To Info
            shipToName: body.shipToName,
            shippingAddress: body.shippingAddress,
            shipToGst: body.shipToGst,
            shipToPan: body.shipToPan,
            
            // Optional fields
            quotationNo: body.quotationNo,
            quotationDate: body.quotationDate,
            paymentTerms: body.paymentTerms,
            deliveryPeriod: body.deliveryPeriod,
            remarks: body.remarks,
        })
        .returning()
    )[0];

    // Insert products
    if (body.products && body.products.length > 0) {
        for (const product of body.products) {
        await this.db.insert(purchaseOrderProducts).values({
            purchaseOrderId: po.id,
            description: product.description,
            hsnSac: product.hsnSac,
            qty: product.qty,
            rate: product.rate.toString(),
            gstRate: product.gstRate.toString(),
        });
        }
    }

    this.logger.info(`Purchase Order created: ${poNumber}`);
    return po;
    }

    async getPurchaseOrder(id: number) {
        const po = (await this.db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)))[0];
        if (!po) throw new NotFoundException("Purchase Order not found");
        const poProducts = await this.db.select().from(purchaseOrderProducts).where(eq(purchaseOrderProducts.purchaseOrderId, id));
        return { ...po, products: poProducts };
    }

    async createParty(body: any) {
    const party = (
        await this.db
        .insert(projectParties)
        .values({
            name: body.name,
            email: body.email || null,
            address: body.address || null,
            gstNo: body.gstNo || null,
            pan: body.pan || null,
            msme: body.msme || null,
        })
        .returning()
    )[0];

    this.logger.info(`Party created: ${party.name} (ID: ${party.id})`);
    return party;
    }

    async listParties() {
    const res = await this.db
        .select()
        .from(projectParties)
        .orderBy(desc(projectParties.createdAt));
    return res;
    }
}
