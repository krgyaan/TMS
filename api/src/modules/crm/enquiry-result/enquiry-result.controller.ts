import { Controller, Get, Post, Patch, Delete, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ValidatedBody } from '@/decorators/validated-body.decorator';
import { EnquiryResultService } from './enquiry-result.service';
import {
    CreateEnquiryResultSchema,
    UpdateEnquiryResultSchema,
    EnquiryResultListSchema,
    type CreateEnquiryResultDto,
    type UpdateEnquiryResultDto,
    type EnquiryResultListDto,
} from './dto/enquiry-result.dto';

@Controller('enquiry-results')
export class EnquiryResultController {
    constructor(private readonly service: EnquiryResultService) {}

    @Get()
    async findAll(@Query() filters: EnquiryResultListDto) {
        const parsed = EnquiryResultListSchema.parse(filters);
        return this.service.findAll(parsed);
    }

    @Get(':id')
    async findOne(@Param('id', ParseIntPipe) id: number) {
        return this.service.findOne(id);
    }

    @Post()
    async create(@ValidatedBody(CreateEnquiryResultSchema) body: CreateEnquiryResultDto) {
        return this.service.create(body);
    }

    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @ValidatedBody(UpdateEnquiryResultSchema) body: UpdateEnquiryResultDto,
    ) {
        return this.service.update(id, body);
    }

    @Delete(':id')
    async remove(@Param('id', ParseIntPipe) id: number) {
        await this.service.remove(id);
        return null;
    }
}
