import { Injectable, NotFoundException, Inject, BadRequestException } from '@nestjs/common';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { privateCostingSheets } from '@db/schemas/crm/private-costing-sheets.schema';
import { leadEnquiries } from '@db/schemas/crm/lead-enquiries.schema';
import { users } from '@db/schemas/auth/users.schema';
import { vendors } from '@db/schemas/vendors/vendors.schema';
import { and, asc, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { SubmitCostingSheetDto, ResubmitCostingSheetDto, ApproveCostingSheetDto, RedoCostingSheetDto } from './dto/enquirycosting.dto';

export type EnquiryCostingListFilters = {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
};

export type EnquiryCostingWithNames = {
    id: number;
    enquiryId: number;
    enquiryNumber: string | null;
    enqName: string;
    createdByName: string | null;
    organizationName: string | null;
    orgAbbName: string | null;
    approxValue: string;
    finalPrice: string | null;
    receiptPreGst: string | null;
    budgetPreGst: string | null;
    grossMargin: string | null;
    approvedFinalPrice: string | null;
    approvedReceiptPreGst: string | null;
    approvedBudgetPreGst: string | null;
    approvedGrossMargin: string | null;
    preparedByName: string | null;
    status: string | null;
    sheetUrl: string | null;
    remarks: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
};

const preparedByUser = alias(users, 'prepared_by_user');
const createdByUser = alias(users, 'created_by_user');

@Injectable()
export class EnquiryCostingService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
    ) {}

    async findAll(filters?: EnquiryCostingListFilters): Promise<{
        data: EnquiryCostingWithNames[];
        meta: { total: number; page: number; limit: number; totalPages: number };
    }> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;
        const conditions: SQL[] = [];

        if (filters?.search) {
            const searchPattern = `%${filters.search}%`;
            conditions.push(
                or(
                    ilike(leadEnquiries.enqName, searchPattern),
                    ilike(leadEnquiries.enquiryNumber, searchPattern),
                    ilike(leadEnquiries.organizationName, searchPattern),
                    ilike(leadEnquiries.orgAbbName, searchPattern),
                ) as SQL
            );
        }

        if (filters?.status) {
            if (filters.status.includes(',')) {
                const statuses = filters.status.split(',').map(s => s.trim()).filter(Boolean);
                if (statuses.length > 0) {
                    conditions.push(
                        or(...statuses.map(s => eq(privateCostingSheets.status, s))) as SQL
                    );
                }
            } else {
                conditions.push(eq(privateCostingSheets.status, filters.status));
            }
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const [countResult] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(privateCostingSheets)
            .innerJoin(leadEnquiries, eq(privateCostingSheets.enquiryId, leadEnquiries.id))
            .where(whereClause);

        const total = Number(countResult?.count || 0);

        const sortFn = filters?.sortOrder === 'desc' ? desc : asc;
        let orderByClause: SQL<unknown>;

        switch (filters?.sortBy) {
            case 'enqName':       orderByClause = sortFn(leadEnquiries.enqName); break;
            case 'enquiryNumber': orderByClause = sortFn(leadEnquiries.enquiryNumber); break;
            case 'status':        orderByClause = sortFn(privateCostingSheets.status); break;
            case 'createdAt':     orderByClause = sortFn(privateCostingSheets.createdAt); break;
            default:              orderByClause = desc(privateCostingSheets.createdAt);
        }

        const rows = await this.db
            .select({
                id: privateCostingSheets.id,
                enquiryId: leadEnquiries.id,
                enquiryNumber: leadEnquiries.enquiryNumber,
                enqName: leadEnquiries.enqName,
                createdByName: createdByUser.name,
                organizationName: leadEnquiries.organizationName,
                orgAbbName: leadEnquiries.orgAbbName,
                approxValue: leadEnquiries.approxValue,
                finalPrice: privateCostingSheets.finalPrice,
                receiptPreGst: privateCostingSheets.receiptPreGst,
                budgetPreGst: privateCostingSheets.budgetPreGst,
                grossMargin: privateCostingSheets.grossMargin,
                approvedFinalPrice: privateCostingSheets.approvedFinalPrice,
                approvedReceiptPreGst: privateCostingSheets.approvedReceiptPreGst,
                approvedBudgetPreGst: privateCostingSheets.approvedBudgetPreGst,
                approvedGrossMargin: privateCostingSheets.approvedGrossMargin,
                preparedByName: preparedByUser.name,
                status: privateCostingSheets.status,
                sheetUrl: privateCostingSheets.sheetUrl,
                remarks: privateCostingSheets.remarks,
                createdAt: privateCostingSheets.createdAt,
                updatedAt: privateCostingSheets.updatedAt,
            })
            .from(privateCostingSheets)
            .innerJoin(leadEnquiries, eq(privateCostingSheets.enquiryId, leadEnquiries.id))
            .leftJoin(preparedByUser, eq(preparedByUser.id, privateCostingSheets.preparedBy))
            .leftJoin(createdByUser, eq(createdByUser.id, leadEnquiries.createdBy))
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset);

        return {
            data: rows.map(row => ({
                ...row,
                createdByName: row.createdByName ?? null,
                preparedByName: row.preparedByName ?? null,
            })),
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    async findById(id: number): Promise<EnquiryCostingWithNames> {
        const [row] = await this.db
            .select({
                id: privateCostingSheets.id,
                enquiryId: leadEnquiries.id,
                enquiryNumber: leadEnquiries.enquiryNumber,
                enqName: leadEnquiries.enqName,
                createdByName: createdByUser.name,
                organizationName: leadEnquiries.organizationName,
                orgAbbName: leadEnquiries.orgAbbName,
                approxValue: leadEnquiries.approxValue,
                finalPrice: privateCostingSheets.finalPrice,
                receiptPreGst: privateCostingSheets.receiptPreGst,
                budgetPreGst: privateCostingSheets.budgetPreGst,
                grossMargin: privateCostingSheets.grossMargin,
                approvedFinalPrice: privateCostingSheets.approvedFinalPrice,
                approvedReceiptPreGst: privateCostingSheets.approvedReceiptPreGst,
                approvedBudgetPreGst: privateCostingSheets.approvedBudgetPreGst,
                approvedGrossMargin: privateCostingSheets.approvedGrossMargin,
                preparedByName: preparedByUser.name,
                status: privateCostingSheets.status,
                sheetUrl: privateCostingSheets.sheetUrl,
                remarks: privateCostingSheets.remarks,
                createdAt: privateCostingSheets.createdAt,
                updatedAt: privateCostingSheets.updatedAt,
            })
            .from(privateCostingSheets)
            .innerJoin(leadEnquiries, eq(privateCostingSheets.enquiryId, leadEnquiries.id))
            .leftJoin(preparedByUser, eq(preparedByUser.id, privateCostingSheets.preparedBy))
            .leftJoin(createdByUser, eq(createdByUser.id, leadEnquiries.createdBy))
            .where(eq(privateCostingSheets.id, id))
            .limit(1);

        if (!row) throw new NotFoundException(`Costing sheet with ID ${id} not found`);

        return {
            ...row,
            createdByName: row.createdByName ?? null,
            preparedByName: row.preparedByName ?? null,
        };
    }

    async submitCostingSheet(data: SubmitCostingSheetDto, userId: number): Promise<{ success: boolean }> {
        const [enquiry] = await this.db
            .select()
            .from(leadEnquiries)
            .where(eq(leadEnquiries.id, data.enquiryId))
            .limit(1);

        if (!enquiry) throw new NotFoundException(`Lead enquiry with ID ${data.enquiryId} not found`);

        const title = enquiry.enqName || `Enquiry-${enquiry.id}`;

        const [existing] = await this.db
            .select()
            .from(privateCostingSheets)
            .where(eq(privateCostingSheets.enquiryId, data.enquiryId))
            .limit(1);

        if (existing) {
            await this.db
                .update(privateCostingSheets)
                .set({
                    title,
                    sheetUrl: enquiry.costingDocument,
                    preparedBy: userId,
                    status: 'Pending',
                    finalPrice: data.finalPrice ?? null,
                    receiptPreGst: data.receiptPreGst ?? null,
                    budgetPreGst: data.budgetPreGst ?? null,
                    grossMargin: data.grossMargin ?? null,
                    remarks: data.remarks ?? null,
                    updatedAt: new Date(),
                })
                .where(eq(privateCostingSheets.id, existing.id));
        } else {
            await this.db
                .insert(privateCostingSheets)
                .values({
                    enquiryId: data.enquiryId,
                    title,
                    sheetUrl: enquiry.costingDocument,
                    preparedBy: userId,
                    status: 'Pending',
                    finalPrice: data.finalPrice ?? null,
                    receiptPreGst: data.receiptPreGst ?? null,
                    budgetPreGst: data.budgetPreGst ?? null,
                    grossMargin: data.grossMargin ?? null,
                    remarks: data.remarks ?? null,
                });
        }

        await this.db
            .update(leadEnquiries)
            .set({ status: 'Costing Sheet Submitted', updatedAt: new Date() })
            .where(eq(leadEnquiries.id, data.enquiryId));

        return { success: true };
    }

    async findByEnquiryId(enquiryId: number): Promise<EnquiryCostingWithNames | null> {
        const [row] = await this.db
            .select({
                id: privateCostingSheets.id,
                enquiryId: leadEnquiries.id,
                enquiryNumber: leadEnquiries.enquiryNumber,
                enqName: leadEnquiries.enqName,
                createdByName: createdByUser.name,
                organizationName: leadEnquiries.organizationName,
                orgAbbName: leadEnquiries.orgAbbName,
                approxValue: leadEnquiries.approxValue,
                finalPrice: privateCostingSheets.finalPrice,
                receiptPreGst: privateCostingSheets.receiptPreGst,
                budgetPreGst: privateCostingSheets.budgetPreGst,
                grossMargin: privateCostingSheets.grossMargin,
                approvedFinalPrice: privateCostingSheets.approvedFinalPrice,
                approvedReceiptPreGst: privateCostingSheets.approvedReceiptPreGst,
                approvedBudgetPreGst: privateCostingSheets.approvedBudgetPreGst,
                approvedGrossMargin: privateCostingSheets.approvedGrossMargin,
                preparedByName: preparedByUser.name,
                status: privateCostingSheets.status,
                sheetUrl: privateCostingSheets.sheetUrl,
                remarks: privateCostingSheets.remarks,
                createdAt: privateCostingSheets.createdAt,
                updatedAt: privateCostingSheets.updatedAt,
            })
            .from(privateCostingSheets)
            .innerJoin(leadEnquiries, eq(privateCostingSheets.enquiryId, leadEnquiries.id))
            .leftJoin(preparedByUser, eq(preparedByUser.id, privateCostingSheets.preparedBy))
            .leftJoin(createdByUser, eq(createdByUser.id, leadEnquiries.createdBy))
            .where(eq(privateCostingSheets.enquiryId, enquiryId))
            .limit(1);

        if (!row) return null;

        return {
            ...row,
            createdByName: row.createdByName ?? null,
            preparedByName: row.preparedByName ?? null,
        };
    }

    async findByLeadId(leadId: number): Promise<EnquiryCostingWithNames[]> {
        const rows = await this.db
            .select({
                id: privateCostingSheets.id,
                enquiryId: leadEnquiries.id,
                enquiryNumber: leadEnquiries.enquiryNumber,
                enqName: leadEnquiries.enqName,
                createdByName: createdByUser.name,
                organizationName: leadEnquiries.organizationName,
                orgAbbName: leadEnquiries.orgAbbName,
                approxValue: leadEnquiries.approxValue,
                finalPrice: privateCostingSheets.finalPrice,
                receiptPreGst: privateCostingSheets.receiptPreGst,
                budgetPreGst: privateCostingSheets.budgetPreGst,
                grossMargin: privateCostingSheets.grossMargin,
                approvedFinalPrice: privateCostingSheets.approvedFinalPrice,
                approvedReceiptPreGst: privateCostingSheets.approvedReceiptPreGst,
                approvedBudgetPreGst: privateCostingSheets.approvedBudgetPreGst,
                approvedGrossMargin: privateCostingSheets.approvedGrossMargin,
                preparedByName: preparedByUser.name,
                status: privateCostingSheets.status,
                sheetUrl: privateCostingSheets.sheetUrl,
                remarks: privateCostingSheets.remarks,
                createdAt: privateCostingSheets.createdAt,
                updatedAt: privateCostingSheets.updatedAt,
            })
            .from(privateCostingSheets)
            .innerJoin(leadEnquiries, eq(privateCostingSheets.enquiryId, leadEnquiries.id))
            .leftJoin(preparedByUser, eq(preparedByUser.id, privateCostingSheets.preparedBy))
            .leftJoin(createdByUser, eq(createdByUser.id, leadEnquiries.createdBy))
            .where(eq(leadEnquiries.leadId, leadId))
            .orderBy(desc(privateCostingSheets.createdAt));

        return rows.map(row => ({
            ...row,
            createdByName: row.createdByName ?? null,
            preparedByName: row.preparedByName ?? null,
        }));
    }

    async resubmitCostingSheet(data: ResubmitCostingSheetDto, userId: number): Promise<{ success: boolean }> {
        const [existing] = await this.db
            .select()
            .from(privateCostingSheets)
            .where(eq(privateCostingSheets.enquiryId, data.enquiryId))
            .limit(1);

        if (!existing) throw new NotFoundException(`No costing sheet found for enquiry ID ${data.enquiryId}`);

        await this.db
            .update(privateCostingSheets)
            .set({
                preparedBy: userId,
                status: 'Pending',
                finalPrice: data.finalPrice ?? null,
                receiptPreGst: data.receiptPreGst ?? null,
                budgetPreGst: data.budgetPreGst ?? null,
                grossMargin: data.grossMargin ?? null,
                remarks: data.remarks ?? null,
                updatedAt: new Date(),
            })
            .where(eq(privateCostingSheets.id, existing.id));

        await this.db
            .update(leadEnquiries)
            .set({ status: 'Costing Sheet Resubmitted', updatedAt: new Date() })
            .where(eq(leadEnquiries.id, data.enquiryId));

        return { success: true };
    }

    async approveCosting(id: number, data: ApproveCostingSheetDto, userId: number): Promise<{ success: boolean }> {
        const [sheet] = await this.db
            .select()
            .from(privateCostingSheets)
            .where(eq(privateCostingSheets.id, id))
            .limit(1);

        if (!sheet) throw new NotFoundException(`Costing sheet with ID ${id} not found`);

        await this.db
            .update(privateCostingSheets)
            .set({
                status: 'Approved',
                approvedFinalPrice: data.finalPrice ?? null,
                approvedReceiptPreGst: data.receiptPreGst ?? null,
                approvedBudgetPreGst: data.budgetPreGst ?? null,
                approvedGrossMargin: data.grossMargin ?? null,
                oemVendorId: data.oemVendorId ?? null,
                approvalRemarks: data.approvalRemarks ?? null,
                approvedBy: userId,
                approvedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(privateCostingSheets.id, id));

        await this.db
            .update(leadEnquiries)
            .set({ status: 'Approved', updatedAt: new Date() })
            .where(eq(leadEnquiries.id, sheet.enquiryId));

        return { success: true };
    }

    async redoCosting(id: number, data: RedoCostingSheetDto, userId: number): Promise<{ success: boolean }> {
        const [sheet] = await this.db
            .select()
            .from(privateCostingSheets)
            .where(eq(privateCostingSheets.id, id))
            .limit(1);

        if (!sheet) throw new NotFoundException(`Costing sheet with ID ${id} not found`);

        await this.db
            .update(privateCostingSheets)
            .set({
                status: 'Redo',
                redoReason: data.reason,
                redoBy: userId,
                updatedAt: new Date(),
            })
            .where(eq(privateCostingSheets.id, id));

        await this.db
            .update(leadEnquiries)
            .set({ status: 'Redo', updatedAt: new Date() })
            .where(eq(leadEnquiries.id, sheet.enquiryId));

        return { success: true };
    }

    async rejectEnquiry(id: number, data: { reason?: string | null }, userId: number): Promise<{ success: boolean }> {
        const [sheet] = await this.db
            .select()
            .from(privateCostingSheets)
            .where(eq(privateCostingSheets.id, id))
            .limit(1);

        if (!sheet) throw new NotFoundException(`Costing sheet with ID ${id} not found`);

        await this.db
            .update(privateCostingSheets)
            .set({ status: 'Enquiry Rejected', updatedAt: new Date() })
            .where(eq(privateCostingSheets.id, id));

        await this.db
            .update(leadEnquiries)
            .set({ status: 'Rejected', rejectionReason: data.reason ?? null, updatedAt: new Date() })
            .where(eq(leadEnquiries.id, sheet.enquiryId));

        return { success: true };
    }
}
