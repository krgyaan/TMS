import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import { insurancePolicies } from "@/db/schemas/accounts/insurance-policy.schema";
import { imprestCategories } from "@/db/schemas/accounts/imprest-categories.schema";
import { employeeImprests } from "@db/schemas/shared";
import { paymentRequests } from "@/db/schemas/operations/payment-requests.schema";
import { projects } from "@/db/schemas/master/projects.schema";
import { users } from "@/db/schemas";
import { wrapPaginatedResponse } from "@/utils/responseWrapper";
import type { CreateInsurancePolicyDto, InsurancePayload, UpdateInsurancePolicyDto } from "./zod/insurance-policy.schema";

export type InsuranceStatus = "Active" | "Expiring Soon" | "Expired";

export interface InsuranceListRow {
    id: number;
    insuranceType: string;
    policyNumber: string | null;
    insurerName: string | null;
    startDate: string | null;
    endDate: string | null;
    sumAssured: string;
    policyDocument: string[];
    lrCopy: string[] | null;
    imprestId: number | null;
    makerRequestId: number | null;
    projectId: number | null;
    paymentRequestId: number | null;
    projectName: string | null;
    linkedRequest: string | null;
    createdBy: number | null;
    createdByName: string | null;
    createdAt: Date;
    status: InsuranceStatus;
    daysRemaining: number;
}

export interface LinkedPaymentRequestDetails {
    paymentRequestId: number;
    requestNo: string | null;
    partyName: string | null;
    amount: string | null;
    paymentMode: string | null;
    status: string | null;
    requestedBy: number | null;
    requestedByName: string | null;
    createdAt: Date | null;
    projectId: number | null;
    utrNumber: string | null;
    rejectionReason: string | null;
}

export interface LinkedImprestDetails {
    imprestId: number;
    userId: number | null;
    userName: string | null;
    categoryName: string | null;
    projectName: string | null;
    amount: number | null;
    dateOfExpense: Date | null;
    approvalStatus: number | null;
}

export interface LinkedMakerRequestDetails {
    makerRequestId: number;
    requestNo: string | null;
    partyName: string | null;
    amount: string | null;
    paymentMode: string | null;
    status: string | null;
    requestedBy: number | null;
    requestedByName: string | null;
    createdAt: Date | null;
    projectId: number | null;
    utrNumber: string | null;
    rejectionReason: string | null;
}

export interface InsuranceDetailRow extends InsuranceListRow {
    linkedImprest: LinkedImprestDetails | null;
    linkedMakerRequest: LinkedMakerRequestDetails | null;
    linkedPaymentRequest: LinkedPaymentRequestDetails | null;
}

@Injectable()
export class InsurancePolicyService {
    constructor(
        @Inject(DRIZZLE)
        private readonly db: DbInstance
    ) {}

    private readonly imprestUser = alias(users, "imprest_user");
    private readonly makerRequestUser = alias(users, "maker_request_user");

    /* ------------------------- STATUS HELPERS ------------------------- */

    getStatus(endDate: string | Date, now = new Date()): InsuranceStatus {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const today = new Date(now);
        today.setHours(0, 0, 0, 0);

        if (end < today) return "Expired";
        const horizon = new Date(today);
        horizon.setDate(horizon.getDate() + 30);
        if (end <= horizon) return "Expiring Soon";
        return "Active";
    }

    getDaysRemaining(endDate: string | Date, now = new Date()): number {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }

    /* ----------------------------- CREATE ----------------------------- */

    async create(dto: CreateInsurancePolicyDto, userId: number) {
        const [policy] = await this.db
            .insert(insurancePolicies)
            .values({
                ...this.toValues(dto, userId),
                projectId: dto.projectId ?? null,
                paymentRequestId: dto.paymentRequestId ?? null,
            })
            .returning();

        await this.linkImprest(dto.imprestId ?? null, policy.id);
        return this.findOne(policy.id);
    }

    async createFromImprest(tx: DbInstance, dto: InsurancePayload, imprestId: number, userId: number) {
        const [policy] = await tx
            .insert(insurancePolicies)
            .values({ ...this.toValues(dto, userId), imprestId })
            .returning();

        await tx.update(employeeImprests).set({ insurancePolicyId: policy.id, updatedAt: new Date() }).where(eq(employeeImprests.id, imprestId));

        return policy;
    }

