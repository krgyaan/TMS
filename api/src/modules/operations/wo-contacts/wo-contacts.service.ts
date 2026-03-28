import { Inject, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, desc, asc, sql, and, ilike } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { woContacts, woBasicDetails } from '@db/schemas/operations';
import type {
  CreateWoContactDto,
  UpdateWoContactDto,
  CreateBulkWoContactsDto,
  WoContactsQueryDto,
} from './dto/wo-contacts.dto';

export type WoContactRow = typeof woContacts.$inferSelect;

@Injectable()
export class WoContactsService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  // MAPPING FUNCTIONS
  private mapCreateToDb(data: CreateWoContactDto) {
    const now = new Date();
    return {
      woBasicDetailId: data.woBasicDetailId,
      organization: data.organization ?? null,
      departments: data.departments ?? null,
      name: data.name ?? null,
      designation: data.designation ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      createdAt: now,
      updatedAt: now,
    };
  }

  private mapUpdateToDb(data: UpdateWoContactDto) {
    const out: Record<string, unknown> = { updatedAt: new Date() };

    if (data.organization !== undefined) out.organization = data.organization;
    if (data.departments !== undefined) out.departments = data.departments;
    if (data.name !== undefined) out.name = data.name;
    if (data.designation !== undefined) out.designation = data.designation;
    if (data.phone !== undefined) out.phone = data.phone;
    if (data.email !== undefined) out.email = data.email;

    return out as Partial<typeof woContacts.$inferInsert>;
  }

  private mapRowToResponse(row: WoContactRow) {
    return {
      id: row.id,
      woBasicDetailId: row.woBasicDetailId,
      organization: row.organization,
      departments: row.departments,
      name: row.name,
      designation: row.designation,
      phone: row.phone,
      email: row.email,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  // CRUD OPERATIONS
  async findAll(filters?: WoContactsQueryDto) {
    const page = filters?.page ?? 1;
    const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 100);
    const offset = (page - 1) * limit;
    const sortOrder = filters?.sortOrder ?? 'desc';
    const sortBy = filters?.sortBy ?? 'createdAt';

    const orderColumnMap: Record<string, any> = {
      createdAt: woContacts.createdAt,
      updatedAt: woContacts.updatedAt,
      name: woContacts.name,
    };
    const orderColumn = orderColumnMap[sortBy] ?? woContacts.createdAt;
    const orderFn = sortOrder === 'desc' ? desc : asc;

    const conditions: any[] = [];

    if (filters?.woBasicDetailId) {
      conditions.push(eq(woContacts.woBasicDetailId, filters.woBasicDetailId));
    }
    if (filters?.departments) {
      conditions.push(eq(woContacts.departments, filters.departments));
    }
    if (filters?.search) {
      conditions.push(
        sql`(
          ${woContacts.name} ILIKE ${`%${filters.search}%`} OR
          ${woContacts.email} ILIKE ${`%${filters.search}%`} OR
          ${woContacts.organization} ILIKE ${`%${filters.search}%`}
        )`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult, rows] = await Promise.all([
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(woContacts)
        .where(whereClause)
        .then(([r]) => Number(r?.count ?? 0)),
      this.db
        .select()
        .from(woContacts)
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
      .from(woContacts)
      .where(eq(woContacts.id, id))
      .limit(1);

    if (!row) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }

    return this.mapRowToResponse(row);
  }

  async findByWoBasicDetailId(woBasicDetailId: number) {
    const rows = await this.db
      .select()
      .from(woContacts)
      .where(eq(woContacts.woBasicDetailId, woBasicDetailId))
      .orderBy(asc(woContacts.createdAt));

    return rows.map((r) => this.mapRowToResponse(r));
  }

  async findByDepartment(woBasicDetailId: number, department: string) {
    const rows = await this.db
      .select()
      .from(woContacts)
      .where(
        and(
          eq(woContacts.woBasicDetailId, woBasicDetailId),
          eq(woContacts.departments, department)
        )
      )
      .orderBy(asc(woContacts.name));

    return rows.map((r) => this.mapRowToResponse(r));
  }

  async create(data: CreateWoContactDto) {
    // Verify WO Basic Detail exists
    const [basicDetail] = await this.db
      .select({ id: woBasicDetails.id })
      .from(woBasicDetails)
      .where(eq(woBasicDetails.id, data.woBasicDetailId))
      .limit(1);

    if (!basicDetail) {
      throw new NotFoundException(
        `WO Basic Detail with ID ${data.woBasicDetailId} not found`
      );
    }

    const insertValues = this.mapCreateToDb(data);

    const [row] = await this.db.insert(woContacts).values(insertValues).returning();

    return this.mapRowToResponse(row!);
  }

  async createBulk(data: CreateBulkWoContactsDto) {
    // Verify WO Basic Detail exists
    const [basicDetail] = await this.db
      .select({ id: woBasicDetails.id })
      .from(woBasicDetails)
      .where(eq(woBasicDetails.id, data.woBasicDetailId))
      .limit(1);

    if (!basicDetail) {
      throw new NotFoundException(
        `WO Basic Detail with ID ${data.woBasicDetailId} not found`
      );
    }

    const now = new Date();
    const insertValues = data.contacts.map((contact) => ({
      woBasicDetailId: data.woBasicDetailId,
      organization: contact.organization ?? null,
      departments: contact.departments ?? null,
      name: contact.name ?? null,
      designation: contact.designation ?? null,
      phone: contact.phone ?? null,
      email: contact.email ?? null,
      createdAt: now,
      updatedAt: now,
    }));

    const rows = await this.db.insert(woContacts).values(insertValues).returning();

    return {
      count: rows.length,
      contacts: rows.map((r) => this.mapRowToResponse(r)),
    };
  }

  async update(id: number, data: UpdateWoContactDto) {
    await this.findById(id);

    const updateValues = this.mapUpdateToDb(data);

    const [row] = await this.db
      .update(woContacts)
      .set(updateValues)
      .where(eq(woContacts.id, id))
      .returning();

    if (!row) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }

    return this.mapRowToResponse(row);
  }

  async delete(id: number): Promise<void> {
    const [row] = await this.db
      .delete(woContacts)
      .where(eq(woContacts.id, id))
      .returning();

    if (!row) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }
  }

  async deleteAllByBasicDetail(woBasicDetailId: number): Promise<{ count: number }> {
    const deleted = await this.db
      .delete(woContacts)
      .where(eq(woContacts.woBasicDetailId, woBasicDetailId))
      .returning();

    return { count: deleted.length };
  }

  // UTILITY
  async getContactsSummary(woBasicDetailId: number) {
    const [summary] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        byDepartment: sql<any>`
          json_object_agg(
            COALESCE(${woContacts.departments}, 'none'),
            count(*)
          )
        `,
      })
      .from(woContacts)
      .where(eq(woContacts.woBasicDetailId, woBasicDetailId));

    return {
      total: summary?.total ?? 0,
      byDepartment: summary?.byDepartment ?? {},
    };
  }

  async checkEmailExists(email: string, woBasicDetailId?: number) {
    const conditions: any[] = [eq(woContacts.email, email)];

    if (woBasicDetailId) {
      conditions.push(eq(woContacts.woBasicDetailId, woBasicDetailId));
    }

    const [result] = await this.db
      .select({ id: woContacts.id })
      .from(woContacts)
      .where(and(...conditions))
      .limit(1);

    return { exists: !!result };
  }
}
