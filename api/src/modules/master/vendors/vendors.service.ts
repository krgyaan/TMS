import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, isNull } from 'drizzle-orm';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import {
  vendors,
  type Vendor,
  type NewVendor,
} from '../../../db/vendors.schema';
import { vendorOrganizations } from '../../../db/vendor-organizations.schema';
import { vendorFiles } from '../../../db/vendor-files.schema';

@Injectable()
export class VendorsService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  /**
   * Select fields with organization
   */
  private getSelectWithOrganization() {
    return {
      id: vendors.id,
      organizationId: vendors.organizationId,
      name: vendors.name,
      email: vendors.email,
      address: vendors.address,
      status: vendors.status,
      createdAt: vendors.createdAt,
      updatedAt: vendors.updatedAt,
      // Include organization
      organization: {
        id: vendorOrganizations.id,
        name: vendorOrganizations.name,
        address: vendorOrganizations.address,
      },
    };
  }

  /**
   * Get all vendors with organization
   */
  async findAll() {
    return this.db
      .select(this.getSelectWithOrganization())
      .from(vendors)
      .leftJoin(
        vendorOrganizations,
        eq(vendors.organizationId, vendorOrganizations.id),
      );
  }

  /**
   * Get single vendor with organization
   */
  async findById(id: number) {
    const result = await this.db
      .select(this.getSelectWithOrganization())
      .from(vendors)
      .leftJoin(
        vendorOrganizations,
        eq(vendors.organizationId, vendorOrganizations.id),
      )
      .where(eq(vendors.id, id))
      .limit(1);

    if (!result[0]) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    return result[0];
  }

  /**
   * Get vendor with ALL related data (files, organization)
   * This returns nested structure for detail view
   */
  async findByIdWithRelations(id: number) {
    // Get vendor with organization
    const vendor = await this.findById(id);

    // Get vendor files
    const files = await this.db
      .select()
      .from(vendorFiles)
      .where(eq(vendorFiles.vendorId, id));

    return {
      ...vendor,
      files,
    };
  }

  /**
   * Get vendors by organization
   */
  async findByOrganization(organizationId: number) {
    return this.db
      .select(this.getSelectWithOrganization())
      .from(vendors)
      .leftJoin(
        vendorOrganizations,
        eq(vendors.organizationId, vendorOrganizations.id),
      )
      .where(eq(vendors.organizationId, organizationId));
  }

  async create(data: NewVendor): Promise<Vendor> {
    const rows = await this.db.insert(vendors).values(data).returning();
    return rows[0];
  }

  async update(id: number, data: Partial<NewVendor>): Promise<Vendor> {
    const rows = await this.db
      .update(vendors)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(vendors.id, id))
      .returning();

    if (!rows[0]) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }
    return rows[0];
  }

  async delete(id: number): Promise<void> {
    const result = await this.db
      .delete(vendors)
      .where(eq(vendors.id, id))
      .returning();

    if (!result[0]) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }
  }
}
