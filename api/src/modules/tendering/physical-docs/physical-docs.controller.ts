import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    HttpCode,
    HttpStatus,
    NotFoundException,
} from '@nestjs/common';
import { PhysicalDocsService } from './physical-docs.service';
import type { CreatePhysicalDocDto, UpdatePhysicalDocDto } from './dto/physical-docs.dto';


@Controller('physical-docs')
export class PhysicalDocsController {
    constructor(private readonly physicalDocsService: PhysicalDocsService) { }

    @Get()
    async list() {
        return this.physicalDocsService.findAll();
    }

    @Get('by-tender/:tenderId')
    async getByTenderId(@Param('tenderId', ParseIntPipe) tenderId: number) {
        const physicalDoc = await this.physicalDocsService.findByTenderIdWithPersons(tenderId);
        if (!physicalDoc) {
            throw new NotFoundException(`Physical doc for tender ID ${tenderId} not found`);
        }
        return physicalDoc;
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        const physicalDoc = await this.physicalDocsService.findById(id);
        if (!physicalDoc) {
            throw new NotFoundException(`Physical doc with ID ${id} not found`);
        }
        return physicalDoc;
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: CreatePhysicalDocDto) {
        return this.physicalDocsService.create(body);
    }

    @Patch(':id')
    async update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdatePhysicalDocDto) {
        return this.physicalDocsService.update(id, body);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id', ParseIntPipe) id: number) {
        await this.physicalDocsService.delete(id);
    }
}
