import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../../db/database.module';
import type { DbInstance } from '../../db';
import {
  oauthAccounts,
  type NewOauthAccount,
  type OauthAccount,
} from '../../db/oauth-accounts.schema';

@Injectable()
export class OauthAccountsService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  async findAll(): Promise<OauthAccount[]> {
    return this.db.select().from(oauthAccounts);
  }

  async create(data: NewOauthAccount): Promise<OauthAccount> {
    const rows = (await this.db.insert(oauthAccounts).values(data).returning()) as unknown as OauthAccount[];
    return rows[0];
  }
}
