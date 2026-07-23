import {
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
} from '@nestjs/common';
import { LeadEnquiryService } from './lead-enquiry.service';
import {
    CreateLeadEnquirySchema,
    UpdateLeadEnquirySchema,
    CreateSiteVisitSchema,
    UpdateSiteVisitSchema,
} from './dto/lead-enquiry.dto';
import { ValidatedBody } from '@/decorators/validated-body.decorator';
import type {
    CreateLeadEnquiryDto,
    UpdateLeadEnquiryDto,
    CreateSiteVisitDto,
    UpdateSiteVisitDto,
} from './dto/lead-enquiry.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

@Controller('lead-enquiries')
export class LeadEnquiryController {
    constructor(private readonly leadEnquiryService: LeadEnquiryService) {}

    @Get()
    async list(
        @Query('page')      page?:      string,
        @Query('limit')     limit?:     string,
        @Query('search')    search?:    string,
        @Query('status')    status?:    string,
        @Query('sortBy')    sortBy?:    string,
        @Query('sortOrder') sortOrder?: string,
    ) {
        const parseNumber = (v?: string): number | undefined => {
            if (!v) return undefined;
            const num = parseInt(v, 10);
            return Number.isNaN(num) ? undefined : num;
        };

        return this.leadEnquiryService.findAll({
            page: parseNumber(page),
            limit: parseNumber(limit),
            search,
            status,
            sortBy,
            sortOrder: sortOrder as 'asc' | 'desc' | undefined,
        });
    }

    @Post('site-visits')
    @HttpCode(HttpStatus.CREATED)
    async createSiteVisit(
        @ValidatedBody(CreateSiteVisitSchema) body: CreateSiteVisitDto,
    ) {
        return this.leadEnquiryService.createSiteVisit(body);
    }

    @Get('site-visits/enquiry/:enquiryId')
    async getSiteVisitsByEnquiry(@Param('enquiryId', ParseIntPipe) enquiryId: number) {
        return this.leadEnquiryService.findSiteVisitsByEnquiry(enquiryId);
    }

    @Patch('site-visits/:id')
    async updateSiteVisit(
        @Param('id', ParseIntPipe) id: number,
        @ValidatedBody(UpdateSiteVisitSchema) body: UpdateSiteVisitDto,
    ) {
        return this.leadEnquiryService.updateSiteVisit(id, body);
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        return this.leadEnquiryService.findById(id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
        @ValidatedBody(CreateLeadEnquirySchema) body: CreateLeadEnquiryDto,
        @CurrentUser() user: ValidatedUser,
    ) {
        return this.leadEnquiryService.create(body, user.sub);
    }

    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @ValidatedBody(UpdateLeadEnquirySchema) body: UpdateLeadEnquiryDto,
        @CurrentUser() user: ValidatedUser,
    ) {
        return this.leadEnquiryService.update(id, body, user.sub);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id', ParseIntPipe) id: number) {
        await this.leadEnquiryService.delete(id);
    }
}
