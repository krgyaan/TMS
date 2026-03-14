import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, desc, asc, sql, and, or, ilike, gte, lte, isNull, isNotNull } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { woQueries, woDetails } from '@db/schemas/operations';
import type {
  CreateWoQueryDto,
  RespondToQueryDto,
  CloseQueryDto,
  UpdateQueryStatusDto,
  WoQueriesQueryDto,
  CreateBulkWoQueriesDto,
} from './dto/wo-queries.dto';

export type WoQueryRow = typeof woQueries.$inferSelect;

// SLA Constants (in hours)
const QUERY_RAISE_SLA = 24; // TL has 24hrs to raise queries
const RESPONSE_SLA = 24; // TE/OE has 24hrs to respond
const FINAL_DECISION_SLA = 12; // TL has 12hrs for final decision after response

@Injectable()
export class WoQueriesService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  // ============================================
  // MAPPING FUNCTIONS
  // ============================================

  private mapRowToResponse(row: WoQueryRow) {
    return {
      id: row.id,
      woDetailId: row.woDetailId,
      queryBy: row.queryBy,
      queryTo: row.queryTo,
      queryText: row.queryText,
      queryRaisedAt: row.queryRaisedAt,
      responseText: row.responseText,
      respondedBy: row.respondedBy,
      respondedAt: row.respondedAt,
      status: row.status,
      createdAt: row.createdAt,
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

  private isOverdue(queryRaisedAt: Date, respondedAt: Date | null): boolean {
    if (respondedAt) {
      return false;
    }

    const deadline = new Date(queryRaisedAt.getTime() + RESPONSE_SLA * 60 * 60 * 1000);
    return new Date() > deadline;
  }

  private calculateResponseTime(queryRaisedAt: Date, respondedAt: Date): number {
    return (respondedAt.getTime() - queryRaisedAt.getTime()) / (1000 * 60 * 60); // Hours
  }

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  async findAll(filters?: WoQueriesQueryDto) {
    const page = filters?.page ?? 1;
    const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 100);
    const offset = (page - 1) * limit;
    const sortOrder = filters?.sortOrder ?? 'desc';
    const sortBy = filters?.sortBy ?? 'queryRaisedAt';
    const search = filters?.search?.trim();

    // Determine order column
    const orderColumnMap: Record<string, any> = {
      queryRaisedAt: woQueries.queryRaisedAt,
      respondedAt: woQueries.respondedAt,
      status: woQueries.status,
      createdAt: woQueries.createdAt,
    };
    const orderColumn = orderColumnMap[sortBy] ?? woQueries.queryRaisedAt;
    const orderFn = sortOrder === 'desc' ? desc : asc;

    // Build conditions
    const conditions: any[] = [];

    if (search) {
      conditions.push(
        or(
          ilike(woQueries.queryText, `%${search}%`),
          ilike(woQueries.responseText, `%${search}%`),
        ),
      );
    }

    if (filters?.woDetailId) {
      conditions.push(eq(woQueries.woDetailId, filters.woDetailId));
    }
    if (filters?.status) {
      conditions.push(eq(woQueries.status, filters.status));
    }
    if (filters?.queryTo) {
      conditions.push(eq(woQueries.queryTo, filters.queryTo));
    }
    if (filters?.queryBy) {
      conditions.push(eq(woQueries.queryBy, filters.queryBy));
    }
    if (filters?.respondedBy) {
      conditions.push(eq(woQueries.respondedBy, filters.respondedBy));
    }

    // Date filters
    if (filters?.queryRaisedFrom) {
      conditions.push(gte(woQueries.queryRaisedAt, new Date(filters.queryRaisedFrom)));
    }
    if (filters?.queryRaisedTo) {
      conditions.push(lte(woQueries.queryRaisedAt, new Date(filters.queryRaisedTo)));
    }
    if (filters?.respondedFrom) {
      conditions.push(gte(woQueries.respondedAt, new Date(filters.respondedFrom)));
    }
    if (filters?.respondedTo) {
      conditions.push(lte(woQueries.respondedAt, new Date(filters.respondedTo)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult, rows] = await Promise.all([
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(woQueries)
        .where(whereClause)
        .then(([r]) => Number(r?.count ?? 0)),
      this.db
        .select()
        .from(woQueries)
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
      .from(woQueries)
      .where(eq(woQueries.id, id))
      .limit(1);

    if (!row) {
      throw new NotFoundException(`WO Query with ID ${id} not found`);
    }

    const response = this.mapRowToResponse(row);
    const isOverdue = this.isOverdue(
      new Date(row.queryRaisedAt!),
      row.respondedAt ? new Date(row.respondedAt) : null,
    );

    return {
      ...response,
      isOverdue,
      responseDeadline: new Date(
        new Date(row.queryRaisedAt!).getTime() + RESPONSE_SLA * 60 * 60 * 1000,
      ).toISOString(),
    };
  }

  async findByWoDetailId(woDetailId: number) {
    await this.verifyWoDetailExists(woDetailId);

    const rows = await this.db
      .select()
      .from(woQueries)
      .where(eq(woQueries.woDetailId, woDetailId))
      .orderBy(desc(woQueries.queryRaisedAt));

    return rows.map((r) => this.mapRowToResponse(r));
  }

  async findPendingByWoDetail(woDetailId: number) {
    await this.verifyWoDetailExists(woDetailId);

    const rows = await this.db
      .select()
      .from(woQueries)
      .where(
        and(
          eq(woQueries.woDetailId, woDetailId),
          eq(woQueries.status, 'pending'),
        ),
      )
      .orderBy(asc(woQueries.queryRaisedAt));

    return {
      count: rows.length,
      data: rows.map((r) => {
        const isOverdue = this.isOverdue(
          new Date(r.queryRaisedAt!),
          null,
        );
        return {
          ...this.mapRowToResponse(r),
          isOverdue,
        };
      }),
    };
  }

  async findAllPending() {
    const rows = await this.db
      .select()
      .from(woQueries)
      .where(eq(woQueries.status, 'pending'))
      .orderBy(asc(woQueries.queryRaisedAt));

    return {
      count: rows.length,
      data: rows.map((r) => {
        const isOverdue = this.isOverdue(new Date(r.queryRaisedAt!), null);
        return {
          ...this.mapRowToResponse(r),
          isOverdue,
        };
      }),
    };
  }

  async findAllOverdue() {
    const deadline = new Date(Date.now() - RESPONSE_SLA * 60 * 60 * 1000);

    const rows = await this.db
      .select()
      .from(woQueries)
      .where(
        and(
          eq(woQueries.status, 'pending'),
          lte(woQueries.queryRaisedAt, deadline),
        ),
      )
      .orderBy(asc(woQueries.queryRaisedAt));

    return {
      count: rows.length,
      overdueThresholdHours: RESPONSE_SLA,
      data: rows.map((r) => {
        const hoursOverdue = Math.round(
          (Date.now() - new Date(r.queryRaisedAt!).getTime()) / (1000 * 60 * 60) - RESPONSE_SLA,
        );
        return {
          ...this.mapRowToResponse(r),
          hoursOverdue,
        };
      }),
    };
  }

  async findByUser(userId: number, type: 'raised' | 'received') {
    const condition =
      type === 'raised'
        ? eq(woQueries.queryBy, userId)
        : eq(woQueries.respondedBy, userId);

    const rows = await this.db
      .select()
      .from(woQueries)
      .where(condition)
      .orderBy(desc(woQueries.queryRaisedAt));

    return rows.map((r) => this.mapRowToResponse(r));
  }

  async create(data: CreateWoQueryDto) {
    await this.verifyWoDetailExists(data.woDetailId);

    const now = new Date();

    const [row] = await this.db
      .insert(woQueries)
      .values({
        woDetailId: data.woDetailId,
        queryBy: data.queryBy,
        queryTo: data.queryTo,
        queryText: data.queryText,
        queryRaisedAt: now,
        status: 'pending',
        createdAt: now,
      })
      .returning();

    // Update TL query timestamp on WO Detail
    await this.db
      .update(woDetails)
      .set({ tlQueryRaisedAt: now, updatedAt: now })
      .where(eq(woDetails.id, data.woDetailId));

    return this.mapRowToResponse(row!);
  }

  async createBulk(data: CreateBulkWoQueriesDto) {
    await this.verifyWoDetailExists(data.woDetailId);

    const now = new Date();
    const insertValues = data.queries.map((q) => ({
      woDetailId: data.woDetailId,
      queryBy: data.queryBy,
      queryTo: q.queryTo,
      queryText: q.queryText,
      queryRaisedAt: now,
      status: 'pending' as const,
      createdAt: now,
    }));

    const rows = await this.db
      .insert(woQueries)
      .values(insertValues)
      .returning();

    // Update TL query timestamp on WO Detail
    await this.db
      .update(woDetails)
      .set({ tlQueryRaisedAt: now, updatedAt: now })
      .where(eq(woDetails.id, data.woDetailId));

    return {
      created: rows.length,
      data: rows.map((r) => this.mapRowToResponse(r)),
    };
  }

  async respond(id: number, data: RespondToQueryDto) {
    const query = await this.findById(id);

    if (query.status === 'closed') {
      throw new BadRequestException('Cannot respond to a closed query');
    }

    if (query.status === 'responded') {
      throw new BadRequestException('Query has already been responded to');
    }

    const now = new Date();

    const [row] = await this.db
      .update(woQueries)
      .set({
        responseText: data.responseText,
        respondedBy: data.respondedBy,
        respondedAt: now,
        status: 'responded',
      })
      .where(eq(woQueries.id, id))
      .returning();

    const responseTime = this.calculateResponseTime(
      new Date(row!.queryRaisedAt!),
      now,
    );

    return {
      ...this.mapRowToResponse(row!),
      responseTimeHours: Math.round(responseTime * 100) / 100,
      withinSla: responseTime <= RESPONSE_SLA,
    };
  }

  async close(id: number, data: CloseQueryDto) {
    await this.findById(id);

    const [row] = await this.db
      .update(woQueries)
      .set({ status: 'closed' })
      .where(eq(woQueries.id, id))
      .returning();

    return {
      ...this.mapRowToResponse(row!),
      closedBy: data.closedBy ?? null,
      closureNotes: data.closureNotes ?? null,
    };
  }

  async updateStatus(id: number, data: UpdateQueryStatusDto) {
    await this.findById(id);

    const [row] = await this.db
      .update(woQueries)
      .set({ status: data.status })
      .where(eq(woQueries.id, id))
      .returning();

    return this.mapRowToResponse(row!);
  }

  async reopen(id: number) {
    const query = await this.findById(id);

    if (query.status !== 'closed') {
      throw new BadRequestException('Can only reopen closed queries');
    }

    const [row] = await this.db
      .update(woQueries)
      .set({ status: 'pending' })
      .where(eq(woQueries.id, id))
      .returning();

    return {
      ...this.mapRowToResponse(row!),
      message: 'Query reopened successfully',
    };
  }

  async delete(id: number): Promise<void> {
    const [row] = await this.db
      .delete(woQueries)
      .where(eq(woQueries.id, id))
      .returning();

    if (!row) {
      throw new NotFoundException(`WO Query with ID ${id} not found`);
    }
  }

  // ============================================
  // DASHBOARD/STATISTICS
  // ============================================

  async getDashboardSummary() {
    const [summary] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter (where ${woQueries.status} = 'pending')::int`,
        responded: sql<number>`count(*) filter (where ${woQueries.status} = 'responded')::int`,
        closed: sql<number>`count(*) filter (where ${woQueries.status} = 'closed')::int`,
        toTe: sql<number>`count(*) filter (where ${woQueries.queryTo} = 'TE')::int`,
        toOe: sql<number>`count(*) filter (where ${woQueries.queryTo} = 'OE')::int`,
        toBoth: sql<number>`count(*) filter (where ${woQueries.queryTo} = 'BOTH')::int`,
      })
      .from(woQueries);

    // Count overdue
    const deadline = new Date(Date.now() - RESPONSE_SLA * 60 * 60 * 1000);
    const [overdueCount] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(woQueries)
      .where(
        and(
          eq(woQueries.status, 'pending'),
          lte(woQueries.queryRaisedAt, deadline),
        ),
      );

    return {
      summary: {
        ...summary,
        overdue: overdueCount?.count ?? 0,
      },
      slaThresholds: {
        queryRaiseSlaHours: QUERY_RAISE_SLA,
        responseSlaHours: RESPONSE_SLA,
        finalDecisionSlaHours: FINAL_DECISION_SLA,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  async getResponseTimeStatistics() {
    const respondedQueries = await this.db
      .select({
        queryRaisedAt: woQueries.queryRaisedAt,
        respondedAt: woQueries.respondedAt,
      })
      .from(woQueries)
      .where(
        and(
          eq(woQueries.status, 'responded'),
          isNotNull(woQueries.respondedAt),
        ),
      );

    if (respondedQueries.length === 0) {
      return {
        totalResponded: 0,
        avgResponseTimeHours: null,
        minResponseTimeHours: null,
        maxResponseTimeHours: null,
        withinSlaPct: null,
      };
    }

    const responseTimes = respondedQueries.map((q) =>
      this.calculateResponseTime(
        new Date(q.queryRaisedAt!),
        new Date(q.respondedAt!),
      ),
    );

    const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const minTime = Math.min(...responseTimes);
    const maxTime = Math.max(...responseTimes);
    const withinSla = responseTimes.filter((t) => t <= RESPONSE_SLA).length;

    return {
      totalResponded: respondedQueries.length,
      avgResponseTimeHours: Math.round(avgTime * 100) / 100,
      minResponseTimeHours: Math.round(minTime * 100) / 100,
      maxResponseTimeHours: Math.round(maxTime * 100) / 100,
      withinSlaPct: Math.round((withinSla / respondedQueries.length) * 100),
      slaTresholdHours: RESPONSE_SLA,
      generatedAt: new Date().toISOString(),
    };
  }

  async getUserQueryStatistics(userId: number) {
    const [raised] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter (where ${woQueries.status} = 'pending')::int`,
        responded: sql<number>`count(*) filter (where ${woQueries.status} = 'responded')::int`,
        closed: sql<number>`count(*) filter (where ${woQueries.status} = 'closed')::int`,
      })
      .from(woQueries)
      .where(eq(woQueries.queryBy, userId));

    const [answered] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
      })
      .from(woQueries)
      .where(eq(woQueries.respondedBy, userId));

    return {
      userId,
      queriesRaised: raised,
      queriesAnswered: answered?.total ?? 0,
      generatedAt: new Date().toISOString(),
    };
  }

  async getSlaStatus(woDetailId: number) {
    await this.verifyWoDetailExists(woDetailId);

    const queries = await this.db
      .select()
      .from(woQueries)
      .where(eq(woQueries.woDetailId, woDetailId))
      .orderBy(asc(woQueries.queryRaisedAt));

    const slaDetails = queries.map((q) => {
      const raisedAt = new Date(q.queryRaisedAt!);
      const responseDeadline = new Date(raisedAt.getTime() + RESPONSE_SLA * 60 * 60 * 1000);

      let responseTime: number | null = null;
      let withinSla: boolean | null = null;

      if (q.respondedAt) {
        responseTime = this.calculateResponseTime(raisedAt, new Date(q.respondedAt));
        withinSla = responseTime <= RESPONSE_SLA;
      }

      const isOverdue = q.status === 'pending' && new Date() > responseDeadline;

      return {
        queryId: q.id,
        status: q.status,
        queryRaisedAt: q.queryRaisedAt,
        responseDeadline: responseDeadline.toISOString(),
        respondedAt: q.respondedAt,
        responseTimeHours: responseTime ? Math.round(responseTime * 100) / 100 : null,
        withinSla,
        isOverdue,
      };
    });

    const totalQueries = slaDetails.length;
    const respondedQueries = slaDetails.filter((q) => q.respondedAt);
    const withinSlaCount = respondedQueries.filter((q) => q.withinSla).length;
    const overdueCount = slaDetails.filter((q) => q.isOverdue).length;

    return {
      woDetailId,
      totalQueries,
      pendingQueries: slaDetails.filter((q) => q.status === 'pending').length,
      overdueQueries: overdueCount,
      slaComplianceRate:
        respondedQueries.length > 0
          ? Math.round((withinSlaCount / respondedQueries.length) * 100) + '%'
          : 'N/A',
      slaThresholdHours: RESPONSE_SLA,
      details: slaDetails,
    };
  }
}
