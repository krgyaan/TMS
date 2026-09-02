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

@Controller('happy-calling/followups')
export class HappyCallingFollowupsController {
    constructor(private readonly followupsService: LeadFollowupsService) {}

    @Get(':happyCallingId')
    async findAll(
        @Param('happyCallingId', ParseIntPipe) happyCallingId: number,
    ) {
        return this.followupsService.findAllBySource('happy_calling', happyCallingId);
    }

    @Get(':happyCallingId/:id')
    async findOne(
        @Param('happyCallingId', ParseIntPipe) happyCallingId: number,
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.followupsService.findById(id);
    }

    @Post(':happyCallingId')
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Param('happyCallingId', ParseIntPipe) happyCallingId: number,
        @ValidatedBody(CreateFollowupSchema) body: CreateFollowupDto,
        @CurrentUser() user: ValidatedUser,
    ) {
        return this.followupsService.create('happy_calling', happyCallingId, body, user.sub);
    }

    @Patch(':happyCallingId/:id')
    @HttpCode(HttpStatus.OK)
    async update(
        @Param('happyCallingId', ParseIntPipe) happyCallingId: number,
        @Param('id', ParseIntPipe) id: number,
        @ValidatedBody(CreateFollowupSchema) body: CreateFollowupDto,
        @CurrentUser() user: ValidatedUser,
    ) {
        return this.followupsService.update(id, body, user.sub);
    }

    @Patch(':happyCallingId/:id/stop')
    @HttpCode(HttpStatus.OK)
    async stop(
        @Param('happyCallingId', ParseIntPipe) _happyCallingId: number,
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { reason?: string },
    ) {
        return this.followupsService.stop(id, body?.reason ?? undefined);
    }

    @Delete(':happyCallingId/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(
        @Param('happyCallingId', ParseIntPipe) happyCallingId: number,
        @Param('id', ParseIntPipe) id: number,
    ) {
        await this.followupsService.delete(id);
    }
}