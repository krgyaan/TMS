import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, isNull, like, and, isNotNull } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import {
  locations,
  type Location,
  type NewLocation,
} from '../../../db/locations.schema';

@Injectable()
export class LocationsService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  async findAll(): Promise<Location[]> {
    return this.db
      .select()
      .from(locations)
      .orderBy(locations.status);
  }

  async findById(id: number): Promise<Location | null> {
    const result = await this.db
      .select()
      .from(locations)
      .where(and(eq(locations.id, id), eq(locations.status, true)))
      .limit(1);
    return result[0] ?? null;
  }

  async create(data: NewLocation): Promise<Location> {
    const rows = await this.db
      .insert(locations)
      .values(data)
      .returning();
    return rows[0];
  }

  async update(id: number, data: Partial<NewLocation>): Promise<Location> {
    const rows = await this.db
      .update(locations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(locations.id, id))
      .returning();

    if (!rows[0]) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }
    return rows[0];
  }

  async delete(id: number): Promise<void> {
    const result = await this.db
      .update(locations)
      .set({ status: false })
      .where(eq(locations.id, id))
      .returning();

    if (!result[0]) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }
  }

  async search(query: string): Promise<Location[]> {
    const searchPattern = `%${query}%`;
    return this.db
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.status, true),
          // Search in name OR city
          like(locations.name, searchPattern),
        ),
      );
  }
}
