import {
    Controller,
    Get,
    Post,
    Patch, 
    Delete,
    Param,
    ParseIntPipe,
    HttpCode,
    HttpStatus,
    Body,
} from '@nestjs/common';
import { LeadFollowupsService } from './leadfollowups.service';
import { CreateFollowupSchema } from './dto/leadfollowup.dto';
import { ValidatedBody } from '@/decorators/validated-body.decorator';
import type { CreateFollowupDto } from './dto/leadfollowup.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '@/modules/auth/guards/permission.guard';
import { CanRead, CanUpdate, CanDelete } from '@/modules/auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('leads/followups')
export class FollowupsController {
    constructor(private readonly followupsService: LeadFollowupsService) {}

    @Get(':leadId')
    @CanRead('crm.leads')
    async findAll(
        @Param('leadId', ParseIntPipe) leadId: number,
    ) {
        return this.followupsService.findAllBySource('lead', leadId);
    }

    @Get(':leadId/:id')
    @CanRead('crm.leads')
    async findOne(
        @Param('leadId', ParseIntPipe) leadId: number,
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.followupsService.findById(id);
    }

    @Post(':leadId')
    @CanUpdate('crm.leads')
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Param('leadId', ParseIntPipe) leadId: number,
        @ValidatedBody(CreateFollowupSchema) body: CreateFollowupDto,
        @CurrentUser() user: ValidatedUser,
    ) {
        return this.followupsService.create('lead', leadId, body, user.sub);
    }

    // ✅ ADD THIS ROUTE
    @Patch(':leadId/:id')
    @CanUpdate('crm.leads')
    @HttpCode(HttpStatus.OK)
    async update(
        @Param('leadId', ParseIntPipe) leadId: number,
        @Param('id', ParseIntPipe) id: number,
        @ValidatedBody(CreateFollowupSchema) body: CreateFollowupDto,
        @CurrentUser() user: ValidatedUser,
    ) {
        return this.followupsService.update(id, body, user.sub);
    }

    @Patch(':leadId/:id/stop')
    @CanUpdate('crm.leads')
    @HttpCode(HttpStatus.OK)
    async stop(
        @Param('leadId', ParseIntPipe) _leadId: number,
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { reason?: string },
    ) {
        return this.followupsService.stop(id, body?.reason ?? undefined);
    }

    @Delete(':leadId/:id')
    @CanDelete('crm.leads')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(
        @Param('leadId', ParseIntPipe) leadId: number,
        @Param('id', ParseIntPipe) id: number,
    ) {
        await this.followupsService.delete(id);
    }
}

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('enquiry/followups')
export class EnquiryFollowupsController {
    constructor(private readonly followupsService: LeadFollowupsService) {}

    @Get(':enquiryId')
    @CanRead('crm.enquiries')
    async findAll(
        @Param('enquiryId', ParseIntPipe) enquiryId: number,
    ) {
        return this.followupsService.findAllBySource('enquiry', enquiryId);
    }

    @Get(':enquiryId/:id')
    @CanRead('crm.enquiries')
    async findOne(
        @Param('enquiryId', ParseIntPipe) enquiryId: number,
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.followupsService.findById(id);
    }

    @Post(':enquiryId')
    @CanUpdate('crm.enquiries')
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Param('enquiryId', ParseIntPipe) enquiryId: number,
        @ValidatedBody(CreateFollowupSchema) body: CreateFollowupDto,
        @CurrentUser() user: ValidatedUser,
    ) {
        return this.followupsService.create('enquiry', enquiryId, body, user.sub);
    }

    @Patch(':enquiryId/:id')
    @CanUpdate('crm.enquiries')
    @HttpCode(HttpStatus.OK)
    async update(
        @Param('enquiryId', ParseIntPipe) enquiryId: number,
        @Param('id', ParseIntPipe) id: number,
        @ValidatedBody(CreateFollowupSchema) body: CreateFollowupDto,
        @CurrentUser() user: ValidatedUser,
    ) {
        return this.followupsService.update(id, body, user.sub);
    }

    @Patch(':enquiryId/:id/stop')
    @CanUpdate('crm.enquiries')
    @HttpCode(HttpStatus.OK)
    async stop(
        @Param('enquiryId', ParseIntPipe) _enquiryId: number,
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { reason?: string },
    ) {
        return this.followupsService.stop(id, body?.reason ?? undefined);
    }

    @Delete(':enquiryId/:id')
    @CanDelete('crm.enquiries')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(
        @Param('enquiryId', ParseIntPipe) enquiryId: number,
        @Param('id', ParseIntPipe) id: number,
    ) {
        await this.followupsService.delete(id);
    }
}