import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    HttpCode,
    HttpStatus,
    NotFoundException,
} from '@nestjs/common';
import { z } from 'zod';
import { TeamsService } from './teams.service';

const CreateTeamSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    description: z.string().max(500).optional(),
    status: z.boolean().optional().default(true),
});

const UpdateTeamSchema = CreateTeamSchema.partial();

@Controller('teams')
export class TeamsController {
    constructor(private readonly teamsService: TeamsService) { }

    @Get()
    async list() {
        return this.teamsService.findAll();
    }

    @Get('search')
    async search(@Query('q') query: string) {
        if (!query) return [];
        // return this.teamsService.search(query);
        return [];
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        const team = await this.teamsService.findById(id);
        if (!team) {
            throw new NotFoundException(`Team with ID ${id} not found`);
        }
        return team;
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreateTeamSchema.parse(body);
        return this.teamsService.create(parsed);
    }

    @Patch(':id')
    async update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateTeamSchema.parse(body);
        return this.teamsService.update(id, parsed);
    }

    // @Delete(':id')
    // @HttpCode(HttpStatus.NO_CONTENT)
    // async delete(@Param('id', ParseIntPipe) id: number) {
    //     await this.teamsService.delete(id);
    // }
}
