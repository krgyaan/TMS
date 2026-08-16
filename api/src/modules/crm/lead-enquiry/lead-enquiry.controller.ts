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
    UseInterceptors,
    UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { LeadEnquiryService } from './lead-enquiry.service';
import {
    CreateLeadEnquirySchema,
    UpdateLeadEnquirySchema,
    CreateSiteVisitSchema,
    UpdateSiteVisitSchema,
    UpdateSiteVisitDetailsSchema,
    CreateSiteVisitContactArraySchema,
    CreateCostingSheetSchema,
} from './dto/lead-enquiry.dto';
import { ValidatedBody } from '@/decorators/validated-body.decorator';
import type {
    CreateLeadEnquiryDto,
    UpdateLeadEnquiryDto,
    CreateSiteVisitDto,
    UpdateSiteVisitDto,
    UpdateSiteVisitDetailsDto,
    CreateSiteVisitContactArrayDto,
    CreateCostingSheetDto,
} from './dto/lead-enquiry.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import type { SiteVisitContact } from '@db/schemas/crm/site-visit-contacts.schema';

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
    @UseInterceptors(FilesInterceptor('documents', 10, {
        storage: diskStorage({
            destination: './uploads/crm/site-visit',
            filename: (req, file, callback) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                const ext = extname(file.originalname);
                callback(null, `${uniqueSuffix}${ext}`);
            },
        }),
        limits: { fileSize: 25 * 1024 * 1024 },
    }))
    @HttpCode(HttpStatus.OK)
    async uploadSiteVisitDocs(
        @Param('id', ParseIntPipe) id: number,
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        const filenames = files.map(f => f.filename);
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
