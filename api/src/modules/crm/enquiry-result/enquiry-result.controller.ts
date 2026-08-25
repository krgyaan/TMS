import { ValidatedBody } from '@/decorators/validated-body.decorator';
import { Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req } from '@nestjs/common';
import {
    CreateEnquiryResultSchema,
    CreateFollowupSchema,
    EnquiryResultListSchema,
    UpdateEnquiryResultSchema,
    type CreateEnquiryResultDto,
    type CreateFollowupDto,
    type EnquiryResultListDto,
    type UpdateEnquiryResultDto,
} from './dto/enquiry-result.dto';
import { EnquiryResultService } from './enquiry-result.service';

@Controller('enquiry-results')
export class EnquiryResultController {
    constructor(private readonly service: EnquiryResultService) {}

    @Get()
    async findAll(@Query() filters: EnquiryResultListDto) {
        const parsed = EnquiryResultListSchema.parse(filters);
        return this.service.findAll(parsed);
    }

    @Get('status-summary')
    async getStatusSummary() {
        return this.service.getStatusSummary();
    }

    @Get(':id')
    async findOne(@Param('id', ParseIntPipe) id: number) {
        return this.service.findOne(id);
    }

    @Get('by-lead/:leadId')
    async findByLeadId(@Param('leadId', ParseIntPipe) leadId: number) {
        return this.service.findByLeadId(leadId);
    }

    @Get('by-enquiry/:enquiryId')
    async findByEnquiryId(@Param('enquiryId', ParseIntPipe) enquiryId: number) {
        return this.service.findByEnquiryId(enquiryId);
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

    @Post(':id/followup')
    async createFollowup(
        @Param('id', ParseIntPipe) id: number,
        @ValidatedBody(CreateFollowupSchema) body: CreateFollowupDto,
        @Req() req: any,
    ) {
        const userId = req.user?.id ?? req.user?.sub;
        return this.service.createFollowup(id, body, userId);
    }
}
