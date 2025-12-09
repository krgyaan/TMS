import {
    Body,
    Controller,
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
import { TqTypesService } from '@/modules/master/tq-types/tq-types.service';

const CreateTqTypeSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    status: z.boolean().optional().default(true),
});

const UpdateTqTypeSchema = CreateTqTypeSchema.partial();

type CreateTqTypeDto = z.infer<typeof CreateTqTypeSchema>;
type UpdateTqTypeDto = z.infer<typeof UpdateTqTypeSchema>;

@Controller('tq-types')
export class TqTypesController {
    constructor(private readonly tqTypesService: TqTypesService) { }

    @Get()
    async list() {
        return this.tqTypesService.findAll();
    }

    @Get('search')
    async search(@Query('q') query: string) {
        if (!query) {
            return [];
        }
        // return this.tqTypesService.search(query);
        return [];
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        const tqType = await this.tqTypesService.findById(id);
        if (!tqType) {
            throw new NotFoundException(`TQ Type with ID ${id} not found`);
        }
        return tqType;
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreateTqTypeSchema.parse(body);
        return this.tqTypesService.create(parsed);
    }

    @Patch(':id')
    async update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateTqTypeSchema.parse(body);
        return this.tqTypesService.update(id, parsed);
    }

}
