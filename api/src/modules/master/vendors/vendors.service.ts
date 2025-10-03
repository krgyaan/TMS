import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import { vendors, type Vendor } from '../../../db/vendors.schema';

@Injectable()
export class VendorsService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  async findAll(): Promise<Vendor[]> {
    return this.db.select().from(vendors);
  }
}
