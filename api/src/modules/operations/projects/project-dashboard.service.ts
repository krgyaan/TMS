import { Inject, Injectable, NotFoundException, Query } from "@nestjs/common";
import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
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

export interface ProjectListFilters {
    page?: number;
    limit?: number;
    search?: string;
    teamName?: string;
}

export interface ProjectListRow {
    id: number;
    poNo: string | null;
    projectCode: string | null;
    projectName: string | null;
    poDate: string | null;
    teamName: string | null;
    tenderId: number | null;
    tenderName: string | null;
    tenderNo: string | null;
    teamMemberName: string | null;
    enquiryId: number | null;
}

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

    async getProjectList(filters: ProjectListFilters = {}) {
        const page = filters.page && filters.page > 0 ? filters.page : 1;
        const limit = filters.limit && filters.limit > 0 ? filters.limit : 100;
        const offset = (page - 1) * limit;

        const whereConditions: any[] = [];

        if (filters.search) {
            const pattern = `%${filters.search}%`;
            whereConditions.push(
                or(
                    ilike(projects.projectName, pattern),
                    ilike(projects.projectCode, pattern),
                    ilike(projects.teamName, pattern),
                    ilike(projects.poNo, pattern),
                ),
            );
        }

        if (filters.teamName) {
            whereConditions.push(ilike(projects.teamName, `%${filters.teamName}%`));
        }

        const where = whereConditions.length > 0 ? and(...whereConditions) : undefined;

        const [rows, [{ total }]] = await Promise.all([
            this.db
                .select({
                    id: projects.id,
                    poNo: projects.poNo,
                    projectCode: projects.projectCode,
                    projectName: projects.projectName,
                    poDate: projects.poDate,
                    teamName: projects.teamName,
                    tenderId: projects.tenderId,
                    tenderName: tenderInfos.tenderName,
                    tenderNo: tenderInfos.tenderNo,
                    teamMemberName: users.name,
                    enquiryId: projects.enquiryId,
                })
                .from(projects)
                .leftJoin(tenderInfos, eq(tenderInfos.id, projects.tenderId as any))
                .leftJoin(users, eq(users.id, tenderInfos.teamMember as any))
                .where(where as any)
                .orderBy(desc(projects.poDate))
                .limit(limit)
                .offset(offset),
            this.db
                .select({ total: count() })
                .from(projects)
                .where(where as any),
        ]);

        const data: ProjectListRow[] = rows.map(row => ({
            id: Number(row.id),
            poNo: row.poNo,
            projectCode: row.projectCode,
            projectName: row.projectName,
            poDate: row.poDate,
            teamName: row.teamName,
            tenderId: row.tenderId,
            tenderName: row.tenderName,
            tenderNo: row.tenderNo,
            teamMemberName: row.teamMemberName,
            enquiryId: row.enquiryId,
        }));

        return {
            data,
            meta: {
                total: Number(total ?? 0),
                page,
                limit,
            },
        };
    }
}
