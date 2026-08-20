import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Patch,
    Post,
} from '@nestjs/common';
import { BroadcastsService } from './broadcasts.service';
import { CreateBroadcastSchema, UpdateBroadcastSchema } from './dto/broadcast.dto';
import type { CreateBroadcastDto, UpdateBroadcastDto } from './dto/broadcast.dto';

@Controller('broadcasts')
export class BroadcastsController {
    constructor(private readonly broadcastsService: BroadcastsService) {}

    @Get()
    async list() {
        return this.broadcastsService.findAll();
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        return this.broadcastsService.findById(id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown) {
        const parsed = CreateBroadcastSchema.parse(body) as CreateBroadcastDto;
        return this.broadcastsService.create(parsed);
    }

    @Patch(':id')
    async update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateBroadcastSchema.parse(body) as UpdateBroadcastDto;
        return this.broadcastsService.update(id, parsed);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id', ParseIntPipe) id: number) {
        await this.broadcastsService.delete(id);
    }
}