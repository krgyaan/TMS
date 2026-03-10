import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, desc, asc, sql, and, or, ilike } from 'drizzle-orm';
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

  // ============================================
  // MAPPING FUNCTIONS
  // ============================================

  private mapCreateToDb(data: CreateWoContactDto) {
    return {
      woBasicDetailId: data.woBasicDetailId,
      organization: data.organization ?? null,
      departments: data.departments ?? null,
      name: data.name ?? null,
      designation: data.designation ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
    };
  }

  private mapUpdateToDb(data: UpdateWoContactDto) {
    const out: Record<string, unknown> = {};

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
    };
  }

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  async findAll(filters?: WoContactsQueryDto) {
    const page = filters?.page ?? 1;
    const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 100);
    const offset = (page - 1) * limit;
    const sortOrder = filters?.sortOrder ?? 'asc';
    const sortBy = filters?.sortBy ?? 'name';
    const search = filters?.search?.trim();

    // Determine order column
    const orderColumnMap: Record<string, any> = {
      name: woContacts.name,
      organization: woContacts.organization,
      departments: woContacts.departments,
      email: woContacts.email,
    };
    const orderColumn = orderColumnMap[sortBy] ?? woContacts.name;
    const orderFn = sortOrder === 'desc' ? desc : asc;

    // Build conditions
    const conditions: any[] = [];

    // Search condition
    if (search) {
      conditions.push(
        or(
          ilike(woContacts.name, `%${search}%`),
          ilike(woContacts.organization, `%${search}%`),
          ilike(woContacts.email, `%${search}%`),
          ilike(woContacts.designation, `%${search}%`),
        ),
      );
    }

    // Filter conditions
    if (filters?.woBasicDetailId) {
      conditions.push(eq(woContacts.woBasicDetailId, filters.woBasicDetailId));
    }
    if (filters?.organization) {
      conditions.push(ilike(woContacts.organization, `%${filters.organization}%`));
    }
    if (filters?.departments) {
      conditions.push(eq(woContacts.departments, filters.departments));
    }
    if (filters?.name) {
      conditions.push(ilike(woContacts.name, `%${filters.name}%`));
    }
    if (filters?.email) {
      conditions.push(ilike(woContacts.email, `%${filters.email}%`));
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
      .from(woContacts)
      .where(eq(woContacts.id, id))
      .limit(1);

    if (!row) {
      throw new NotFoundException(`WO Contact with ID ${id} not found`);
    }

    return this.mapRowToResponse(row);
  }

  async findByWoBasicDetailId(woBasicDetailId: number) {
    // Verify WO Basic Detail exists
    const [basicDetail] = await this.db
      .select({ id: woBasicDetails.id })
      .from(woBasicDetails)
      .where(eq(woBasicDetails.id, woBasicDetailId))
      .limit(1);

    if (!basicDetail) {
      throw new NotFoundException(
        `WO Basic Detail with ID ${woBasicDetailId} not found`,
      );
    }

    const rows = await this.db
      .select()
      .from(woContacts)
      .where(eq(woContacts.woBasicDetailId, woBasicDetailId))
      .orderBy(asc(woContacts.name));

    return rows.map((r) => this.mapRowToResponse(r));
  }

  async findByDepartment(woBasicDetailId: number, department: string) {
    const rows = await this.db
      .select()
      .from(woContacts)
      .where(
        and(
          eq(woContacts.woBasicDetailId, woBasicDetailId),
          eq(woContacts.departments, department),
        ),
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
        `WO Basic Detail with ID ${data.woBasicDetailId} not found`,
      );
    }

    const insertValues = this.mapCreateToDb(data);

    const [row] = await this.db
      .insert(woContacts)
      .values(insertValues)
      .returning();

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
        `WO Basic Detail with ID ${data.woBasicDetailId} not found`,
      );
    }

    const insertValues = data.contacts.map((contact) => ({
      woBasicDetailId: data.woBasicDetailId,
      organization: contact.organization ?? null,
      departments: contact.departments ?? null,
      name: contact.name ?? null,
      designation: contact.designation ?? null,
      phone: contact.phone ?? null,
      email: contact.email ?? null,
    }));

    const rows = await this.db
      .insert(woContacts)
      .values(insertValues)
      .returning();

    return {
      created: rows.length,
      data: rows.map((r) => this.mapRowToResponse(r)),
    };
  }

  async update(id: number, data: UpdateWoContactDto) {
    await this.findById(id);

    const updateValues = this.mapUpdateToDb(data);

    if (Object.keys(updateValues).length === 0) {
      return this.findById(id);
    }

    const [row] = await this.db
      .update(woContacts)
      .set(updateValues)
      .where(eq(woContacts.id, id))
      .returning();

    if (!row) {
      throw new NotFoundException(`WO Contact with ID ${id} not found`);
    }

    return this.mapRowToResponse(row);
  }

  async delete(id: number): Promise<void> {
    const [row] = await this.db
      .delete(woContacts)
      .where(eq(woContacts.id, id))
      .returning();

    if (!row) {
      throw new NotFoundException(`WO Contact with ID ${id} not found`);
    }
  }

  async deleteAllByBasicDetail(woBasicDetailId: number): Promise<void> {
    await this.db
      .delete(woContacts)
      .where(eq(woContacts.woBasicDetailId, woBasicDetailId));
  }

  // ============================================
  // UTILITY OPERATIONS
  // ============================================

  async checkEmailExists(email: string, woBasicDetailId?: number) {
    const conditions: any[] = [eq(woContacts.email, email)];

    if (woBasicDetailId) {
      conditions.push(eq(woContacts.woBasicDetailId, woBasicDetailId));
    }

    const [existing] = await this.db
      .select({ id: woContacts.id })
      .from(woContacts)
      .where(and(...conditions))
      .limit(1);

    return {
      exists: !!existing,
      email,
      woBasicDetailId: woBasicDetailId ?? null,
    };
  }

  async getContactsSummary(woBasicDetailId: number) {
    const [summary] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        eicCount: sql<number>`count(*) filter (where ${woContacts.departments} = 'EIC')::int`,
        userCount: sql<number>`count(*) filter (where ${woContacts.departments} = 'User')::int`,
        cpCount: sql<number>`count(*) filter (where ${woContacts.departments} = 'C&P')::int`,
        financeCount: sql<number>`count(*) filter (where ${woContacts.departments} = 'Finance')::int`,
        withEmail: sql<number>`count(*) filter (where ${woContacts.email} is not null)::int`,
        withPhone: sql<number>`count(*) filter (where ${woContacts.phone} is not null)::int`,
      })
      .from(woContacts)
      .where(eq(woContacts.woBasicDetailId, woBasicDetailId));

    return {
      woBasicDetailId,
      summary,
    };
  }
}
