import { ValidatedBody } from '@/decorators/validated-body.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import type { SiteVisitContact } from '@db/schemas/crm/site-visit-contacts.schema';
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import type {
    CreateCostingSheetDto,
    CreateLeadEnquiryDto,
    CreateSiteVisitContactArrayDto,
    CreateSiteVisitDto,
    UpdateLeadEnquiryDto,
    UpdateSiteVisitDetailsDto,
    UpdateSiteVisitDto,
} from './dto/lead-enquiry.dto';
import {
    CreateCostingSheetSchema,
    CreateLeadEnquirySchema,
    CreateSiteVisitContactArraySchema,
    CreateSiteVisitSchema,
    UpdateLeadEnquirySchema,
    UpdateSiteVisitDetailsSchema,
    UpdateSiteVisitSchema,
} from './dto/lead-enquiry.dto';
import { LeadEnquiryService } from './lead-enquiry.service';

@Controller('lead-enquiries')
export class LeadEnquiryController {
    constructor(private readonly leadEnquiryService: LeadEnquiryService) {}

    @Get()
    async list(
        @Query('page')      page?:      string,
        @Query('limit')     limit?:     string,
        @Query('search')    search?:    string,
        @Query('status')    status?:    string,
        @Query('team')      team?:      string,
        @Query('leadId')    leadId?:    string,
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
            team,
            leadId: parseNumber(leadId),
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

    @Get('site-visits/first/:enquiryId')
    async getFirstSiteVisitByEnquiry(@Param('enquiryId', ParseIntPipe) enquiryId: number) {
        return this.leadEnquiryService.findFirstSiteVisitByEnquiry(enquiryId);
    }

    @Get('site-visits/by-lead/:leadId')
    async getSiteVisitsByLead(@Param('leadId', ParseIntPipe) leadId: number) {
        return this.leadEnquiryService.findSiteVisitsByLead(leadId);
    }

    @Patch('site-visits/details/:id')
    async updateSiteVisitDetails(
        @Param('id', ParseIntPipe) id: number,
        @ValidatedBody(UpdateSiteVisitDetailsSchema) body: UpdateSiteVisitDetailsDto,
    ) {
        return this.leadEnquiryService.updateSiteVisitDetails(id, body);
    }

    @Patch('site-visits/:id')
    async updateSiteVisit(
        @Param('id', ParseIntPipe) id: number,
        @ValidatedBody(UpdateSiteVisitSchema) body: UpdateSiteVisitDto,
    ) {
        return this.leadEnquiryService.updateSiteVisit(id, body);
    }

    @Get('site-visits/contacts/:siteVisitId')
    async getSiteVisitContacts(@Param('siteVisitId', ParseIntPipe) siteVisitId: number) {
        return this.leadEnquiryService.findSiteVisitContacts(siteVisitId);
    }

    @Post('site-visits/contacts/bulk')
    @HttpCode(HttpStatus.CREATED)
    async createSiteVisitContacts(
        @ValidatedBody(CreateSiteVisitContactArraySchema) body: CreateSiteVisitContactArrayDto,
    ) {
        const results: SiteVisitContact[] = [];
        for (const contact of body.contacts) {
            const created = await this.leadEnquiryService.createSiteVisitContact({
                siteVisitId: body.siteVisitId,
                ...contact,
            });
            results.push(created);
        }
        return results;
    }

    @Get('check-drive-scopes')
    async checkDriveScopes(@CurrentUser() user: ValidatedUser) {
        return this.leadEnquiryService.checkDriveScopes(user.sub);
    }

    @Post('create-costing-sheet')
    @HttpCode(HttpStatus.CREATED)
    async createCostingSheet(
        @ValidatedBody(CreateCostingSheetSchema) body: CreateCostingSheetDto,
        @CurrentUser() user: ValidatedUser,
    ) {
        return this.leadEnquiryService.createCostingSheet(body, user.sub);
    }

    @Post('site-visits/:id/upload-docs')
    @HttpCode(HttpStatus.OK)
    async uploadSiteVisitDocs(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { filenames: string[] },
    ) {
        const filenames = Array.isArray(body?.filenames) ? body.filenames : [];
        await this.leadEnquiryService.appendSiteVisitDocs(id, filenames);
        return { filenames };
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
