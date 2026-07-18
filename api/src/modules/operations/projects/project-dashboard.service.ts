import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { DbInstance } from "@/db";
import { DRIZZLE } from "@/db/database.module";
import { projects } from "@/db/schemas/operations/projects.schema";
import { purchaseOrders } from "@/db/schemas/operations/purchase-orders.schema";
import { woBasicDetails, woDetails } from "@/db/schemas/operations/work-order.schema";
import { employeeImprests } from "@/db/schemas/shared/employee-imprest.schema";
import { tenderInfos } from "@/db/schemas/tendering/tenders.schema";
import { imprestCategories, tenderInformation, users } from "@/db/schemas";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

@Injectable()
export class ProjectDashboardService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,

        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger,
    ) {}

    async getOverview(projectId: number) {
        const [project] = await this.db
            .select({
                projectName: projects.projectName,
                tenderId: projects.tenderId,
            })
            .from(projects)
            .where(eq(projects.id, projectId));
        if (!project) throw new NotFoundException("Project not found");

        const [tender] = project.tenderId
            ? await this.db
                .select({ id: tenderInfos.id, tenderNumber: tenderInfos.tenderNo })
                .from(tenderInfos)
                .where(eq(tenderInfos.id, project.tenderId))
            : [];

        const [basicDetail] = tender
            ? await this.db
                .select({
                    id: woBasicDetails.id,
                    woValuePreGst: woBasicDetails.woValuePreGst,
                    woValueGstAmt: woBasicDetails.woValueGstAmt,
                    budget: woBasicDetails.budgetPreGst,
                    budgetSupply: woBasicDetails.budgetSupply,
                    budgetService: woBasicDetails.budgetService,
                    budgetFreight: woBasicDetails.budgetFreight,
                    budgetAdmin: woBasicDetails.budgetAdmin,
                    budgetBuybackSale: woBasicDetails.budgetBuybackSale,
                    budgetGemCharges: woBasicDetails.budgetGemCharges,
                })
                .from(woBasicDetails)
                .where(eq(woBasicDetails.tenderId, tender.id))
            : [];

        const [woDetail] = basicDetail
            ? await this.db
                .select({
                    ldApplicable: woDetails.ldApplicable,
                    maxLd: woDetails.maxLd,
                    ldStartDate: woDetails.ldStartDate,
                    maxLdDate: woDetails.maxLdDate,
                })
                .from(woDetails)
                .where(eq(woDetails.woBasicDetailId, basicDetail.id))
            : [];

        const [tenderInfo] = tender
            ? await this.db
                .select({
                    ldRequired: tenderInformation.ldRequired,
                    ldPercentagePerWeek: tenderInformation.ldPercentagePerWeek,
                    maxLdPercentage: tenderInformation.maxLdPercentage,
                })
                .from(tenderInformation)
                .where(eq(tenderInformation.tenderId, tender.id))
            : [];

        return {
            project: { projectName: project.projectName },
            tender: tender ?? undefined,
            woBasicDetail: basicDetail ?? {},
            woDetail: woDetail ?? undefined,
            tenderInfoSheet: tenderInfo ?? undefined,
        };
    }

    async getWorkOrders(projectId: number) {
        const workOrders = await this.db
                .select({
                    id: purchaseOrders.id,
                    poNumber: purchaseOrders.poNumber,
                    createdAt: purchaseOrders.createdAt,
                    sellerName: purchaseOrders.sellerName,
                })
                .from(purchaseOrders)
                .where(eq(purchaseOrders.projectId, projectId));

        return { woBasicDetail: workOrders };
    }

    async getImprests(projectId: number) {
        const [project] = await this.db
            .select({ projectName: projects.projectName })
            .from(projects)
            .where(eq(projects.id, projectId));
        if (!project) throw new NotFoundException("Project not found");

        const imprests = project.projectName
            ? await this.db.select({
                userName: users.name,
                partyName: employeeImprests.partyName,
                amount: employeeImprests.amount,
                category: imprestCategories.name,
                remark: employeeImprests.remark,
                approvalStatus: employeeImprests.approvalStatus,
                approvalDate: employeeImprests.approvedDate,
                proof: employeeImprests.invoiceProof,
            })
            .from(employeeImprests)
            .innerJoin(users, eq(users.id, employeeImprests.userId))
            .innerJoin(imprestCategories, eq(imprestCategories.id, employeeImprests.categoryId))
            .where(eq(employeeImprests.projectName, project.projectName))
            : [];
        const imprestSum = imprests.reduce((sum: number, item) => {
            return sum + Number(item.amount ?? 0);
        }, 0);
        return { imprests, imprestSum };
    }
}
