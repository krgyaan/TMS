import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, desc, asc, sql, and, gte, lte } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { woQueries, woDetails } from '@db/schemas/operations';
import type { CreateWoQueryDto, CreateBulkWoQueriesDto, RespondToQueryDto, CloseQueryDto, UpdateQueryStatusDto, WoQueriesQueryDto } from './dto/wo-queries.dto';

export type WoQueryRow = typeof woQueries.$inferSelect;

// SLA threshold in hours
const RESPONSE_SLA_HOURS = 24;

@Injectable()
export class WoQueriesService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  // MAPPING FUNCTIONS
  private mapRowToResponse(row: WoQueryRow) {
    const queryRaisedAt = new Date(row.queryRaisedAt);
    const responseDeadline = new Date(queryRaisedAt.getTime() + RESPONSE_SLA_HOURS * 60 * 60 * 1000);
    const now = new Date();
    const isOverdue = row.status === 'pending' && now > responseDeadline;

    return {
      id: row.id,
      woDetailsId: row.woDetailsId,
      queryBy: row.queryBy,
      queryTo: row.queryTo,
      queryToUserIds: row.queryToUserIds,
      queryText: row.queryText,
      queryRaisedAt: row.queryRaisedAt.toISOString(),
      responseText: row.responseText,
      respondedBy: row.respondedBy,
      respondedAt: row.respondedAt?.toISOString() ?? null,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      // SLA info
      responseDeadline: responseDeadline.toISOString(),
      isOverdue,
      hoursRemaining: isOverdue ? null : Math.max(0, (responseDeadline.getTime() - now.getTime()) / (60 * 60 * 1000)),
    };
  }

  // CRUD OPERATIONS
  async findAll(filters?: WoQueriesQueryDto) {
    const page = filters?.page ?? 1;
    const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 100);
    const offset = (page - 1) * limit;
    const sortOrder = filters?.sortOrder ?? 'desc';
    const sortBy = filters?.sortBy ?? 'queryRaisedAt';

    const orderColumnMap: Record<string, any> = {
      queryRaisedAt: woQueries.queryRaisedAt,
      respondedAt: woQueries.respondedAt,
      status: woQueries.status,
    };
    const orderColumn = orderColumnMap[sortBy] ?? woQueries.queryRaisedAt;
    const orderFn = sortOrder === 'desc' ? desc : asc;

    const conditions: any[] = [];

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
      .from(woQueries)
      .where(eq(woQueries.id, id))
      .limit(1);

    if (!row) {
      throw new NotFoundException(`Query with ID ${id} not found`);
    }

    return this.mapRowToResponse(row);
  }

  async findByWoDetailId(woDetailId: number) {
    const rows = await this.db
      .select()
      .from(woQueries)
      .where(eq(woQueries.woDetailsId, woDetailId))
      .orderBy(desc(woQueries.queryRaisedAt));

    return rows.map((r) => this.mapRowToResponse(r));
  }

  async findPendingByWoDetail(woDetailId: number) {
    const rows = await this.db
      .select()
      .from(woQueries)
      .where(
        and(
          eq(woQueries.woDetailsId, woDetailId),
          eq(woQueries.status, 'pending')
        )
      )
      .orderBy(asc(woQueries.queryRaisedAt));

    return rows.map((r) => this.mapRowToResponse(r));
  }

  async findByUser(userId: number, type: 'raised' | 'received' = 'raised') {
    const condition = type === 'raised'
      ? eq(woQueries.queryBy, userId)
      : sql`${userId} = ANY(${woQueries.queryToUserIds})`;

    const rows = await this.db
      .select()
      .from(woQueries)
      .where(condition)
      .orderBy(desc(woQueries.queryRaisedAt));

    return rows.map((r) => this.mapRowToResponse(r));
  }

  async findAllPending() {
    const rows = await this.db
      .select()
      .from(woQueries)
      .where(eq(woQueries.status, 'pending'))
      .orderBy(asc(woQueries.queryRaisedAt));

    return rows.map((r) => this.mapRowToResponse(r));
  }

  async findAllOverdue() {
    const deadline = new Date(Date.now() - RESPONSE_SLA_HOURS * 60 * 60 * 1000);

    const rows = await this.db
      .select()
      .from(woQueries)
      .where(
        and(
          eq(woQueries.status, 'pending'),
          lte(woQueries.queryRaisedAt, deadline)
        )
      )
      .orderBy(asc(woQueries.queryRaisedAt));

    return rows.map((r) => this.mapRowToResponse(r));
  }

  async create(data: CreateWoQueryDto) {
    // Verify WO Detail exists
    const [detail] = await this.db
      .select({ id: woDetails.id })
      .from(woDetails)
      .where(eq(woDetails.id, data.woDetailsId))
      .limit(1);

    if (!detail) {
      throw new NotFoundException(`WO Detail with ID ${data.woDetailsId} not found`);
    }

    const now = new Date();

    const [row] = await this.db
      .insert(woQueries)
      .values({
        woDetailsId: data.woDetailsId,
        queryBy: data.queryBy,
        queryTo: data.queryTo,
        queryToUserIds: data.queryToUserIds ?? null,
        queryText: data.queryText,
        queryRaisedAt: now,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapRowToResponse(row!);
  }

  async createBulk(data: CreateBulkWoQueriesDto) {
    // Verify WO Detail exists
    const [detail] = await this.db
      .select({ id: woDetails.id })
      .from(woDetails)
      .where(eq(woDetails.id, data.woDetailsId))
      .limit(1);

    if (!detail) {
      throw new NotFoundException(`WO Detail with ID ${data.woDetailsId} not found`);
    }

    const now = new Date();

    const insertValues = data.queries.map((q) => ({
      woDetailsId: data.woDetailsId,
      queryBy: data.queryBy,
      queryTo: q.queryTo,
      queryToUserIds: q.queryToUserIds ?? null,
      queryText: q.queryText,
      queryRaisedAt: now,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    }));

    const rows = await this.db.insert(woQueries).values(insertValues).returning();

    return {
      count: rows.length,
      queries: rows.map((r) => this.mapRowToResponse(r)),
    };
  }

  async respond(id: number, data: RespondToQueryDto) {
    const query = await this.findById(id);

    if (query.status === 'closed') {
      throw new BadRequestException('Cannot respond to a closed query');
    }

    const now = new Date();
    const queryRaisedAt = new Date(query.queryRaisedAt);
    const responseTimeMs = now.getTime() - queryRaisedAt.getTime();
    const responseTimeHours = responseTimeMs / (60 * 60 * 1000);
    const withinSla = responseTimeHours <= RESPONSE_SLA_HOURS;

    const [row] = await this.db
      .update(woQueries)
      .set({
        responseText: data.responseText,
        respondedBy: data.respondedBy,
        respondedAt: now,
        status: 'responded',
        updatedAt: now,
      })
      .where(eq(woQueries.id, id))
      .returning();

    return {
      ...this.mapRowToResponse(row!),
      withinSla,
      responseTimeHours: Math.round(responseTimeHours * 100) / 100,
    };
  }

  async close(id: number, data?: CloseQueryDto) {
    const [row] = await this.db
      .update(woQueries)
      .set({
        status: 'closed',
        updatedAt: new Date(),
      })
      .where(eq(woQueries.id, id))
      .returning();

    if (!row) {
      throw new NotFoundException(`Query with ID ${id} not found`);
    }

    return {
      ...this.mapRowToResponse(row),
      remarks: data?.remarks ?? null,
    };
  }

  async reopen(id: number) {
    const [row] = await this.db
      .update(woQueries)
      .set({
        status: 'pending',
        updatedAt: new Date(),
      })
      .where(eq(woQueries.id, id))
      .returning();

    if (!row) {
      throw new NotFoundException(`Query with ID ${id} not found`);
    }

    return this.mapRowToResponse(row);
  }

  async updateStatus(id: number, data: UpdateQueryStatusDto) {
    const [row] = await this.db
      .update(woQueries)
      .set({
        status: data.status,
        updatedAt: new Date(),
      })
      .where(eq(woQueries.id, id))
      .returning();

    if (!row) {
      throw new NotFoundException(`Query with ID ${id} not found`);
    }

    return this.mapRowToResponse(row);
  }

  async delete(id: number): Promise<void> {
    const [row] = await this.db
      .delete(woQueries)
      .where(eq(woQueries.id, id))
      .returning();

    if (!row) {
      throw new NotFoundException(`Query with ID ${id} not found`);
    }
  }

  // ============================================
  // SUMMARY/STATISTICS
  // ============================================

  async getDashboardSummary() {
    const deadline = new Date(Date.now() - RESPONSE_SLA_HOURS * 60 * 60 * 1000);

    const [summary] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter (where ${woQueries.status} = 'pending')::int`,
        responded: sql<number>`count(*) filter (where ${woQueries.status} = 'responded')::int`,
        closed: sql<number>`count(*) filter (where ${woQueries.status} = 'closed')::int`,
        toTe: sql<number>`count(*) filter (where ${woQueries.queryTo} = 'TE')::int`,
        toOe: sql<number>`count(*) filter (where ${woQueries.queryTo} = 'OE')::int`,
        toBoth: sql<number>`count(*) filter (where ${woQueries.queryTo} = 'BOTH')::int`,
        overdue: sql<number>`count(*) filter (where ${woQueries.status} = 'pending' and ${woQueries.queryRaisedAt} <= ${deadline})::int`,
      })
      .from(woQueries);

    return {
      summary,
      slaThresholds: {
        responseSlaHours: RESPONSE_SLA_HOURS,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  async getResponseTimeStatistics() {
    const [stats] = await this.db
      .select({
        totalResponded: sql<number>`count(*) filter (where ${woQueries.respondedAt} is not null)::int`,
        avgResponseTimeHours: sql<number>`
          round(
            avg(
              extract(epoch from (${woQueries.respondedAt} - ${woQueries.queryRaisedAt})) / 3600
            )::numeric,
            2
          )
        `,
        minResponseTimeHours: sql<number>`
          round(
            min(
              extract(epoch from (${woQueries.respondedAt} - ${woQueries.queryRaisedAt})) / 3600
            )::numeric,
            2
          )
        `,
        maxResponseTimeHours: sql<number>`
          round(
            max(
              extract(epoch from (${woQueries.respondedAt} - ${woQueries.queryRaisedAt})) / 3600
            )::numeric,
            2
          )
        `,
      })
      .from(woQueries)
      .where(sql`${woQueries.respondedAt} is not null`);

    // Calculate within SLA percentage
    const [slaStats] = await this.db
      .select({
        withinSla: sql<number>`
          count(*) filter (
            where extract(epoch from (${woQueries.respondedAt} - ${woQueries.queryRaisedAt})) / 3600 <= ${RESPONSE_SLA_HOURS}
          )::int
        `,
        total: sql<number>`count(*)::int`,
      })
      .from(woQueries)
      .where(sql`${woQueries.respondedAt} is not null`);

    const withinSlaPct = slaStats?.total > 0
      ? Math.round((slaStats.withinSla / slaStats.total) * 100)
      : null;

    return {
      ...stats,
      withinSlaPct,
      slaTresholdHours: RESPONSE_SLA_HOURS,
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
        count: sql<number>`count(*)::int`,
      })
      .from(woQueries)
      .where(eq(woQueries.respondedBy, userId));

    return {
      userId,
      queriesRaised: raised,
      queriesAnswered: answered?.count ?? 0,
      generatedAt: new Date().toISOString(),
    };
  }

  async getSlaStatus(woDetailId: number) {
    const deadline = new Date(Date.now() - RESPONSE_SLA_HOURS * 60 * 60 * 1000);

    const rows = await this.db
      .select()
      .from(woQueries)
      .where(eq(woQueries.woDetailsId, woDetailId));

    const details = rows.map((row) => {
      const queryRaisedAt = new Date(row.queryRaisedAt);
      const responseDeadline = new Date(queryRaisedAt.getTime() + RESPONSE_SLA_HOURS * 60 * 60 * 1000);
      let responseTimeHours: number | null = null;
      let withinSla: boolean | null = null;

      if (row.respondedAt) {
        responseTimeHours = (new Date(row.respondedAt).getTime() - queryRaisedAt.getTime()) / (60 * 60 * 1000);
        withinSla = responseTimeHours <= RESPONSE_SLA_HOURS;
      }

      return {
        queryId: row.id,
        status: row.status,
        queryRaisedAt: row.queryRaisedAt.toISOString(),
        responseDeadline: responseDeadline.toISOString(),
        respondedAt: row.respondedAt?.toISOString() ?? null,
        responseTimeHours: responseTimeHours ? Math.round(responseTimeHours * 100) / 100 : null,
        withinSla,
        isOverdue: row.status === 'pending' && new Date() > responseDeadline,
      };
    });

    const totalQueries = rows.length;
    const pendingQueries = rows.filter((r) => r.status === 'pending').length;
    const overdueQueries = details.filter((d) => d.isOverdue).length;
    const respondedWithinSla = details.filter((d) => d.withinSla === true).length;
    const totalResponded = details.filter((d) => d.respondedAt !== null).length;
    const slaComplianceRate = totalResponded > 0
      ? Math.round((respondedWithinSla / totalResponded) * 100)
      : 100;

    return {
      woDetailsId: woDetailId,
      totalQueries,
      pendingQueries,
      overdueQueries,
      slaComplianceRate,
      slaThresholdHours: RESPONSE_SLA_HOURS,
      details,
    };
  }
}