    async createFromMakerRequest(tx: DbInstance, dto: InsurancePayload, makerRequestId: number, userId: number) {
        const [policy] = await tx
            .insert(insurancePolicies)
            .values({ ...this.toValues(dto, userId), makerRequestId })
            .returning();

        return policy;
    }

    async createFromPaymentRequest(tx: DbInstance, dto: InsurancePayload, paymentRequestId: number, projectId: number, userId: number) {
        const [policy] = await tx
            .insert(insurancePolicies)
            .values({ ...this.toValues(dto, userId), projectId, paymentRequestId })
            .returning();

        return policy;
    }

    async upsertForImprest(tx: DbInstance, imprestId: number, dto: InsurancePayload, userId: number) {
        const [existing] = await tx.select({ id: insurancePolicies.id }).from(insurancePolicies).where(eq(insurancePolicies.imprestId, imprestId)).limit(1);

        if (existing) {
            const [policy] = await tx
                .update(insurancePolicies)
                .set({ ...this.toValues(dto, userId), updatedAt: new Date() })
                .where(eq(insurancePolicies.id, existing.id))
                .returning();
            return policy;
        }

        return this.createFromImprest(tx, dto, imprestId, userId);
    }

    /* ----------------------------- UPDATE ----------------------------- */

    async update(id: number, dto: UpdateInsurancePolicyDto) {
        const existing = await this.db.query.insurancePolicies.findFirst({
            where: eq(insurancePolicies.id, id),
        });

        if (!existing) {
            throw new NotFoundException("Insurance policy not found");
        }

        const patch: Record<string, unknown> = { updatedAt: new Date() };

        if (dto.insuranceType !== undefined) patch.insuranceType = dto.insuranceType;
        if (dto.policyNumber !== undefined) patch.policyNumber = dto.policyNumber;
        if (dto.insurerName !== undefined) patch.insurerName = dto.insurerName;
        if (dto.startDate !== undefined) patch.startDate = this.dateStr(dto.startDate);
        if (dto.endDate !== undefined) patch.endDate = this.dateStr(dto.endDate);
        if (dto.policyDocument !== undefined) patch.policyDocument = dto.policyDocument;
        if (dto.sumAssured !== undefined) patch.sumAssured = String(dto.sumAssured);
        if (dto.noOfManpower !== undefined) patch.noOfManpower = dto.noOfManpower;
        if (dto.manpowerNames !== undefined) patch.manpowerNames = dto.manpowerNames;
        if (dto.location !== undefined) patch.location = dto.location;
        if (dto.itemsCovered !== undefined) patch.itemsCovered = dto.itemsCovered;
        if (dto.lrCopy !== undefined) patch.lrCopy = dto.lrCopy;

        const [updated] = await this.db.update(insurancePolicies).set(patch).where(eq(insurancePolicies.id, id)).returning();

        return this.findOne(updated.id);
    }

    /* ------------------------------ READ ------------------------------ */

    async remove(id: number) {
        const existing = await this.db.query.insurancePolicies.findFirst({
            where: eq(insurancePolicies.id, id),
        });

        if (!existing) {
            throw new NotFoundException("Insurance policy not found");
        }

        if (existing.imprestId) {
            await this.unlinkFromImprest(this.db, existing.imprestId);
        }

        const [deleted] = await this.db.delete(insurancePolicies).where(eq(insurancePolicies.id, id)).returning({ id: insurancePolicies.id });
        return deleted ?? null;
    }

