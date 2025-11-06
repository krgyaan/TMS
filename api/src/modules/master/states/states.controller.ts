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
import { StatesService } from './states.service';

const CreateStateSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    code: z.string().max(10).optional(),
    status: z.boolean().optional().default(true),
});

const UpdateStateSchema = CreateStateSchema.partial();

@Controller('states')
export class StatesController {
    constructor(private readonly statesService: StatesService) { }

    @Get()
    async list() {
        return this.statesService.findAll();
    }

    @Get('search')
    async search(@Query('q') query: string) {
        if (!query) return [];
        // return this.statesService.search(query);
        return [];
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        const state = await this.statesService.findById(id);
        if (!state) {
            throw new NotFoundException(`State with ID ${id} not found`);
        }
        return state;
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreateStateSchema.parse(body);
        return this.statesService.create(parsed);
    }

    @Patch(':id')
    async update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateStateSchema.parse(body);
        return this.statesService.update(id, parsed);
    }

    // @Delete(':id')
    // @HttpCode(HttpStatus.NO_CONTENT)
    // async delete(@Param('id', ParseIntPipe) id: number) {
    //     await this.statesService.delete(id);
    // }
}
