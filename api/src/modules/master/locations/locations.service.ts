import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import { locations, type Location } from '../../../db/locations.schema';

@Injectable()
export class LocationsService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  async findAll(): Promise<Location[]> {
    return this.db.select().from(locations);
  }
}
