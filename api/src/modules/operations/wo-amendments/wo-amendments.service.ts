import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, desc, asc, sql, and, ilike, gte, lte } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { woAmendments, woDetails } from '@db/schemas/operations';
import type { CreateWoAmendmentDto, UpdateWoAmendmentDto, CreateBulkWoAmendmentsDto, TlReviewAmendmentDto, RecordClientResponseDto, WoAmendmentsQueryDto } from './dto/wo-amendments.dto';

export type WoAmendmentRow = typeof woAmendments.$inferSelect;

@Injectable()
export class WoAmendmentsService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  // MAPPING FUNCTIONS
  private mapRowToResponse(row: WoAmendmentRow) {
    return {
      id: row.id,
      woDetailId: row.woDetailId,
      createdByRole: row.createdByRole,
      pageNo: row.pageNo,
      clauseNo: row.clauseNo,
      currentStatement: row.currentStatement,
      correctedStatement: row.correctedStatement,
      tlApproved: row.tlApproved,
      tlRemarks: row.tlRemarks,
      tlReviewedAt: row.tlReviewedAt?.toISOString() ?? null,
      status: row.status,
      communicatedAt: row.communicatedAt?.toISOString() ?? null,
      communicatedBy: row.communicatedBy,
      clientResponse: row.clientResponse,
      clientProof: row.clientProof,
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      createdBy: row.createdBy,
      updatedBy: row.updatedBy,
    };
  }

  // CRUD OPERATIONS
  async findAll(filters?: WoAmendmentsQueryDto) {
    const page = filters?.page ?? 1;
    const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 100);
    const offset = (page - 1) * limit;
    const sortOrder = filters?.sortOrder ?? 'desc';
    const sortBy = filters?.sortBy ?? 'createdAt';

    const orderColumnMap: Record<string, any> = {
      createdAt: woAmendments.createdAt,
      updatedAt: woAmendments.updatedAt,
      pageNo: woAmendments.pageNo,
      clauseNo: woAmendments.clauseNo,
      status: woAmendments.status,
    };
    const orderColumn = orderColumnMap[sortBy] ?? woAmendments.createdAt;
    const orderFn = sortOrder === 'desc' ? desc : asc;

    const conditions: any[] = [];

    if (filters?.woDetailId) {
      conditions.push(eq(woAmendments.woDetailId, filters.woDetailId));
    }
    if (filters?.status) {
      conditions.push(eq(woAmendments.status, filters.status));
    }
    if (filters?.createdByRole) {
      conditions.push(eq(woAmendments.createdByRole, filters.createdByRole));
    }
    if (filters?.tlApproved !== undefined) {
      conditions.push(eq(woAmendments.tlApproved, filters.tlApproved));
    }
    if (filters?.pageNo) {
      conditions.push(ilike(woAmendments.pageNo, `%${filters.pageNo}%`));
    }
    if (filters?.clauseNo) {
      conditions.push(ilike(woAmendments.clauseNo, `%${filters.clauseNo}%`));
    }
    if (filters?.createdAtFrom) {
      conditions.push(gte(woAmendments.createdAt, new Date(filters.createdAtFrom)));
    }
    if (filters?.createdAtTo) {
      conditions.push(lte(woAmendments.createdAt, new Date(filters.createdAtTo)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult, rows] = await Promise.all([
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(woAmendments)
        .where(whereClause)
        .then(([r]) => Number(r?.count ?? 0)),
      this.db
        .select()
        .from(woAmendments)
        .where(whereClause)
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset),
    ]);

    return {
      data: rows.map((r) => this.mapRowToResponse(r)),
      meta: {
        total: countResult,
        page,
        limit,
        totalPages: Math.ceil(countResult / limit) || 1,
      },
    };
  }

  async findById(id: number) {
    const [row] = await this.db
      .select()
      .from(woAmendments)
      .where(eq(woAmendments.id, id))
      .limit(1);

    if (!row) {
      throw new NotFoundException(`Amendment with ID ${id} not found`);
    }

    return this.mapRowToResponse(row);
  }

  async findByWoDetailId(woDetailId: number) {
    const rows = await this.db
      .select()
      .from(woAmendments)
      .where(eq(woAmendments.woDetailId, woDetailId))
      .orderBy(desc(woAmendments.createdAt));

    return rows.map((r) => this.mapRowToResponse(r));
  }

  async findByClause(woDetailId: number, clauseNo: string) {
    const rows = await this.db
      .select()
      .from(woAmendments)
      .where(
        and(
          eq(woAmendments.woDetailId, woDetailId),
          eq(woAmendments.clauseNo, clauseNo)
        )
      )
      .orderBy(desc(woAmendments.createdAt));

    return rows.map((r) => this.mapRowToResponse(r));
  }

  async create(data: CreateWoAmendmentDto, userId?: number) {
    // Verify WO Detail exists
    const [detail] = await this.db
      .select({ id: woDetails.id })
      .from(woDetails)
      .where(eq(woDetails.id, data.woDetailId))
      .limit(1);

    if (!detail) {
      throw new NotFoundException(`WO Detail with ID ${data.woDetailId} not found`);
    }

    const now = new Date();

    const [row] = await this.db
      .insert(woAmendments)
      .values({
        woDetailId: data.woDetailId,
        createdByRole: data.createdByRole,
        pageNo: data.pageNo ?? null,
        clauseNo: data.clauseNo ?? null,
        currentStatement: data.currentStatement ?? null,
        correctedStatement: data.correctedStatement ?? null,
        status: 'draft',
        createdAt: now,
        updatedAt: now,
        createdBy: userId!,
      })
      .returning();

    // Update oeWoAmendmentNeeded flag
    await this.db
      .update(woDetails)
      .set({ oeWoAmendmentNeeded: true, updatedAt: now })
      .where(eq(woDetails.id, data.woDetailId));

    return this.mapRowToResponse(row!);
  }

  async createBulk(data: CreateBulkWoAmendmentsDto, userId?: number) {
    // Verify WO Detail exists
    const [detail] = await this.db
      .select({ id: woDetails.id })
      .from(woDetails)
      .where(eq(woDetails.id, data.woDetailId))
      .limit(1);

    if (!detail) {
      throw new NotFoundException(`WO Detail with ID ${data.woDetailId} not found`);
    }

    const now = new Date();

    const insertValues = data.amendments.map((a) => ({
      woDetailId: data.woDetailId,
      createdByRole: data.createdByRole,
      pageNo: a.pageNo ?? null,
      clauseNo: a.clauseNo ?? null,
      currentStatement: a.currentStatement ?? null,
      correctedStatement: a.correctedStatement ?? null,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      createdBy: userId!,
    }));

    const rows = await this.db.insert(woAmendments).values(insertValues).returning();

    // Update oeWoAmendmentNeeded flag
    await this.db
      .update(woDetails)
      .set({ oeWoAmendmentNeeded: true, updatedAt: now })
      .where(eq(woDetails.id, data.woDetailId));

    return {
      count: rows.length,
      amendments: rows.map((r) => this.mapRowToResponse(r)),
    };
  }

  async update(id: number, data: UpdateWoAmendmentDto, userId?: number) {
    await this.findById(id);

    const updateValues: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: userId ?? null,
    };

    if (data.pageNo !== undefined) updateValues.pageNo = data.pageNo;
    if (data.clauseNo !== undefined) updateValues.clauseNo = data.clauseNo;
    if (data.currentStatement !== undefined) updateValues.currentStatement = data.currentStatement;
    if (data.correctedStatement !== undefined) updateValues.correctedStatement = data.correctedStatement;
    if (data.status !== undefined) updateValues.status = data.status;

    const [row] = await this.db
      .update(woAmendments)
      .set(updateValues as Partial<typeof woAmendments.$inferInsert>)
      .where(eq(woAmendments.id, id))
      .returning();

    return this.mapRowToResponse(row!);
  }

  async delete(id: number): Promise<void> {
    const amendment = await this.findById(id);

    await this.db.delete(woAmendments).where(eq(woAmendments.id, id));

    // Check if any amendments remain
    const remaining = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(woAmendments)
      .where(eq(woAmendments.woDetailId, amendment.woDetailId))
      .then(([r]) => Number(r?.count ?? 0));

    if (remaining === 0) {
      await this.db
        .update(woDetails)
        .set({ oeWoAmendmentNeeded: false, updatedAt: new Date() })
        .where(eq(woDetails.id, amendment.woDetailId));
    }
  }

  async deleteAllByWoDetail(woDetailId: number): Promise<{ count: number }> {
    const deleted = await this.db
      .delete(woAmendments)
      .where(eq(woAmendments.woDetailId, woDetailId))
      .returning();

    await this.db
      .update(woDetails)
      .set({ oeWoAmendmentNeeded: false, updatedAt: new Date() })
      .where(eq(woDetails.id, woDetailId));

    return { count: deleted.length };
  }

  // TL REVIEW
  async tlReview(id: number, data: TlReviewAmendmentDto, userId?: number) {
    const amendment = await this.findById(id);

    if (amendment.status !== 'submitted') {
      throw new BadRequestException('Amendment must be in submitted status for TL review');
    }

    const now = new Date();

    const [row] = await this.db
      .update(woAmendments)
      .set({
        tlApproved: data.approved,
        tlRemarks: data.remarks ?? null,
        tlReviewedAt: now,
        status: data.approved ? 'tl_approved' : 'tl_rejected',
        updatedAt: now,
        updatedBy: userId ?? null,
      })
      .where(eq(woAmendments.id, id))
      .returning();

    return this.mapRowToResponse(row!);
  }

  async approve(id: number, remarks?: string, userId?: number) {
    return this.tlReview(id, { approved: true, remarks }, userId);
  }

  async reject(id: number, remarks: string, userId?: number) {
    return this.tlReview(id, { approved: false, remarks }, userId);
  }

  // CLIENT COMMUNICATION
  async markCommunicated(id: number, userId?: number) {
    const amendment = await this.findById(id);

    if (amendment.status !== 'tl_approved') {
      throw new BadRequestException('Amendment must be TL approved before communicating');
    }

    const now = new Date();

    const [row] = await this.db
      .update(woAmendments)
      .set({
        communicatedAt: now,
        communicatedBy: userId ?? null,
        status: 'communicated',
        updatedAt: now,
        updatedBy: userId ?? null,
      })
      .where(eq(woAmendments.id, id))
      .returning();

    return this.mapRowToResponse(row!);
  }

  async recordClientResponse(id: number, data: RecordClientResponseDto, userId?: number) {
    const amendment = await this.findById(id);

    if (amendment.status !== 'communicated') {
      throw new BadRequestException('Amendment must be communicated before recording response');
    }

    const now = new Date();

    const [row] = await this.db
      .update(woAmendments)
      .set({
        clientResponse: data.response,
        clientProof: data.proof ?? null,
        status: 'client_acknowledged',
        updatedAt: now,
        updatedBy: userId ?? null,
      })
      .where(eq(woAmendments.id, id))
      .returning();

    return this.mapRowToResponse(row!);
  }

  async markResolved(id: number, userId?: number) {
    const now = new Date();

    const [row] = await this.db
      .update(woAmendments)
      .set({
        resolvedAt: now,
        status: 'resolved',
        updatedAt: now,
        updatedBy: userId ?? null,
      })
      .where(eq(woAmendments.id, id))
      .returning();

    return this.mapRowToResponse(row!);
  }

  async markRejectedByClient(id: number, userId?: number) {
    const now = new Date();

    const [row] = await this.db
      .update(woAmendments)
      .set({
        status: 'rejected_by_client',
        updatedAt: now,
        updatedBy: userId ?? null,
      })
      .where(eq(woAmendments.id, id))
      .returning();

    return this.mapRowToResponse(row!);
  }

  // SUMMARY/STATISTICS
  async getSummary(woDetailId: number) {
    const [summary] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter (where ${woAmendments.status} in ('draft', 'submitted'))::int`,
        approved: sql<number>`count(*) filter (where ${woAmendments.status} = 'tl_approved')::int`,
        rejected: sql<number>`count(*) filter (where ${woAmendments.status} = 'tl_rejected')::int`,
        communicated: sql<number>`count(*) filter (where ${woAmendments.status} = 'communicated')::int`,
        resolved: sql<number>`count(*) filter (where ${woAmendments.status} = 'resolved')::int`,
      })
      .from(woAmendments)
      .where(eq(woAmendments.woDetailId, woDetailId));

    return {
      woDetailId,
      ...summary,
    };
  }

  async getTopClausesStatistics() {
    const topClauses = await this.db
      .select({
        clauseNo: woAmendments.clauseNo,
        count: sql<number>`count(*)::int`,
      })
      .from(woAmendments)
      .where(sql`${woAmendments.clauseNo} is not null`)
      .groupBy(woAmendments.clauseNo)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    const topPages = await this.db
      .select({
        pageNo: woAmendments.pageNo,
        count: sql<number>`count(*)::int`,
      })
      .from(woAmendments)
      .where(sql`${woAmendments.pageNo} is not null`)
      .groupBy(woAmendments.pageNo)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    return {
      topClauses,
      topPages,
      generatedAt: new Date().toISOString(),
    };
  }
}
