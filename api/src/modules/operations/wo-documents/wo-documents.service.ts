import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, desc, asc, sql, and, gte, lte } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { woDocuments } from '@db/schemas/wo-documents.schema';
import { woDetails } from '@db/schemas/wo-details.schema';
import type {
  CreateWoDocumentDto,
  UpdateWoDocumentDto,
  CreateBulkWoDocumentsDto,
  WoDocumentsQueryDto,
  ReplaceDocumentDto,
} from './dto/wo-documents.dto';

export type WoDocumentRow = typeof woDocuments.$inferSelect;

@Injectable()
export class WoDocumentsService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  // ============================================
  // MAPPING FUNCTIONS
  // ============================================

  private mapRowToResponse(row: WoDocumentRow) {
    return {
      id: row.id,
      woDetailId: row.woDetailId,
      type: row.type,
      version: row.version,
      filePath: row.filePath,
      uploadedAt: row.uploadedAt,
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

  private async getNextVersion(woDetailId: number, type: string): Promise<number> {
    const [latest] = await this.db
      .select({ version: sql<number>`max(${woDocuments.version})` })
      .from(woDocuments)
      .where(
        and(
          eq(woDocuments.woDetailId, woDetailId),
          eq(woDocuments.type, type),
        ),
      );

    return (latest?.version ?? 0) + 1;
  }

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  async findAll(filters?: WoDocumentsQueryDto) {
    const page = filters?.page ?? 1;
    const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 100);
    const offset = (page - 1) * limit;
    const sortOrder = filters?.sortOrder ?? 'desc';
    const sortBy = filters?.sortBy ?? 'uploadedAt';

    // Determine order column
    const orderColumnMap: Record<string, any> = {
      uploadedAt: woDocuments.uploadedAt,
      version: woDocuments.version,
      type: woDocuments.type,
    };
    const orderColumn = orderColumnMap[sortBy] ?? woDocuments.uploadedAt;
    const orderFn = sortOrder === 'desc' ? desc : asc;

    // Build conditions
    const conditions: any[] = [];

    if (filters?.woDetailId) {
      conditions.push(eq(woDocuments.woDetailId, filters.woDetailId));
    }
    if (filters?.type) {
      conditions.push(eq(woDocuments.type, filters.type));
    }
    if (filters?.version) {
      conditions.push(eq(woDocuments.version, filters.version));
    }
    if (filters?.uploadedFrom) {
      conditions.push(gte(woDocuments.uploadedAt, new Date(filters.uploadedFrom)));
    }
    if (filters?.uploadedTo) {
      conditions.push(lte(woDocuments.uploadedAt, new Date(filters.uploadedTo)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult, rows] = await Promise.all([
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(woDocuments)
        .where(whereClause)
        .then(([r]) => Number(r?.count ?? 0)),
      this.db
        .select()
        .from(woDocuments)
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
      .from(woDocuments)
      .where(eq(woDocuments.id, id))
      .limit(1);

    if (!row) {
      throw new NotFoundException(`WO Document with ID ${id} not found`);
    }

    return this.mapRowToResponse(row);
  }

  async findByWoDetailId(woDetailId: number) {
    await this.verifyWoDetailExists(woDetailId);

    const rows = await this.db
      .select()
      .from(woDocuments)
      .where(eq(woDocuments.woDetailId, woDetailId))
      .orderBy(asc(woDocuments.type), desc(woDocuments.version));

    return rows.map((r) => this.mapRowToResponse(r));
  }

  async findByType(woDetailId: number, type: string) {
    await this.verifyWoDetailExists(woDetailId);

    const rows = await this.db
      .select()
      .from(woDocuments)
      .where(
        and(
          eq(woDocuments.woDetailId, woDetailId),
          eq(woDocuments.type, type),
        ),
      )
      .orderBy(desc(woDocuments.version));

    return rows.map((r) => this.mapRowToResponse(r));
  }

  async findLatestByType(woDetailId: number, type: string) {
    await this.verifyWoDetailExists(woDetailId);

    const [row] = await this.db
      .select()
      .from(woDocuments)
      .where(
        and(
          eq(woDocuments.woDetailId, woDetailId),
          eq(woDocuments.type, type),
        ),
      )
      .orderBy(desc(woDocuments.version))
      .limit(1);

    if (!row) {
      throw new NotFoundException(
        `No document of type ${type} found for WO Detail ${woDetailId}`,
      );
    }

    return this.mapRowToResponse(row);
  }

  async getVersionHistory(woDetailId: number, type: string) {
    await this.verifyWoDetailExists(woDetailId);

    const rows = await this.db
      .select()
      .from(woDocuments)
      .where(
        and(
          eq(woDocuments.woDetailId, woDetailId),
          eq(woDocuments.type, type),
        ),
      )
      .orderBy(desc(woDocuments.version));

    return {
      woDetailId,
      type,
      totalVersions: rows.length,
      latestVersion: rows[0]?.version ?? null,
      versions: rows.map((r) => this.mapRowToResponse(r)),
    };
  }

  async upload(data: CreateWoDocumentDto) {
    await this.verifyWoDetailExists(data.woDetailId);

    const version = data.version ?? await this.getNextVersion(data.woDetailId, data.type);

    const [row] = await this.db
      .insert(woDocuments)
      .values({
        woDetailId: data.woDetailId,
        type: data.type,
        version,
        filePath: data.filePath,
        uploadedAt: new Date(),
      })
      .returning();

    return this.mapRowToResponse(row!);
  }

  async uploadBulk(data: CreateBulkWoDocumentsDto) {
    await this.verifyWoDetailExists(data.woDetailId);

    const now = new Date();
    const results: WoDocumentRow[] = [];

    for (const doc of data.documents) {
      const version = doc.version ?? await this.getNextVersion(data.woDetailId, doc.type);

      const [row] = await this.db
        .insert(woDocuments)
        .values({
          woDetailId: data.woDetailId,
          type: doc.type,
          version,
          filePath: doc.filePath,
          uploadedAt: now,
        })
        .returning();

      results.push(row!);
    }

    return {
      uploaded: results.length,
      data: results.map((r) => this.mapRowToResponse(r)),
    };
  }

  async update(id: number, data: UpdateWoDocumentDto) {
    await this.findById(id);

    const updateValues: Record<string, unknown> = {};

    if (data.version !== undefined) updateValues.version = data.version;
    if (data.filePath !== undefined) updateValues.filePath = data.filePath;

    if (Object.keys(updateValues).length === 0) {
      return this.findById(id);
    }

    const [row] = await this.db
      .update(woDocuments)
      .set(updateValues as Partial<typeof woDocuments.$inferInsert>)
      .where(eq(woDocuments.id, id))
      .returning();

    return this.mapRowToResponse(row!);
  }

  async replace(id: number, data: ReplaceDocumentDto) {
    const existing = await this.findById(id);

    if (data.incrementVersion) {
      // Create new version
      const nextVersion = await this.getNextVersion(existing.woDetailId!, existing.type!);

      const [row] = await this.db
        .insert(woDocuments)
        .values({
          woDetailId: existing.woDetailId,
          type: existing.type,
          version: nextVersion,
          filePath: data.filePath,
          uploadedAt: new Date(),
        })
        .returning();

      return {
        previousVersion: existing,
        newVersion: this.mapRowToResponse(row!),
      };
    } else {
      // Replace existing
      const [row] = await this.db
        .update(woDocuments)
        .set({
          filePath: data.filePath,
          uploadedAt: new Date(),
        })
        .where(eq(woDocuments.id, id))
        .returning();

      return this.mapRowToResponse(row!);
    }
  }

  async delete(id: number): Promise<void> {
    const [row] = await this.db
      .delete(woDocuments)
      .where(eq(woDocuments.id, id))
      .returning();

    if (!row) {
      throw new NotFoundException(`WO Document with ID ${id} not found`);
    }
  }

  async deleteAllByWoDetail(woDetailId: number): Promise<void> {
    await this.verifyWoDetailExists(woDetailId);

    await this.db
      .delete(woDocuments)
      .where(eq(woDocuments.woDetailId, woDetailId));
  }

  async deleteByType(woDetailId: number, type: string): Promise<void> {
    await this.verifyWoDetailExists(woDetailId);

    await this.db
      .delete(woDocuments)
      .where(
        and(
          eq(woDocuments.woDetailId, woDetailId),
          eq(woDocuments.type, type),
        ),
      );
  }

  // ============================================
  // UTILITY OPERATIONS
  // ============================================

  async getDocumentsSummary(woDetailId: number) {
    await this.verifyWoDetailExists(woDetailId);

    const [summary] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        draftWo: sql<number>`count(*) filter (where ${woDocuments.type} = 'draftWo')::int`,
        acceptedWoSigned: sql<number>`count(*) filter (where ${woDocuments.type} = 'acceptedWoSigned')::int`,
        finalWo: sql<number>`count(*) filter (where ${woDocuments.type} = 'finalWo')::int`,
        detailedWo: sql<number>`count(*) filter (where ${woDocuments.type} = 'detailedWo')::int`,
        sapPo: sql<number>`count(*) filter (where ${woDocuments.type} = 'sapPo')::int`,
        foa: sql<number>`count(*) filter (where ${woDocuments.type} = 'foa')::int`,
      })
      .from(woDocuments)
      .where(eq(woDocuments.woDetailId, woDetailId));

    // Get latest versions per type
    const latestVersions = await this.db
      .select({
        type: woDocuments.type,
        latestVersion: sql<number>`max(${woDocuments.version})::int`,
      })
      .from(woDocuments)
      .where(eq(woDocuments.woDetailId, woDetailId))
      .groupBy(woDocuments.type);

    return {
      woDetailId,
      summary,
      latestVersions,
    };
  }

  async checkDocumentExists(woDetailId: number, type: string) {
    const [existing] = await this.db
      .select({ id: woDocuments.id, version: woDocuments.version })
      .from(woDocuments)
      .where(
        and(
          eq(woDocuments.woDetailId, woDetailId),
          eq(woDocuments.type, type),
        ),
      )
      .orderBy(desc(woDocuments.version))
      .limit(1);

    return {
      exists: !!existing,
      woDetailId,
      type,
      latestVersion: existing?.version ?? null,
    };
  }

  async getOverviewStatistics() {
    const [stats] = await this.db
      .select({
        totalDocuments: sql<number>`count(*)::int`,
        totalWoDetails: sql<number>`count(distinct ${woDocuments.woDetailId})::int`,
        avgVersionsPerType: sql<string>`round(avg(version)::numeric, 2)::text`,
      })
      .from(woDocuments);

    const byType = await this.db
      .select({
        type: woDocuments.type,
        count: sql<number>`count(*)::int`,
        avgVersion: sql<string>`round(avg(${woDocuments.version})::numeric, 2)::text`,
      })
      .from(woDocuments)
      .groupBy(woDocuments.type)
      .orderBy(desc(sql`count(*)`));

    return {
      overview: stats,
      byType,
      generatedAt: new Date().toISOString(),
    };
  }
}
