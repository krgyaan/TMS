import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import { statuses, type NewStatus, type Status } from '../../../db/statuses.schema';

@Injectable()
export class TenderStatusService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  async findAll(): Promise<Status[]> {
    return this.db.select().from(statuses);
  }

  async findById(id: number): Promise<Status> {
    const rows = (await this.db.select().from(statuses).where(eq(statuses.id, id))) as unknown as Status[];
    const row = rows[0];
    if (!row) throw new NotFoundException('Tender status not found');
    return row;
  }

  async create(data: NewStatus): Promise<Status> {
    const rows = (await this.db.insert(statuses).values(data).returning()) as unknown as Status[];
    return rows[0];
  }

  async update(id: number, data: Partial<NewStatus>): Promise<Status> {
    const rows = (await this.db
      .update(statuses)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(statuses.id, id))
      .returning()) as unknown as Status[];
    const row = rows[0];
    if (!row) throw new NotFoundException('Tender status not found');
    return row;
  }

  async delete(id: number): Promise<Status> {
    const rows = (await this.db.delete(statuses).where(eq(statuses.id, id)).returning()) as unknown as Status[];
    const row = rows[0];
    if (!row) throw new NotFoundException('Tender status not found');
    return row;
  }
}
