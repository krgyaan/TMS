import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, isNull } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import {
  items,
  type Item,
  type NewItem
} from '../../../db/items.schema';
import { teams } from '../../../db/teams.schema';
import { itemHeadings } from '../../../db/item-headings.schema';

@Injectable()
export class ItemsService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  /**
   * Get all items with team and heading data
   */
  async findAll() {
    return this.db
      .select({
        id: items.id,
        name: items.name,
        teamId: items.teamId,
        headingId: items.headingId,
        status: items.status,
        createdAt: items.createdAt,
        updatedAt: items.updatedAt,
        // Include related data
        team: {
          id: teams.id,
          name: teams.name,
        },
        heading: {
          id: itemHeadings.id,
          name: itemHeadings.name,
        },
      })
      .from(items)
      .leftJoin(teams, eq(items.teamId, teams.id))
      .leftJoin(itemHeadings, eq(items.headingId, itemHeadings.id));
  }

  /**
   * Get single item with relations
   */
  async findById(id: number) {
    const result = await this.db
      .select({
        id: items.id,
        name: items.name,
        teamId: items.teamId,
        headingId: items.headingId,
        status: items.status,
        createdAt: items.createdAt,
        updatedAt: items.updatedAt,
        team: {
          id: teams.id,
          name: teams.name,
        },
        heading: {
          id: itemHeadings.id,
          name: itemHeadings.name,
        },
      })
      .from(items)
      .leftJoin(teams, eq(items.teamId, teams.id))
      .leftJoin(itemHeadings, eq(items.headingId, itemHeadings.id))
      .where(eq(items.id, id))
      .limit(1);

    if (!result[0]) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    return result[0];
  }

  async create(data: NewItem): Promise<Item> {
    const rows = await this.db
      .insert(items)
      .values(data)
      .returning();
    return rows[0];
  }

  async update(id: number, data: Partial<NewItem>): Promise<Item> {
    const rows = await this.db
      .update(items)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(items.id, id))
      .returning();

    if (!rows[0]) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }
    return rows[0];
  }

  async delete(id: number): Promise<void> {
    const result = await this.db
      .delete(items)
      .where(eq(items.id, id))
      .returning();

    if (!result[0]) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }
  }
}
