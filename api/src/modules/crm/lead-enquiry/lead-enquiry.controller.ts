import { ValidatedBody } from '@/decorators/validated-body.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import type { SiteVisitContact } from '@db/schemas/crm/site-visit-contacts.schema';
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '@/modules/auth/guards/permission.guard';
import { CanRead, CanCreate, CanUpdate, CanDelete } from '@/modules/auth/decorators/permissions.decorator';
import type {
    CreateEnquiryWithLeadDto,
    CreateLeadEnquiryDto,
    CreateSiteVisitContactArrayDto,
    CreateSiteVisitDto,
    UpdateLeadEnquiryDto,
    UpdateSiteVisitDetailsDto,
    UpdateSiteVisitDto,
} from './dto/lead-enquiry.dto';
import {
    CreateEnquiryWithLeadSchema,
    CreateLeadEnquirySchema,
    CreateSiteVisitContactArraySchema,
    CreateSiteVisitSchema,
    UpdateLeadEnquirySchema,
    UpdateSiteVisitDetailsSchema,
    UpdateSiteVisitSchema,
} from './dto/lead-enquiry.dto';
import { LeadEnquiryService } from './lead-enquiry.service';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('lead-enquiries')
export class LeadEnquiryController {
    constructor(private readonly leadEnquiryService: LeadEnquiryService) {}

    @Get()
    @CanRead('crm.enquiries')
    async list(
        @Query('page')      page?:      string,
        @Query('limit')     limit?:     string,
        @Query('search')    search?:    string,
        @Query('status')    status?:    string,
        @Query('team')      team?:      string,
        @Query('leadId')    leadId?:    string,
        @Query('happyCallingId') happyCallingId?: string,
        @Query('enquiryType') enquiryType?: string,
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
            happyCallingId: parseNumber(happyCallingId),
            enquiryType,
            sortBy,
            sortOrder: sortOrder as 'asc' | 'desc' | undefined,
        });
    }

    @Post('site-visits')
    @CanUpdate('crm.enquiries')
    @HttpCode(HttpStatus.CREATED)
    async createSiteVisit(
        @ValidatedBody(CreateSiteVisitSchema) body: CreateSiteVisitDto,
    ) {
        return this.leadEnquiryService.createSiteVisit(body);
    }

    @Get('site-visits/enquiry/:enquiryId')
    @CanRead('crm.enquiries')
    async getSiteVisitsByEnquiry(@Param('enquiryId', ParseIntPipe) enquiryId: number) {
        return this.leadEnquiryService.findSiteVisitsByEnquiry(enquiryId);
    }

    @Get('site-visits/first/:enquiryId')
    @CanRead('crm.enquiries')
    async getFirstSiteVisitByEnquiry(@Param('enquiryId', ParseIntPipe) enquiryId: number) {
        return this.leadEnquiryService.findFirstSiteVisitByEnquiry(enquiryId);
    }

    @Get('site-visits/by-lead/:leadId')
    @CanRead('crm.enquiries')
    async getSiteVisitsByLead(@Param('leadId', ParseIntPipe) leadId: number) {
        return this.leadEnquiryService.findSiteVisitsByLead(leadId);
    }

    @Get('site-visits/by-happy-calling/:happyCallingId')
    @CanRead('crm.enquiries')
    async getSiteVisitsByHappyCalling(@Param('happyCallingId', ParseIntPipe) happyCallingId: number) {
        return this.leadEnquiryService.findSiteVisitsByHappyCalling(happyCallingId);
    }

    @Patch('site-visits/details/:id')
    @CanUpdate('crm.enquiries')
    async updateSiteVisitDetails(
        @Param('id', ParseIntPipe) id: number,
        @ValidatedBody(UpdateSiteVisitDetailsSchema) body: UpdateSiteVisitDetailsDto,
    ) {
        return this.leadEnquiryService.updateSiteVisitDetails(id, body);
    }

    @Patch('site-visits/:id')
    @CanUpdate('crm.enquiries')
    async updateSiteVisit(
        @Param('id', ParseIntPipe) id: number,
        @ValidatedBody(UpdateSiteVisitSchema) body: UpdateSiteVisitDto,
    ) {
        return this.leadEnquiryService.updateSiteVisit(id, body);
    }

    @Get('site-visits/contacts/:siteVisitId')
    @CanRead('crm.enquiries')
    async getSiteVisitContacts(@Param('siteVisitId', ParseIntPipe) siteVisitId: number) {
        return this.leadEnquiryService.findSiteVisitContacts(siteVisitId);
    }

    @Post('site-visits/contacts/bulk')
    @CanUpdate('crm.enquiries')
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

    @Post('site-visits/:id/upload-docs')
    @CanUpdate('crm.enquiries')
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
    @CanRead('crm.enquiries')
    async getById(@Param('id', ParseIntPipe) id: number) {
        return this.leadEnquiryService.findById(id);
    }

    @Post()
    @CanCreate('crm.enquiries')
    @HttpCode(HttpStatus.CREATED)
    async create(
        @ValidatedBody(CreateLeadEnquirySchema) body: CreateLeadEnquiryDto,
        @CurrentUser() user: ValidatedUser,
    ) {
        return this.leadEnquiryService.create(body, user.sub);
    }

    @Post('with-lead')
    @CanCreate('crm.enquiries')
    @HttpCode(HttpStatus.CREATED)
    async createWithLead(
        @ValidatedBody(CreateEnquiryWithLeadSchema) body: CreateEnquiryWithLeadDto,
        @CurrentUser() user: ValidatedUser,
    ) {
        return this.leadEnquiryService.createWithLead(body, user.sub);
    }

    @Patch(':id')
    @CanUpdate('crm.enquiries')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @ValidatedBody(UpdateLeadEnquirySchema) body: UpdateLeadEnquiryDto,
        @CurrentUser() user: ValidatedUser,
    ) {
        return this.leadEnquiryService.update(id, body, user.sub);
    }

    @Delete(':id')
    @CanDelete('crm.enquiries')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id', ParseIntPipe) id: number) {
        await this.leadEnquiryService.delete(id);
    }
}
