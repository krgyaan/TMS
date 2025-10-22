import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import {
  documentsSubmitted,
  type DocumentSubmitted,
} from '../../../db/documents-submitted.schema';

@Injectable()
export class DocumentsSubmittedService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  async findAll(): Promise<DocumentSubmitted[]> {
    return this.db.select().from(documentsSubmitted);
  }
}
