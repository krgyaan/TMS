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
} from '@nestjs/common';
import { LeadFollowupsService } from './leadfollowups.service';
import { CreateFollowupSchema } from './dto/leadfollowup.dto';
import { ValidatedBody } from '@/decorators/validated-body.decorator';
import type { CreateFollowupDto } from './dto/leadfollowup.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

@Controller('leads/followups')
export class FollowupsController {
    constructor(private readonly followupsService: LeadFollowupsService) {}

    @Get(':leadId')
    async findAll(
        @Param('leadId', ParseIntPipe) leadId: number,
    ) {
        return this.followupsService.findAllBySource('lead', leadId);
    }

    @Get(':leadId/:id')
    async findOne(
        @Param('leadId', ParseIntPipe) leadId: number,
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.followupsService.findById(id);
    }

    @Post(':leadId')
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
    @HttpCode(HttpStatus.OK)
    async update(
        @Param('leadId', ParseIntPipe) leadId: number,
        @Param('id', ParseIntPipe) id: number,
        @ValidatedBody(CreateFollowupSchema) body: CreateFollowupDto,
        @CurrentUser() user: ValidatedUser,
    ) {
        return this.followupsService.update(id, body, user.sub);
    }

    @Delete(':leadId/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(
        @Param('leadId', ParseIntPipe) leadId: number,
        @Param('id', ParseIntPipe) id: number,
    ) {
        await this.followupsService.delete(id);
    }
}

@Controller('enquiry/followups')
export class EnquiryFollowupsController {
    constructor(private readonly followupsService: LeadFollowupsService) {}

    @Get(':enquiryId')
    async findAll(
        @Param('enquiryId', ParseIntPipe) enquiryId: number,
    ) {
        return this.followupsService.findAllBySource('enquiry', enquiryId);
    }

    @Get(':enquiryId/:id')
    async findOne(
        @Param('enquiryId', ParseIntPipe) enquiryId: number,
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.followupsService.findById(id);
    }

    @Post(':enquiryId')
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Param('enquiryId', ParseIntPipe) enquiryId: number,
        @ValidatedBody(CreateFollowupSchema) body: CreateFollowupDto,
        @CurrentUser() user: ValidatedUser,
    ) {
        return this.followupsService.create('enquiry', enquiryId, body, user.sub);
    }

    @Patch(':enquiryId/:id')
    @HttpCode(HttpStatus.OK)
    async update(
        @Param('enquiryId', ParseIntPipe) enquiryId: number,
        @Param('id', ParseIntPipe) id: number,
        @ValidatedBody(CreateFollowupSchema) body: CreateFollowupDto,
        @CurrentUser() user: ValidatedUser,
    ) {
        return this.followupsService.update(id, body, user.sub);
    }

    @Delete(':enquiryId/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(
        @Param('enquiryId', ParseIntPipe) enquiryId: number,
        @Param('id', ParseIntPipe) id: number,
    ) {
        await this.followupsService.delete(id);
    }
}