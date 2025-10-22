import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../../../db/database.module';
import type { DbInstance } from '../../../db';
import { teams, type NewTeam, type Team } from '../../../db/teams.schema';

@Injectable()
export class TeamsService {
  constructor(@Inject(DRIZZLE) private readonly db: DbInstance) {}

  async findAll(): Promise<Team[]> {
    return this.db.select().from(teams);
  }

  async create(data: NewTeam): Promise<Team> {
    const rows = (await this.db
      .insert(teams)
      .values(data)
      .returning()) as unknown as Team[];
    return rows[0];
  }
}