    async findAll(params?: { page?: number; limit?: number; search?: string; status?: string; insuranceType?: string }) {
        const page = Math.max(1, params?.page ?? 1);
        const limit = Math.max(1, Math.min(params?.limit ?? 50, 100));
        const offset = (page - 1) * limit;
        const search = params?.search?.trim();

        const searchCondition = search
            ? or(
                  ilike(insurancePolicies.policyNumber, `%${search}%`),
                  ilike(insurancePolicies.insurerName, `%${search}%`),
                  ilike(employeeImprests.projectName, `%${search}%`),
                  ilike(paymentRequests.requestNo, `%${search}%`)
              )
            : undefined;

        const statusFilter = params?.status ? this.statusCondition(params.status) : undefined;

        const typeFilter = params?.insuranceType ? eq(insurancePolicies.insuranceType, params.insuranceType) : undefined;

        const where = and(searchCondition, statusFilter, typeFilter);

        const [countRow] = await this.db
            .select({ total: sql<number>`COUNT(*)`.as("total") })
            .from(insurancePolicies)
            .leftJoin(employeeImprests, eq(employeeImprests.id, insurancePolicies.imprestId))
            .leftJoin(paymentRequests, eq(paymentRequests.id, insurancePolicies.paymentRequestId))
            .where(where);

        const rows = await this.db
            .select({
                id: insurancePolicies.id,
                insuranceType: insurancePolicies.insuranceType,
                policyNumber: insurancePolicies.policyNumber,
                insurerName: insurancePolicies.insurerName,
                startDate: insurancePolicies.startDate,
                endDate: insurancePolicies.endDate,
                sumAssured: insurancePolicies.sumAssured,
                policyDocument: insurancePolicies.policyDocument,
                lrCopy: insurancePolicies.lrCopy,
                noOfManpower: insurancePolicies.noOfManpower,
                manpowerNames: insurancePolicies.manpowerNames,
                location: insurancePolicies.location,
                itemsCovered: insurancePolicies.itemsCovered,
                imprestId: insurancePolicies.imprestId,
                makerRequestId: insurancePolicies.makerRequestId,
                projectId: insurancePolicies.projectId,
                paymentRequestId: insurancePolicies.paymentRequestId,
                projectName: sql<string>`COALESCE(${projects.projectName}, ${employeeImprests.projectName})`,
                linkedRequest: sql<string>`COALESCE(${paymentRequests.requestNo}, NULL)`,
                createdBy: insurancePolicies.createdBy,
                createdByName: users.name,
                createdAt: insurancePolicies.createdAt,
            })
            .from(insurancePolicies)
            .leftJoin(projects, eq(projects.id, insurancePolicies.projectId))
            .leftJoin(employeeImprests, eq(employeeImprests.id, insurancePolicies.imprestId))
            .leftJoin(paymentRequests, eq(paymentRequests.id, insurancePolicies.paymentRequestId))
            .leftJoin(users, eq(users.id, insurancePolicies.createdBy))
            .where(where)
            .orderBy(desc(insurancePolicies.createdAt))
            .limit(limit)
            .offset(offset);

        const now = new Date();
        const data: InsuranceListRow[] = rows.map(row => ({
            ...row,
            projectName: row.projectName || null,
            linkedRequest: row.paymentRequestId ? row.linkedRequest : row.makerRequestId ? row.linkedRequest : row.imprestId ? `Imprest #${row.imprestId}` : null,
            status: this.getStatus(row.endDate, now),
            daysRemaining: this.getDaysRemaining(row.endDate, now),
        }));

        return wrapPaginatedResponse(data, Number(countRow?.total ?? 0), page, limit);
    }

    async getByProject(projectId: number) {
        const [project] = await this.db.select({ id: projects.id, projectName: projects.projectName }).from(projects).where(eq(projects.id, projectId)).limit(1);

        if (!project) {
            return [];
        }

        const rows = await this.db
            .select({
                id: insurancePolicies.id,
                insuranceType: insurancePolicies.insuranceType,
                policyNumber: insurancePolicies.policyNumber,
                insurerName: insurancePolicies.insurerName,
                startDate: insurancePolicies.startDate,
                endDate: insurancePolicies.endDate,
                sumAssured: insurancePolicies.sumAssured,
                policyDocument: insurancePolicies.policyDocument,
                lrCopy: insurancePolicies.lrCopy,
                noOfManpower: insurancePolicies.noOfManpower,
                manpowerNames: insurancePolicies.manpowerNames,
                location: insurancePolicies.location,
                itemsCovered: insurancePolicies.itemsCovered,
                imprestId: insurancePolicies.imprestId,
                makerRequestId: insurancePolicies.makerRequestId,
                projectId: insurancePolicies.projectId,
                paymentRequestId: insurancePolicies.paymentRequestId,
                projectName: sql<string>`COALESCE(${projects.projectName}, ${employeeImprests.projectName})`,
                linkedRequest: sql<string>`COALESCE(${paymentRequests.requestNo}, NULL)`,
                createdBy: insurancePolicies.createdBy,
                createdByName: users.name,
                createdAt: insurancePolicies.createdAt,
            })
            .from(insurancePolicies)
            .leftJoin(projects, eq(projects.id, insurancePolicies.projectId))
            .leftJoin(paymentRequests, eq(paymentRequests.id, insurancePolicies.paymentRequestId))
            .leftJoin(employeeImprests, eq(employeeImprests.id, insurancePolicies.imprestId))
            .leftJoin(users, eq(users.id, insurancePolicies.createdBy))
            .where(or(eq(paymentRequests.projectId, projectId), sql`${employeeImprests.projectName} = ${project.projectName}`))
            .orderBy(desc(insurancePolicies.createdAt));

        const now = new Date();
        return rows.map(row => ({
            ...row,
            projectName: row.projectName || null,
            linkedRequest: row.paymentRequestId ? row.linkedRequest : row.makerRequestId ? row.linkedRequest : row.imprestId ? `Imprest #${row.imprestId}` : null,
            status: this.getStatus(row.endDate, now),
            daysRemaining: this.getDaysRemaining(row.endDate, now),
        }));
    }

