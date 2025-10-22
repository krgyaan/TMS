import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import {
  vendorOrganizations,
  type VendorOrganization,
} from '../../../db/vendor-organizations.schema';

@Injectable()
export class VendorOrganizationsService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  async findAll(): Promise<VendorOrganization[]> {
    return this.db.select().from(vendorOrganizations);
  }
}
