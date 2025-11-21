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
import { NewPhysicalDocs } from 'src/db/physical-docs.schema';


@Controller('physical-docs')
export class PhysicalDocsController {
    constructor(private readonly physicalDocsService: PhysicalDocsService) { }

    @Get()
    async list() {
        return this.physicalDocsService.findAll();
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
        return this.physicalDocsService.create(body as unknown as NewPhysicalDocs);
    }

    @Patch(':id')
    async update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdatePhysicalDocDto) {
        return this.physicalDocsService.update(id, body as unknown as Partial<NewPhysicalDocs>);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id', ParseIntPipe) id: number) {
        await this.physicalDocsService.delete(id);
    }
}
