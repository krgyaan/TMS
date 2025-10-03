import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import { loanParties, type LoanParty } from '../../../db/loan-parties.schema';

@Injectable()
export class LoanPartiesService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  async findAll(): Promise<LoanParty[]> {
    return this.db.select().from(loanParties);
  }
}
