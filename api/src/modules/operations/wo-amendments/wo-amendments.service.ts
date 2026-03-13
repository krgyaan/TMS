import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, desc, asc, sql, and, or, ilike, gte, lte } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { woAmendments,woDetails } from '@db/schemas/operations';
import type {
  CreateWoAmendmentDto,
  UpdateWoAmendmentDto,
  CreateBulkWoAmendmentsDto,
  WoAmendmentsQueryDto,
} from './dto/wo-amendments.dto';

export type WoAmendmentRow = typeof woAmendments.$inferSelect;

@Injectable()
export class WoAmendmentsService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  // ============================================
  // MAPPING FUNCTIONS
  // ============================================

  private mapCreateToDb(data: CreateWoAmendmentDto) {
    const now = new Date();
    return {
      woDetailId: data.woDetailId,
      pageNo: data.pageNo,
      clauseNo: data.clauseNo,
      currentStatement: data.currentStatement,
      correctedStatement: data.correctedStatement,
      createdAt: now,
      updatedAt: now,
    };
  }

  private mapUpdateToDb(data: UpdateWoAmendmentDto) {
    const out: Record<string, unknown> = { updatedAt: new Date() };

    if (data.pageNo !== undefined) out.pageNo = data.pageNo;
    if (data.clauseNo !== undefined) out.clauseNo = data.clauseNo;
    if (data.currentStatement !== undefined) out.currentStatement = data.currentStatement;
    if (data.correctedStatement !== undefined) out.correctedStatement = data.correctedStatement;

    return out as Partial<typeof woAmendments.$inferInsert>;
  }

  private mapRowToResponse(row: WoAmendmentRow) {
    return {
      id: row.id,
      woDetailId: row.woDetailId,
      pageNo: row.pageNo,
      clauseNo: row.clauseNo,
      currentStatement: row.currentStatement,
      correctedStatement: row.correctedStatement,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  private async verifyWoDetailExists(woDetailId: number) {
    const [detail] = await this.db
      .select({ id: woDetails.id })
      .from(woDetails)
      .where(eq(woDetails.id, woDetailId))
      .limit(1);

    if (!detail) {
      throw new NotFoundException(`WO Detail with ID ${woDetailId} not found`);
    }
  }

  private async updateWoDetailAmendmentFlag(woDetailId: number) {
    const [count] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(woAmendments)
      .where(eq(woAmendments.woDetailId, woDetailId));

    await this.db
      .update(woDetails)
      .set({
        woAmendmentNeeded: (count?.count ?? 0) > 0,
        updatedAt: new Date(),
      })
      .where(eq(woDetails.id, woDetailId));
  }

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  async findAll(filters?: WoAmendmentsQueryDto) {
    const page = filters?.page ?? 1;
    const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 100);
    const offset = (page - 1) * limit;
    const sortOrder = filters?.sortOrder ?? 'asc';
    const sortBy = filters?.sortBy ?? 'createdAt';
    const search = filters?.search?.trim();

    // Determine order column
    const orderColumnMap: Record<string, any> = {
      createdAt: woAmendments.createdAt,
      updatedAt: woAmendments.updatedAt,
      pageNo: woAmendments.pageNo,
      clauseNo: woAmendments.clauseNo,
    };
    const orderColumn = orderColumnMap[sortBy] ?? woAmendments.createdAt;
    const orderFn = sortOrder === 'desc' ? desc : asc;

    // Build conditions
    const conditions: any[] = [];

    // Search condition
    if (search) {
      conditions.push(
        or(
          ilike(woAmendments.pageNo, `%${search}%`),
          ilike(woAmendments.clauseNo, `%${search}%`),
          ilike(woAmendments.currentStatement, `%${search}%`),
          ilike(woAmendments.correctedStatement, `%${search}%`),
        ),
      );
    }

    // Filter conditions
    if (filters?.woDetailId) {
      conditions.push(eq(woAmendments.woDetailId, filters.woDetailId));
    }
    if (filters?.pageNo) {
      conditions.push(ilike(woAmendments.pageNo, `%${filters.pageNo}%`));
    }
    if (filters?.clauseNo) {
      conditions.push(ilike(woAmendments.clauseNo, `%${filters.clauseNo}%`));
    }

    // Date filters
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

    const total = countResult;
    const data = rows.map((r) => this.mapRowToResponse(r));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
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
      throw new NotFoundException(`WO Amendment with ID ${id} not found`);
    }

    return this.mapRowToResponse(row);
  }

  async findByWoDetailId(woDetailId: number) {
    await this.verifyWoDetailExists(woDetailId);

    const rows = await this.db
      .select()
      .from(woAmendments)
      .where(eq(woAmendments.woDetailId, woDetailId))
      .orderBy(asc(woAmendments.pageNo), asc(woAmendments.clauseNo));

    return rows.map((r) => this.mapRowToResponse(r));
  }

  async findByClause(woDetailId: number, clauseNo: string) {
    const rows = await this.db
      .select()
      .from(woAmendments)
      .where(
        and(
          eq(woAmendments.woDetailId, woDetailId),
          ilike(woAmendments.clauseNo, `%${clauseNo}%`),
        ),
      )
      .orderBy(asc(woAmendments.pageNo));

    return rows.map((r) => this.mapRowToResponse(r));
  }

  async create(data: CreateWoAmendmentDto) {
    await this.verifyWoDetailExists(data.woDetailId);

    const insertValues = this.mapCreateToDb(data);

    const [row] = await this.db
      .insert(woAmendments)
      .values(insertValues)
      .returning();

    // Update amendment flag on WO Detail
    await this.updateWoDetailAmendmentFlag(data.woDetailId);

    return this.mapRowToResponse(row!);
  }

  async createBulk(data: CreateBulkWoAmendmentsDto) {
    await this.verifyWoDetailExists(data.woDetailId);

    const now = new Date();
    const insertValues = data.amendments.map((a) => ({
      woDetailId: data.woDetailId,
      pageNo: a.pageNo,
      clauseNo: a.clauseNo,
      currentStatement: a.currentStatement,
      correctedStatement: a.correctedStatement,
      createdAt: now,
      updatedAt: now,
    }));

    const rows = await this.db
      .insert(woAmendments)
      .values(insertValues)
      .returning();

    // Update amendment flag on WO Detail
    await this.updateWoDetailAmendmentFlag(data.woDetailId);

    return {
      created: rows.length,
      data: rows.map((r) => this.mapRowToResponse(r)),
    };
  }

  async update(id: number, data: UpdateWoAmendmentDto) {
    await this.findById(id);

    const updateValues = this.mapUpdateToDb(data);

    const [row] = await this.db
      .update(woAmendments)
      .set(updateValues)
      .where(eq(woAmendments.id, id))
      .returning();

    if (!row) {
      throw new NotFoundException(`WO Amendment with ID ${id} not found`);
    }

    return this.mapRowToResponse(row);
  }

  async delete(id: number): Promise<void> {
    const amendment = await this.findById(id);

    await this.db.delete(woAmendments).where(eq(woAmendments.id, id));

    // Update amendment flag on WO Detail
    await this.updateWoDetailAmendmentFlag(amendment.woDetailId!);
  }

  async deleteAllByWoDetail(woDetailId: number): Promise<void> {
    await this.verifyWoDetailExists(woDetailId);

    await this.db
      .delete(woAmendments)
      .where(eq(woAmendments.woDetailId, woDetailId));

    // Update amendment flag on WO Detail
    await this.updateWoDetailAmendmentFlag(woDetailId);
  }

  // ============================================
  // UTILITY OPERATIONS
  // ============================================

  async getAmendmentsSummary(woDetailId: number) {
    await this.verifyWoDetailExists(woDetailId);

    const [summary] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        uniquePages: sql<number>`count(distinct ${woAmendments.pageNo})::int`,
        uniqueClauses: sql<number>`count(distinct ${woAmendments.clauseNo})::int`,
      })
      .from(woAmendments)
      .where(eq(woAmendments.woDetailId, woDetailId));

    // Get breakdown by page
    const byPage = await this.db
      .select({
        pageNo: woAmendments.pageNo,
        count: sql<number>`count(*)::int`,
      })
      .from(woAmendments)
      .where(eq(woAmendments.woDetailId, woDetailId))
      .groupBy(woAmendments.pageNo)
      .orderBy(asc(woAmendments.pageNo));

    return {
      woDetailId,
      summary,
      byPage,
    };
  }

  async getTopClausesStatistics() {
    const topClauses = await this.db
      .select({
        clauseNo: woAmendments.clauseNo,
        count: sql<number>`count(*)::int`,
      })
      .from(woAmendments)
      .groupBy(woAmendments.clauseNo)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    const topPages = await this.db
      .select({
        pageNo: woAmendments.pageNo,
        count: sql<number>`count(*)::int`,
      })
      .from(woAmendments)
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
