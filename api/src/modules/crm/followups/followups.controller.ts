import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
    ParseIntPipe,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { FollowupsService } from './followups.service';
import { CreateFollowupSchema } from './dto/followup.dto';
import { ValidatedBody } from '@/decorators/validated-body.decorator';
import type { CreateFollowupDto } from './dto/followup.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

@Controller('leads/followups')
export class FollowupsController {
    constructor(private readonly followupsService: FollowupsService) {}

    /**
     * Get all followups for a lead
     * GET /leads/followups/:leadId
     */
    @Get(':leadId')
    async findAll(
        @Param('leadId', ParseIntPipe) leadId: number,
    ) {
        return this.followupsService.findAllByLead(leadId);
    }

    /**
     * Get single followup
     * GET /leads/followups/:leadId/:id
     */
    @Get(':leadId/:id')
    async findOne(
        @Param('leadId', ParseIntPipe) leadId: number,
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.followupsService.findById(id);
    }

    /**
     * Create new followup
     * POST /leads/followups/:leadId
     */
    @Post(':leadId')
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Param('leadId', ParseIntPipe) leadId: number,
        @ValidatedBody(CreateFollowupSchema) body: CreateFollowupDto,
        @CurrentUser() user: ValidatedUser,
    ) {
        return this.followupsService.create(leadId, body, user.sub);
    }

    /**
     * Delete followup
     * DELETE /leads/followups/:leadId/:id
     */
    @Delete(':leadId/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(
        @Param('leadId', ParseIntPipe) leadId: number,
        @Param('id', ParseIntPipe) id: number,
    ) {
        await this.followupsService.delete(id);
    }
}