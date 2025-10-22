import { Body, Controller, Get, Post } from '@nestjs/common';
import { z } from 'zod';
import { TeamsService } from './teams.service';

const CreateTeamSchema = z.object({
  name: z.string().min(1),
  parentId: z.number().optional(),
});

type CreateTeamDto = z.infer<typeof CreateTeamSchema>;

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  async list() {
    return this.teamsService.findAll();
  }

  @Post()
  async create(@Body() body: unknown) {
    const parsed = CreateTeamSchema.parse(body);
    return this.teamsService.create(parsed);
  }
}