    async findOne(id: number) {
        const rows = await this.db
            .select({
                id: insurancePolicies.id,
                insuranceType: insurancePolicies.insuranceType,
                policyNumber: insurancePolicies.policyNumber,
                insurerName: insurancePolicies.insurerName,
                startDate: insurancePolicies.startDate,
                endDate: insurancePolicies.endDate,
                sumAssured: insurancePolicies.sumAssured,
                policyDocument: insurancePolicies.policyDocument,
                lrCopy: insurancePolicies.lrCopy,
                noOfManpower: insurancePolicies.noOfManpower,
                manpowerNames: insurancePolicies.manpowerNames,
                location: insurancePolicies.location,
                itemsCovered: insurancePolicies.itemsCovered,
                imprestId: insurancePolicies.imprestId,
                makerRequestId: insurancePolicies.makerRequestId,
                projectId: insurancePolicies.projectId,
                paymentRequestId: insurancePolicies.paymentRequestId,
                projectName: sql<string>`COALESCE(${projects.projectName}, ${employeeImprests.projectName})`,
                linkedRequest: sql<string>`COALESCE(${paymentRequests.requestNo}, NULL)`,
                createdBy: insurancePolicies.createdBy,
                createdByName: users.name,
                createdAt: insurancePolicies.createdAt,
                updatedAt: insurancePolicies.updatedAt,
                imprestUserId: employeeImprests.userId,
                imprestUserName: this.imprestUser.name,
                categoryName: imprestCategories.name,
                imprestAmount: employeeImprests.amount,
                imprestDateOfExpense: employeeImprests.dateOfExpense,
                imprestApprovalStatus: employeeImprests.approvalStatus,
                mrPartyName: paymentRequests.partyName,
                mrAmount: paymentRequests.amount,
                mrPaymentMode: paymentRequests.paymentMode,
                mrStatus: paymentRequests.status,
                mrRequestedBy: paymentRequests.requestedBy,
                mrRequestedByName: this.makerRequestUser.name,
                mrCreatedAt: paymentRequests.createdAt,
                mrProjectId: paymentRequests.projectId,
                mrUtrNumber: paymentRequests.utrNumber,
                mrRejectionReason: paymentRequests.rejectionReason,
            })
            .from(insurancePolicies)
            .leftJoin(projects, eq(projects.id, insurancePolicies.projectId))
            .leftJoin(employeeImprests, eq(employeeImprests.id, insurancePolicies.imprestId))
            .leftJoin(paymentRequests, eq(paymentRequests.id, insurancePolicies.paymentRequestId))
            .leftJoin(users, eq(users.id, insurancePolicies.createdBy))
            .leftJoin(this.imprestUser, eq(this.imprestUser.id, employeeImprests.userId))
            .leftJoin(imprestCategories, eq(imprestCategories.id, employeeImprests.categoryId))
            .leftJoin(this.makerRequestUser, eq(this.makerRequestUser.id, paymentRequests.requestedBy))
            .where(eq(insurancePolicies.id, id))
            .limit(1);

        const row = rows[0];
        if (!row) {
            throw new NotFoundException("Insurance policy not found");
        }

        const now = new Date();
        const detail: InsuranceDetailRow = {
            ...row,
            projectName: row.projectName || null,
            linkedRequest: row.paymentRequestId ? row.linkedRequest : row.makerRequestId ? row.linkedRequest : row.imprestId ? `Imprest #${row.imprestId}` : null,
            status: this.getStatus(row.endDate, now),
            daysRemaining: this.getDaysRemaining(row.endDate, now),
            linkedImprest: row.imprestId
                ? {
                      imprestId: row.imprestId,
                      userId: row.imprestUserId,
                      userName: row.imprestUserName,
                      categoryName: row.categoryName,
                      projectName: row.projectName,
                      amount: row.imprestAmount,
                      dateOfExpense: row.imprestDateOfExpense,
                      approvalStatus: row.imprestApprovalStatus,
                  }
                : null,
            linkedMakerRequest: row.makerRequestId
                ? {
                      makerRequestId: row.makerRequestId,
                      requestNo: row.linkedRequest,
                      partyName: row.mrPartyName,
                      amount: row.mrAmount,
                      paymentMode: row.mrPaymentMode,
                      status: row.mrStatus,
                      requestedBy: row.mrRequestedBy,
                      requestedByName: row.mrRequestedByName,
                      createdAt: row.mrCreatedAt,
                      projectId: row.mrProjectId,
                      utrNumber: row.mrUtrNumber,
                      rejectionReason: row.mrRejectionReason,
                  }
                : null,
            linkedPaymentRequest: row.paymentRequestId
                ? {
                      paymentRequestId: row.paymentRequestId,
                      requestNo: row.linkedRequest,
                      partyName: row.mrPartyName,
                      amount: row.mrAmount,
                      paymentMode: row.mrPaymentMode,
                      status: row.mrStatus,
                      requestedBy: row.mrRequestedBy,
                      requestedByName: row.mrRequestedByName,
                      createdAt: row.mrCreatedAt,
                      projectId: row.mrProjectId,
                      utrNumber: row.mrUtrNumber,
                      rejectionReason: row.mrRejectionReason,
                  }
                : null,
        };
        return detail;
    }

