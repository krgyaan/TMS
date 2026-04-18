import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, desc, asc, sql, and, gte, lte } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { woDocuments, woDetails } from '@db/schemas/operations';
import type { CreateWoDocumentDto, UpdateWoDocumentDto, CreateBulkWoDocumentsDto, ReplaceDocumentDto, WoDocumentsQueryDto, DocumentType } from './dto/wo-documents.dto';

export type WoDocumentRow = typeof woDocuments.$inferSelect;

@Injectable()
export class WoDocumentsService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  // MAPPING FUNCTIONS
  private mapRowToResponse(row: WoDocumentRow) {
    return {
      id: row.id,
      woDetailId: row.woDetailId,
      type: row.type,
      version: row.version,
      filePath: row.filePath,
      uploadedAt: row.uploadedAt.toISOString(),
      uploadedBy: row.uploadedBy,
    };
  }

  // CRUD OPERATIONS
  async findAll(filters?: WoDocumentsQueryDto) {
    const page = filters?.page ?? 1;
    const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 100);
    const offset = (page - 1) * limit;
    const sortOrder = filters?.sortOrder ?? 'desc';
    const sortBy = filters?.sortBy ?? 'uploadedAt';

    const orderColumnMap: Record<string, any> = {
      uploadedAt: woDocuments.uploadedAt,
      version: woDocuments.version,
      type: woDocuments.type,
    };
    const orderColumn = orderColumnMap[sortBy] ?? woDocuments.uploadedAt;
    const orderFn = sortOrder === 'desc' ? desc : asc;

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
      .from(woDocuments)
      .where(eq(woDocuments.id, id))
      .limit(1);

    if (!row) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    return this.mapRowToResponse(row);
  }

  async findByWoDetailId(woDetailId: number) {
    const rows = await this.db
      .select()
      .from(woDocuments)
      .where(eq(woDocuments.woDetailId, woDetailId))
      .orderBy(desc(woDocuments.uploadedAt));

    return rows.map((r) => this.mapRowToResponse(r));
  }

  async findByType(woDetailId: number, type: DocumentType) {
    const rows = await this.db
      .select()
      .from(woDocuments)
      .where(
        and(
          eq(woDocuments.woDetailId, woDetailId),
          eq(woDocuments.type, type)
        )
      )
      .orderBy(desc(woDocuments.version));

    return rows.map((r) => this.mapRowToResponse(r));
  }

  async findLatestByType(woDetailId: number, type: DocumentType) {
    const [row] = await this.db
      .select()
      .from(woDocuments)
      .where(
        and(
          eq(woDocuments.woDetailId, woDetailId),
          eq(woDocuments.type, type)
        )
      )
      .orderBy(desc(woDocuments.version))
      .limit(1);

    if (!row) {
      return null;
    }

    return this.mapRowToResponse(row);
  }

  async getVersionHistory(woDetailId: number, type: DocumentType) {
    const rows = await this.db
      .select()
      .from(woDocuments)
      .where(
        and(
          eq(woDocuments.woDetailId, woDetailId),
          eq(woDocuments.type, type)
        )
      )
      .orderBy(desc(woDocuments.version));

    const latestVersion = rows.length > 0 ? rows[0].version : null;

    return {
      woDetailId,
      type,
      totalVersions: rows.length,
      latestVersion,
      versions: rows.map((r) => this.mapRowToResponse(r)),
    };
  }

  async upload(data: CreateWoDocumentDto, userId?: number) {
    // Verify WO Detail exists
    const [detail] = await this.db
      .select({ id: woDetails.id })
      .from(woDetails)
      .where(eq(woDetails.id, data.woDetailId))
      .limit(1);

    if (!detail) {
      throw new NotFoundException(`WO Detail with ID ${data.woDetailId} not found`);
    }

    // Get latest version for this document type
    const [latestVersion] = await this.db
      .select({ version: sql<number>`max(${woDocuments.version})` })
      .from(woDocuments)
      .where(
        and(
          eq(woDocuments.woDetailId, data.woDetailId),
          eq(woDocuments.type, data.type)
        )
      );

    const newVersion = data.version ?? (latestVersion?.version ?? 0) + 1;

    const [row] = await this.db
      .insert(woDocuments)
      .values({
        woDetailId: data.woDetailId,
        type: data.type,
        version: newVersion,
        filePath: data.filePath,
        uploadedAt: new Date(),
        uploadedBy: userId ?? null,
      })
      .returning();

    return this.mapRowToResponse(row!);
  }

  async uploadBulk(data: CreateBulkWoDocumentsDto, userId?: number) {
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
    const results: WoDocumentRow[] = [];

    for (const doc of data.documents) {
      // Get latest version for this document type
      const [latestVersion] = await this.db
        .select({ version: sql<number>`max(${woDocuments.version})` })
        .from(woDocuments)
        .where(
          and(
            eq(woDocuments.woDetailId, data.woDetailId),
            eq(woDocuments.type, doc.type)
          )
        );

      const newVersion = doc.version ?? (latestVersion?.version ?? 0) + 1;

      const [row] = await this.db
        .insert(woDocuments)
        .values({
          woDetailId: data.woDetailId,
          type: doc.type,
          version: newVersion,
          filePath: doc.filePath,
          uploadedAt: now,
          uploadedBy: userId ?? null,
        })
        .returning();

      results.push(row!);
    }

    return {
      count: results.length,
      documents: results.map((r) => this.mapRowToResponse(r)),
    };
  }

  async update(id: number, data: UpdateWoDocumentDto) {
    await this.findById(id);

    const updateValues: Record<string, unknown> = {};

    if (data.type !== undefined) updateValues.type = data.type;
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

  async replace(id: number, data: ReplaceDocumentDto, userId?: number) {
    const existing = await this.findById(id);

    let newVersion = existing.version ?? 1;
    if (data.incrementVersion) {
      newVersion += 1;
    }

    // Create new version
    const [row] = await this.db
      .insert(woDocuments)
      .values({
        woDetailId: existing.woDetailId!,
        type: existing.type,
        version: newVersion,
        filePath: data.filePath,
        uploadedAt: new Date(),
        uploadedBy: userId ?? null,
      })
      .returning();

    return this.mapRowToResponse(row!);
  }

  async delete(id: number): Promise<void> {
    const [row] = await this.db
      .delete(woDocuments)
      .where(eq(woDocuments.id, id))
      .returning();

    if (!row) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }
  }

  async deleteAllByWoDetail(woDetailId: number): Promise<{ count: number }> {
    const deleted = await this.db
      .delete(woDocuments)
      .where(eq(woDocuments.woDetailId, woDetailId))
      .returning();

    return { count: deleted.length };
  }

  async deleteByType(woDetailId: number, type: DocumentType): Promise<{ count: number }> {
    const deleted = await this.db
      .delete(woDocuments)
      .where(
        and(
          eq(woDocuments.woDetailId, woDetailId),
          eq(woDocuments.type, type)
        )
      )
      .returning();

    return { count: deleted.length };
  }

  // SUMMARY/STATISTICS
  async getSummary(woDetailId: number) {
    const rows = await this.db
      .select({
        type: woDocuments.type,
        count: sql<number>`count(*)::int`,
        latestVersion: sql<number>`max(${woDocuments.version})::int`,
      })
      .from(woDocuments)
      .where(eq(woDocuments.woDetailId, woDetailId))
      .groupBy(woDocuments.type);

    const total = rows.reduce((sum, r) => sum + r.count, 0);
    const byType: Record<string, number> = {};
    const latestVersions: Array<{ type: string; version: number }> = [];

    rows.forEach((r) => {
      byType[r.type!] = r.count;
      latestVersions.push({
        type: r.type!,
        version: r.latestVersion,
      });
    });

    return {
      woDetailId,
      total,
      byType,
      latestVersions,
    };
  }

  async checkDocumentExists(woDetailId: number, type: DocumentType) {
    const [result] = await this.db
      .select({
        count: sql<number>`count(*)::int`,
        latestVersion: sql<number>`max(${woDocuments.version})::int`,
      })
      .from(woDocuments)
      .where(
        and(
          eq(woDocuments.woDetailId, woDetailId),
          eq(woDocuments.type, type)
        )
      );

    return {
      exists: (result?.count ?? 0) > 0,
      latestVersion: result?.latestVersion ?? null,
    };
  }

  async getOverviewStatistics() {
    const [overview] = await this.db
      .select({
        totalDocuments: sql<number>`count(*)::int`,
        totalWoDetails: sql<number>`count(distinct ${woDocuments.woDetailId})::int`,
        avgVersionsPerType: sql<string>`round(avg(${woDocuments.version})::numeric, 2)::text`,
      })
      .from(woDocuments);

    const byType = await this.db
      .select({
        type: woDocuments.type,
        count: sql<number>`count(*)::int`,
        avgVersion: sql<string>`round(avg(${woDocuments.version})::numeric, 2)::text`,
      })
      .from(woDocuments)
      .groupBy(woDocuments.type);

    return {
      overview,
      byType,
      generatedAt: new Date().toISOString(),
    };
  }
}