    /* ----------------------------- DELETE ----------------------------- */

    async removeByImprestId(tx: DbInstance, imprestId: number) {
        const [deleted] = await tx.delete(insurancePolicies).where(eq(insurancePolicies.imprestId, imprestId)).returning({ id: insurancePolicies.id });
        return deleted ?? null;
    }

    async unlinkFromImprest(tx: DbInstance, imprestId: number) {
        await tx.update(insurancePolicies).set({ imprestId: null, updatedAt: new Date() }).where(eq(insurancePolicies.imprestId, imprestId));

        await tx.update(employeeImprests).set({ insurancePolicyId: null, updatedAt: new Date() }).where(eq(employeeImprests.id, imprestId));
    }

    /* ----------------------------- HELPERS ----------------------------- */

    private toValues(dto: CreateInsurancePolicyDto | InsurancePayload, userId: number) {
        return {
            insuranceType: dto.insuranceType,
            policyNumber: dto.policyNumber ?? null,
            insurerName: dto.insurerName ?? null,
            startDate: this.dateStr(dto.startDate),
            endDate: this.dateStr(dto.endDate),
            policyDocument: dto.policyDocument,
            sumAssured: String(dto.sumAssured),
            noOfManpower: dto.noOfManpower ?? null,
            manpowerNames: dto.manpowerNames ?? null,
            location: dto.location ?? null,
            itemsCovered: dto.itemsCovered ?? null,
            lrCopy: dto.lrCopy ?? null,
            createdBy: userId,
        };
    }

    private dateStr(date: Date | string): string {
        if (typeof date === "string") {
            return date;
        }
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }

    private statusCondition(status: string) {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const horizon = new Date(now);
        horizon.setDate(horizon.getDate() + 30);
        const horizonDate = `${horizon.getFullYear()}-${String(horizon.getMonth() + 1).padStart(2, "0")}-${String(horizon.getDate()).padStart(2, "0")}`;

        switch (status) {
            case "Expired":
                return sql`${insurancePolicies.endDate} < ${today}`;
            case "Expiring Soon":
                return sql`${insurancePolicies.endDate} >= ${today} AND ${insurancePolicies.endDate} <= ${horizonDate}`;
            case "Active":
            default:
                return sql`${insurancePolicies.endDate} > ${horizonDate}`;
        }
    }

    private async linkImprest(imprestId: number | null | undefined, policyId: number) {
        if (!imprestId) return;

        const [imprest] = await this.db.select({ id: employeeImprests.id }).from(employeeImprests).where(eq(employeeImprests.id, imprestId)).limit(1);

        if (!imprest) {
            throw new BadRequestException("Linked imprest not found");
        }

        await this.db.update(employeeImprests).set({ insurancePolicyId: policyId, updatedAt: new Date() }).where(eq(employeeImprests.id, imprestId));
    }
}
